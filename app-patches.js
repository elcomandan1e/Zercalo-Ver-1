/* app-patches.js — динамические патчи «Зерцало» v4.4.1
   Фичи: [все предыдущие] + v4.4.1:
   - openTechDraw берёт данные ИЗ ФОРМЫ (а не из базы)
   - поля для отступа выреза X/Y
   - более заметная подпись фацета
*/
(function(){
  var PATCH_VERSION = '4.4.1';
  var AUTHOR_NAME = 'Лютиков А.С.';
  var AUTHOR_TG = '@el_c0mandan1e';
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

  function fireConfetti(){
    if(document.getElementById('zrz-confetti')) return;
    var colors = ['#5b7fb8','#4caf7d','#d9924a','#c96565','#8b5cf6','#f0b400','#229ED9','#25D366'];
    var c = document.createElement('div');
    c.id = 'zrz-confetti';
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(c);
    for(var i=0;i<110;i++){
      var p = document.createElement('div');
      var color = colors[Math.floor(Math.random()*colors.length)];
      var size = 6 + Math.random()*11;
      var shape = Math.random();
      var radius = shape>0.7 ? '50%' : (shape>0.4 ? '2px' : '0');
      p.style.cssText = 'position:absolute;top:-24px;left:'+(Math.random()*100)+'%;width:'+size+'px;height:'+size*0.7+'px;background:'+color+';border-radius:'+radius+';opacity:0.95;animation:zrz-confetti-fall '+(2.1+Math.random()*1.4)+'s cubic-bezier(.2,.6,.4,1) '+(Math.random()*0.35)+'s forwards, zrz-confetti-spin '+(0.6+Math.random()*0.9)+'s linear infinite';
      c.appendChild(p);
    }
    setTimeout(function(){ c.remove(); }, 4200);
  }
  window._zrzConfetti = fireConfetti;

  function wrapSavePayment(){
    if(window._zrzSavePaymentWrapped) return;
    if(typeof window.savePayment !== 'function') return;
    var orig = window.savePayment;
    window.savePayment = function(orderId){
      var o=null; try{ o=db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var wasFull = !!(o && Number(o.orderTotal)>0 && Number(o.orderPaid)>=Number(o.orderTotal));
      var res = orig.apply(this, arguments);
      var now=null; try{ now=db.orders.find(function(x){return x.id===orderId;}); }catch(e){}
      var nowFull = !!(now && Number(now.orderTotal)>0 && Number(now.orderPaid)>=Number(now.orderTotal));
      if(nowFull && !wasFull) setTimeout(fireConfetti, 220);
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
        (function(b){ b.style.animation='zrz-pulse-soft .55s cubic-bezier(.2,.7,.3,1)'; setTimeout(function(){ b.style.animation=''; }, 600); })(btns[i]);
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
      if(e.target.closest('.btn,.chip,.tap-link,.del-x,.photo-thumb,.photo-del')) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var far = Math.max(Math.hypot(x,y), Math.hypot(rect.width-x,y), Math.hypot(x,rect.height-y), Math.hypot(rect.width-x,rect.height-y));
      var wave = document.createElement('span');
      wave.className = 'zrz-card-ripple';
      wave.style.left = x+'px'; wave.style.top = y+'px';
      wave.style.width = '40px'; wave.style.height = '40px';
      wave.style.setProperty('--zrz-scale', (far/20).toFixed(2));
      card.appendChild(wave);
      setTimeout(function(){ wave.remove(); }, 900);
    }, true);
  }

  /* ─── общие ─── */
  var DIM_COLOR = '#c14d4d';
  function _zrzDimLineFull(ctx, obj1, obj2, dimP1, dimP2, label, color){
    color = color || DIM_COLOR;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3,3]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(obj1.x, obj1.y); ctx.lineTo(dimP1.x, dimP1.y);
    ctx.moveTo(obj2.x, obj2.y); ctx.lineTo(dimP2.x, dimP2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    var dx = dimP2.x - dimP1.x, dy = dimP2.y - dimP1.y;
    var len = Math.hypot(dx, dy);
    if(len < 10){ ctx.restore(); return; }
    var ux = dx/len, uy = dy/len;
    var nx = -uy, ny = ux;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(dimP1.x, dimP1.y); ctx.lineTo(dimP2.x, dimP2.y); ctx.stroke();
    var tick = 6;
    ctx.beginPath();
    ctx.moveTo(dimP1.x - nx*tick, dimP1.y - ny*tick); ctx.lineTo(dimP1.x + nx*tick, dimP1.y + ny*tick);
    ctx.moveTo(dimP2.x - nx*tick, dimP2.y - ny*tick); ctx.lineTo(dimP2.x + nx*tick, dimP2.y + ny*tick);
    ctx.stroke();
    var arr = 7, aw = 3;
    ctx.beginPath();
    ctx.moveTo(dimP1.x, dimP1.y);
    ctx.lineTo(dimP1.x + ux*arr - nx*aw, dimP1.y + uy*arr - ny*aw);
    ctx.lineTo(dimP1.x + ux*arr + nx*aw, dimP1.y + uy*arr + ny*aw);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dimP2.x, dimP2.y);
    ctx.lineTo(dimP2.x - ux*arr - nx*aw, dimP2.y - uy*arr - ny*aw);
    ctx.lineTo(dimP2.x - ux*arr + nx*aw, dimP2.y - uy*arr + ny*aw);
    ctx.closePath(); ctx.fill();
    if(label){
      ctx.font = '800 13px "PT Sans Narrow",Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var mx = (dimP1.x+dimP2.x)/2, my = (dimP1.y+dimP2.y)/2;
      var tw = ctx.measureText(label).width + 12;
      ctx.save();
      ctx.translate(mx, my);
      if(Math.abs(uy) > 0.7) ctx.rotate(-Math.PI/2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-tw/2, -9, tw, 18);
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.strokeRect(-tw/2, -9, tw, 18);
      ctx.fillStyle = color;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ─── болты ─── */
  function getBoltOffset(d){
    var v = Number(d.boltOffset);
    if(!v || v<=0) return 5;
    if(v<1) v = 1;
    if(v>30) v = 30;
    return v;
  }
  function boltLayout(W, H, cnt, offCm){
    var off = offCm || 5;
    if(W < 2*off+1) off = Math.max(1, W/8);
    if(H < 2*off+1) off = Math.max(1, H/8);
    var pts = [{x:off,y:off},{x:W-off,y:off},{x:off,y:H-off},{x:W-off,y:H-off}];
    if(cnt>=6){ pts.push({x:W/2,y:off}); pts.push({x:W/2,y:H-off}); }
    if(cnt>=8){ pts.push({x:off,y:H/2}); pts.push({x:W-off,y:H/2}); }
    return pts;
  }
  function drawBoltCircle(ctx, px, py, r){
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
    ctx.fillStyle = '#eaf1fb'; ctx.fill();
    ctx.strokeStyle = '#1e4d7b'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, r*0.35), 0, Math.PI*2);
    ctx.fillStyle = '#1e4d7b'; ctx.fill();
  }
  function _zrzDrawBoltsWithCallout(ctx, x0, y0, sc3, W, H, d, calloutLeftLimit){
    if(!d.boltMount) return;
    var cnt = Number(d.boltCount)||0;
    if(cnt<4) return;
    var off = getBoltOffset(d);
    var pts = boltLayout(W, H, cnt, off);
    var r = Math.max(3, Math.min(7, 0.45*sc3));
    ctx.save();
    pts.forEach(function(p){ drawBoltCircle(ctx, x0 + p.x*sc3, y0 + p.y*sc3, r); });
    ctx.restore();
    var lt = pts.filter(function(p){ return Math.abs(p.x - off) < 0.01 && Math.abs(p.y - off) < 0.01; })[0];
    if(!lt) return;
    var tipX = x0 + lt.x*sc3;
    var tipY = y0 + lt.y*sc3;
    var lineY = y0 - 8;
    var endX = Math.max(calloutLeftLimit + 20, x0 - 110);
    ctx.save();
    ctx.strokeStyle = '#1e4d7b'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 14, tipY);
    ctx.lineTo(tipX - 14, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(tipX, tipY, 2.2, 0, Math.PI*2);
    ctx.fillStyle = '#1e4d7b'; ctx.fill();
    var tx = endX + 6;
    var ty = lineY - 4;
    ctx.fillStyle = '#1e4d7b';
    ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('отступ '+numFmt(off)+' см', tx, ty + 32);
    ctx.fillText('Ø выреза 8 мм', tx, ty + 18);
    ctx.fillText('🔩 '+pts.length+' болтов', tx, ty + 4);
    ctx.restore();
  }
  function apronTotalWH(d){
    var secs = Array.isArray(d.apronSections)?d.apronSections:[];
    if(!secs.length) return null;
    var totalW = 0, maxH = 0;
    secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
    if(totalW<1||maxH<1) return null;
    return {W: totalW, H: maxH};
  }

  /* ─── розетки / бра ─── */
  var DIM_SOCKET_COLOR = '#a05c26';
  var DIM_LIGHT_COLOR  = '#7a3d8a';
  function _zrzDrawSocketDot(ctx, cx, cy, r){
    ctx.save();
    ctx.fillStyle = '#f5c93a';
    ctx.strokeStyle = '#8a6a2c';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx-r-4, cy); ctx.lineTo(cx+r+4, cy);
    ctx.moveTo(cx, cy-r-4); ctx.lineTo(cx, cy+r+4);
    ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  }
  function _zrzSocketCenters(s, x0, y0, pxW, pxH, sc3){
    var cnt = Math.max(1, Number(s.count)||1);
    var stepCm = Number(s.step)||7.1;
    var dx = Number(s.distX)||0;
    var dy = Number(s.distY)||0;
    var or = s.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    var baseX = (s.edgeX==='right') ? (x0 + pxW - dx*sc3) : (x0 + dx*sc3);
    var baseY = (s.edgeY==='top')   ? (y0 + dy*sc3)       : (y0 + pxH - dy*sc3);
    var pts = [];
    for(var k=0;k<cnt;k++){
      if(or === 'horizontal'){
        var sx = (s.edgeX==='left') ? (baseX + k*stepCm*sc3) : (baseX - k*stepCm*sc3);
        pts.push({x:sx, y:baseY});
      } else {
        var sy = (s.edgeY==='top') ? (baseY + k*stepCm*sc3) : (baseY - k*stepCm*sc3);
        pts.push({x:baseX, y:sy});
      }
    }
    return {pts: pts, baseX: baseX, baseY: baseY, or: or, stepCm: stepCm, edgeX: s.edgeX, edgeY: s.edgeY};
  }
  function _zrzDrawSocketDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.socketsMount || !Array.isArray(d.socketsList) || !d.socketsList.length) return;
    for(var i=0;i<d.socketsList.length;i++){
      var s = d.socketsList[i];
      var info = _zrzSocketCenters(s, x0, y0, pxW, pxH, sc3);
      var pts = info.pts;
      if(!pts.length) continue;
      var first = pts[0], last = pts[pts.length-1];
      var baseX = info.baseX, baseY = info.baseY;
      var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
      var minY = Math.min.apply(null, pts.map(function(p){return p.y;}));
      var maxY = Math.max.apply(null, pts.map(function(p){return p.y;}));
      var minX = Math.min.apply(null, pts.map(function(p){return p.x;}));
      var maxX = Math.max.apply(null, pts.map(function(p){return p.x;}));
      var edgeXpx = (s.edgeX==='right') ? (x0 + pxW) : x0;
      _zrzDimLineFull(ctx, {x:edgeXpx, y:maxY + 6}, {x:baseX, y:maxY + 6}, {x:edgeXpx, y:maxY + 40}, {x:baseX, y:maxY + 40}, numFmt(dx)+' см', DIM_SOCKET_COLOR);
      var yDimX = (s.edgeX==='right') ? (minX - 46) : (maxX + 46);
      var edgeYpx = (s.edgeY==='top') ? y0 : (y0 + pxH);
      _zrzDimLineFull(ctx, {x:maxX + 6, y:edgeYpx}, {x:maxX + 6, y:baseY}, {x:yDimX, y:edgeYpx}, {x:yDimX, y:baseY}, numFmt(dy)+' см', DIM_SOCKET_COLOR);
      if(pts.length > 1){
        if(info.or === 'horizontal'){
          var yStep = (s.edgeY==='top') ? (maxY + 20) : (minY - 28);
          _zrzDimLineFull(ctx, {x:first.x, y:yStep > maxY ? maxY : minY}, {x:last.x, y:yStep > maxY ? maxY : minY}, {x:first.x, y:yStep}, {x:last.x, y:yStep}, 'шаг '+numFmt(info.stepCm)+' см', DIM_SOCKET_COLOR);
        } else {
          var xStep = (s.edgeX==='right') ? (maxX + 46 + 44) : (minX - 46 - 44);
          _zrzDimLineFull(ctx, {x:minX, y:first.y}, {x:minX, y:last.y}, {x:xStep, y:first.y}, {x:xStep, y:last.y}, 'шаг '+numFmt(info.stepCm)+' см', DIM_SOCKET_COLOR);
        }
      }
    }
  }
  function _zrzDrawLightDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.lightsMount || !Array.isArray(d.lightsList) || !d.lightsList.length) return;
    for(var i=0;i<d.lightsList.length;i++){
      var s = d.lightsList[i];
      var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
      var baseX = (s.edgeX==='right') ? (x0 + pxW - dx*sc3) : (x0 + dx*sc3);
      var baseY = (s.edgeY==='bottom')? (y0 + pxH - dy*sc3) : (y0 + dy*sc3);
      var edgeXpx = (s.edgeX==='right') ? (x0 + pxW) : x0;
      var edgeYpx = (s.edgeY==='top') ? y0 : (y0 + pxH);
      _zrzDimLineFull(ctx, {x:edgeXpx, y:baseY - 6}, {x:baseX, y:baseY - 6}, {x:edgeXpx, y:baseY - 46}, {x:baseX, y:baseY - 46}, numFmt(dx)+' см', DIM_LIGHT_COLOR);
      var yDimX = (s.edgeX==='right') ? (baseX - 46) : (baseX + 46);
      _zrzDimLineFull(ctx, {x:baseX + (s.edgeX==='right' ? 6 : -6), y:edgeYpx}, {x:baseX + (s.edgeX==='right' ? 6 : -6), y:baseY}, {x:yDimX, y:edgeYpx}, {x:yDimX, y:baseY}, numFmt(dy)+' см', DIM_LIGHT_COLOR);
    }
  }

  /* ═══ v4.4.1: ВЫРЕЗ С ОТСТУПОМ ═══ */
  var DIM_CUT_COLOR  = '#c95a1e';
  var DIM_FACET_COLOR= '#c95a1e';
  var DIM_ROUND_COLOR= '#c14d4d';

  function _zrzCutoutRect(d, x0, y0, pxW, pxH, sc3){
    /* Возвращает {x, y, w, h} в пикселях — позиция выреза */
    var w = Number(d.cutoutW)||0;
    if(w<=0) return null;
    var shape = (d.cutoutShape==='circle') ? 'circle' : 'rect';
    var wPx = w * sc3;
    var hPx = (shape==='circle' ? w : (Number(d.cutoutH)||w)) * sc3;
    var xCut, yCut;
    if(d.cutoutCenter===false && (d.cutoutDistX!=null||d.cutoutDistY!=null)){
      var dx = Number(d.cutoutDistX)||0;
      var dy = Number(d.cutoutDistY)||0;
      if(d.cutoutEdgeX==='right') xCut = x0 + pxW - dx*sc3 - wPx;
      else xCut = x0 + dx*sc3;
      if(d.cutoutEdgeY==='bottom') yCut = y0 + pxH - dy*sc3 - hPx;
      else yCut = y0 + dy*sc3;
    } else {
      xCut = x0 + (pxW - wPx)/2;
      yCut = y0 + (pxH - hPx)/2;
    }
    return {x:xCut, y:yCut, w:wPx, h:hPx, wCm:w, hCm:Number(d.cutoutH)||w, shape:shape};
  }

  function _zrzDrawCutout(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.cutoutEnabled) return;
    var r = _zrzCutoutRect(d, x0, y0, pxW, pxH, sc3);
    if(!r) return;
    var cx = r.x + r.w/2;
    var cy = r.y + r.h/2;

    ctx.save();
    ctx.strokeStyle = DIM_CUT_COLOR;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5,3]);
    ctx.beginPath();
    if(r.shape === 'circle'){ ctx.arc(cx, cy, r.w/2, 0, Math.PI*2); }
    else { ctx.rect(r.x, r.y, r.w, r.h); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    /* Размеры от края до выреза */
    var isCenter = (d.cutoutCenter!==false);
    if(!isCenter || d.cutoutDistX!=null || d.cutoutDistY!=null){
      /* X — от края до ближайшей стороны выреза */
      var edgeX = (d.cutoutEdgeX==='right') ? (x0 + pxW) : x0;
      var refX = (d.cutoutEdgeX==='right') ? (r.x + r.w) : r.x;
      _zrzDimLineFull(ctx, {x:edgeX, y:r.y - 6}, {x:refX, y:r.y - 6}, {x:edgeX, y:r.y - 32}, {x:refX, y:r.y - 32}, numFmt(d.cutoutDistX||0)+' см', DIM_CUT_COLOR);
      /* Y — от края до ближайшей стороны выреза */
      var edgeY = (d.cutoutEdgeY==='bottom') ? (y0 + pxH) : y0;
      var refY = (d.cutoutEdgeY==='bottom') ? (r.y + r.h) : r.y;
      _zrzDimLineFull(ctx, {x:r.x - 6, y:edgeY}, {x:r.x - 6, y:refY}, {x:r.x - 32, y:edgeY}, {x:r.x - 32, y:refY}, numFmt(d.cutoutDistY||0)+' см', DIM_CUT_COLOR);
    }

    /* Размер ширины */
    _zrzDimLineFull(ctx, {x:r.x, y:r.y + r.h + 6}, {x:r.x + r.w, y:r.y + r.h + 6}, {x:r.x, y:r.y + r.h + 30}, {x:r.x + r.w, y:r.y + r.h + 30}, r.shape === 'circle' ? ('Ø '+numFmt(r.wCm)+' см') : (numFmt(r.wCm)+' см'), DIM_CUT_COLOR);
    /* Размер высоты — только для rect */
    if(r.shape === 'rect'){
      _zrzDimLineFull(ctx, {x:r.x + r.w + 6, y:r.y}, {x:r.x + r.w + 6, y:r.y + r.h}, {x:r.x + r.w + 30, y:r.y}, {x:r.x + r.w + 30, y:r.y + r.h}, numFmt(r.hCm)+' см', DIM_CUT_COLOR);
    }
  }

  /* ═══ v4.4.1: фацет с крупной подписью ═══ */
  function _zrzDrawFacetDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(d.type !== 'MIRROR') return;
    if(d.edge !== 'Фацет') return;
    var fwMm = Number(d.facetWidth)||0;
    if(fwMm <= 0) return;
    var fwPx = fwMm/10 * sc3;
    if(fwPx <= 2) return;
    if(fwPx*2 >= pxW || fwPx*2 >= pxH) return;

    /* Рисуем жирную внутреннюю рамку (дублирует родную, но ярче) */
    ctx.save();
    ctx.strokeStyle = DIM_FACET_COLOR;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4,3]);
    ctx.beginPath();
    ctx.rect(x0 + fwPx, y0 + fwPx, pxW - 2*fwPx, pxH - 2*fwPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    /* Размер ширины фацета — сверху от левого верхнего угла */
    _zrzDimLineFull(ctx,
      {x:x0 + 4, y:y0 - 4}, {x:x0 + fwPx, y:y0 - 4},
      {x:x0 + 4, y:y0 - 26}, {x:x0 + fwPx, y:y0 - 26},
      numFmt(fwMm)+' мм', DIM_FACET_COLOR);

    /* Крупная подпись сверху справа */
    ctx.save();
    ctx.font = '800 14px "PT Sans Narrow",Arial';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    var label = '✂️ Фацет '+numFmt(fwMm)+' мм';
    var tw = ctx.measureText(label).width + 16;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x0 + pxW - tw, y0 + pxH - 26, tw, 20);
    ctx.strokeStyle = DIM_FACET_COLOR; ctx.lineWidth = 1.2;
    ctx.strokeRect(x0 + pxW - tw, y0 + pxH - 26, tw, 20);
    ctx.fillStyle = DIM_FACET_COLOR;
    ctx.fillText(label, x0 + pxW - 6, y0 + pxH - 23);
    ctx.restore();
  }

  function _zrzDrawRoundedCorners(ctx, x0, y0, pxW, pxH, sc3, d){
    if(d.type !== 'MIRROR') return;
    if(!d.roundedCorners) return;
    if(d.shape !== 'RECT' && d.shape !== 'RECT4') return;
    var rMm = Number(d.cornerRadius)||0;
    if(rMm <= 0) return;
    var rPx = rMm/10 * sc3;
    if(rPx < 3) return;
    ctx.save();
    ctx.strokeStyle = DIM_ROUND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + rPx, y0 + rPx, rPx, Math.PI, 1.5*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + pxW - rPx, y0 + rPx, rPx, 1.5*Math.PI, 2*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + pxW - rPx, y0 + pxH - rPx, rPx, 0, 0.5*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + rPx, y0 + pxH - rPx, rPx, 0.5*Math.PI, Math.PI); ctx.stroke();
    ctx.restore();
    var tx = x0 + pxW - rPx;
    var ty = y0 + rPx;
    ctx.save();
    ctx.strokeStyle = DIM_ROUND_COLOR;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + 22, ty - 22);
    ctx.lineTo(tx + 70, ty - 22);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI*2);
    ctx.fillStyle = DIM_ROUND_COLOR; ctx.fill();
    ctx.font = '800 12px "PT Sans Narrow",Arial';
    ctx.fillStyle = '#fff';
    var label = 'R'+numFmt(rMm)+' мм';
    var tw = ctx.measureText(label).width + 10;
    var lx = tx + 76;
    var ly = ty - 22;
    ctx.fillRect(lx - 4, ly - 8, tw, 16);
    ctx.strokeStyle = DIM_ROUND_COLOR; ctx.lineWidth = 1;
    ctx.strokeRect(lx - 4, ly - 8, tw, 16);
    ctx.fillStyle = DIM_ROUND_COLOR;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx, ly);
    ctx.restore();
  }

  function _zrzDrawSocketsAndLightsFront(ctx, x, y, w, h, d){
    if(d.type!=='MIRROR' && d.type!=='PANNO') return;
    var gd = null; try{ gd = glassDimensions(d); }catch(e){ return; }
    if(!gd || !gd.w || !gd.h) return;
    var cx=x+w/2, cy=y+h/2;
    var sc3=Math.min((w-80)/Math.max(gd.w||1,1),(h-60)/Math.max(gd.h||1,1));
    var pxW=gd.w*sc3, pxH=gd.h*sc3;
    var x0=cx-pxW/2, y0=cy-pxH/2;
    if(d.socketsMount && Array.isArray(d.socketsList)){
      var sockR = Math.max(5, (7/2)*sc3);
      d.socketsList.forEach(function(s){
        var info = _zrzSocketCenters(s, x0, y0, pxW, pxH, sc3);
        info.pts.forEach(function(p){ _zrzDrawSocketDot(ctx, p.x, p.y, sockR); });
      });
    }
    if(d.lightsMount && Array.isArray(d.lightsList)){
      var lightR = Math.max(6, (8/2)*sc3);
      d.lightsList.forEach(function(s){
        var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
        var baseX = (s.edgeX==='right') ? (x0 + pxW - dx*sc3) : (x0 + dx*sc3);
        var baseY = (s.edgeY==='bottom')? (y0 + pxH - dy*sc3) : (y0 + dy*sc3);
        ctx.save();
        ctx.fillStyle='#e6ecf5';
        ctx.strokeStyle='#3b5c8f'; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.arc(baseX, baseY, lightR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(baseX, baseY, Math.max(2, lightR*0.4), 0, Math.PI*2);
        ctx.strokeStyle='#3b5c8f'; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
      });
    }
    _zrzDrawSocketDims(ctx, x0, y0, pxW, pxH, sc3, d);
    _zrzDrawLightDims(ctx, x0, y0, pxW, pxH, sc3, d);
  }

  function _zrzDrawSocketLightDimsIso(ctx, x, y, w, h, d){
    if(d.type!=='MIRROR' && d.type!=='PANNO') return;
    var gd = null; try{ gd = glassDimensions(d); }catch(e){ return; }
    if(!gd || !gd.w || !gd.h) return;
    var cx=x+w/2, cy=y+h/2;
    var _padL=64,_padR=88,_padT=48,_padB=78;
    var _avW=Math.max(80,w-_padL-_padR), _avH=Math.max(60,h-_padT-_padB);
    var sc3=Math.min(_avW/Math.max(gd.w||1,1), _avH/Math.max(gd.h||1,1));
    var pxW=gd.w*sc3, pxH=gd.h*sc3;
    var x0=cx-pxW/2, y0=cy-pxH/2+12;
    _zrzDrawSocketDims(ctx, x0, y0, pxW, pxH, sc3, d);
    _zrzDrawLightDims(ctx, x0, y0, pxW, pxH, sc3, d);
  }

  function wrapTechDraw(){
    if(window._zrzTechDrawWrapped) return;
    window._zrzTechDrawWrapped = true;
    if(typeof window.drawTechIso === 'function'){
      var origIso = window.drawTechIso;
      window.drawTechIso = function(ctx, x, y, w, h, dims, scale, d){
        var res = origIso.apply(this, arguments);
        try{
          var cx=x+w/2, cy=y+h/2;
          var _padL=64,_padR=88,_padT=48,_padB=78;
          var _avW=Math.max(80,w-_padL-_padR), _avH=Math.max(60,h-_padT-_padB);
          if(d.type==='MIRROR'){
            var gd = glassDimensions(d);
            var sc3=Math.min(_avW/Math.max(gd.w||1,1), _avH/Math.max(gd.h||1,1));
            var pxW=gd.w*sc3, pxH=gd.h*sc3;
            var x0=cx-pxW/2, y0=cy-pxH/2+12;
            if(d.boltMount) _zrzDrawBoltsWithCallout(ctx, x0, y0, sc3, gd.w, gd.h, d, x);
            _zrzDrawCutout(ctx, x0, y0, pxW, pxH, sc3, d);
            _zrzDrawFacetDims(ctx, x0, y0, pxW, pxH, sc3, d);
            _zrzDrawRoundedCorners(ctx, x0, y0, pxW, pxH, sc3, d);
          } else if(d.type==='APRON' && d.boltMount){
            var wh = apronTotalWH(d);
            if(wh){
              var sc3a = Math.min(_avW/wh.W, _avH/wh.H);
              var x0a = cx - (wh.W*sc3a)/2;
              var y0a = cy - (wh.H*sc3a)/2 + 12;
              _zrzDrawBoltsWithCallout(ctx, x0a, y0a, sc3a, wh.W, wh.H, d, x);
            }
          }
          _zrzDrawSocketLightDimsIso(ctx, x, y, w, h, d);
        }catch(e){}
        return res;
      };
    }
    if(typeof window.drawTechFront === 'function'){
      var origFront = window.drawTechFront;
      window.drawTechFront = function(ctx, x, y, w, h, d){
        var res = origFront.apply(this, arguments);
        try{
          var cx=x+w/2, cy=y+h/2;
          if(d.type==='MIRROR'){
            var gd = glassDimensions(d);
            var sc3=Math.min((w-80)/Math.max(gd.w||1,1),(h-60)/Math.max(gd.h||1,1));
            var pxW=gd.w*sc3, pxH=gd.h*sc3;
            var x0=cx-pxW/2, y0=cy-pxH/2;
            if(d.boltMount) _zrzDrawBoltsWithCallout(ctx, x0, y0, sc3, gd.w, gd.h, d, x);
            _zrzDrawCutout(ctx, x0, y0, pxW, pxH, sc3, d);
            _zrzDrawFacetDims(ctx, x0, y0, pxW, pxH, sc3, d);
            _zrzDrawRoundedCorners(ctx, x0, y0, pxW, pxH, sc3, d);
          } else if(d.type==='APRON' && d.boltMount){
            var secs = Array.isArray(d.apronSections)?d.apronSections:[];
            if(secs.length){
              var totalW=0, maxH=0;
              secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
              if(totalW>0 && maxH>0){
                var gap = 16;
                var sc = Math.min((w-80-gap*(secs.length-1))/totalW, (h-60)/maxH);
                var startX = cx - (totalW*sc + gap*(secs.length-1))/2;
                var baseY = cy + maxH*sc/2 - 10;
                var y0a = baseY - maxH*sc;
                _zrzDrawBoltsWithCallout(ctx, startX, y0a, sc, totalW, maxH, d, x);
              }
            }
          }
          _zrzDrawSocketsAndLightsFront(ctx, x, y, w, h, d);
        }catch(e){}
        return res;
      };
    }
  }

  /* ═══ v4.4.1: фикс openTechDraw — из формы, а не из базы ═══ */
  function wrapOpenTechDraw(){
    if(window._zrzOpenTechDrawWrapped) return;
    if(typeof window.openTechDraw !== 'function') return;
    var orig = window.openTechDraw;
    window.openTechDraw = function(itemId){
      /* Если открыт чертёж для сохранённой позиции, и та же позиция сейчас в форме —
         берём данные ИЗ ФОРМЫ, а не из базы. */
      try{
        var numId = parseInt(itemId,10)||0;
        if(numId>0 && window._editId===numId && window._editDraft && typeof collectDraft==='function'){
          /* Подменяем данные в db временно — чтобы оригинальная openTechDraw взяла свежак */
          var idx = -1;
          for(var i=0;i<db.items.length;i++){ if(db.items[i].id===numId){ idx=i; break; } }
          if(idx>=0){
            var backup = JSON.parse(JSON.stringify(db.items[idx]));
            var fresh = collectDraft(window._editDraft);
            /* Копируем свежие поля в db.items[idx] */
            for(var k in fresh){
              if(Object.prototype.hasOwnProperty.call(fresh,k)) db.items[idx][k] = fresh[k];
            }
            try{
              var res = orig.apply(this, arguments);
              return res;
            } finally {
              /* Восстанавливаем (чтобы не пушить в базу случайно) */
              for(var k2 in backup){
                if(Object.prototype.hasOwnProperty.call(backup,k2)) db.items[idx][k2] = backup[k2];
              }
            }
          }
        }
      }catch(e){ try{console.warn('[patch] openTechDraw wrapper', e);}catch(_){} }
      return orig.apply(this, arguments);
    };
    window._zrzOpenTechDrawWrapped = true;
  }

  /* ─── UI формы ─── */
  function injectBoltUI(){
    var m = document.querySelector('.modal');
    if(!m) return;
    if(m.querySelector('#zrz_bolt_block')) return;
    var d = window._editDraft || {};
    if(d.type!=='MIRROR' && d.type!=='APRON') return;
    var anchor = document.getElementById('calcBox');
    if(!anchor) return;
    var off = getBoltOffset(d);
    var html = '<div id="zrz_bolt_block" style="margin-top:14px">'
      + '<div class="section-title" style="margin-top:0">🔩 Декоративные болты</div>'
      + '<div class="checkbox-row" style="background:linear-gradient(180deg,rgba(59,92,143,0.10),rgba(59,92,143,0.04));border:1.5px solid rgba(59,92,143,0.28)">'
      + '<input type="checkbox" id="zrz_bolt_chk"><label for="zrz_bolt_chk">Крепление на болты (Ø выреза 8 мм)</label>'
      + '</div>'
      + '<div id="zrz_bolt_count_wrap" style="display:none;margin-top:10px">'
      + '  <label style="margin-top:0">Количество</label>'
      + '  <div class="chips" id="zrz_bolt_chips">'
      + '    <button type="button" class="chip" data-v="4">4 болта · по углам</button>'
      + '    <button type="button" class="chip" data-v="6">6 болтов · +верх/низ</button>'
      + '    <button type="button" class="chip" data-v="8">8 болтов · +лево/право</button>'
      + '  </div>'
      + '  <label style="margin-top:12px">Отступ от края, см</label>'
      + '  <div class="chips" id="zrz_bolt_offset_presets" style="margin-bottom:6px">'
      + '    <button type="button" class="chip" data-off="3">3</button>'
      + '    <button type="button" class="chip" data-off="5">5</button>'
      + '    <button type="button" class="chip" data-off="7">7</button>'
      + '    <button type="button" class="chip" data-off="10">10</button>'
      + '    <button type="button" class="chip" data-off="15">15</button>'
      + '  </div>'
      + '  <input id="zrz_bolt_offset_input" type="text" inputmode="decimal" placeholder="Своё значение, см" value="'+numFmt(off)+'">'
      + '</div></div>';
    anchor.insertAdjacentHTML('beforebegin', html);
    var chk = document.getElementById('zrz_bolt_chk');
    var ww = document.getElementById('zrz_bolt_count_wrap');
    var chs = document.getElementById('zrz_bolt_chips');
    var offs = document.getElementById('zrz_bolt_offset_presets');
    var offInput = document.getElementById('zrz_bolt_offset_input');
    chk.checked = !!d.boltMount;
    ww.style.display = d.boltMount ? 'block' : 'none';
    var cnt = Number(d.boltCount) || 4;
    chs.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', Number(c.dataset.v)===cnt); });
    offs.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', Number(c.dataset.off)===off); });
    function setOffset(v){
      v = parseFloat(String(v).replace(',','.'))||0;
      if(v<1) v=1;
      if(v>30) v=30;
      if(window._editDraft){
        window._editDraft.boltOffset = v;
        if(offInput && document.activeElement !== offInput) offInput.value = numFmt(v);
        offs.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', Number(c.dataset.off)===v); });
      }
      if(typeof saveDraft==='function') saveDraft();
    }
    chk.onchange = function(){
      if(window._editDraft) window._editDraft.boltMount = chk.checked;
      ww.style.display = chk.checked ? 'block' : 'none';
      if(chk.checked){
        if(!window._editDraft.boltCount) window._editDraft.boltCount = 4;
        if(!window._editDraft.boltOffset) window._editDraft.boltOffset = 5;
      }
      if(typeof saveDraft==='function') saveDraft();
    };
    chs.onclick = function(e){
      var c = e.target.closest('.chip');
      if(!c) return;
      chs.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active');});
      c.classList.add('active');
      if(window._editDraft) window._editDraft.boltCount = Number(c.dataset.v);
      if(typeof saveDraft==='function') saveDraft();
    };
    offs.onclick = function(e){
      var c = e.target.closest('.chip');
      if(!c) return;
      setOffset(Number(c.dataset.off));
    };
    if(offInput){
      offInput.oninput = function(){ setOffset(offInput.value); };
      offInput.onblur = function(){
        var v = parseFloat(String(offInput.value).replace(',','.'))||0;
        if(v<1) v=1; if(v>30) v=30;
        offInput.value = numFmt(v);
      };
    }
  }

  /* ═══ v4.4.1: UI отступа выреза ═══ */
  function injectCutoutUI(){
    var m = document.querySelector('.modal');
    if(!m) return;
    var d = window._editDraft || {};
    if(d.type !== 'MIRROR') return;
    var wrap = document.getElementById('cutout_wrap');
    if(!wrap) return;
    /* Уже вставлен */
    if(document.getElementById('zrz_cutout_ui')) return;
    /* Вырез включён? */
    var chk = document.getElementById('e_cutout');
    if(!chk || !chk.checked) return;

    var isCenter = d.cutoutCenter !== false;
    var dx = Number(d.cutoutDistX)||0;
    var dy = Number(d.cutoutDistY)||0;
    var ex = d.cutoutEdgeX || 'left';
    var ey = d.cutoutEdgeY || 'top';

    var html = '<div id="zrz_cutout_ui" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--accent-line)">'
      + '<label style="margin-top:0">Расположение выреза</label>'
      + '<div class="chips" id="zrz_cutout_pos_chips" style="margin-top:4px">'
      + '<button type="button" class="chip '+(isCenter?'active':'')+'" data-v="center">По центру</button>'
      + '<button type="button" class="chip '+(!isCenter?'active':'')+'" data-v="custom">Свой отступ</button>'
      + '</div>'
      + '<div id="zrz_cutout_custom" style="display:'+(isCenter?'none':'block')+';margin-top:10px">'
      + '<div class="row2">'
      + '<div><label style="font-size:11px;color:#8894a9">X, см</label><input id="zrz_cut_x" type="text" inputmode="decimal" value="'+numFmt(dx)+'" placeholder="30"><div class="chips" style="margin-top:6px"><button type="button" class="chip '+(ex==='left'?'active':'')+'" data-edge="left" data-axis="X">← лево</button><button type="button" class="chip '+(ex==='right'?'active':'')+'" data-edge="right" data-axis="X">право →</button></div></div>'
      + '<div><label style="font-size:11px;color:#8894a9">Y, см</label><input id="zrz_cut_y" type="text" inputmode="decimal" value="'+numFmt(dy)+'" placeholder="30"><div class="chips" style="margin-top:6px"><button type="button" class="chip '+(ey==='top'?'active':'')+'" data-edge="top" data-axis="Y">верх ↑</button><button type="button" class="chip '+(ey==='bottom'?'active':'')+'" data-edge="bottom" data-axis="Y">↓ низ</button></div></div>'
      + '</div></div></div>';
    wrap.insertAdjacentHTML('beforeend', html);

    var posChips = document.getElementById('zrz_cutout_pos_chips');
    var customDiv = document.getElementById('zrz_cutout_custom');
    var xInp = document.getElementById('zrz_cut_x');
    var yInp = document.getElementById('zrz_cut_y');

    function setPos(v){
      posChips.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('active', x.dataset.v===v);});
      customDiv.style.display = (v==='custom') ? 'block' : 'none';
      if(window._editDraft){
        window._editDraft.cutoutCenter = (v==='center');
        if(v==='custom'){
          if(window._editDraft.cutoutDistX==null) window._editDraft.cutoutDistX = 30;
          if(window._editDraft.cutoutDistY==null) window._editDraft.cutoutDistY = 30;
          xInp.value = numFmt(window._editDraft.cutoutDistX);
          yInp.value = numFmt(window._editDraft.cutoutDistY);
        }
      }
      if(typeof saveDraft==='function') saveDraft();
    }
    posChips.onclick = function(e){
      var c = e.target.closest('.chip'); if(!c) return;
      setPos(c.dataset.v);
    };
    xInp.oninput = function(){
      if(window._editDraft){
        var v = parseFloat(String(xInp.value).replace(',','.'))||0;
        window._editDraft.cutoutDistX = v;
      }
      if(typeof saveDraft==='function') saveDraft();
    };
    yInp.oninput = function(){
      if(window._editDraft){
        var v = parseFloat(String(yInp.value).replace(',','.'))||0;
        window._editDraft.cutoutDistY = v;
      }
      if(typeof saveDraft==='function') saveDraft();
    };
    customDiv.querySelectorAll('button[data-edge]').forEach(function(b){
      b.onclick = function(){
        var axis = b.dataset.axis;
        var edge = b.dataset.edge;
        customDiv.querySelectorAll('button[data-axis="'+axis+'"]').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active');
        if(window._editDraft){
          if(axis==='X') window._editDraft.cutoutEdgeX = edge;
          else window._editDraft.cutoutEdgeY = edge;
        }
        if(typeof saveDraft==='function') saveDraft();
      };
    });
  }

  function injectSocketOrientationUI(){
    var box = document.getElementById('socketsList');
    if(!box) return;
    var d = window._editDraft;
    if(!d || !Array.isArray(d.socketsList)) return;
    d.socketsList.forEach(function(s, idx){
      var cnt = Number(s.count)||1;
      if(cnt < 2) return;
      var itemEl = box.children[idx];
      if(!itemEl) return;
      if(itemEl.querySelector('.zrz-orientation-chips')) return;
      var or = s.orientation === 'horizontal' ? 'horizontal' : 'vertical';
      var html = '<div class="zrz-orientation-chips" style="margin-top:10px">'
        + '<label style="font-size:11px;color:#8894a9">Расположение</label>'
        + '<div class="chips" style="margin-top:4px">'
        + '<button type="button" class="chip '+(or==='vertical'?'active':'')+'" data-or="vertical">↕ Вертикально</button>'
        + '<button type="button" class="chip '+(or==='horizontal'?'active':'')+'" data-or="horizontal">↔ Горизонтально</button>'
        + '</div></div>';
      itemEl.insertAdjacentHTML('beforeend', html);
      var chips = itemEl.querySelector('.zrz-orientation-chips');
      chips.onclick = function(e){
        var c = e.target.closest('.chip');
        if(!c) return;
        chips.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active');});
        c.classList.add('active');
        if(window._editDraft && window._editDraft.socketsList[idx]){
          window._editDraft.socketsList[idx].orientation = c.dataset.or;
        }
        if(typeof saveDraft==='function') saveDraft();
      };
    });
  }

  function wrapRenderSockets(){
    if(window._zrzRenderSocketsWrapped) return;
    if(typeof window.renderSocketsBuilder !== 'function') return;
    var orig = window.renderSocketsBuilder;
    window.renderSocketsBuilder = function(){
      var res = orig.apply(this, arguments);
      setTimeout(injectSocketOrientationUI, 40);
      return res;
    };
    window._zrzRenderSocketsWrapped = true;
  }

  function wrapOpenItem(){
    if(window._zrzOpenItemWrapped) return;
    if(typeof window.openItem !== 'function') return;
    var orig = window.openItem;
    window.openItem = function(id){
      var res = orig.apply(this, arguments);
      setTimeout(function(){
        injectBoltUI();
        injectCutoutUI();
        injectSocketOrientationUI();
      }, 60);
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
        if(window._editDraft){
          r.boltMount = !!window._editDraft.boltMount;
          r.boltCount = Number(window._editDraft.boltCount)||4;
          r.boltOffset = getBoltOffset(window._editDraft);
          r.cutoutCenter = (window._editDraft.cutoutCenter !== false);
          r.cutoutDistX = Number(window._editDraft.cutoutDistX)||0;
          r.cutoutDistY = Number(window._editDraft.cutoutDistY)||0;
          r.cutoutEdgeX = window._editDraft.cutoutEdgeX==='right'?'right':'left';
          r.cutoutEdgeY = window._editDraft.cutoutEdgeY==='bottom'?'bottom':'top';
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
          if(!src) return;
          if(src.boltMount){
            var cnt = Number(src.boltCount)||4;
            var off = getBoltOffset(src);
            it.rows.push({k:'🔩 Болты', v:cnt+' шт, Ø выреза 8 мм, отступ '+numFmt(off)+' см от углов'});
          }
          if(src.socketsMount && Array.isArray(src.socketsList) && src.socketsList.length){
            var sockTxt = src.socketsList.map(function(s){
              var or = s.orientation === 'horizontal' ? 'гориз.' : 'верт.';
              return (Number(s.count)||1)+' мест ('+or+')';
            }).join(' • ');
            it.rows.push({k:'🔌 Розетки', v:sockTxt});
          }
          if(src.cutoutEnabled && Number(src.cutoutW)>0){
            var cutTxt = (src.cutoutShape==='circle'?'Ø ':'')+numFmt(src.cutoutW)+(src.cutoutShape==='circle'?'':('×'+numFmt(src.cutoutH||src.cutoutW)))+' см';
            if(src.cutoutCenter===false && (src.cutoutDistX||src.cutoutDistY)){
              var ex2 = src.cutoutEdgeX==='right'?'от правого':'от левого';
              var ey2 = src.cutoutEdgeY==='bottom'?'от низа':'от верха';
              cutTxt += ' • '+ex2+' '+numFmt(src.cutoutDistX||0)+' см, '+ey2+' '+numFmt(src.cutoutDistY||0)+' см';
            } else {
              cutTxt += ' • по центру';
            }
            it.rows.push({k:'✂️ Вырез', v:cutTxt});
          }
        });
      }catch(e){}
      return model;
    };
    window._zrzReceiptWrapped = true;
  }

  /* ─── защита базы ─── */
  window._zrzStartTime = Date.now();
  var _zrzFirstPullDone = false;
  var _zrzServerEmpty = false;
  function _zrzGuardBlock(){
    if(window._zrzForcePush) return false;
    if(_zrzServerEmpty) return false;
    if(!db.sync) return true;
    if(db.sync.lastPullAt){
      if(window._zrzPushUntil && Date.now() < window._zrzPushUntil) return true;
      return false;
    }
    if(Date.now() - window._zrzStartTime > 60000) return false;
    return true;
  }
  function _zrzSafePayload(data){
    if(!data || typeof data !== 'object') return data;
    var safe = {};
    for(var k in data){
      if(!Object.prototype.hasOwnProperty.call(data, k)) continue;
      if(k === 'users' || k === 'roles' || k === 'settings') continue;
      safe[k] = data[k];
    }
    return safe;
  }
  function _zrzFirstPullProcess(remote){
    if(_zrzFirstPullDone) return;
    _zrzFirstPullDone = true;
    if(!remote || !remote.users || !remote.users.length){ _zrzServerEmpty = true; return; }
    try{
      if(Array.isArray(remote.users)) db.users = JSON.parse(JSON.stringify(remote.users));
      if(remote.roles && typeof remote.roles === 'object') db.roles = JSON.parse(JSON.stringify(remote.roles));
      if(remote.settings && typeof remote.settings === 'object'){
        var keepSync = db.sync;
        db.settings = JSON.parse(JSON.stringify(remote.settings));
        db.sync = keepSync;
      }
    }catch(e){}
  }
  function _zrzBlockRef(ref){
    try{
      if(!ref || ref.__zrzBlocked) return;
      var origSet = ref.set.bind(ref);
      ref.set = function(data){
        if(_zrzGuardBlock()) return origSet(_zrzSafePayload(data));
        return origSet(data);
      };
      var origOnce = ref.once.bind(ref);
      ref.once = function(event){
        var promise = origOnce(event);
        if(event === 'value'){
          return promise.then(function(snap){
            var remote = snap.val();
            if(!remote){ _zrzServerEmpty = true; }
            else if(!_zrzFirstPullDone){ _zrzFirstPullProcess(remote); }
            return snap;
          });
        }
        return promise;
      };
      ref.__zrzBlocked = true;
    }catch(e){}
  }
  function _zrzResubscribe(){
    try{
      if(typeof _fbDbRef === 'undefined' || !_fbDbRef) return;
      _zrzBlockRef(_fbDbRef);
      if(_fbDbRef.__zrzResubscribed) return;
      _fbDbRef.off('value');
      _fbDbRef.on('value', function(snap){
        if(Date.now() - (_fbLastPushedAt||0) < 800) return;
        var remote = snap.val();
        if(!remote) return;
        _fbApplyingRemote = true;
        try{
          _zrzFirstPullProcess(remote);
          applySyncPayload(remote);
          if(db.sync) db.sync.lastPullAt = Date.now();
          save();
          if(typeof render === 'function'){ try{ render(); }catch(e){} }
        } finally {
          setTimeout(function(){ _fbApplyingRemote = false; }, 300);
        }
      }, function(err){
        if(db.sync){ db.sync.status='error'; db.sync.lastError = String((err&&err.message)||err); }
        try{ updateSyncDot(); }catch(_){}
      });
      _fbDbRef.__zrzResubscribed = true;
    }catch(e){}
  }
  var _zrzSetupIv = setInterval(function(){
    if(typeof _fbDbRef !== 'undefined' && _fbDbRef){
      _zrzBlockRef(_fbDbRef);
      _zrzResubscribe();
    }
  }, 250);
  setTimeout(function(){ clearInterval(_zrzSetupIv); }, 25000);
  setTimeout(_zrzResubscribe, 80);
  setTimeout(_zrzResubscribe, 600);
  setTimeout(_zrzResubscribe, 1500);

  window.zrzPullOnly = function(){
    try{
      if(typeof _fbDbRef === 'undefined' || !_fbDbRef){ uiAlert('Firebase не инициализирован'); return; }
      if(!isOnline()){ uiAlert('Нет интернета'); return; }
      uiConfirm('Подтянуть данные с сервера?','Подтянуть',{yesLabel:'Подтянуть'}).then(function(ok){
        if(!ok) return;
        _fbDbRef.once('value').then(function(snap){
          var remote = snap.val();
          if(!remote){ uiAlert('На сервере пока пусто'); return; }
          _zrzFirstPullDone = false;
          _fbApplyingRemote = true;
          try{
            _zrzFirstPullProcess(remote);
            applySyncPayload(remote);
            if(db.sync) db.sync.lastPullAt = Date.now();
            save(); render();
          } finally { setTimeout(function(){ _fbApplyingRemote = false; }, 400); }
          uiAlert('✔ Данные подтянуты с сервера');
        }).catch(function(e){ uiAlert('Ошибка: '+((e&&e.message)||e)); });
      });
    }catch(e){ uiAlert('Ошибка: '+((e&&e.message)||e)); }
  };

  window.zrzPushNow = function(){
    window._zrzForcePush = true;
    try{
      if(typeof _fbDbRef === 'undefined' || !_fbDbRef){ uiAlert('Firebase не инициализирован'); return; }
      if(!isOnline()){ uiAlert('Нет интернета'); return; }
      var payload = buildSyncPayload();
      _fbLastPushedAt = Date.now();
      _fbDbRef.set(payload).then(function(){
        if(db.sync){ db.sync.lastPushAt = Date.now(); db.sync.status = 'idle'; db.sync.lastError = ''; }
        try{ updateSyncDot(); }catch(_){}
        uiAlert('✔ Отправлено на сервер');
      }).catch(function(e){
        if(db.sync){ db.sync.status = 'error'; db.sync.lastError = String((e&&e.message)||e); }
        try{ updateSyncDot(); }catch(_){}
        uiAlert('Ошибка: '+((e&&e.message)||e));
      });
    }finally{ setTimeout(function(){ window._zrzForcePush = false; }, 3000); }
  };

  function _zrzAugmentSettings(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_guard_block')) return;
    if(!document.getElementById('s_phone')) return;
    var html = '<div id="zrz_guard_block" style="margin-top:14px;padding:14px;background:linear-gradient(180deg,rgba(76,175,125,0.10),rgba(76,175,125,0.04));border:1.5px solid rgba(76,175,125,0.35);border-radius:14px">';
    html += '<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#2c7a54;margin-bottom:8px">🛡 Защита базы</div>';
    var pulled = db.sync && db.sync.lastPullAt;
    var pushed = db.sync && db.sync.lastPushAt;
    if(pulled) html += '<div style="font-size:12px;color:var(--muted);line-height:1.5">📥 Приём: <b>'+new Date(pulled).toLocaleString('ru-RU')+'</b></div>';
    if(pushed) html += '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px">📤 Отправка: <b>'+new Date(pushed).toLocaleString('ru-RU')+'</b></div>';
    html += '<button type="button" class="btn btn-secondary" style="margin-top:10px;padding:10px;font-size:14px" onclick="zrzPullOnly()">📥 Только подтянуть с сервера</button>';
    html += '<button type="button" class="btn btn-secondary" style="margin-top:6px;padding:10px;font-size:14px" onclick="zrzPushNow()">📤 Отправить сейчас</button>';
    html += '</div>';
    var allBtns = modal.querySelectorAll('.btn');
    var cancelBtn = null;
    for(var i=0;i<allBtns.length;i++){
      if((allBtns[i].textContent||'').trim() === 'Отмена'){ cancelBtn = allBtns[i]; break; }
    }
    if(cancelBtn) cancelBtn.insertAdjacentHTML('beforebegin', html);
    else modal.insertAdjacentHTML('beforeend', html);
  }
  function wrapOpenSettings(){
    if(window._zrzOpenSettingsWrapped) return;
    if(typeof window.openSettings !== 'function') return;
    var orig = window.openSettings;
    window.openSettings = function(){
      var r = orig.apply(this, arguments);
      setTimeout(_zrzAugmentSettings, 70);
      return r;
    };
    window._zrzOpenSettingsWrapped = true;
  }
  function _zrzInjectAuthorSignature(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_author_sig')) return;
    if(!document.getElementById('s_phone')) return;
    var html = '<div id="zrz_author_sig" style="text-align:center;padding:18px 0 6px;color:var(--muted);font-size:12px;line-height:1.7">'
      + '<div style="font-weight:800;color:var(--accent-deep);font-size:13px">Разработчик: '+AUTHOR_NAME+'</div>'
      + '<div>✈️ '+AUTHOR_TG+'</div>'
      + '<div style="opacity:.7">© 2026 «Зерцало»</div>'
      + '</div>';
    var allBtns = modal.querySelectorAll('.btn');
    var cancelBtn = null;
    for(var i=0;i<allBtns.length;i++){
      if((allBtns[i].textContent||'').trim() === 'Отмена'){ cancelBtn = allBtns[i]; break; }
    }
    if(cancelBtn) cancelBtn.insertAdjacentHTML('beforebegin', html);
    else modal.insertAdjacentHTML('beforeend', html);
  }
  function wrapOpenSettings2(){
    if(window._zrzOpenSettings2Wrapped) return;
    if(typeof window.openSettings !== 'function') return;
    var orig = window.openSettings;
    window.openSettings = function(){
      var r = orig.apply(this, arguments);
      setTimeout(_zrzInjectAuthorSignature, 90);
      return r;
    };
    window._zrzOpenSettings2Wrapped = true;
  }

  /* ─── CSS ─── */
  function injectCss(){
    var old = document.getElementById('zrz-patch-css');
    if(old) old.remove();
    var css = ''
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
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'
    + '.progress-wrap{height:5px !important;}'
    + 'header{padding:10px 14px !important;gap:8px !important;}'
    + 'header button{width:42px !important;height:42px !important;border-radius:13px !important;font-size:20px !important;}'
    + '.type-badge{font-size:10.5px !important;font-weight:800 !important;letter-spacing:0.7px !important;padding:4px 11px !important;border-radius:8px !important;}'
    + '.role-badge{font-size:11px !important;font-weight:700 !important;}'
    + '.payment-chip{font-size:11.5px !important;font-weight:800 !important;}'
    + '.card{position:relative;overflow:hidden;}'
    + '.zrz-card-ripple{position:absolute;pointer-events:none;border-radius:50%;background:radial-gradient(circle, rgba(91,127,184,0.55) 0%, rgba(91,127,184,0.18) 60%, rgba(91,127,184,0) 100%);transform:translate(-50%,-50%) scale(0);animation:zrz-card-ripple-anim .85s cubic-bezier(.2,.6,.4,1) forwards;}'
    + '@keyframes zrz-card-ripple-anim{0%{transform:translate(-50%,-50%) scale(0.3);opacity:1;}60%{opacity:0.85;}100%{transform:translate(-50%,-50%) scale(var(--zrz-scale,20));opacity:0;}}'
    + '.btn .ripple,.chip .ripple,.type-btn .ripple,.frame-chip .ripple,.key-btn .ripple,.team-chip .ripple,.role-btn .ripple{background:rgba(255,255,255,0.42) !important;width:40px !important;height:40px !important;}'
    + '.btn-secondary .ripple,.chip:not(.active) .ripple,.type-btn:not(.active) .ripple{background:rgba(91,127,184,0.35) !important;}'
    + '@keyframes ripple{to{transform:translate(-50%,-50%) scale(3.6) !important;opacity:0 !important;}}'
    + '.btn-primary{animation:zrz-btn-breathe 3.6s ease-in-out infinite;}'
    + '@keyframes zrz-btn-breathe{0%,100%{box-shadow:0 10px 26px rgba(91,127,184,0.34);}50%{box-shadow:0 14px 34px rgba(91,127,184,0.48);}}'
    + '.modal .btn-primary{animation:none;}'
    + '@keyframes zrz-confetti-fall{0%{transform:translateY(0);opacity:1}85%{opacity:1}100%{transform:translateY(110vh);opacity:0}}'
    + '@keyframes zrz-confetti-spin{from{rotate:0deg}to{rotate:720deg}}'
    + '.notif-bell .bell-badge{animation:zrz-badge-pulse 2s ease-in-out infinite;}'
    + '@keyframes zrz-badge-pulse{0%,100%{transform:scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.25);}50%{transform:scale(1.18);box-shadow:0 0 0 7px rgba(201,101,101,0.22);}}'
    + '@keyframes zrz-pulse-soft{0%{transform:scale(1)}40%{transform:scale(0.94)}70%{transform:scale(1.03)}100%{transform:scale(1)}}'
    + '@keyframes zrz-modal-in{from{transform:translateY(60px);opacity:0.5}to{transform:translateY(0);opacity:1}}'
    + '@media (max-width:420px){.card{padding:18px 18px 18px 22px !important;}.modal h2{font-size:21px !important;}.btn{padding:15px 18px !important;font-size:15.5px !important;}header{padding:10px 12px !important;}header button{width:40px !important;height:40px !important;}}'
    ;
    var st = document.createElement('style');
    st.id = 'zrz-patch-css';
    st.textContent = css;
    document.head.appendChild(st);
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

  function apply(){
    try{ injectCss(); }catch(e){}
    try{ installFittings(); }catch(e){}
    try{ hideOsrm(); }catch(e){}
    try{ wrapSavePayment(); }catch(e){}
    try{ wrapSaveMasterComment(); }catch(e){}
    try{ bindCardRipple(); }catch(e){}
    try{ wrapTechDraw(); }catch(e){}
    try{ wrapOpenTechDraw(); }catch(e){}
    try{ wrapOpenItem(); }catch(e){}
    try{ wrapCollectDraft(); }catch(e){}
    try{ wrapBuildReceipt(); }catch(e){}
    try{ wrapRenderSockets(); }catch(e){}
    try{ injectBoltUI(); }catch(e){}
    try{ injectCutoutUI(); }catch(e){}
    try{ injectSocketOrientationUI(); }catch(e){}
    try{ wrapOpenSettings(); }catch(e){}
    try{ wrapOpenSettings2(); }catch(e){}
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

  window._zrzPatchInit = apply;
  try{console.log('[app-patches] v'+PATCH_VERSION+' активен');}catch(_){}
})();
