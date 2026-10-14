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
/* ============================================================
   v7.0.1 · Тап по эмблеме → боковое меню
   · Одиночный тап по логотипу в шапке → открывается Drawer
   · Долгий тап по логотипу остаётся → Command Palette (06-nav)
   · Тап по ⌘ остаётся → Command Palette
   · Свайп от левого края остаётся → Drawer
   Работает с любой страницы — логотип всегда в шапке.
   ============================================================ */
(function(){
  if(window._zrz07LogoTap) return;
  window._zrz07LogoTap = true;

  var TAP_MAX_MS = 500;  /* тап короче 500мс → drawer */
  var MOVE_TOL   = 12;   /* смещение < 12px = не свайп, а тап */

  function openDrawerSafe(){
    try {
      /* Не открываем, если показан экран входа */
      if(document.getElementById('authScreen')) return;
      if(typeof window.zrzOpenDrawer === 'function') window.zrzOpenDrawer();
    }catch(e){}
  }

  function bindLogoTap(){
    var logo = document.getElementById('headerLogo');
    if(!logo || logo.dataset.drawerTapBound) return;
    logo.dataset.drawerTapBound = '1';

    var startX = 0, startY = 0, startT = 0;
    var moved = false, active = false;

    function begin(x, y){
      startX = x; startY = y;
      startT = Date.now();
      moved = false;
      active = true;
    }
    function move(x, y){
      if(!active || moved) return;
      if(Math.hypot(x - startX, y - startY) > MOVE_TOL) moved = true;
    }
    function end(){
      if(!active) return;
      active = false;
      var dt = Date.now() - startT;
      if(moved || dt > TAP_MAX_MS) return;
      /* Проверяем что тап не по кнопке ⌘ */
      try { if(typeof haptic === 'function') haptic(6); }catch(_){}
      openDrawerSafe();
    }
    function cancel(){ active = false; moved = true; }

    /* Игнорируем тап если клик был по внутренней кнопке (например ⌘) */
    function shouldIgnore(target){
      return !!(target && target.closest && target.closest('button'));
    }

    if(window.PointerEvent){
      logo.addEventListener('pointerdown', function(e){
        if(e.button && e.button !== 0) return;
        if(shouldIgnore(e.target)) return;
        begin(e.clientX, e.clientY);
      });
      logo.addEventListener('pointermove', function(e){
        move(e.clientX, e.clientY);
      });
      logo.addEventListener('pointerup', end);
      logo.addEventListener('pointercancel', cancel);
      logo.addEventListener('pointerleave', cancel);
      return;
    }

    logo.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1) return;
      if(shouldIgnore(e.target)) return;
      begin(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive:true});
    logo.addEventListener('touchmove', function(e){
      if(e.touches.length !== 1) return;
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive:true});
    logo.addEventListener('touchend', end);
    logo.addEventListener('touchcancel', cancel);

    /* Desktop fallback */
    logo.addEventListener('mousedown', function(e){
      if(shouldIgnore(e.target)) return;
      begin(e.clientX, e.clientY);
    });
    logo.addEventListener('mousemove', function(e){ move(e.clientX, e.clientY); });
    logo.addEventListener('mouseup', end);
    logo.addEventListener('mouseleave', cancel);
  }

  function apply(){
    try { bindLogoTap(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  var _iv = setInterval(function(){
    try { bindLogoTap(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 90000);

  try{ console.log('[07-gestures v7.0.1] тап по логотипу → drawer активен'); }catch(_){}
})();
/* ============================================================
   v7.0.2 · Фикс: Drawer закрывается от «click-through»
   При тапе по логотипу браузер генерирует click, который
   попадает на уже открытый фон drawer'а и закрывает его.
   Блокируем клики по фону первые 400 мс после открытия.
   ============================================================ */
(function(){
  if(window._zrz07ClickThroughFix) return;
  window._zrz07ClickThroughFix = true;

  /* Патчим zrzOpenDrawer — добавляем метку времени открытия */
  if(typeof window.zrzOpenDrawer === 'function' && !window.zrzOpenDrawer.__ctPatched){
    var _origOpen = window.zrzOpenDrawer;
    window.zrzOpenDrawer = function(){
      window._zrzDrawerOpenedAt = Date.now();
      return _origOpen.apply(this, arguments);
    };
    window.zrzOpenDrawer.__ctPatched = true;
  }

  /* Глобальный capture-обработчик: блокируем клики по фону drawer
     в первые 400 мс после открытия. Клики на пункты меню пропускаем. */
  document.addEventListener('click', function(e){
    if(!window._zrzDrawerOpenedAt) return;
    if(Date.now() - window._zrzDrawerOpenedAt > 400) return;

    var bg = document.getElementById('zrz-drawer-bg');
    if(!bg) return;
    if(!bg.contains(e.target)) return;

    /* Если клик по пункту меню — пропускаем */
    if(e.target.closest && e.target.closest('.zrz-drawer-item')) return;
    if(e.target.closest && e.target.closest('button')) return;

    /* Иначе — блокируем (это click-through от тапа по логотипу) */
    e.stopPropagation();
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  /* Дополнительно: touchend на логотипе тоже даёт click через ~300мс.
     Перехватываем pointerup и на всякий случай откладываем открытие через RAF */
  try{ console.log('[07-gestures v7.0.2] click-through fix активен'); }catch(_){}
})();
/* ============ ZERZALO · RADIAL FAB · 07-gestures part2 ============ */
(function () {
  'use strict';
  if (window._zrzFabLoaded) return;
  window._zrzFabLoaded = true;

  var DIST = window.innerWidth < 360 ? 88 : 105;

  var ACTIONS = [
    { id:'order',  label:'Новый заказ',  color:'#4A90E2', angle:-60,
      svg:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' },
    { id:'client', label:'Новый клиент', color:'#34C759', angle:-20,
      svg:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2"/></svg>' },
    { id:'event',  label:'Событие',      color:'#FF9500', angle: 20,
      svg:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="14" rx="2.5"/><path d="M8 3v5M16 3v5M4 11h16"/></svg>' },
    { id:'route',  label:'Маршрут',      color:'#AF52DE', angle: 60,
      svg:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 18-9-5-9 5z"/></svg>' }
  ];

  function gesturesDisabled() {
    try {
      if (localStorage.getItem('zrz_gestures_disabled') === '1') return true;
      var p = JSON.parse(localStorage.getItem('zrz_user_prefs') || '{}');
      if (p && p.gestures === false) return true;
    } catch (e) {}
    return false;
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }

  var st = document.createElement('style');
  st.setAttribute('data-zrz', 'fab');
  st.textContent = [
    '#zrz-fab-root{position:fixed;inset:0;pointer-events:none;z-index:9000;font-family:Onest,system-ui,-apple-system,sans-serif}',
    '#zrz-fab-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0);backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0);transition:background .25s ease,backdrop-filter .25s ease;pointer-events:none}',
    '#zrz-fab-root.open #zrz-fab-backdrop{background:rgba(0,0,0,.32);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:auto}',
    '#zrz-fab-main{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:62px;height:62px;border-radius:50%;border:none;padding:0;background:linear-gradient(135deg,#4A90E2 0%,#2D6FD1 100%);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(45,111,209,.42),0 2px 6px rgba(0,0,0,.18);pointer-events:auto;cursor:pointer;transition:transform .3s cubic-bezier(.34,1.56,.64,1);-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none}',
    '#zrz-fab-main svg{display:block;pointer-events:none;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}',
    '#zrz-fab-root.open #zrz-fab-main svg{transform:rotate(135deg)}',
    '.zrz-fab-action{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:50%;border:none;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.22);cursor:pointer;pointer-events:none;opacity:0;transform:translate(-50%,0) scale(.3);transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .2s ease,box-shadow .2s;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.zrz-fab-action svg{display:block;pointer-events:none}',
    '.zrz-fab-lbl{position:absolute;left:50%;top:-28px;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#fff;background:rgba(0,0,0,.75);padding:3px 8px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none}',
    '.zrz-fab-action.zrz-fab-preview .zrz-fab-lbl{opacity:1}',
    '.zrz-fab-action.zrz-fab-preview{box-shadow:0 0 0 4px rgba(255,255,255,.6),0 12px 26px rgba(0,0,0,.3)}'
  ].join('');
  if (!document.querySelector('style[data-zrz="fab"]')) document.head.appendChild(st);

  var root = document.createElement('div');
  root.id = 'zrz-fab-root';
  root.innerHTML =
    '<div id="zrz-fab-backdrop"></div>' +
    '<div id="zrz-fab-actions"></div>' +
    '<button id="zrz-fab-main" type="button" aria-label="Быстрые действия">' +
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
    '</button>';

  var actionEls = [];
  var isOpen = false, swipeMode = false, pointerId = null, pointerStart = null, previewIdx = -1, moved = false;

  function buildActions() {
    var wrap = root.querySelector('#zrz-fab-actions');
    wrap.innerHTML = '';
    actionEls = [];
    ACTIONS.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zrz-fab-action';
      b.dataset.id = a.id;
      b.style.background = a.color;
      b.innerHTML = a.svg + '<span class="zrz-fab-lbl">' + a.label + '</span>';
      wrap.appendChild(b);
      actionEls.push(b);
    });
  }

  function positions(open) {
    actionEls.forEach(function (el, i) {
      var a = ACTIONS[i];
      var rad = a.angle * Math.PI / 180;
      var x = Math.sin(rad) * DIST;
      var y = -Math.cos(rad) * DIST;
      if (open) {
        el.style.transform = 'translate(calc(-50% + ' + x + 'px), ' + y + 'px) scale(1)';
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.transitionDelay = (i * 30) + 'ms';
      } else {
        el.style.transform = 'translate(-50%, 0) scale(.3)';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.transitionDelay = '0ms';
      }
    });
  }

  function open()   { if (isOpen) return; isOpen = true; root.classList.add('open'); positions(true); buzz(10); }
  function close()  { if (!isOpen && !swipeMode) return; isOpen = false; swipeMode = false; previewIdx = -1; root.classList.remove('open'); positions(false); actionEls.forEach(function (el) { el.classList.remove('zrz-fab-preview'); }); }
  function toggle() { isOpen ? close() : open(); }

  function nearestAction(dx, dy) {
    var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    var best = 0, bestDiff = 1e9;
    ACTIONS.forEach(function (a, i) {
      var d = Math.abs(ang - a.angle);
      if (d > 180) d = 360 - d;
      if (d < bestDiff) { bestDiff = d; best = i; }
    });
    return best;
  }
  function previewAt(idx) {
    if (idx === previewIdx) return;
    previewIdx = idx;
    actionEls.forEach(function (el, i) { el.classList.toggle('zrz-fab-preview', i === idx); });
    if (idx >= 0) buzz(6);
  }

  function runAction(id) {
    buzz(18);
    try { document.dispatchEvent(new CustomEvent('zrz:fab-action', { detail: { id: id } })); } catch (e) {}
    var FUNC_MAP = {
      order:  ['zrzOpenNewOrder','openNewOrder','newOrder'],
      client: ['zrzOpenNewClient','openNewClient','newClient'],
      event:  ['zrzOpenNewEvent','openNewEvent','newEvent'],
      route:  ['zrzOpenRoute','openRoute','showRoute','zrzRoute']
    };
    var names = FUNC_MAP[id] || [];
    for (var i = 0; i < names.length; i++) {
      var fn = window[names[i]];
      if (typeof fn === 'function') {
        try { fn(); return; } catch (e) { console.warn('[zrzFab] action err', id, e); }
      }
    }
    console.info('[zrzFab] action', id, '— handler not found (слушай zrz:fab-action)');
  }

  function bind() {
    var main = root.querySelector('#zrz-fab-main');
    var backdrop = root.querySelector('#zrz-fab-backdrop');

    main.addEventListener('pointerdown', function (e) {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      pointerStart = { x: e.clientX, y: e.clientY };
      moved = false; swipeMode = false;
      try { main.setPointerCapture(e.pointerId); } catch (err) {}
    });

    main.addEventListener('pointermove', function (e) {
      if (pointerId !== e.pointerId || !pointerStart) return;
      var dx = e.clientX - pointerStart.x;
      var dy = e.clientY - pointerStart.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (!moved && dist > 14) {
        moved = true;
        if (!gesturesDisabled()) {
          swipeMode = true;
          if (!isOpen) open();
        }
      }
      if (swipeMode) {
        e.preventDefault();
        previewAt(nearestAction(dx, dy));
      }
    }, { passive: false });

    function endPointer(e) {
      if (pointerId !== e.pointerId) return;
      var dx = e.clientX - pointerStart.x;
      var dy = e.clientY - pointerStart.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var wasSwipe = swipeMode;
      var idx = previewIdx;
      pointerId = null; pointerStart = null; swipeMode = false; previewIdx = -1;

      if (wasSwipe) {
        if (dist > 42 && idx >= 0) {
          var id = ACTIONS[idx].id;
          close();
          setTimeout(function () { runAction(id); }, 60);
        } else { close(); }
        moved = false;
        return;
      }
      if (!moved) toggle();
      moved = false;
    }
    main.addEventListener('pointerup', endPointer);
    main.addEventListener('pointercancel', function (e) {
      if (pointerId === e.pointerId) { pointerId = null; pointerStart = null; swipeMode = false; previewIdx = -1; close(); }
    });

    actionEls.forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = el.dataset.id;
        close();
        setTimeout(function () { runAction(id); }, 60);
      });
    });

    backdrop.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
    window.addEventListener('scroll', function () { if (isOpen) close(); }, { passive: true });
  }

  function mount() {
    if (!document.body) { setTimeout(mount, 60); return; }
    if (!document.getElementById('zrz-fab-root')) document.body.appendChild(root);
    buildActions();
    bind();
  }
  mount();

  window.zrzFab = { open: open, close: close, toggle: toggle };
})();
