/* app-patches.js — динамические патчи «Зерцало»
   Активные фичи:
     v4.2.1 — скрыть OSRM в форме события.
     v4.2.3 — смелая типографика.
     v4.2.4 — цвета фурнитуры душевых (+чёрный).
     v4.2.5 — микроанимации и конфетти.
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
        for(var i=0;i<NEW_FITTING.length;i++){
          if(NEW_FITTING[i].key===k) return NEW_FITTING[i];
        }
        return null;
      };
    }catch(e){}
  }

  /* ─── v4.2.5: конфетти ─── */

  function showConfetti(){
    if(document.getElementById('zrz-confetti')) return;
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas');
    cv.id = 'zrz-confetti';
    cv.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    var W = cv.width, H = cv.height;
    var COLORS = ['#4caf7d','#7b9dd1','#5b7fb8','#e8a70c','#e08080','#3a7a5a','#a05c26'];
    var parts = [];
    for(var i=0;i<140;i++){
      parts.push({
        x: W/2 + (Math.random()-0.5)*80,
        y: H*0.35 + (Math.random()-0.5)*40,
        vx: (Math.random()-0.5)*13,
        vy: -Math.random()*13 - 4,
        g: 0.42,
        s: 4 + Math.random()*6,
        rot: Math.random()*Math.PI*2,
        vr: (Math.random()-0.5)*0.35,
        c: COLORS[(Math.random()*COLORS.length)|0],
        life: 130
      });
    }
    var t0 = Date.now();
    function frame(){
      ctx.clearRect(0,0,W,H);
      var alive = 0;
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        if(p.life<=0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.vx *= 0.995;
        p.rot += p.vr;
        p.life--;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.min(1, p.life/35);
        ctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2);
        ctx.restore();
      }
      if(alive>0 && Date.now()-t0 < 2600){
        requestAnimationFrame(frame);
      } else {
        try{ cv.remove(); }catch(e){ cv.parentNode && cv.parentNode.removeChild(cv); }
      }
    }
    frame();
  }

  /* ─── v4.2.5: обёртки над savePayment и saveMeasurePaid ─── */

  function wrapPaymentSave(){
    if(!window.savePayment || window._zrzWrappedPayment) return;
    window._zrzWrappedPayment = true;
    var orig = window.savePayment;
    window.savePayment = function(orderId){
      var before = null;
      try{ before = db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var wasDue = before ? Math.max(0, (Number(before.orderTotal)||0) - (Number(before.orderPaid)||0)) : 0;
      var ret = orig.apply(this, arguments);
      var after = null;
      try{ after = db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var nowDue = after ? Math.max(0, (Number(after.orderTotal)||0) - (Number(after.orderPaid)||0)) : 0;
      var total = after ? Number(after.orderTotal)||0 : 0;
      if(wasDue>0 && nowDue<=0 && total>0) showConfetti();
      return ret;
    };
  }

  /* ─── v4.2.3: типографика + v4.2.5: микроанимации ─── */

  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
    var css = ''
    /* типографика */
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
    + '.type-badge{font-size:11px !important;font-weight:800 !important;letter-spacing:0.6px !important;padding:4px 11px !important;}'
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.order-date-lg{font-size:14px !important;font-weight:600 !important;color:var(--text-soft) !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'
    + '@media (max-width:420px){.card{padding:18px 18px 18px 22px !important;}.modal h2{font-size:21px !important;}.btn{padding:15px 18px !important;font-size:15.5px !important;}}'

    /* Микроанимации */

    /* Плавный въезд модалки */
    + '@keyframes zrzModalIn{from{transform:translateY(24px) scale(0.98);opacity:0;}to{transform:none;opacity:1;}}'
    + '.modal{animation:zrzModalIn .34s cubic-bezier(.2,.7,.3,1) both !important;}'

    /* Плавное появление карточек */
    + '@keyframes zrzFadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}'
    + '.card.stagger{animation:zrzFadeUp .42s cubic-bezier(.2,.7,.3,1) forwards !important;}'

    /* Плавный вход страницы */
    + '@keyframes zrzPageIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}'
    + '#app.page-enter{animation:zrzPageIn .32s cubic-bezier(.2,.7,.3,1) both !important;}'

    /* Пульсация бейджей уведомлений */
    + '@keyframes zrzPulseBadge{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(201,101,101,0.55);}50%{transform:scale(1.08);box-shadow:0 0 0 6px rgba(201,101,101,0);}}'
    + '.tabbar-badge,.bell-badge{animation:zrzPulseBadge 1.8s ease-in-out infinite;}'

    /* Ripple-эффект на кнопках и чипах */
    + '.btn,.chip,.btn-row-action,.type-btn,.key-btn{position:relative;overflow:hidden;}'
    + '@keyframes zrzRipple{to{transform:translate(-50%,-50%) scale(2.8);opacity:0;}}'
    + '.zrz-ripple{position:absolute;border-radius:50%;pointer-events:none;width:22px;height:22px;background:rgba(255,255,255,0.42);transform:translate(-50%,-50%) scale(0);animation:zrzRipple .62s ease-out forwards;}'
    + '.chip .zrz-ripple,.btn-secondary .zrz-ripple{background:rgba(91,127,184,0.35);}'

    /* FAB — тактильный отклик */
    + '.fab,.fab-wide,.fab-top{transition:transform .18s cubic-bezier(.2,.7,.3,1),box-shadow .22s ease !important;}'
    + '.fab:active,.fab-wide:active,.fab-top:active{transform:scale(0.94) !important;}'

    /* Карточка — подсветка при длинном нажатии */
    + '.card{padding-left:26px;position:relative;}'
    + '.card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at var(--zrz-tap-x,50%) var(--zrz-tap-y,50%),rgba(91,127,184,0.10),transparent 60%);opacity:0;transition:opacity .28s ease;pointer-events:none;}'
    + '.card.zrz-tapped::after{opacity:1;}'

    /* Пульсация выделенного чипа */
    + '.chip.active{animation:zrzChipGlow 2.4s ease-in-out infinite;}'
    + '@keyframes zrzChipGlow{0%,100%{box-shadow:0 5px 14px rgba(91,127,184,0.35);}50%{box-shadow:0 6px 20px rgba(91,127,184,0.55);}}'
    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ─── v4.2.5: ripple + tap-glow ─── */

  function installRipple(){
    if(window._zrzRippleInstalled) return;
    window._zrzRippleInstalled = true;

    document.addEventListener('click', function(e){
      var el = e.target.closest('.btn,.chip,.btn-row-action,.type-btn,.key-btn');
      if(!el || el.disabled) return;
      try{
        var r = el.getBoundingClientRect();
        var x = e.clientX || (r.left+r.width/2);
        var y = e.clientY || (r.top+r.height/2);
        var s = document.createElement('span');
        s.className = 'zrz-ripple';
        s.style.left = (x-r.left)+'px';
        s.style.top = (y-r.top)+'px';
        el.appendChild(s);
        setTimeout(function(){ try{s.remove();}catch(_){} }, 640);
      }catch(err){}
    }, true);

    document.addEventListener('pointerdown', function(e){
      var c = e.target.closest('.card');
      if(!c) return;
      try{
        var r = c.getBoundingClientRect();
        c.style.setProperty('--zrz-tap-x', ((e.clientX-r.left)/r.width*100)+'%');
        c.style.setProperty('--zrz-tap-y', ((e.clientY-r.top)/r.height*100)+'%');
        c.classList.add('zrz-tapped');
        setTimeout(function(){ c.classList.remove('zrz-tapped'); }, 340);
      }catch(err){}
    }, true);
  }

  /* ─── индикатор версии ─── */

  function tagVersion(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while((n = walker.nextNode())){
      if(!n.nodeValue) continue;
      if(n.nodeValue.indexOf('Зерцало v4.2.0') >= 0 && n.nodeValue.indexOf('Схема') >= 0){
        if(n.nodeValue.indexOf('патч '+PATCH_VERSION) < 0){
          n.nodeValue = n.nodeValue.replace(/Зерцало v4\.2\.0( · [^•]+ патч [0-9.]+)?/, 'Зерцало v4.2.0 · ✨ патч '+PATCH_VERSION);
        }
      }
    }
  }

  function apply(){
    try{ injectCss(); }catch(e){}
    try{ installFittings(); }catch(e){}
    try{ installRipple(); }catch(e){}
    try{ hideOsrm(); }catch(e){}
    try{ tagVersion(); }catch(e){}
    try{ wrapPaymentSave(); }catch(e){}
  }

  /* Ранняя инициализация — до появления тяжёлых узлов */
  try{ installFittings(); }catch(e){}
  try{ installRipple(); }catch(e){}

  var mo = new MutationObserver(function(){
    if(_lock) return;
    _lock = true;
    setTimeout(function(){ _lock = false; apply(); }, 20);
  });
  var root = document.getElementById('modalRoot');
  if(root) mo.observe(root, {childList:true, subtree:true});
  var app = document.getElementById('app');
  if(app) mo.observe(app, {childList:true, subtree:true});

  /* Первичное обёртывание — с задержкой, чтобы savePayment успел определиться */
  setTimeout(function(){ try{ wrapPaymentSave(); }catch(e){} }, 800);

  window._zrzPatchInit = apply;

  try{console.log('[app-patches] v'+PATCH_VERSION+' активен');}catch(_){}
})();
