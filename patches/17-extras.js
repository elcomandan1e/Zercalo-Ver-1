/* patches/17-extras.js — Корзина + Bottom Sheet + Настройки жестов
   Часть 1: Корзина v2 — вкладки, фильтры, поиск, автор,
            массовые действия, автоочистка
   Часть 2: Единый Bottom Sheet для подтверждений
   Часть 3: Настройка «Отключить жесты» в профиле
*/
(function(){
  if(window._zrz17ExtrasP1) return;
  window._zrz17ExtrasP1 = true;

  /* ============================================================
     СОСТОЯНИЕ
     ============================================================ */
  var S = {
    tab: 'all',
    period: 'all',
    author: '',
    search: '',
    selected: {},
    selectionMode: false
  };

  var AUTOCLEAN_KEY = 'zrz_trash_autoclean';
  function _autocleanDays(){
    try {
      var v = localStorage.getItem(AUTOCLEAN_KEY);
      if(v === 'never') return 0;
      if(v) return parseInt(v, 10) || 0;
    } catch(e){}
    return 90;
  }
  function _setAutocleanDays(v){
    try { localStorage.setItem(AUTOCLEAN_KEY, String(v)); } catch(e){}
  }

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function _fmtDate(ms){
    try {
      var d = new Date(ms);
      return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch(e){ return '—'; }
  }

  function _fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function _entryInfo(entry){
    var t = entry.type || 'order';
    var title = '—', sub = '';

    if(t === 'order'){
      var o = entry.order || {};
      var name = ((o.lastName||'') + ' ' + (o.firstName||'')).trim()
              || (o.snapshot && o.snapshot.clientName)
              || 'Без имени';
      title = 'Заказ № ' + (o.orderNum || '—') + ' · ' + name;
      var pos = Array.isArray(entry.items) ? entry.items.length : 0;
      sub = 'Позиций: ' + pos + (o.orderTotal ? (' · ' + _fmtMoney(o.orderTotal) + ' ₽') : '');
    }
    else if(t === 'item'){
      var it = entry.item || {};
      var typeLbl = '';
      try { if(typeof typeInfo === 'function') typeLbl = typeInfo(it.type).label; } catch(e){}
      title = 'Позиция: ' + (typeLbl || it.type || '—') + ' ×' + (it.qty || 1);
      sub = it.note ? it.note : '';
    }
    else if(t === 'event'){
      var ev = entry.event || {};
      var evLbl = '';
      try { if(typeof eventTypeLabel === 'function') evLbl = eventTypeLabel(ev.type); } catch(e){}
      title = 'Событие: ' + (evLbl || ev.type || '—');
      sub = (ev.date || '') + (ev.time ? (' ' + ev.time) : '');
    }
    else if(t === 'client'){
      var c = entry.client || {};
      var cn = ((c.lastName||'') + ' ' + (c.firstName||'')).trim() || 'Без имени';
      title = 'Клиент: ' + cn;
      sub = c.phone || '';
    }
    else if(t === 'address'){
      var a = entry.address || {};
      var addr = '';
      try { if(typeof addressShort === 'function') addr = addressShort(a) || ''; } catch(e){}
      title = 'Адрес: ' + (addr || a.label || '—');
      sub = a.clientId ? ('Клиент #' + a.clientId) : '';
    }

    var by = entry.deletedBy;
    var byName = '';
    try {
      if(by && window.db && Array.isArray(window.db.users)){
        for(var i=0;i<window.db.users.length;i++){
          if(window.db.users[i].id === by){ byName = window.db.users[i].name || ''; break; }
        }
      }
    } catch(e){}

    return {
      type: t,
      title: title,
      sub: sub,
      when: _fmtDate(entry.deletedAt || 0),
      byName: byName,
      ico: ({order:'📦', item:'📋', event:'📅', client:'👤', address:'📍'})[t] || '🗑'
    };
  }

  var _TAB_META = [
    { key:'all',     label:'Все',      ico:'🗑' },
    { key:'order',   label:'Заказы',   ico:'📦' },
    { key:'item',    label:'Позиции',  ico:'📋' },
    { key:'event',   label:'События',  ico:'📅' },
    { key:'client',  label:'Клиенты',  ico:'👤' },
    { key:'address', label:'Адреса',   ico:'📍' }
  ];

  function _periodMs(){
    var now = Date.now();
    if(S.period === 'today'){
      var d = new Date();
      d.setHours(0,0,0,0);
      return d.getTime();
    }
    if(S.period === '7d')  return now - 7*86400000;
    if(S.period === '30d') return now - 30*86400000;
    return 0;
  }

  function _filteredEntries(){
    var arr = (window.db && Array.isArray(window.db.trash)) ? window.db.trash : [];
    var out = [];
    var since = _periodMs();
    var q = (S.search||'').trim().toLowerCase();

    for(var i=0;i<arr.length;i++){
      var e = arr[i];
      if(!e) continue;
      if(S.tab !== 'all' && e.type !== S.tab) continue;
      if(since && (e.deletedAt||0) < since) continue;
      if(S.author && String(e.deletedBy) !== String(S.author)) continue;
      if(q){
        var info = _entryInfo(e);
        var hay = (info.title + ' ' + info.sub + ' ' + info.byName).toLowerCase();
        if(hay.indexOf(q) < 0) continue;
      }
      out.push({ entry: e, realIdx: i });
    }
    out.sort(function(a,b){
      return (b.entry.deletedAt||0) - (a.entry.deletedAt||0);
    });
    return out;
  }

  function _countsByType(){
    var arr = (window.db && Array.isArray(window.db.trash)) ? window.db.trash : [];
    var c = { all: arr.length, order:0, item:0, event:0, client:0, address:0 };
    for(var i=0;i<arr.length;i++){
      var t = arr[i] && arr[i].type;
      if(c[t] != null) c[t]++;
    }
    return c;
  }

  function _countAfterCleanup(){
    var days = _autocleanDays();
    if(!days) return 0;
    var cutoff = Date.now() - days*86400000;
    var arr = (window.db && Array.isArray(window.db.trash)) ? window.db.trash : [];
    var n = 0;
    for(var i=0;i<arr.length;i++){
      if((arr[i].deletedAt||0) < cutoff) n++;
    }
    return n;
  }

  function _runAutoCleanup(silent){
    var days = _autocleanDays();
    if(!days) return 0;
    var cutoff = Date.now() - days*86400000;
    var arr = (window.db && Array.isArray(window.db.trash)) ? window.db.trash : [];
    var before = arr.length;
    window.db.trash = arr.filter(function(e){ return (e.deletedAt||0) >= cutoff; });
    var removed = before - window.db.trash.length;
    if(removed > 0){
      try { if(typeof save === 'function') save(); }catch(e){}
      if(!silent){
        try { if(typeof uiAlert === 'function') uiAlert('🧹 Автоочистка корзины: удалено ' + removed + ' записей старше ' + days + ' дней'); }catch(e){}
      }
    }
    return removed;
  }

  /* ============================================================
     ЭКРАН КОРЗИНЫ
     ============================================================ */

  function _openTrashV2(){
    if(typeof canViewTrash === 'function' && !canViewTrash()){
      if(typeof uiAlert === 'function') uiAlert('Нет прав');
      return;
    }
    S.selected = {};
    S.selectionMode = false;
    _renderTrashModal();
  }

  function _renderTrashModal(){
    var counts = _countsByType();
    var list = _filteredEntries();
    var totalAll = counts.all;
    var cleanupN = _countAfterCleanup();
    var days = _autocleanDays();

    var html = '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' Корзина</h2>';

    if(!totalAll){
      html += '<div class="empty" style="padding:30px;font-size:14px">Корзина пуста</div>';
      html += '<button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';
      if(typeof showModal === 'function') showModal(html);
      return;
    }

    html += '<div class="chips" style="margin:8px 0 6px;flex-wrap:wrap">';
    for(var i=0;i<_TAB_META.length;i++){
      var t = _TAB_META[i];
      var cnt = counts[t.key] || 0;
      var act = (S.tab === t.key) ? ' active' : '';
      html += '<button type="button" class="chip' + act + '" onclick="zrz17TrashTab(\'' + t.key + '\')">'
        + t.ico + ' ' + t.label + (cnt ? ' <span style="opacity:.7">' + cnt + '</span>' : '')
        + '</button>';
    }
    html += '</div>';

    var periodMeta = [
      { k:'today', l:'Сегодня' },
      { k:'7d',    l:'7 дней' },
      { k:'30d',   l:'30 дней' },
      { k:'all',   l:'Всё' }
    ];
    html += '<div class="chips" style="margin:4px 0 6px;flex-wrap:wrap">';
    for(var j=0;j<periodMeta.length;j++){
      var p = periodMeta[j];
      var pact = (S.period === p.k) ? ' active' : '';
      html += '<button type="button" class="chip sort-chip' + pact + '" onclick="zrz17TrashPeriod(\'' + p.k + '\')">' + p.l + '</button>';
    }
    html += '</div>';

    var users = (window.db && Array.isArray(window.db.users)) ? window.db.users : [];
    html += '<div style="display:flex;gap:6px;margin:4px 0 8px;align-items:center">';
    html += '<select id="zrz17_trash_author" style="margin:0;padding:8px 10px;font-size:13px;flex:1" onchange="zrz17TrashAuthor(this.value)">';
    html += '<option value="">👥 Все авторы</option>';
    for(var u=0;u<users.length;u++){
      var usr = users[u];
      var sel = (String(S.author) === String(usr.id)) ? ' selected' : '';
      html += '<option value="' + usr.id + '"' + sel + '>' + _esc(usr.name || ('ID ' + usr.id)) + '</option>';
    }
    html += '</select>';
    html += '</div>';

    html += '<div class="search-bar" style="margin-bottom:8px"><input type="search" placeholder="🔍 Поиск по названию" value="' + _esc(S.search) + '" oninput="zrz17TrashSearch(this.value)"></div>';

    html += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">';
    if(!S.selectionMode){
      html += '<button type="button" class="chip" onclick="zrz17TrashToggleSel(true)">☑ Выбрать</button>';
    } else {
      var selCount = Object.keys(S.selected).length;
      html += '<button type="button" class="chip active" onclick="zrz17TrashToggleSel(false)">✕ Отменить выбор</button>';
      html += '<button type="button" class="chip" onclick="zrz17TrashSelectAll()">☑ Все (' + list.length + ')</button>';
      html += '<button type="button" class="chip" style="background:var(--ok-soft);color:#2c7a54" onclick="zrz17TrashRestoreSelected()">↩ Восстановить (' + selCount + ')</button>';
      html += '<button type="button" class="chip" style="background:var(--danger-soft);color:var(--danger)" onclick="zrz17TrashDeleteSelected()">✕ Удалить (' + selCount + ')</button>';
    }
    html += '</div>';

    html += '<div style="max-height:44vh;overflow-y:auto;padding-right:2px">';

    if(!list.length){
      html += '<div class="wz-empty-hint">Ничего не найдено по фильтрам</div>';
    } else {
      for(var k=0;k<list.length;k++){
        var item = list[k];
        var entry = item.entry;
        var info = _entryInfo(entry);
        var realIdx = item.realIdx;
        var isSel = !!S.selected[realIdx];

        html += '<div class="trash-item" data-idx="' + realIdx + '" style="position:relative">';

        if(S.selectionMode){
          html += '<label style="display:flex;align-items:center;padding-right:8px;cursor:pointer">'
            + '<input type="checkbox" ' + (isSel ? 'checked' : '') + ' onclick="event.stopPropagation();zrz17TrashToggleItem(' + realIdx + ')">'
            + '</label>';
        }

        html += '<div class="trash-ico">' + info.ico + '</div>';
        html += '<div class="trash-body">';
        html +=   '<div class="trash-title">' + _esc(info.title) + '</div>';
        if(info.sub) html += '<div class="trash-sub">' + _esc(info.sub) + '</div>';
        html +=   '<div class="trash-sub" style="color:var(--muted-2);font-size:11.5px;margin-top:4px">🕐 ' + _esc(info.when) + (info.byName ? ' · ' + _esc(info.byName) : '') + '</div>';
        html += '</div>';

        if(!S.selectionMode){
          html += '<div class="trash-actions">';
          html +=   '<button type="button" onclick="zrz17TrashRestore(' + realIdx + ')">↩</button>';
          html +=   '<button type="button" class="danger" onclick="zrz17TrashRemove(' + realIdx + ')">✕</button>';
          html += '</div>';
        }

        html += '</div>';
      }
    }
    html += '</div>';

    html += '<div class="section-title" style="margin-top:14px">🧹 Автоочистка</div>';
    html += '<div class="shower-hint" style="text-align:left;margin-bottom:8px">Автоматически удалять записи старше выбранного срока.</div>';
    html += '<div class="chips" style="flex-wrap:wrap">';
    var options = [
      { v:30,     l:'30 дней' },
      { v:60,     l:'60 дней' },
      { v:90,     l:'90 дней' },
      { v:'never',l:'Никогда' }
    ];
    for(var m=0;m<options.length;m++){
      var o = options[m];
      var cur = String(days === 0 ? 'never' : days);
      var act2 = (String(o.v) === cur) ? ' active' : '';
      html += '<button type="button" class="chip' + act2 + '" onclick="zrz17TrashSetClean(' + (typeof o.v === 'number' ? o.v : '\'never\'') + ')">' + o.l + '</button>';
    }
    html += '</div>';

    if(cleanupN > 0){
      html += '<button type="button" class="btn btn-secondary" style="margin-top:10px" onclick="zrz17TrashCleanNow()">🧹 Очистить сейчас (' + cleanupN + ' старых)</button>';
    }

    if(S.tab === 'all' && !S.search && S.period === 'all' && !S.author){
      html += '<button class="btn btn-danger" style="margin-top:14px" onclick="zrz17TrashClearAll()">🗑 Очистить корзину полностью (' + totalAll + ')</button>';
    }

    html += '<button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';

    if(typeof showModal === 'function') showModal(html);
  }

  window.zrz17TrashTab = function(k){
    S.tab = k;
    S.selected = {};
    _renderTrashModal();
  };

  window.zrz17TrashPeriod = function(k){
    S.period = k;
    S.selected = {};
    _renderTrashModal();
  };

  window.zrz17TrashAuthor = function(v){
    S.author = v || '';
    S.selected = {};
    _renderTrashModal();
  };

  var _searchTimer = null;
  window.zrz17TrashSearch = function(v){
    S.search = v || '';
    if(_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function(){
      var scrollTop = 0;
      var scrollEl = document.querySelector('.modal > div[style*="max-height:44vh"]');
      if(scrollEl) scrollTop = scrollEl.scrollTop;
      _renderTrashModal();
      var newEl = document.querySelector('.modal > div[style*="max-height:44vh"]');
      if(newEl) newEl.scrollTop = scrollTop;
      var inp = document.querySelector('.modal input[type="search"]');
      if(inp){ inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch(e){} }
    }, 200);
  };

  window.zrz17TrashToggleSel = function(on){
    S.selectionMode = !!on;
    if(!on) S.selected = {};
    _renderTrashModal();
  };

  window.zrz17TrashToggleItem = function(idx){
    if(S.selected[idx]) delete S.selected[idx];
    else S.selected[idx] = true;
    _renderTrashModal();
  };

  window.zrz17TrashSelectAll = function(){
    S.selected = {};
    var list = _filteredEntries();
    for(var i=0;i<list.length;i++) S.selected[list[i].realIdx] = true;
    _renderTrashModal();
  };

  window.zrz17TrashRestore = function(realIdx){
    var entry = window.db.trash[realIdx];
    if(!entry) return;
    if(typeof restoreTrashEntry !== 'function'){
      if(typeof uiAlert === 'function') uiAlert('Ошибка: restoreTrashEntry недоступна');
      return;
    }
    try {
      restoreTrashEntry(entry);
      if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
      _renderTrashModal();
      if(typeof render === 'function'){ try{ render(); }catch(e){} }
    } catch(e){
      if(typeof uiAlert === 'function') uiAlert('Ошибка восстановления: ' + ((e && e.message) || e));
    }
  };

  window.zrz17TrashRemove = function(realIdx){
    var entry = window.db.trash[realIdx];
    if(!entry) return;
    var info = _entryInfo(entry);
    _confirmSheet({
      title: 'Удалить навсегда?',
      text: info.title + '\n\nЭто действие необратимо. Восстановить запись будет нельзя.',
      danger: true,
      yesLabel: 'Удалить'
    }).then(function(ok){
      if(!ok) return;
      window.db.trash.splice(realIdx, 1);
      try { if(typeof save === 'function') save(); }catch(e){}
      if(navigator.vibrate) try{ navigator.vibrate(20); }catch(e){}
      _renderTrashModal();
    });
  };

  window.zrz17TrashRestoreSelected = function(){
    var sel = Object.keys(S.selected).map(function(k){ return parseInt(k,10); });
    if(!sel.length) return;
    sel.sort(function(a,b){ return b - a; });
    var restored = 0;
    for(var i=0;i<sel.length;i++){
      var entry = window.db.trash[sel[i]];
      if(!entry) continue;
      try {
        if(typeof restoreTrashEntry === 'function'){
          restoreTrashEntry(entry);
          restored++;
        }
      } catch(e){}
    }
    S.selected = {};
    S.selectionMode = false;
    if(navigator.vibrate) try{ navigator.vibrate([10,30,10]); }catch(e){}
    _renderTrashModal();
    if(typeof render === 'function'){ try{ render(); }catch(e){} }
    if(typeof uiAlert === 'function') uiAlert('✔ Восстановлено: ' + restored);
  };

  window.zrz17TrashDeleteSelected = function(){
    var sel = Object.keys(S.selected).map(function(k){ return parseInt(k,10); });
    if(!sel.length) return;
    _confirmSheet({
      title: 'Удалить навсегда?',
      text: 'Будет удалено записей: ' + sel.length + '.\n\nЭто действие необратимо.',
      danger: true,
      yesLabel: 'Удалить всё'
    }).then(function(ok){
      if(!ok) return;
      sel.sort(function(a,b){ return b - a; });
      for(var i=0;i<sel.length;i++) window.db.trash.splice(sel[i], 1);
      try { if(typeof save === 'function') save(); }catch(e){}
      S.selected = {};
      S.selectionMode = false;
      if(navigator.vibrate) try{ navigator.vibrate([15,40,15]); }catch(e){}
      _renderTrashModal();
    });
  };

  window.zrz17TrashSetClean = function(v){
    _setAutocleanDays(v);
    _renderTrashModal();
  };

  window.zrz17TrashCleanNow = function(){
    var n = _runAutoCleanup(false);
    if(n > 0){
      _renderTrashModal();
    } else {
      if(typeof uiAlert === 'function') uiAlert('Нечего очищать');
    }
  };

  window.zrz17TrashClearAll = function(){
    var total = (window.db.trash || []).length;
    if(!total) return;
    _confirmSheet({
      title: 'Очистить корзину?',
      text: 'Будет удалено навсегда: ' + total + ' записей.\n\nЭто действие необратимо.',
      danger: true,
      yesLabel: 'Очистить всё'
    }).then(function(ok){
      if(!ok) return;
      window.db.trash = [];
      try { if(typeof save === 'function') save(); }catch(e){}
      if(navigator.vibrate) try{ navigator.vibrate([15,40,15]); }catch(e){}
      if(typeof closeModal === 'function') closeModal();
      if(typeof uiAlert === 'function') uiAlert('✔ Корзина очищена');
    });
  };

  function _confirmSheet(opts){
    if(typeof window.zrzConfirmSheet === 'function'){
      return window.zrzConfirmSheet(opts);
    }
    if(typeof uiConfirm === 'function'){
      return uiConfirm(opts.text || '', opts.title || 'Подтверждение', {
        danger: !!opts.danger,
        yesLabel: opts.yesLabel || 'Да',
        noLabel: opts.noLabel || 'Отмена'
      });
    }
    return Promise.resolve(window.confirm(opts.text || 'Подтвердить?'));
  }

  function _overrideOpenTrash(){
    try {
      window.openTrash = _openTrashV2;
    } catch(e){}
  }

  _overrideOpenTrash();
  setTimeout(_overrideOpenTrash, 500);
  setTimeout(_overrideOpenTrash, 2000);

  setInterval(function(){
    if(window.openTrash !== _openTrashV2) _overrideOpenTrash();
  }, 3000);

  function _updateTrashBadge(){
    try {
      var btns = document.querySelectorAll('.btn');
      for(var i=0;i<btns.length;i++){
        var b = btns[i];
        var t = (b.textContent || '').trim();
        if(t.indexOf('Корзина') >= 0){
          var total = (window.db && Array.isArray(window.db.trash)) ? window.db.trash.length : 0;
          var base = t.replace(/\s*\(\d+\)$/, '');
          b.textContent = base + (total ? (' (' + total + ')') : '');
        }
      }
    } catch(e){}
  }

  setInterval(_updateTrashBadge, 1500);

  setTimeout(function(){
    try { _runAutoCleanup(true); } catch(e){}
  }, 5000);

  window.zrz17OpenTrashV2 = _openTrashV2;

  try{ console.log('[17 extras p1] корзина v2 активна'); }catch(_){}
})();
/* patches/17-extras.js — Часть 2 (Bottom Sheet + опасные действия) */
/* patches/17-extras.js — Часть 2: Единый Bottom Sheet подтверждений */
(function(){
  if(window._zrz17ExtrasP2) return;
  window._zrz17ExtrasP2 = true;

  var _activeSheet = null;

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function _buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||14); }catch(e){} }

  function _injectCss(){
    if(document.getElementById('zrz-confirm-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-confirm-css';
    st.textContent = [
      '.zrz-confirm-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;',
        'display:flex;align-items:flex-end;animation:zrzCfFade .2s ease;',
        'font-family:Onest,system-ui,-apple-system,sans-serif}',
      '.zrz-confirm-sheet{background:var(--surface,#fff);width:100%;',
        'border-radius:22px 22px 0 0;',
        'padding:0 0 calc(env(safe-area-inset-bottom,0px) + 12px);',
        'box-shadow:0 -10px 30px rgba(0,0,0,.25);',
        'animation:zrzCfUp .3s cubic-bezier(.34,1.56,.64,1);max-height:82vh;overflow:auto}',
      '.zrz-confirm-handle{width:40px;height:4px;background:var(--line,#ddd);',
        'border-radius:2px;margin:10px auto 6px}',
      '.zrz-confirm-body{padding:8px 22px 6px;text-align:center}',
      '.zrz-confirm-title{font-size:18px;font-weight:800;',
        'color:var(--text,#111);line-height:1.3;letter-spacing:-.02em}',
      '.zrz-confirm-title.danger{color:#c0392b}',
      '.zrz-confirm-text{margin-top:10px;font-size:14.5px;',
        'color:var(--muted,#666);line-height:1.55;white-space:pre-wrap;word-break:break-word}',
      '.zrz-confirm-actions{display:flex;flex-direction:column;gap:8px;padding:14px 16px 6px}',
      '.zrz-confirm-btn{padding:15px 18px;border:none;border-radius:16px;',
        'font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;',
        'text-align:center;-webkit-tap-highlight-color:transparent}',
      '.zrz-confirm-btn:active{transform:scale(.98)}',
      '.zrz-confirm-btn-yes{background:linear-gradient(135deg,#7b9dd1,#5b7fb8);color:#fff;',
        'box-shadow:0 4px 14px rgba(91,127,184,.28)}',
      '.zrz-confirm-btn-yes.danger{background:linear-gradient(135deg,#e08080,#c0392b);',
        'box-shadow:0 4px 14px rgba(192,57,43,.28)}',
      '.zrz-confirm-btn-no{background:var(--accent-soft,#eaf1fb);color:var(--accent-deep,#3b5c8f)}',
      '.zrz-confirm-cancel{display:block;width:calc(100% - 32px);margin:2px 16px 8px;',
        'padding:14px;border:none;background:var(--line-soft,#f5f5f7);',
        'border-radius:14px;font-family:inherit;font-size:15px;font-weight:700;',
        'color:var(--muted,#555);cursor:pointer}',
      '.zrz-confirm-cancel:active{background:var(--line,#e8e8eb)}',
      '@keyframes zrzCfFade{from{opacity:0}to{opacity:1}}',
      '@keyframes zrzCfUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  window.zrzConfirmSheet = function(opts){
    opts = opts || {};
    _injectCss();

    if(_activeSheet && _activeSheet.close) _activeSheet.close(false);

    return new Promise(function(resolve){
      var bg = document.createElement('div');
      bg.className = 'zrz-confirm-bg';

      var titleCls = opts.danger ? 'zrz-confirm-title danger' : 'zrz-confirm-title';
      var yesCls   = opts.danger ? 'zrz-confirm-btn zrz-confirm-btn-yes danger' : 'zrz-confirm-btn zrz-confirm-btn-yes';

      var html = '<div class="zrz-confirm-sheet">';
      html +=   '<div class="zrz-confirm-handle"></div>';
      html +=   '<div class="zrz-confirm-body">';
      if(opts.title){
        html +=   '<div class="' + titleCls + '">' + _esc(opts.title) + '</div>';
      }
      if(opts.text){
        html +=   '<div class="zrz-confirm-text">' + _esc(opts.text) + '</div>';
      }
      html +=   '</div>';
      html +=   '<div class="zrz-confirm-actions">';
      html +=     '<button type="button" class="' + yesCls + '" data-act="yes">' + _esc(opts.yesLabel || 'Да') + '</button>';
      html +=     '<button type="button" class="zrz-confirm-btn zrz-confirm-btn-no" data-act="no">' + _esc(opts.noLabel || 'Отмена') + '</button>';
      html +=   '</div>';
      html +=   '<button type="button" class="zrz-confirm-cancel" data-act="cancel">Закрыть</button>';
      html += '</div>';

      bg.innerHTML = html;
      document.body.appendChild(bg);

      function close(result){
        _buzz(6);
        bg.style.transition = 'opacity .2s ease';
        bg.style.opacity = '0';
        var sheet = bg.querySelector('.zrz-confirm-sheet');
        if(sheet){
          sheet.style.transition = 'transform .2s ease';
          sheet.style.transform = 'translateY(100%)';
        }
        setTimeout(function(){
          try { bg.remove(); } catch(e){}
          if(_activeSheet && _activeSheet.bg === bg) _activeSheet = null;
          resolve(result);
        }, 200);
      }

      _activeSheet = { bg: bg, close: close };

      bg.addEventListener('click', function(e){
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if(act === 'yes'){ _buzz(12); close(true); return; }
        if(act === 'no' || act === 'cancel'){ close(false); return; }
        if(e.target === bg){ close(false); }
      });

      _buzz(6);
    });
  };

  function _wrapUiConfirm(){
    if(window._zrz17UiConfirmWrapped) return;
    if(typeof window.uiConfirm !== 'function') return;
    var orig = window.uiConfirm;

    window.uiConfirm = function(msg, title, opts){
      opts = opts || {};
      return window.zrzConfirmSheet({
        title: title || 'Подтверждение',
        text: msg,
        danger: !!opts.danger,
        yesLabel: opts.yesLabel || 'Да',
        noLabel: opts.noLabel || 'Отмена'
      });
    };
    window._zrz17UiConfirmWrapped = true;
  }

  function _wrapCloseModalWithConfirm(){
    if(window._zrz17CloseModalWrapped) return;
    if(typeof window.closeModalWithConfirm !== 'function') return;
    var orig = window.closeModalWithConfirm;

    window.closeModalWithConfirm = async function(){
      try {
        if(typeof hasUnsavedModal === 'function' && hasUnsavedModal()){
          _buzz(8);
          var ok = await window.zrzConfirmSheet({
            title: 'Есть несохранённые изменения',
            text: 'Выйти без сохранения?',
            danger: true,
            yesLabel: 'Выйти',
            noLabel: 'Остаться'
          });
          if(!ok) return;
          try { if(typeof clearDraft === 'function') clearDraft(); }catch(e){}
        }
      } catch(e){}
      window._modalDirty = false;
      if(typeof closeModal === 'function') closeModal();
    };
    window._zrz17CloseModalWrapped = true;
  }

  function apply(){
    try { _wrapUiConfirm(); }catch(e){}
    try { _wrapCloseModalWithConfirm(); }catch(e){}
  }

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  var _iv = setInterval(function(){
    try { _wrapUiConfirm(); }catch(e){}
    try { _wrapCloseModalWithConfirm(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[17 extras p2] Bottom Sheet подтверждений активен'); }catch(_){}
})();
/* patches/17-extras.js — Часть 3 (Настройка жестов в профиле) */
/* patches/17-extras.js — Часть 3: Настройка «Отключить жесты» */
(function(){
  if(window._zrz17ExtrasP3) return;
  window._zrz17ExtrasP3 = true;

  var GEST_KEY = 'zrz_gestures_disabled';
  var PREFS_KEY = 'zrz_user_prefs';

  function _getPrefs(){
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if(!raw) return {};
      var p = JSON.parse(raw);
      return (p && typeof p === 'object') ? p : {};
    } catch(e){ return {}; }
  }

  function _setPrefs(p){
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p || {})); } catch(e){}
  }

  function _allGesturesEnabled(){
    try {
      if(localStorage.getItem(GEST_KEY) === '1') return false;
      var p = _getPrefs();
      if(p && p.gestures === false) return false;
    } catch(e){}
    return true;
  }

  function _longPressEnabled(){
    var p = _getPrefs();
    if(p.longPress === false) return false;
    if(!_allGesturesEnabled()) return false;
    return true;
  }

  function _swipesEnabled(){
    var p = _getPrefs();
    if(p.swipes === false) return false;
    if(!_allGesturesEnabled()) return false;
    return true;
  }

  function _setAllGestures(on){
    try {
      if(on){
        localStorage.removeItem(GEST_KEY);
        var p = _getPrefs();
        delete p.gestures;
        p.longPress = true;
        p.swipes = true;
        _setPrefs(p);
      } else {
        localStorage.setItem(GEST_KEY, '1');
        var p2 = _getPrefs();
        p2.gestures = false;
        _setPrefs(p2);
      }
    } catch(e){}
  }

  function _setLongPress(on){
    try {
      var p = _getPrefs();
      p.longPress = !!on;
      if(!on) delete p.gestures;
      _setPrefs(p);
      localStorage.removeItem(GEST_KEY);
    } catch(e){}
  }

  function _setSwipes(on){
    try {
      var p = _getPrefs();
      p.swipes = !!on;
      if(!on) delete p.gestures;
      _setPrefs(p);
      localStorage.removeItem(GEST_KEY);
    } catch(e){}
  }

  function _buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||8); }catch(e){} }

  function _injectCss(){
    if(document.getElementById('zrz-prefs-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-prefs-css';
    st.textContent = [
      '.zrz-pref-row{display:flex;align-items:center;gap:12px;padding:12px 14px;',
        'background:var(--accent-soft,#eaf1fb);border-radius:14px;margin-top:8px}',
      '.zrz-pref-row-title{flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--text,#111);line-height:1.35}',
      '.zrz-pref-row-sub{display:block;font-size:11.5px;color:var(--muted,#666);margin-top:3px;font-weight:400;line-height:1.4}',
      '.zrz-pref-toggle{width:52px;height:32px;flex-shrink:0;',
        'border-radius:999px;background:#d0d7e2;position:relative;cursor:pointer;border:none;padding:0}',
      'html[data-theme="dark"] .zrz-pref-toggle{background:#3a4459}',
      '.zrz-pref-toggle::before{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;',
        'border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);',
        'transition:transform .24s cubic-bezier(.4,0,.2,1)}',
      'html[data-theme="dark"] .zrz-pref-toggle::before{background:#e6ecf5}',
      '.zrz-pref-toggle.on{background:linear-gradient(135deg,#7b9dd1,#5b7fb8)}',
      '.zrz-pref-toggle.on::before{transform:translateX(20px)}',
      '.zrz-pref-title{margin-top:14px;font-size:12px;font-weight:700;',
        'color:var(--accent-deep,#3b5c8f);text-transform:uppercase;letter-spacing:.8px;',
        'padding-bottom:6px;border-bottom:1px solid var(--line-soft,#f0f4fa)}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  function _prefsBlockHtml(){
    var all = _allGesturesEnabled();
    var lp = _longPressEnabled();
    var sw = _swipesEnabled();

    var h = '';
    h += '<div class="zrz-pref-title">⚙️ Настройки интерфейса</div>';
    h += '<div class="zrz-pref-row">';
    h +=   '<div class="zrz-pref-row-title">';
    h +=     'Жесты вкл/выкл';
    h +=     '<span class="zrz-pref-row-sub">Общий переключатель для всех карточек: долгий тап и свайпы</span>';
    h +=   '</div>';
    h +=   '<button type="button" class="zrz-pref-toggle' + (all ? ' on' : '') + '" data-pref="all"></button>';
    h += '</div>';

    if(all){
      h += '<div class="zrz-pref-row">';
      h +=   '<div class="zrz-pref-row-title">';
      h +=     'Долгий тап';
      h +=     '<span class="zrz-pref-row-sub">Открывает меню действий на карточке</span>';
      h +=   '</div>';
      h +=   '<button type="button" class="zrz-pref-toggle' + (lp ? ' on' : '') + '" data-pref="lp"></button>';
      h += '</div>';

      h += '<div class="zrz-pref-row">';
      h +=   '<div class="zrz-pref-row-title">';
      h +=     'Свайпы влево/вправо';
      h +=     '<span class="zrz-pref-row-sub">Быстрые действия на карточках</span>';
      h +=   '</div>';
      h +=   '<button type="button" class="zrz-pref-toggle' + (sw ? ' on' : '') + '" data-pref="sw"></button>';
      h += '</div>';
    }

    return h;
  }

  function _bindBlock(block){
    block.querySelectorAll('.zrz-pref-toggle').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pref = btn.getAttribute('data-pref');
        var isOn = btn.classList.contains('on');
        _buzz(8);

        if(pref === 'all') _setAllGestures(!isOn);
        else if(pref === 'lp') _setLongPress(!isOn);
        else if(pref === 'sw') _setSwipes(!isOn);

        try {
          block.innerHTML = _prefsBlockHtml();
          _bindBlock(block);
        } catch(e){}
      });
    });
  }

  function _wrapOpenProfile(){
    if(window._zrz17OpenProfileWrapped) return;
    if(typeof window.openProfile !== 'function') return;
    var orig = window.openProfile;
    window.openProfile = function(){
      var r = orig.apply(this, arguments);
      setTimeout(_augmentProfile, 100);
      return r;
    };
    window._zrz17OpenProfileWrapped = true;
  }

  function _augmentProfile(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_prefs_block')) return;
    var h2 = modal.querySelector('h2');
    if(!h2 || (h2.textContent || '').indexOf('Профиль') < 0) return;

    _injectCss();

    var block = document.createElement('div');
    block.id = 'zrz_prefs_block';
    block.innerHTML = _prefsBlockHtml();

    var btns = modal.querySelectorAll('.btn');
    var anchor = null;
    for(var i=0;i<btns.length;i++){
      var t = (btns[i].textContent || '').trim();
      if(t === 'Закрыть' || t === 'Отмена'){ anchor = btns[i]; break; }
    }
    if(anchor){
      anchor.parentNode.insertBefore(block, anchor);
    } else {
      modal.appendChild(block);
    }

    _bindBlock(block);
  }

  function apply(){
    try { _injectCss(); }catch(e){}
    try { _wrapOpenProfile(); }catch(e){}
    try { _augmentProfile(); }catch(e){}
  }

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  var _iv = setInterval(function(){
    try { _wrapOpenProfile(); }catch(e){}
    try { _augmentProfile(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  window.zrzPrefsGet = function(){
    return {
      all: _allGesturesEnabled(),
      longPress: _longPressEnabled(),
      swipes: _swipesEnabled()
    };
  };
  window.zrzPrefsSetAll = _setAllGestures;
  window.zrzPrefsSetLongPress = _setLongPress;
  window.zrzPrefsSetSwipes = _setSwipes;

  try{ console.log('[17 extras p3] настройка жестов в профиле активна'); }catch(_){}
})();
