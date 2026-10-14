/* patches/12-statuses-extra.js — дошлифовка статусов
   · Причина паузы (модалка при постановке на ⏸ Пауза)
   · История статусов в деталях заказа (кто/когда/куда)
   · Автопереходы: событие «Замер» → lead → measure_scheduled
   · Уведомления менеджерам при installed / closed
   · Фильтр по фазам (Договор / Работа / Финал / Особые)
*/
(function(){
  if(window._zrz12StatusesExtra) return;
  window._zrz12StatusesExtra = true;

  var STATUS_LABELS = {
    lead:              '📋 Заявка',
    measure_scheduled: '📅 Замер',
    measure_done:      '📐 Замер выполнен',
    approval:          '✏️ Согласование',
    work:              '🔧 В работе',
    ready:             '🚚 Ожидает монтажа',
    installed:         '🏠 Установлен',
    closed:            '✓ Закрыт',
    paused:            '⏸ Пауза',
    declined:          '❌ Отменён'
  };

  var PHASES = [
    { key:'deal',    label:'Договор', statuses:['lead','measure_scheduled','measure_done'] },
    { key:'work',    label:'Работа',  statuses:['approval','work','ready'] },
    { key:'final',   label:'Финал',   statuses:['installed','closed'] },
    { key:'special', label:'Особые',  statuses:['paused','declined'] }
  ];

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function statusLabel(k){ return STATUS_LABELS[k] || k || '—'; }
  function phaseOfStatus(s){
    for(var i=0;i<PHASES.length;i++){
      if(PHASES[i].statuses.indexOf(s) >= 0) return PHASES[i].key;
    }
    return 'deal';
  }

  /* ============================================================
     1. ЗАПИСЬ В ИСТОРИЮ — обёртка над setOrderStatus
     ============================================================ */

  function wrapSetOrderStatus(){
    if(window._zrz12SetStatusWrapped) return;
    if(typeof window.setOrderStatus !== 'function') return;
    var orig = window.setOrderStatus;
    window.setOrderStatus = function(orderId, status){
      var o = null;
      try { o = db.orders.find(function(x){ return x.id === orderId; }); }catch(e){}
      if(!o) return orig.apply(this, arguments);

      var prevStatus = o.status;
      if(prevStatus === status) return orig.apply(this, arguments);

      /* Спец-логика для «Пауза» — сначала причина */
      if(status === 'paused'){
        openPauseReasonModal(orderId, function(reason){
          recordAndApply(o, prevStatus, status, reason);
        });
        return;
      }

      /* Спец-логика для выхода из паузы */
      if(prevStatus === 'paused'){
        try { delete o.pausedReason; }catch(e){ o.pausedReason = ''; }
      }

      recordAndApply(o, prevStatus, status, '');
    };
    window._zrz12SetStatusWrapped = true;
  }

  function recordAndApply(o, prevStatus, status, pauseReason){
    try {
      o.status = status;
      o.statusChangedAt = Date.now();
      o.statusChangedBy = (typeof db !== 'undefined' && db.currentUserId) ? db.currentUserId : null;
      if(pauseReason) o.pausedReason = pauseReason;
      if(!Array.isArray(o.statusHistory)) o.statusHistory = [];
      o.statusHistory.push({
        at: Date.now(),
        from: prevStatus || null,
        to: status,
        by: o.statusChangedBy,
        note: pauseReason || ''
      });
      /* Ограничим историю 100 записями */
      if(o.statusHistory.length > 100){
        o.statusHistory = o.statusHistory.slice(-100);
      }
      if(typeof touch === 'function') touch(o);
    }catch(e){}

    try { if(typeof save === 'function') save(); }catch(e){}
    try { if(typeof haptic === 'function') haptic(8); }catch(_){}

    /* Уведомления менеджерам при переходе в installed / closed */
    try {
      if(status === 'installed' || status === 'closed'){
        notifyManagersOnFinal(o, status);
      }
    }catch(e){}

    try { if(typeof render === 'function') render(); }catch(e){}
  }

  /* ============================================================
     2. МОДАЛКА ПРИЧИНЫ ПАУЗЫ
     ============================================================ */

  function openPauseReasonModal(orderId, onConfirm){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); }catch(e){}
    if(!o) return;

    var presets = ['Ждём фурнитуру','Ждём стекло','Клиент думает','Ожидаем оплату','Техническая пауза','Другое'];

    var html = '';
    html += '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' Поставить на паузу</h2>';
    html += '<div class="modal-crumbs"><span>Заказ № ' + esc2(o.orderNum || '—') + '</span><span class="bc-sep">/</span><span class="bc-cur">Причина</span></div>';
    html += '<div style="font-size:13px;color:var(--muted);margin:4px 0 14px;line-height:1.5">'
      + 'Заказ перестанет двигаться по этапам. Причина видна всем — команда поймёт, чего ждём.'
      + '</div>';
    html += '<label>Причина</label>';
    html += '<div class="chips" id="zrz-pause-presets" style="margin-bottom:6px">';
    presets.forEach(function(p){
      html += '<button type="button" class="chip" data-v="' + esc2(p) + '">' + esc2(p) + '</button>';
    });
    html += '</div>';
    html += '<input id="zrz-pause-input" type="text" placeholder="Своя формулировка или уточнение" maxlength="120">';
    html += '<button class="btn btn-primary" style="margin-top:14px" onclick="zrzConfirmPause(' + orderId + ')">Поставить на паузу</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal()">Отмена</button>';

    try {
      if(typeof showModal === 'function') showModal(html);
      else return;
    }catch(e){ return; }

    setTimeout(function(){
      var presetsEl = document.getElementById('zrz-pause-presets');
      var inp = document.getElementById('zrz-pause-input');
      if(presetsEl){
        presetsEl.onclick = function(e){
          var c = e.target.closest('.chip'); if(!c) return;
          presetsEl.querySelectorAll('.chip').forEach(function(x){ x.classList.toggle('active', x === c); });
          if(inp && c.getAttribute('data-v') !== 'Другое') inp.value = c.getAttribute('data-v');
        };
      }
      if(inp) inp.focus();

      /* Сохраняем callback в window для кнопки */
      window._zrz12PauseCallback = onConfirm;
      window._zrz12PauseOrderId = orderId;
    }, 150);
  }

  window.zrzConfirmPause = function(orderId){
    var inp = document.getElementById('zrz-pause-input');
    var reason = inp ? String(inp.value || '').trim() : '';
    if(!reason){
      var active = document.querySelector('#zrz-pause-presets .chip.active');
      if(active) reason = active.getAttribute('data-v') || '';
    }
    if(!reason){
      try{ if(typeof uiAlert === 'function') uiAlert('Введите причину паузы'); }catch(_){}
      return;
    }
    try { if(typeof closeModal === 'function') closeModal(); }catch(e){}
    var cb = window._zrz12PauseCallback;
    window._zrz12PauseCallback = null;
    if(typeof cb === 'function'){
      setTimeout(function(){ cb(reason); }, 80);
    }
  };

  /* ============================================================
     3. ИСТОРИЯ СТАТУСОВ — блок в деталях заказа
     ============================================================ */

  function buildHistoryBlock(o){
    if(!o || !Array.isArray(o.statusHistory) || !o.statusHistory.length) return '';
    var items = o.statusHistory.slice().reverse();
    var html = '<div class="zrz-history">';
    html +=   '<div class="zrz-history-title">📅 История статусов</div>';
    html +=   '<div class="zrz-history-list">';
    items.slice(0, 10).forEach(function(h){
      var d = new Date(h.at);
      var dateStr = (typeof pad2 === 'function') ? (pad2(d.getDate()) + '.' + pad2(d.getMonth()+1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())) : d.toLocaleString('ru-RU');
      var byName = '';
      try {
        if(h.by && Array.isArray(db.users)){
          var u = db.users.find(function(x){ return x.id === h.by; });
          if(u) byName = u.name.split(' ')[0];
        }
      }catch(e){}
      html += '<div class="zrz-history-row">';
      html +=   '<span class="zrz-history-date">' + esc2(dateStr) + '</span>';
      html +=   '<span class="zrz-history-arrow">→</span>';
      html +=   '<span class="zrz-history-lbl">' + esc2(statusLabel(h.to)) + '</span>';
      if(byName) html += '<span class="zrz-history-by">' + esc2(byName) + '</span>';
      if(h.note) html += '<span class="zrz-history-note">' + esc2(h.note) + '</span>';
      html += '</div>';
    });
    if(items.length > 10){
      html += '<div class="zrz-history-more">…и ещё ' + (items.length - 10) + '</div>';
    }
    html +=   '</div>';
    html += '</div>';
    return html;
  }

  /* Инжект в детали заказа — ПОСЛЕ большого блока статуса */
  function injectHistoryBlock(){
    var app = document.getElementById('app');
    if(!app) return;
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === (typeof currentOrderId !== 'undefined' ? currentOrderId : null); }); }catch(e){}
    if(!o) return;
    if(app.querySelector('.zrz-history')) return;
    if(!o.statusHistory || !o.statusHistory.length) return;

    /* Вставляем после кнопки «Изменить статус» или после .zrz-sb-next */
    var anchor = app.querySelector('.zrz-status-change') || app.querySelector('.zrz-sb-next') || app.querySelector('.zrz-sb');
    if(!anchor || !anchor.parentNode) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = buildHistoryBlock(o);
    var node = wrap.firstChild;
    if(node) anchor.parentNode.insertBefore(node, anchor.nextSibling);
  }

  /* ============================================================
     4. АВТОПЕРЕХОДЫ ОТ СОБЫТИЙ
     ============================================================ */

  function wrapSaveEventForm(){
    if(window._zrz12EventWrapped) return;
    if(typeof window.saveEventForm !== 'function') return;
    var orig = window.saveEventForm;
    window.saveEventForm = function(eventId){
      var isNew = !eventId;
      var beforeDone = false;
      try {
        if(eventId){
          var e = (typeof eventById === 'function') ? eventById(eventId) : null;
          if(e) beforeDone = (e.status === 'done');
        }
      }catch(e){}

      var res = orig.apply(this, arguments);

      /* После сохранения — смотрим, что стало с событием */
      setTimeout(function(){
        try {
          var saved = null;
          if(!isNew){
            /* Существующее событие */
            var events = (typeof db !== 'undefined' && Array.isArray(db.events)) ? db.events : [];
            /* Найдём последнее изменённое или по id — ядро уже могло обновить */
            saved = eventId ? events.find(function(x){ return x.id === eventId; }) : null;
          } else {
            /* Новое событие — последнее в массиве */
            var evs = (typeof db !== 'undefined' && Array.isArray(db.events)) ? db.events : [];
            if(evs.length) saved = evs[evs.length - 1];
          }
          if(!saved || !saved.orderId) return;
          if(saved.type !== 'measure' && saved.type !== 'remeasure') return;

          var o = null;
          try { o = db.orders.find(function(x){ return x.id === saved.orderId; }); }catch(e){ return; }
          if(!o) return;

          /* Событие создано / есть дата → measure_scheduled */
          if(o.status === 'lead' && saved.date){
            autoStatus(o, 'measure_scheduled', 'Автоматически: назначен замер');
            return;
          }
          /* Событие выполнено → measure_done */
          var becameDone = (saved.status === 'done') && !beforeDone;
          if(becameDone && (o.status === 'measure_scheduled' || o.status === 'lead')){
            autoStatus(o, 'measure_done', 'Автоматически: замер выполнен');
            return;
          }
        }catch(e){ try{console.warn('[12] auto', e);}catch(_){} }
      }, 250);

      return res;
    };
    window._zrz12EventWrapped = true;
  }

  function autoStatus(o, status, note){
    if(!o) return;
    if(o.status === status) return;
    var prev = o.status;
    o.status = status;
    o.statusChangedAt = Date.now();
    o.statusChangedBy = (typeof db !== 'undefined' && db.currentUserId) ? db.currentUserId : null;
    if(!Array.isArray(o.statusHistory)) o.statusHistory = [];
    o.statusHistory.push({
      at: Date.now(),
      from: prev || null,
      to: status,
      by: o.statusChangedBy,
      note: note || ''
    });
    if(o.statusHistory.length > 100) o.statusHistory = o.statusHistory.slice(-100);
    if(typeof touch === 'function') touch(o);
    try { if(typeof save === 'function') save(); }catch(e){}
    setTimeout(function(){ try { if(typeof render === 'function') render(); }catch(e){} }, 200);
  }

  /* ============================================================
     5. УВЕДОМЛЕНИЯ МЕНЕДЖЕРАМ
     ============================================================ */

  function notifyManagersOnFinal(o, status){
    try {
      if(!o || !Array.isArray(db.users)) return;
      var recips = db.users.filter(function(u){
        return u.active && (u.role === 'admin' || u.role === 'manager');
      }).map(function(u){ return u.id; });
      /* Исключаем того, кто сам перевёл — не нужно уведомление себе */
      var me = db.currentUserId;
      recips = recips.filter(function(uid){ return uid !== me; });
      if(!recips.length) return;

      var title = (status === 'closed') ? '✓ Заказ закрыт' : '🏠 Заказ установлен';
      var body = 'Заказ № ' + (o.orderNum || '—')
        + ' • ' + ((typeof orderClientName === 'function') ? orderClientName(o) : '')
        + (status === 'closed' ? ' — можно выставлять счёт' : ' — работы сданы клиенту');

      if(typeof createNotificationsFor === 'function'){
        createNotificationsFor(recips, {
          type: 'info',
          title: title,
          body: body,
          linkOrderId: o.id
        });
      }
    }catch(e){ try{console.warn('[12] notify', e);}catch(_){} }
  }

  /* ============================================================
     6. ФИЛЬТР ПО ФАЗАМ
     ============================================================ */

  function injectPhaseFilter(){
    try {
      var panel = document.getElementById('orderFiltersPanel');
      if(!panel) return;
      if(panel.querySelector('.zrz-phase-filter')) return;
      var anySelect = panel.querySelector('select');
      if(!anySelect) return;

      var html = '';
      html += '<div class="zrz-phase-filter" style="grid-column:1/-1;margin-top:8px">';
      html +=   '<label style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:0.4px">Быстрый фильтр по фазе</label>';
      html +=   '<div class="chips" style="margin-top:6px;flex-wrap:wrap">';
      html +=     '<button type="button" class="chip" data-phase="deal">🟠 Договор</button>';
      html +=     '<button type="button" class="chip" data-phase="work">🔵 Работа</button>';
      html +=     '<button type="button" class="chip" data-phase="final">🟢 Финал</button>';
      html +=     '<button type="button" class="chip" data-phase="special">⚪ Особые</button>';
      html +=   '</div>';
      html += '</div>';

      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var fg = panel.querySelector('.filter-grid') || panel;
      var phaseEl = wrap.querySelector('.zrz-phase-filter');
      if(phaseEl) fg.appendChild(phaseEl);

      /* Обработчики */
      fg.querySelectorAll('.zrz-phase-filter .chip').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          var phaseKey = btn.getAttribute('data-phase');
          applyPhaseFilter(phaseKey);
          fg.querySelectorAll('.zrz-phase-filter .chip').forEach(function(x){ x.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    }catch(e){ try{console.warn('[12] phase filter', e);}catch(_){} }
  }

  function applyPhaseFilter(phaseKey){
    try {
      var ph = PHASES.find(function(p){ return p.key === phaseKey; });
      if(!ph) return;
      /* Используем ядровый механизм фильтра: orderFilters.status + renderOrderList */
      if(typeof orderFilters !== 'undefined'){
        /* У ядра фильтр по одному статусу. Обойдём через кастомное поле. */
        orderFilters.__phase = phaseKey;
      }
      /* Сразу перерисуем список с учётом фазы */
      var list = document.getElementById('orderList');
      if(list && typeof renderOrderList === 'function'){
        list.innerHTML = renderOrderListWithPhase(phaseKey);
      }
      /* Небольшой тост */
      try { if(typeof haptic === 'function') haptic(6); }catch(_){}
    }catch(e){ try{console.warn('[12] applyPhase', e);}catch(_){} }
  }

  function renderOrderListWithPhase(phaseKey){
    /* Обёртка: получаем обычный список, фильтруем по фазе */
    try {
      var ph = PHASES.find(function(p){ return p.key === phaseKey; });
      if(!ph) return (typeof renderOrderList === 'function') ? renderOrderList() : '';
      var orders = (typeof visibleOrders === 'function') ? visibleOrders() : [];
      /* Применяем базовые фильтры ядра вручную (по статусу/дате/типу/team/paid) */
      /* Простейший вариант: только текущий фильтр фазы + остальные ядровые */
      /* Пойдём через оригинальный renderOrderList, но предварительно
         применим фильтр к visibleOrders через временный флаг. */
      var statuses = ph.statuses;
      var html = '';
      var items = orders.filter(function(o){
        return statuses.indexOf(o.status) >= 0;
      });
      /* Применяем остальные фильтры ядра если они есть */
      try {
        var f = (typeof orderFilters !== 'undefined') ? orderFilters : null;
        if(f){
          if(f.dateFrom) items = items.filter(function(o){ return (typeof orderDateKey === 'function' ? orderDateKey(o) : '') >= f.dateFrom; });
          if(f.dateTo)   items = items.filter(function(o){ return (typeof orderDateKey === 'function' ? orderDateKey(o) : '') <= f.dateTo; });
          if(f.team){ var tid = parseInt(f.team, 10); items = items.filter(function(o){ return Array.isArray(o.assignedUserIds) && o.assignedUserIds.indexOf(tid) >= 0; }); }
          if(f.paid === 'yes') items = items.filter(function(o){ return !!o.paid; });
          if(f.paid === 'no')  items = items.filter(function(o){ return !o.paid; });
          if(f.type) items = items.filter(function(o){
            var its = (typeof itemsOf === 'function') ? itemsOf(o.id) : [];
            return its.some(function(i){ return i.type === f.type; });
          });
        }
        /* Поиск */
        var q = (typeof searchQ !== 'undefined' && searchQ) ? String(searchQ).trim().toLowerCase() : '';
        if(q){
          items = items.filter(function(o){
            var s = ((typeof orderClientName === 'function' ? orderClientName(o) : '')
              + ' ' + (o.orderNum || '')
              + ' ' + (typeof orderAddressShort === 'function' ? orderAddressShort(o) : '')
              + ' ' + (typeof orderClientPhone === 'function' ? orderClientPhone(o) : '')).toLowerCase();
            return s.indexOf(q) >= 0;
          });
        }
      }catch(e){}

      if(!items.length){
        return '<div class="empty">В этой фазе ничего нет<br><br>Нажмите «Договор», «Работа», «Финал» или «Особые» — или сбросьте.</div>';
      }
      html = items.map(function(o){
        return (typeof renderOrderCard === 'function') ? renderOrderCard(o) : '';
      }).join('');
      /* Свайпы */
      setTimeout(function(){
        try { document.querySelectorAll('.swipe-wrap').forEach(function(w){ if(typeof setupSwipe === 'function') setupSwipe(w); }); }catch(e){}
      }, 40);
      return html;
    }catch(e){
      return '<div class="empty">Ошибка фильтра фазы</div>';
    }
  }
  window.zrzRenderByPhase = renderOrderListWithPhase;

  /* Подстройка renderOrderFiltersPanel — добавим наш блок после отрисовки ядром */
  function wrapRenderFilters(){
    if(window._zrz12FiltersWrapped) return;
    if(typeof window.renderOrderFiltersPanel !== 'function') return;
    var orig = window.renderOrderFiltersPanel;
    window.renderOrderFiltersPanel = function(){
      var html = orig.apply(this, arguments);
      /* Возвращаем как есть; наш блок вставим в DOM после рендера */
      setTimeout(injectPhaseFilter, 60);
      return html;
    };
    window._zrz12FiltersWrapped = true;
  }

  /* Дополнительно — добавить кнопку «Сброс» для фазы */
  function watchFiltersPanel(){
    try {
      var mo = new MutationObserver(function(){ setTimeout(injectPhaseFilter, 50); });
      var panel = document.getElementById('orderFiltersPanel');
      if(panel) mo.observe(panel, {childList:true, subtree:true});
      /* Первичный инжект */
      setTimeout(injectPhaseFilter, 200);
    }catch(e){}
  }

  /* ============================================================
     7. ПОДСТРОЙКА renderDetail — оборачиваем, чтобы подложить историю
     ============================================================ */

  function wrapRenderDetail(){
    if(window._zrz12RenderDetailWrapped) return;
    if(typeof window.renderDetail !== 'function') return;
    var orig = window.renderDetail;
    window.renderDetail = function(){
      var html = orig.apply(this, arguments);
      setTimeout(injectHistoryBlock, 120);
      return html;
    };
    window._zrz12RenderDetailWrapped = true;
  }

  /* ============================================================
     8. ПАУЗА: метка причины рядом с текущим статусом
     ============================================================ */

  function injectPausedReason(){
    try {
      var app = document.getElementById('app');
      if(!app) return;
      var o = null;
      try { o = db.orders.find(function(x){ return x.id === (typeof currentOrderId !== 'undefined' ? currentOrderId : null); }); }catch(e){}
      if(!o || o.status !== 'paused') return;
      if(!o.pausedReason) return;
      if(app.querySelector('.zrz-pause-reason')) return;
      var anchor = app.querySelector('.zrz-sb');
      if(!anchor) return;
      var el = document.createElement('div');
      el.className = 'zrz-pause-reason';
      el.innerHTML = '<span class="zrz-pause-ico">⏸</span><span class="zrz-pause-txt">Причина: <b>' + esc2(o.pausedReason) + '</b></span>';
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    }catch(e){}
  }

  /* ============================================================
     9. CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-statuses-extra-css')) return;
    var css = ''
      /* Причина паузы в деталях */
      + '.zrz-pause-reason{display:flex;align-items:flex-start;gap:10px;'
      +   'margin:0 0 14px;padding:12px 14px;border-radius:14px;'
      +   'background:linear-gradient(135deg,rgba(71,85,105,0.10),rgba(71,85,105,0.04));'
      +   'border:1.5px solid rgba(71,85,105,0.24);'
      +   'color:#475569;font-size:13.5px;line-height:1.5}'
      + 'html[data-theme="dark"] .zrz-pause-reason{color:#cbd5e1;border-color:rgba(203,213,225,0.24)}'
      + '.zrz-pause-ico{font-size:16px;line-height:1.4;flex-shrink:0;opacity:0.8}'
      + '.zrz-pause-txt b{font-weight:800;color:var(--text)}'
      /* История статусов */
      + '.zrz-history{margin:14px 0;padding:14px 16px;border-radius:16px;'
      +   'background:var(--line-soft);border:1.5px solid var(--line)}'
      + '.zrz-history-title{font-size:12px;font-weight:800;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
      + '.zrz-history-list{display:flex;flex-direction:column;gap:6px}'
      + '.zrz-history-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;'
      +   'font-size:13px;line-height:1.4;padding:2px 0;'
      +   'border-bottom:1px solid rgba(0,0,0,0.04)}'
      + 'html[data-theme="dark"] .zrz-history-row{border-bottom-color:rgba(255,255,255,0.05)}'
      + '.zrz-history-row:last-child{border-bottom:none}'
      + '.zrz-history-date{font-family:var(--font-mono);font-size:11.5px;'
      +   'color:var(--muted);font-weight:600;flex-shrink:0;letter-spacing:-0.02em}'
      + '.zrz-history-arrow{color:var(--muted-2);font-weight:800;flex-shrink:0}'
      + '.zrz-history-lbl{font-weight:700;color:var(--text);flex-shrink:0}'
      + '.zrz-history-by{font-size:11.5px;color:var(--muted);'
      +   'background:var(--accent-soft);padding:2px 8px;border-radius:8px;font-weight:600}'
      + '.zrz-history-note{font-size:11.5px;color:var(--muted);'
      +   'font-style:italic;flex-basis:100%;padding-left:22px}'
      + '.zrz-history-more{text-align:center;font-size:11.5px;color:var(--muted-2);'
      +   'margin-top:8px;font-weight:600}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-statuses-extra-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     10. ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapSetOrderStatus(); }catch(e){}
    try { wrapSaveEventForm(); }catch(e){}
    try { wrapRenderDetail(); }catch(e){}
    try { wrapRenderFilters(); }catch(e){}
    try { watchFiltersPanel(); }catch(e){}
    try { injectHistoryBlock(); }catch(e){}
    try { injectPausedReason(); }catch(e){}
    try { injectPhaseFilter(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 2500);

  /* Периодический пересмотр — на случай если ядро переопределит обёртки */
  var _iv = setInterval(function(){
    try { wrapSetOrderStatus(); }catch(e){}
    try { wrapSaveEventForm(); }catch(e){}
    try { injectHistoryBlock(); }catch(e){}
    try { injectPausedReason(); }catch(e){}
    try { injectPhaseFilter(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 90000);

  try{ console.log('[12-statuses-extra] причина паузы + история + автопереходы + уведомления + фильтр фаз — активны'); }catch(_){}
})();
