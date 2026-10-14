/* app-patches.js — динамические патчи «Зерцало»
   Активные версии фич:
     v4.2.1 — скрыть OSRM в форме события + индикатор патча.
     v4.2.2 — типографика и микроанимации.
*/
(function(){
  var PATCH_VERSION = '4.2.2';
  var _lock = false;

  /* ── v4.2.1 ─────────────────────────────────────────── */

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
          n.nodeValue = n.nodeValue.replace(/Зерцало v4\.2\.0( · 🔌 патч [0-9.]+)?/, 'Зерцало v4.2.0 · ⚙ патч '+PATCH_VERSION);
        }
      }
    }
  }

  /* ── v4.2.2 — типографика и микроанимации ───────────── */

  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
    var css = ''
    /* Единая сетка типографики в карточках */
    + '.card-title{font-size:16px !important;font-weight:700 !important;letter-spacing:-0.1px;margin-bottom:4px !important;}'
    + '.card-sub{font-size:13px !important;line-height:1.45 !important;color:var(--text-soft) !important;}'
    + '.card-sub+.card-sub{margin-top:2px;}'
    /* Заголовок модалки */
    + '.modal h2{font-size:22px !important;letter-spacing:-0.2px;line-height:1.25 !important;}'
    /* Секция */
    + '.section-title{font-size:11.5px !important;font-weight:800 !important;letter-spacing:1px !important;padding-bottom:8px !important;margin-top:24px !important;}'
    + '.section-title:first-of-type{margin-top:10px !important;}'
    /* Плотнее строки информации */
    + '.info-line{padding:8px 0 !important;}'
    + '.info-line .lbl{font-size:13px !important;}'
    + '.info-line .val{font-size:14px !important;}'
    /* Кнопки: более выраженное нажатие */
    + '.btn{transition:transform .14s cubic-bezier(.2,.7,.3,1),box-shadow .14s ease,background .15s ease !important;}'
    + '.btn:active{transform:scale(0.965) !important;}'
    + '.btn-primary:active{box-shadow:0 3px 10px rgba(91,127,184,0.4) !important;}'
    /* Чипы: чуть плотнее и живее */
    + '.chip{transition:transform .12s cubic-bezier(.2,.7,.3,1),background .15s ease,color .15s ease !important;}'
    + '.chip:active{transform:scale(0.94) !important;}'
    + '.chip.active{box-shadow:0 3px 8px rgba(91,127,184,0.28) !important;}'
    /* Карточки: мягче, но заметнее нажатие */
    + '.card{transition:transform .18s cubic-bezier(.2,.7,.3,1),box-shadow .18s ease !important;}'
    + '.card:active{transform:scale(0.982) !important;box-shadow:var(--sh-md) !important;}'
    /* Плавный переход экранов чуть быстрее */
    + '.page-enter{animation-duration:0.28s !important;}'
    /* Карточки появляются мягче, но не «прыгают» */
    + '.card.stagger{animation-duration:.32s !important;animation-timing-function:cubic-bezier(.2,.7,.3,1) !important;}'
    /* Рядом с шапкой — компактнее */
    + 'header{padding:10px 16px !important;}'
    + 'header button{width:42px !important;height:42px !important;border-radius:13px !important;}'
    /* Полоса прогресса — тоньше */
    + '.progress-wrap{height:3px !important;}'
    /* Модалка — чуть аккуратнее по краям */
    + '@media (max-width:420px){.modal{border-radius:24px 24px 0 0 !important;}.modal h2{font-size:20px !important;}}'
    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Применение ─────────────────────────────────────── */

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
