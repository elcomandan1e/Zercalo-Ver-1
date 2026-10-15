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
/* patches/18-ui-unify.js — Часть 2: Клиенты + Контрагенты */
(function(){
  if(window._zrz18UnifyP2) return;
  window._zrz18UnifyP2 = true;

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

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

  /* ============================================================
     КЛИЕНТЫ
     ============================================================ */

  function _clientFull(c){
    try { if(typeof clientFullName === 'function') return clientFullName(c) || ''; }catch(e){}
    return ((c.lastName||'')+' '+(c.firstName||'')+' '+(c.middleName||'')).trim();
  }
  function _clientPhone(c){
    if(!c) return '';
    return c.phone || c.phoneExtra || '';
  }
  function _clientInitials(c){
    var nm = _clientFull(c) || '?';
    return nm.split(' ').map(function(p){ return p.charAt(0); }).join('').slice(0,2).toUpperCase();
  }

  function _clientRow(c, idx){
    var nm = _clientFull(c) || 'Без имени';
    var phone = _clientPhone(c);
    var initials = _clientInitials(c);
    var ordCount = 0, addrCount = 0;
    try { ordCount = (typeof ordersOfClient === 'function') ? ordersOfClient(c.id).length : 0; }catch(e){}
    try { addrCount = (typeof addressesOfClient === 'function') ? addressesOfClient(c.id).length : 0; }catch(e){}

    var arch = c.archived ? '<span class="zrz-badge" style="background:#f0f4fa;color:#8894a9;margin-left:6px">📦 Архив</span>' : '';

    var subParts = [];
    if(phone) subParts.push('📞 ' + _esc(phone));
    if(addrCount) subParts.push('📍 ' + addrCount);
    if(ordCount) subParts.push('📋 ' + ordCount);

    var html = '<div class="zrz-row uz-row-in" style="animation-delay:' + Math.min(idx*20, 400) + 'ms"'
      + ' data-client-id="' + c.id + '"'
      + ' onclick="openClient(' + c.id + ')">';
    html += '<div class="zrz-row-ico" style="background:linear-gradient(135deg,#7b9dd1,#5b7fb8);color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">' + _esc(initials) + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">' + _esc(nm) + arch + '</div>';
    if(subParts.length){
      html += '<div class="zrz-row-sub">' + subParts.join(' · ') + '</div>';
    } else {
      html += '<div class="zrz-row-sub" style="color:var(--muted-2)">Контакты не заполнены</div>';
    }
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

  function _renderClientsList(){
    var list = (window.db && Array.isArray(window.db.clients)) ? window.db.clients.slice() : [];
    var showArch = (typeof clientsShowArchived !== 'undefined') && clientsShowArchived;
    if(!showArch) list = list.filter(function(c){ return !c.archived; });

    /* Сортировка */
    try {
      if(typeof clientsSortMode !== 'undefined'){
        if(clientsSortMode === 'name') list.sort(function(a,b){ return (_clientFull(a)||'').localeCompare(_clientFull(b)||'','ru'); });
        else if(clientsSortMode === 'created-desc') list.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
        else if(clientsSortMode === 'created-asc') list.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
        else if(clientsSortMode === 'orders') list.sort(function(a,b){
          var oa = (typeof ordersOfClient === 'function') ? ordersOfClient(a.id).length : 0;
          var ob = (typeof ordersOfClient === 'function') ? ordersOfClient(b.id).length : 0;
          return ob - oa;
        });
      }
    } catch(e){}

    /* Поиск */
    try {
      if(typeof clientsSearchQ !== 'undefined' && clientsSearchQ){
        var q = String(clientsSearchQ).trim().toLowerCase();
        if(q) list = list.filter(function(c){
          var addrArr = '';
          try { addrArr = (typeof addressesOfClient === 'function')
            ? addressesOfClient(c.id).map(function(a){ return (typeof addressFull==='function'?addressFull(a):'') + ' ' + (typeof addressShort==='function'?addressShort(a):''); }).join(' ')
            : ''; }catch(e){}
          var s = (_clientFull(c) + ' ' + (c.phone||'') + ' ' + (c.phoneExtra||'') + ' ' + (c.email||'') + ' ' + addrArr).toLowerCase();
          return s.indexOf(q) >= 0;
        });
      }
    } catch(e){}

    if(!list.length){
      return _emptyState({
        ico: '👥',
        title: (typeof clientsSearchQ !== 'undefined' && clientsSearchQ) ? 'Ничего не найдено' : 'Клиентов пока нет',
        sub: (typeof clientsSearchQ !== 'undefined' && clientsSearchQ)
          ? 'Попробуйте другой запрос'
          : 'Создайте первого клиента — добавите ему адреса и заказы.',
        cta: { label: 'Новый клиент', action: 'openClientForm(null)' }
      });
    }

    return list.map(function(c, i){ return _clientRow(c, i); }).join('');
  }

  function _renderClientsTab(){
    if(typeof canManageClients === 'function' && !canManageClients()){
      return '<div class="empty">Нет прав</div>';
    }

    var q = (typeof clientsSearchQ !== 'undefined') ? (clientsSearchQ || '') : '';
    var sort = (typeof clientsSortMode !== 'undefined') ? clientsSortMode : 'name';
    var showArch = (typeof clientsShowArchived !== 'undefined') && clientsShowArchived;

    var total = (window.db && Array.isArray(window.db.clients)) ? window.db.clients.filter(function(c){ return !c.archived; }).length : 0;

    var html = '';
    /* Заголовок экрана */
    html += '<div class="uz-screen-head">';
    html +=   '<div class="uz-screen-title">👥 Клиенты</div>';
    html +=   '<div class="uz-screen-sub">Всего: ' + total + '</div>';
    html += '</div>';

    /* Sticky-поиск */
    html += '<div class="uz-sticky-search">';
    html +=   '<input type="search" placeholder="🔍 ФИО, телефон, адрес" value="' + _esc(q) + '" oninput="onClientsSearchInput(this.value)">';
    html += '</div>';

    /* Сортировка */
    html += '<div class="chips sort-chips" style="margin-bottom:8px">';
    var sortBtns = [
      { k:'name',         l:'А-Я' },
      { k:'created-desc', l:'↓ Новые' },
      { k:'created-asc',  l:'↑ Старые' },
      { k:'orders',       l:'По заказам' }
    ];
    sortBtns.forEach(function(s){
      html += '<button type="button" class="chip sort-chip' + (sort===s.k?' active':'') + '" onclick="setClientsSort(\'' + s.k + '\')">' + s.l + '</button>';
    });
    html += '<button type="button" class="chip sort-chip' + (showArch?' active':'') + '" onclick="toggleClientsArchived()">' + (showArch?'✓ Архив':'📦 Архив') + '</button>';
    html += '</div>';

    /* Кнопка добавления */
    if(typeof canManageClients === 'function' && canManageClients() && total > 0){
      html += '<div class="uz-add-bar">';
      html +=   '<button type="button" class="btn btn-primary" onclick="openClientForm(null)" style="width:100%">+ Новый клиент</button>';
      html += '</div>';
    }

    /* Список */
    html += '<div id="clientsList">' + _renderClientsList() + '</div>';

    html += '<div class="footer-brand">'
          + (typeof LOGO_MARK === 'function' ? LOGO_MARK(20) : '')
          + '<span>Зерцало • клиенты</span></div>';
    return html;
  }

  /* ============================================================
     КОНТРАГЕНТЫ
     ============================================================ */

  function _catInfo(k){
    try { if(typeof contractorCategoryInfo === 'function') return contractorCategoryInfo(k); }catch(e){}
    return { label:k||'—', ico:'📍' };
  }

  function _contractorRow(c, idx){
    var cat = _catInfo(c.category);
    var addr = c.addressId && window.db && Array.isArray(window.db.addresses)
      ? window.db.addresses.find(function(a){ return a.id === c.addressId; })
      : null;
    var addrLine = (typeof addressShort === 'function') ? addressShort(addr) : '';
    var arch = c.archived ? '<span class="zrz-badge" style="background:#f0f4fa;color:#8894a9;margin-left:6px">📦 Архив</span>' : '';

    var subParts = [];
    if(c.contactName) subParts.push('👤 ' + _esc(c.contactName));
    if(c.phone)       subParts.push('📞 ' + _esc(c.phone));
    if(addrLine)      subParts.push('📍 ' + _esc(addrLine));

    var html = '<div class="zrz-row uz-row-in" style="animation-delay:' + Math.min(idx*20, 400) + 'ms"'
      + ' data-contractor-id="' + c.id + '"'
      + ' onclick="openContractorForm(' + c.id + ')">';
    html += '<div class="zrz-row-ico" style="font-size:22px">' + cat.ico + '</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">' + _esc(c.name||'Без названия') + arch + '</div>';
    html +=   '<div class="zrz-row-sub">'
      + '<span class="zrz-badge" style="background:var(--accent-soft);color:var(--accent-deep);margin-right:4px">' + _esc(cat.label) + '</span>'
      + (subParts.length ? (' · ' + subParts.join(' · ')) : '')
      + '</div>';
    html += '</div>';
    if(c.phone){
      html += '<button type="button" class="zrz-row-action" aria-label="Позвонить"'
        + ' onclick="event.stopPropagation();window.location.href=\'tel:' + String(c.phone).replace(/[^+\d]/g,'') + '\'">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>'
        + '</button>';
    }
    html += '</div>';
    return html;
  }

  function _renderContractorsList(){
    var list = (window.db && Array.isArray(window.db.contractors)) ? window.db.contractors.slice() : [];
    var showArch = (typeof contractorsShowArchived !== 'undefined') && contractorsShowArchived;
    if(!showArch) list = list.filter(function(c){ return !c.archived; });

    list.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''),'ru'); });

    try {
      if(typeof contractorsSearchQ !== 'undefined' && contractorsSearchQ){
        var q = String(contractorsSearchQ).trim().toLowerCase();
        if(q) list = list.filter(function(c){
          var addr = c.addressId && window.db && Array.isArray(window.db.addresses)
            ? window.db.addresses.find(function(a){ return a.id === c.addressId; })
            : null;
          var s = (c.name + ' ' + (c.contactName||'') + ' ' + (c.phone||'') + ' ' + (c.email||'') + ' ' + (addr ? ((typeof addressShort==='function'?addressShort(addr):'') + ' ' + (typeof addressFull==='function'?addressFull(addr):'')) : '')).toLowerCase();
          return s.indexOf(q) >= 0;
        });
      }
    } catch(e){}

    if(!list.length){
      return _emptyState({
        ico: '🏢',
        title: (typeof contractorsSearchQ !== 'undefined' && contractorsSearchQ) ? 'Ничего не найдено' : 'Контрагентов пока нет',
        sub: (typeof contractorsSearchQ !== 'undefined' && contractorsSearchQ)
          ? 'Попробуйте другой запрос'
          : 'Поставщики, партнёры, склады. Их можно включать в маршруты.',
        cta: { label: 'Новый контрагент', action: 'openContractorForm(null)' }
      });
    }

    return list.map(function(c, i){ return _contractorRow(c, i); }).join('');
  }

  function _renderContractorsTab(){
    if(typeof canManageContractors === 'function' && !canManageContractors()){
      return '<div class="empty">Нет прав</div>';
    }

    var q = (typeof contractorsSearchQ !== 'undefined') ? (contractorsSearchQ || '') : '';
    var showArch = (typeof contractorsShowArchived !== 'undefined') && contractorsShowArchived;

    var total = (window.db && Array.isArray(window.db.contractors)) ? window.db.contractors.filter(function(c){ return !c.archived; }).length : 0;

    var html = '';
    html += '<div class="uz-screen-head">';
    html +=   '<div class="uz-screen-title">🏢 Контрагенты</div>';
    html +=   '<div class="uz-screen-sub">Всего: ' + total + '</div>';
    html += '</div>';

    html += '<div class="uz-sticky-search">';
    html +=   '<input type="search" placeholder="🔍 Название, контакт, телефон" value="' + _esc(q) + '" oninput="onContractorsSearchInput(this.value)">';
    html += '</div>';

    html += '<div class="chips sort-chips" style="margin-bottom:8px">';
    html += '<button type="button" class="chip sort-chip' + (showArch?' active':'') + '" onclick="toggleContractorsArchived()">' + (showArch?'✓ Архив':'📦 Архив') + '</button>';
    html += '</div>';

    if(typeof canManageContractors === 'function' && canManageContractors() && total > 0){
      html += '<div class="uz-add-bar">';
      html +=   '<button type="button" class="btn btn-primary" onclick="openContractorForm(null)" style="width:100%">+ Новый контрагент</button>';
      html += '</div>';
    }

    html += '<div id="contractorsList">' + _renderContractorsList() + '</div>';

    html += '<div class="footer-brand">'
          + (typeof LOGO_MARK === 'function' ? LOGO_MARK(20) : '')
          + '<span>Зерцало • контрагенты</span></div>';
    return html;
  }

  /* ============================================================
     ОБЁРТКИ
     ============================================================ */

  function _override(){
    window.renderClientsList     = _renderClientsList;
    window.renderClientsTab      = _renderClientsTab;
    window.renderContractorsList = _renderContractorsList;
    window.renderContractorsTab  = _renderContractorsTab;
  }

  function apply(){
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

  try{ console.log('[18 unify p2] единые строки для клиентов и контрагентов'); }catch(_){}
})();
/* patches/18-ui-unify.js — Часть 3: Маршруты + «Ещё» */
/* patches/18-ui-unify.js — Часть 3: Маршруты + «Ещё» */
(function(){
  if(window._zrz18UnifyP3) return;
  window._zrz18UnifyP3 = true;

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

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

  /* ============================================================
     МАРШРУТЫ
     ============================================================ */

  function _routeRow(r, idx){
    var pts = Array.isArray(r.points) ? r.points : [];
    var driver = r.assignedUserId && window.db && Array.isArray(window.db.users)
      ? window.db.users.find(function(u){ return u.id === r.assignedUserId; })
      : null;

    var dateLbl = '';
    try {
      if(r.date && typeof ymdToDate === 'function'){
        var d = ymdToDate(r.date);
        if(d) dateLbl = String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0');
      }
    } catch(e){}
    if(!dateLbl && r.date) dateLbl = r.date;

    /* Первые 3 точки для превью */
    var preview = [];
    for(var i=0; i<Math.min(pts.length, 3); i++){
      var p = pts[i];
      var lbl = '';
      if(p.kind === 'order' && p.refId && window.db && Array.isArray(window.db.orders)){
        var o = window.db.orders.find(function(x){ return x.id === p.refId; });
        if(o) lbl = '№' + (o.orderNum||'') + ' ' + ((typeof orderClientName==='function'?orderClientName(o):'') || '');
      } else if(p.kind === 'contractor' && p.refId && window.db && Array.isArray(window.db.contractors)){
        var co = window.db.contractors.find(function(x){ return x.id === p.refId; });
        if(co) lbl = co.name || 'Контрагент';
      } else {
        lbl = p.label || 'Свободный';
      }
      if(lbl) preview.push(lbl);
    }
    var previewLine = preview.length ? preview.join(' → ') + (pts.length > 3 ? ' → +' + (pts.length-3) : '') : 'точек нет';

    var subParts = [];
    if(dateLbl) subParts.push('📅 ' + _esc(dateLbl));
    if(driver)  subParts.push('🚚 ' + _esc(driver.name.split(' ')[0]));
    subParts.push('📍 ' + pts.length);

    var html = '<div class="zrz-row uz-row-in" style="animation-delay:' + Math.min(idx*25, 400) + 'ms"'
      + ' data-route-id="' + r.id + '"'
      + ' onclick="openRoute(' + r.id + ')">';
    html += '<div class="zrz-row-ico" style="font-size:22px">🚚</div>';
    html += '<div class="zrz-row-body">';
    html +=   '<div class="zrz-row-title">' + _esc(r.title || 'Маршрут') + '</div>';
    html +=   '<div class="zrz-row-sub">' + subParts.join(' · ') + '</div>';
    html +=   '<div class="zrz-row-sub" style="color:var(--muted-2);font-size:11.5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(previewLine) + '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function _renderRoutesList(){
    var routes = (window.db && Array.isArray(window.db.routes)) ? window.db.routes.slice() : [];
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    try {
      if(u && typeof userCan === 'function' && !userCan('routes.viewAll')){
        routes = routes.filter(function(r){ return r.assignedUserId === u.id; });
      }
    } catch(e){}

    /* Группировка по дате */
    var today = (typeof dateToYmd === 'function') ? dateToYmd(new Date()) : '';
    var tomorrow = '';
    try {
      var t = new Date(); t.setDate(t.getDate()+1);
      if(typeof dateToYmd === 'function') tomorrow = dateToYmd(t);
    } catch(e){}

    routes.sort(function(a,b){ return String(a.date||'9999').localeCompare(String(b.date||'9999')); });

    if(!routes.length){
      return _emptyState({
        ico: '🚚',
        title: 'Маршрутов нет',
        sub: 'Создайте маршрут — добавьте точки: заказы, контрагенты, свободные адреса.',
        cta: { label: 'Новый маршрут', action: 'openRouteForm(null)' }
      });
    }

    /* Группировка */
    var groups = {};
    routes.forEach(function(r){
      var k = r.date || 'nodate';
      if(!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    var keys = Object.keys(groups).sort();

    var html = '';
    keys.forEach(function(k){
      var label = '';
      if(k === 'nodate') label = '📋 Без даты';
      else if(k === today) label = '🔥 Сегодня';
      else if(k === tomorrow) label = '📅 Завтра';
      else {
        try {
          if(typeof ymdToDate === 'function'){
            var d = ymdToDate(k);
            if(d){
              var months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
              label = d.getDate() + ' ' + months[d.getMonth()];
            } else label = k;
          } else label = k;
        } catch(e){ label = k; }
      }
      html += '<div class="uz-group-head">' + _esc(label) + '</div>';
      groups[k].forEach(function(r, i){ html += _routeRow(r, i); });
    });

    return html;
  }

  function _renderRoutesTab(){
    var html = '';
    html += '<div class="uz-screen-head">';
    html +=   '<div class="uz-screen-title">🚚 Маршруты</div>';
    html +=   '<div class="uz-screen-sub">Мои и общие</div>';
    html += '</div>';

    var canManage = false;
    try { canManage = (typeof canManageRoutes === 'function') && canManageRoutes(); } catch(e){}
    if(canManage){
      html += '<div class="uz-add-bar">';
      html +=   '<button type="button" class="btn btn-primary" onclick="openRouteForm(null)" style="width:100%">+ Новый маршрут</button>';
      html += '</div>';
    }

    html += '<div id="routesList">' + _renderRoutesList() + '</div>';

    html += '<div class="footer-brand">'
          + (typeof LOGO_MARK === 'function' ? LOGO_MARK(20) : '')
          + '<span>Зерцало • маршруты</span></div>';
    return html;
  }

  /* ============================================================
     «ЕЩЁ» — единый стиль секций
     ============================================================ */

  function _moreSection(title, items){
    if(!items.length) return '';
    var html = '<div class="uz-group-head">' + _esc(title) + '</div>';
    html += '<div class="uz-more-block" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';
    items.forEach(function(it){
      html += '<div class="zrz-row" onclick="' + it.action + '" style="margin-bottom:0">';
      html +=   '<div class="zrz-row-ico" style="font-size:20px">' + it.ico + '</div>';
      html +=   '<div class="zrz-row-body">';
      html +=     '<div class="zrz-row-title">' + _esc(it.label) + '</div>';
      if(it.sub) html += '<div class="zrz-row-sub">' + _esc(it.sub) + '</div>';
      html +=   '</div>';
      html +=   '<div style="font-size:18px;color:var(--muted-2);flex-shrink:0">›</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function _renderMoreTab(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';

    /* KPI-полоса сверху */
    var ordersCnt = 0, clientsCnt = 0, routesCnt = 0;
    try { ordersCnt = (typeof visibleOrders === 'function') ? visibleOrders().length : 0; }catch(e){}
    try { clientsCnt = (window.db && Array.isArray(window.db.clients)) ? window.db.clients.filter(function(c){ return !c.archived; }).length : 0; }catch(e){}
    try { routesCnt = (window.db && Array.isArray(window.db.routes)) ? window.db.routes.length : 0; }catch(e){}

    var html = '';
    html += '<div class="uz-screen-head">';
    html +=   '<div class="uz-screen-title">Ещё</div>';
    html +=   '<div class="uz-screen-sub">Работа, команда, система</div>';
    html += '</div>';

    /* KPI-полоса */
    html += '<div class="uz-kpi-strip">';
    html +=   '<div class="zrz-kpi-cell"><div class="zrz-kpi-ico">📋</div><div class="zrz-kpi-val">' + ordersCnt + '</div><div class="zrz-kpi-lbl">заказов</div></div>';
    html +=   '<div class="zrz-kpi-cell"><div class="zrz-kpi-ico">👥</div><div class="zrz-kpi-val">' + clientsCnt + '</div><div class="zrz-kpi-lbl">клиентов</div></div>';
    html +=   '<div class="zrz-kpi-cell"><div class="zrz-kpi-ico">🚚</div><div class="zrz-kpi-val">' + routesCnt + '</div><div class="zrz-kpi-lbl">маршрутов</div></div>';
    html += '</div>';

    /* Работа */
    var work = [];
    if(typeof userCan === 'function' && (userCan('routes.viewOwn') || userCan('routes.viewAll') || userCan('routes.manage'))){
      work.push({ ico:'🚚', label:'Маршруты', sub:'Все маршруты', action:'activeTab=\'calendar\';calState.section=\'routes\';render();window.scrollTo(0,0)' });
    }
    if(typeof canManageContractors === 'function' && canManageContractors()){
      var coCnt = (window.db && Array.isArray(window.db.contractors)) ? window.db.contractors.filter(function(c){ return !c.archived; }).length : 0;
      work.push({ ico:'🏢', label:'Контрагенты', sub: coCnt + ' активных', action:'activeTab=\'contractors\';render();window.scrollTo(0,0)' });
    }
    if(typeof userCan === 'function' && userCan('orders.pricing')){
      work.push({ ico:'📋', label:'Прайс-лист', sub:'Настроить цены', action:'openPriceBook()' });
    }
    if(typeof canViewReports === 'function' && canViewReports()){
      work.push({ ico:'📊', label:'Отчёты', sub:'Статистика и выручка', action:'openReports()' });
    }
    if(typeof canViewTrash === 'function' && canViewTrash()){
      var trashCnt = (window.db && Array.isArray(window.db.trash)) ? window.db.trash.length : 0;
      work.push({ ico:'🗑', label:'Корзина', sub: trashCnt ? (trashCnt + ' записей') : 'Пусто', action:'openTrash()' });
    }
    html += _moreSection('Работа', work);

    /* Команда */
    var team = [];
    if(typeof canManageUsers === 'function' && canManageUsers()){
      var usrCnt = (window.db && Array.isArray(window.db.users)) ? window.db.users.filter(function(x){ return x.active; }).length : 0;
      team.push({ ico:'👥', label:'Пользователи', sub: usrCnt + ' активных', action:'openUsers()' });
      team.push({ ico:'⚙️', label:'Роли и права', sub:'Настройка разрешений', action:'openRolesSettings()' });
    }
    html += _moreSection('Команда', team);

    /* Система */
    var sys = [];
    if(typeof canManageSync === 'function' && canManageSync()){
      var syncOn = (window.db && window.db.sync && window.db.sync.enabled);
      sys.push({ ico:'☁️', label:'Синхронизация', sub: syncOn ? '🟢 Активна' : '⚪️ Выключена', action:'openSyncPanel()' });
      var authOk = (window.db && window.db.sync && window.db.sync.authStatus === 'signed');
      sys.push({ ico:'🔐', label:'Безопасность Firebase', sub: authOk ? '🔒 Защищено' : '⚠️ Не настроено', action:'openFirebaseSecurity()' });
    }
    if('Notification' in window && Notification.permission !== 'granted'){
      sys.push({ ico:'🔔', label:'Включить push', sub:'Уведомления о событиях', action:'requestNotifPermission().then(function(){render();})' });
    }
    if((typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) || (u && u.role === 'admin')){
      sys.push({ ico:'🧪', label:'Тестовый стенд', sub:'Автотесты + галерея', action:'openTestStand()' });
    }
    html += _moreSection('Система', sys);

    /* Справка */
    var help = [];
    if(typeof canViewHelp === 'function' && canViewHelp()){
      help.push({ ico:'📖', label:'Помощь', sub:'Инструкция', action:'openHelp()' });
      help.push({ ico:'📚', label:'Документация', sub:'Всё по приложению', action:'openDocs()' });
    }
    html += _moreSection('Справка', help);

    /* Аккаунт */
    var acc = [];
    acc.push({ ico:'👤', label:'Профиль', sub: u.name, action:'openProfile()' });
    acc.push({ ico:'⚙️', label:'Настройки', sub:'Компания, тема, прайс', action:'openSettings()' });
    html += _moreSection('Аккаунт', acc);

    /* Кнопка выйти */
    html += '<button class="btn btn-danger" onclick="doLogout()" style="margin-top:14px">🚪 Выйти из аккаунта</button>';

    html += '<div class="footer-brand" style="margin-top:20px">'
          + (typeof LOGO_MARK === 'function' ? LOGO_MARK(20) : '')
          + '<span>Зерцало</span></div>';
    return html;
  }

  /* ============================================================
     ОБЁРТКИ
     ============================================================ */

  function _override(){
    window.renderRoutesTab    = _renderRoutesTab;
    window.renderRoutesList   = _renderRoutesList;
    window.renderMoreTab      = _renderMoreTab;
  }

  function apply(){
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

  try{ console.log('[18 unify p3] маршруты + единый экран «Ещё»'); }catch(_){}
})();
/* patches/18-ui-unify.js — Часть 4: Skeleton, pull-to-refresh, финальные штрихи */
/* patches/18-ui-unify.js — Часть 4: Skeleton, pull-to-refresh, полировка */
(function(){
  if(window._zrz18UnifyP4) return;
  window._zrz18UnifyP4 = true;

  /* ============================================================
     SKELETON-ЗАГРУЗКА
     Пока идёт pull из Firebase и локально пусто — показываем
     серые плейсхолдеры вместо пустого экрана.
     ============================================================ */

  var _loading = false;
  var _loadingEls = [];

  function _showSkeleton(cnt){
    cnt = Math.min(Math.max(cnt || 5, 3), 10);
    var h = '';
    for(var i=0;i<cnt;i++) h += '<div class="uz-skel uz-skel-row"></div>';
    return h;
  }

  function _injectSkeleton(targetSelector, cnt){
    try {
      var el = document.querySelector(targetSelector);
      if(!el) return;
      if(el.dataset.uzSkeleton === '1') return;
      el.dataset.uzSkeleton = '1';
      el.innerHTML = _showSkeleton(cnt);
      _loadingEls.push(el);
    } catch(e){}
  }

  function _removeSkeleton(){
    _loadingEls.forEach(function(el){
      try { delete el.dataset.uzSkeleton; } catch(e){ el.removeAttribute('data-uz-skeleton'); }
    });
    _loadingEls = [];
  }

  /* Ловим момент когда приложение показывает пустой экран
     сразу после overlay «Загружаем базу» — заменяем на skeleton */
  function _watchLoadingState(){
    if(_loading) return;
    try {
      /* Если уже загружено — не трогаем */
      if(window._fbLastPullDone) return;
      /* Если данные уже есть локально — не показываем skeleton */
      var d = window.db || {};
      var hasData = (d.orders||[]).length + (d.events||[]).length + (d.clients||[]).length > 0;
      if(hasData) return;

      /* Если overlay загрузки уже показан — покажем skeleton под ним */
      var overlay = document.getElementById('zrz-load-overlay');
      if(overlay) return;

      /* На экране пусто и мы тянем — показываем skeleton */
      var app = document.getElementById('app');
      if(!app) return;
      var empty = app.querySelector('.uz-empty, .empty');
      if(empty && !app.querySelector('.uz-skel')){
        var target = app.querySelector('#orderList, #clientsList, #routesList, #contractorsList');
        if(target) _injectSkeleton('#' + target.id, 5);
      }
    } catch(e){}
  }

  setInterval(_watchLoadingState, 800);

  /* Когда данные подтянулись — убираем skeleton */
  try {
    var origRender = window.render;
    if(typeof origRender === 'function' && !window._zrz18RenderWrapped){
      window._zrz18RenderWrapped = true;
      window.render = function(){
        _removeSkeleton();
        return origRender.apply(this, arguments);
      };
    }
  } catch(e){}

  /* ============================================================
     PULL-TO-REFRESH
     Уже есть на дашборде, расширяем на все экраны.
     Единый красивый индикатор сверху.
     ============================================================ */

  function _enhancePullToRefresh(){
    if(window._zrz18PtrBound) return;
    window._zrz18PtrBound = true;

    /* CSS индикатора */
    if(!document.getElementById('uz-ptr-css')){
      var st = document.createElement('style');
      st.id = 'uz-ptr-css';
      st.textContent = [
        '.uz-ptr-indicator{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-60px);',
          'background:linear-gradient(135deg,#7b9dd1,#5b7fb8);color:#fff;',
          'padding:10px 20px;border-radius:0 0 16px 16px;font-size:13px;font-weight:700;',
          'z-index:200;box-shadow:0 4px 14px rgba(91,127,184,.35);',
          'transition:transform .28s cubic-bezier(.34,1.56,.64,1);',
          'display:flex;align-items:center;gap:8px;font-family:Onest,system-ui,sans-serif}',
        '.uz-ptr-indicator.uz-ptr-on{transform:translateX(-50%) translateY(0)}',
        '.uz-ptr-spin{width:14px;height:14px;border-radius:50%;',
          'border:2px solid rgba(255,255,255,.4);border-top-color:#fff;',
          'animation:uzPtrSpin .8s linear infinite;flex-shrink:0}',
        '@keyframes uzPtrSpin{to{transform:rotate(360deg)}}'
      ].join('');
      (document.head || document.documentElement).appendChild(st);
    }

    var ind = document.createElement('div');
    ind.className = 'uz-ptr-indicator';
    ind.innerHTML = '<div class="uz-ptr-spin"></div><span>Обновляем…</span>';
    document.body.appendChild(ind);

    var startY = 0;
    var pulling = false;
    var maxPull = 0;

    document.addEventListener('touchstart', function(e){
      var app = document.getElementById('app');
      if(!app) return;
      if(app.scrollTop > 4 && window.scrollY > 4) return;
      if(e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      pulling = true;
      maxPull = 0;
    }, { passive: true });

    document.addEventListener('touchmove', function(e){
      if(!pulling) return;
      var dy = e.touches[0].clientY - startY;
      if(dy > maxPull) maxPull = dy;
      /* Показываем индикатор если потянули больше 90px */
      if(maxPull > 90 && !ind.classList.contains('uz-ptr-on')){
        ind.classList.add('uz-ptr-on');
        try { if(navigator.vibrate) navigator.vibrate(8); } catch(_){}
      }
    }, { passive: true });

    document.addEventListener('touchend', function(){
      if(!pulling) return;
      pulling = false;
      if(maxPull > 90){
        /* Запускаем синхронизацию */
        try {
          if(typeof schedulePull === 'function') schedulePull();
          if(typeof syncNow === 'function'){
            syncNow().catch(function(){}).then(function(){
              setTimeout(function(){ ind.classList.remove('uz-ptr-on'); }, 300);
            });
            setTimeout(function(){ ind.classList.remove('uz-ptr-on'); }, 4000);
            return;
          }
        } catch(e){}
        setTimeout(function(){ ind.classList.remove('uz-ptr-on'); }, 800);
      } else {
        ind.classList.remove('uz-ptr-on');
      }
      maxPull = 0;
    }, { passive: true });
  }

  /* ============================================================
     ПЛАВНЫЕ ПЕРЕХОДЫ МЕЖДУ ЭКРАНАМИ
     ============================================================ */

  function _enhancePageTransitions(){
    if(window._zrz18PageFadeBound) return;
    window._zrz18PageFadeBound = true;

    if(!document.getElementById('uz-page-css')){
      var st = document.createElement('style');
      st.id = 'uz-page-css';
      st.textContent = [
        '#app{transition:opacity .18s ease}',
        '#app.uz-fade-out{opacity:0}',
        '.tabbar-btn{transition:color .16s ease,background .16s ease}'
      ].join('');
      (document.head || document.documentElement).appendChild(st);
    }
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { _enhancePullToRefresh(); }catch(e){}
    try { _enhancePageTransitions(); }catch(e){}
  }

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  var _iv = setInterval(function(){
    try { _enhancePullToRefresh(); }catch(e){}
    try { _enhancePageTransitions(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[18 unify p4] skeleton, pull-to-refresh, полировка'); }catch(_){}
})();
