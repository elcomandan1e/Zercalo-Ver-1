/* app-patches.js — динамические патчи «Зерцало»
   Активные фичи:
     v4.2.1 — скрыть OSRM в форме события.
     v4.2.3 — смелая типографика.
     v4.2.4 — цвета фурнитуры душевых.
     v4.2.5 — базовые микроанимации.
     v4.2.6 — усиленные эффекты + декоративные болты.
*/
(function(){
  var PATCH_VERSION = '4.2.6';
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

  /* ─── v4.2.5: конфетти и pulse ─── */
  function fireConfetti(){
    if(document.getElementById('zrz-confetti')) return;
    var colors = ['#5b7fb8','#4caf7d','#d9924a','#c96565','#8b5cf6','#f0b400','#229ED9','#25D366'];
    var container = document.createElement('div');
    container.id = 'zrz-confetti';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    var total = 110;
    for(var i=0;i<total;i++){
      var p = document.createElement('div');
      var color = colors[Math.floor(Math.random()*colors.length)];
      var size = 6 + Math.random()*11;
      var left = Math.random()*100;
      var delay = Math.random()*0.35;
      var dur = 2.1 + Math.random()*1.4;
      var shape = Math.random();
      var radius = shape>0.7 ? '50%' : (shape>0.4 ? '2px' : '0');
      p.style.cssText =
        'position:absolute;top:-24px;left:'+left+'%;'
        +'width:'+size+'px;height:'+size*0.7+'px;'
        +'background:'+color+';border-radius:'+radius+';'
        +'opacity:0.95;'
        +'animation:zrz-confetti-fall '+dur+'s cubic-bezier(.2,.6,.4,1) '+delay+'s forwards, '
        +'zrz-confetti-spin '+(0.6+Math.random()*0.9)+'s linear infinite';
      container.appendChild(p);
    }
    setTimeout(function(){ container.remove(); }, 4200);
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
      if(nowFull && !wasFull){ setTimeout(fireConfetti, 220); }
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

  /* ─── v4.2.6: усиленный ripple на карточках ─── */
  function bindCardRipple(){
    if(window._zrzCardRippleBound) return;
    window._zrzCardRippleBound = true;
    document.addEventListener('pointerdown', function(e){
      var card = e.target.closest && e.target.closest('.card');
      if(!card) return;
      if(e.target.closest('.btn,.chip,.tap-link,.del-x,.photo-thumb,.photo-del')) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      /* Подбираем размер волны под карточку */
      var far = Math.max(
        Math.hypot(x,y),
        Math.hypot(rect.width-x,y),
        Math.hypot(x,rect.height-y),
        Math.hypot(rect.width-x,rect.height-y)
      );
      var wave = document.createElement('span');
      wave.className = 'zrz-card-ripple';
      wave.style.left = x+'px';
      wave.style.top = y+'px';
      wave.style.width = '40px';
      wave.style.height = '40px';
      wave.style.setProperty('--zrz-scale', (far/20).toFixed(2));
      card.appendChild(wave);
      setTimeout(function(){ wave.remove(); }, 900);
    }, true);
  }

  /* ─── v4.2.6: декоративные болты ─── */

  function boltPositionsCm(d){
    /* Возвращает позиции болтов в см относительно левого верхнего угла (отступ 5 см). */
    var cnt = Number(d.boltCount)||0;
    if(!d.boltMount || cnt<4) return [];
    var g = null;
    try{ g = glassDimensions(d); }catch(e){ return []; }
    var W = g.w||60, H = g.h||60;
    var off = 5; /* см от угла */
    /* Защита от слишком маленького зеркала */
    if(W < 2*off + 1) off = Math.max(1, W/8);
    if(H < 2*off + 1) off = Math.max(1, H/8);
    var list = [
      {x:off,     y:off},
      {x:W-off,   y:off},
      {x:off,     y:H-off},
      {x:W-off,   y:H-off}
    ];
    /* 6 болтов: + верхний и нижний центр */
    if(cnt>=6){
      list.push({x:W/2, y:off});
      list.push({x:W/2, y:H-off});
    }
    /* 8 болтов: + лево и право центр */
    if(cnt>=8){
      list.push({x:off,   y:H/2});
      list.push({x:W-off, y:H/2});
    }
    return list;
  }

  function drawBoltsOnCanvas(ctx, x0, y0, sc3, d){
    var pts = boltPositionsCm(d);
    if(!pts.length) return;
    /* Радиус болта на чертеже: 8 мм → 0.4 см, но минимум 3 пикселя */
    var r = Math.max(3, Math.min(7, 0.45*sc3));
    ctx.save();
    pts.forEach(function(p, i){
      var px = x0 + p.x*sc3;
      var py = y0 + p.y*sc3;
      /* Внешний кружок */
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI*2);
      ctx.fillStyle = '#eaf1fb';
      ctx.fill();
      ctx.strokeStyle = '#1e4d7b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      /* Внутренняя точка */
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.2, r*0.35), 0, Math.PI*2);
      ctx.fillStyle = '#1e4d7b';
      ctx.fill();
    });
    /* Подпись «N болтов» */
    ctx.fillStyle = '#1e4d7b';
    ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var lastY = y0 + (pts.reduce(function(m,p){return Math.max(m,p.y);},0))*sc3;
    ctx.fillText('🔩 '+pts.length+' болтов Ø8 мм · отступ 5 см', x0 + (glassDimensions(d).w*sc3)/2, lastY + 14);
    ctx.restore();
  }

  function wrapTechDraw(){
    if(window._zrzTechDrawWrapped) return;
    window._zrzTechDrawWrapped = true;

    if(typeof window.drawTechIso === 'function'){
      var origIso = window.drawTechIso;
      window.drawTechIso = function(ctx, x, y, w, h, dims, scale, d){
        var res = origIso.apply(this, arguments);
        try{
          if(!d.boltMount || (d.type!=='MIRROR' && d.type!=='APRON')) return res;
          var cx=x+w/2, cy=y+h/2;
          var gd = glassDimensions(d);
          var _padL=64,_padR=88,_padT=48,_padB=78;
          var _avW=Math.max(80,w-_padL-_padR), _avH=Math.max(60,h-_padT-_padB);
          var sc3=Math.min(_avW/Math.max(gd.w||1,1), _avH/Math.max(gd.h||1,1));
          var pxW=gd.w*sc3, pxH=gd.h*sc3;
          var x0=cx-pxW/2, y0=cy-pxH/2+12;
          drawBoltsOnCanvas(ctx, x0, y0, sc3, d);
        }catch(e){}
        return res;
      };
    }

    if(typeof window.drawTechFront === 'function'){
      var origFront = window.drawTechFront;
      window.drawTechFront = function(ctx, x, y, w, h, d){
        var res = origFront.apply(this, arguments);
        try{
          if(!d.boltMount || (d.type!=='MIRROR' && d.type!=='APRON')) return res;
          if(d.type==='SHOWER') return res;
          var cx=x+w/2, cy=y+h/2;
          var gd = glassDimensions(d);
          var sc3=Math.min((w-80)/Math.max(gd.w||1,1),(h-60)/Math.max(gd.h||1,1));
          var pxW=gd.w*sc3, pxH=gd.h*sc3;
          var x0=cx-pxW/2, y0=cy-pxH/2;
          drawBoltsOnCanvas(ctx, x0, y0, sc3, d);
        }catch(e){}
        return res;
      };
    }
  }

  /* ─── v4.2.6: UI болтов в форме позиции ─── */
  function injectBoltUI(){
    var m = document.querySelector('.modal');
    if(!m) return;
    if(m.querySelector('#zrz_bolt_block')) return;
    var mount = m.querySelector('#mount_block');
    if(!mount) return; /* значит это не форма позиции */
    var d = window._editDraft || {};
    /* Только для MIRROR и APRON */
    if(d.type!=='MIRROR' && d.type!=='APRON') return;

    var html = '<div id="zrz_bolt_block">'
      + '<div class="checkbox-row" style="background:linear-gradient(180deg,rgba(59,92,143,0.10),rgba(59,92,143,0.04));border:1.5px solid rgba(59,92,143,0.28)">'
      + '<input type="checkbox" id="zrz_bolt_chk"><label for="zrz_bolt_chk">🔩 Декоративные болты</label>'
      + '</div>'
      + '<div id="zrz_bolt_count_wrap" style="display:none;margin-top:10px">'
      + '  <label style="margin-top:0">Количество</label>'
      + '  <div class="chips" id="zrz_bolt_chips">'
      + '    <button type="button" class="chip" data-v="4">4 болта</button>'
      + '    <button type="button" class="chip" data-v="6">6 болтов</button>'
      + '    <button type="button" class="chip" data-v="8">8 болтов</button>'
      + '  </div>'
      + '  <div class="shower-hint" style="text-align:left;margin-top:6px">Отступ от угла — 5 см. Расположение — на чертеже.</div>'
      + '</div>'
      + '</div>';
    mount.insertAdjacentHTML('afterend', html);

    var chk = document.getElementById('zrz_bolt_chk');
    var ww = document.getElementById('zrz_bolt_count_wrap');
    var chs = document.getElementById('zrz_bolt_chips');
    chk.checked = !!d.boltMount;
    ww.style.display = d.boltMount ? 'block' : 'none';
    var cnt = Number(d.boltCount) || 4;
    chs.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('active', Number(c.dataset.v)===cnt);
    });
    chk.onchange = function(){
      if(window._editDraft) window._editDraft.boltMount = chk.checked;
      ww.style.display = chk.checked ? 'block' : 'none';
      if(chk.checked && (!window._editDraft.boltCount)) window._editDraft.boltCount = 4;
      if(typeof saveDraft==='function') saveDraft();
      if(typeof calcPreview==='function' && window._editDraft) calcPreview(window._editDraft);
    };
    chs.onclick = function(e){
      var c = e.target.closest('.chip');
      if(!c) return;
      chs.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active');});
      c.classList.add('active');
      if(window._editDraft) window._editDraft.boltCount = Number(c.dataset.v);
      if(typeof saveDraft==='function') saveDraft();
      if(typeof calcPreview==='function' && window._editDraft) calcPreview(window._editDraft);
    };
  }

  function wrapOpenItem(){
    if(window._zrzOpenItemWrapped) return;
    if(typeof window.openItem !== 'function') return;
    var orig = window.openItem;
    window.openItem = function(id){
      var res = orig.apply(this, arguments);
      setTimeout(injectBoltUI, 30);
      return res;
    };
    window._zrzOpenItemWrapped = true;
  }

  function wrapCollectDraft(){
    if(window._zrzCollectWrapped) return;
    if(typeof window.collectDraft !== 'function') return;
    var orig = window.collectDraft;
    window.collectDraft = function(d){
      var r = orig.apply(this, arguments);
      try{
        var chk = document.getElementById('zrz_bolt_chk');
        if(chk && window._editDraft){
          r.boltMount = !!chk.checked;
          r.boltCount = Number(window._editDraft.boltCount)||4;
        }
      }catch(e){}
      return r;
    };
    window._zrzCollectWrapped = true;
  }

  function wrapBuildReceipt(){
    if(window._zrzReceiptWrapped) return;
    if(typeof window.buildReceiptModel !== 'function') return;
    var orig = window.buildReceiptModel;
    window.buildReceiptModel = function(o, items){
      var model = orig.apply(this, arguments);
      try{
        (model.items||[]).forEach(function(it, idx){
          var src = items[idx];
          if(!src || !src.boltMount) return;
          var cnt = Number(src.boltCount)||4;
          it.rows.push({k:'🔩 Болты', v:cnt+' шт, Ø8 мм, отступ 5 см от углов'});
        });
      }catch(e){}
      return model;
    };
    window._zrzReceiptWrapped = true;
  }

  /* ─── v4.2.6: каскадное появление строк в модалках ─── */
  function staggerModalRows(){
    var rows = document.querySelectorAll('.modal .info-line, .modal .shower-item, .modal .card-sub');
    for(var i=0;i<rows.length;i++){
      var el = rows[i];
      if(el.dataset && el.dataset.zrzStaggered) continue;
      el.dataset.zrzStaggered = '1';
      el.style.animation = 'zrz-row-in .34s cubic-bezier(.2,.7,.3,1) both';
      el.style.animationDelay = (i*12)+'ms';
    }
  }

  /* ─── CSS ─── */
  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
    var css = ''

    /* Базовая типографика */
    + '.card{padding:20px 22px 20px 26px !important;border-radius:22px !important;box-shadow:0 4px 20px rgba(90,120,170,0.10) !important;}'
    + '.card-title{font-size:17.5px !important;font-weight:800 !important;letter-spacing:-0.25px !important;line-height:1.25 !important;margin-bottom:6px !important;}'
    + '.card-sub{font-size:13.5px !important;line-height:1.5 !important;color:var(--text-soft) !important;}'
    + '.modal h2{font-size:23px !important;font-weight:800 !important;letter-spacing:-0.3px !important;line-height:1.2 !important;}'
    + '.modal{border-radius:32px 32px 0 0 !important;box-shadow:0 -12px 48px rgba(50,70,100,0.20) !important;animation:zrz-modal-in .34s cubic-bezier(.2,.85,.3,1) both !important;}'
    + '.section-title{font-size:12px !important;font-weight:800 !important;letter-spacing:1.3px !important;padding-bottom:10px !important;margin-top:28px !important;color:var(--accent-deep) !important;}'
    + '.info-line{padding:9px 0 !important;font-size:14px !important;}'
    + '.btn{padding:16px 22px !important;font-size:16px !important;font-weight:700 !important;border-radius:18px !important;letter-spacing:0.1px !important;transition:transform .14s cubic-bezier(.2,.7,.3,1),box-shadow .18s ease,filter .15s ease !important;}'
    + '.btn:active{transform:scale(0.955) !important;filter:brightness(0.95);}'
    + '.btn-primary{background:linear-gradient(135deg,#8badd8 0%,#5b7fb8 55%,#4a6ba5 100%) !important;box-shadow:0 10px 26px rgba(91,127,184,0.34) !important;}'
    + '.chip{padding:10px 17px !important;font-size:14px !important;font-weight:600 !important;transition:transform .12s cubic-bezier(.2,.7,.3,1),background .15s ease,box-shadow .15s ease !important;}'
    + '.chip:active{transform:scale(0.93) !important;}'
    + '.chip.active{box-shadow:0 5px 14px rgba(91,127,184,0.35) !important;font-weight:700 !important;}'
    + 'header{padding:11px 16px !important;}'
    + 'header button{width:44px !important;height:44px !important;border-radius:14px !important;font-size:21px !important;}'
    + '.progress-wrap{height:5px !important;}'
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'

    /* === v4.2.6: УСИЛЕННЫЙ ripple === */
    /* Карточка: волна крупная, полупрозрачная, дольше живёт */
    + '.card{position:relative;overflow:hidden;}'
    + '.zrz-card-ripple{position:absolute;pointer-events:none;border-radius:50%;background:radial-gradient(circle, rgba(91,127,184,0.55) 0%, rgba(91,127,184,0.18) 60%, rgba(91,127,184,0) 100%);transform:translate(-50%,-50%) scale(0);animation:zrz-card-ripple-anim .85s cubic-bezier(.2,.6,.4,1) forwards;}'
    + '@keyframes zrz-card-ripple-anim{0%{transform:translate(-50%,-50%) scale(0.3);opacity:1;}60%{opacity:0.85;}100%{transform:translate(-50%,-50%) scale(var(--zrz-scale,20));opacity:0;}}'

    /* Кнопки: усиленный ripple — громче и шире */
    + '.btn .ripple,.chip .ripple,.type-btn .ripple,.frame-chip .ripple,.key-btn .ripple,.team-chip .ripple,.role-btn .ripple{background:rgba(255,255,255,0.42) !important;width:40px !important;height:40px !important;}'
    + '.btn-secondary .ripple,.chip:not(.active) .ripple,.type-btn:not(.active) .ripple{background:rgba(91,127,184,0.35) !important;}'
    + '@keyframes ripple{to{transform:translate(-50%,-50%) scale(3.6) !important;opacity:0 !important;}}'

    /* === v4.2.6: появление строк === */
    + '@keyframes zrz-row-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}'

    /* === v4.2.6: пульс важной кнопки === */
    + '.btn-primary{animation:zrz-btn-breathe 3.6s ease-in-out infinite;}'
    + '@keyframes zrz-btn-breathe{0%,100%{box-shadow:0 10px 26px rgba(91,127,184,0.34);}50%{box-shadow:0 14px 34px rgba(91,127,184,0.48);}}'
    + '.modal .btn-primary{animation:none;}'

    /* Конфетти */
    + '@keyframes zrz-confetti-fall{0%{transform:translateY(0);opacity:1}85%{opacity:1}100%{transform:translateY(110vh);opacity:0}}'
    + '@keyframes zrz-confetti-spin{from{rotate:0deg}to{rotate:720deg}}'

    /* Пульс бейджа */
    + '.notif-bell .bell-badge{animation:zrz-badge-pulse 2s ease-in-out infinite;}'
    + '@keyframes zrz-badge-pulse{0%,100%{transform:scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.25);}50%{transform:scale(1.18);box-shadow:0 0 0 7px rgba(201,101,101,0.22);}}'

    /* Микро-пульс */
    + '@keyframes zrz-pulse-soft{0%{transform:scale(1)}40%{transform:scale(0.94)}70%{transform:scale(1.03)}100%{transform:scale(1)}}'

    /* Модалка пружина */
    + '@keyframes zrz-modal-in{from{transform:translateY(60px);opacity:0.5}to{transform:translateY(0);opacity:1}}'

    + '@media (max-width:420px){.card{padding:18px 18px 18px 22px !important;}.modal h2{font-size:21px !important;}.btn{padding:15px 18px !important;font-size:15.5px !important;}}'
    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ─── версия ─── */
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
    try{ wrapTechDraw(); }catch(e){}
    try{ wrapOpenItem(); }catch(e){}
    try{ wrapCollectDraft(); }catch(e){}
    try{ wrapBuildReceipt(); }catch(e){}
    try{ injectBoltUI(); }catch(e){}
    try{ staggerModalRows(); }catch(e){}
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
