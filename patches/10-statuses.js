/* patches/10-statuses.js — новая система статусов заказа
   · 10 статусов, сгруппированных по фазам: Договор / Работа / Финал / Особые
   · Цветовая гамма по фазам (тёплая → холодная → зелёная)
   · Прогресс-бар в карточке заказа (тонкая полоска снизу)
   · Большой прогресс-бар в деталях заказа
   · Кнопка «Следующий шаг» — перевод в следующий статус одним тапом
   · Сгруппированные кнопки статуса в деталях
   · Миграция старых статусов: new → lead, cancelled → declined
*/
(function(){
  if(window._zrz10Statuses) return;
  window._zrz10Statuses = true;

  /* ============================================================
     КОНСТАНТЫ
     ============================================================ */

  var FLOW = ['lead','measure_scheduled','measure_done','approval','work','ready','installed','closed'];

  var STATUS_GROUPS = [
    { key:'deal',    label:'Договор', statuses:['lead','measure_scheduled','measure_done'] },
    { key:'inwork',  label:'Работа',  statuses:['approval','work','ready'] },
    { key:'final',   label:'Финал',   statuses:['installed','closed'] },
    { key:'special', label:'Особые',  statuses:['paused','declined'] }
  ];

  var NEW_STATUSES = {
    lead:              { label:'📋 Заявка',            color:'#b45309', bg:'#fef3c7' },
    measure_scheduled: { label:'📅 Замер',             color:'#b45309', bg:'#fde68a' },
    measure_done:      { label:'📐 Замер выполнен',    color:'#92400e', bg:'#fcd34d' },
    approval:          { label:'✏️ Согласование',      color:'#1e40af', bg:'#dbeafe' },
    work:              { label:'🔧 В работе',          color:'#1e40af', bg:'#bfdbfe' },
    ready:             { label:'🚚 Ожидает монтажа',   color:'#1e3a8a', bg:'#93c5fd' },
    installed:         { label:'🏠 Установлен',        color:'#166534', bg:'#bbf7d0' },
    closed:            { label:'✓ Закрыт',             color:'#14532d', bg:'#86efac' },
    paused:            { label:'⏸ Пауза',              color:'#475569', bg:'#e2e8f0' },
    declined:          { label:'❌ Отменён',           color:'#991b1b', bg:'#fecaca' }
  };

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function statusPhase(s){
    if(s === 'paused')   return 'paused';
    if(s === 'declined') return 'declined';
    if(s === 'lead' || s === 'measure_scheduled' || s === 'measure_done') return 'deal';
    if(s === 'approval' || s === 'work' || s === 'ready') return 'work';
    if(s === 'installed' || s === 'closed') return 'final';
    return 'deal';
  }

  function statusProgress(s){
    var i = FLOW.indexOf(s);
    if(i < 0) return 0;
    return i / (FLOW.length - 1);
  }

  function statusStepIndex(s){
    var i = FLOW.indexOf(s);
    return i >= 0 ? (i + 1) : 0;
  }

  function nextStatus(s){
    if(s === 'closed') return null;
    if(s === 'paused' || s === 'declined') return 'lead';
    var i = FLOW.indexOf(s);
    if(i < 0) return 'lead';
    if(i >= FLOW.length - 1) return null;
    return FLOW[i + 1];
  }

  window.zrzNextStatus = nextStatus;
  window.zrzStatusPhase = statusPhase;

  /* ============================================================
     1. МИГРАЦИЯ СТАРЫХ СТАТУСОВ
     ============================================================ */

  function migrateOldStatuses(){
    try {
      if(!window.db || !Array.isArray(db.orders)) return;
      var changed = false;
      db.orders.forEach(function(o){
        if(o.status === 'new'){ o.status = 'lead'; changed = true; }
        else if(o.status === 'cancelled'){ o.status = 'declined'; changed = true; }
      });
      if(changed && typeof save === 'function') save();
    }catch(e){ try{console.warn('[10-statuses] migrate', e);}catch(_){} }
  }

  /* ============================================================
     2. УСТАНОВКА НОВЫХ СТАТУСОВ
     ============================================================ */

  function installStatuses(){
    try {
      if(typeof STATUS_META === 'undefined' || !STATUS_META) return false;
      if(STATUS_META.measure_scheduled) return true; /* уже установлено */

      /* Удаляем все существующие ключи */
      Object.keys(STATUS_META).forEach(function(k){
        try { delete STATUS_META[k]; }catch(e){}
      });

      /* Добавляем в нужном порядке */
      Object.keys(NEW_STATUSES).forEach(function(k){
        STATUS_META[k] = NEW_STATUSES[k];
      });

      /* Псевдоним new → lead (для fallback в ядре: STATUS_META.new) */
      try {
        Object.defineProperty(STATUS_META, 'new', {
          value: STATUS_META.lead,
          enumerable: false,
          writable: true,
          configurable: true
        });
      }catch(e){}

      return true;
    }catch(e){ try{console.warn('[10-statuses] install', e);}catch(_){} return false; }
  }

  /* ============================================================
     3. HTML-БЛОКИ
     ============================================================ */

  function buildBigStatusBlock(o){
    var cur = o.status;
    var curInfo = (typeof STATUS_META !== 'undefined' && STATUS_META[cur]) ? STATUS_META[cur] : {label:'—'};
    var phase = statusPhase(cur);
    var isSpecial = (phase === 'paused' || phase === 'declined');
    var stepN = statusStepIndex(cur);
    var stepMax = FLOW.length;
    var pct = statusProgress(cur) * 100;

    var html = '';
    html += '<div class="section-title" style="margin-top:14px">Статус</div>';

    /* Большой блок статуса */
    html += '<div class="zrz-sb zrz-sb-' + phase + '">';
    html +=   '<div class="zrz-sb-head">';
    html +=     '<span class="zrz-sb-cur">' + esc2(curInfo.label) + '</span>';
    html +=     '<span class="zrz-sb-count">' + (isSpecial ? (cur === 'paused' ? '⏸' : '✕') : (stepN + ' / ' + stepMax)) + '</span>';
    html +=   '</div>';
    if(!isSpecial){
      html +=   '<div class="zrz-sb-bar"><div class="zrz-sb-fill" style="width:' + pct.toFixed(1) + '%"></div></div>';
    }
    html += '</div>';

    /* Кнопка «Следующий шаг» */
    var nxt = nextStatus(cur);
    if(nxt){
      var nextInfo = (STATUS_META && STATUS_META[nxt]) ? STATUS_META[nxt] : {label:nxt};
      var hintText = (cur === 'paused' || cur === 'declined') ? 'Возобновить' : 'Следующий шаг';
      html += '<button type="button" class="zrz-sb-next" onclick="zrzAdvanceStatus(' + o.id + ')">';
      html +=   '<span class="zrz-sb-next-ico">➜</span>';
      html +=   '<span class="zrz-sb-next-text">';
      html +=     '<span class="zrz-sb-next-hint">' + esc2(hintText) + '</span>';
      html +=     '<span class="zrz-sb-next-lbl">' + esc2(nextInfo.label) + '</span>';
      html +=   '</span>';
      html += '</button>';
    } else if(cur === 'closed'){
      html += '<div class="zrz-sb-done">✓ Заказ полностью закрыт</div>';
    }

    /* Сгруппированные кнопки */
    STATUS_GROUPS.forEach(function(g){
      var activeInGroup = g.statuses.indexOf(cur) >= 0;
      html += '<div class="zrz-sb-group' + (activeInGroup ? ' zrz-sb-group-active' : '') + '">';
      html +=   '<div class="zrz-sb-group-t">' + esc2(g.label) + '</div>';
      html +=   '<div class="zrz-sb-group-chips">';
      g.statuses.forEach(function(k){
        var info = (STATUS_META && STATUS_META[k]) ? STATUS_META[k] : null;
        if(!info) return;
        var active = (cur === k) ? ' active' : '';
        html += '<button type="button" class="chip' + active + '" onclick="setOrderStatus(' + o.id + ',\'' + k + '\')">' + esc2(info.label) + '</button>';
      });
      html +=   '</div>';
      html += '</div>';
    });

    return html;
  }

  /* ============================================================
     4. ОБЁРТКА renderOrderCard — замена inline-бейджа на класс
     ============================================================ */

  function wrapRenderOrderCard(){
    if(window._zrz10RenderCardWrapped) return;
    if(typeof window.renderOrderCard !== 'function') return;
    var orig = window.renderOrderCard;
    window.renderOrderCard = function(o){
      var html = orig.apply(this, arguments);
      try {
        html = html.replace(
          /<span class="role-badge" style="background:[^;]+;color:[^"]+">/g,
          '<span class="role-badge zrz-st-' + o.status + '">'
        );
      }catch(e){}
      return html;
    };
    window._zrz10RenderCardWrapped = true;
  }

  /* ============================================================
     5. ОБЁРТКА renderDetail
     ============================================================ */

  function wrapRenderDetail(){
    if(window._zrz10RenderDetailWrapped) return;
    if(typeof window.renderDetail !== 'function') return;
    var orig = window.renderDetail;
    window.renderDetail = function(){
      var html = orig.apply(this, arguments);
      try {
        var o = null;
        try { o = db.orders.find(function(x){ return x.id === currentOrderId; }); }catch(e){}
        if(o){
          /* Замена плоского блока статуса на сгруппированный */
          html = html.replace(
            /<div class="section-title"[^>]*>Статус<\/div>\s*<div class="chips">[\s\S]*?<\/div>/,
            function(match){
              return buildBigStatusBlock(o);
            }
          );
          /* Замена inline-стилей у бейджа статуса на класс */
          html = html.replace(
            /<span class="role-badge" style="background:[^;]+;color:[^"]+">/g,
            '<span class="role-badge zrz-st-' + o.status + '">'
          );
        }
      }catch(e){ try{console.warn('[10-statuses] renderDetail', e);}catch(_){} }
      return html;
    };
    window._zrz10RenderDetailWrapped = true;
  }

  /* ============================================================
     6. ПРОГРЕСС-БАР В КАРТОЧКАХ — DOM-инжект после render()
     ============================================================ */

  function injectCardProgress(){
    try {
      var wraps = document.querySelectorAll('.swipe-wrap[data-oid]');
      for(var i=0;i<wraps.length;i++){
        var wrap = wraps[i];
        var oid = parseInt(wrap.getAttribute('data-oid'), 10);
        if(!oid) continue;
        var o = null;
        try { o = db.orders.find(function(x){ return x.id === oid; }); }catch(e){ continue; }
        if(!o) continue;
        var card = wrap.querySelector('.card');
        if(!card) continue;
        if(card.querySelector('.zrz-progress')) continue;

        var phase = statusPhase(o.status);
        var isSpecial = (phase === 'paused' || phase === 'declined');
        var pct = isSpecial ? 100 : (statusProgress(o.status) * 100);

        var bar = document.createElement('div');
        bar.className = 'zrz-progress zrz-progress-' + phase;
        bar.innerHTML = '<div class="zrz-progress-fill" style="width:' + pct.toFixed(1) + '%"></div>';
        card.appendChild(bar);
      }
    }catch(e){ try{console.warn('[10-statuses] injectCardProgress', e);}catch(_){} }
  }

  function wrapRender(){
    if(window._zrz10RenderWrapped) return;
    if(typeof window.render !== 'function') return;
    var orig = window.render;
    window.render = function(){
      var r = orig.apply(this, arguments);
      setTimeout(injectCardProgress, 40);
      return r;
    };
    window._zrz10RenderWrapped = true;
  }

  /* ============================================================
     7. ОБРАБОТЧИК КНОПКИ «СЛЕДУЮЩИЙ ШАГ»
     ============================================================ */

  window.zrzAdvanceStatus = function(orderId){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); }catch(e){}
    if(!o) return;
    var nxt = nextStatus(o.status);
    if(!nxt) return;
    try {
      if(typeof setOrderStatus === 'function'){
        setOrderStatus(orderId, nxt);
      }
    }catch(e){ try{console.warn('[10-statuses] advance', e);}catch(_){} }
  };

  /* ============================================================
     8. CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-statuses-css')) return;

    var css = '';

    /* Бейджи по статусам */
    var variants = {
      'lead':              { bg:'#fef3c7', fg:'#b45309', dbg:'rgba(180,83,9,0.22)',  dfg:'#fbbf24' },
      'measure_scheduled': { bg:'#fde68a', fg:'#b45309', dbg:'rgba(180,83,9,0.30)',  dfg:'#fcd34d' },
      'measure_done':      { bg:'#fcd34d', fg:'#92400e', dbg:'rgba(146,64,14,0.34)', dfg:'#fde68a' },
      'approval':          { bg:'#dbeafe', fg:'#1e40af', dbg:'rgba(30,64,175,0.24)', dfg:'#93c5fd' },
      'work':              { bg:'#bfdbfe', fg:'#1e40af', dbg:'rgba(30,64,175,0.30)', dfg:'#bfdbfe' },
      'ready':             { bg:'#93c5fd', fg:'#1e3a8a', dbg:'rgba(30,58,138,0.34)', dfg:'#dbeafe' },
      'installed':         { bg:'#bbf7d0', fg:'#166534', dbg:'rgba(22,101,52,0.28)', dfg:'#86efac' },
      'closed':            { bg:'#86efac', fg:'#14532d', dbg:'rgba(20,83,45,0.34)',  dfg:'#bbf7d0' },
      'paused':            { bg:'#e2e8f0', fg:'#475569', dbg:'rgba(71,85,105,0.30)', dfg:'#cbd5e1' },
      'declined':          { bg:'#fecaca', fg:'#991b1b', dbg:'rgba(153,27,27,0.24)', dfg:'#fca5a5' }
    };
    Object.keys(variants).forEach(function(k){
      var v = variants[k];
      css += '.role-badge.zrz-st-' + k + '{background:' + v.bg + ' !important;color:' + v.fg + ' !important}';
      css += 'html[data-theme="dark"] .role-badge.zrz-st-' + k + '{background:' + v.dbg + ' !important;color:' + v.dfg + ' !important}';
    });

    /* Прогресс-бар в карточке заказа */
    css += ''
      + '.zrz-progress{position:absolute;left:0;right:0;bottom:0;height:4px;'
      +   'background:rgba(0,0,0,0.06);pointer-events:none}'
      + '.zrz-progress-fill{height:100%;width:0;'
      +   'transition:width .35s cubic-bezier(.2,.7,.3,1);border-radius:0 4px 4px 0}'
      + '.zrz-progress-deal .zrz-progress-fill{background:linear-gradient(90deg,#fbbf24,#f59e0b)}'
      + '.zrz-progress-work .zrz-progress-fill{background:linear-gradient(90deg,#60a5fa,#3b82f6)}'
      + '.zrz-progress-final .zrz-progress-fill{background:linear-gradient(90deg,#4ade80,#22c55e)}'
      + '.zrz-progress-paused .zrz-progress-fill{background:#94a3b8}'
      + '.zrz-progress-declined .zrz-progress-fill{background:#ef4444}'
      + 'html[data-theme="dark"] .zrz-progress{background:rgba(255,255,255,0.06)}'
      ;

    /* Большой блок статуса */
    css += ''
      + '.zrz-sb{margin:4px 0 14px;padding:14px 16px;border-radius:16px;'
      +   'background:linear-gradient(180deg,rgba(91,127,184,0.06),rgba(91,127,184,0.02));'
      +   'border:1.5px solid var(--accent-line)}'
      + '.zrz-sb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}'
      + '.zrz-sb-cur{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.01em}'
      + '.zrz-sb-count{font-size:11.5px;font-weight:800;color:var(--muted);letter-spacing:0.5px}'
      + '.zrz-sb-bar{height:8px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden}'
      + 'html[data-theme="dark"] .zrz-sb-bar{background:rgba(255,255,255,0.08)}'
      + '.zrz-sb-fill{height:100%;width:0;border-radius:4px;'
      +   'transition:width .35s cubic-bezier(.2,.7,.3,1)}'
      + '.zrz-sb-deal .zrz-sb-fill{background:linear-gradient(90deg,#fbbf24,#f59e0b)}'
      + '.zrz-sb-work .zrz-sb-fill{background:linear-gradient(90deg,#60a5fa,#3b82f6)}'
      + '.zrz-sb-final .zrz-sb-fill{background:linear-gradient(90deg,#4ade80,#22c55e)}'
      + '.zrz-sb-paused .zrz-sb-fill{background:#94a3b8}'
      + '.zrz-sb-declined .zrz-sb-fill{background:#ef4444}'
      ;

    /* Кнопка «Следующий шаг» */
    css += ''
      + '.zrz-sb-next{display:flex;align-items:center;gap:12px;width:100%;'
      +   'padding:14px 18px;margin:0 0 14px;border:none;border-radius:16px;'
      +   'background:linear-gradient(135deg,#8badd8,#5b7fb8);color:#fff;'
      +   'font-family:inherit;cursor:pointer;'
      +   'box-shadow:0 8px 22px rgba(91,127,184,0.32);text-align:left;'
      +   'transition:transform .14s ease,box-shadow .18s ease}'
      + '.zrz-sb-next:active{transform:scale(0.98);box-shadow:0 4px 14px rgba(91,127,184,0.38)}'
      + '.zrz-sb-next-ico{font-size:22px;font-weight:800;flex-shrink:0;line-height:1}'
      + '.zrz-sb-next-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}'
      + '.zrz-sb-next-hint{font-size:10.5px;text-transform:uppercase;'
      +   'letter-spacing:1px;font-weight:700;opacity:0.88;line-height:1.2}'
      + '.zrz-sb-next-lbl{font-size:15px;font-weight:800;line-height:1.2;'
      +   'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      ;

    /* Группы кнопок */
    css += ''
      + '.zrz-sb-group{margin-top:12px}'
      + '.zrz-sb-group-t{font-size:11px;font-weight:800;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-left:2px}'
      + '.zrz-sb-group-active .zrz-sb-group-t{color:var(--accent-deep)}'
      + '.zrz-sb-group-chips{display:flex;flex-wrap:wrap;gap:6px}'
      ;

    /* Плашка «закрыт» */
    css += ''
      + '.zrz-sb-done{text-align:center;padding:12px;margin-bottom:14px;'
      +   'border-radius:12px;'
      +   'background:linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04));'
      +   'color:#166534;font-size:14px;font-weight:800;'
      +   'border:1.5px solid rgba(34,197,94,0.28)}'
      + 'html[data-theme="dark"] .zrz-sb-done{color:#86efac;'
      +   'background:linear-gradient(135deg,rgba(34,197,94,0.16),rgba(34,197,94,0.06))}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-statuses-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     9. ЗАПУСК
     ============================================================ */

  function apply(){
    try { installStatuses(); }catch(e){}
    try { wrapRenderOrderCard(); }catch(e){}
    try { wrapRenderDetail(); }catch(e){}
    try { wrapRender(); }catch(e){}
    try { injectCss(); }catch(e){}
    try { injectCardProgress(); }catch(e){}
  }

  /* Миграция данных — один раз при старте */
  try { migrateOldStatuses(); }catch(e){}

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
  setTimeout(apply, 2400);

  /* Форсировать перерисовку после установки — чтобы сразу было видно */
  setTimeout(function(){
    try { if(typeof render === 'function' && typeof currentUser === 'function' && currentUser()) render(); }catch(e){}
  }, 2000);

  /* Раз в 5 секунд проверяем — если ядро пересоздало STATUS_META, восстанавливаем */
  var _iv = setInterval(function(){
    if(typeof STATUS_META !== 'undefined' && !STATUS_META.measure_scheduled){
      installStatuses();
      try { if(typeof render === 'function') render(); }catch(e){}
    }
  }, 5000);
  setTimeout(function(){ clearInterval(_iv); }, 90000);

  try{ console.log('[10-statuses] новая система статусов активна'); }catch(_){}
})();
