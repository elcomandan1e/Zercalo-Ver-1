/* patches/16-actions.js — карта действий для разделов
   Часть 1: События (долгий тап + свайпы)
*/
(function(){
  if(window._zrz16Actions) return;
  window._zrz16Actions = true;

  /* ---------- Роли ---------- */

  function _role(){
    try {
      if(typeof currentUser !== 'function') return null;
      var u = currentUser();
      return u ? u.role : null;
    } catch(e){ return null; }
  }

  function _isManager(){
    var r = _role();
    return r === 'admin' || r === 'manager';
  }

  function _isExecutor(){
    var r = _role();
    return r === 'admin' || r === 'manager' || r === 'surveyor' || r === 'master';
  }

  /* ---------- Данные события ---------- */

  function _eventById(id){
    try {
      if(typeof eventById === 'function') return eventById(id);
    } catch(e){}
    try {
      if(window.db && Array.isArray(window.db.events)){
        for(var i = 0; i < window.db.events.length; i++){
          if(window.db.events[i].id === id) return window.db.events[i];
        }
      }
    } catch(e){}
    return null;
  }

  function _orderOfEvent(ev){
    if(!ev || !ev.orderId) return null;
    try {
      if(window.db && Array.isArray(window.db.orders)){
        for(var i = 0; i < window.db.orders.length; i++){
          if(window.db.orders[i].id === ev.orderId) return window.db.orders[i];
        }
      }
    } catch(e){}
    return null;
  }

  function _phoneOf(ev){
    var o = _orderOfEvent(ev);
    if(!o) return '';
    try { if(typeof orderClientPhone === 'function') return orderClientPhone(o) || ''; } catch(e){}
    return o.clientPhone || o.phone || '';
  }

  function _addrOf(ev){
    var o = _orderOfEvent(ev);
    if(!o) return '';
    try { if(typeof orderAddressFull === 'function') return orderAddressFull(o) || ''; } catch(e){}
    try { if(typeof orderAddressShort === 'function') return orderAddressShort(o) || ''; } catch(e){}
    return o.address || '';
  }

  /* ---------- Действия ---------- */

  function _openEvent(ev){
    try {
      if(typeof openEventForm === 'function'){ openEventForm(null, ev.id); return; }
    } catch(e){}
    try {
      if(typeof openEventFromCalendar === 'function'){ openEventFromCalendar(ev.id); return; }
    } catch(e){}
  }

  function _callEvent(ev){
    var p = _phoneOf(ev);
    if(!p){ try{ uiAlert('Нет телефона клиента'); }catch(e){} return; }
    location.href = 'tel:' + String(p).replace(/[^+\d]/g,'');
  }

  function _mapEvent(ev){
    var a = _addrOf(ev);
    if(!a){ try{ uiAlert('Нет адреса'); }catch(e){} return; }
    try {
      if(typeof window.zrz13p3OpenMap === 'function'){ window.zrz13p3OpenMap(a); return; }
    } catch(e){}
    try {
      if(typeof openMap === 'function'){ openMap(a); return; }
    } catch(e){}
    location.href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(a);
  }

  function _markDone(ev){
    try {
      ev.status = (ev.status === 'done' ? 'planned' : 'done');
      if(typeof touch === 'function') touch(ev);
      if(typeof save === 'function') save();
      if(typeof render === 'function') render();
      if(navigator.vibrate) try{ navigator.vibrate(14); }catch(e){}
    } catch(e){}
  }

  function _moveEvent(ev){
    try {
      if(typeof openEventForm === 'function'){ openEventForm(null, ev.id); return; }
    } catch(e){}
  }

  function _addNote(ev){
    var cur = ev.note || '';
    var v = window.prompt('Заметка к событию:', cur);
    if(v === null) return;
    try {
      ev.note = String(v);
      if(typeof touch === 'function') touch(ev);
      if(typeof save === 'function') save();
      if(typeof render === 'function') render();
    } catch(e){}
  }

  function _transferEvent(ev){
    try {
      var users = [];
      if(window.db && Array.isArray(window.db.users)){
        users = window.db.users.filter(function(u){ return u.active; });
      }
      if(!users.length) return;
      var msg = 'Кому передать событие?\n\n' + users.map(function(u, i){ return (i+1) + '. ' + u.name; }).join('\n');
      var pick = window.prompt(msg, '1');
      if(!pick) return;
      var idx = parseInt(pick, 10) - 1;
      if(!users[idx]) return;
      ev.assignedUserIds = [users[idx].id];
      if(typeof touch === 'function') touch(ev);
      if(typeof save === 'function') save();
      if(typeof render === 'function') render();
      if(typeof uiAlert === 'function') uiAlert('Передано: ' + users[idx].name);
    } catch(e){}
  }

  function _deleteEvent(ev){
    var ask = window.confirm('Удалить событие?');
    if(!ask) return;
    try {
      if(typeof deleteEvent === 'function'){ deleteEvent(ev.id); return; }
    } catch(e){}
    try {
      var d = window.db;
      d.events = (d.events || []).filter(function(x){ return x.id !== ev.id; });
      if(typeof save === 'function') save();
      if(typeof render === 'function') render();
    } catch(e){}
  }

  /* ---------- Карта действий для события ---------- */

  function _buildMenu(ev){
    var items = [];

    items.push({ ico:'👁', label:'Открыть', act:function(){ _openEvent(ev); } });

    if(_phoneOf(ev)) items.push({ ico:'📞', label:'Позвонить', act:function(){ _callEvent(ev); } });
    if(_addrOf(ev))  items.push({ ico:'🗺', label:'Карта',     act:function(){ _mapEvent(ev); } });

    if(_isExecutor()){
      items.push({ ico:'✓',  label: ev.status === 'done' ? 'Снять отметку' : 'Отметить выполненным', act:function(){ _markDone(ev); } });
      items.push({ ico:'🔄', label:'Перенести',  act:function(){ _moveEvent(ev); } });
      items.push({ ico:'📝', label:'Заметка',    act:function(){ _addNote(ev); } });
    }

    if(_isManager()){
      items.push({ ico:'✏️', label:'Редактировать', act:function(){ _openEvent(ev); } });
      items.push({ ico:'👥', label:'Передать мастеру', act:function(){ _transferEvent(ev); } });
      items.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _deleteEvent(ev); } });
    }

    return items;
  }

  /* ---------- Навешивание жестов ---------- */

  function _attachToRow(row){
    if(!row || row.dataset.zrzActionsAttached) return;
    if(row.dataset.zrzActionsPending) return;
    var oc = row.getAttribute('onclick') || '';
    var m = oc.match(/zrzDashOpenEvent\((\d+)\)/);
    if(!m){
      m = oc.match(/openEventFromCalendar\((\d+)\)/);
    }
    if(!m){
      m = row.getAttribute('data-event-id') ? [null, row.getAttribute('data-event-id')] : null;
    }
    if(!m) return;
    var id = parseInt(m[1], 10);
    var ev = _eventById(id);
    if(!ev) return;
    if(typeof window.zrzAttachActions !== 'function') return;

    row.dataset.zrzActionsPending = '1';

    var menu = _buildMenu(ev);

    var swipeRight = null;
    if(_phoneOf(ev)){
      swipeRight = { ico:'📞', label:'Позвонить', act:function(){ _callEvent(ev); } };
    }
    var swipeLeft = null;
    if(_addrOf(ev)){
      swipeLeft = { ico:'🗺', label:'Карта', act:function(){ _mapEvent(ev); } };
    }

    try {
      window.zrzAttachActions(row, {
        longPress: menu,
        swipeRight: swipeRight,
        swipeLeft: swipeLeft
      });
    } catch(e){
      try { console.warn('[16-actions] attach err', e); }catch(_){}
    }
  }

  function _scanRows(){
    try {
      var rows = document.querySelectorAll('.zrz-row-event');
      for(var i = 0; i < rows.length; i++){
        _attachToRow(rows[i]);
      }
    } catch(e){}
  }

  /* ---------- Наблюдатель ---------- */

  var _scanTimer = null;
  function _scheduleScan(){
    if(_scanTimer) return;
    _scanTimer = setTimeout(function(){
      _scanTimer = null;
      _scanRows();
    }, 250);
  }

  try {
    var obs = new MutationObserver(_scheduleScan);
    obs.observe(document.body, { childList:true, subtree:true });
  } catch(e){}

  /* Периодическая проверка — на случай изменения через innerHTML */
  setInterval(_scanRows, 2500);

  /* Первый запуск */
  _scanRows();
  setTimeout(_scanRows, 800);
  setTimeout(_scanRows, 2000);
  setTimeout(_scanRows, 4000);

  /* Ручной вызов для теста */
  window.zrz16ScanEvents = _scanRows;

  try{ console.log('[16-actions] карта действий для событий активна'); }catch(_){}
})();
