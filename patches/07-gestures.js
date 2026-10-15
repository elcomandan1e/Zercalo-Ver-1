/* ============ ZERZALO · RADIAL FAB · 07-gestures part2 v3 ============ */
(function () {
  'use strict';
  if (window._zrzFabLoadedV3) return;
  window._zrzFabLoadedV3 = true;

  var oldRoot = document.getElementById('zrz-fab-root');
  if (oldRoot && oldRoot.parentNode) oldRoot.parentNode.removeChild(oldRoot);

  var DIST = window.innerWidth < 360 ? 88 : 105;

  var ICONS = {
    event:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="14" rx="2.5"/><path d="M8 3v5M16 3v5M4 11h16"/></svg>',
    order:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    client:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2"/></svg>',
    route:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 18-9-5-9 5z"/></svg>',
    measure:   '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v3M10 8v3M14 8v3M18 8v3"/></svg>',
    note:      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M14 6l4 4"/></svg>',
    events:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
    call:      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
    navigator: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 6.5L7 17l2.5-6.5z"/></svg>',
    pin:       '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    phone:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/></svg>'
  };

  var ACTIONS_BY_ROLE = {
    admin:    [ {id:'event',    label:'Новое событие', color:'#FF9500', angle:-60},
                {id:'order',    label:'Новый заказ',  color:'#4A90E2', angle:-20},
                {id:'client',   label:'Новый клиент', color:'#34C759', angle: 20},
                {id:'route',    label:'Маршрут дня',  color:'#AF52DE', angle: 60} ],
    manager:  [ {id:'event',    label:'Новое событие', color:'#FF9500', angle:-60},
                {id:'order',    label:'Новый заказ',  color:'#4A90E2', angle:-20},
                {id:'client',   label:'Новый клиент', color:'#34C759', angle: 20},
                {id:'route',    label:'Маршрут дня',  color:'#AF52DE', angle: 60} ],
    surveyor: [ {id:'measure',  label:'Новый замер',  color:'#FF9500', angle:-60},
                {id:'route',    label:'Маршрут дня',  color:'#AF52DE', angle:-20},
                {id:'client',   label:'Новый клиент', color:'#34C759', angle: 20},
                {id:'note',     label:'Заметка',      color:'#4A90E2', angle: 60} ],
    driver:   [ {id:'route',     label:'Маршрут',   color:'#AF52DE', angle:-60},
                {id:'events',    label:'События',   color:'#FF9500', angle:-20},
                {id:'call',      label:'Позвонить', color:'#34C759', angle: 20},
                {id:'navigator', label:'Навигатор', color:'#4A90E2', angle: 60} ],
    master:   []
  };

  function getRole() {
    try {
      if (typeof currentUser !== 'function') return null;
      var u = currentUser();
      return u ? u.role : null;
    } catch (e) { return null; }
  }
  function gesturesDisabled() {
    try {
      if (localStorage.getItem('zrz_gestures_disabled') === '1') return true;
      var p = JSON.parse(localStorage.getItem('zrz_user_prefs') || '{}');
      if (p && p.gestures === false) return true;
    } catch (e) {}
    return false;
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  function onHome() {
    var h = (location.hash || '').replace(/^#/, '').trim();
    return h === '';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function getTodayEvents() {
    var today = todayKey();
    var list = [];
    try {
      if (typeof eventsByDate === 'function') {
        var r = eventsByDate(today);
        if (Array.isArray(r) && r.length) return r;
      }
    } catch (e) {}
    try {
      if (typeof visibleEvents === 'function') {
        var all = visibleEvents();
        if (Array.isArray(all)) {
          list = all.filter(function (ev) {
            var d = (ev && (ev.date || ev.when || ev.datetime)) || '';
            return String(d).slice(0, 10) === today;
          });
        }
      }
    } catch (e) {}
    return list;
  }
  function getOrderById(id) {
    try {
      if (typeof visibleOrders !== 'function') return null;
      var list = visibleOrders();
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    } catch (e) {}
    return null;
  }
  function clientPhoneOf(order) {
    if (!order) return '';
    try { if (typeof orderClientPhone === 'function') return orderClientPhone(order) || ''; } catch (e) {}
    return order.clientPhone || order.phone || '';
  }
  function clientNameOf(order) {
    if (!order) return 'Событие';
    try { if (typeof orderClientName === 'function') return orderClientName(order) || 'Клиент'; } catch (e) {}
    return order.clientName || 'Клиент';
  }
  function clientAddrOf(order) {
    if (!order) return '';
    try { if (typeof orderAddressFull === 'function') return orderAddressFull(order) || ''; } catch (e) {}
    return order.address || '';
  }

  function pickEventTypeInModal(label) {
    var done = false;
    [300, 600, 1000, 1400].forEach(function (delay) {
      setTimeout(function () {
        if (done) return;
        var modals = document.querySelectorAll('.modal, .modal-bg');
        if (!modals.length) return;
        var last = modals[modals.length - 1];
        var chips = last.querySelectorAll('button, .chip, [class*="chip"], [role="button"], label');
        for (var i = 0; i < chips.length; i++) {
          var raw = (chips[i].textContent || '').replace(/\s+/g, ' ').trim();
          var clean = raw.replace(/[^\u0400-\u04FFa-zA-Z0-9 ]+/g, '').trim();
          if (clean === label) {
            chips[i].click();
            done = true;
            console.info('[zrzFab] preselect type:', label);
            return;
          }
        }
      }, delay);
    });
  }

  var st = document.createElement('style');
  st.setAttribute('data-zrz', 'fab');
  st.textContent = [
    '#zrz-fab-root{position:fixed;inset:0;pointer-events:none;z-index:9000;font-family:Onest,system-ui,-apple-system,sans-serif;opacity:0;transition:opacity .25s ease}',
    '#zrz-fab-root.zrz-fab-visible{opacity:1}',
    '#zrz-fab-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0);backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0);transition:background .25s ease,backdrop-filter .25s ease;pointer-events:none}',
    '#zrz-fab-root.open #zrz-fab-backdrop{background:rgba(0,0,0,.32);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:auto}',
    '#zrz-fab-main{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:62px;height:62px;border-radius:50%;border:none;padding:0;background:linear-gradient(135deg,#4A90E2 0%,#2D6FD1 100%);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(45,111,209,.42),0 2px 6px rgba(0,0,0,.18);pointer-events:auto;cursor:pointer;transition:transform .3s cubic-bezier(.34,1.56,.64,1);-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none}',
    '#zrz-fab-main svg{display:block;pointer-events:none;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}',
    '#zrz-fab-root.open #zrz-fab-main svg{transform:rotate(135deg)}',
    '.zrz-fab-action{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:50%;border:none;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.22);cursor:pointer;pointer-events:none;opacity:0;transform:translate(-50%,0) scale(.3);transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .2s ease,box-shadow .2s;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.zrz-fab-action svg{display:block;pointer-events:none}',
    '.zrz-fab-lbl{position:absolute;left:50%;top:-28px;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#fff;background:rgba(0,0,0,.75);padding:3px 8px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none}',
    '.zrz-fab-action.zrz-fab-preview .zrz-fab-lbl{opacity:1}',
    '.zrz-fab-action.zrz-fab-preview{box-shadow:0 0 0 4px rgba(255,255,255,.6),0 12px 26px rgba(0,0,0,.3)}',
    '.zrz-picker-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99995;display:flex;align-items:flex-end;animation:zrzFadeIn .2s ease;font-family:Onest,system-ui,sans-serif}',
    '.zrz-picker{background:#fff;width:100%;max-height:72vh;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,0);box-shadow:0 -8px 24px rgba(0,0,0,.2);animation:zrzSlideUp .28s cubic-bezier(.34,1.56,.64,1);overflow:auto}',
    '.zrz-picker::before{content:"";display:block;width:40px;height:4px;background:#ddd;border-radius:2px;margin:10px auto 4px}',
    '.zrz-picker-h{font-weight:700;font-size:15px;padding:6px 18px 12px;color:#111;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:1}',
    '.zrz-picker-item{display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;border-bottom:1px solid #f6f6f6;transition:background .15s}',
    '.zrz-picker-item:active{background:#eef3ff}',
    '.zrz-pk-ico{width:38px;height:38px;border-radius:12px;background:#eef3ff;color:#2D6FD1;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.zrz-pk-body{flex:1;min-width:0}',
    '.zrz-pk-lbl{font-weight:600;font-size:14px;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.zrz-pk-sub{font-size:12px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.zrz-picker-empty{padding:36px 18px;text-align:center;color:#999;font-size:14px}',
    '@keyframes zrzFadeIn{from{opacity:0}to{opacity:1}}',
    '@keyframes zrzSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
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

  var currentActions = [];
  var actionEls = [];
  var isOpen = false, swipeMode = false, pointerId = null, pointerStart = null, previewIdx = -1, moved = false;

  function buildActions() {
    var role = getRole();
    currentActions = (role && ACTIONS_BY_ROLE[role]) ? ACTIONS_BY_ROLE[role].slice() : [];
    var wrap = root.querySelector('#zrz-fab-actions');
    wrap.innerHTML = '';
    actionEls = [];
    currentActions.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zrz-fab-action';
      b.dataset.id = a.id;
      b.style.background = a.color;
      b.innerHTML = (ICONS[a.id] || '') + '<span class="zrz-fab-lbl">' + a.label + '</span>';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = b.dataset.id;
        close();
        setTimeout(function () { runAction(id); }, 60);
      });
      wrap.appendChild(b);
      actionEls.push(b);
    });
  }

  function positions(open) {
    actionEls.forEach(function (el, i) {
      var a = currentActions[i];
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

  function open()  { if (isOpen || !currentActions.length) return; isOpen = true; root.classList.add('open'); positions(true); buzz(10); }
  function close() { if (!isOpen && !swipeMode) return; isOpen = false; swipeMode = false; previewIdx = -1; root.classList.remove('open'); positions(false); actionEls.forEach(function (el) { el.classList.remove('zrz-fab-preview'); }); }
  function toggle() { isOpen ? close() : open(); }

  function nearestAction(dx, dy) {
    var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    var best = 0, bestDiff = 1e9;
    currentActions.forEach(function (a, i) {
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

  function openPicker(opts) {
    var bg = document.createElement('div');
    bg.className = 'zrz-picker-bg';
    var html = '<div class="zrz-picker"><div class="zrz-picker-h">' + escapeHtml(opts.title) + '</div>';
    if (!opts.items.length) {
      html += '<div class="zrz-picker-empty">' + escapeHtml(opts.empty || 'Ничего нет') + '</div>';
    } else {
      opts.items.forEach(function (it, i) {
        html += '<div class="zrz-picker-item" data-i="' + i + '">' +
          (it.ico ? '<div class="zrz-pk-ico">' + it.ico + '</div>' : '') +
          '<div class="zrz-pk-body"><div class="zrz-pk-lbl">' + escapeHtml(it.label) + '</div>' +
          (it.sub ? '<div class="zrz-pk-sub">' + escapeHtml(it.sub) + '</div>' : '') +
          '</div></div>';
      });
    }
    html += '</div>';
    bg.innerHTML = html;
    document.body.appendChild(bg);

    function done() { try { bg.remove(); } catch (e) {} document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') done(); }
    bg.addEventListener('click', function (e) {
      if (e.target === bg) { done(); return; }
      var it = e.target.closest('.zrz-picker-item');
      if (!it) return;
      var idx = parseInt(it.getAttribute('data-i'), 10);
      var item = opts.items[idx];
      if (item && typeof item.action === 'function') {
        done();
        setTimeout(function () { try { item.action(); } catch (err) { console.warn('[zrzFab picker]', err); } }, 60);
      }
    });
    document.addEventListener('keydown', onKey);
  }

  function openCallPicker() {
    var events = getTodayEvents();
    var items = [];
    events.forEach(function (ev) {
      var order = ev.orderId ? getOrderById(ev.orderId) : null;
      var phone = clientPhoneOf(order) || ev.phone || '';
      if (!phone) return;
      var name = clientNameOf(order);
      var t = ev.time || '';
      items.push({
        ico: ICONS.phone,
        label: name,
        sub: t ? (t + ' · ' + phone) : phone,
        action: (function (p) { return function () { location.href = 'tel:' + p; }; })(phone)
      });
    });
    openPicker({ title: 'Позвонить', items: items, empty: 'На сегодня нет событий с телефоном' });
  }

  function openNavPicker() {
    var events = getTodayEvents();
    var items = [];
    events.forEach(function (ev) {
      var order = ev.orderId ? getOrderById(ev.orderId) : null;
      var addr = clientAddrOf(order) || ev.address || '';
      if (!addr) return;
      var name = clientNameOf(order);
      var t = ev.time || '';
      items.push({
        ico: ICONS.pin,
        label: name,
        sub: t ? (t + ' · ' + addr) : addr,
        action: (function (evLocal, addrLocal) {
          return function () {
            try { if (typeof evOpenYandex === 'function') { evOpenYandex(evLocal); return; } } catch (e) {}
            try { if (typeof openMap === 'function') { openMap(addrLocal); return; } } catch (e) {}
            location.href = 'https://yandex.ru/maps/?rtext=~' + encodeURIComponent(addrLocal);
          };
        })(ev, addr)
      });
    });
    openPicker({ title: 'Куда едем', items: items, empty: 'На сегодня нет событий с адресом' });
  }

  function runAction(id) {
    buzz(18);
    var role = getRole();
    try { document.dispatchEvent(new CustomEvent('zrz:fab-action', { detail: { id: id, role: role } })); } catch (e) {}

    var handlers = {
      event: function () { if (typeof openEventForm === 'function') openEventForm(null, null); },
      order: function () { if (typeof openNewOrder === 'function') openNewOrder(); },
      client: function () {
        if (typeof openClientForm === 'function') { openClientForm(); return; }
        if (typeof openClient === 'function') openClient();
      },
      route: function () { if (typeof openRoute === 'function') openRoute(); },
      measure: function () {
        if (typeof openEventForm === 'function') {
          openEventForm(null, null);
          pickEventTypeInModal('Замер');
        }
      },
      note: function () {
        if (typeof openEventForm === 'function') {
          openEventForm(null, null);
          pickEventTypeInModal('Встреча');
        }
      },
      events: function () {
        if (typeof openDayModal === 'function') {
          try { openDayModal(new Date()); return; } catch (e) {}
          try { openDayModal(); return; } catch (e) {}
        }
        if (typeof openRoute === 'function') openRoute();
      },
      call: function () { openCallPicker(); },
      navigator: function () { openNavPicker(); }
    };

    var f = handlers[id];
    if (f) { try { f(); return; } catch (e) { console.warn('[zrzFab] run error', id, e); } }
    console.info('[zrzFab] action', id, 'role', role, '— handler not found');
  }

  function updateVisibility() {
    var role = getRole();
    if (!role || !ACTIONS_BY_ROLE[role] || !ACTIONS_BY_ROLE[role].length) {
      root.classList.remove('zrz-fab-visible');
      close();
      return;
    }
    if (onHome()) {
      root.classList.add('zrz-fab-visible');
      buildActions();
    } else {
      root.classList.remove('zrz-fab-visible');
      close();
    }
  }

  function bindMain() {
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
      if (swipeMode) { e.preventDefault(); previewAt(nearestAction(dx, dy)); }
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
          var id = currentActions[idx].id;
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
    backdrop.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
    window.addEventListener('scroll', function () { if (isOpen) close(); }, { passive: true });
  }

  function mount() {
    if (!document.body) { setTimeout(mount, 60); return; }
    if (!document.getElementById('zrz-fab-root')) document.body.appendChild(root);
    bindMain();
    updateVisibility();
    window.addEventListener('hashchange', updateVisibility);
    document.addEventListener('visibilitychange', updateVisibility);
    setInterval(function () {
      if (!onHome() && root.classList.contains('zrz-fab-visible')) updateVisibility();
      else if (onHome() && !root.classList.contains('zrz-fab-visible')) updateVisibility();
    }, 1200);
  }
  mount();

  window.zrzFab = {
    open: open,
    close: close,
    toggle: toggle,
    refresh: updateVisibility,
    getRole: getRole
  };
})();
/* ============ ZERZALO · GESTURE TESTER (debug only) ============ */
/* ============ ZERZALO · GESTURE TESTER (debug only) ============ */
(function () {
  'use strict';
  if (window._zrzGestureTester) return;
  if (location.search.indexOf('debug=1') === -1) return;
  window._zrzGestureTester = true;

  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function toast(msg, color) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;top:80px;transform:translateX(-50%);' +
      'background:' + (color || '#4A90E2') + ';color:#fff;padding:12px 20px;' +
      'border-radius:14px;font-weight:800;font-size:14px;z-index:99999;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:Onest,sans-serif;';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 1200);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 1600);
  }

  function buildScreen() {
    var old = document.getElementById('zrz_gt_screen');
    if (old) { old.remove(); return; }

    var screen = document.createElement('div');
    screen.id = 'zrz_gt_screen';
    screen.style.cssText = 'position:fixed;inset:0;background:#f4f6fa;z-index:99990;' +
      'overflow:auto;padding:16px;font-family:Onest,sans-serif;-webkit-overflow-scrolling:touch;';

    var html = '';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">';
    html +=   '<button id="zrz_gt_close" style="width:42px;height:42px;border-radius:12px;border:none;background:#fff;font-size:20px;box-shadow:0 2px 6px rgba(0,0,0,.08)">←</button>';
    html +=   '<div style="flex:1"><div style="font-size:20px;font-weight:800">🧪 Тест жестов</div>';
    html +=   '<div style="font-size:12.5px;color:#666;margin-top:2px">Долгий тап · свайп → · свайп ←</div></div>';
    html += '</div>';

    html += '<div style="background:#fff3d6;border:1.5px solid #ffb800;border-radius:14px;padding:12px;font-size:13px;line-height:1.5;color:#7a4a00;margin-bottom:18px">';
    html +=   '👉 <b>Долгий тап</b> (удержать) — откроется Bottom Sheet';
    html +=   '<br>👉 <b>Свайп вправо</b> — зелёная подсветка + звонок';
    html +=   '<br>👉 <b>Свайп влево</b> — синяя подсветка + карта';
    html +=   '<br>👉 <b>Обычный тап</b> — работает как раньше';
    html += '</div>';

    html += '<div style="font-size:13px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;margin:0 4px 10px">ТЕСТОВЫЕ ЭЛЕМЕНТЫ</div>';

    ['🧪 Тестовое событие №1', '🧪 Тестовое событие №2', '🧪 Тестовое событие №3'].forEach(function (lbl, i) {
      html += '<div class="zrz_gt_item" data-i="' + i + '" data-zrz-no-select style="background:#fff;border-radius:16px;padding:16px;margin-bottom:10px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;align-items:center;gap:12px;' +
        'user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer;transition:background .15s">';
      html +=   '<div style="font-size:22px">📏</div>';
      html +=   '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">' + esc2(lbl) + '</div>';
      html +=   '<div style="font-size:12.5px;color:#888;margin-top:2px">Удерживай / свайпай</div></div>';
      html +=   '<div style="font-size:20px;color:#bbb">›</div>';
      html += '</div>';
    });

    html += '<div id="zrz_gt_log" style="margin-top:18px;padding:14px;background:#1a1a1a;color:#0f0;' +
      'border-radius:14px;font-family:monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;min-height:60px">Лог действий появится здесь…</div>';

    html += '<div style="height:40px"></div>';
    screen.innerHTML = html;
    document.body.appendChild(screen);

    document.getElementById('zrz_gt_close').addEventListener('click', function () {
      screen.remove();
    });

    var logEl = document.getElementById('zrz_gt_log');
    function log(msg) {
      var time = new Date().toTimeString().slice(0, 8);
      logEl.textContent = '[' + time + '] ' + msg + '\n' + logEl.textContent;
      if (logEl.textContent.length > 500) logEl.textContent = logEl.textContent.slice(0, 500);
    }

    Array.prototype.forEach.call(screen.querySelectorAll('.zrz_gt_item'), function (el) {
      var idx = el.getAttribute('data-i');
      var name = 'Событие #' + (parseInt(idx, 10) + 1);

      if (typeof window.zrzAttachActions !== 'function') {
        el.style.opacity = '0.5';
        log('❌ zrzAttachActions не загружен');
        return;
      }

      window.zrzAttachActions(el, {
        longPress: [
          { ico:'👁',  label:'Открыть',    act:function () { log('✅ Долгий тап → Открыть (' + name + ')'); toast('Открыть · ' + name, '#4A90E2'); } },
          { ico:'✓',   label:'Отметить',   act:function () { log('✅ Долгий тап → Отметить (' + name + ')'); toast('Отмечено · ' + name, '#34C759'); } },
          { ico:'📞',  label:'Позвонить',  act:function () { log('✅ Долгий тап → Позвонить (' + name + ')'); toast('Звонок · ' + name, '#4A90E2'); } },
          { ico:'🗺',  label:'Карта',      act:function () { log('✅ Долгий тап → Карта (' + name + ')'); toast('Карта · ' + name, '#AF52DE'); } },
          { ico:'🗑',  label:'Удалить',    act:function () { log('✅ Долгий тап → Удалить (' + name + ')'); toast('Удалено · ' + name, '#E74C3C'); }, danger:true }
        ],
        swipeRight: { ico:'📞', label:'Позвонить', act:function () { log('✅ Свайп вправо → Позвонить (' + name + ')'); toast('📞 ' + name, '#34C759'); } },
        swipeLeft:  { ico:'🗺', label:'Карта',     act:function () { log('✅ Свайп влево → Карта (' + name + ')'); toast('🗺 ' + name, '#4A90E2'); } }
      });

      el.addEventListener('click', function (e) {
        if (el._zrzBlockClick) return;
        log('👆 Обычный тап (' + name + ')');
      });
    });

    log('✅ Экран готов. Тестируй!');
    log('typeof zrzAttachActions = ' + typeof window.zrzAttachActions);
  }

  function addButton() {
    if (!document.body) { setTimeout(addButton, 200); return; }
    if (document.getElementById('zrz_gt_btn')) return;

    var btn = document.createElement('button');
    btn.id = 'zrz_gt_btn';
    btn.type = 'button';
    btn.textContent = '🧪';
    btn.style.cssText = 'position:fixed;left:14px;bottom:calc(160px + env(safe-area-inset-bottom,0px));' +
      'width:48px;height:48px;border-radius:50%;border:none;' +
      'background:linear-gradient(135deg,#ffb800,#ff8a00);color:#fff;font-size:22px;' +
      'box-shadow:0 6px 18px rgba(255,138,0,.4);z-index:99998;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;padding:0;';
    btn.addEventListener('click', buildScreen);
    document.body.appendChild(btn);
  }

  if (document.readyState === 'complete') setTimeout(addButton, 1200);
  else window.addEventListener('load', function () { setTimeout(addButton, 1200); });

  try { console.log('[07] тестер жестов активен (только ?debug=1)'); } catch (_) {}
})();
/* ============ ZERZALO · UNIVERSAL ACTIONS · 07-gestures part3 ============ */
/* ============ ZERZALO · UNIVERSAL ACTIONS · 07-gestures part3 ============ */
(function () {
  'use strict';
  if (window._zrzActionsLoaded) return;
  window._zrzActionsLoaded = true;

  var LONG_PRESS_MS = 450;
  var SWIPE_THRESHOLD = 60;
  var MOVE_TOLERANCE = 30;

  function gesturesDisabled() {
    try {
      if (localStorage.getItem('zrz_gestures_disabled') === '1') return true;
      var p = JSON.parse(localStorage.getItem('zrz_user_prefs') || '{}');
      if (p && p.gestures === false) return true;
    } catch (e) {}
    return false;
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function openActionSheet(items, ctx) {
    var bg = document.createElement('div');
    bg.className = 'zrz-as-bg';
    var h = '<div class="zrz-as">';
    h += '<div class="zrz-as-handle"></div>';
    h += '<div class="zrz-as-list">';
    items.forEach(function (it, i) {
      h += '<button type="button" class="zrz-as-item' + (it.danger ? ' zrz-as-danger' : '') + '" data-i="' + i + '">'
        +   '<span class="zrz-as-ico">' + (it.ico || '•') + '</span>'
        +   '<span class="zrz-as-lbl">' + esc2(it.label) + '</span>'
        + '</button>';
    });
    h += '</div>';
    h += '<button type="button" class="zrz-as-cancel">Отмена</button>';
    h += '</div>';
    bg.innerHTML = h;
    document.body.appendChild(bg);

    function done() {
      try { bg.remove(); } catch (e) {}
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') done(); }
    document.addEventListener('keydown', onKey);

    bg.addEventListener('click', function (e) {
      if (e.target === bg) { done(); return; }
      if (e.target.closest('.zrz-as-cancel')) { done(); return; }
      var it = e.target.closest('.zrz-as-item');
      if (!it) return;
      var idx = parseInt(it.getAttribute('data-i'), 10);
      var item = items[idx];
      if (!item) return;
      done();
      buzz(14);
      setTimeout(function () {
        try { if (typeof item.act === 'function') item.act(ctx); } catch (err) { console.warn('[zrzActions]', err); }
      }, 60);
    });
  }

  function attach(el, opts) {
    if (!el || el._zrzActionsAttached) return;
    el._zrzActionsAttached = true;
    opts = opts || {};

    /* Отключаем выделение текста и системное меню Chrome */
    el.setAttribute('data-zrz-no-select', '');
    el.addEventListener('selectstart', function (e) { e.preventDefault(); });
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    el.addEventListener('longpress', function (e) { e.preventDefault(); });

    var st = {
      id: null,
      sx: 0, sy: 0,
      dir: null,
      moved: false,
      longTimer: null,
      longFired: false,
      lastDx: 0
    };

    function onStart(e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      st.id = t.identifier;
      st.sx = t.clientX;
      st.sy = t.clientY;
      st.dir = null;
      st.moved = false;
      st.longFired = false;
      st.lastDx = 0;

      if (opts.longPress && opts.longPress.length && !gesturesDisabled()) {
        st.longTimer = setTimeout(function () {
          st.longFired = true;
          st.longTimer = null;
          buzz([18, 40, 18]);
          openActionSheet(opts.longPress, opts);
        }, LONG_PRESS_MS);
      }
    }

    function onMove(e) {
      if (st.id === null) return;
      var t = null;
      for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === st.id) { t = e.touches[i]; break; }
      }
      if (!t) return;

      var dx = t.clientX - st.sx;
      var dy = t.clientY - st.sy;
      var adx = Math.abs(dx), ady = Math.abs(dy);

      if (!st.moved && (adx > MOVE_TOLERANCE || ady > MOVE_TOLERANCE)) {
        st.moved = true;
        if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      }

      if (st.dir === null && st.moved) {
        if (adx > ady * 1.3) st.dir = 'x';
        else st.dir = 'y';
      }

      if (st.dir === 'x') {
        e.preventDefault();
        st.lastDx = dx;
        var shift = Math.max(-90, Math.min(90, dx));
        el.style.transition = 'none';
        el.style.transform = 'translateX(' + shift + 'px)';
        el.classList.toggle('zrz-sw-r', shift > 20);
        el.classList.toggle('zrz-sw-l', shift < -20);
      }
    }

    function onEnd(e) {
      var wasLong = st.longFired;
      var dir = st.dir;
      var dx = st.lastDx;

      if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      st.id = null;
      st.dir = null;
      st.longFired = false;
      st.lastDx = 0;
      st.moved = false;

      el.style.transition = 'transform .2s ease';
      el.style.transform = '';
      el.classList.remove('zrz-sw-r', 'zrz-sw-l');

      if (wasLong) {
        el._zrzBlockClick = true;
        setTimeout(function () { el._zrzBlockClick = false; }, 400);
        return;
      }

      if (dir === 'x') {
        if (dx > SWIPE_THRESHOLD && opts.swipeRight) {
          buzz(14);
          try { if (typeof opts.swipeRight.act === 'function') opts.swipeRight.act(opts); } catch (err) {}
        } else if (dx < -SWIPE_THRESHOLD && opts.swipeLeft) {
          buzz(14);
          try { if (typeof opts.swipeLeft.act === 'function') opts.swipeLeft.act(opts); } catch (err) {}
        }
      }
    }

    function onCancel() {
      if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      st.id = null;
      st.dir = null;
      st.moved = false;
      st.longFired = false;
      el.style.transition = 'transform .2s ease';
      el.style.transform = '';
      el.classList.remove('zrz-sw-r', 'zrz-sw-l');
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onCancel, { passive: true });

    el.addEventListener('click', function (e) {
      if (el._zrzBlockClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    el.addEventListener('contextmenu', function (e) {
      if (!opts.longPress || !opts.longPress.length) return;
      e.preventDefault();
      openActionSheet(opts.longPress, opts);
    });
  }

  var st = document.createElement('style');
  st.setAttribute('data-zrz', 'actions');
  st.textContent = [
    '.zrz-as-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99995;display:flex;align-items:flex-end;animation:zrzAsFade .2s ease;font-family:Onest,system-ui,sans-serif}',
    '.zrz-as{background:#fff;width:100%;max-height:78vh;border-radius:22px 22px 0 0;padding:0 0 calc(env(safe-area-inset-bottom,0px) + 8px);box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:zrzAsUp .28s cubic-bezier(.34,1.56,.64,1);overflow:auto}',
    '.zrz-as-handle{width:40px;height:4px;background:#ddd;border-radius:2px;margin:10px auto 6px}',
    '.zrz-as-list{padding:6px 8px 4px}',
    '.zrz-as-item{display:flex;align-items:center;gap:14px;width:100%;padding:15px 14px;border:none;background:transparent;font-family:inherit;font-size:15.5px;font-weight:600;color:#111;text-align:left;cursor:pointer;border-radius:14px;transition:background .15s}',
    '.zrz-as-item:active{background:#eef3ff}',
    '.zrz-as-ico{font-size:20px;line-height:1;width:28px;text-align:center;flex-shrink:0}',
    '.zrz-as-lbl{flex:1;min-width:0}',
    '.zrz-as-danger{color:#c0392b}',
    '.zrz-as-danger:active{background:#fdecea}',
    '.zrz-as-cancel{display:block;width:calc(100% - 16px);margin:6px 8px 8px;padding:14px;border:none;background:#f5f5f7;border-radius:14px;font-family:inherit;font-size:15px;font-weight:700;color:#555;cursor:pointer}',
    '.zrz-as-cancel:active{background:#e8e8eb}',
    '.zrz-sw-r{background:linear-gradient(90deg,rgba(76,175,125,0.20) 0%,var(--surface, #fff) 45%) !important}',
    '.zrz-sw-l{background:linear-gradient(270deg,rgba(59,134,200,0.20) 0%,var(--surface, #fff) 45%) !important}',
    '[data-zrz-no-select],[data-zrz-no-select] *{-webkit-user-select:none !important;user-select:none !important;-webkit-touch-callout:none !important;-webkit-tap-highlight-color:transparent !important;}',
    '[data-zrz-no-select]{touch-action:pan-y}',
    '@keyframes zrzAsFade{from{opacity:0}to{opacity:1}}',
    '@keyframes zrzAsUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
  ].join('');
  if (!document.querySelector('style[data-zrz="actions"]')) document.head.appendChild(st);

  window.zrzAttachActions = attach;
  window.zrzActionSheet = openActionSheet;

  try { console.log('[07 p3] универсальный компонент жестов активен'); } catch (_) {}
})();
