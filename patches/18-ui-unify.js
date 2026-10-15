/* patches/18-ui-unify.js — Единый интерфейс v1
   Часть 1: инфраструктура + Заказы
   · Хелперы строк, KPI-полоса, segmented, sticky-search
   · Переопределение renderListBody и renderOrderList
   · Компактные строки в стиле дашборда
   Часть 2: Клиенты + Контрагенты
   Часть 3: Маршруты + «Ещё»
   Часть 4: Skeleton, pull-to-refresh, финальные штрихи
*/
(function(){
  if(window._zrz18UnifyP1) return;
  window._zrz18UnifyP1 = true;

  /* ============================================================
     CSS ДОПОЛНЕНИЯ
     ============================================================ */
  function _injectCss(){
    if(document.getElementById('zrz-unify-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-unify-css';
    st.textContent = [
      /* Sticky поиск */
      '.uz-sticky-search{position:sticky;top:0;z-index:5;padding:10px 0;',
        'background:linear-gradient(180deg,var(--bg-1,#f6f8fc) 70%,transparent);',
        'margin:0 -2px}',
      'html[data-theme="dark"] .uz-sticky-search{background:linear-gradient(180deg,var(--bg-1,#141a24) 70%,transparent)}',
      '.uz-sticky-search input{margin:0;padding:12px 16px;font-size:15px;',
        'border-radius:14px;border:1.5px solid var(--line,#e8eef7);',
        'background:var(--surface,#fff);color:var(--text,#111)}',
      'html[data-theme="dark"] .uz-sticky-search input{background:var(--surface,#1c2431);border-color:var(--line,#232c3b)}',

      /* KPI-полоса сверху */
      '.uz-kpi-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
      '.uz-kpi-strip .zrz-kpi-cell{padding:12px 6px}',

      /* Sticky-заголовок группы */
      '.uz-group-head{position:sticky;top:60px;z-index:4;padding:10px 4px 6px;',
        'font-size:11.5px;font-weight:800;color:var(--muted,#8894a9);',
        'text-transform:uppercase;letter-spacing:1.2px;',
        'background:linear-gradient(180deg,var(--bg-1,#f6f8fc) 60%,transparent)}',
      'html[data-theme="dark"] .uz-group-head{background:linear-gradient(180deg,var(--bg-1,#141a24) 60%,transparent)}',

      /* Skeleton */
      '.uz-skel{background:linear-gradient(90deg,var(--line-soft,#f0f4fa) 25%,var(--line,#e8eef7) 50%,var(--line-soft,#f0f4fa) 75%);',
        'background-size:200% 100%;animation:uzSkel 1.4s infinite;border-radius:10px}',
      'html[data-theme="dark"] .uz-skel{background:linear-gradient(90deg,#1b2230 25%,#232c3b 50%,#1b2230 75%)}',
      '@keyframes uzSkel{0%{background-position:200% 0}100%{background-position:-200% 0}}',
      '.uz-skel-row{height:64px;margin-bottom:8px;border-radius:14px}',

      /* Segmented (единый вид) */
      '.uz-seg{margin-bottom:14px}',

      /* Плавающая кнопка «добавить» — единый стиль */
      '.uz-add-bar{display:flex;gap:8px;margin-bottom:12px}',
      '.uz-add-bar .btn{margin-top:0;padding:13px 16px;font-size:14.5px;border-radius:14px}',

      /* Empty state (переиспользуем) */
      '.uz-empty{padding:44px 22px;text-align:center;border-radius:22px;',
        'background:linear-gradient(180deg,var(--surface,#fff),var(--accent-soft,#eaf1fb));',
        'border:1.5px solid var(--accent-line,#d6e2f3);margin:12px 0}',
      '.uz-empty-ico{font-size:52px;line-height:1;margin-bottom:12px;opacity:.9}',
      '.uz-empty-t{font-size:17px;font-weight:800;color:var(--text,#111);margin-bottom:6px}',
      '.uz-empty-s{font-size:13.5px;color:var(--muted,#666);line-height:1.5;max-width:320px;margin:0 auto}',
      '.uz-empty-cta{margin-top:16px}',

      /* Микроанимация появления строк */
      '.uz-row-in{animation:uzRowIn .3s cubic-bezier(.2,.7,.3,1) both}',
      '@keyframes uzRowIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',

      /* Компактные заголовки экрана */
      '.uz-screen-head{padding:4px 2px 8px}',
      '.uz-screen-title{font-size:22px;font-weight:800;letter-spacing:-.02em;',
        'color:var(--text,#111);line-height:1.2}',
      '.uz-screen-sub{font-size:13.5px;color:var(--muted,#666);margin-top:4px;font-weight:600}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function _fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function _num(s){ return Number(s)||0; }

  function _statusMeta(k){
    try { if(typeof STATUS_META !== 'undefined' && STATUS_META[k]) return STATUS_META[k]; }catch(e){}
    return { label:k||'—', color:'#8894a9', bg:'#f0f4fa' };
  }

  function _typeIco(t){
    try { if(typeof typeInfo === 'function') return typeInfo(t).ico; }catch(e){}
    return '📦';
  }

  function _clientName(o){
    try { if(typeof orderClientName === 'function') return orderClientName(o) || ''; }catch(e){}
    return o.clientName || '';
  }
  function _clientPhone(o){
    try { if(typeof orderClientPhone === 'function') return orderClientPhone(o) || ''; }catch(e){}
    return o.phone || '';
  }
  function _addrShort(o){
    try { if(typeof orderAddressShort === 'function') return orderAddressShort(o) || ''; }catch(e){}
    try { if(typeof orderAddressFull === 'function') return orderAddressFull(o) || ''; }catch(e){}
    return o.address || '';
  }

  function _clientFull(c){
    try { if(typeof clientFullName === 'function') return clientFullName(c) || ''; }catch(e){}
    return ((c.lastName||'')+' '+(c.firstName||'')+' '+(c.middleName||'')).trim();
  }

  function _clientPhone2(c){
    if(!c) return '';
    return c.phone || c.phoneExtra || '';
  }

  function _addrLine(a){
    if(!a) return '';
    try { if(typeof addressShort === 'function') return addressShort(a) || ''; }catch(e){}
    return '';
  }

  /* ---------- Единый empty state ---------- */
  function _emptyState(opts){
    opts = opts || {};
    var h = '<div class="uz-empty">';
    if(opts.ico)  h += '<div class="uz-empty-ico">' + opts.ico + '</div>';
    if(opts.title)h += '<div class="uz-empty-t">' + _esc(opts.title) + '</div>';
    if(opts.sub)  h += '<div class="uz-empty-s">' + _esc(opts.sub) + '</div>';
    if(opts.cta && opts.cta.action){
      h += '<div class="uz-empty-cta"><button type="button" class="btn btn-primary" onclick="' + opts.cta.action + '">'
        + _esc(opts.cta.label) + '</button></div>';
    }
    h += '</div>';
    return h;
  }

  /* ---------- KPI-плитка ---------- */
  function _kpiCell(ico, val, label, key){
    var onclick = key ? (' onclick="zrzKpiClick(\'' + key + '\')"') : '';
    var isClick = key ? ' data-kpi="' + key + '"' : '';
    return '<div class="zrz-kpi-cell"' + isClick + onclick + '>'
      +   '<div class="zrz-kpi-ico">' + ico + '</div>'
      +   '<div class="zrz-kpi-val">' + _esc(val) + '</div>'
      +   '<div class="zrz-kpi-lbl">' + _esc(label) + '</div>'
      + '</div>';
  }

  /* ---------- Компактная строка заказа ---------- */
  function _orderRow(o, idx){
    var items = (typeof itemsOf === 'function') ? itemsOf(o.id) : [];
    var firstType = (items[0] && items[0].type) || 'MIRROR';
    var typeIco = _typeIco(firstType);
    var status = _statusMeta(o.status);
    var nm = _clientName(o) || 'Без имени';
    var addr = _addrShort(o);
    var phone = _clientPhone(o);
    var total = _num(o.orderTotal);
    var paid = _num(o.orderPaid);
    var due = Math.max(0, total - paid);
    var dateLbl = o.orderNum || '';

    var html = '<div class="zrz-row zrz-row-order uz-row-in" data-order-id="' + o.id + '"'
      + ' style="animation-delay:' + Math.min(idx*25, 400) + 'ms"'
      + ' onclick="openOrder(' + o.id + ')">';
    html += '<div class="zrz-row-ico">' + typeIco + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">';
    if(dateLbl) html += '<span class="zrz-row-num">' + _esc(dateLbl) + '</span> ';
    html +=     _esc(nm);
    html +=   '</div>';
    html +=   '<div class="zrz-row-sub">';
    html +=     '<span class="zrz-badge zrz-badge-' + _esc(o.status) + '">' + _esc(status.label) + '</span>';
    if(due > 0) html += ' · <span class="zrz-row-due">' + _fmtMoney(due) + ' ₽</span>';
    if(addr)    html += ' · ' + _esc(addr);
    html +=   '</div>';
    html += '</div>';
    if(phone){
      html += '<button type="button" class="zrz-row-action" aria-label="Позвонить"'
        + ' onclick="event.stopPropagation();window.location.href=\'tel:' + phone.replace(/[^+\d]/g,'') + '\'">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>'
        + '</button>';
    }
    html += '</div>';
    return html;
  }

  /* ============================================================
     ПЕРЕОПРЕДЕЛЕНИЕ renderOrderList
     ============================================================ */

  function _renderOrderList(){
    var list = (typeof visibleOrders === 'function') ? visibleOrders().slice() : [];

    /* Фильтры ядра */
    try {
      if(typeof orderFilters !== 'undefined' && orderFilters){
        if(orderFilters.status)   list = list.filter(function(o){ return o.status === orderFilters.status; });
        if(orderFilters.dateFrom) list = list.filter(function(o){ return (typeof orderDateKey==='function'?orderDateKey(o):'') >= orderFilters.dateFrom; });
        if(orderFilters.dateTo)   list = list.filter(function(o){ return (typeof orderDateKey==='function'?orderDateKey(o):'') <= orderFilters.dateTo; });
        if(orderFilters.team){
          var tid = parseInt(orderFilters.team,10);
          list = list.filter(function(o){ return Array.isArray(o.assignedUserIds) && o.assignedUserIds.indexOf(tid)>=0; });
        }
        if(orderFilters.paid === 'yes') list = list.filter(function(o){ return !!o.paid; });
        if(orderFilters.paid === 'no')  list = list.filter(function(o){ return !o.paid; });
        if(orderFilters.type){
          list = list.filter(function(o){
            var its = (typeof itemsOf==='function') ? itemsOf(o.id) : [];
            return its.some(function(i){ return i.type === orderFilters.type; });
          });
        }
      }
    } catch(e){}

    /* Сортировка */
    try {
      if(typeof sortMode !== 'undefined' && sortMode){
        if(sortMode === 'date-asc')   list.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
        else if(sortMode === 'name')  list.sort(function(a,b){ return (_clientName(a)||'').localeCompare(_clientName(b)||'','ru'); });
        else if(sortMode === 'num')   list.sort(function(a,b){ return (a.orderNum||'').localeCompare(b.orderNum||'','ru',{numeric:true}); });
        else if(sortMode === 'status'){
          var ord = { lead:-1, new:0, work:1, ready:2, installed:3, declined:4, cancelled:5 };
          list.sort(function(a,b){ return (ord[a.status]||0) - (ord[b.status]||0) || (b.createdAt||0)-(a.createdAt||0); });
        } else {
          list.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
        }
      }
    } catch(e){}

    /* Поиск ядра */
    try {
      if(typeof searchQ !== 'undefined' && searchQ){
        var q = String(searchQ).trim().toLowerCase();
        if(q) list = list.filter(function(o){
          var s = (_clientName(o)+' '+(o.orderNum||'')+' '+_addrShort(o)+' '+_clientPhone(o)).toLowerCase();
          return s.indexOf(q) >= 0;
        });
      }
    } catch(e){}

    if(!list.length){
      return _emptyState({
        ico: '📋',
        title: 'Заказов нет',
        sub: (typeof searchQ !== 'undefined' && searchQ) ? 'Попробуйте изменить поиск' :
             ((typeof orderFiltersActive === 'function' && orderFiltersActive()) ? 'Попробуйте сбросить фильтры' : 'Создайте первый заказ'),
        cta: { label: 'Новый заказ', action: 'openNewOrder()' }
      });
    }

    return list.map(function(o, i){ return _orderRow(o, i); }).join('');
  }

  /* ============================================================
     ПЕРЕОПРЕДЕЛЕНИЕ renderListBody (список на «Сегодня»)
     ============================================================ */

  function _renderListBody(){
    /* Возвращаем пустую строку если это не список "все заказы" */
    var orders = (typeof visibleOrders === 'function') ? visibleOrders() : [];
    var hasFilters = (typeof orderFiltersActive === 'function') && orderFiltersActive();
    var hasSearch = (typeof searchQ !== 'undefined') && !!searchQ;
    if(!orders.length && !hasFilters && !hasSearch){
      /* Ничего не показываем — это режим чистого дашборда */
      return '';
    }

    var html = '';
    html += '<div class="uz-group-head">📋 Все заказы</div>';

    /* Sticky поиск */
    html += '<div class="uz-sticky-search">';
    html +=   '<input type="search" placeholder="🔍 Поиск по номеру, клиенту, адресу"'
            +   ' value="' + _esc(typeof searchQ !== 'undefined' ? searchQ : '') + '"'
            +   ' oninput="onSearchInput(this.value)">';
    html += '</div>';

    /* Сортировка + фильтры */
    html += '<div class="chips sort-chips" style="align-items:center;margin-bottom:6px">';
    var sortBtns = [
      { k:'date-desc', l:'↓ Свежие' },
      { k:'date-asc',  l:'↑ Старые' },
      { k:'name',      l:'А-Я' },
      { k:'num',       l:'№' },
      { k:'status',    l:'Статус' }
    ];
    sortBtns.forEach(function(s){
      var act = (typeof sortMode !== 'undefined' && sortMode === s.k) ? ' active' : '';
      html += '<button type="button" class="chip sort-chip' + act + '" onclick="setSortMode(\'' + s.k + '\')">' + s.l + '</button>';
    });
    html += '</div>';

    /* Кнопки фильтров */
    var fCount = (typeof orderFiltersCount === 'function') ? orderFiltersCount() : 0;
    var leadActive = (typeof orderFilters !== 'undefined' && orderFilters && orderFilters.status === 'lead') ? ' active' : '';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap">';
    html += '<button type="button" class="chip sort-chip' + (fCount?' active':'') + '" id="orderFiltersBtn" onclick="toggleOrderFiltersPanel()">🎛 Фильтры' + (fCount?(' ('+fCount+')'):'') + '</button>';
    html += '<button type="button" class="chip sort-chip' + leadActive + '" id="leadsFilterBtn" onclick="toggleLeadsFilter()">📋 Заявки</button>';
    html += '<button type="button" class="chip sort-chip" onclick="openGlobalSearch()">🔎 Искать везде</button>';
    if(fCount) html += '<button type="button" class="chip sort-chip" onclick="clearOrderFilters()">✕ Сбросить</button>';
    html += '</div>';

    /* Панель фильтров */
    html += '<div class="filter-panel" id="orderFiltersPanel" hidden>'
          + (typeof renderOrderFiltersPanel === 'function' ? renderOrderFiltersPanel() : '')
          + '</div>';

    /* Список */
    html += '<div id="orderList">' + _renderOrderList() + '</div>';

    html += '<div class="footer-brand">'
          + (typeof LOGO_MARK === 'function' ? LOGO_MARK(20) : '')
          + '<span>Зерцало • замеры</span></div>';

    return html;
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function _override(){
    window.renderOrderList = _renderOrderList;
    window.renderListBody  = _renderListBody;
  }

  function apply(){
    try { _injectCss(); }catch(e){}
    try { _override(); }catch(e){}
  }

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  var _iv = setInterval(function(){
    try { _override(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[18 unify p1] единые строки для заказов'); }catch(_){}
})();
/* patches/18-ui-unify.js — Часть 2: Клиенты + Контрагенты */
