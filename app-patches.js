/* app-patches.js — динамические патчи «Зерцало»
   Активные фичи:
     v4.2.1 — скрыть OSRM в форме события.
     v4.2.3 — смелая типографика и выразительная вёрстка.
*/
(function(){
  var PATCH_VERSION = '4.2.3';
  var _lock = false;

  function hideOsrm(){
    var titles = document.querySelectorAll('.modal .section-title');
    for(var i=0;i<titles.length;i++){
      var t = titles[i];
      if(t.textContent && t.textContent.indexOf('Расстояние (OSRM)') >= 0){
        t.style.display = 'none';
        var sib = t.nextElementSibling;
        while(sib){
          if(sib.id === 'ev_geo_block'){ sib.style.display = 'none'; break; }
          if(sib.classList && sib.classList.contains('section-title')) break;
          sib = sib.nextElementSibling;
        }
      }
    }
  }

  function tagVersion(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while((n = walker.nextNode())){
      if(!n.nodeValue) continue;
      if(n.nodeValue.indexOf('Зерцало v4.2.0') >= 0 && n.nodeValue.indexOf('Схема') >= 0){
        if(n.nodeValue.indexOf('патч '+PATCH_VERSION) < 0){
          n.nodeValue = n.nodeValue.replace(/Зерцало v4\.2\.0( · [^•]+ патч [0-9.]+)?/, 'Зерцало v4.2.0 · ⚡ патч '+PATCH_VERSION);
        }
      }
    }
  }

  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
    var css = ''

    /* === ТИПОГРАФИКА === */

    /* Карточка: заголовок заметно крупнее, вес жирнее */
    + '.card{padding:20px 22px 20px 26px !important;border-radius:22px !important;box-shadow:0 4px 20px rgba(90,120,170,0.10) !important;}'
    + '.card-title{font-size:17.5px !important;font-weight:800 !important;letter-spacing:-0.25px !important;line-height:1.25 !important;margin-bottom:6px !important;}'
    + '.card-sub{font-size:13.5px !important;line-height:1.5 !important;color:var(--text-soft) !important;}'
    + '.card-sub+.card-sub{margin-top:3px !important;}'

    /* Модалка: крупнее H2, чётче */
    + '.modal h2{font-size:23px !important;font-weight:800 !important;letter-spacing:-0.3px !important;line-height:1.2 !important;}'
    + '.modal{border-radius:32px 32px 0 0 !important;box-shadow:0 -12px 48px rgba(50,70,100,0.20) !important;}'

    /* Секции: жирные, широкий трекинг */
    + '.section-title{font-size:12px !important;font-weight:800 !important;letter-spacing:1.3px !important;padding-bottom:10px !important;margin-top:28px !important;color:var(--accent-deep) !important;}'
    + '.section-title:first-of-type{margin-top:12px !important;}'

    /* Инфо-строки крупнее */
    + '.info-line{padding:9px 0 !important;font-size:14px !important;}'
    + '.info-line .lbl{font-size:13.5px !important;font-weight:600 !important;}'
    + '.info-line .val{font-size:14.5px !important;font-weight:600 !important;}'

    /* === КНОПКИ: выразительные === */
    + '.btn{padding:16px 22px !important;font-size:16px !important;font-weight:700 !important;border-radius:18px !important;letter-spacing:0.1px !important;transition:transform .14s cubic-bezier(.2,.7,.3,1),box-shadow .18s ease,filter .15s ease !important;}'
    + '.btn:active{transform:scale(0.955) !important;filter:brightness(0.95);}'
    + '.btn-primary{background:linear-gradient(135deg,#8badd8 0%,#5b7fb8 55%,#4a6ba5 100%) !important;box-shadow:0 10px 26px rgba(91,127,184,0.34) !important;}'
    + '.btn-primary:active{box-shadow:0 4px 12px rgba(91,127,184,0.45) !important;}'
    + '.btn-secondary{font-weight:700 !important;}'

    /* Кнопка-действие на дашборде — крупнее */
    + '.btn-row-action{padding:17px 20px !important;font-size:16px !important;border-radius:18px !important;font-weight:800 !important;letter-spacing:0.15px !important;box-shadow:0 8px 22px rgba(91,127,184,0.32) !important;}'
    + '.btn-row-action:active{transform:scale(0.97) !important;box-shadow:0 4px 12px rgba(91,127,184,0.42) !important;}'

    /* === ЧИПЫ: заметнее === */
    + '.chip{padding:10px 17px !important;font-size:14px !important;font-weight:600 !important;transition:transform .12s cubic-bezier(.2,.7,.3,1),background .15s ease,box-shadow .15s ease !important;}'
    + '.chip:active{transform:scale(0.93) !important;}'
    + '.chip.active{box-shadow:0 5px 14px rgba(91,127,184,0.35) !important;font-weight:700 !important;}'
    + '.sort-chip{padding:8px 14px !important;font-size:13px !important;font-weight:700 !important;}'

    /* === ШАПКА === */
    + 'header{padding:11px 16px !important;box-shadow:0 3px 18px rgba(90,120,170,0.09) !important;}'
    + 'header button{width:44px !important;height:44px !important;border-radius:14px !important;font-size:21px !important;}'

    /* === СКРОЛЛ === */
    + '.progress-wrap{height:5px !important;border-radius:5px !important;}'
    + '.progress-bar{border-radius:5px !important;}'

    /* Появление карточек — заметнее */
    + '.card.stagger{animation:fadeInUp .42s cubic-bezier(.2,.7,.3,1) forwards !important;}'
    + '.page-enter{animation-duration:0.32s !important;}'

    /* Мелочи */
    + '.type-badge{font-size:11px !important;font-weight:800 !important;letter-spacing:0.6px !important;padding:4px 11px !important;}'
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.order-date-lg{font-size:14px !important;font-weight:600 !important;color:var(--text-soft) !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'

    /* Мобильная адаптация */
    + '@media (max-width:420px){'
    + '  .card{padding:18px 18px 18px 22px !important;}'
    + '  .modal h2{font-size:21px !important;}'
    + '  .btn{padding:15px 18px !important;font-size:15.5px !important;}'
    + '}'

    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function apply(){
    try{ injectCss(); }catch(e){}
    try{ hideOsrm(); }catch(e){}
    try{ tagVersion(); }catch(e){}
  }

  var mo = new MutationObserver(function(){
    if(_lock) return;
    _lock = true;
    setTimeout(function(){ _lock = false; apply(); }, 20);
  });
  var root = document.getElementById('modalRoot');
  if(root) mo.observe(root, {childList:true, subtree:true});
  var app = document.getElementById('app');
  if(app) mo.observe(app, {childList:true, subtree:true});

  window._zrzPatchInit = apply;

  try{console.log('[app-patches] v'+PATCH_VERSION+' активен');}catch(_){}
})();
