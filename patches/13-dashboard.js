/* patches/13-dashboard.js — Часть 1: основа + дашборд админа/менеджера
   · Обёртка renderHome — свой дашборд для admin/manager
   · Шапка: приветствие + дата + иконка поиска
   · KPI-плитки (4 шт)
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
  if(!window._zrzDash) window._zrzDash = { tab:'events', scrollY:0 };

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

      /* 1. Просроченные события */
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

      /* 2. События сегодня, время прошло, статус не done */
      visibleEvents().forEach(function(e){
        if(e.date !== tk) return;
        if(e.status === 'done') return;
        var tm = timeToMin(e.time);
        if(tm == null) return;
        if(tm < now - 15){ /* 15 мин буфер */
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

      /* 3. Заказы на паузе > 3 дней */
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

      /* 4. Долг > 30 дней */
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

    /* Ограничим 5-ю */
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
      { ico:'📅', val:k.eventsToday, label:'событий', sub:'сегодня' },
      { ico:'🔧', val:k.inWork,      label:'в работе', sub:'заказов' },
      { ico:'💰', val:fmtMoney(k.dueSum) + ' ₽', label:'к доплате', sub:'по всем' },
      { ico:'⏰', val:k.overdue,     label:'просрочено', sub:'событий' }
    ];
    var html = '<div class="zrz-kpi">';
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

  /* --- Строка события --- */
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

  /* --- Строка заказа --- */
  function buildOrderRow(o){
    var st = (typeof STATUS_META !== 'undefined' && STATUS_META[o.status]) ? STATUS_META[o.status] : { label:'—' };
    var name = clientName(o) || 'Без имени';
    var addr = addrShort(o);
    var total = Number(o.orderTotal)||0;
    var paid  = Number(o.orderPaid)||0;
    var due = total > paid ? (total - paid) : 0;

    /* Иконка первого типа в позициях */
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

  /* --- Таб: события --- */
  function buildEventsTab(){
    var tk = todayKey();
    var events = visibleEvents().slice();
    /* Только сегодня и будущие + просроченные не done сегодня */
    events.sort(function(a,b){
      var c = String(a.date||'').localeCompare(String(b.date||''));
      if(c !== 0) return c;
      var am = timeToMin(a.time), bm = timeToMin(b.time);
      if(am == null && bm == null) return 0;
      if(am == null) return 1;
      if(bm == null) return -1;
      return am - bm;
    });
    /* Фильтр: сегодня и ближайшие 30 дней + старые не done */
    var list = events.filter(function(e){
      if(!e.date) return false;
      if(e.date >= tk) return true;
      if(e.date < tk && e.status !== 'done') return true;
      return false;
    });

    if(!list.length){
      return '<div class="zrz-empty">'
        + '<div class="zrz-empty-ico">📅</div>'
        + '<div class="zrz-empty-t">На сегодня свободно</div>'
        + '<div class="zrz-empty-s">Ближайших событий нет</div>'
        + '</div>';
    }

    /* Группировка по дате */
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

  /* --- Таб: заказы --- */
  function buildOrdersTab(){
    var list = visibleOrdersList().slice();
    /* Активные сверху: work > ready > approval > measure_done > measure_scheduled > lead */
    var order = { work:0, ready:1, approval:2, measure_done:3, measure_scheduled:4, lead:5, paused:6, installed:7, closed:8, declined:9 };
    list.sort(function(a,b){
      var oa = order[a.status] != null ? order[a.status] : 99;
      var ob = order[b.status] != null ? order[b.status] : 99;
      if(oa !== ob) return oa - ob;
      return (b.createdAt||0) - (a.createdAt||0);
    });
    /* Ограничим 50-ю */
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

  /* --- Таб: мои --- */
  function buildMyTab(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';
    var list = visibleOrdersList().filter(function(o){
      if(o.createdBy === u.id) return true;
      if(Array.isArray(o.assignedUserIds) && o.assignedUserIds.indexOf(u.id) >= 0) return true;
      return false;
    });
    /* Активные первыми */
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

  /* --- Основной дашборд --- */
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

  window.zrzDashSwitchTab = function(tab){
    try { if(typeof haptic === 'function') haptic(6); }catch(e){}
    window._zrzDash.tab = tab || 'events';
    try { if(typeof render === 'function') render(); }catch(e){}
  };

  window.zrzDashOpenOrder = function(id){
    try { if(typeof openOrder === 'function') openOrder(id); }catch(e){}
  };

  window.zrzDashOpenEvent = function(id){
    try {
      var e = (typeof eventById === 'function') ? eventById(id) : null;
      if(!e) return;
      /* Если привязан к заказу — открываем заказ */
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
      /* Пока только для admin / manager */
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

    /* Контейнер */
    css += ''
      + '.zrz-dash-wrap{padding:0 0 20px}'
      ;

    /* Шапка */
    css += ''
      + '.zrz-dash-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:8px 4px 16px}'
      + '.zrz-dash-head-left{flex:1;min-width:0}'
      + '.zrz-dash-greet{font-size:20px;font-weight:800;letter-spacing:-0.02em;color:var(--text);line-height:1.2}'
      + '.zrz-dash-date{font-size:13px;color:var(--muted);margin-top:4px;font-weight:600}'
      + '.zrz-dash-search{width:44px;height:44px;border-radius:14px;border:none;background:var(--accent-soft);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:transform .12s ease,background .15s ease}'
      + '.zrz-dash-search:active{transform:scale(0.92);background:var(--accent-line)}'
      ;

    /* KPI */
    css += ''
      + '.zrz-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}'
      + '@media (max-width:420px){.zrz-kpi{grid-template-columns:repeat(2,1fr);gap:8px}}'
      + '.zrz-kpi-cell{background:var(--surface);border:1.5px solid var(--line);border-radius:16px;padding:12px 8px;text-align:center;transition:transform .12s ease}'
      + '.zrz-kpi-cell:active{transform:scale(0.97)}'
      + '.zrz-kpi-ico{font-size:18px;line-height:1;margin-bottom:4px;opacity:0.85}'
      + '.zrz-kpi-val{font-size:19px;font-weight:800;letter-spacing:-0.02em;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums}'
      + '.zrz-kpi-lbl{font-size:10.5px;color:var(--muted);margin-top:2px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}'
      ;

    /* Блок «Требует внимания» */
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

    /* Segmented control */
    css += ''
      + '.zrz-seg{display:flex;gap:4px;margin-bottom:14px;padding:4px;background:var(--accent-soft);border-radius:14px}'
      + '.zrz-seg-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 8px;border:none;border-radius:10px;background:transparent;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--text-soft);cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}'
      + '.zrz-seg-btn.active{background:var(--surface);color:var(--accent-deep);box-shadow:0 1px 4px rgba(90,120,170,0.12)}'
      + '.zrz-seg-ico{font-size:15px;line-height:1;opacity:0.9}'
      ;

    /* Компактные строки */
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

    /* Sticky заголовки дат */
    css += ''
      + '.zrz-day-head{position:sticky;top:0;z-index:3;padding:10px 4px 8px;margin-top:8px;font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;background:linear-gradient(180deg,var(--bg-1) 60%,rgba(246,248,252,0.9) 100%)}'
      + 'html[data-theme="dark"] .zrz-day-head{background:linear-gradient(180deg,var(--bg-1) 60%,rgba(20,26,36,0.9) 100%)}'
      + '.zrz-day-head span{display:inline-block;padding:4px 12px;background:var(--surface);border-radius:10px;border:1.5px solid var(--line);color:var(--accent-deep);letter-spacing:0.6px}'
      ;

    /* Пустые состояния */
    css += ''
      + '.zrz-empty{padding:48px 24px;text-align:center;background:linear-gradient(180deg,var(--surface),var(--accent-soft));border-radius:22px;border:1.5px solid var(--accent-line);margin:8px 0}'
      + '.zrz-empty-ico{font-size:52px;line-height:1;margin-bottom:12px;opacity:0.85}'
      + '.zrz-empty-t{font-size:17px;font-weight:800;color:var(--text);margin-bottom:6px}'
      + '.zrz-empty-s{font-size:13px;color:var(--muted);line-height:1.5}'
      ;

    /* Pull-to-refresh */
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

  /* Перерисовка после загрузки — чтобы новый дашборд появился сразу */
  setTimeout(function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(u && (u.role === 'admin' || u.role === 'manager')){
        if(typeof render === 'function') render();
      }
    }catch(e){}
  }, 2200);

  /* Подстраховка */
  var _iv = setInterval(function(){
    try { wrapRenderHome(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[13-dashboard p1] дашборд админа/менеджера активен'); }catch(_){}
})();
