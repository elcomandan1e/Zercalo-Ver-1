/* patches/07-gestures.js — Часть 1/2 · Свайпы навигации (безопасная версия)
   · Свайп влево от ПРАВОГО края = «назад»
   · Свайп вправо от ЛЕВОГО края = боковое меню (drawer)
   · Работает через touch events БЕЗ capture — не перехватывает клики
   · Не конфликтует с обычными тапами и свайпами карточек
   Часть 2: радиальный FAB
*/
(function(){
  if(window._zrz07GesturesP1) return;
  window._zrz07GesturesP1 = true;

  var EDGE_ZONE     = 34;   /* ширина зоны от края, где распознаётся жест */
  var BACK_DISTANCE = 70;   /* px, чтобы сработал «назад» */
  var DRAWER_OPEN_DIST = 55;
  var MAX_TIME      = 600;  /* мс — быстрее = свайп, дольше = скролл/тап */

  /* ============================================================
     ПРОВЕРКИ КОНТЕКСТА
     ============================================================ */

  function hasModal(){ return !!document.querySelector('.modal-bg'); }
  function hasAuth(){ return !!document.getElementById('authScreen'); }
  function hasBottomSheet(){ return !!document.getElementById('zrz-sheet-bg'); }
  function hasPalette(){ return !!document.getElementById('zrz-palette'); }
  function hasDrawer(){ return !!document.getElementById('zrz-drawer-bg'); }
  function hasPreview(){ return !!document.getElementById('zrz13p3_bg'); }

  /* ============================================================
     СВАЙП «НАЗАД» — от правого края влево
     ============================================================ */

  function bindBackSwipe(){
    if(window._zrz07BackBound) return;
    window._zrz07BackBound = true;

    var startX = 0, startY = 0, startT = 0;
    var tracking = false;

    document.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1) return;
      if(hasAuth()) return;

      var w = window.innerWidth;
      var x = e.touches[0].clientX;
      var y = e.touches[0].clientY;

      /* Старт от правого края */
      if(x < w - EDGE_ZONE) return;

      /* Игнорируем если тап попал на кнопку/ссылку */
      var t = e.target;
      if(t && t.closest && t.closest('button,a,input,textarea,select,[contenteditable="true"]')) return;

      startX = x; startY = y; startT = Date.now();
      tracking = true;
    }, {passive:true});

    document.addEventListener('touchmove', function(e){
      if(!tracking) return;
      if(e.touches.length !== 1){ tracking = false; return; }
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      /* Отмена если ушли вертикально больше чем влево */
      if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 15){
        tracking = false;
      }
    }, {passive:true});

    document.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking = false;
      if(!e.changedTouches || !e.changedTouches.length) return;

      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      var dt = Date.now() - startT;

      if(dt > MAX_TIME) return;
      if(dx > -BACK_DISTANCE) return;
      if(Math.abs(dy) > 60) return;

      /* Триггерим «назад» */
      try { if(typeof haptic === 'function') haptic(8); }catch(_){}

      /* Приоритет — что закрыть */
      if(hasPalette()){
        if(typeof window.zrzClosePalette === 'function') window.zrzClosePalette();
        return;
      }
      if(hasPreview()){
        if(typeof window.zrz13p3Close === 'function') window.zrz13p3Close();
        return;
      }
      if(hasBottomSheet()){
        if(typeof window.zrzCloseSheet === 'function') window.zrzCloseSheet();
        return;
      }
      if(hasDrawer()){
        closeDrawer();
        return;
      }
      if(hasModal()){
        if(typeof closeModalWithConfirm === 'function') closeModalWithConfirm();
        return;
      }
      /* Обычный «назад» по истории */
      if(typeof goBack === 'function') goBack();
    }, {passive:true});

    document.addEventListener('touchcancel', function(){ tracking = false; }, {passive:true});
  }

  /* ============================================================
     БОКОВОЕ МЕНЮ (DRAWER)
     ============================================================ */

  function buildDrawerHtml(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';

    var initials = (u.name || '?').split(' ').map(function(p){ return p.charAt(0); }).join('').slice(0,2).toUpperCase();
    var roleLabel = '';
    try { roleLabel = (typeof ROLE_META !== 'undefined' && ROLE_META[u.role]) ? ROLE_META[u.role].label : u.role; } catch(e){ roleLabel = u.role; }

    var html = '';
    html += '<div class="zrz-drawer-profile" onclick="zrzDrawerAction(\'profile\')">'
      + '<div class="zrz-drawer-avatar">'+esc(initials)+'</div>'
      + '<div class="zrz-drawer-who">'
      +   '<div class="zrz-drawer-name">'+esc(u.name)+'</div>'
      +   '<div class="zrz-drawer-role">'+esc(roleLabel)+'</div>'
      + '</div>'
      + '</div>';

    html += '<div class="zrz-drawer-sec-title">Разделы</div>';
    html += '<div class="zrz-drawer-nav">';
    html += drawerItem('🏠','Сегодня','orders');
    html += drawerItem('👥','Клиенты','clients');
    html += drawerItem('📅','Календарь','calendar');
    html += drawerItem('🔔','Уведомления','notifications');
    html += '</div>';

    var work = '';
    try { if(typeof canViewReports === 'function' && canViewReports())
      work += drawerItem('📊','Отчёты','reports'); } catch(e){}
    try { if(typeof userCan === 'function' && userCan('orders.pricing'))
      work += drawerItem('📋','Прайс-лист','priceBook'); } catch(e){}
    try { if(typeof canManageContractors === 'function' && canManageContractors())
      work += drawerItem('🏢','Контрагенты','contractors'); } catch(e){}
    try { if(typeof canViewTrash === 'function' && canViewTrash())
      work += drawerItem('🗑','Корзина','trash'); } catch(e){}
    if(work){
      html += '<div class="zrz-drawer-sec-title">Работа</div>';
      html += '<div class="zrz-drawer-nav">'+work+'</div>';
    }

    var sys = '';
    try { if(typeof canManageUsers === 'function' && canManageUsers())
      sys += drawerItem('👥','Команда','users'); } catch(e){}
    try { if(typeof canManageUsers === 'function' && canManageUsers())
      sys += drawerItem('🔑','Права','roles'); } catch(e){}
    try { if(typeof canManageSync === 'function' && canManageSync())
      sys += drawerItem('☁️','Синхронизация','sync'); } catch(e){}
    if(sys){
      html += '<div class="zrz-drawer-sec-title">Система</div>';
      html += '<div class="zrz-drawer-nav">'+sys+'</div>';
    }

    var help = '';
    try { if(typeof canViewHelp === 'function' && canViewHelp())
      help += drawerItem('📖','Помощь','help'); } catch(e){}
    try { if(typeof canViewHelp === 'function' && canViewHelp())
      help += drawerItem('📚','Документация','docs'); } catch(e){}
    help += drawerItem('⚙️','Настройки','settings');
    html += '<div class="zrz-drawer-sec-title">Справка</div>';
    html += '<div class="zrz-drawer-nav">'+help+'</div>';

    html += '<div class="zrz-drawer-nav" style="margin-top:10px">';
    html += drawerItem('🚪','Выйти','logout', true);
    html += '</div>';

    var ver = '';
    try { ver = (window.PATCH_VERSION || '') || ''; } catch(e){}
    html += '<div class="zrz-drawer-footer">Зерцало · патч v'+(ver||'6.1.0')+'</div>';

    return html;
  }

  function drawerItem(ico, label, act, danger){
    return '<button type="button" class="zrz-drawer-item'+(danger?' zrz-drawer-item-danger':'')+'" onclick="zrzDrawerAction(\''+act+'\')">'
      + '<span class="zrz-drawer-item-ico">'+ico+'</span>'
      + '<span class="zrz-drawer-item-label">'+esc(label)+'</span>'
      + '</button>';
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function openDrawer(){
    if(document.getElementById('zrz-drawer-bg')) return;
    try { if(typeof haptic === 'function') haptic(6); }catch(_){}

    var bg = document.createElement('div');
    bg.id = 'zrz-drawer-bg';
    bg.className = 'zrz-drawer-bg';
    bg.innerHTML = '<aside class="zrz-drawer" id="zrz-drawer">'+buildDrawerHtml()+'</aside>';
    document.body.appendChild(bg);

    requestAnimationFrame(function(){ bg.classList.add('zrz-drawer-open'); });

    bg.addEventListener('click', function(e){
      if(e.target === bg) closeDrawer();
    });

    var drawer = document.getElementById('zrz-drawer');
    var sx = null;
    drawer.addEventListener('touchstart', function(e){
      sx = e.touches[0].clientX;
    }, {passive:true});
    drawer.addEventListener('touchmove', function(e){
      if(sx == null) return;
      var dx = e.touches[0].clientX - sx;
      if(dx < 0) drawer.style.transform = 'translateX('+dx+'px)';
    }, {passive:true});
    drawer.addEventListener('touchend', function(e){
      if(sx == null) return;
      var dx = (e.changedTouches[0].clientX - sx);
      if(dx < -60) closeDrawer();
      else drawer.style.transform = '';
      sx = null;
    });
  }

  function closeDrawer(){
    var bg = document.getElementById('zrz-drawer-bg');
    if(!bg) return;
    bg.classList.remove('zrz-drawer-open');
    setTimeout(function(){ bg.remove(); }, 260);
  }

  window.zrzOpenDrawer = openDrawer;
  window.zrzCloseDrawer = closeDrawer;

  window.zrzDrawerAction = function(act){
    closeDrawer();
    setTimeout(function(){
      try {
        if(act === 'orders'){ if(typeof window.zrzSwitchTab === 'function') return window.zrzSwitchTab('orders'); }
        if(act === 'clients'){ if(typeof window.zrzSwitchTab === 'function') return window.zrzSwitchTab('clients'); }
        if(act === 'calendar'){ if(typeof window.zrzSwitchTab === 'function') return window.zrzSwitchTab('calendar'); }
        if(act === 'notifications'){ if(typeof window.zrzSwitchTab === 'function') return window.zrzSwitchTab('notifications'); }
        if(act === 'reports'   && typeof openReports === 'function')       return openReports();
        if(act === 'priceBook' && typeof openPriceBook === 'function')     return openPriceBook();
        if(act === 'contractors'){ activeTab = 'contractors'; if(typeof render === 'function'){ render(); window.scrollTo(0,0); } return; }
        if(act === 'trash'     && typeof openTrash === 'function')         return openTrash();
        if(act === 'users'     && typeof openUsers === 'function')         return openUsers();
        if(act === 'roles'     && typeof openRolesSettings === 'function') return openRolesSettings();
        if(act === 'sync'      && typeof openSyncPanel === 'function')     return openSyncPanel();
        if(act === 'help'      && typeof openHelp === 'function')          return openHelp();
        if(act === 'docs'      && typeof openDocs === 'function')          return openDocs();
        if(act === 'settings'  && typeof openSettings === 'function')      return openSettings();
        if(act === 'profile'   && typeof openProfile === 'function')       return openProfile();
        if(act === 'logout'    && typeof doLogout === 'function')          return doLogout();
      }catch(e){ try{console.warn('[07-gestures] drawer action', act, e);}catch(_){} }
    }, 220);
  };

  /* Свайп вправо от левого края — открыть drawer */
  function bindDrawerSwipe(){
    if(window._zrz07DrawerBound) return;
    window._zrz07DrawerBound = true;

    var sx = 0, sy = 0, st = 0, tracking = false;

    document.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1) return;
      if(hasAuth()) return;
      if(hasDrawer()) return;
      if(hasModal()) return;
      if(hasPalette()) return;
      if(hasBottomSheet()) return;
      if(hasPreview()) return;

      var x = e.touches[0].clientX;
      if(x > EDGE_ZONE) return;

      var t = e.target;
      if(t && t.closest && t.closest('button,a,input,textarea,select,[contenteditable="true"]')) return;

      sx = x; sy = e.touches[0].clientY; st = Date.now();
      tracking = true;
    }, {passive:true});

    document.addEventListener('touchmove', function(e){
      if(!tracking) return;
      if(e.touches.length !== 1){ tracking = false; return; }
      var dx = e.touches[0].clientX - sx;
      var dy = e.touches[0].clientY - sy;
      if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 15){ tracking = false; }
    }, {passive:true});

    document.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking = false;
      if(!e.changedTouches || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      var dt = Date.now() - st;
      if(dt > MAX_TIME) return;
      if(dx < DRAWER_OPEN_DIST) return;
      if(Math.abs(dy) > 60) return;
      openDrawer();
    }, {passive:true});

    document.addEventListener('touchcancel', function(){ tracking = false; }, {passive:true});
  }

  /* ============================================================
     CSS — DRAWER
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-gestures-css')) return;
    var css = ''
      + '.zrz-drawer-bg{position:fixed;inset:0;z-index:900;'
      +   'background:rgba(20,32,52,0);transition:background .22s ease}'
      + '.zrz-drawer-bg.zrz-drawer-open{background:rgba(20,32,52,0.45);'
      +   'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}'
      + '.zrz-drawer{position:absolute;top:0;left:0;bottom:0;width:min(300px,84vw);'
      +   'background:var(--surface);box-shadow:6px 0 32px rgba(20,32,52,0.22);'
      +   'transform:translateX(-100%);transition:transform .26s cubic-bezier(.2,.85,.3,1);'
      +   'overflow-y:auto;-webkit-overflow-scrolling:touch;'
      +   'padding:18px 14px max(24px, env(safe-area-inset-bottom));'
      +   'display:flex;flex-direction:column;touch-action:pan-y}'
      + '.zrz-drawer-bg.zrz-drawer-open .zrz-drawer{transform:translateX(0)}'
      + '.zrz-drawer-profile{display:flex;align-items:center;gap:12px;padding:12px 8px 16px;'
      +   'border-bottom:1px solid var(--line);margin-bottom:14px;cursor:pointer}'
      + '.zrz-drawer-avatar{width:48px;height:48px;border-radius:50%;flex-shrink:0;'
      +   'background:linear-gradient(135deg,#8badd8,#5b7fb8);color:#fff;'
      +   'display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px}'
      + '.zrz-drawer-who{flex:1;min-width:0}'
      + '.zrz-drawer-name{font-size:15px;font-weight:800;color:var(--text);'
      +   'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em}'
      + '.zrz-drawer-role{font-size:11px;color:var(--muted);font-weight:700;'
      +   'text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}'
      + '.zrz-drawer-sec-title{font-size:11px;font-weight:800;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:1.2px;padding:12px 8px 6px}'
      + '.zrz-drawer-nav{display:flex;flex-direction:column;gap:2px}'
      + '.zrz-drawer-item{display:flex;align-items:center;gap:14px;width:100%;'
      +   'padding:12px 12px;border:none;background:transparent;color:var(--text);'
      +   'font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;'
      +   'text-align:left;border-radius:12px;transition:background .12s ease}'
      + '.zrz-drawer-item:hover{background:var(--accent-soft)}'
      + '.zrz-drawer-item:active{background:var(--accent-line);transform:scale(0.98)}'
      + '.zrz-drawer-item .zrz-drawer-item-ico{font-size:20px;line-height:1;'
      +   'width:26px;text-align:center;flex-shrink:0;opacity:0.9}'
      + '.zrz-drawer-item .zrz-drawer-item-label{flex:1;min-width:0;'
      +   'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.zrz-drawer-item-danger{color:var(--danger)}'
      + '.zrz-drawer-item-danger:hover{background:var(--danger-soft)}'
      + '.zrz-drawer-footer{margin-top:auto;padding:18px 8px 4px;text-align:center;'
      +   'color:var(--muted-2);font-size:11px;font-weight:600}';

    var st = document.createElement('style');
    st.id = 'zrz-gestures-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { bindBackSwipe(); }catch(e){}
    try { bindDrawerSwipe(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 400);
  setTimeout(apply, 1200);

  try{ console.log('[07-gestures p1] свайпы навигации — безопасная версия активна'); }catch(_){}
})();
