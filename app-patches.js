/* app-patches.js — динамические патчи «Зерцало»
   Активные фичи:
     v4.2.1 — скрыть OSRM в форме события.
     v4.2.3 — смелая типографика.
     v4.2.4 — цвета фурнитуры душевых.
     v4.2.5 — микроанимации (конфетти, пульс, ripple, пружина).
*/
(function(){
  var PATCH_VERSION = '4.2.5';
  var _lock = false;

  /* ─── v4.2.1: скрыть OSRM ─── */
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

  /* ─── v4.2.4: цвета фурнитуры ─── */
  var NEW_FITTING = [
    { key:'chrome',     label:'Хром',         hex:'#d8dde3' },
    { key:'nickel',     label:'Никель',       hex:'#c8c0b5' },
    { key:'gold',       label:'Золото',       hex:'#d4af37' },
    { key:'brushgold',  label:'Брош. золото', hex:'#b8995e' },
    { key:'black',      label:'Чёрный',       hex:'#1a1a1a' },
    { key:'bronze',     label:'Бронза',       hex:'#8b6f47' },
    { key:'gunsteel',   label:'Оруж. сталь',  hex:'#4a4d52' }
  ];
  function installFittings(){
    try{ SHOWER_FITTING_COLORS = NEW_FITTING; }catch(e){}
    try{
      fittingInfo = function(k){
        for(var i=0;i<NEW_FITTING.length;i++){ if(NEW_FITTING[i].key===k) return NEW_FITTING[i]; }
        return null;
      };
    }catch(e){}
  }

  /* ─── v4.2.5: микроанимации ─── */

  function fireConfetti(){
    if(document.getElementById('zrz-confetti')) return;
    var colors = ['#5b7fb8','#4caf7d','#d9924a','#c96565','#8b5cf6','#f0b400','#229ED9','#25D366'];
    var container = document.createElement('div');
    container.id = 'zrz-confetti';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    var total = 80;
    for(var i=0;i<total;i++){
      var p = document.createElement('div');
      var color = colors[Math.floor(Math.random()*colors.length)];
      var size = 5 + Math.random()*9;
      var left = Math.random()*100;
      var delay = Math.random()*0.35;
      var dur = 1.9 + Math.random()*1.3;
      var rot = Math.random()*720 - 360;
      var shape = Math.random();
      var radius = shape>0.7 ? '50%' : (shape>0.4 ? '2px' : '0');
      p.style.cssText =
        'position:absolute;top:-24px;left:'+left+'%;'
        +'width:'+size+'px;height:'+size*0.7+'px;'
        +'background:'+color+';border-radius:'+radius+';'
        +'opacity:0.95;'
        +'animation:zrz-confetti-fall '+dur+'s cubic-bezier(.2,.6,.4,1) '+delay+'s forwards, '
        +'zrz-confetti-spin '+(0.6+Math.random()*0.8)+'s linear infinite';
      p.style.setProperty('--zrz-rot-end', rot+'deg');
      container.appendChild(p);
    }
    setTimeout(function(){ container.remove(); }, 3800);
  }
  window._zrzConfetti = fireConfetti;

  function wrapSavePayment(){
    if(window._zrzSavePaymentWrapped) return;
    if(typeof window.savePayment !== 'function') return;
    var orig = window.savePayment;
    window.savePayment = function(orderId){
      var o = null;
      try{ o = db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var wasFull = !!(o && Number(o.orderTotal)>0 && Number(o.orderPaid)>=Number(o.orderTotal));
      var res = orig.apply(this, arguments);
      var now = null;
      try{ now = db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var nowFull = !!(now && Number(now.orderTotal)>0 && Number(now.orderPaid)>=Number(now.orderTotal));
      if(nowFull && !wasFull){ setTimeout(fireConfetti, 200); }
      return res;
    };
    window._zrzSavePaymentWrapped = true;
  }

  function wrapSaveMasterComment(){
    if(window._zrzSaveCommentWrapped) return;
    if(typeof window.saveMasterComment !== 'function') return;
    var orig = window.saveMasterComment;
    window.saveMasterComment = function(id){
      var r = orig.apply(this, arguments);
      /* Все существующие .btn внутри модалки — микро-пульс */
      var btns = document.querySelectorAll('.modal .btn-secondary');
      for(var i=0;i<btns.length;i++){
        var b = btns[i];
        b.style.animation = 'zrz-pulse-soft .55s cubic-bezier(.2,.7,.3,1)';
        setTimeout(function(){ b.style.animation=''; }, 600);
      }
      return r;
    };
    window._zrzSaveCommentWrapped = true;
  }

  function bindCardRipple(){
    if(window._zrzCardRippleBound) return;
    window._zrzCardRippleBound = true;
    document.addEventListener('pointerdown', function(e){
      var card = e.target.closest && e.target.closest('.card');
      if(!card) return;
      /* Игнорируем тапы по вложенным ссылкам/кнопкам — там свой ripple */
      if(e.target.closest('.btn,.chip,.tap-link,.del-x,.photo-thumb,.photo-del')) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var wave = document.createElement('span');
      wave.className = 'zrz-card-ripple';
      wave.style.left = x+'px';
      wave.style.top = y+'px';
      wave.style.width = '24px';
      wave.style.height = '24px';
      card.appendChild(wave);
      setTimeout(function(){ wave.remove(); }, 700);
    }, true);
  }

  /* ─── v4.2.3: типографика + новые CSS-анимации ─── */

  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
    var css = ''
    + '.card{padding:20px 22px 20px 26px !important;border-radius:22px !important;box-shadow:0 4px 20px rgba(90,120,170,0.10) !important;}'
    + '.card-title{font-size:17.5px !important;font-weight:800 !important;letter-spacing:-0.25px !important;line-height:1.25 !important;margin-bottom:6px !important;}'
    + '.card-sub{font-size:13.5px !important;line-height:1.5 !important;color:var(--text-soft) !important;}'
    + '.card-sub+.card-sub{margin-top:3px !important;}'
    + '.modal h2{font-size:23px !important;font-weight:800 !important;letter-spacing:-0.3px !important;line-height:1.2 !important;}'
    + '.modal{border-radius:32px 32px 0 0 !important;box-shadow:0 -12px 48px rgba(50,70,100,0.20) !important;}'
    + '.section-title{font-size:12px !important;font-weight:800 !important;letter-spacing:1.3px !important;padding-bottom:10px !important;margin-top:28px !important;color:var(--accent-deep) !important;}'
    + '.section-title:first-of-type{margin-top:12px !important;}'
    + '.info-line{padding:9px 0 !important;font-size:14px !important;}'
    + '.info-line .lbl{font-size:13.5px !important;font-weight:600 !important;}'
    + '.info-line .val{font-size:14.5px !important;font-weight:600 !important;}'
    + '.btn{padding:16px 22px !important;font-size:16px !important;font-weight:700 !important;border-radius:18px !important;letter-spacing:0.1px !important;transition:transform .14s cubic-bezier(.2,.7,.3,1),box-shadow .18s ease,filter .15s ease !important;}'
    + '.btn:active{transform:scale(0.955) !important;filter:brightness(0.95);}'
    + '.btn-primary{background:linear-gradient(135deg,#8badd8 0%,#5b7fb8 55%,#4a6ba5 100%) !important;box-shadow:0 10px 26px rgba(91,127,184,0.34) !important;}'
    + '.btn-primary:active{box-shadow:0 4px 12px rgba(91,127,184,0.45) !important;}'
    + '.btn-secondary{font-weight:700 !important;}'
    + '.btn-row-action{padding:17px 20px !important;font-size:16px !important;border-radius:18px !important;font-weight:800 !important;letter-spacing:0.15px !important;box-shadow:0 8px 22px rgba(91,127,184,0.32) !important;}'
    + '.btn-row-action:active{transform:scale(0.97) !important;box-shadow:0 4px 12px rgba(91,127,184,0.42) !important;}'
    + '.chip{padding:10px 17px !important;font-size:14px !important;font-weight:600 !important;transition:transform .12s cubic-bezier(.2,.7,.3,1),background .15s ease,box-shadow .15s ease !important;}'
    + '.chip:active{transform:scale(0.93) !important;}'
    + '.chip.active{box-shadow:0 5px 14px rgba(91,127,184,0.35) !important;font-weight:700 !important;}'
    + '.sort-chip{padding:8px 14px !important;font-size:13px !important;font-weight:700 !important;}'
    + 'header{padding:11px 16px !important;box-shadow:0 3px 18px rgba(90,120,170,0.09) !important;}'
    + 'header button{width:44px !important;height:44px !important;border-radius:14px !important;font-size:21px !important;}'
    + '.progress-wrap{height:5px !important;border-radius:5px !important;}'
    + '.progress-bar{border-radius:5px !important;}'
    + '.card.stagger{animation:fadeInUp .42s cubic-bezier(.2,.7,.3,1) forwards !important;}'
    + '.page-enter{animation-duration:0.32s !important;}'
    + '.type-badge{font-size:11px !important;font-weight:800 !important;letter-spacing:0.6px !important;padding:4px 11px !important;}'
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.order-date-lg{font-size:14px !important;font-weight:600 !important;color:var(--text-soft) !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'

    /* Ripple на карточках */
    + '.card{position:relative;overflow:hidden;}'
    + '.zrz-card-ripple{position:absolute;pointer-events:none;border-radius:50%;background:rgba(91,127,184,0.28);transform:translate(-50%,-50%) scale(0);animation:zrz-card-ripple-anim .65s ease-out forwards;}'
    + '@keyframes zrz-card-ripple-anim{to{transform:translate(-50%,-50%) scale(14);opacity:0;}}'

    /* Конфетти */
    + '@keyframes zrz-confetti-fall{0%{transform:translateY(0);opacity:1}85%{opacity:1}100%{transform:translateY(110vh);opacity:0}}'
    + '@keyframes zrz-confetti-spin{from{rotate:0deg}to{rotate:720deg}}'

    /* Пульс непрочитанных */
    + '.notif-bell .bell-badge{animation:zrz-badge-pulse 2s ease-in-out infinite;}'
    + '@keyframes zrz-badge-pulse{0%,100%{transform:scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.25);}50%{transform:scale(1.14);box-shadow:0 0 0 6px rgba(201,101,101,0.18);}}'

    /* Микро-пульс кнопок после сохранения */
    + '@keyframes zrz-pulse-soft{0%{transform:scale(1)}40%{transform:scale(0.96)}70%{transform:scale(1.02)}100%{transform:scale(1)}}'

    /* Модалка: пружинящий slide-up */
    + '.modal{animation:zrz-modal-in .34s cubic-bezier(.2,.85,.3,1) both !important;}'
    + '@keyframes zrz-modal-in{from{transform:translateY(50px);opacity:0.6}to{transform:translateY(0);opacity:1}}'

    + '@media (max-width:420px){.card{padding:18px 18px 18px 22px !important;}.modal h2{font-size:21px !important;}.btn{padding:15px 18px !important;font-size:15.5px !important;}}'
    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ─── индикатор версии ─── */
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

  function apply(){
    try{ injectCss(); }catch(e){}
    try{ installFittings(); }catch(e){}
    try{ hideOsrm(); }catch(e){}
    try{ wrapSavePayment(); }catch(e){}
    try{ wrapSaveMasterComment(); }catch(e){}
    try{ bindCardRipple(); }catch(e){}
    try{ tagVersion(); }catch(e){}
  }

  try{ installFittings(); }catch(e){}

  var mo = new MutationObserver(function(){
    if(_lock) return;
    _lock = true;
    setTimeout(function(){ _lock = false; apply(); }, 20);
  });
  var root = document.getElementById('modalRoot');
  if(root) mo.observe(root, {childList:true, subtree:true});
  var app = document.getElementById('app');
  if(app) mo.observe(app, {childList:true, subtree:true});
  var header = document.querySelector('header');
  if(header) mo.observe(header, {childList:true, subtree:true});

  window._zrzPatchInit = apply;

  try{console.log('[app-patches] v'+PATCH_VERSION+' активен');}catch(_){}
})();
