/* patches/11-status-picker.js — компактный блок статусов
   · Прячет группы кнопок (Договор/Работа/Финал/Особые)
   · Оставляет прогресс-бар + кнопку «Следующий шаг»
   · Добавляет одну кнопку «Изменить статус» → Bottom Sheet
   · Bottom Sheet: список всех 10 статусов с группами и подсветкой
*/
(function(){
  if(window._zrz11StatusPicker) return;
  window._zrz11StatusPicker = true;

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ---------- Список статусов ---------- */
  function buildStatusList(){
    try {
      var meta = (typeof STATUS_META !== 'undefined') ? STATUS_META : null;
      if(!meta) return [];
      /* Порядок как в FLOW */
      var order = ['lead','measure_scheduled','measure_done','approval','work','ready','installed','closed','paused','declined'];
      var groups = [
        {label:'Договор', keys:['lead','measure_scheduled','measure_done']},
        {label:'Работа',  keys:['approval','work','ready']},
        {label:'Финал',   keys:['installed','closed']},
        {label:'Особые',  keys:['paused','declined']}
      ];
      return groups.map(function(g){
        return {
          label: g.label,
          items: g.keys.map(function(k){
            return { key:k, label:(meta[k] ? meta[k].label : k) };
          }).filter(function(x){ return !!meta[x.key]; })
        };
      }).filter(function(g){ return g.items.length > 0; });
    } catch(e){ return []; }
  }

  /* ---------- Открыть Bottom Sheet со статусами ---------- */
  function openStatusSheet(orderId){
    if(document.getElementById('zrz-status-bg')) return;
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); }catch(e){}
    if(!o) return;
    try { if(typeof haptic === 'function') haptic(6); }catch(_){}

    var cur = o.status;
    var groups = buildStatusList();

    var html = '<div class="zrz-status-sheet">';
    html += '<div class="zrz-status-handle"></div>';
    html += '<div class="zrz-status-title">Изменить статус заказа</div>';

    groups.forEach(function(g){
      html += '<div class="zrz-status-sec">';
      html += '<div class="zrz-status-sec-t">' + esc2(g.label) + '</div>';
      html += '<div class="zrz-status-list">';
      g.items.forEach(function(it){
        var active = (cur === it.key) ? ' active' : '';
        html += '<button type="button" class="zrz-status-item' + active + '" data-k="' + esc2(it.key) + '">';
        html +=   '<span class="zrz-status-lbl">' + esc2(it.label) + '</span>';
        html +=   (cur === it.key ? '<span class="zrz-status-check">✓</span>' : '<span class="zrz-status-check"></span>');
        html += '</button>';
      });
      html += '</div>';
      html += '</div>';
    });

    html += '<button type="button" class="zrz-status-close" id="zrz-status-close">Закрыть</button>';
    html += '</div>';

    var bg = document.createElement('div');
    bg.id = 'zrz-status-bg';
    bg.className = 'zrz-status-bg';
    bg.innerHTML = html;
    document.body.appendChild(bg);

    bg.addEventListener('click', function(e){
      if(e.target === bg) closeStatusSheet();
    });
    document.getElementById('zrz-status-close').onclick = closeStatusSheet;

    bg.querySelector('.zrz-status-sheet').addEventListener('click', function(e){
      var btn = e.target.closest('.zrz-status-item');
      if(!btn) return;
      var k = btn.getAttribute('data-k');
      if(!k || k === cur){ closeStatusSheet(); return; }
      if(typeof setOrderStatus === 'function'){
        setOrderStatus(orderId, k);
      }
      try { if(typeof haptic === 'function') haptic([15, 40, 15]); }catch(_){}
      closeStatusSheet();
    });

    /* Свайп вниз для закрытия */
    var sheet = bg.querySelector('.zrz-status-sheet');
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
      if(dy > 90){ closeStatusSheet(); }
      else { sheet.style.transform = ''; }
      sy = null; dy = 0;
    });
  }

  function closeStatusSheet(){
    var el = document.getElementById('zrz-status-bg');
    if(!el) return;
    var sheet = el.querySelector('.zrz-status-sheet');
    if(sheet){
      sheet.style.transition = 'transform .22s ease, opacity .22s ease';
      sheet.style.transform = 'translateY(120%)';
      sheet.style.opacity = '0';
      el.style.transition = 'opacity .22s ease';
      el.style.opacity = '0';
      setTimeout(function(){ el.remove(); }, 220);
    } else {
      el.remove();
    }
  }

  window.zrzOpenStatusSheet = openStatusSheet;
  window.zrzCloseStatusSheet = closeStatusSheet;

  /* ---------- DOM-инжект кнопки «Изменить статус» ---------- */

  function injectPickerButton(){
    var detailApp = document.getElementById('app');
    if(!detailApp) return;
    /* Ищем большой блок статуса */
    var statusBlock = detailApp.querySelector('.zrz-sb');
    if(!statusBlock) return;
    /* Уже вставили? */
    if(detailApp.querySelector('#zrz-status-change-btn')) return;
    /* Нужен orderId */
    var oid = null;
    try { oid = (typeof currentOrderId !== 'undefined') ? currentOrderId : null; }catch(e){}
    if(!oid) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'zrz-status-change-btn';
    btn.className = 'zrz-status-change';
    btn.innerHTML = '<span class="zrz-status-change-ico">☰</span><span>Изменить статус</span>';
    btn.onclick = function(){
      try { openStatusSheet(oid); }catch(e){}
    };

    /* Вставляем ПОСЛЕ кнопки «Следующий шаг» если она есть,
       иначе — сразу после блока прогресс-бара. */
    var nextBtn = detailApp.querySelector('.zrz-sb-next');
    if(nextBtn && nextBtn.parentNode){
      nextBtn.parentNode.insertBefore(btn, nextBtn.nextSibling);
    } else {
      if(statusBlock.parentNode){
        statusBlock.parentNode.insertBefore(btn, statusBlock.nextSibling);
      }
    }
  }

  function wrapRenderDetail(){
    if(window._zrz11RenderDetailWrapped) return;
    if(typeof window.renderDetail !== 'function') return;
    var orig = window.renderDetail;
    window.renderDetail = function(){
      var html = orig.apply(this, arguments);
      setTimeout(injectPickerButton, 60);
      return html;
    };
    window._zrz11RenderDetailWrapped = true;
  }

  /* На случай перерисовок — следим за .zrz-sb */
  function watchForDetail(){
    if(window._zrz11Obs) return;
    window._zrz11Obs = true;
    try {
      var mo = new MutationObserver(function(){
        setTimeout(injectPickerButton, 40);
      });
      var root = document.getElementById('app');
      if(root) mo.observe(root, {childList:true, subtree:true});
    }catch(e){}
  }

  /* ---------- CSS ---------- */

  function injectCss(){
    if(document.getElementById('zrz-status-picker-css')) return;
    var css = '';

    /* Прячем группы кнопок статуса — они внутри .zrz-sb-group */
    css += '.zrz-sb-group{display:none !important}';

    /* Кнопка «Изменить статус» */
    css += ''
      + '.zrz-status-change{display:flex;align-items:center;justify-content:center;gap:10px;'
      +   'width:100%;padding:13px 18px;margin:0 0 14px;'
      +   'border:1.5px solid var(--accent-line);border-radius:14px;'
      +   'background:var(--surface);color:var(--accent-deep);'
      +   'font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;'
      +   'transition:background .14s ease,transform .12s ease}'
      + '.zrz-status-change:hover{background:var(--accent-soft)}'
      + '.zrz-status-change:active{background:var(--accent-soft);transform:scale(0.98)}'
      + '.zrz-status-change-ico{font-size:16px;line-height:1;opacity:0.8}'
      ;

    /* Bottom Sheet */
    css += ''
      + '.zrz-status-bg{position:fixed;inset:0;z-index:870;'
      +   'background:rgba(20,32,52,0.45);backdrop-filter:blur(12px);'
      +   '-webkit-backdrop-filter:blur(12px);display:flex;align-items:flex-end;'
      +   'justify-content:center;animation:zrz-status-in .2s ease both}'
      + '@keyframes zrz-status-in{from{opacity:0}to{opacity:1}}'
      + '.zrz-status-sheet{width:100%;max-width:720px;background:var(--surface);'
      +   'border-radius:28px 28px 0 0;max-height:88vh;overflow-y:auto;'
      +   '-webkit-overflow-scrolling:touch;padding:0 18px 28px;'
      +   'box-shadow:0 -12px 48px rgba(20,32,52,0.28);'
      +   'animation:zrz-status-up .3s cubic-bezier(.2,.85,.3,1) both;'
      +   'touch-action:pan-y}'
      + '@keyframes zrz-status-up{from{transform:translateY(60px);opacity:0.6}'
      +   'to{transform:none;opacity:1}}'
      + '.zrz-status-handle{width:44px;height:4px;background:var(--muted-2);'
      +   'border-radius:4px;margin:10px auto 4px;opacity:0.6}'
      + '.zrz-status-title{font-size:19px;font-weight:800;color:var(--text);'
      +   'letter-spacing:-0.02em;padding:10px 4px 8px}'
      + '.zrz-status-sec{margin-top:16px}'
      + '.zrz-status-sec-t{font-size:11px;font-weight:800;color:var(--muted);'
      +   'text-transform:uppercase;letter-spacing:1.2px;padding:4px 4px 8px}'
      + '.zrz-status-list{display:flex;flex-direction:column;gap:4px}'
      + '.zrz-status-item{display:flex;align-items:center;justify-content:space-between;'
      +   'gap:12px;width:100%;padding:14px 16px;border-radius:14px;'
      +   'border:1.5px solid var(--line);background:var(--surface);'
      +   'font-family:inherit;font-size:14.5px;font-weight:600;'
      +   'color:var(--text);cursor:pointer;text-align:left;'
      +   'transition:background .14s ease,transform .12s ease,border-color .14s ease}'
      + '.zrz-status-item:hover{background:var(--accent-soft);border-color:var(--accent-line)}'
      + '.zrz-status-item:active{transform:scale(0.98)}'
      + '.zrz-status-item.active{'
      +   'background:linear-gradient(135deg,rgba(91,127,184,0.12),rgba(91,127,184,0.04));'
      +   'border-color:var(--accent);color:var(--accent-deep);font-weight:800}'
      + '.zrz-status-lbl{flex:1;min-width:0}'
      + '.zrz-status-check{font-size:16px;font-weight:800;color:var(--accent);'
      +   'width:20px;text-align:center;flex-shrink:0}'
      + '.zrz-status-close{display:block;width:100%;margin-top:18px;'
      +   'padding:14px 20px;border:none;border-radius:16px;'
      +   'background:var(--accent-soft);color:var(--accent-deep);'
      +   'font-family:inherit;font-size:15px;font-weight:700;cursor:pointer}'
      + '.zrz-status-close:active{background:var(--accent-line);transform:scale(0.98)}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-status-picker-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- Запуск ---------- */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapRenderDetail(); }catch(e){}
    try { watchForDetail(); }catch(e){}
    try { injectPickerButton(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  /* Периодическая подстраховка */
  var _iv = setInterval(function(){
    try { injectPickerButton(); }catch(e){}
  }, 1500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[11-status-picker] компактный выбор статуса активен'); }catch(_){}
})();
