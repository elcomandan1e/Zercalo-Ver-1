/* patches/06-nav.js — часть 1/3 · Навигация, Волна 1
   · Ролевой таббар (свой набор вкладок под каждую роль)
   · Хлебные крошки в модалках
   · Уведомления — отдельная вкладка
   Часть 2: Command Palette + иконка ⌘ + подсказка
   Часть 3: Bottom Sheet + долгий тап + фикс подложек
*/
(function(){
  if(window._zrz06NavP1) return;
  window._zrz06NavP1 = true;

  /* ============================================================
     1. РОЛЕВОЙ ТАББАР
     ============================================================ */

  function tabsForRole(u){
    if(!u) return [];
    var role = u.role;
    var unread = 0;
    try { unread = (typeof unreadNotificationsCount === 'function') ? unreadNotificationsCount(u.id) : 0; } catch(e){}
    if(role === 'driver'){
      return [
        {key:'orders',           ico:'🏠', label:'Сегодня'},
        {key:'calendar-routes',  ico:'🚚', label:'Маршруты'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    if(role === 'master'){
      return [
        {key:'orders',           ico:'🔧', label:'Работа'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'notifications',    ico:'🔔', label:'События', badge:unread},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    if(role === 'surveyor'){
      return [
        {key:'orders',           ico:'🏠', label:'Сегодня'},
        {key:'clients',          ico:'👥', label:'Клиенты'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    /* admin / manager */
    return [
      {key:'orders',           ico:'🏠', label:'Сегодня'},
      {key:'clients',          ico:'👥', label:'Клиенты'},
      {key:'calendar',         ico:'📅', label:'Календарь'},
      {key:'notifications',    ico:'🔔', label:'Уведомл.', badge:unread},
      {key:'more',             ico:'☰', label:'Ещё'}
    ];
  }

  function normalizeActiveTab(){
    var a = (typeof activeTab !== 'undefined') ? activeTab : 'orders';
    try {
      if(a === 'route_detail') return 'calendar-routes';
      if(a === 'calendar' && calState && calState.section === 'routes') return 'calendar-routes';
      if(a === 'contractors') return 'more';
    } catch(e){}
    return a;
  }

  function renderRoleTabs(){
    var el = document.getElementById('tabbar');
    if(!el) return;
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u){ el.style.display = 'none'; return; }
    if(document.getElementById('authScreen')){ el.style.display = 'none'; return; }
    el.style.display = 'flex';
    var tabs = tabsForRole(u);
    var activeKey = normalizeActiveTab();
    if(tabs.length >= 5) el.classList.add('zrz-tabs-5');
    else el.classList.remove('zrz-tabs-5');
    el.innerHTML = tabs.map(function(t){
      var badge = t.badge ? '<span class="tabbar-badge">'+(t.badge>99?'99+':t.badge)+'</span>' : '';
      var isActive = (activeKey === t.key);
      return '<button type="button" class="tabbar-btn'+(isActive?' active':'')+'" data-tab="'+t.key+'" onclick="zrzSwitchTab(\''+t.key+'\')"><span class="tb-ico">'+t.ico+badge+'</span><span>'+t.label+'</span></button>';
    }).join('');
  }

  /* Экспорт: этот же обработчик переиспользуется частью 3 (Bottom Sheet) */
  window.zrzSwitchTab = function(tab){
    try{
      if(tab === 'calendar-routes'){
        activeTab = 'calendar';
        try { calState.section = 'routes'; } catch(e){}
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'notifications'){
        activeTab = 'notifications';
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'more'){
        /* Часть 3 перехватит это и откроет Bottom Sheet.
           Если части 3 нет — открываем старую страницу «Ещё». */
        activeTab = 'more';
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'orders'){
        if(typeof switchTab === 'function') switchTab('orders');
        else { activeTab = 'orders'; render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'clients'){
        if(typeof switchTab === 'function') switchTab('clients');
        else { activeTab = 'clients'; render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'calendar'){
        activeTab = 'calendar';
        try { calState.section = 'events'; } catch(e){}
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(typeof switchTab === 'function') switchTab(tab);
    }catch(e){ try{console.warn('[06-nav p1] switchTab', e);}catch(_){} }
  };

  /* Переопределяем ядровый renderTabs */
  window.renderTabs = renderRoleTabs;

  /* ============================================================
     2. УВЕДОМЛЕНИЯ КАК ВКЛАДКА
     ============================================================ */

  function renderNotificationsTab(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';
    var list = [];
    try { list = (typeof notificationsOfUser === 'function') ? notificationsOfUser(u.id) : []; } catch(e){}
    var unread = 0;
    try { unread = (typeof unreadNotificationsCount === 'function') ? unreadNotificationsCount(u.id) : 0; } catch(e){}
    var html = '<div class="section-title" style="margin-top:8px">🔔 Уведомления</div>';
    if(!list.length){
      html += '<div class="empty-cta"><span class="ec-ico">🔔</span><div class="ec-title">Пока нет уведомлений</div><div class="ec-sub">Здесь появятся назначения на события, изменения и маршруты.</div></div>';
      html += '<div class="footer-brand" style="margin-top:20px">'+(typeof LOGO_MARK==='function'?LOGO_MARK(20):'')+'<span>Зерцало • уведомления</span></div>';
      return html;
    }
    html += '<div class="chips sort-chips" style="margin-bottom:12px">';
    html += '<button type="button" class="chip sort-chip" onclick="markAllNotifRead();render()">✓ Прочитать все</button>';
    html += '<button type="button" class="chip sort-chip" onclick="clearReadNotif()">🧹 Удалить прочитанные</button>';
    html += '</div>';
    var readCnt = list.length - unread;
    html += '<div style="display:flex;gap:18px;font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:12px;padding:0 4px">';
    html += '<span>Непрочитанных: <b style="color:var(--accent-deep)">'+unread+'</b></span>';
    html += '<span>Прочитанных: <b>'+readCnt+'</b></span>';
    html += '<span>Всего: <b>'+list.length+'</b></span>';
    html += '</div>';
    html += list.map(function(n){
      var cls = n.readAt ? '' : ' unread';
      var ico = n.type === 'assigned' ? '📅' : (n.type === 'moved' ? '📆' : (n.type === 'removed' ? '🗑' : (n.type === 'route' ? '🚚' : '🔔')));
      return '<div class="notif-item'+cls+'" onclick="onNotifClick('+n.id+')">' +
        '<div class="notif-ico '+(n.type||'')+'">'+ico+'</div>' +
        '<div class="notif-body">' +
          '<div class="notif-title">'+esc(n.title||'')+'</div>' +
          '<div class="notif-text">'+esc(n.body||'')+'</div>' +
          '<div class="notif-time">'+new Date(n.createdAt).toLocaleString('ru-RU')+(n.readAt?' • прочитано':'')+'</div>' +
        '</div>' +
      '</div>';
    }).join('');
    html += '<div class="footer-brand" style="margin-top:20px">'+(typeof LOGO_MARK==='function'?LOGO_MARK(20):'')+'<span>Зерцало • уведомления</span></div>';
    return html;
  }
  window.renderNotificationsTab = renderNotificationsTab;

  /* Обёртка render() для поддержки activeTab === 'notifications' */
  function wrapRender(){
    if(window._zrz06RenderWrapped) return;
    if(typeof window.render !== 'function') return;
    var orig = window.render;
    window.render = function(){
      var isNotif = (typeof activeTab !== 'undefined' && activeTab === 'notifications');
      if(isNotif) activeTab = 'more';
      var res = orig.apply(this, arguments);
      if(isNotif){
        activeTab = 'notifications';
        var appEl = document.getElementById('app');
        if(appEl) appEl.innerHTML = renderNotificationsTab();
        var backBtn = document.getElementById('backBtn');
        var shareBtn = document.getElementById('shareBtn');
        var settingsBtn = document.getElementById('settingsBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var notifBtn = document.getElementById('notifBtn');
        if(backBtn) backBtn.style.display = 'none';
        if(shareBtn) shareBtn.style.display = 'none';
        if(settingsBtn) settingsBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(notifBtn) notifBtn.style.display = 'none';
        if(typeof renderRoleTabs === 'function') renderRoleTabs();
      }
      return res;
    };
    window._zrz06RenderWrapped = true;
  }

  /* ============================================================
     3. ХЛЕБНЫЕ КРОШКИ В МОДАЛКАХ
     ============================================================ */

  function buildCrumbsForModal(){
    var crumbs = [];
    var curTab = (typeof activeTab !== 'undefined') ? activeTab : 'orders';
    var rootLabel = 'Назад';
    if(curTab === 'orders') rootLabel = 'Заказы';
    else if(curTab === 'clients') rootLabel = 'Клиенты';
    else if(curTab === 'calendar') rootLabel = 'Календарь';
    else if(curTab === 'contractors') rootLabel = 'Контрагенты';
    else if(curTab === 'routes') rootLabel = 'Маршруты';
    else if(curTab === 'route_detail') rootLabel = 'Маршруты';
    else if(curTab === 'more') rootLabel = 'Ещё';
    else if(curTab === 'notifications') rootLabel = 'Уведомления';
    crumbs.push({label:rootLabel, closable:true});

    if(curTab === 'orders' && typeof currentOrderId !== 'undefined' && currentOrderId){
      try {
        var o = db.orders.find(function(x){return x.id === currentOrderId;});
        if(o) crumbs.push({label:'Заказ № ' + (o.orderNum || '—'), closable:false});
      } catch(e){}
    }
    if(curTab === 'clients' && typeof currentClientId !== 'undefined' && currentClientId){
      try {
        var c = db.clients.find(function(x){return x.id === currentClientId;});
        if(c){
          var nm = (typeof clientFullName === 'function') ? clientFullName(c) : '';
          crumbs.push({label:'Клиент: ' + (nm || 'Без имени'), closable:false});
        }
      } catch(e){}
    }
    if((curTab === 'route_detail' || curTab === 'routes') && typeof currentRouteId !== 'undefined' && currentRouteId){
      try {
        var r = db.routes.find(function(x){return x.id === currentRouteId;});
        if(r) crumbs.push({label:r.title || 'Маршрут', closable:false});
      } catch(e){}
    }
    return crumbs;
  }

  function injectCrumbs(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('.zrz-crumbs')) return;
    if(modal.querySelector('.modal-crumbs')) return;
    var crumbs = buildCrumbsForModal();
    if(!crumbs.length) return;
    var html = '<div class="zrz-crumbs">';
    crumbs.forEach(function(c, i){
      var isLast = (i === crumbs.length - 1);
      var cls = 'zrz-crumb' + (isLast ? ' zrz-crumb-cur' : '');
      var action = (!isLast && c.closable) ? ' onclick="closeModalWithConfirm()"' : '';
      html += '<span class="'+cls+'"'+action+'>'+esc(c.label)+'</span>';
      if(!isLast) html += '<span class="bc-sep">›</span>';
    });
    html += '</div>';
    var h2 = modal.querySelector('h2');
    if(h2) h2.insertAdjacentHTML('afterend', html);
    else modal.insertAdjacentHTML('afterbegin', html);
  }

  function wrapShowModal(){
    if(window._zrz06ShowModalWrapped) return;
    if(typeof window.showModal !== 'function') return;
    var orig = window.showModal;
    window.showModal = function(){
      var res = orig.apply(this, arguments);
      setTimeout(injectCrumbs, 30);
      return res;
    };
    window._zrz06ShowModalWrapped = true;
  }

  /* ============================================================
     4. CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-nav-css')) return;
    var css = ''
      /* Крошки */
      + '.zrz-crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 0 10px;margin-bottom:4px;font-size:12px;color:var(--muted);font-weight:600}'
      + '.zrz-crumb{padding:3px 9px;background:var(--accent-soft);border-radius:8px;color:var(--accent-deep);transition:background .15s ease}'
      + '.zrz-crumb[onclick]{cursor:pointer}'
      + '.zrz-crumb[onclick]:active{background:var(--accent-line)}'
      + '.zrz-crumb-cur{background:transparent !important;color:var(--muted) !important;font-weight:800;padding-left:0}'
      + '.zrz-crumbs .bc-sep{color:var(--muted-2);font-weight:700}'
      /* Компактный таббар при 5 вкладках */
      + '.tabbar.zrz-tabs-5 .tabbar-btn{padding:8px 2px 6px;font-size:10px}'
      + '.tabbar.zrz-tabs-5 .tabbar-btn .tb-ico{font-size:20px}'
      + '.tabbar.zrz-tabs-5 .tabbar-btn span:last-child{font-size:9.5px;letter-spacing:-0.2px}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-nav-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     5. ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); } catch(e){}
    try { wrapShowModal(); } catch(e){}
    try { wrapRender(); } catch(e){}
    try {
      if(typeof currentUser === 'function' && currentUser()){
        renderRoleTabs();
      }
    } catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 400);
  setTimeout(apply, 1200);

  /* Периодическая перерисовка таббара — если ядро пересоздаст его */
  var _navInterval = setInterval(function(){
    try {
      var el = document.getElementById('tabbar');
      if(!el) return;
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      var wantRole = tabsForRole(u).length;
      var haveCount = el.querySelectorAll('.tabbar-btn').length;
      if(haveCount !== wantRole){
        renderRoleTabs();
      }
    } catch(e){}
  }, 1500);
  setTimeout(function(){ clearInterval(_navInterval); }, 60000);

  /* Перехват кликов по старым кнопкам ядра (если они ещё в DOM) */
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.tabbar-btn');
    if(!btn) return;
    var tab = btn.getAttribute('data-tab');
    if(!tab) return;
    if(btn.getAttribute('onclick') && btn.getAttribute('onclick').indexOf('zrzSwitchTab') >= 0) return;
    e.preventDefault();
    e.stopPropagation();
    window.zrzSwitchTab(tab);
  }, true);

  try{ console.log('[06-nav p1] ролевой таббар + крошки + уведомления-вкладка активны'); }catch(_){}
})();
/* patches/06-nav.js — часть 2/3 · Command Palette + ⌘ + подсказка
   · Command Palette: долгий тап по логотипу (Pointer Events)
     или свайп 2 пальцами вниз
   · Живой поиск по заказам / клиентам / контрагентам
   · Иконка ⌘ рядом с логотипом
   · Подсказка при первом входе (один раз, с пульсацией)
   Часть 3: Bottom Sheet + долгий тап на заказе + фикс подложек
*/
(function(){
  if(window._zrz06NavP2) return;
  window._zrz06NavP2 = true;

  var _paletteOpen = false;
  var HINT_KEY = 'zrz_palette_hint_seen_v1';
  var _hintShown = false;

  /* ============================================================
     1. СПИСОК КОМАНД
     ============================================================ */

  function getCommands(){
    var cmds = [];
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return cmds;

    try { if(typeof canCreateOrder === 'function' && canCreateOrder())
      cmds.push({k:'act', ico:'📋', label:'Новый заказ', hint:'Создать заказ', act:'openNewOrder'});
    } catch(e){}
    try { if(typeof canManageClients === 'function' && canManageClients())
      cmds.push({k:'act', ico:'👤', label:'Новый клиент', hint:'Добавить в базу', act:'openClientFormNull'});
    } catch(e){}
    try { if(typeof canManageEvents === 'function' && canManageEvents())
      cmds.push({k:'act', ico:'📅', label:'Новое событие', hint:'Замер / монтаж', act:'openEventFormNull'});
    } catch(e){}
    try { if(typeof canManageRoutes === 'function' && canManageRoutes())
      cmds.push({k:'act', ico:'🚚', label:'Новый маршрут', hint:'Добавить точки', act:'openRouteFormNull'});
    } catch(e){}
    try { if(typeof canManageContractors === 'function' && canManageContractors())
      cmds.push({k:'act', ico:'🏢', label:'Новый контрагент', hint:'Поставщик / партнёр', act:'openContractorFormNull'});
    } catch(e){}

    cmds.push({k:'go', ico:'🏠', label:'Сегодня', hint:'Главный экран', act:'goOrders'});
    cmds.push({k:'go', ico:'👥', label:'Клиенты', hint:'База клиентов', act:'goClients'});
    cmds.push({k:'go', ico:'📅', label:'Календарь', hint:'События', act:'goCalendar'});
    cmds.push({k:'go', ico:'🔔', label:'Уведомления', hint:'Что нового', act:'goNotifications'});
    cmds.push({k:'go', ico:'☰', label:'Ещё', hint:'Все разделы', act:'goMore'});

    try { if(typeof userCan === 'function' && userCan('orders.pricing'))
      cmds.push({k:'go', ico:'📋', label:'Прайс-лист', hint:'Цены и позиции', act:'openPriceBook'});
    } catch(e){}
    try { if(typeof canViewReports === 'function' && canViewReports())
      cmds.push({k:'go', ico:'📊', label:'Отчёты', hint:'Статистика', act:'openReports'});
    } catch(e){}
    try { if(typeof canViewTrash === 'function' && canViewTrash())
      cmds.push({k:'go', ico:'🗑', label:'Корзина', hint:'Удалённое', act:'openTrash'});
    } catch(e){}
    try { if(typeof canManageSync === 'function' && canManageSync())
      cmds.push({k:'go', ico:'☁️', label:'Синхронизация', hint:'Облако', act:'openSyncPanel'});
    } catch(e){}
    try { if(typeof canManageUsers === 'function' && canManageUsers()){
      cmds.push({k:'go', ico:'👥', label:'Пользователи', hint:'Команда', act:'openUsers'});
      cmds.push({k:'go', ico:'⚙️', label:'Роли и права', hint:'Доступы', act:'openRolesSettings'});
    }} catch(e){}
    cmds.push({k:'go', ico:'⚙️', label:'Настройки', hint:'Реквизиты, тема', act:'openSettings'});
    try { if(typeof canViewHelp === 'function' && canViewHelp()){
      cmds.push({k:'go', ico:'📖', label:'Помощь', hint:'Инструкция', act:'openHelp'});
      cmds.push({k:'go', ico:'📚', label:'Документация', hint:'Техдок', act:'openDocs'});
    }} catch(e){}

    return cmds;
  }

  /* ============================================================
     2. ПОИСК ПО ДАННЫМ
     ============================================================ */

  function searchData(q){
    q = String(q || '').trim().toLowerCase();
    if(q.length < 2) return [];
    var res = [];

    try {
      var orders = (typeof visibleOrders === 'function') ? visibleOrders() : [];
      var orderHits = 0;
      orders.forEach(function(o){
        if(orderHits >= 5) return;
        var nm = (typeof orderClientName === 'function') ? orderClientName(o) : '';
        var num = o.orderNum || '';
        var addr = (typeof orderAddressShort === 'function') ? orderAddressShort(o) : '';
        var s = (nm + ' ' + num + ' ' + addr).toLowerCase();
        if(s.indexOf(q) >= 0){
          res.push({
            k:'find', ico:'🏠',
            label:'№ ' + (num || '—') + ' · ' + (nm || 'Без имени'),
            hint:addr || 'Заказ',
            act:'openOrder', id:o.id
          });
          orderHits++;
        }
      });
    } catch(e){}

    try {
      var clients = db.clients.filter(function(c){ return !c.archived; });
      var clientHits = 0;
      clients.forEach(function(c){
        if(clientHits >= 5) return;
        var nm = (typeof clientFullName === 'function') ? clientFullName(c) : '';
        var ph = c.phone || '';
        var s = (nm + ' ' + ph).toLowerCase();
        if(s.indexOf(q) >= 0){
          res.push({
            k:'find', ico:'👤',
            label:nm || 'Без имени',
            hint:ph ? (typeof formatPhone === 'function' ? formatPhone(ph) : ph) : 'Клиент',
            act:'openClient', id:c.id
          });
          clientHits++;
        }
      });
    } catch(e){}

    try {
      var cos = db.contractors.filter(function(c){ return !c.archived; });
      var coHits = 0;
      cos.forEach(function(c){
        if(coHits >= 5) return;
        var nm = c.name || '';
        var ph = c.phone || '';
        var s = (nm + ' ' + ph).toLowerCase();
        if(s.indexOf(q) >= 0){
          res.push({
            k:'find', ico:'🏢',
            label:nm || 'Без названия',
            hint:ph ? (typeof formatPhone === 'function' ? formatPhone(ph) : ph) : 'Контрагент',
            act:'openContractorForm', id:c.id
          });
          coHits++;
        }
      });
    } catch(e){}

    return res;
  }

  /* ============================================================
     3. РЕНДЕР ТЕЛА ПАЛИТРЫ
     ============================================================ */

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderBody(query){
    var body = document.getElementById('zrz-palette-body');
    if(!body) return;
    var q = String(query || '').trim();
    var qLow = q.toLowerCase();

    var html = '';
    var results = searchData(q);
    var cmds = getCommands();

    if(!q){
      html += renderSection('⚡ Действия', cmds.filter(function(c){ return c.k === 'act'; }));
      html += renderSection('🧭 Перейти', cmds.filter(function(c){ return c.k === 'go'; }));
    } else {
      var cmdHits = cmds.filter(function(c){
        return (c.label + ' ' + (c.hint||'')).toLowerCase().indexOf(qLow) >= 0;
      });
      var acts = cmdHits.filter(function(c){ return c.k === 'act'; });
      var goes = cmdHits.filter(function(c){ return c.k === 'go'; });

      if(results.length) html += renderSection('🔎 Найти', results);
      if(acts.length) html += renderSection('⚡ Действия', acts);
      if(goes.length) html += renderSection('🧭 Перейти', goes);

      if(!html){
        html = '<div class="zrz-palette-empty">Ничего не найдено<br><span>Попробуйте другой запрос</span></div>';
      }
    }
    body.innerHTML = html;
  }

  function renderSection(title, items){
    if(!items || !items.length) return '';
    var html = '<div class="zrz-palette-sec"><div class="zrz-palette-sec-title">' + title + '</div>';
    items.forEach(function(it){
      var idAttr = it.id != null ? ' data-id="' + it.id + '"' : '';
      html += '<button type="button" class="zrz-palette-item" data-act="' + esc2(it.act) + '"' + idAttr + '>'
        + '<span class="zrz-palette-item-ico">' + it.ico + '</span>'
        + '<span class="zrz-palette-item-text">'
        + '<span class="zrz-palette-item-label">' + esc2(it.label) + '</span>'
        + (it.hint ? '<span class="zrz-palette-item-hint">' + esc2(it.hint) + '</span>' : '')
        + '</span>'
        + '</button>';
    });
    html += '</div>';
    return html;
  }

  /* ============================================================
     4. ОТКРЫТИЕ / ЗАКРЫТИЕ
     ============================================================ */

  function openPalette(){
    if(_paletteOpen) return;
    if(document.getElementById('zrz-palette')) return;
    _paletteOpen = true;
    markHintSeenSilent();
    var hint = document.getElementById('zrz-palette-hint');
    if(hint) hint.remove();
    var logo = document.getElementById('headerLogo');
    if(logo) logo.classList.remove('zrz-hint-pulse');
    try { if(typeof haptic === 'function') haptic(8); } catch(e){}

    var bg = document.createElement('div');
    bg.id = 'zrz-palette';
    bg.className = 'zrz-palette-bg';
    bg.innerHTML =
      '<div class="zrz-palette">'
      + '<div class="zrz-palette-head">'
      +   '<span class="zrz-palette-ico">🔍</span>'
      +   '<input id="zrz-palette-input" class="zrz-palette-input" type="text" placeholder="Что нужно сделать или найти?" autocomplete="off" spellcheck="false">'
      +   '<button type="button" class="zrz-palette-close" id="zrz-palette-close" aria-label="Закрыть">✕</button>'
      + '</div>'
      + '<div class="zrz-palette-body" id="zrz-palette-body"></div>'
      + '</div>';
    document.body.appendChild(bg);

    var input = document.getElementById('zrz-palette-input');
    var closeBtn = document.getElementById('zrz-palette-close');
    var bodyEl = document.getElementById('zrz-palette-body');

    input.addEventListener('input', function(){ renderBody(input.value); });
    input.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ closePalette(); }
    });
    closeBtn.addEventListener('click', closePalette);
    bg.addEventListener('click', function(e){
      if(e.target === bg) closePalette();
    });
    bodyEl.addEventListener('click', function(e){
      var btn = e.target.closest('.zrz-palette-item');
      if(!btn) return;
      var act = btn.getAttribute('data-act');
      var idAttr = btn.getAttribute('data-id');
      var id = idAttr != null ? parseInt(idAttr, 10) : null;
      runAction(act, id);
    });

    renderBody('');
    setTimeout(function(){ try{ input.focus(); }catch(e){} }, 60);
  }

  function closePalette(){
    if(!_paletteOpen) return;
    _paletteOpen = false;
    var el = document.getElementById('zrz-palette');
    if(el) el.remove();
  }
  window.zrzClosePalette = closePalette;
  window.zrzOpenPalette = openPalette;

  /* ============================================================
     5. ДЕЙСТВИЯ
     ============================================================ */

  function runAction(act, id){
    closePalette();
    setTimeout(function(){
      try {
        if(act === 'openNewOrder'){ if(typeof openNewOrder === 'function') openNewOrder(); return; }
        if(act === 'openClientFormNull'){ if(typeof openClientForm === 'function') openClientForm(null); return; }
        if(act === 'openEventFormNull'){ if(typeof openEventForm === 'function') openEventForm(null, null); return; }
        if(act === 'openRouteFormNull'){ if(typeof openRouteForm === 'function') openRouteForm(null); return; }
        if(act === 'openContractorFormNull'){ if(typeof openContractorForm === 'function') openContractorForm(null); return; }

        if(act === 'goOrders'){ if(typeof window.zrzSwitchTab === 'function') window.zrzSwitchTab('orders'); return; }
        if(act === 'goClients'){ if(typeof window.zrzSwitchTab === 'function') window.zrzSwitchTab('clients'); return; }
        if(act === 'goCalendar'){ if(typeof window.zrzSwitchTab === 'function') window.zrzSwitchTab('calendar'); return; }
        if(act === 'goNotifications'){ if(typeof window.zrzSwitchTab === 'function') window.zrzSwitchTab('notifications'); return; }
        if(act === 'goMore'){ if(typeof window.zrzSwitchTab === 'function') window.zrzSwitchTab('more'); return; }

        if(act === 'openSettings'){ if(typeof openSettings === 'function') openSettings(); return; }
        if(act === 'openPriceBook'){ if(typeof openPriceBook === 'function') openPriceBook(); return; }
        if(act === 'openReports'){ if(typeof openReports === 'function') openReports(); return; }
        if(act === 'openTrash'){ if(typeof openTrash === 'function') openTrash(); return; }
        if(act === 'openSyncPanel'){ if(typeof openSyncPanel === 'function') openSyncPanel(); return; }
        if(act === 'openUsers'){ if(typeof openUsers === 'function') openUsers(); return; }
        if(act === 'openRolesSettings'){ if(typeof openRolesSettings === 'function') openRolesSettings(); return; }
        if(act === 'openHelp'){ if(typeof openHelp === 'function') openHelp(); return; }
        if(act === 'openDocs'){ if(typeof openDocs === 'function') openDocs(); return; }

        if(act === 'openOrder' && id != null){ if(typeof openOrder === 'function') openOrder(id); return; }
        if(act === 'openClient' && id != null){ if(typeof openClient === 'function') openClient(id); return; }
        if(act === 'openContractorForm' && id != null){ if(typeof openContractorForm === 'function') openContractorForm(id); return; }
      }catch(e){ try{console.warn('[06-nav p2] action', act, e);}catch(_){} }
    }, 80);
  }

  /* ============================================================
     6. ДОЛГИЙ ТАП ПО ЛОГОТИПУ — Pointer Events + фикс
     ============================================================ */

  function bindLogoLongPress(){
    var logo = document.getElementById('headerLogo');
    if(!logo || logo.dataset.paletteBound) return;
    logo.dataset.paletteBound = '1';

    logo.style.userSelect = 'none';
    logo.style.webkitUserSelect = 'none';
    logo.style.webkitTouchCallout = 'none';
    logo.style.touchAction = 'manipulation';

    logo.addEventListener('contextmenu', function(e){ e.preventDefault(); }, false);

    var timer = null;
    var startX = 0, startY = 0;
    var moved = false;
    var MOVE_TOLERANCE = 12;

    function begin(x, y){
      clearTimeout(timer);
      startX = x; startY = y; moved = false;
      timer = setTimeout(function(){
        if(moved) return;
        try { if(typeof haptic === 'function') haptic([10, 40, 10]); } catch(_){}
        try { if(typeof haptic === 'function') setTimeout(function(){ haptic(15); }, 100); } catch(_){}
        openPalette();
      }, 650);
    }
    function move(x, y){
      if(!timer) return;
      var dx = x - startX, dy = y - startY;
      if(Math.hypot(dx, dy) > MOVE_TOLERANCE){
        moved = true;
        clearTimeout(timer);
        timer = null;
      }
    }
    function end(){
      if(timer){ clearTimeout(timer); timer = null; }
    }

    if(window.PointerEvent){
      logo.addEventListener('pointerdown', function(e){
        if(e.button && e.button !== 0) return;
        begin(e.clientX, e.clientY);
      });
      logo.addEventListener('pointermove', function(e){ move(e.clientX, e.clientY); });
      logo.addEventListener('pointerup', end);
      logo.addEventListener('pointercancel', end);
      logo.addEventListener('pointerleave', end);
      return;
    }

    logo.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1) return;
      begin(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive:true});
    logo.addEventListener('touchmove', function(e){
      if(e.touches.length !== 1) return;
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive:true});
    logo.addEventListener('touchend', end);
    logo.addEventListener('touchcancel', end);

    logo.addEventListener('mousedown', function(e){ begin(e.clientX, e.clientY); });
    logo.addEventListener('mousemove', function(e){ move(e.clientX, e.clientY); });
    logo.addEventListener('mouseup', end);
    logo.addEventListener('mouseleave', end);
  }

  /* ============================================================
     7. СВАЙП ДВУМЯ ПАЛЬЦАМИ ВНИЗ
     ============================================================ */

  function bindTwoFingerSwipe(){
    if(window._zrz06PaletteSwipeBound) return;
    window._zrz06PaletteSwipeBound = true;
    var startY = null;
    var startT = 0;
    document.addEventListener('touchstart', function(e){
      if(e.touches.length === 2){
        startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        startT = Date.now();
      } else { startY = null; }
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
      if(startY == null) return;
      if(e.touches.length !== 2){ startY = null; return; }
      var y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      var dy = y - startY;
      if(dy > 90 && (Date.now() - startT) < 500){
        if(!document.querySelector('.modal-bg') && !document.getElementById('authScreen')){
          startY = null;
          try { if(typeof haptic === 'function') haptic([10, 40, 10]); } catch(_){}
          openPalette();
        }
      }
    }, {passive:true});
    document.addEventListener('touchend', function(){ startY = null; }, {passive:true});
  }

  /* ============================================================
     8. ИКОНКА ⌘ + ПОДСКАЗКА
     ============================================================ */

  function hasSeenHint(){
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch(e){ return false; }
  }
  function markHintSeen(){
    try { localStorage.setItem(HINT_KEY, '1'); } catch(e){}
    _hintShown = true;
  }
  function markHintSeenSilent(){
    try { localStorage.setItem(HINT_KEY, '1'); } catch(e){}
  }

  function cmdSvg(size){
    var s = size || 18;
    return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" aria-hidden="true">'
      + '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>'
      + '</svg>';
  }

  function injectCmdButton(){
    var logo = document.getElementById('headerLogo');
    if(!logo) return;
    if(document.getElementById('zrz-cmd-btn')) return;
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return;
    if(document.getElementById('authScreen')) return;

    var btn = document.createElement('button');
    btn.id = 'zrz-cmd-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Открыть палитру команд');
    btn.setAttribute('title', 'Команды и поиск');
    btn.innerHTML = cmdSvg(18);
    btn.onclick = function(e){
      e.stopPropagation();
      openPalette();
    };
    logo.appendChild(btn);
  }

  function showHint(){
    if(_hintShown) return;
    if(hasSeenHint()) return;
    if(document.getElementById('zrz-palette-hint')) return;
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return;
    if(document.getElementById('authScreen')) return;
    if(document.querySelector('.modal-bg')) return;
    if(document.getElementById('zrz-palette')) return;

    _hintShown = true;

    var bg = document.createElement('div');
    bg.id = 'zrz-palette-hint';
    bg.innerHTML =
      '<div class="zrz-hint-card">'
      +   '<div class="zrz-hint-ico">'+cmdSvg(32)+'</div>'
      +   '<div class="zrz-hint-title">Быстрый доступ ко всему</div>'
      +   '<div class="zrz-hint-text">'
      +     'Нажмите <span class="zrz-hint-kbd">⌘</span> рядом с логотипом или <b>удерживайте логотип</b> — '
      +     'откроется палитра команд и поиска.'
      +   '</div>'
      +   '<button type="button" class="zrz-hint-btn" id="zrz-hint-ok">Понятно</button>'
      + '</div>';
    document.body.appendChild(bg);

    var logo = document.getElementById('headerLogo');
    if(logo) logo.classList.add('zrz-hint-pulse');

    function close(){
      var el = document.getElementById('zrz-palette-hint');
      if(el) el.remove();
      if(logo) logo.classList.remove('zrz-hint-pulse');
      markHintSeen();
    }
    document.getElementById('zrz-hint-ok').onclick = close;
    bg.addEventListener('click', function(e){
      if(e.target === bg) close();
    });
    document.addEventListener('keydown', function onKey(e){
      if(e.key === 'Escape' || e.key === 'Enter'){
        close();
        document.removeEventListener('keydown', onKey);
      }
    });
  }

  /* ============================================================
     9. CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-palette-css')) return;
    var css = ''
      /* Command Palette */
      + '.zrz-palette-bg{position:fixed;inset:0;z-index:1200;background:rgba(20,32,52,0.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:flex-start;justify-content:center;padding:max(env(safe-area-inset-top),18px) 12px 12px;animation:zrz-palette-in .18s ease both}'
      + '@keyframes zrz-palette-in{from{opacity:0}to{opacity:1}}'
      + '.zrz-palette{width:100%;max-width:560px;background:var(--surface);border-radius:20px;box-shadow:0 20px 60px rgba(20,32,52,0.35);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 60px);animation:zrz-palette-pop .22s cubic-bezier(.2,.85,.3,1) both}'
      + '@keyframes zrz-palette-pop{from{transform:translateY(-14px) scale(0.98);opacity:0.6}to{transform:none;opacity:1}}'
      + '.zrz-palette-head{display:flex;align-items:center;gap:10px;padding:14px 14px 14px 18px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--surface),rgba(91,127,184,0.04))}'
      + '.zrz-palette-ico{font-size:18px;line-height:1;flex-shrink:0;opacity:0.8}'
      + '.zrz-palette-input{flex:1;border:none !important;background:transparent !important;padding:6px 0 !important;font-size:16px !important;font-weight:600;color:var(--text);margin:0 !important;box-shadow:none !important;outline:none !important}'
      + '.zrz-palette-input::placeholder{color:var(--muted);font-weight:500}'
      + '.zrz-palette-close{width:36px;height:36px;border-radius:50%;border:none;background:var(--accent-soft);color:var(--accent-deep);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0}'
      + '.zrz-palette-close:active{background:var(--accent-line);transform:scale(0.94)}'
      + '.zrz-palette-body{flex:1;overflow-y:auto;padding:6px 6px 12px;-webkit-overflow-scrolling:touch}'
      + '.zrz-palette-sec{margin-top:6px}'
      + '.zrz-palette-sec-title{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;padding:10px 14px 6px}'
      + '.zrz-palette-item{display:flex;align-items:center;gap:14px;width:100%;padding:12px 14px;border:none;background:transparent;font-family:inherit;cursor:pointer;text-align:left;border-radius:12px;color:var(--text);transition:background .12s ease}'
      + '.zrz-palette-item:hover{background:var(--accent-soft)}'
      + '.zrz-palette-item:active{background:var(--accent-line);transform:scale(0.99)}'
      + '.zrz-palette-item-ico{font-size:20px;line-height:1;flex-shrink:0;width:26px;text-align:center;opacity:0.9}'
      + '.zrz-palette-item-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}'
      + '.zrz-palette-item-label{font-size:15px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.zrz-palette-item-hint{font-size:12px;color:var(--muted);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.zrz-palette-empty{padding:50px 20px;text-align:center;color:var(--muted);font-size:14px;font-weight:600}'
      + '.zrz-palette-empty span{font-size:12px;font-weight:500;display:block;margin-top:4px;opacity:0.7}'
      + '@media (max-width:420px){.zrz-palette-head{padding:12px 10px 12px 14px}.zrz-palette-item{padding:11px 12px;gap:12px}.zrz-palette-item-ico{font-size:18px;width:22px}.zrz-palette-item-label{font-size:14.5px}}'
      /* Иконка ⌘ */
      + '#zrz-cmd-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:10px;border:none;cursor:pointer;background:var(--accent-soft);color:var(--accent-deep);margin-left:8px;flex-shrink:0;padding:0;transition:transform .12s ease,background .15s ease;font-family:inherit;-webkit-tap-highlight-color:transparent}'
      + '#zrz-cmd-btn:hover{background:var(--accent-line)}'
      + '#zrz-cmd-btn:active{transform:scale(0.92);background:var(--accent-line)}'
      + '#zrz-cmd-btn svg{display:block;width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
      + '@media (max-width:380px){#zrz-cmd-btn{width:28px;height:28px;margin-left:6px}#zrz-cmd-btn svg{width:16px;height:16px}}'
      /* Пульсация логотипа при показе подсказки */
      + '#headerLogo.zrz-hint-pulse svg{animation:zrz-logo-hint-pulse 1.4s ease-in-out infinite}'
      + '@keyframes zrz-logo-hint-pulse{0%,100%{transform:scale(1);filter:none}50%{transform:scale(1.08);filter:drop-shadow(0 0 12px rgba(91,127,184,0.55))}}'
      /* Подсказка */
      + '#zrz-palette-hint{position:fixed;inset:0;z-index:1300;background:rgba(20,32,52,0.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:20px;animation:zrz-hint-in .25s ease both}'
      + '@keyframes zrz-hint-in{from{opacity:0}to{opacity:1}}'
      + '#zrz-palette-hint .zrz-hint-card{background:var(--surface);border-radius:24px;padding:28px 24px 22px;max-width:360px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.35);text-align:center;animation:zrz-hint-pop .32s cubic-bezier(.2,.85,.3,1) both}'
      + '@keyframes zrz-hint-pop{from{transform:translateY(20px) scale(0.94);opacity:0}to{transform:none;opacity:1}}'
      + '#zrz-palette-hint .zrz-hint-ico{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#8badd8 0%,#5b7fb8 100%);color:#fff;margin-bottom:18px;box-shadow:0 10px 26px rgba(91,127,184,0.42)}'
      + '#zrz-palette-hint .zrz-hint-ico svg{width:32px;height:32px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'
      + '#zrz-palette-hint .zrz-hint-title{font-size:19px;font-weight:800;color:var(--text);line-height:1.25;margin-bottom:10px}'
      + '#zrz-palette-hint .zrz-hint-text{font-size:14px;color:var(--text-soft);line-height:1.55;margin-bottom:22px}'
      + '#zrz-palette-hint .zrz-hint-text b{color:var(--accent-deep);font-weight:800}'
      + '#zrz-palette-hint .zrz-hint-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;background:var(--accent-soft);color:var(--accent-deep);border-radius:7px;font-weight:800;font-size:13px;vertical-align:-4px;margin:0 2px;font-family:inherit}'
      + '#zrz-palette-hint .zrz-hint-btn{display:block;width:100%;padding:15px 20px;border:none;border-radius:16px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#8badd8 0%,#5b7fb8 100%);color:#fff;box-shadow:0 10px 26px rgba(91,127,184,0.34);transition:transform .12s ease}'
      + '#zrz-palette-hint .zrz-hint-btn:active{transform:scale(0.97)}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-palette-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     10. ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); } catch(e){}
    try { bindLogoLongPress(); } catch(e){}
    try { bindTwoFingerSwipe(); } catch(e){}
    try { injectCmdButton(); } catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});

  var _iv = setInterval(function(){
    try {
      var logo = document.getElementById('headerLogo');
      if(logo && !logo.dataset.paletteBound) bindLogoLongPress();
      if(!document.getElementById('zrz-cmd-btn')) injectCmdButton();
    } catch(e){}
  }, 1500);
  setTimeout(function(){ clearInterval(_iv); }, 90000);

  /* Подсказка — через 2/4/7 секунд после входа */
  function tryShowHint(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return false;
    if(hasSeenHint()) return true;
    var logo = document.getElementById('headerLogo');
    if(!logo) return false;
    var btn = document.getElementById('zrz-cmd-btn');
    if(!btn) return false;
    showHint();
    return true;
  }
  setTimeout(tryShowHint, 2000);
  setTimeout(tryShowHint, 4000);
  setTimeout(tryShowHint, 7000);

  /* Ручной вызов */
  window.zrzShowPaletteHint = function(){
    try { localStorage.removeItem(HINT_KEY); } catch(e){}
    _hintShown = false;
    showHint();
  };

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && _paletteOpen) closePalette();
  });

  try{ console.log('[06-nav p2] Command Palette + ⌘ + подсказка активны'); }catch(_){}
})();
/* patches/06-nav.js — часть 3/3 · Bottom Sheet + долгий тап + фикс
   · Bottom Sheet с плитками вместо «Ещё»
   · Долгий тап на карточке заказа → контекстное меню
   · Фикс мелькания подложек свайпа (|сдвиг|>12px)
   После этого модуль 06 полностью завершён.
*/
(function(){
  if(window._zrz06NavP3) return;
  window._zrz06NavP3 = true;

  /* ============================================================
     ЧАСТЬ A. BOTTOM SHEET — вместо «Ещё»
     ============================================================ */

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function tile(icon, label, act, opts){
    opts = opts || {};
    var cls = 'zrz-tile';
    if(opts.primary) cls += ' zrz-tile-primary';
    if(opts.danger)  cls += ' zrz-tile-danger';
    if(opts.badge)   cls += ' zrz-tile-badge';
    var badgeAttr = opts.badge ? ' data-badge="'+opts.badge+'"' : '';
    return '<button type="button" class="'+cls+'"'+badgeAttr+' onclick="zrzSheetAction(\''+act+'\')"><span class="zrz-tile-ico">'+icon+'</span><span>'+esc2(label)+'</span></button>';
  }

  function buildSheetHtml(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';
    var html = '<div class="zrz-sheet">';
    html += '<div class="zrz-sheet-handle"></div>';
    html += '<div class="zrz-sheet-title">⚙️ Ещё</div>';

    /* Работа */
    var workTiles = '';
    try { if(typeof canViewReports === 'function' && canViewReports())
      workTiles += tile('📊','Отчёты','reports'); } catch(e){}
    try { if(typeof userCan === 'function' && userCan('orders.pricing'))
      workTiles += tile('📋','Прайс','priceBook'); } catch(e){}
    try { if(typeof canManageContractors === 'function' && canManageContractors())
      workTiles += tile('🏢','Контрагенты','contractors'); } catch(e){}
    try { if(typeof canViewTrash === 'function' && canViewTrash()){
      var trashCount = (db.trash && db.trash.length) || 0;
      workTiles += tile('🗑','Корзина','trash',{badge:trashCount?String(trashCount):''});
    }} catch(e){}
    if(workTiles){
      html += '<div class="zrz-sheet-sec"><div class="zrz-sheet-sec-t">Работа</div><div class="zrz-tiles">'+workTiles+'</div></div>';
    }

    /* Команда */
    var teamTiles = '';
    try { if(typeof canManageUsers === 'function' && canManageUsers()){
      var usersCount = db.users.filter(function(x){ return x.active; }).length;
      teamTiles += tile('👥','Команда','users',{badge:usersCount?String(usersCount):''});
      teamTiles += tile('🔑','Права','roles');
    }} catch(e){}
    if(teamTiles){
      html += '<div class="zrz-sheet-sec"><div class="zrz-sheet-sec-t">Команда</div><div class="zrz-tiles">'+teamTiles+'</div></div>';
    }

    /* Система */
    var sysTiles = '';
    try { if(typeof canManageSync === 'function' && canManageSync()){
      var syncOn = (db.sync && db.sync.enabled);
      sysTiles += tile('☁️','Облако','sync',{badge:syncOn?'':'!'});
      sysTiles += tile('🔐','Защита','security');
    }} catch(e){}
    try { if(('Notification' in window) && Notification.permission !== 'granted')
      sysTiles += tile('🔔','Push','push'); } catch(e){}
    try { var uChk = (typeof currentUser === 'function') ? currentUser() : null;
      if(DEBUG_MODE || (uChk && uChk.role === 'admin'))
        sysTiles += tile('🧪','Тесты','tests'); } catch(e){}
    if(sysTiles){
      html += '<div class="zrz-sheet-sec"><div class="zrz-sheet-sec-t">Система</div><div class="zrz-tiles">'+sysTiles+'</div></div>';
    }

    /* Справка */
    var helpTiles = '';
    try { if(typeof canViewHelp === 'function' && canViewHelp()){
      helpTiles += tile('📖','Помощь','help');
      helpTiles += tile('📚','Документация','docs');
    }} catch(e){}
    if(helpTiles){
      html += '<div class="zrz-sheet-sec"><div class="zrz-sheet-sec-t">Справка</div><div class="zrz-tiles">'+helpTiles+'</div></div>';
    }

    /* Аккаунт */
    var setTiles = '';
    setTiles += tile('⚙️','Настройки','settings');
    setTiles += tile('👤','Профиль','profile');
    setTiles += tile('🚪','Выйти','logout',{danger:true});
    html += '<div class="zrz-sheet-sec"><div class="zrz-sheet-sec-t">Аккаунт</div><div class="zrz-tiles">'+setTiles+'</div></div>';

    /* Профиль снизу */
    var initials = (u.name || '?').split(' ').map(function(p){ return p.charAt(0); }).join('').slice(0,2).toUpperCase();
    var roleLabel = '';
    try { roleLabel = (typeof ROLE_META !== 'undefined' && ROLE_META[u.role]) ? ROLE_META[u.role].label : u.role; } catch(e){ roleLabel = u.role; }
    html += '<div class="zrz-sheet-account"><div class="zrz-acc-avatar">'+esc2(initials)+'</div>'
      + '<div class="zrz-acc-info"><div class="zrz-acc-name">'+esc2(u.name)+'</div>'
      + '<div class="zrz-acc-role">'+esc2(roleLabel)+'</div></div></div>';

    html += '<button type="button" class="zrz-sheet-close" onclick="zrzCloseSheet()">Закрыть</button>';
    html += '</div>';
    return html;
  }

  function openSheet(){
    if(document.getElementById('zrz-sheet-bg')) return;
    try { if(typeof haptic === 'function') haptic(6); } catch(e){}
    var bg = document.createElement('div');
    bg.id = 'zrz-sheet-bg';
    bg.className = 'zrz-sheet-bg';
    bg.innerHTML = buildSheetHtml();
    document.body.appendChild(bg);

    bg.addEventListener('click', function(e){
      if(e.target === bg) closeSheet();
    });

    var sheet = bg.querySelector('.zrz-sheet');
    if(sheet){
      var sy = null, dy = 0;
      sheet.addEventListener('touchstart', function(e){
        if(sheet.scrollTop > 4) return;
        sy = e.touches[0].clientY; dy = 0;
        sheet.style.transition = 'none';
      }, {passive:true});
      sheet.addEventListener('touchmove', function(e){
        if(sy == null) return;
        dy = e.touches[0].clientY - sy;
        if(dy > 0) sheet.style.transform = 'translateY('+dy+'px)';
      }, {passive:true});
      sheet.addEventListener('touchend', function(){
        if(sy == null) return;
        sheet.style.transition = '';
        if(dy > 90){ closeSheet(); }
        else { sheet.style.transform = ''; }
        sy = null; dy = 0;
      });
    }
  }

  function closeSheet(){
    var el = document.getElementById('zrz-sheet-bg');
    if(!el) return;
    var sheet = el.querySelector('.zrz-sheet');
    if(sheet){
      sheet.style.transition = 'transform .24s ease, opacity .24s ease';
      sheet.style.transform = 'translateY(120%)';
      sheet.style.opacity = '0';
      el.style.transition = 'opacity .24s ease';
      el.style.opacity = '0';
      setTimeout(function(){ el.remove(); }, 240);
    } else {
      el.remove();
    }
  }

  window.zrzCloseSheet = closeSheet;
  window.zrzOpenSheet = openSheet;

  window.zrzSheetAction = function(act){
    closeSheet();
    setTimeout(function(){
      try {
        if(act === 'reports'      && typeof openReports === 'function')       return openReports();
        if(act === 'priceBook'    && typeof openPriceBook === 'function')     return openPriceBook();
        if(act === 'contractors'){
          activeTab = 'contractors';
          if(typeof render === 'function'){ render(); window.scrollTo(0,0); }
          return;
        }
        if(act === 'trash'        && typeof openTrash === 'function')         return openTrash();
        if(act === 'users'        && typeof openUsers === 'function')         return openUsers();
        if(act === 'roles'        && typeof openRolesSettings === 'function') return openRolesSettings();
        if(act === 'sync'         && typeof openSyncPanel === 'function')     return openSyncPanel();
        if(act === 'security'     && typeof openFirebaseSecurity === 'function') return openFirebaseSecurity();
        if(act === 'push'         && typeof requestNotifPermission === 'function'){
          return requestNotifPermission().then(function(){ if(typeof render === 'function') render(); });
        }
        if(act === 'tests'        && typeof openTestStand === 'function')     return openTestStand();
        if(act === 'help'         && typeof openHelp === 'function')          return openHelp();
        if(act === 'docs'         && typeof openDocs === 'function')          return openDocs();
        if(act === 'settings'     && typeof openSettings === 'function')      return openSettings();
        if(act === 'profile'      && typeof openProfile === 'function')       return openProfile();
        if(act === 'logout'       && typeof doLogout === 'function')          return doLogout();
      } catch(e){ try{console.warn('[06-nav p3] sheet', act, e);}catch(_){} }
    }, 100);
  };

  /* Перехватываем zrzSwitchTab: 'more' → Bottom Sheet */
  function wrapSwitchTab(){
    if(window._zrz06SheetWrapped) return;
    if(typeof window.zrzSwitchTab !== 'function') return;
    var orig = window.zrzSwitchTab;
    window.zrzSwitchTab = function(tab){
      if(tab === 'more'){ openSheet(); return; }
      return orig.apply(this, arguments);
    };
    window._zrz06SheetWrapped = true;
  }

  /* ============================================================
     ЧАСТЬ B. ДОЛГИЙ ТАП НА КАРТОЧКЕ ЗАКАЗА
     ============================================================ */

  function showOrderMenu(oid, x, y){
    var o = null;
    try { o = db.orders.find(function(oo){ return oo.id === oid; }); } catch(e){}
    if(!o) return;

    var phone = '';
    try { phone = (typeof orderClientPhone === 'function') ? orderClientPhone(o) : ''; } catch(e){}
    var addr = '';
    try { addr = (typeof orderAddressFull === 'function') ? orderAddressFull(o) : ''; } catch(e){}
    var canDel = false;
    try { canDel = (typeof canDeleteOrder === 'function') && canDeleteOrder(o); } catch(e){}

    var items = [];
    items.push({ico:'📋', label:'Открыть', act:'open'});
    if(phone){
      items.push({ico:'📞', label:'Позвонить', act:'call'});
      items.push({ico:'💬', label:'WhatsApp', act:'wa'});
    }
    if(addr) items.push({ico:'📍', label:'Открыть карту', act:'map'});
    items.push({ico:'📤', label:'Отправить бланк', act:'share'});
    if(canDel) items.push({ico:'🗑', label:'Удалить', act:'delete', danger:true});

    var bg = document.createElement('div');
    bg.id = 'zrz-order-menu-bg';
    var menu = document.createElement('div');
    menu.id = 'zrz-order-menu';

    var html = '';
    items.forEach(function(it, i){
      if(it.danger && i > 0) html += '<div class="zrz-ctx-sep"></div>';
      html += '<button type="button" data-act="'+it.act+'"'+(it.danger?' class="zrz-ctx-danger"':'')+'>'
        + '<span class="zrz-ctx-ico">'+it.ico+'</span>'
        + '<span>'+esc2(it.label)+'</span>'
        + '</button>';
    });
    menu.innerHTML = html;
    bg.appendChild(menu);
    document.body.appendChild(bg);

    var mw = 240, mh = 60 + items.length * 48;
    var px = Math.min(Math.max(12, x - mw/2), window.innerWidth - mw - 12);
    var py = Math.min(Math.max(60, y - 40), window.innerHeight - mh - 20);
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';

    try { if(typeof haptic === 'function') haptic(8); } catch(_){}

    bg.addEventListener('click', function(e){
      if(e.target === bg){ closeMenu(); return; }
      var btn = e.target.closest('#zrz-order-menu button');
      if(!btn) return;
      var act = btn.getAttribute('data-act');
      closeMenu();
      setTimeout(function(){ runOrderAction(act, o, phone, addr); }, 100);
    });
  }

  function closeMenu(){
    var el = document.getElementById('zrz-order-menu-bg');
    if(el) el.remove();
  }
  window.zrzCloseOrderMenu = closeMenu;

  function runOrderAction(act, o, phone, addr){
    try {
      if(act === 'open'){
        if(typeof openOrder === 'function') return openOrder(o.id);
      }
      if(act === 'call'){
        if(!phone) return;
        window.location.href = 'tel:' + phone.replace(/[^+\d]/g, '');
      }
      if(act === 'wa'){
        if(!phone) return;
        var digits = phone.replace(/\D/g,'');
        if(digits.charAt(0) === '8') digits = '7' + digits.slice(1);
        if(digits.charAt(0) !== '7') digits = '7' + digits;
        window.open('https://wa.me/' + digits, '_blank');
      }
      if(act === 'map'){
        if(!addr) return;
        if(typeof openMap === 'function') return openMap(addr);
      }
      if(act === 'share'){
        var prevId = (typeof currentOrderId !== 'undefined') ? currentOrderId : null;
        try { currentOrderId = o.id; } catch(e){}
        if(typeof shareCurrentOrder === 'function') shareCurrentOrder();
        setTimeout(function(){ try { currentOrderId = prevId; } catch(e){} }, 500);
      }
      if(act === 'delete'){
        if(typeof deleteOrder === 'function') return deleteOrder(o.id);
      }
    }catch(e){ try{console.warn('[06-nav p3] ctx menu', act, e);}catch(_){} }
  }

  function bindOrderLongPress(){
    if(window._zrz06OrderLPBound) return;
    window._zrz06OrderLPBound = true;

    document.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'mouse' && e.button !== 0) return;

      var wrap = e.target.closest && e.target.closest('.swipe-wrap[data-oid]');
      if(!wrap) return;
      if(e.target.closest('.tap-link, .del-x, .photo-thumb, .photo-del, .btn, .chip, button')) return;

      var oid = parseInt(wrap.getAttribute('data-oid'), 10);
      if(!oid) return;

      var startX = e.clientX, startY = e.clientY;
      var fired = false;
      var timer = setTimeout(function(){
        fired = true;
        try { haptic([15, 40, 15]); } catch(_){}
        showOrderMenu(oid, startX, startY);
      }, 550);

      function onMove(ev){
        if(Math.hypot(ev.clientX - startX, ev.clientY - startY) > 12){
          clearTimeout(timer);
          cleanup();
        }
      }
      function onUp(){
        clearTimeout(timer);
        cleanup();
        if(fired){
          var blocker = function(ev){
            ev.stopPropagation();
            ev.preventDefault();
            document.removeEventListener('click', blocker, true);
          };
          document.addEventListener('click', blocker, true);
          setTimeout(function(){ document.removeEventListener('click', blocker, true); }, 400);
        }
      }
      function cleanup(){
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }, true);

    /* Правый клик / contextmenu — тоже поддержка */
    document.addEventListener('contextmenu', function(e){
      var wrap = e.target.closest && e.target.closest('.swipe-wrap[data-oid]');
      if(!wrap) return;
      e.preventDefault();
      var oid = parseInt(wrap.getAttribute('data-oid'), 10);
      if(!oid) return;
      showOrderMenu(oid, e.clientX, e.clientY);
    });
  }

  /* ============================================================
     ЧАСТЬ C. ФИКС МЕЛЬКАНИЯ ПОДЛОЖЕК СВАЙПА
     ============================================================ */

  var SWIPE_THRESHOLD = 12;
  var swipeObs = null;

  function initSwipeFix(){
    if(document.getElementById('zrz-swipe-fix-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-swipe-fix-css';
    st.textContent = ''
      + '.swipe-wrap .swipe-actions{opacity:0 !important;visibility:hidden;transition:opacity .12s ease-out, visibility .12s ease-out;pointer-events:none}'
      + '.swipe-wrap.zrz-swipe-live .swipe-actions{opacity:1 !important;visibility:visible;pointer-events:auto}'
      + '@media (hover: none){.swipe-wrap .card{-webkit-tap-highlight-color:transparent}.swipe-wrap .card:hover{transform:none}}';
    (document.head || document.documentElement).appendChild(st);

    swipeObs = new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var m = muts[i];
        if(m.attributeName !== 'style') continue;
        var card = m.target;
        if(!card || !card.classList || !card.classList.contains('card')) continue;
        var wrap = card.parentNode;
        if(!wrap || !wrap.classList || !wrap.classList.contains('swipe-wrap')) continue;
        var tr = card.style.transform || '';
        var mm = tr.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
        var val = mm ? Math.abs(parseFloat(mm[1])) : 0;
        if(val > SWIPE_THRESHOLD) wrap.classList.add('zrz-swipe-live');
        else wrap.classList.remove('zrz-swipe-live');
      }
    });
  }

  function attachSwipeObs(){
    if(!swipeObs) return;
    var cards = document.querySelectorAll('.swipe-wrap .card');
    for(var i=0;i<cards.length;i++){
      var c = cards[i];
      if(c.__zrzSwipeObs) continue;
      c.__zrzSwipeObs = true;
      try { swipeObs.observe(c, {attributes:true, attributeFilter:['style']}); } catch(e){}
    }
  }

  /* ============================================================
     CSS (sheet + context menu)
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-v540-css')) return;
    var css = ''
      /* Bottom Sheet */
      + '.zrz-sheet-bg{position:fixed;inset:0;z-index:850;background:rgba(20,32,52,0.45);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:flex-end;justify-content:center;animation:zrz-sheet-in .22s ease both}'
      + '@keyframes zrz-sheet-in{from{opacity:0}to{opacity:1}}'
      + '.zrz-sheet{width:100%;max-width:720px;background:var(--surface);border-radius:28px 28px 0 0;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 20px 32px;box-shadow:0 -12px 48px rgba(20,32,52,0.28);animation:zrz-sheet-up .32s cubic-bezier(.2,.85,.3,1) both;touch-action:pan-y}'
      + '@keyframes zrz-sheet-up{from{transform:translateY(60px);opacity:0.6}to{transform:none;opacity:1}}'
      + '.zrz-sheet-handle{width:44px;height:4px;background:var(--muted-2);border-radius:4px;margin:10px auto 4px;opacity:0.6}'
      + '.zrz-sheet-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.02em;padding:8px 4px 14px;display:flex;align-items:center;gap:10px}'
      + '.zrz-sheet-sec{margin-top:14px}'
      + '.zrz-sheet-sec-t{font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;padding:6px 4px 10px}'
      + '.zrz-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
      + '@media (min-width:520px){.zrz-tiles{grid-template-columns:repeat(4,1fr)}}'
      + '.zrz-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px 8px 14px;border-radius:18px;border:none;background:var(--accent-soft);color:var(--text);font-family:inherit;font-size:12px;font-weight:600;line-height:1.2;cursor:pointer;text-align:center;min-height:92px;transition:transform .12s ease,background .15s ease;-webkit-tap-highlight-color:transparent;position:relative}'
      + '.zrz-tile:active{transform:scale(0.96);background:var(--accent-line)}'
      + '.zrz-tile .zrz-tile-ico{font-size:26px;line-height:1;display:block}'
      + '.zrz-tile.zrz-tile-danger{background:var(--danger-soft);color:var(--danger)}'
      + '.zrz-tile.zrz-tile-danger:active{background:rgba(201,101,101,0.22)}'
      + '.zrz-tile.zrz-tile-badge::after{content:attr(data-badge);position:absolute;top:8px;right:10px;min-width:18px;height:18px;padding:0 5px;background:var(--danger);color:#fff;border-radius:9px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}'
      + '.zrz-tile.zrz-tile-primary{background:linear-gradient(135deg,#8badd8,#5b7fb8);color:#fff;box-shadow:0 8px 20px rgba(91,127,184,0.30)}'
      + '.zrz-tile.zrz-tile-primary:active{background:linear-gradient(135deg,#7a9bc8,#4a6ba5)}'
      + '.zrz-sheet-account{margin-top:20px;padding:14px 16px;background:var(--line-soft);border-radius:16px;display:flex;align-items:center;gap:14px}'
      + '.zrz-sheet-account .zrz-acc-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8badd8,#5b7fb8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0}'
      + '.zrz-sheet-account .zrz-acc-info{flex:1;min-width:0}'
      + '.zrz-sheet-account .zrz-acc-name{font-size:14.5px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.zrz-sheet-account .zrz-acc-role{font-size:11.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}'
      + '.zrz-sheet-close{display:block;width:100%;margin-top:16px;padding:14px 20px;border:none;border-radius:16px;background:var(--accent-soft);color:var(--accent-deep);font-family:inherit;font-size:15px;font-weight:700;cursor:pointer}'
      + '.zrz-sheet-close:active{background:var(--accent-line);transform:scale(0.98)}'
      /* Контекстное меню */
      + '#zrz-order-menu-bg{position:fixed;inset:0;z-index:860;background:rgba(20,32,52,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:zrz-ctx-in .15s ease both}'
      + '@keyframes zrz-ctx-in{from{opacity:0}to{opacity:1}}'
      + '#zrz-order-menu{position:fixed;min-width:210px;max-width:280px;background:var(--surface);border-radius:18px;padding:6px;box-shadow:0 18px 48px rgba(20,32,52,0.35);animation:zrz-ctx-pop .22s cubic-bezier(.2,.85,.3,1) both;overflow:hidden;z-index:861}'
      + '@keyframes zrz-ctx-pop{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}'
      + '#zrz-order-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:none;background:transparent;color:var(--text);font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;text-align:left;border-radius:12px;transition:background .12s ease}'
      + '#zrz-order-menu button:hover{background:var(--accent-soft)}'
      + '#zrz-order-menu button:active{background:var(--accent-line);transform:scale(0.98)}'
      + '#zrz-order-menu button .zrz-ctx-ico{font-size:20px;line-height:1;width:24px;text-align:center;flex-shrink:0}'
      + '#zrz-order-menu button.zrz-ctx-danger{color:var(--danger)}'
      + '#zrz-order-menu button.zrz-ctx-danger:hover{background:var(--danger-soft)}'
      + '#zrz-order-menu .zrz-ctx-sep{height:1px;background:var(--line-soft);margin:4px 8px}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-v540-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); } catch(e){}
    try { wrapSwitchTab(); } catch(e){}
    try { bindOrderLongPress(); } catch(e){}
    try { initSwipeFix(); } catch(e){}
    try { attachSwipeObs(); } catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  /* Периодическая перепроверка: swipe-карточки появляются после render() */
  var _iv = setInterval(function(){
    try { wrapSwitchTab(); } catch(e){}
    try { attachSwipeObs(); } catch(e){}
  }, 1500);
  setTimeout(function(){ clearInterval(_iv); }, 90000);

  try{ console.log('[06-nav p3] Bottom Sheet + долгий тап + фикс подложек активны'); }catch(_){}
})();
