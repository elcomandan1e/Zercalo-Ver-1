/* patches/13-dashboard.js — Часть 1: основа + дашборд админа/менеджера
   · Обёртка renderHome — свой дашборд для admin/manager
   · Шапка: приветствие + дата + иконка поиска
   · KPI-плитки (4 шт) — с фильтрами по тапу
   · Блок «Требует внимания»
   · Segmented control: События / Заказы / Мои
   · Компактные строки (60-70px)
   · Pull-to-refresh
   · Sticky заголовки дат
   Часть 2: дашборды мастера и замерщика + прогресс производства
   Часть 3: дашборд водителя + swipe actions + Bottom Sheet preview
*/
(function(){
  if(window._zrz13DashboardP1) return;
  window._zrz13DashboardP1 = true;

  /* ============================================================
     СОСТОЯНИЕ
     ============================================================ */
  if(!window._zrzDash) window._zrzDash = { tab:'events', scrollY:0, ordersFilter:'', eventsFilter:'' };
  if(typeof window._zrzDash.ordersFilter === 'undefined') window._zrzDash.ordersFilter = '';
  if(typeof window._zrzDash.eventsFilter === 'undefined') window._zrzDash.eventsFilter = '';

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function todayKey(){
    try { if(typeof dateToYmd === 'function') return dateToYmd(new Date()); }catch(e){}
    var d = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  function tomorrowKey(){
    var d = new Date(); d.setDate(d.getDate()+1);
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  function dateKeyFromTime(t){
    var d = new Date(t);
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  function daysAgo(ms){
    return Math.floor((Date.now() - ms) / 86400000);
  }
  function nowMinutes(){
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function timeToMin(t){
    if(!t) return null;
    try { if(typeof parseTimeToMinutes === 'function') return parseTimeToMinutes(t); }catch(e){}
    var m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    return parseInt(m[1],10)*60 + parseInt(m[2],10);
  }
  function humanDate(k){
    try {
      var d = (typeof ymdToDate === 'function') ? ymdToDate(k) : null;
      if(!d) return k;
      var months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
      return d.getDate() + ' ' + months[d.getMonth()];
    }catch(e){ return k; }
  }
  function dayLabel(k){
    if(k === todayKey()) return 'Сегодня';
    if(k === tomorrowKey()){
      var d = new Date(); d.setDate(d.getDate()+1);
      var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
      return 'Завтра · ' + d.getDate() + ' ' + months[d.getMonth()];
    }
    try {
      var dt = (typeof ymdToDate === 'function') ? ymdToDate(k) : null;
      if(!dt) return k;
      var months2 = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
      return dt.getDate() + ' ' + months2[dt.getMonth()] + ' · ' + dt.toLocaleDateString('ru-RU', {weekday:'short'});
    }catch(e){ return k; }
  }
  function fmtMoney(n){
    if(!n && n !== 0) return '0';
    var s = Math.round(Number(n)||0).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function clientName(o){
    try { return (typeof orderClientName === 'function') ? (orderClientName(o) || '') : ''; }catch(e){ return ''; }
  }
  function clientPhone(o){
    try { return (typeof orderClientPhone === 'function') ? (orderClientPhone(o) || '') : ''; }catch(e){ return ''; }
  }
  function addrShort(o){
    try { return (typeof orderAddressShort === 'function') ? (orderAddressShort(o) || '') : ''; }catch(e){ return ''; }
  }
  function typeIco(k){
    var m = {MIRROR:'🪞',SHOWER:'🚿',APRON:'🍳',SHELF:'🗄',PANNO:'🖼'};
    return m[k] || '📦';
  }

  /* ============================================================
     ДАННЫЕ — вычисление
     ============================================================ */

  function visibleEvents(){
    try { return (typeof filteredEvents === 'function') ? filteredEvents() : (db.events || []); }catch(e){ return []; }
  }
  function visibleOrdersList(){
    try { return (typeof visibleOrders === 'function') ? visibleOrders() : []; }catch(e){ return []; }
  }

  /* KPI */
  function calcKpi(u){
    var result = { eventsToday:0, inWork:0, dueSum:0, overdue:0 };
    try {
      var tk = todayKey();
      visibleEvents().forEach(function(e){
        if(e.date === tk) result.eventsToday++;
        if(e.date && e.date < tk && e.status !== 'done') result.overdue++;
      });
      visibleOrdersList().forEach(function(o){
        if(o.status === 'work' || o.status === 'ready') result.inWork++;
        var total = Number(o.orderTotal)||0;
        var paid  = Number(o.orderPaid)||0;
        if(total > paid) result.dueSum += (total - paid);
      });
    }catch(e){}
    return result;
  }

  /* «Требует внимания» */
  function calcAttention(){
    var items = [];
    try {
      var tk = todayKey();
      var now = nowMinutes();

      visibleEvents().forEach(function(e){
        if(!e.date) return;
        if(e.status === 'done') return;
        if(e.date < tk){
          var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
          items.push({
            kind:'overdue_event',
            ico:'⏰',
            title:'Просрочен ' + (e.type === 'measure' ? 'замер' : (e.type === 'install' ? 'монтаж' : 'выезд')),
            sub: (o ? (clientName(o) + ' · ') : '') + 'просрочен ' + daysAgo((typeof ymdToDate==='function'? ymdToDate(e.date).getTime() : 0)) + ' дн.',
            actions: [
              o ? {label:'Позвонить', act:'call', oid:o.id} : null,
              {label:'Открыть', act:'open_event', eid:e.id}
            ].filter(Boolean)
          });
        }
      });

      visibleEvents().forEach(function(e){
        if(e.date !== tk) return;
        if(e.status === 'done') return;
        var tm = timeToMin(e.time);
        if(tm == null) return;
        if(tm < now - 15){
          var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
          items.push({
            kind:'late_event',
            ico:'🕐',
            title:'Опоздание · ' + (e.time || ''),
            sub: (o ? clientName(o) + ' · ' : '') + 'событие прошло',
            actions: [
              o ? {label:'Позвонить', act:'call', oid:o.id} : null,
              {label:'Открыть', act:'open_event', eid:e.id}
            ].filter(Boolean)
          });
        }
      });

      visibleOrdersList().forEach(function(o){
        if(o.status !== 'paused') return;
        var since = o.statusChangedAt || o.updatedAt || o.createdAt || Date.now();
        var d = daysAgo(since);
        if(d >= 3){
          items.push({
            kind:'paused_order',
            ico:'⏸',
            title:'На паузе ' + d + ' дн.',
            sub: '№' + (o.orderNum || '—') + ' · ' + (clientName(o) || '') + (o.pausedReason ? ' · ' + o.pausedReason : ''),
            actions: [
              {label:'Открыть', act:'open_order', oid:o.id}
            ]
          });
        }
      });

      visibleOrdersList().forEach(function(o){
        var total = Number(o.orderTotal)||0;
        var paid  = Number(o.orderPaid)||0;
        if(total <= paid) return;
        if(o.status === 'closed' || o.status === 'declined') return;
        var since = o.statusChangedAt || o.updatedAt || o.createdAt || Date.now();
        var d = daysAgo(since);
        if(d >= 30){
          items.push({
            kind:'due_order',
            ico:'💰',
            title:'Долг ' + d + ' дн.',
            sub: '№' + (o.orderNum || '—') + ' · ' + (clientName(o) || '') + ' · ' + fmtMoney(total - paid) + ' ₽',
            actions: [
              {label:'Открыть', act:'open_order', oid:o.id}
            ]
          });
        }
      });
    }catch(e){ try{console.warn('[13 p1] attention', e);}catch(_){} }

    return items.slice(0, 5);
  }

  /* ============================================================
     HTML — СТРОИТЕЛИ
     ============================================================ */

  function buildHeader(u){
    var now = new Date();
    var h = now.getHours();
    var greet = h < 6 ? 'Доброй ночи' : (h < 12 ? 'Доброе утро' : (h < 18 ? 'Добрый день' : 'Добрый вечер'));
    var firstName = (u.name || '').split(' ')[0] || u.name || 'коллега';
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var days = ['вс','пн','вт','ср','чт','пт','сб'];
    var dateLabel = now.getDate() + ' ' + months[now.getMonth()] + ', ' + days[now.getDay()];

    return '<div class="zrz-dash-head">'
      + '<div class="zrz-dash-head-left">'
      +   '<div class="zrz-dash-greet">' + esc2(greet) + ', ' + esc2(firstName) + '</div>'
      +   '<div class="zrz-dash-date">' + esc2(dateLabel) + '</div>'
      + '</div>'
      + '<button type="button" class="zrz-dash-search" aria-label="Поиск" onclick="if(window.zrzOpenPalette)window.zrzOpenPalette()">'
      +   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>'
      + '</button>'
      + '</div>';
  }

  function buildKpi(u){
    var k = calcKpi(u);
    var tiles = [
      { key:'events',  ico:'📅', val:k.eventsToday, label:'событий', sub:'сегодня' },
      { key:'inWork',  ico:'🔧', val:k.inWork,      label:'в работе', sub:'заказов' },
      { key:'due',     ico:'💰', val:fmtMoney(k.dueSum) + ' ₽', label:'к доплате', sub:'по всем' },
      { key:'overdue', ico:'⏰', val:k.overdue,     label:'просрочено', sub:'событий' }
    ];
    var html = '<div class="zrz-kpi">';
    tiles.forEach(function(t){
      html += '<div class="zrz-kpi-cell" data-kpi="' + t.key + '" onclick="zrzKpiClick(\'' + t.key + '\')">'
        +   '<div class="zrz-kpi-ico">' + t.ico + '</div>'
        +   '<div class="zrz-kpi-val">' + esc2(t.val) + '</div>'
        +   '<div class="zrz-kpi-lbl">' + esc2(t.label) + '</div>'
        + '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildAttention(){
    var items = calcAttention();
    if(!items.length) return '';
    var html = '<div class="zrz-att">';
    html += '<div class="zrz-att-head">🔥 Требует внимания</div>';
    items.forEach(function(it){
      html += '<div class="zrz-att-item">'
        + '<div class="zrz-att-ico">' + it.ico + '</div>'
        + '<div class="zrz-att-body">'
        +   '<div class="zrz-att-title">' + esc2(it.title) + '</div>'
        +   '<div class="zrz-att-sub">' + esc2(it.sub) + '</div>'
        + '</div>'
        + '<div class="zrz-att-actions">';
      (it.actions || []).forEach(function(a){
        var act = '';
        if(a.act === 'open_order') act = 'zrzDashOpenOrder(' + a.oid + ')';
        if(a.act === 'open_event') act = 'zrzDashOpenEvent(' + a.eid + ')';
        if(a.act === 'call'){
          var o = db.orders.find(function(x){ return x.id === a.oid; });
          var ph = o ? clientPhone(o) : '';
          if(!ph) return;
          act = 'window.location.href=\'tel:' + ph.replace(/[^+\d]/g,'') + '\'';
        }
        html += '<button type="button" class="zrz-att-btn" onclick="' + act + '">' + esc2(a.label) + '</button>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function buildSegmented(){
    var tab = window._zrzDash.tab;
    var tabs = [
      { key:'events', ico:'📅', label:'События' },
      { key:'orders', ico:'📋', label:'Заказы' },
      { key:'my',     ico:'✓',  label:'Мои' }
    ];
    return '<div class="zrz-seg">' + tabs.map(function(t){
      return '<button type="button" class="zrz-seg-btn' + (tab===t.key?' active':'') + '" onclick="zrzDashSwitchTab(\''+t.key+'\')">'
        + '<span class="zrz-seg-ico">' + t.ico + '</span>'
        + '<span>' + esc2(t.label) + '</span>'
        + '</button>';
    }).join('') + '</div>';
  }

  function buildEventRow(e){
    var o = e.orderId ? (db.orders || []).find(function(x){ return x.id === e.orderId; }) : null;
    var time = e.time || '—';
    var typeIcoStr = (typeof eventTypeIco === 'function') ? eventTypeIco(e.type || 'measure') : '📏';
    var typeLabel = (typeof eventTypeLabel === 'function') ? eventTypeLabel(e.type || 'measure') : 'Событие';
    var name = o ? clientName(o) : '';
    var addr = o ? addrShort(o) : '';
    var phone = o ? clientPhone(o) : '';
    var done = (e.status === 'done');

    var html = '<div class="zrz-row zrz-row-event' + (done?' zrz-row-done':'') + '"'
      + ' onclick="zrzDashOpenEvent(' + e.id + ')">';
    html += '<div class="zrz-row-time">' + esc2(time) + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">' + typeIcoStr + ' ' + esc2(typeLabel)
      + (o ? ' <span class="zrz-row-num">№' + esc2(o.orderNum || '—') + '</span>' : '') + '</div>';
    if(name) html += '<div class="zrz-row-sub">' + esc2(name) + (addr ? ' · ' + esc2(addr) : '') + '</div>';
    else if(e.note) html += '<div class="zrz-row-sub">' + esc2(e.note) + '</div>';
    html += '</div>';
    if(phone){
      html += '<button type="button" class="zrz-row-action" aria-label="Позвонить" onclick="event.stopPropagation();window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>'
        + '</button>';
    }
    html += '</div>';
    return html;
  }

  function buildOrderRow(o){
    var st = (typeof STATUS_META !== 'undefined' && STATUS_META[o.status]) ? STATUS_META[o.status] : { label:'—' };
    var name = clientName(o) || 'Без имени';
    var addr = addrShort(o);
    var total = Number(o.orderTotal)||0;
    var paid  = Number(o.orderPaid)||0;
    var due = total > paid ? (total - paid) : 0;

    var firstTypeIco = '📦';
    try {
      var its = (typeof itemsOf === 'function') ? itemsOf(o.id) : [];
      if(its.length) firstTypeIco = typeIco(its[0].type);
    }catch(e){}

    var html = '<div class="zrz-row zrz-row-order" onclick="zrzDashOpenOrder(' + o.id + ')">';
    html += '<div class="zrz-row-ico">' + firstTypeIco + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">'
      + (o.orderNum ? '<span class="zrz-row-num">' + esc2(o.orderNum) + '</span> ' : '')
      + esc2(name) + '</div>';
    html +=   '<div class="zrz-row-sub">'
      + '<span class="zrz-badge zrz-badge-' + esc2(o.status) + '">' + esc2(st.label) + '</span>'
      + (due > 0 ? ' · <span class="zrz-row-due">' + fmtMoney(due) + ' ₽</span>' : '')
      + (addr ? ' · ' + esc2(addr) : '')
      + '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function buildEventsTab(){
    var tk = todayKey();
    var events = visibleEvents().slice();
    events.sort(function(a,b){
      var c = String(a.date||'').localeCompare(String(b.date||''));
      if(c !== 0) return c;
      var am = timeToMin(a.time), bm = timeToMin(b.time);
      if(am == null && bm == null) return 0;
      if(am == null) return 1;
      if(bm == null) return -1;
      return am - bm;
    });
    var list = events.filter(function(e){
      if(!e.date) return false;
      if(e.date >= tk) return true;
      if(e.date < tk && e.status !== 'done') return true;
      return false;
    });

    /* KPI-фильтр «просрочено» */
    var evFilter = (window._zrzDash && window._zrzDash.eventsFilter) || '';
    if(evFilter === 'overdue'){
      list = list.filter(function(e){
        return e.date < tk && e.status !== 'done';
      });
    }

    if(!list.length && evFilter === 'overdue'){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">✨</div>'
        + '<div class="zrz-empty-t">Ничего не просрочено</div>'
        + '<div class="zrz-empty-s">Все события идут по плану</div>'
        + '<div style="margin-top:14px"><button type="button" class="zrz-att-btn" onclick="zrzKpiReset()">Показать все</button></div>'
        + '</div>';
    }

    if(!list.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">📅</div>'
        + '<div class="zrz-empty-t">На сегодня свободно</div>'
        + '<div class="zrz-empty-s">Ближайших событий нет</div>'
        + '</div>';
    }

    var groups = {};
    list.forEach(function(e){ (groups[e.date] = groups[e.date] || []).push(e); });
    var keys = Object.keys(groups).sort();

    var html = '';
    keys.forEach(function(k){
      html += '<div class="zrz-day-head"><span>' + esc2(dayLabel(k)) + '</span></div>';
      groups[k].forEach(function(e){ html += buildEventRow(e); });
    });
    return html;
  }

  function buildOrdersTab(){
    var list = visibleOrdersList().slice();

    /* KPI-фильтр */
    var of = (window._zrzDash && window._zrzDash.ordersFilter) || '';
    if(of === 'work'){
      list = list.filter(function(o){ return o.status === 'work' || o.status === 'ready'; });
      if(!list.length){
        return '<div class="zrz-empty">'
          + '<div class="zrz-empty-ico">🔧</div>'
          + '<div class="zrz-empty-t">Нет заказов в работе</div>'
          + '<div class="zrz-empty-s">Все заказы на других этапах</div>'
          + '<div style="margin-top:14px"><button type="button" class="zrz-att-btn" onclick="zrzKpiReset()">Показать все</button></div>'
          + '</div>';
      }
    }
    if(of === 'due'){
      list = list.filter(function(o){
        var t = Number(o.orderTotal)||0;
        var p = Number(o.orderPaid)||0;
        return t > p;
      });
      if(!list.length){
        return '<div class="zrz-empty">'
          + '<div class="zrz-empty-ico">💸</div>'
          + '<div class="zrz-empty-t">Нет долгов</div>'
          + '<div class="zrz-empty-s">Все заказы оплачены</div>'
          + '<div style="margin-top:14px"><button type="button" class="zrz-att-btn" onclick="zrzKpiReset()">Показать все</button></div>'
          + '</div>';
      }
    }

    /* Активные сверху */
    var order = { work:0, ready:1, approval:2, measure_done:3, measure_scheduled:4, lead:5, paused:6, installed:7, closed:8, declined:9 };
    list.sort(function(a,b){
      var oa = order[a.status] != null ? order[a.status] : 99;
      var ob = order[b.status] != null ? order[b.status] : 99;
      if(oa !== ob) return oa - ob;
      return (b.createdAt||0) - (a.createdAt||0);
    });
    list = list.slice(0, 50);

    if(!list.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">📋</div>'
        + '<div class="zrz-empty-t">Заказов нет</div>'
        + '<div class="zrz-empty-s">Создайте первый заказ</div>'
        + '</div>';
    }
    return list.map(buildOrderRow).join('');
  }

  function buildMyTab(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';
    var list = visibleOrdersList().filter(function(o){
      if(o.createdBy === u.id) return true;
      if(Array.isArray(o.assignedUserIds) && o.assignedUserIds.indexOf(u.id) >= 0) return true;
      return false;
    });
    var order = { work:0, ready:1, approval:2, measure_done:3, measure_scheduled:4, lead:5, paused:6, installed:7, closed:8, declined:9 };
    list.sort(function(a,b){
      var oa = order[a.status] != null ? order[a.status] : 99;
      var ob = order[b.status] != null ? order[b.status] : 99;
      if(oa !== ob) return oa - ob;
      return (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0);
    });
    list = list.slice(0, 30);

    if(!list.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">✓</div>'
        + '<div class="zrz-empty-t">Нет ваших заказов</div>'
        + '<div class="zrz-empty-s">Заказы, где вы автор или участник</div>'
        + '</div>';
    }
    return list.map(buildOrderRow).join('');
  }

  function buildDashboard(u){
    var html = '';
    html += '<div class="zrz-dash-wrap">';
    html += buildHeader(u);
    html += buildKpi(u);
    html += buildAttention();
    html += buildSegmented();
    var tab = window._zrzDash.tab || 'events';
    if(tab === 'events') html += buildEventsTab();
    else if(tab === 'orders') html += buildOrdersTab();
    else if(tab === 'my') html += buildMyTab();
    html += '<div style="height:80px"></div>';
    html += '</div>';
    return html;
  }

  /* ============================================================
     РУЧНЫЕ КОМАНДЫ (для onclick)
     ============================================================ */

  window.zrzKpiClick = function(key){
    try { if(typeof haptic === 'function') haptic(6); }catch(e){}
    if(!window._zrzDash) window._zrzDash = { tab:'events', scrollY:0, ordersFilter:'', eventsFilter:'' };
    if(key === 'events'){
      window._zrzDash.tab = 'events';
      window._zrzDash.ordersFilter = '';
      window._zrzDash.eventsFilter = '';
    } else if(key === 'inWork'){
      window._zrzDash.tab = 'orders';
      window._zrzDash.ordersFilter = 'work';
      window._zrzDash.eventsFilter = '';
    } else if(key === 'due'){
      window._zrzDash.tab = 'orders';
      window._zrzDash.ordersFilter = 'due';
      window._zrzDash.eventsFilter = '';
    } else if(key === 'overdue'){
      window._zrzDash.tab = 'events';
      window._zrzDash.ordersFilter = '';
      window._zrzDash.eventsFilter = 'overdue';
    }
    try { if(typeof render === 'function') render(); }catch(e){}
  };

  window.zrzKpiReset = function(){
    try { if(typeof haptic === 'function') haptic(6); }catch(e){}
    if(!window._zrzDash) window._zrzDash = { tab:'events', scrollY:0, ordersFilter:'', eventsFilter:'' };
    window._zrzDash.ordersFilter = '';
    window._zrzDash.eventsFilter = '';
    try { if(typeof render === 'function') render(); }catch(e){}
  };

  window.zrzDashSwitchTab = function(tab){
    try { if(typeof haptic === 'function') haptic(6); }catch(e){}
    window._zrzDash.tab = tab || 'events';
    window._zrzDash.ordersFilter = '';
    window._zrzDash.eventsFilter = '';
    try { if(typeof render === 'function') render(); }catch(e){}
  };

  window.zrzDashOpenOrder = function(id){
    try { if(typeof openOrder === 'function') openOrder(id); }catch(e){}
  };

  window.zrzDashOpenEvent = function(id){
    try {
      var e = (typeof eventById === 'function') ? eventById(id) : null;
      if(!e) return;
      if(e.orderId){
        try { if(typeof openOrder === 'function') return openOrder(e.orderId); }catch(x){}
      }
      try { if(typeof openEventFromCalendar === 'function') return openEventFromCalendar(id); }catch(x){}
    }catch(e){}
  };

  /* ============================================================
     PULL-TO-REFRESH
     ============================================================ */

  var _ptr = { active:false, startY:0, dist:0, el:null };

  function bindPullToRefresh(){
    if(window._zrz13PtrBound) return;
    window._zrz13PtrBound = true;

    var app = document.getElementById('app');
    if(!app) return;

    app.addEventListener('touchstart', function(e){
      if(app.scrollTop > 5) return;
      if(e.touches.length !== 1) return;
      _ptr.active = true;
      _ptr.startY = e.touches[0].clientY;
      _ptr.dist = 0;
    }, {passive:true});

    app.addEventListener('touchmove', function(e){
      if(!_ptr.active) return;
      var dy = e.touches[0].clientY - _ptr.startY;
      if(dy <= 0){ _ptr.active = false; return; }
      if(dy > 5 && !_ptr.el){
        _ptr.el = document.createElement('div');
        _ptr.el.className = 'zrz-ptr';
        _ptr.el.textContent = '↓ Потяните для обновления';
        app.insertBefore(_ptr.el, app.firstChild);
      }
      if(_ptr.el){
        _ptr.dist = dy;
        _ptr.el.style.height = Math.min(dy * 0.4, 60) + 'px';
        _ptr.el.style.opacity = Math.min(dy / 80, 1);
        _ptr.el.textContent = dy > 70 ? '↑ Отпустите' : '↓ Потяните для обновления';
      }
    }, {passive:true});

    app.addEventListener('touchend', function(){
      if(!_ptr.active) return;
      _ptr.active = false;
      var dist = _ptr.dist;
      if(_ptr.el){
        _ptr.el.remove();
        _ptr.el = null;
      }
      _ptr.dist = 0;
      if(dist > 70){
        doRefresh();
      }
    });
  }

  function doRefresh(){
    try {
      if(typeof haptic === 'function') haptic([15, 40, 15]);
    }catch(e){}
    var app = document.getElementById('app');
    if(app){
      var ind = document.createElement('div');
      ind.className = 'zrz-refresh-ind';
      ind.textContent = '⏳ Обновляем…';
      app.insertBefore(ind, app.firstChild);
    }
    try {
      if(typeof schedulePull === 'function') schedulePull();
      if(typeof syncNow === 'function') syncNow().catch(function(){});
    }catch(e){}
    setTimeout(function(){
      try { if(typeof render === 'function') render(); }catch(e){}
    }, 600);
  }

  /* ============================================================
     ОБЁРТКА renderHome
     ============================================================ */

  function wrapRenderHome(){
    if(window._zrz13RenderHomeWrapped) return;
    if(typeof window.renderHome !== 'function') return;
    var orig = window.renderHome;
    window.renderHome = function(){
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return orig.apply(this, arguments);
      if(u.role !== 'admin' && u.role !== 'manager'){
        return orig.apply(this, arguments);
      }
      return buildDashboard(u);
    };
    window._zrz13RenderHomeWrapped = true;
  }

  /* ============================================================
     CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-dash-css')) return;
    var css = '';

    css += ''
      + '.zrz-dash-wrap{padding:0 0 20px}'
      ;

    css += ''
      + '.zrz-dash-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:8px 4px 16px}'
      + '.zrz-dash-head-left{flex:1;min-width:0}'
      + '.zrz-dash-greet{font-size:20px;font-weight:800;letter-spacing:-0.02em;color:var(--text);line-height:1.2}'
      + '.zrz-dash-date{font-size:13px;color:var(--muted);margin-top:4px;font-weight:600}'
      + '.zrz-dash-search{width:44px;height:44px;border-radius:14px;border:none;background:var(--accent-soft);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:transform .12s ease,background .15s ease}'
      + '.zrz-dash-search:active{transform:scale(0.92);background:var(--accent-line)}'
      ;

    css += ''
      + '.zrz-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}'
      + '@media (max-width:420px){.zrz-kpi{grid-template-columns:repeat(2,1fr);gap:8px}}'
      + '.zrz-kpi-cell{background:var(--surface);border:1.5px solid var(--line);border-radius:16px;padding:12px 8px;text-align:center;transition:transform .12s ease,background .15s ease,border-color .15s ease}'
      + '.zrz-kpi-cell:active{transform:scale(0.97)}'
      + '.zrz-kpi-cell[data-kpi]{cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}'
      + '.zrz-kpi-cell[data-kpi]:active{background:var(--accent-soft);border-color:var(--accent-line)}'
      + '.zrz-kpi-ico{font-size:18px;line-height:1;margin-bottom:4px;opacity:0.85}'
      + '.zrz-kpi-val{font-size:19px;font-weight:800;letter-spacing:-0.02em;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums}'
      + '.zrz-kpi-lbl{font-size:10.5px;color:var(--muted);margin-top:2px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}'
      ;

    css += ''
      + '.zrz-att{margin-bottom:16px;padding:14px;border-radius:18px;'
      +   'background:linear-gradient(180deg,rgba(217,146,74,0.10),rgba(217,146,74,0.03));'
      +   'border:1.5px solid rgba(217,146,74,0.30)}'
      + 'html[data-theme="dark"] .zrz-att{background:linear-gradient(180deg,rgba(224,168,102,0.12),rgba(224,168,102,0.04));border-color:rgba(224,168,102,0.32)}'
      + '.zrz-att-head{font-size:12.5px;font-weight:800;color:#8a5a0c;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
      + 'html[data-theme="dark"] .zrz-att-head{color:#e0a866}'
      + '.zrz-att-item{display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--surface);border-radius:12px;margin-bottom:8px;border:1px solid rgba(217,146,74,0.15)}'
      + '.zrz-att-item:last-child{margin-bottom:0}'
      + '.zrz-att-ico{font-size:20px;line-height:1;flex-shrink:0;padding-top:2px}'
      + '.zrz-att-body{flex:1;min-width:0}'
      + '.zrz-att-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:2px}'
      + '.zrz-att-sub{font-size:12px;color:var(--muted);line-height:1.4;word-break:break-word}'
      + '.zrz-att-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}'
      + '.zrz-att-btn{padding:6px 12px;border-radius:10px;border:none;background:var(--accent-soft);color:var(--accent-deep);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .12s ease,transform .12s ease}'
      + '.zrz-att-btn:active{background:var(--accent-line);transform:scale(0.96)}'
      ;

    css += ''
      + '.zrz-seg{display:flex;gap:4px;margin-bottom:14px;padding:4px;background:var(--accent-soft);border-radius:14px}'
      + '.zrz-seg-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 8px;border:none;border-radius:10px;background:transparent;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--text-soft);cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}'
      + '.zrz-seg-btn.active{background:var(--surface);color:var(--accent-deep);box-shadow:0 1px 4px rgba(90,120,170,0.12)}'
      + '.zrz-seg-ico{font-size:15px;line-height:1;opacity:0.9}'
      ;

    css += ''
      + '.zrz-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border:1.5px solid var(--line);border-radius:14px;margin-bottom:8px;cursor:pointer;transition:transform .12s ease,background .15s ease}'
      + '.zrz-row:active{transform:scale(0.985);background:var(--accent-soft)}'
      + '.zrz-row-done{opacity:0.55}'
      + '.zrz-row-done .zrz-row-title{text-decoration:line-through}'
      + '.zrz-row-time{font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent-deep);flex-shrink:0;letter-spacing:-0.02em;min-width:48px}'
      + '.zrz-row-ico{font-size:22px;line-height:1;flex-shrink:0;width:28px;text-align:center}'
      + '.zrz-row-body{flex:1;min-width:0}'
      + '.zrz-row-title{font-size:14.5px;font-weight:700;color:var(--text);line-height:1.3;display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
      + '.zrz-row-num{font-family:var(--font-mono);font-size:12.5px;font-weight:800;color:var(--accent-deep);background:var(--accent-soft);padding:2px 8px;border-radius:6px;letter-spacing:-0.02em}'
      + '.zrz-row-sub{font-size:12.5px;color:var(--muted);line-height:1.4;margin-top:3px;word-break:break-word}'
      + '.zrz-row-due{font-weight:800;color:#d9924a}'
      + '.zrz-row-action{width:36px;height:36px;border-radius:12px;border:none;background:var(--accent-soft);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:background .12s ease,transform .12s ease}'
      + '.zrz-row-action:active{background:var(--accent-line);transform:scale(0.94)}'
      + '.zrz-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:var(--accent-soft);color:var(--accent-deep);letter-spacing:0.2px}'
      + '.zrz-badge-paused{background:#e2e8f0;color:#475569}'
      + '.zrz-badge-declined{background:#fecaca;color:#991b1b}'
      + '.zrz-badge-work{background:#bfdbfe;color:#1e40af}'
      + '.zrz-badge-ready{background:#93c5fd;color:#1e3a8a}'
      + '.zrz-badge-closed{background:#86efac;color:#14532d}'
      + '.zrz-badge-installed{background:#bbf7d0;color:#166534}'
      ;

    css += ''
      + '.zrz-day-head{position:sticky;top:0;z-index:3;padding:10px 4px 8px;margin-top:8px;font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;background:linear-gradient(180deg,var(--bg-1) 60%,rgba(246,248,252,0.9) 100%)}'
      + 'html[data-theme="dark"] .zrz-day-head{background:linear-gradient(180deg,var(--bg-1) 60%,rgba(20,26,36,0.9) 100%)}'
      + '.zrz-day-head span{display:inline-block;padding:4px 12px;background:var(--surface);border-radius:10px;border:1.5px solid var(--line);color:var(--accent-deep);letter-spacing:0.6px}'
      ;

    css += ''
      + '.zrz-empty{padding:48px 24px;text-align:center;background:linear-gradient(180deg,var(--surface),var(--accent-soft));border-radius:22px;border:1.5px solid var(--accent-line);margin:8px 0}'
      + '.zrz-empty-ico{font-size:52px;line-height:1;margin-bottom:12px;opacity:0.85}'
      + '.zrz-empty-t{font-size:17px;font-weight:800;color:var(--text);margin-bottom:6px}'
      + '.zrz-empty-s{font-size:13px;color:var(--muted);line-height:1.5}'
      ;

    css += ''
      + '.zrz-ptr{height:0;overflow:hidden;text-align:center;font-size:12px;font-weight:700;color:var(--accent-deep);display:flex;align-items:center;justify-content:center;transition:height .15s ease,opacity .15s ease;user-select:none;pointer-events:none}'
      + '.zrz-refresh-ind{padding:14px;text-align:center;font-size:13px;font-weight:700;color:var(--accent-deep)}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-dash-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapRenderHome(); }catch(e){}
    try { bindPullToRefresh(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  setTimeout(function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(u && (u.role === 'admin' || u.role === 'manager')){
        if(typeof render === 'function') render();
      }
    }catch(e){}
  }, 2200);

  var _iv = setInterval(function(){
    try { wrapRenderHome(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[13-dashboard p1] дашборд админа/менеджера активен'); }catch(_){}
})();
/* patches/13-dashboard.js — Часть 2/3/* patches/13-dashboard.js — Часть 2/3
   · Дашборд мастера (очередь цеха + прогресс)
   · Дашборд замерщика-монтажника (расписание выездов)
   · Прогресс производства на позициях (0-100%)
   Часть 3: дашборд водителя + swipe actions + Bottom Sheet preview
*/
(function(){
  if(window._zrz13DashboardP2) return;
  window._zrz13DashboardP2 = true;

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */
  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function todayKey(){
    try { if(typeof dateToYmd === 'function') return dateToYmd(new Date()); }catch(e){}
    var d = new Date();
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function timeToMin(t){
    if(!t) return null;
    try { if(typeof parseTimeToMinutes === 'function') return parseTimeToMinutes(t); }catch(e){}
    var m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    return parseInt(m[1],10)*60 + parseInt(m[2],10);
  }
  function nowMinutes(){
    var d = new Date();
    return d.getHours()*60 + d.getMinutes();
  }
  function fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function clientName(o){
    try { return (typeof orderClientName === 'function') ? (orderClientName(o) || '') : ''; }catch(e){ return ''; }
  }
  function clientPhone(o){
    try { return (typeof orderClientPhone === 'function') ? (orderClientPhone(o) || '') : ''; }catch(e){ return ''; }
  }
  function addrShort(o){
    try { return (typeof orderAddressShort === 'function') ? (orderAddressShort(o) || '') : ''; }catch(e){ return ''; }
  }
  function typeIco(k){
    var m = {MIRROR:'🪞',SHOWER:'🚿',APRON:'🍳',SHELF:'🗄',PANNO:'🖼'};
    return m[k] || '📦';
  }

  /* ============================================================
     ПРОГРЕСС ЗАКАЗА (средневзвешенный по позициям)
     ============================================================ */
  function orderProgress(o){
    try {
      var its = (typeof itemsOf === 'function') ? itemsOf(o.id) : [];
      if(!its.length) return 0;
      var total = 0, qty = 0;
      its.forEach(function(i){
        var p = Number(i.productionProgress)||0;
        var q = Math.max(1, Number(i.qty)||1);
        total += p * q;
        qty += q;
      });
      return qty > 0 ? Math.round(total / qty) : 0;
    }catch(e){ return 0; }
  }

  /* ============================================================
     ДАШБОРД МАСТЕРА
     ============================================================ */

  function calcMasterKpi(u){
    var r = { work:0, ready:0, overdue:0 };
    try {
      var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
      orders.forEach(function(o){
        if(o.status === 'work') r.work++;
        if(o.status === 'ready') r.ready++;
        if(o.status === 'work'){
          var since = o.updatedAt || o.createdAt || Date.now();
          if(Math.floor((Date.now() - since) / 86400000) > 21) r.overdue++;
        }
      });
    }catch(e){}
    return r;
  }

  function buildMasterHeader(u){
    var now = new Date();
    var h = now.getHours();
    var greet = h < 6 ? 'Ночная смена' : (h < 12 ? 'Доброе утро' : (h < 18 ? 'Добрый день' : 'Добрый вечер'));
    var firstName = (u.name || '').split(' ')[0] || u.name || '';
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var days = ['вс','пн','вт','ср','чт','пт','сб'];
    var dateLabel = now.getDate() + ' ' + months[now.getMonth()] + ', ' + days[now.getDay()];
    return '<div class="zrz-dash-head">'
      + '<div class="zrz-dash-head-left">'
      +   '<div class="zrz-dash-greet">🔧 Цех · ' + esc2(firstName) + '</div>'
      +   '<div class="zrz-dash-date">' + esc2(greet) + ' · ' + esc2(dateLabel) + '</div>'
      + '</div>'
      + '<button type="button" class="zrz-dash-search" aria-label="Поиск" onclick="if(window.zrzOpenPalette)window.zrzOpenPalette()">'
      +   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>'
      + '</button>'
      + '</div>';
  }

  function buildMasterKpi(u){
    var k = calcMasterKpi(u);
    var tiles = [
      { ico:'🔧', val:k.work,    label:'в работе' },
      { ico:'🚚', val:k.ready,   label:'готово' },
      { ico:'⏰', val:k.overdue, label:'просроч.' }
    ];
    var html = '<div class="zrz-kpi zrz-kpi-3">';
    tiles.forEach(function(t){
      html += '<div class="zrz-kpi-cell">'
        +   '<div class="zrz-kpi-ico">' + t.ico + '</div>'
        +   '<div class="zrz-kpi-val">' + esc2(t.val) + '</div>'
        +   '<div class="zrz-kpi-lbl">' + esc2(t.label) + '</div>'
        + '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildMasterSegmented(){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'work';
    var tabs = [
      { key:'work',    ico:'🔧', label:'В работе' },
      { key:'ready',   ico:'🚚', label:'Готово' },
      { key:'done',    ico:'✓',  label:'Сделал' }
    ];
    return '<div class="zrz-seg">' + tabs.map(function(t){
      return '<button type="button" class="zrz-seg-btn' + (tab===t.key?' active':'') + '" onclick="zrzDashSwitchTab(\''+t.key+'\')">'
        + '<span class="zrz-seg-ico">' + t.ico + '</span>'
        + '<span>' + esc2(t.label) + '</span>'
        + '</button>';
    }).join('') + '</div>';
  }

  function buildMasterWorkRow(o){
    var its = [];
    try { its = (typeof itemsOf === 'function') ? itemsOf(o.id) : []; }catch(e){}
    var totalQty = its.reduce(function(s,i){ return s + (Number(i.qty)||1); }, 0);
    var prog = orderProgress(o);
    var typeIcoMain = its.length ? typeIco(its[0].type) : '📦';

    var html = '<div class="zrz-row zrz-row-work" onclick="zrzDashOpenOrder(' + o.id + ')">';
    html += '<div class="zrz-row-ico">' + typeIcoMain + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">'
      + (o.orderNum ? '<span class="zrz-row-num">' + esc2(o.orderNum) + '</span> ' : '')
      + esc2(clientName(o) || 'Без имени') + '</div>';
    html +=   '<div class="zrz-row-sub">Изделий: ' + totalQty + ' · ' + esc2(addrShort(o) || '') + '</div>';
    html +=   '<div class="zrz-master-progress"><div class="zrz-master-progress-fill" style="width:' + prog + '%"></div></div>';
    html +=   '<div class="zrz-master-progress-lbl">' + prog + '% готово</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function buildMasterReadyRow(o){
    var its = [];
    try { its = (typeof itemsOf === 'function') ? itemsOf(o.id) : []; }catch(e){}
    var typeIcoMain = its.length ? typeIco(its[0].type) : '📦';
    var since = o.updatedAt || o.createdAt || Date.now();
    var days = Math.floor((Date.now() - since) / 86400000);
    var daysLbl = days > 0 ? (days + ' дн. ждёт') : 'только что';

    var html = '<div class="zrz-row zrz-row-ready" onclick="zrzDashOpenOrder(' + o.id + ')">';
    html += '<div class="zrz-row-ico">' + typeIcoMain + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">'
      + (o.orderNum ? '<span class="zrz-row-num">' + esc2(o.orderNum) + '</span> ' : '')
      + esc2(clientName(o) || 'Без имени') + '</div>';
    html +=   '<div class="zrz-row-sub">' + daysLbl + ' · ' + esc2(addrShort(o) || '') + '</div>';
    html += '</div>';
    html += '<span class="zrz-badge zrz-badge-ready">🚚</span>';
    html += '</div>';
    return html;
  }

  function buildMasterTab(){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'work';
    var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
    var list = [];

    if(tab === 'work'){
      list = orders.filter(function(o){ return o.status === 'work'; });
      list.sort(function(a,b){
        return (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0);
      });
    } else if(tab === 'ready'){
      list = orders.filter(function(o){ return o.status === 'ready'; });
      list.sort(function(a,b){ return (a.updatedAt||0) - (b.updatedAt||0); });
    } else if(tab === 'done'){
      var today = todayKey();
      list = orders.filter(function(o){
        var at = o.statusChangedAt || 0;
        if(!at) return false;
        try {
          var d = new Date(at);
          var p = function(n){ return String(n).padStart(2,'0'); };
          var ymd = d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
          return ymd === today;
        }catch(e){ return false; }
      });
      list = list.filter(function(o){
        return o.status === 'ready' || o.status === 'installed' || o.status === 'closed';
      });
    }

    if(!list.length){
      var messages = {
        work: { ico:'🔧', t:'Очередь пуста', s:'Все заказы обработаны' },
        ready: { ico:'🚚', t:'Нет готовых', s:'Ничего не ждёт передачи' },
        done: { ico:'✓', t:'Сегодня ничего не завершено', s:'Хорошего отдыха!' }
      };
      var m = messages[tab] || messages.work;
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">' + m.ico + '</div>'
        + '<div class="zrz-empty-t">' + m.t + '</div>'
        + '<div class="zrz-empty-s">' + m.s + '</div>'
        + '</div>';
    }

    return list.map(function(o){
      if(tab === 'work') return buildMasterWorkRow(o);
      if(tab === 'ready') return buildMasterReadyRow(o);
      return buildMasterReadyRow(o);
    }).join('');
  }

  function buildMasterDashboard(u){
    var html = '';
    html += '<div class="zrz-dash-wrap">';
    html += buildMasterHeader(u);
    html += buildMasterKpi(u);
    html += buildMasterSegmented();
    html += buildMasterTab();
    html += '<div style="height:80px"></div>';
    html += '</div>';
    return html;
  }

  /* ============================================================
     ДАШБОРД ЗАМЕРЩИКА-МОНТАЖНИКА
     ============================================================ */

  function collectMyEventsToday(u){
    var tk = todayKey();
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    return events.filter(function(e){
      if(!e || e.date !== tk) return false;
      if(!Array.isArray(e.assignedUserIds)) return false;
      return e.assignedUserIds.indexOf(u.id) >= 0;
    }).sort(function(a,b){
      var am = timeToMin(a.time), bm = timeToMin(b.time);
      if(am == null && bm == null) return 0;
      if(am == null) return 1;
      if(bm == null) return -1;
      return am - bm;
    });
  }

  function buildSurveyorHeader(u){
    var now = new Date();
    var h = now.getHours();
    var firstName = (u.name || '').split(' ')[0] || u.name || '';
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var days = ['вс','пн','вт','ср','чт','пт','сб'];
    var dateLabel = now.getDate() + ' ' + months[now.getMonth()] + ', ' + days[now.getDay()];

    return '<div class="zrz-dash-head">'
      + '<div class="zrz-dash-head-left">'
      +   '<div class="zrz-dash-greet">📏 Смена ' + esc2(firstName) + '</div>'
      +   '<div class="zrz-dash-date">' + esc2(dateLabel) + '</div>'
      + '</div>'
      + '<button type="button" class="zrz-dash-search" aria-label="Поиск" onclick="if(window.zrzOpenPalette)window.zrzOpenPalette()">'
      +   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>'
      + '</button>'
      + '</div>';
  }

  function calcSurveyorKpi(u){
    var r = { total:0, done:0, km:0, pay:0 };
    try {
      var evs = collectMyEventsToday(u);
      r.total = evs.length;
      r.done = evs.filter(function(e){ return e.status === 'done'; }).length;
      evs.forEach(function(e){
        if(e.legFromPrev && Number(e.legFromPrev.km)) r.km += Number(e.legFromPrev.km);
        if(e.paymentEnabled && !e.paymentReceived){
          r.pay += Number(e.paymentAmount)||0;
        }
      });
      r.km = Math.round(r.km * 10) / 10;
    }catch(e){}
    return r;
  }

  function buildSurveyorKpi(u){
    var k = calcSurveyorKpi(u);
    var tiles = [
      { ico:'📏', val:k.total, label:'выездов' },
      { ico:'✓',  val:k.done,  label:'выполнено' },
      { ico:'💰', val:k.pay > 0 ? (fmtMoney(k.pay) + ' ₽') : '—', label:'к оплате' }
    ];
    var html = '<div class="zrz-kpi zrz-kpi-3">';
    tiles.forEach(function(t){
      html += '<div class="zrz-kpi-cell">'
        +   '<div class="zrz-kpi-ico">' + t.ico + '</div>'
        +   '<div class="zrz-kpi-val">' + esc2(t.val) + '</div>'
        +   '<div class="zrz-kpi-lbl">' + esc2(t.label) + '</div>'
        + '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildSurveyorSegmented(){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'schedule';
    var tabs = [
      { key:'schedule', ico:'📅', label:'Расписание' },
      { key:'payments', ico:'💰', label:'Оплаты' },
      { key:'done',     ico:'✓',  label:'Сделано' }
    ];
    return '<div class="zrz-seg">' + tabs.map(function(t){
      return '<button type="button" class="zrz-seg-btn' + (tab===t.key?' active':'') + '" onclick="zrzDashSwitchTab(\''+t.key+'\')">'
        + '<span class="zrz-seg-ico">' + t.ico + '</span>'
        + '<span>' + esc2(t.label) + '</span>'
        + '</button>';
    }).join('') + '</div>';
  }

  function buildSurveyorEventRow(e){
    var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
    var time = e.time || '—';
    var typeIcoStr = (typeof eventTypeIco === 'function') ? eventTypeIco(e.type || 'measure') : '📏';
    var typeLabel = (typeof eventTypeLabel === 'function') ? eventTypeLabel(e.type || 'measure') : 'Событие';
    var name = o ? clientName(o) : '';
    var addr = o ? addrShort(o) : '';
    var phone = o ? clientPhone(o) : '';
    var done = (e.status === 'done');
    var km = (e.legFromPrev && Number(e.legFromPrev.km)) || 0;
    var paymentBadge = '';
    if(e.paymentEnabled && !e.paymentReceived){
      paymentBadge = '<span class="zrz-badge zrz-badge-pay">💰 ' + fmtMoney(e.paymentAmount) + ' ₽</span>';
    }
    if(e.paymentReceived){
      paymentBadge = '<span class="zrz-badge zrz-badge-paid">✓ ' + fmtMoney(e.paymentReceivedAmount) + ' ₽</span>';
    }

    var html = '<div class="zrz-row zrz-row-event' + (done?' zrz-row-done':'') + '"'
      + ' onclick="zrzDashOpenEvent(' + e.id + ')">';
    html += '<div class="zrz-row-time">' + esc2(time) + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">' + typeIcoStr + ' ' + esc2(typeLabel) + paymentBadge;
    if(o) html += ' <span class="zrz-row-num">№' + esc2(o.orderNum||'—') + '</span>';
    html += '</div>';
    if(name) html += '<div class="zrz-row-sub">' + esc2(name) + (addr ? ' · ' + esc2(addr) : '') + '</div>';
    else if(e.note) html += '<div class="zrz-row-sub">' + esc2(e.note) + '</div>';
    if(km > 0) html += '<div class="zrz-row-sub zrz-row-km">↗ ' + km + ' км от предыдущей</div>';
    html += '</div>';
    if(phone){
      html += '<button type="button" class="zrz-row-action" aria-label="Позвонить" onclick="event.stopPropagation();window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>'
        + '</button>';
    }
    html += '</div>';
    return html;
  }

  function buildSurveyorSchedule(u){
    var evs = collectMyEventsToday(u);
    if(!evs.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">📅</div>'
        + '<div class="zrz-empty-t">Сегодня без выездов</div>'
        + '<div class="zrz-empty-s">Наслаждайся тишиной</div>'
        + '</div>';
    }
    var html = '';
    html += '<div class="zrz-day-head"><span>Сегодня · ' + evs.length + ' ' + (evs.length===1?'выезд':(evs.length<5?'выезда':'выездов')) + '</span></div>';
    evs.forEach(function(e){ html += buildSurveyorEventRow(e); });
    return html;
  }

  function buildSurveyorPayments(u){
    var evs = collectMyEventsToday(u).filter(function(e){
      return e.paymentEnabled;
    });
    if(!evs.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">💰</div>'
        + '<div class="zrz-empty-t">Оплат на сегодня нет</div>'
        + '<div class="zrz-empty-s">Всё чисто</div>'
        + '</div>';
    }
    return evs.map(function(e){ return buildSurveyorEventRow(e); }).join('');
  }

  function buildSurveyorDone(u){
    var evs = collectMyEventsToday(u).filter(function(e){ return e.status === 'done'; });
    if(!evs.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">✓</div>'
        + '<div class="zrz-empty-t">Сегодня ещё ничего не отмечено</div>'
        + '<div class="zrz-empty-s">Отметь выполненные события — менеджер увидит</div>'
        + '</div>';
    }
    return evs.map(function(e){ return buildSurveyorEventRow(e); }).join('');
  }

  function buildSurveyorTab(u){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'schedule';
    if(tab === 'schedule') return buildSurveyorSchedule(u);
    if(tab === 'payments') return buildSurveyorPayments(u);
    if(tab === 'done')     return buildSurveyorDone(u);
    return buildSurveyorSchedule(u);
  }

  function buildSurveyorDashboard(u){
    var html = '';
    html += '<div class="zrz-dash-wrap">';
    html += buildSurveyorHeader(u);
    html += buildSurveyorKpi(u);
    html += buildSurveyorSegmented();
    html += buildSurveyorTab(u);
    html += '<div style="height:80px"></div>';
    html += '</div>';
    return html;
  }

  /* ============================================================
     ПРОГРЕСС ПРОИЗВОДСТВА — блок в карточке позиции
     ============================================================ */

  function injectProgressUI(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_progress_block')) return;
    if(!modal.querySelector('#typeGrid')) return;

    var d = window._editDraft;
    if(!d) return;

    var anchor = document.getElementById('calcBox');
    if(!anchor) return;

    var cur = Number(d.productionProgress) || 0;

    var presets = [0, 25, 50, 75, 100];

    var html = '';
    html += '<div id="zrz_progress_block" class="zrz-progress-block">';
    html +=   '<div class="section-title" style="margin-top:0">📊 Прогресс производства</div>';
    html +=   '<div class="zrz-progress-val" id="zrz_prog_val">' + cur + '%</div>';
    html +=   '<div class="zrz-progress-bar-wrap"><div class="zrz-progress-bar-fill" id="zrz_prog_fill" style="width:' + cur + '%"></div></div>';
    html +=   '<div class="chips zrz-progress-chips" id="zrz_prog_chips">';
    presets.forEach(function(p){
      var cls = (cur === p) ? ' active' : '';
      html += '<button type="button" class="chip' + cls + '" data-p="' + p + '">' + p + '%</button>';
    });
    html +=   '</div>';
    html += '</div>';

    anchor.insertAdjacentHTML('beforebegin', html);

    var valEl = document.getElementById('zrz_prog_val');
    var fillEl = document.getElementById('zrz_prog_fill');
    var chipsEl = document.getElementById('zrz_prog_chips');

    function setProgress(p){
      p = Math.max(0, Math.min(100, Math.round(p)));
      if(window._editDraft){
        window._editDraft.productionProgress = p;
      }
      if(valEl) valEl.textContent = p + '%';
      if(fillEl) fillEl.style.width = p + '%';
      chipsEl.querySelectorAll('.chip').forEach(function(c){
        c.classList.toggle('active', parseInt(c.dataset.p, 10) === p);
      });
      try { if(typeof saveDraft === 'function') saveDraft(); }catch(e){}
    }

    chipsEl.addEventListener('click', function(e){
      var c = e.target.closest('.chip'); if(!c) return;
      setProgress(parseInt(c.dataset.p, 10));
      try { if(typeof haptic === 'function') haptic(6); }catch(_){}
    });
  }

  function wrapOpenItem(){
    if(window._zrz13P2OpenItemWrapped) return;
    if(typeof window.openItem !== 'function') return;
    var orig = window.openItem;
    window.openItem = function(id){
      var r = orig.apply(this, arguments);
      setTimeout(injectProgressUI, 80);
      return r;
    };
    window._zrz13P2OpenItemWrapped = true;
  }

  function wrapSaveItem(){
    if(window._zrz13P2SaveItemWrapped) return;
    if(typeof window.saveItem !== 'function') return;
    var orig = window.saveItem;
    window.saveItem = function(id){
      if(window._editDraft && typeof window._editDraft.productionProgress === 'number'){
        var p = Number(window._editDraft.productionProgress) || 0;
        var beforeCount = (db.items||[]).length;
        var res = orig.apply(this, arguments);
        setTimeout(function(){
          try {
            if(id){
              var it = db.items.find(function(x){ return x.id === id; });
              if(it){ it.productionProgress = p; if(typeof touch==='function') touch(it); if(typeof save==='function') save(); }
            } else {
              var items = db.items || [];
              if(items.length > beforeCount){
                var ni = items[items.length - 1];
                ni.productionProgress = p;
                if(typeof touch==='function') touch(ni);
                if(typeof save==='function') save();
              }
            }
          }catch(e){}
        }, 60);
        return res;
      }
      return orig.apply(this, arguments);
    };
    window._zrz13P2SaveItemWrapped = true;
  }

  /* ============================================================
     ОБЁРТКА renderHome — роутинг по ролям
     ============================================================ */

  function wrapRenderHome(){
    if(window._zrz13P2RenderHomeWrapped) return;
    if(typeof window.renderHome !== 'function') return;
    var orig = window.renderHome;
    window.renderHome = function(){
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return orig.apply(this, arguments);

      if(u.role === 'master'){
        return buildMasterDashboard(u);
      }
      if(u.role === 'surveyor'){
        return buildSurveyorDashboard(u);
      }
      return orig.apply(this, arguments);
    };
    window._zrz13P2RenderHomeWrapped = true;
  }

  function resetTabIfNeeded(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      if(!window._zrzDash) return;
      var tab = window._zrzDash.tab;
      if(u.role === 'master' && ['work','ready','done'].indexOf(tab) < 0){
        window._zrzDash.tab = 'work';
      }
      if(u.role === 'surveyor' && ['schedule','payments','done'].indexOf(tab) < 0){
        window._zrzDash.tab = 'schedule';
      }
      if((u.role === 'admin' || u.role === 'manager') && ['events','orders','my'].indexOf(tab) < 0){
        window._zrzDash.tab = 'events';
      }
    }catch(e){}
  }

  /* ============================================================
     CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-dash2-css')) return;
    var css = ''

      + '.zrz-kpi-3{grid-template-columns:repeat(3,1fr) !important}'

      + '.zrz-row-work{padding-bottom:14px}'
      + '.zrz-master-progress{height:6px;background:rgba(91,127,184,0.14);border-radius:3px;'
      +   'overflow:hidden;margin-top:8px;margin-bottom:4px}'
      + 'html[data-theme="dark"] .zrz-master-progress{background:rgba(123,160,221,0.16)}'
      + '.zrz-master-progress-fill{height:100%;background:linear-gradient(90deg,#8badd8,#5b7fb8);'
      +   'border-radius:3px;transition:width .3s ease}'
      + '.zrz-master-progress-lbl{font-size:11px;font-weight:700;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:0.5px}'

      + '.zrz-badge-pay{background:linear-gradient(135deg,rgba(217,146,74,0.20),rgba(217,146,74,0.10));'
      +   'color:#8a5a0c;border:1px solid rgba(217,146,74,0.40);font-weight:800}'
      + 'html[data-theme="dark"] .zrz-badge-pay{color:#e0a866}'
      + '.zrz-badge-paid{background:var(--ok-soft);color:#2c7a54;font-weight:800}'
      + 'html[data-theme="dark"] .zrz-badge-paid{color:#86efac}'
      + '.zrz-row-km{color:var(--muted-2);font-size:11.5px;margin-top:2px}'

      + '.zrz-progress-block{margin-top:14px;padding:16px;border-radius:18px;'
      +   'background:linear-gradient(180deg,rgba(91,127,184,0.08),rgba(91,127,184,0.02));'
      +   'border:1.5px solid rgba(91,127,184,0.24)}'
      + '.zrz-progress-val{font-size:28px;font-weight:900;color:var(--accent-deep);'
      +   'text-align:center;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;'
      +   'margin:6px 0 12px;line-height:1}'
      + '.zrz-progress-bar-wrap{height:10px;background:rgba(91,127,184,0.14);'
      +   'border-radius:5px;overflow:hidden;margin-bottom:14px}'
      + '.zrz-progress-bar-fill{height:100%;background:linear-gradient(90deg,#8badd8,#5b7fb8);'
      +   'border-radius:5px;transition:width .3s ease}'
      + '.zrz-progress-chips{justify-content:center;flex-wrap:nowrap}'
      + '.zrz-progress-chips .chip{flex:1;text-align:center;justify-content:center}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-dash2-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapRenderHome(); }catch(e){}
    try { wrapOpenItem(); }catch(e){}
    try { wrapSaveItem(); }catch(e){}
    try { resetTabIfNeeded(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 700);
  setTimeout(apply, 1800);

  setTimeout(function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(u && (u.role === 'master' || u.role === 'surveyor')){
        if(typeof render === 'function') render();
      }
    }catch(e){}
  }, 2400);

  var _iv = setInterval(function(){
    try { wrapRenderHome(); }catch(e){}
    try { wrapOpenItem(); }catch(e){}
    try { wrapSaveItem(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[13 p2] дашборды мастера и замерщика + прогресс производства активны'); }catch(_){}
})();
/* patches/13-dashboard.js — Часть 3/3
   · Дашборд водителя (маршруты + KPI)
   · Swipe actions на строках (вправо → позвонить / влево → карта)
   · Bottom Sheet preview при тапе на событие / заказ
*/
(function(){
  if(window._zrz13DashboardP3) return;
  window._zrz13DashboardP3 = true;

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */
  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function todayKey(){
    try { if(typeof dateToYmd === 'function') return dateToYmd(new Date()); }catch(e){}
    var d = new Date();
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function timeToMin(t){
    if(!t) return null;
    try { if(typeof parseTimeToMinutes === 'function') return parseTimeToMinutes(t); }catch(e){}
    var m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    return parseInt(m[1],10)*60 + parseInt(m[2],10);
  }
  function nowMinutes(){
    var d = new Date();
    return d.getHours()*60 + d.getMinutes();
  }
  function fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function clientName(o){
    try { return (typeof orderClientName === 'function') ? (orderClientName(o) || '') : ''; }catch(e){ return ''; }
  }
  function clientPhone(o){
    try { return (typeof orderClientPhone === 'function') ? (orderClientPhone(o) || '') : ''; }catch(e){ return ''; }
  }
  function addrShort(o){
    try { return (typeof orderAddressShort === 'function') ? (orderAddressShort(o) || '') : ''; }catch(e){ return ''; }
  }
  function typeIco(k){
    var m = {MIRROR:'🪞',SHOWER:'🚿',APRON:'🍳',SHELF:'🗄',PANNO:'🖼'};
    return m[k] || '📦';
  }

  /* ============================================================
     ДАШБОРД ВОДИТЕЛЯ
     ============================================================ */

  function collectMyRoutesToday(u){
    var tk = todayKey();
    var routes = (window.db && Array.isArray(db.routes)) ? db.routes : [];
    return routes.filter(function(r){
      return r && r.date === tk && r.assignedUserId === u.id;
    });
  }

  function calcDriverKpi(u){
    var r = { routes:0, points:0, km:0, pay:0 };
    try {
      var rs = collectMyRoutesToday(u);
      r.routes = rs.length;
      rs.forEach(function(route){
        var pts = Array.isArray(route.points) ? route.points : [];
        r.points += pts.length;
        pts.forEach(function(p){
          if(p.legFromPrev && Number(p.legFromPrev.km)){
            r.km += Number(p.legFromPrev.km);
          }
        });
      });
      r.km = Math.round(r.km * 10) / 10;

      var events = (window.db && Array.isArray(db.events)) ? db.events : [];
      var tk = todayKey();
      events.forEach(function(e){
        if(!e || e.date !== tk) return;
        if(!Array.isArray(e.assignedUserIds)) return;
        if(e.assignedUserIds.indexOf(u.id) < 0) return;
        if(!e.paymentEnabled || e.paymentReceived) return;
        r.pay += Number(e.paymentAmount)||0;
      });
    }catch(e){}
    return r;
  }

  function buildDriverHeader(u){
    var now = new Date();
    var firstName = (u.name || '').split(' ')[0] || u.name || '';
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var days = ['вс','пн','вт','ср','чт','пт','сб'];
    var dateLabel = now.getDate() + ' ' + months[now.getMonth()] + ', ' + days[now.getDay()];
    return '<div class="zrz-dash-head">'
      + '<div class="zrz-dash-head-left">'
      +   '<div class="zrz-dash-greet">🚚 Смена ' + esc2(firstName) + '</div>'
      +   '<div class="zrz-dash-date">' + esc2(dateLabel) + '</div>'
      + '</div>'
      + '<button type="button" class="zrz-dash-search" aria-label="Поиск" onclick="if(window.zrzOpenPalette)window.zrzOpenPalette()">'
      +   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>'
      + '</button>'
      + '</div>';
  }

  function buildDriverKpi(u){
    var k = calcDriverKpi(u);
    var tiles = [
      { ico:'🚚', val:k.routes, label:'маршрутов' },
      { ico:'📍', val:k.points, label:'точек' },
      { ico:'🛣', val:k.km > 0 ? (k.km + ' км') : '—', label:'пробег' }
    ];
    var html = '<div class="zrz-kpi zrz-kpi-3">';
    tiles.forEach(function(t){
      html += '<div class="zrz-kpi-cell">'
        +   '<div class="zrz-kpi-ico">' + t.ico + '</div>'
        +   '<div class="zrz-kpi-val">' + esc2(t.val) + '</div>'
        +   '<div class="zrz-kpi-lbl">' + esc2(t.label) + '</div>'
        + '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildDriverSegmented(){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'routes';
    var tabs = [
      { key:'routes',   ico:'🚚', label:'Маршруты' },
      { key:'payments', ico:'💰', label:'Оплаты' },
      { key:'done',     ico:'✓',  label:'Сделано' }
    ];
    return '<div class="zrz-seg">' + tabs.map(function(t){
      return '<button type="button" class="zrz-seg-btn' + (tab===t.key?' active':'') + '" onclick="zrzDashSwitchTab(\''+t.key+'\')">'
        + '<span class="zrz-seg-ico">' + t.ico + '</span>'
        + '<span>' + esc2(t.label) + '</span>'
        + '</button>';
    }).join('') + '</div>';
  }

  function buildRoutePointTitle(p){
    try {
      if(p.kind === 'order'){
        var o = db.orders.find(function(x){ return x.id === p.refId; });
        if(o) return '№' + (o.orderNum||'—') + ' · ' + (clientName(o) || '');
        return 'Заказ';
      }
      if(p.kind === 'contractor'){
        var co = db.contractors.find(function(x){ return x.id === p.refId; });
        return co ? (co.name || 'Контрагент') : 'Контрагент';
      }
      return p.label || 'Точка';
    }catch(e){ return 'Точка'; }
  }

  function buildRoutePointAddress(p){
    try {
      if(p.kind === 'order'){
        var o = db.orders.find(function(x){ return x.id === p.refId; });
        return o ? addrShort(o) : '';
      }
      if(p.kind === 'contractor'){
        var co = db.contractors.find(function(x){ return x.id === p.refId; });
        if(co && co.addressId){
          var a = db.addresses.find(function(x){ return x.id === co.addressId; });
          if(a) return [a.city, a.street, a.house].filter(Boolean).join(', ');
        }
        return '';
      }
      if(p.addressId){
        var a2 = db.addresses.find(function(x){ return x.id === p.addressId; });
        if(a2) return [a2.city, a2.street, a2.house].filter(Boolean).join(', ');
      }
      return p.label || '';
    }catch(e){ return ''; }
  }

  function buildRoutePointPhone(p){
    try {
      if(p.kind === 'order'){
        var o = db.orders.find(function(x){ return x.id === p.refId; });
        return o ? clientPhone(o) : '';
      }
      if(p.kind === 'contractor'){
        var co = db.contractors.find(function(x){ return x.id === p.refId; });
        return co ? (co.phone || '') : '';
      }
      return '';
    }catch(e){ return ''; }
  }

  function buildRouteCard(route){
    var pts = Array.isArray(route.points) ? route.points : [];
    var km = 0;
    pts.forEach(function(p){
      if(p.legFromPrev && Number(p.legFromPrev.km)) km += Number(p.legFromPrev.km);
    });
    km = Math.round(km * 10) / 10;

    var html = '';
    html += '<div class="zrz-route-card">';
    html += '<div class="zrz-route-head">';
    html +=   '<div class="zrz-route-title">🚚 ' + esc2(route.title || 'Маршрут') + '</div>';
    html +=   '<div class="zrz-route-stats">' + pts.length + ' точек' + (km > 0 ? ' · ' + km + ' км' : '') + '</div>';
    html += '</div>';

    if(!pts.length){
      html += '<div class="zrz-route-empty">Точек нет</div>';
    } else {
      html += '<div class="zrz-route-points">';
      pts.forEach(function(p, idx){
        var title = buildRoutePointTitle(p);
        var addr = buildRoutePointAddress(p);
        var phone = buildRoutePointPhone(p);
        var time = p.time || '';
        var legKm = (p.legFromPrev && Number(p.legFromPrev.km)) || 0;

        html += '<div class="zrz-rp" data-idx="' + idx + '">';
        html +=   '<div class="zrz-rp-num">' + (idx + 1) + '</div>';
        html +=   '<div class="zrz-rp-body">';
        html +=     '<div class="zrz-rp-title">' + esc2(title) + '</div>';
        if(addr) html += '<div class="zrz-rp-sub">📍 ' + esc2(addr) + '</div>';
        if(time) html += '<div class="zrz-rp-sub">🕐 ' + esc2(time) + '</div>';
        if(legKm > 0) html += '<div class="zrz-rp-sub zrz-rp-km">↗ ' + legKm + ' км от предыдущей</div>';
        html +=   '</div>';
        html +=   '<div class="zrz-rp-actions">';
        if(phone){
          html += '<button type="button" class="zrz-rp-btn" aria-label="Позвонить" onclick="event.stopPropagation();window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">📞</button>';
        }
        if(addr){
          html += '<button type="button" class="zrz-rp-btn" aria-label="Карта" onclick="event.stopPropagation();zrz13p3OpenMap(\'' + esc2(addr).replace(/'/g, "\\'") + '\')">🗺</button>';
        }
        html +=   '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<div class="zrz-route-actions">';
    html +=   '<button type="button" class="zrz-route-btn" onclick="if(typeof openRouteSheetPrint===\'function\')openRouteSheetPrint(' + route.id + ')">🖨 Лист</button>';
    html +=   '<button type="button" class="zrz-route-btn zrz-route-btn-primary" onclick="if(typeof openRoute===\'function\')openRoute(' + route.id + ')">Открыть</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  window.zrz13p3OpenMap = function(addr){
    try {
      if(typeof openMap === 'function') return openMap(addr);
      window.open('https://yandex.ru/maps/?text=' + encodeURIComponent(addr), '_blank');
    }catch(e){}
  };

  function buildDriverRoutes(u){
    var rs = collectMyRoutesToday(u);
    if(!rs.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">🚚</div>'
        + '<div class="zrz-empty-t">Сегодня без маршрутов</div>'
        + '<div class="zrz-empty-s">Хорошего дня!</div>'
        + '</div>';
    }
    return rs.map(buildRouteCard).join('');
  }

  function buildDriverPayments(u){
    var tk = todayKey();
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
    var mine = events.filter(function(e){
      if(!e || e.date !== tk) return false;
      if(!Array.isArray(e.assignedUserIds)) return false;
      if(e.assignedUserIds.indexOf(u.id) < 0) return false;
      return !!e.paymentEnabled;
    });
    if(!mine.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">💰</div>'
        + '<div class="zrz-empty-t">Оплат нет</div>'
        + '<div class="zrz-empty-s">Ничего не надо забирать</div>'
        + '</div>';
    }
    return mine.map(function(e){
      var o = e.orderId ? orders.find(function(x){ return x.id === e.orderId; }) : null;
      var typeIcoStr = (typeof eventTypeIco === 'function') ? eventTypeIco(e.type || 'delivery') : '🚚';
      var typeLabel = (typeof eventTypeLabel === 'function') ? eventTypeLabel(e.type || 'delivery') : 'Событие';
      var paid = e.paymentReceived;
      var amt = paid ? e.paymentReceivedAmount : e.paymentAmount;
      return '<div class="zrz-row zrz-row-event' + (paid?' zrz-row-done':'') + '"'
        + ' onclick="zrzDashOpenEvent(' + e.id + ')">'
        + '<div class="zrz-row-time">' + esc2(e.time || '—') + '</div>'
        + '<div class="zrz-row-body">'
        +   '<div class="zrz-row-title">' + typeIcoStr + ' ' + esc2(typeLabel)
        +   '<span class="zrz-badge ' + (paid?'zrz-badge-paid':'zrz-badge-pay') + '">'
        +   (paid?'✓ ':'💰 ') + fmtMoney(amt) + ' ₽</span></div>'
        +   (o ? '<div class="zrz-row-sub">№' + esc2(o.orderNum||'—') + ' · ' + esc2(clientName(o)||'') + '</div>' : '')
        + '</div>'
        + '</div>';
    }).join('');
  }

  function buildDriverDone(u){
    var tk = todayKey();
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    var mine = events.filter(function(e){
      if(!e || e.date !== tk) return false;
      if(!Array.isArray(e.assignedUserIds)) return false;
      if(e.assignedUserIds.indexOf(u.id) < 0) return false;
      return e.status === 'done';
    });
    if(!mine.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">✓</div>'
        + '<div class="zrz-empty-t">Сегодня ещё ничего не завершено</div>'
        + '<div class="zrz-empty-s">Отметь выполненные события</div>'
        + '</div>';
    }
    return mine.map(function(e){
      var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
      var typeIcoStr = (typeof eventTypeIco === 'function') ? eventTypeIco(e.type || 'delivery') : '🚚';
      var typeLabel = (typeof eventTypeLabel === 'function') ? eventTypeLabel(e.type || 'delivery') : 'Событие';
      return '<div class="zrz-row zrz-row-event zrz-row-done" onclick="zrzDashOpenEvent(' + e.id + ')">'
        + '<div class="zrz-row-time">' + esc2(e.time || '—') + '</div>'
        + '<div class="zrz-row-body">'
        +   '<div class="zrz-row-title">' + typeIcoStr + ' ' + esc2(typeLabel) + '</div>'
        +   (o ? '<div class="zrz-row-sub">№' + esc2(o.orderNum||'—') + ' · ' + esc2(clientName(o)||'') + '</div>' : '')
        + '</div>'
        + '</div>';
    }).join('');
  }

  function buildDriverTab(u){
    var tab = (window._zrzDash && window._zrzDash.tab) || 'routes';
    if(tab === 'routes')   return buildDriverRoutes(u);
    if(tab === 'payments') return buildDriverPayments(u);
    if(tab === 'done')     return buildDriverDone(u);
    return buildDriverRoutes(u);
  }

  function buildDriverDashboard(u){
    var html = '';
    html += '<div class="zrz-dash-wrap">';
    html += buildDriverHeader(u);
    html += buildDriverKpi(u);
    html += buildDriverSegmented();
    html += buildDriverTab(u);
    html += '<div style="height:80px"></div>';
    html += '</div>';
    return html;
  }

  /* ============================================================
     SWIPE ACTIONS НА СТРОКАХ .zrz-row
     ============================================================ */

  function bindSwipeRows(){
    if(window._zrz13P3SwipeBound) return;
    window._zrz13P3SwipeBound = true;

    var startX = 0, startY = 0, dx = 0, dy = 0;
    var active = null, locked = null;

    document.addEventListener('touchstart', function(e){
      var row = e.target.closest && e.target.closest('.zrz-row');
      if(!row) return;
      if(e.target.closest('button')) return;
      if(e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0; dy = 0;
      locked = null;
      active = row;
    }, {passive:true});

    document.addEventListener('touchmove', function(e){
      if(!active) return;
      if(e.touches.length !== 1) return;
      var cx = e.touches[0].clientX - startX;
      var cy = e.touches[0].clientY - startY;

      if(locked === null){
        if(Math.abs(cx) > Math.abs(cy) + 6) locked = 'x';
        else if(Math.abs(cy) > Math.abs(cx) + 6){ locked = 'y'; active = null; return; }
        else return;
      }
      if(locked !== 'x') return;
      e.preventDefault();
      dx = cx;
      var maxShift = 90;
      var shift = Math.max(-maxShift, Math.min(maxShift, dx));
      active.style.transform = 'translateX(' + shift + 'px)';
      active.style.transition = 'none';
      if(shift > 20) active.classList.add('zrz-swipe-right');
      else if(shift < -20) active.classList.add('zrz-swipe-left');
      else active.classList.remove('zrz-swipe-right','zrz-swipe-left');
    }, {passive:false});

    document.addEventListener('touchend', function(e){
      if(!active) return;
      var row = active;
      active = null;
      row.style.transition = 'transform .2s ease';
      row.style.transform = '';
      row.classList.remove('zrz-swipe-right','zrz-swipe-left');

      var threshold = 60;
      if(dx > threshold){
        doSwipeRight(row);
      } else if(dx < -threshold){
        doSwipeLeft(row);
      }
      dx = 0;
    }, {passive:true});

    document.addEventListener('touchcancel', function(){
      if(active){
        active.style.transform = '';
        active.classList.remove('zrz-swipe-right','zrz-swipe-left');
      }
      active = null;
    });
  }

  function doSwipeRight(row){
    try {
      var oid = null;
      var onclick = row.getAttribute('onclick') || '';
      var m = onclick.match(/zrzDashOpenOrder\((\d+)\)/);
      if(m) oid = parseInt(m[1], 10);
      else {
        var m2 = onclick.match(/zrzDashOpenEvent\((\d+)\)/);
        if(m2){
          var eid = parseInt(m2[1], 10);
          var e = db.events.find(function(x){ return x.id === eid; });
          if(e && e.orderId) oid = e.orderId;
        }
      }
      if(oid){
        var o = db.orders.find(function(x){ return x.id === oid; });
        var phone = o ? clientPhone(o) : '';
        if(phone){
          try { if(typeof haptic === 'function') haptic([10, 30, 10]); }catch(_){}
          window.location.href = 'tel:' + phone.replace(/[^+\d]/g, '');
          return;
        }
      }
    }catch(e){}
  }

  function doSwipeLeft(row){
    try {
      var addr = '';
      var onclick = row.getAttribute('onclick') || '';
      var m = onclick.match(/zrzDashOpenOrder\((\d+)\)/);
      if(m){
        var o = db.orders.find(function(x){ return x.id === parseInt(m[1], 10); });
        if(o) addr = addrShort(o);
      } else {
        var m2 = onclick.match(/zrzDashOpenEvent\((\d+)\)/);
        if(m2){
          var e = db.events.find(function(x){ return x.id === parseInt(m2[1], 10); });
          if(e && e.orderId){
            var o2 = db.orders.find(function(x){ return x.id === e.orderId; });
            if(o2) addr = addrShort(o2);
          }
        }
      }
      if(addr){
        try { if(typeof haptic === 'function') haptic([10, 30, 10]); }catch(_){}
        window.zrz13p3OpenMap(addr);
      }
    }catch(e){}
  }

  /* ============================================================
     BOTTOM SHEET PREVIEW
     ============================================================ */

  function openPreviewForOrder(orderId){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); }catch(e){}
    if(!o) return;

    var st = (typeof STATUS_META !== 'undefined' && STATUS_META[o.status]) ? STATUS_META[o.status] : { label:'—' };
    var its = [];
    try { its = (typeof itemsOf === 'function') ? itemsOf(o.id) : []; }catch(e){}
    var phone = clientPhone(o);
    var addr = addrShort(o) || '';
    var total = Number(o.orderTotal)||0;
    var paid = Number(o.orderPaid)||0;
    var due = Math.max(0, total - paid);

    var html = '';
    html += '<div class="zrz-sheet">';
    html += '<div class="zrz-sheet-handle"></div>';
    html += '<div class="zrz-preview-head">';
    html +=   '<div class="zrz-preview-num">№' + esc2(o.orderNum || '—') + '</div>';
    html +=   '<div class="zrz-preview-title">' + esc2(clientName(o) || 'Без имени') + '</div>';
    html +=   '<div class="zrz-badge zrz-preview-badge">' + esc2(st.label) + '</div>';
    html += '</div>';

    if(addr) html += '<div class="zrz-preview-line">📍 ' + esc2(addr) + '</div>';
    if(phone) html += '<div class="zrz-preview-line">📞 <a class="tap-link" href="tel:' + phone.replace(/[^+\d]/g,'') + '">' + esc2(phone) + '</a></div>';
    html += '<div class="zrz-preview-line">📦 Позиций: ' + its.length + '</div>';

    if(total > 0){
      if(due > 0){
        html += '<div class="zrz-preview-line zrz-preview-due">💰 К доплате: <b>' + fmtMoney(due) + ' ₽</b></div>';
      } else {
        html += '<div class="zrz-preview-line zrz-preview-paid">💰 Оплачен полностью</div>';
      }
    }

    html += '<div class="zrz-preview-actions">';
    html +=   '<button type="button" class="zrz-preview-btn" onclick="zrz13p3Close();zrzDashOpenOrder(' + o.id + ')">Открыть</button>';
    if(phone) html += '<button type="button" class="zrz-preview-btn zrz-preview-btn-accent" onclick="window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">📞 Позвонить</button>';
    html += '</div>';

    html += '<button type="button" class="zrz-sheet-close" onclick="zrz13p3Close()">Закрыть</button>';
    html += '</div>';

    var bg = document.createElement('div');
    bg.id = 'zrz13p3_bg';
    bg.className = 'zrz-sheet-bg';
    bg.innerHTML = html;
    document.body.appendChild(bg);
    bg.addEventListener('click', function(e){ if(e.target === bg) window.zrz13p3Close(); });

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
        if(dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
      }, {passive:true});
      sheet.addEventListener('touchend', function(){
        if(sy == null) return;
        sheet.style.transition = '';
        if(dy > 90){ window.zrz13p3Close(); }
        else { sheet.style.transform = ''; }
        sy = null; dy = 0;
      });
    }
  }

  function openPreviewForEvent(eventId){
    var e = null;
    try { e = db.events.find(function(x){ return x.id === eventId; }); }catch(err){}
    if(!e) return;

    var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
    var typeIcoStr = (typeof eventTypeIco === 'function') ? eventTypeIco(e.type || 'measure') : '📏';
    var typeLabel = (typeof eventTypeLabel === 'function') ? eventTypeLabel(e.type || 'measure') : 'Событие';
    var phone = o ? clientPhone(o) : '';
    var addr = o ? addrShort(o) : '';

    var html = '';
    html += '<div class="zrz-sheet">';
    html += '<div class="zrz-sheet-handle"></div>';
    html += '<div class="zrz-preview-head">';
    html +=   '<div class="zrz-preview-num">' + typeIcoStr + ' ' + esc2(typeLabel) + '</div>';
    html +=   '<div class="zrz-preview-title">' + esc2((e.time||'—') + (o ? ' · ' + (clientName(o)||'') : '')) + '</div>';
    html += '</div>';

    if(addr) html += '<div class="zrz-preview-line">📍 ' + esc2(addr) + '</div>';
    if(phone) html += '<div class="zrz-preview-line">📞 <a class="tap-link" href="tel:' + phone.replace(/[^+\d]/g,'') + '">' + esc2(phone) + '</a></div>';
    if(e.note) html += '<div class="zrz-preview-line">📝 ' + esc2(e.note) + '</div>';
    if(e.legFromPrev && Number(e.legFromPrev.km)){
      html += '<div class="zrz-preview-line">↗ ' + Number(e.legFromPrev.km) + ' км от предыдущей</div>';
    }

    html += '<div class="zrz-preview-actions">';
    html +=   '<button type="button" class="zrz-preview-btn" onclick="zrz13p3Close();zrzDashOpenEvent(' + e.id + ')">Открыть</button>';
    if(phone) html += '<button type="button" class="zrz-preview-btn zrz-preview-btn-accent" onclick="window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">📞 Позвонить</button>';
    if(addr) html += '<button type="button" class="zrz-preview-btn" onclick="zrz13p3Close();zrz13p3OpenMap(\'' + esc2(addr).replace(/'/g, "\\'") + '\')">🗺 Карта</button>';
    html += '</div>';

    html += '<button type="button" class="zrz-sheet-close" onclick="zrz13p3Close()">Закрыть</button>';
    html += '</div>';

    var bg = document.createElement('div');
    bg.id = 'zrz13p3_bg';
    bg.className = 'zrz-sheet-bg';
    bg.innerHTML = html;
    document.body.appendChild(bg);
    bg.addEventListener('click', function(ev){ if(ev.target === bg) window.zrz13p3Close(); });

    var sheet = bg.querySelector('.zrz-sheet');
    if(sheet){
      var sy = null, dy = 0;
      sheet.addEventListener('touchstart', function(ev){
        if(sheet.scrollTop > 4) return;
        sy = ev.touches[0].clientY; dy = 0;
        sheet.style.transition = 'none';
      }, {passive:true});
      sheet.addEventListener('touchmove', function(ev){
        if(sy == null) return;
        dy = ev.touches[0].clientY - sy;
        if(dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
      }, {passive:true});
      sheet.addEventListener('touchend', function(){
        if(sy == null) return;
        sheet.style.transition = '';
        if(dy > 90){ window.zrz13p3Close(); }
        else { sheet.style.transform = ''; }
        sy = null; dy = 0;
      });
    }
  }

  window.zrz13p3Close = function(){
    var el = document.getElementById('zrz13p3_bg');
    if(!el) return;
    var sheet = el.querySelector('.zrz-sheet');
    if(sheet){
      sheet.style.transition = 'transform .2s ease,opacity .2s ease';
      sheet.style.transform = 'translateY(120%)';
      sheet.style.opacity = '0';
      el.style.transition = 'opacity .2s ease';
      el.style.opacity = '0';
      setTimeout(function(){ el.remove(); }, 220);
    } else el.remove();
  };

  function bindPreviewTap(){
    if(window._zrz13P3PreviewBound) return;
    window._zrz13P3PreviewBound = true;

    document.addEventListener('click', function(e){
      var row = e.target.closest && e.target.closest('.zrz-row');
      if(!row) return;
      if(e.target.closest('button')) return;
      if(e.target.closest('.zrz-rp-btn')) return;

      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      var usePreview = (u.role === 'surveyor' || u.role === 'driver');
      if(!usePreview) return;

      var oc = row.getAttribute('onclick') || '';
      var m = oc.match(/zrzDashOpenOrder\((\d+)\)/);
      if(m){
        e.preventDefault();
        e.stopPropagation();
        openPreviewForOrder(parseInt(m[1], 10));
        return;
      }
      var m2 = oc.match(/zrzDashOpenEvent\((\d+)\)/);
      if(m2){
        e.preventDefault();
        e.stopPropagation();
        openPreviewForEvent(parseInt(m2[1], 10));
        return;
      }
    }, true);
  }

  /* ============================================================
     ОБЁРТКА renderHome — водитель
     ============================================================ */

  function wrapRenderHome(){
    if(window._zrz13P3RenderHomeWrapped) return;
    if(typeof window.renderHome !== 'function') return;
    var orig = window.renderHome;
    window.renderHome = function(){
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return orig.apply(this, arguments);
      if(u.role === 'driver'){
        return buildDriverDashboard(u);
      }
      return orig.apply(this, arguments);
    };
    window._zrz13P3RenderHomeWrapped = true;
  }

  function resetTabIfNeeded(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u || !window._zrzDash) return;
      var tab = window._zrzDash.tab;
      if(u.role === 'driver' && ['routes','payments','done'].indexOf(tab) < 0){
        window._zrzDash.tab = 'routes';
      }
    }catch(e){}
  }

  /* ============================================================
     CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-dash3-css')) return;
    var css = ''

      + '.zrz-row{position:relative;will-change:transform}'
      + '.zrz-row.zrz-swipe-right{background:linear-gradient(90deg,rgba(76,175,125,0.18) 0%,var(--surface) 40%)}'
      + '.zrz-row.zrz-swipe-left{background:linear-gradient(270deg,rgba(59,134,200,0.18) 0%,var(--surface) 40%)}'

      + '.zrz-route-card{padding:14px;background:var(--surface);border:1.5px solid var(--line);'
      +   'border-radius:16px;margin-bottom:12px}'
      + '.zrz-route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;'
      +   'padding-bottom:10px;border-bottom:1px dashed var(--line);margin-bottom:10px}'
      + '.zrz-route-title{font-size:16px;font-weight:800;color:var(--text);line-height:1.3;flex:1;min-width:0}'
      + '.zrz-route-stats{font-size:11.5px;font-weight:700;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}'
      + '.zrz-route-empty{padding:16px;text-align:center;color:var(--muted);font-size:13px;'
      +   'background:var(--line-soft);border-radius:12px;margin-bottom:10px}'
      + '.zrz-route-points{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}'
      + '.zrz-rp{display:flex;gap:10px;padding:10px 12px;background:var(--line-soft);'
      +   'border-radius:12px;align-items:flex-start}'
      + '.zrz-rp-num{width:26px;height:26px;border-radius:50%;flex-shrink:0;'
      +   'background:linear-gradient(135deg,#8badd8,#5b7fb8);color:#fff;font-weight:800;'
      +   'font-size:12px;display:flex;align-items:center;justify-content:center}'
      + '.zrz-rp-body{flex:1;min-width:0}'
      + '.zrz-rp-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.35;margin-bottom:3px}'
      + '.zrz-rp-sub{font-size:12.5px;color:var(--muted);line-height:1.4}'
      + '.zrz-rp-km{color:var(--muted-2);font-size:11.5px;margin-top:2px}'
      + '.zrz-rp-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}'
      + '.zrz-rp-btn{width:34px;height:34px;border-radius:10px;border:none;background:var(--surface);'
      +   'font-size:15px;cursor:pointer;padding:0;'
      +   'display:flex;align-items:center;justify-content:center}'
      + '.zrz-rp-btn:active{transform:scale(0.94)}'
      + '.zrz-route-actions{display:flex;gap:8px}'
      + '.zrz-route-btn{flex:1;padding:11px 14px;border:1.5px solid var(--line);'
      +   'border-radius:12px;background:var(--surface);color:var(--text);'
      +   'font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;'
      +   'transition:background .12s ease,transform .12s ease}'
      + '.zrz-route-btn:active{transform:scale(0.97)}'
      + '.zrz-route-btn-primary{background:linear-gradient(135deg,#8badd8,#5b7fb8);'
      +   'color:#fff;border:none;box-shadow:0 4px 14px rgba(91,127,184,0.30)}'

      + '.zrz-preview-head{padding:6px 4px 14px;border-bottom:1px dashed var(--line);margin-bottom:12px}'
      + '.zrz-preview-num{font-family:var(--font-mono);font-size:13px;font-weight:800;'
      +   'color:var(--accent-deep);letter-spacing:-0.02em}'
      + '.zrz-preview-title{font-size:19px;font-weight:800;color:var(--text);'
      +   'margin-top:4px;line-height:1.25;letter-spacing:-0.02em}'
      + '.zrz-preview-badge{display:inline-block;margin-top:6px;font-size:11px}'
      + '.zrz-preview-line{padding:8px 4px;font-size:14px;color:var(--text-soft);line-height:1.5;'
      +   'display:flex;gap:8px;align-items:flex-start}'
      + '.zrz-preview-line b{color:var(--text);font-weight:800}'
      + '.zrz-preview-due{color:#8a5a0c;font-weight:700}'
      + 'html[data-theme="dark"] .zrz-preview-due{color:#e0a866}'
      + '.zrz-preview-paid{color:#2c7a54;font-weight:700}'
      + '.zrz-preview-actions{display:flex;gap:8px;margin-top:16px}'
      + '.zrz-preview-btn{flex:1;padding:13px 14px;border:1.5px solid var(--line);'
      +   'border-radius:14px;background:var(--surface);color:var(--text);'
      +   'font-family:inherit;font-size:14px;font-weight:700;cursor:pointer}'
      + '.zrz-preview-btn:active{transform:scale(0.97)}'
      + '.zrz-preview-btn-accent{background:linear-gradient(135deg,#8badd8,#5b7fb8);'
      +   'color:#fff;border:none;box-shadow:0 4px 14px rgba(91,127,184,0.28)}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-dash3-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapRenderHome(); }catch(e){}
    try { resetTabIfNeeded(); }catch(e){}
    try { bindSwipeRows(); }catch(e){}
    try { bindPreviewTap(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 700);
  setTimeout(apply, 1800);

  setTimeout(function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(u && u.role === 'driver'){
        if(typeof render === 'function') render();
      }
    }catch(e){}
  }, 2400);

  var _iv = setInterval(function(){
    try { wrapRenderHome(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[13 p3] дашборд водителя + swipe + preview активны'); }catch(_){}
})();
