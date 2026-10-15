/* patches/16-actions.js — карта действий v2
   События · Заказы · Клиенты · Позиции · Маршруты · Контрагенты · Уведомления
*/
(function(){
  if(window._zrz16ActionsV2) return;
  window._zrz16ActionsV2 = true;

  /* ============ Утилиты ============ */

  function _role(){
    try { if(typeof currentUser!=='function') return null; var u=currentUser(); return u?u.role:null; }
    catch(e){ return null; }
  }
  function _isManager(){ var r=_role(); return r==='admin'||r==='manager'; }
  function _isExecutor(){ var r=_role(); return r==='admin'||r==='manager'||r==='surveyor'||r==='master'; }
  function _isDriver(){ return _role()==='driver'; }
  function _can(fn){ try { return typeof window[fn]==='function' && window[fn](); } catch(e){ return false; } }

  function _byId(arr, id){
    if(!arr) return null;
    for(var i=0;i<arr.length;i++){ if(arr[i] && arr[i].id === id) return arr[i]; }
    return null;
  }
  function _evById(id){ return _byId(window.db && window.db.events, id); }
  function _orderById(id){ return _byId(window.db && window.db.orders, id); }
  function _clientById(id){ return _byId(window.db && window.db.clients, id); }
  function _itemById(id){ return _byId(window.db && window.db.items, id); }
  function _routeById(id){ return _byId(window.db && window.db.routes, id); }
  function _contractorById(id){ return _byId(window.db && window.db.contractors, id); }
  function _notifById(id){ return _byId(window.db && window.db.notifications, id); }

  function _orderPhone(o){
    if(!o) return '';
    try { if(typeof orderClientPhone==='function') return orderClientPhone(o) || ''; }catch(e){}
    return o.phone || '';
  }
  function _orderAddr(o){
    if(!o) return '';
    try { if(typeof orderAddressFull==='function') return orderAddressFull(o) || ''; }catch(e){}
    try { if(typeof orderAddressShort==='function') return orderAddressShort(o) || ''; }catch(e){}
    return o.address || '';
  }
  function _clientName(c){
    if(!c) return '';
    try { if(typeof clientFullName==='function') return clientFullName(c) || ''; }catch(e){}
    return ((c.lastName||'')+' '+(c.firstName||'')+' '+(c.middleName||'')).trim();
  }
  function _clientPhone(c){
    if(!c) return '';
    return c.phone || c.phoneExtra || '';
  }
  function _clientAddr(c){
    if(!c) return '';
    try {
      var addrs = addressesOfClient(c.id);
      if(addrs && addrs.length){
        var a = addrs[0];
        return (typeof addressFull==='function' ? addressFull(a) : '') || (typeof addressShort==='function' ? addressShort(a) : '') || '';
      }
    } catch(e){}
    return '';
  }

  function _buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||14); }catch(e){} }
  function _rerender(){ try{ if(typeof render==='function') render(); }catch(e){} }
  function _alert(m){ try{ if(typeof uiAlert==='function') uiAlert(m); }catch(e){ alert(m); } }

  function _call(phone){
    if(!phone){ _alert('Нет телефона'); return; }
    location.href = 'tel:' + String(phone).replace(/[^+\d]/g,'');
  }

  function _whatsapp(phone, text){
    if(!phone){ _alert('Нет телефона'); return; }
    var p = String(phone).replace(/\D/g,'');
    if(p.charAt(0)==='8') p = '7' + p.slice(1);
    if(p.charAt(0)!=='7') p = '7' + p;
    var url = 'https://wa.me/' + p + (text ? '?text=' + encodeURIComponent(text) : '');
    window.open(url, '_blank');
  }

  function _map(addr){
    if(!addr){ _alert('Нет адреса'); return; }
    try { if(typeof window.zrz13p3OpenMap==='function'){ window.zrz13p3OpenMap(addr); return; } }catch(e){}
    try { if(typeof openMap==='function'){ openMap(addr); return; } }catch(e){}
    location.href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(addr);
  }

  function _attach(el, opts, marker){
    if(!el || el.dataset[marker]==='1') return;
    if(typeof window.zrzAttachActions !== 'function') return;
    try {
      window.zrzAttachActions(el, opts);
      el.dataset[marker] = '1';
    } catch(e){
      try{ console.warn('[16-actions] attach', marker, e); }catch(_){}
    }
  }

  /* ============ 1. СОБЫТИЯ ============ */

  function _openEvent(ev){
    try { if(typeof openEventForm==='function'){ openEventForm(null, ev.id); return; } }catch(e){}
    try { if(typeof openEventFromCalendar==='function'){ openEventFromCalendar(ev.id); return; } }catch(e){}
  }
  function _markEventDone(ev){
    ev.status = (ev.status==='done'?'planned':'done');
    try{ if(typeof touch==='function') touch(ev); }catch(e){}
    try{ if(typeof save==='function') save(); }catch(e){}
    _buzz(14); _rerender();
  }
  function _eventNote(ev){
    var v = window.prompt('Заметка к событию:', ev.note || '');
    if(v===null) return;
    ev.note = String(v);
    try{ if(typeof touch==='function') touch(ev); }catch(e){}
    try{ if(typeof save==='function') save(); }catch(e){}
    _rerender();
  }
  function _eventTransfer(ev){
    var users = (window.db && window.db.users || []).filter(function(u){ return u.active; });
    if(!users.length) return;
    var msg = 'Кому передать?\n\n' + users.map(function(u,i){ return (i+1)+'. '+u.name; }).join('\n');
    var pick = window.prompt(msg, '1');
    if(!pick) return;
    var idx = parseInt(pick,10) - 1;
    if(!users[idx]) return;
    ev.assignedUserIds = [users[idx].id];
    try{ if(typeof touch==='function') touch(ev); }catch(e){}
    try{ if(typeof save==='function') save(); }catch(e){}
    _rerender();
  }
  function _eventDelete(ev){
    if(!window.confirm('Удалить событие?')) return;
    try { if(typeof deleteEvent==='function'){ deleteEvent(ev.id); return; } }catch(e){}
    try {
      window.db.events = (window.db.events||[]).filter(function(x){ return x.id !== ev.id; });
      if(typeof save==='function') save();
      _rerender();
    }catch(e){}
  }

  function _eventMenu(ev){
    var m = [{ ico:'👁', label:'Открыть', act:function(){ _openEvent(ev); } }];
    var ph = _orderPhone(_orderById(ev.orderId));
    var ad = _orderAddr(_orderById(ev.orderId));
    if(ph) m.push({ ico:'📞', label:'Позвонить', act:function(){ _call(ph); } });
    if(ph) m.push({ ico:'💬', label:'WhatsApp', act:function(){ _whatsapp(ph); } });
    if(ad) m.push({ ico:'🗺', label:'Карта', act:function(){ _map(ad); } });
    if(_isExecutor()){
      m.push({ ico:'✓', label: ev.status==='done'?'Снять отметку':'Отметить выполненным', act:function(){ _markEventDone(ev); } });
      m.push({ ico:'📝', label:'Заметка', act:function(){ _eventNote(ev); } });
    }
    if(_isManager()){
      m.push({ ico:'👥', label:'Передать мастеру', act:function(){ _eventTransfer(ev); } });
      m.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _eventDelete(ev); } });
    }
    return m;
  }

  function _scanEvents(){
    var rows = document.querySelectorAll('.zrz-row-event');
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      var oc = r.getAttribute('onclick') || '';
      var mm = oc.match(/zrzDashOpenEvent\((\d+)\)/) || oc.match(/openEventFromCalendar\((\d+)\)/);
      if(!mm) continue;
      var ev = _evById(parseInt(mm[1],10));
      if(!ev) continue;
      var ph = _orderPhone(_orderById(ev.orderId));
      var ad = _orderAddr(_orderById(ev.orderId));
      var opts = { longPress: _eventMenu(ev) };
      if(ph) opts.swipeRight = { ico:'📞', label:'Позвонить', act:function(){ _call(ph); } };
      if(ad) opts.swipeLeft  = { ico:'🗺', label:'Карта',     act:function(){ _map(ad); } };
      _attach(r, opts, 'zrzEvAct');
    }
  }

  /* ============ 2. ЗАКАЗЫ ============ */

  function _printOrder(o){
    if(!o) return;
    try {
      var items = (typeof itemsOf==='function') ? itemsOf(o.id) : [];
      var model = (typeof buildReceiptModel==='function') ? buildReceiptModel(o, items) : null;
      if(!model) return;
      var html = (typeof receiptToHTML==='function') ? receiptToHTML(model) : '';
      var w = window.open('', '_blank');
      if(!w){ _alert('Разрешите всплывающие окна'); return; }
      w.document.open(); w.document.write(html); w.document.close();
    }catch(e){ _alert('Ошибка: '+((e&&e.message)||e)); }
  }

  function _shareOrder(o){
    if(!o) return;
    try {
      var items = (typeof itemsOf==='function') ? itemsOf(o.id) : [];
      var model = (typeof buildReceiptModel==='function') ? buildReceiptModel(o, items) : null;
      if(!model) return;
      var text = (typeof receiptToText==='function') ? receiptToText(model) : '';
      if(navigator.share){
        navigator.share({ title:'Зерцало — заказ № '+(o.orderNum||''), text: text }).catch(function(){});
      } else if(navigator.clipboard && text){
        navigator.clipboard.writeText(text).then(function(){ _alert('Текст скопирован'); });
      }
    }catch(e){}
  }

  function _orderDelete(o){
    if(!window.confirm('Удалить заказ № '+(o.orderNum||'—')+'?')) return;
    try { if(typeof deleteOrder==='function'){ deleteOrder(o.id); return; } }catch(e){}
  }

  function _orderEvent(o){
    try { if(typeof openEventForm==='function'){ openEventForm(null, null, o.id); return; } }catch(e){}
  }

  function _orderEdit(o){
    try { if(typeof openEditOrder==='function'){ openEditOrder(o.id); return; } }catch(e){}
  }

  function _orderOpen(o){
    try { if(typeof openOrder==='function') openOrder(o.id); }catch(e){}
  }

  function _orderMenu(o){
    var m = [{ ico:'👁', label:'Открыть', act:function(){ _orderOpen(o); } }];
    var ph = _orderPhone(o);
    var ad = _orderAddr(o);
    if(ph) m.push({ ico:'📞', label:'Позвонить', act:function(){ _call(ph); } });
    if(ph) m.push({ ico:'💬', label:'WhatsApp', act:function(){ _whatsapp(ph); } });
    if(ad) m.push({ ico:'🗺', label:'Карта', act:function(){ _map(ad); } });
    if(_isManager()){
      m.push({ ico:'✏️', label:'Редактировать', act:function(){ _orderEdit(o); } });
      m.push({ ico:'📅', label:'Событие по заказу', act:function(){ _orderEvent(o); } });
    }
    m.push({ ico:'📤', label:'Отправить бланк', act:function(){ _shareOrder(o); } });
    m.push({ ico:'🖨', label:'Бланк / PDF', act:function(){ _printOrder(o); } });
    if(_isManager()){
      m.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _orderDelete(o); } });
    }
    return m;
  }

  function _scanOrders(){
    var rows = document.querySelectorAll('.zrz-row-order');
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      var oc = r.getAttribute('onclick') || '';
      var mm = oc.match(/zrzDashOpenOrder\((\d+)\)/);
      if(!mm) continue;
      var o = _orderById(parseInt(mm[1],10));
      if(!o) continue;
      var ph = _orderPhone(o);
      var opts = { longPress: _orderMenu(o) };
      if(ph) opts.swipeRight = { ico:'📞', label:'Позвонить', act:function(){ _call(ph); } };
      opts.swipeLeft = { ico:'📤', label:'Бланк', act:function(){ _shareOrder(o); } };
      _attach(r, opts, 'zrzOrdAct');
    }
  }

  /* ============ 3. КЛИЕНТЫ ============ */

  function _clientOpen(c){
    try { if(typeof openClient==='function') openClient(c.id); }catch(e){}
  }
  function _clientEdit(c){
    try { if(typeof openClientForm==='function') openClientForm(c.id); }catch(e){}
  }
  function _clientArchive(c){
    try { if(typeof archiveClient==='function') archiveClient(c.id); }catch(e){}
  }
  function _clientDelete(c){
    try { if(typeof deleteClient==='function') deleteClient(c.id); }catch(e){}
  }
  function _clientNewOrder(c){
    try { if(typeof openNewOrder==='function') openNewOrder(c.id); }catch(e){}
  }

  function _clientMenu(c){
    var m = [{ ico:'👁', label:'Открыть', act:function(){ _clientOpen(c); } }];
    var ph = _clientPhone(c);
    if(ph) m.push({ ico:'📞', label:'Позвонить', act:function(){ _call(ph); } });
    if(ph) m.push({ ico:'💬', label:'WhatsApp', act:function(){ _whatsapp(ph); } });
    var ad = _clientAddr(c);
    if(ad) m.push({ ico:'🗺', label:'Карта', act:function(){ _map(ad); } });
    m.push({ ico:'➕', label:'Заказ для клиента', act:function(){ _clientNewOrder(c); } });
    if(_isManager()){
      m.push({ ico:'✏️', label:'Редактировать', act:function(){ _clientEdit(c); } });
      m.push({ ico:'📦', label:'В архив', act:function(){ _clientArchive(c); } });
      m.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _clientDelete(c); } });
    }
    return m;
  }

  function _scanClients(){
    var cards = document.querySelectorAll('.card[onclick*="openClient("]');
    for(var i=0;i<cards.length;i++){
      var r = cards[i];
      var oc = r.getAttribute('onclick') || '';
      var mm = oc.match(/openClient\((\d+)\)/);
      if(!mm) continue;
      var c = _clientById(parseInt(mm[1],10));
      if(!c) continue;
      var ph = _clientPhone(c);
      var ad = _clientAddr(c);
      var opts = { longPress: _clientMenu(c) };
      if(ph) opts.swipeRight = { ico:'📞', label:'Позвонить', act:function(){ _call(ph); } };
      if(ad) opts.swipeLeft  = { ico:'🗺', label:'Карта',     act:function(){ _map(ad); } };
      _attach(r, opts, 'zrzClAct');
    }
  }

  /* ============ 4. ПОЗИЦИИ (в карточке заказа) ============ */

  function _itemOpen(it){ try{ if(typeof openItem==='function') openItem(it.id); }catch(e){} }
  function _itemCopy(it){ try{ if(typeof duplicateItem==='function') duplicateItem(it.id); }catch(e){} }
  function _itemDraw(it){ try{ if(typeof openTechDraw==='function') openTechDraw(it.id); }catch(e){} }
  function _itemDelete(it){
    if(!window.confirm('Удалить позицию?')) return;
    try { if(typeof deleteItem==='function') deleteItem(it.id); }catch(e){}
  }

  function _itemMenu(it){
    return [
      { ico:'👁', label:'Открыть', act:function(){ _itemOpen(it); } },
      { ico:'📋', label:'Копия',   act:function(){ _itemCopy(it); } },
      { ico:'🖨', label:'Чертёж A4', act:function(){ _itemDraw(it); } },
      { ico:'🗑', label:'Удалить', danger:true, act:function(){ _itemDelete(it); } }
    ];
  }

  function _scanItems(){
    var cards = document.querySelectorAll('.card');
    for(var i=0;i<cards.length;i++){
      var card = cards[i];
      var info = card.querySelector('.info[onclick*="openItem("]');
      if(!info) continue;
      var oc = info.getAttribute('onclick') || '';
      var mm = oc.match(/openItem\((\d+)\)/);
      if(!mm) continue;
      var it = _itemById(parseInt(mm[1],10));
      if(!it) continue;
      /* Навешиваем на карточку, но без свайпов (там фото-скролл) */
      _attach(card, { longPress: _itemMenu(it) }, 'zrzItAct');
    }
  }

  /* ============ 5. МАРШРУТЫ ============ */

  function _routeOpen(r){ try{ if(typeof openRoute==='function') openRoute(r.id); }catch(e){} }
  function _routeSheet(r){ try{ if(typeof openRouteSheetPrint==='function') openRouteSheetPrint(r.id); }catch(e){} }
  function _routeMap(r){ try{ if(typeof openRouteMap==='function') openRouteMap(r.id); }catch(e){} }
  function _routeEdit(r){ try{ if(typeof openRouteForm==='function') openRouteForm(r.id); }catch(e){} }
  function _routeDelete(r){
    if(!window.confirm('Удалить маршрут?')) return;
    try { if(typeof deleteRoute==='function') deleteRoute(r.id); }catch(e){}
  }

  function _routeMenu(r){
    var m = [
      { ico:'👁', label:'Открыть', act:function(){ _routeOpen(r); } },
      { ico:'🖨', label:'Маршрутный лист A4', act:function(){ _routeSheet(r); } }
    ];
    if((r.points||[]).length) m.push({ ico:'🗺', label:'Все адреса', act:function(){ _routeMap(r); } });
    if(_isManager()){
      m.push({ ico:'✏️', label:'Редактировать', act:function(){ _routeEdit(r); } });
      m.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _routeDelete(r); } });
    }
    return m;
  }

  function _scanRoutes(){
    var cards = document.querySelectorAll('.route-card[onclick*="openRoute("]');
    for(var i=0;i<cards.length;i++){
      var r = cards[i];
      var oc = r.getAttribute('onclick') || '';
      var mm = oc.match(/openRoute\((\d+)\)/);
      if(!mm) continue;
      var route = _routeById(parseInt(mm[1],10));
      if(!route) continue;
      _attach(r, { longPress: _routeMenu(route) }, 'zrzRtAct');
    }
  }

  /* ============ 6. КОНТРАГЕНТЫ ============ */

  function _coOpen(c){ try{ if(typeof openContractorForm==='function') openContractorForm(c.id); }catch(e){} }
  function _coArchive(c){
    try { if(typeof archiveContractor==='function') archiveContractor(c.id); }catch(e){}
  }
  function _coDelete(c){
    if(!window.confirm('Удалить контрагента?')) return;
    try { if(typeof deleteContractor==='function') deleteContractor(c.id); }catch(e){}
  }
  function _coAddToRoute(c){
    try {
      if(typeof addRoutePointContractor==='function'){ addRoutePointContractor(c.id); return; }
    }catch(e){}
    _alert('Добавление в маршрут — вручную через маршрут');
  }

  function _coMenu(c){
    var m = [{ ico:'👁', label:'Открыть', act:function(){ _coOpen(c); } }];
    if(c.phone) m.push({ ico:'📞', label:'Позвонить', act:function(){ _call(c.phone); } });
    if(c.phone) m.push({ ico:'💬', label:'WhatsApp', act:function(){ _whatsapp(c.phone); } });
    var ad = '';
    try {
      if(c.addressId){ var a = _byId(window.db.addresses, c.addressId); if(a) ad = (typeof addressFull==='function'?addressFull(a):'')||''; }
    }catch(e){}
    if(ad) m.push({ ico:'🗺', label:'Карта', act:function(){ _map(ad); } });
    if(_isManager()){
      m.push({ ico:'✏️', label:'Редактировать', act:function(){ _coOpen(c); } });
      m.push({ ico:'📦', label:'В архив', act:function(){ _coArchive(c); } });
      m.push({ ico:'🗑', label:'Удалить', danger:true, act:function(){ _coDelete(c); } });
    }
    return m;
  }

  function _scanContractors(){
    var cards = document.querySelectorAll('.contractor-card[onclick*="openContractorForm("]');
    for(var i=0;i<cards.length;i++){
      var r = cards[i];
      var oc = r.getAttribute('onclick') || '';
      var mm = oc.match(/openContractorForm\((\d+)\)/);
      if(!mm) continue;
      var c = _contractorById(parseInt(mm[1],10));
      if(!c) continue;
      _attach(r, { longPress: _coMenu(c) }, 'zrzCoAct');
    }
  }

  /* ============ 7. УВЕДОМЛЕНИЯ (только свайпы) ============ */

  function _notifRead(n){
    try { if(typeof markNotificationRead==='function') markNotificationRead(n.id); }catch(e){}
    try { if(typeof updateNotifBadge==='function') updateNotifBadge(); }catch(e){}
    _rerender();
  }
  function _notifDelete(n){
    try { if(typeof deleteNotification==='function') deleteNotification(n.id); }catch(e){}
    try { if(typeof updateNotifBadge==='function') updateNotifBadge(); }catch(e){}
    _rerender();
  }

  function _scanNotifs(){
    var items = document.querySelectorAll('.notif-item[onclick*="onNotifClick("]');
    for(var i=0;i<items.length;i++){
      var el = items[i];
      var oc = el.getAttribute('onclick') || '';
      var mm = oc.match(/onNotifClick\((\d+)\)/);
      if(!mm) continue;
      var n = _notifById(parseInt(mm[1],10));
      if(!n) continue;
      _attach(el, {
        swipeRight: { ico:'✓', label:'Прочитано', act:function(){ _notifRead(n); } },
        swipeLeft:  { ico:'🗑', label:'Удалить',  act:function(){ _notifDelete(n); } }
      }, 'zrzNfAct');
    }
  }

  /* ============ Сканер ============ */

  function _scanAll(){
    try { _scanEvents(); }catch(e){}
    try { _scanOrders(); }catch(e){}
    try { _scanClients(); }catch(e){}
    try { _scanItems(); }catch(e){}
    try { _scanRoutes(); }catch(e){}
    try { _scanContractors(); }catch(e){}
    try { _scanNotifs(); }catch(e){}
  }

  var _t = null;
  function _schedule(){
    if(_t) return;
    _t = setTimeout(function(){ _t = null; _scanAll(); }, 300);
  }

  try {
    var obs = new MutationObserver(_schedule);
    obs.observe(document.body, { childList:true, subtree:true });
  } catch(e){}

  setInterval(_scanAll, 2500);
  _scanAll();
  setTimeout(_scanAll, 800);
  setTimeout(_scanAll, 2000);
  setTimeout(_scanAll, 4000);

  window.zrz16Scan = _scanAll;

  try{ console.log('[16-actions v2] карта действий по всем разделам активна'); }catch(_){}
})();
