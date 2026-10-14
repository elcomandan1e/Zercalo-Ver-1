/* app-patches.js — динамические патчи «Зерцало» v5.0.0
   v4.2.x–4.4.x — базовые фичи патчей.
   v4.5.0 — обновлённая документация (7 вкладок).
   v4.6.0 — SVG-иконки вместо эмодзи.
   v5.0.0 — Волна 1 навигации:
     • Ролевой таббар (свой набор вкладок под каждую роль).
     • Хлебные крошки в модалках (откуда пришли).
     • Уведомления — отдельная вкладка для админа/менеджера/мастера.
*/
(function(){
  var PATCH_VERSION = '5.0.0';
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

  var DIM_COLOR = '#c14d4d';
  function _zrzDimLineFull(ctx, obj1, obj2, dimP1, dimP2, label, color){
    color = color || DIM_COLOR;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 0.8;
    ctx.setLineDash([3,3]); ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(obj1.x, obj1.y); ctx.lineTo(dimP1.x, dimP1.y);
    ctx.moveTo(obj2.x, obj2.y); ctx.lineTo(dimP2.x, dimP2.y);
    ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    var dx = dimP2.x - dimP1.x, dy = dimP2.y - dimP1.y;
    var len = Math.hypot(dx, dy);
    if(len < 10){ ctx.restore(); return; }
    var ux = dx/len, uy = dy/len, nx = -uy, ny = ux;
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
      ctx.fillStyle = '#fff'; ctx.fillRect(-tw/2, -9, tw, 18);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(-tw/2, -9, tw, 18);
      ctx.fillStyle = color; ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function _zrzDimInline(ctx, x1, y1, x2, y2, label, color){
    var dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
    if(len < 6){ return; }
    var ux=dx/len, uy=dy/len, nx=-uy, ny=ux;
    ctx.save();
    ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    var tick=5;
    ctx.beginPath();
    ctx.moveTo(x1-nx*tick,y1-ny*tick); ctx.lineTo(x1+nx*tick,y1+ny*tick);
    ctx.moveTo(x2-nx*tick,y2-ny*tick); ctx.lineTo(x2+nx*tick,y2+ny*tick);
    ctx.stroke();
    var arr=5, aw=2.5;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x1+ux*arr-nx*aw,y1+uy*arr-ny*aw);
    ctx.lineTo(x1+ux*arr+nx*aw,y1+uy*arr+ny*aw);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-ux*arr-nx*aw,y2-uy*arr-ny*aw);
    ctx.lineTo(x2-ux*arr+nx*aw,y2-uy*arr+ny*aw);
    ctx.closePath(); ctx.fill();
    if(label){
      ctx.font='800 12px "PT Sans Narrow",Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      var mx=(x1+x2)/2, my=(y1+y2)/2;
      var tw=ctx.measureText(label).width+8;
      ctx.save();
      ctx.translate(mx,my);
      if(Math.abs(uy)>0.7) ctx.rotate(-Math.PI/2);
      ctx.fillStyle='#fff'; ctx.fillRect(-tw/2,-8,tw,16);
      ctx.strokeStyle=color; ctx.lineWidth=0.8; ctx.strokeRect(-tw/2,-8,tw,16);
      ctx.fillStyle=color; ctx.fillText(label,0,0);
      ctx.restore();
    }
    ctx.restore();
  }

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

  var DIM_SOCKET_COLOR = '#a05c26';
  var DIM_LIGHT_COLOR  = '#7a3d8a';
  function _zrzDrawSocketDot(ctx, cx, cy, r){
    ctx.save();
    ctx.fillStyle = '#f5c93a'; ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx-r-4, cy); ctx.lineTo(cx+r+4, cy);
    ctx.moveTo(cx, cy-r-4); ctx.lineTo(cx, cy+r+4);
    ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
  }
  function _zrzSocketCenters(s, x0, y0, pxW, pxH, sc3){
    var cnt = Math.max(1, Number(s.count)||1);
    var stepCm = Number(s.step)||7.1;
    var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
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

  var DIM_CUT_COLOR  = '#c95a1e';
  var DIM_FACET_COLOR= '#c95a1e';
  var DIM_ROUND_COLOR= '#c14d4d';

  function _zrzCutoutRect(d, x0, y0, pxW, pxH, sc3){
    var w = Number(d.cutoutW)||0;
    if(w<=0) return null;
    var shape = (d.cutoutShape==='circle') ? 'circle' : 'rect';
    var wPx = w * sc3;
    var hPx = (shape==='circle' ? w : (Number(d.cutoutH)||w)) * sc3;
    var xCut, yCut;
    if(d.cutoutCenter===false && (d.cutoutDistX!=null||d.cutoutDistY!=null)){
      var dx = Number(d.cutoutDistX)||0, dy = Number(d.cutoutDistY)||0;
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
    var cx = r.x + r.w/2, cy = r.y + r.h/2;
    ctx.save();
    ctx.strokeStyle = DIM_CUT_COLOR; ctx.lineWidth = 1.7; ctx.setLineDash([5,3]);
    ctx.beginPath();
    if(r.shape === 'circle'){ ctx.arc(cx, cy, r.w/2, 0, Math.PI*2); }
    else { ctx.rect(r.x, r.y, r.w, r.h); }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();

    var gapBelow = (y0 + pxH) - (r.y + r.h);
    var dimY = (gapBelow >= 24) ? (r.y + r.h + 14) : (r.y - 14);
    var labelW = (r.shape === 'circle') ? ('Ø '+numFmt(r.wCm)+' см') : (numFmt(r.wCm)+' см');
    _zrzDimInline(ctx, r.x, dimY, r.x + r.w, dimY, labelW, DIM_CUT_COLOR);
    if(r.shape === 'rect' && r.hCm !== r.wCm){
      var gapRight = (x0 + pxW) - (r.x + r.w);
      var dimX = (gapRight >= 24) ? (r.x + r.w + 14) : (r.x - 14);
      _zrzDimInline(ctx, dimX, r.y, dimX, r.y + r.h, numFmt(r.hCm)+' см', DIM_CUT_COLOR);
    }
    if(d.cutoutCenter === false){
      var edgeX = (d.cutoutEdgeX === 'right') ? (x0 + pxW) : x0;
      var refX  = (d.cutoutEdgeX === 'right') ? (r.x + r.w) : r.x;
      var yX = cy - 24; if(yX < y0 + 8) yX = cy + 24;
      _zrzDimInline(ctx, edgeX, yX, refX, yX, numFmt(d.cutoutDistX||0)+' см', DIM_CUT_COLOR);
      var edgeY = (d.cutoutEdgeY === 'bottom') ? (y0 + pxH) : y0;
      var refY  = (d.cutoutEdgeY === 'bottom') ? (r.y + r.h) : r.y;
      var xY = cx - 24; if(xY < x0 + 8) xY = cx + 24;
      _zrzDimInline(ctx, xY, edgeY, xY, refY, numFmt(d.cutoutDistY||0)+' см', DIM_CUT_COLOR);
    }
  }

  function _zrzDrawFacetDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(d.type !== 'MIRROR') return;
    if(d.edge !== 'Фацет') return;
    var fwMm = Number(d.facetWidth)||0;
    if(fwMm <= 0) return;
    var fwPx = fwMm/10 * sc3;
    if(fwPx <= 2) return;
    if(fwPx*2 >= pxW || fwPx*2 >= pxH) return;
    ctx.save();
    ctx.strokeStyle = DIM_FACET_COLOR; ctx.lineWidth = 1.6; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.rect(x0 + fwPx, y0 + fwPx, pxW - 2*fwPx, pxH - 2*fwPx); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
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
    ctx.strokeStyle = DIM_ROUND_COLOR; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + rPx, y0 + rPx, rPx, Math.PI, 1.5*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + pxW - rPx, y0 + rPx, rPx, 1.5*Math.PI, 2*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + pxW - rPx, y0 + pxH - rPx, rPx, 0, 0.5*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + rPx, y0 + pxH - rPx, rPx, 0.5*Math.PI, Math.PI); ctx.stroke();
    ctx.restore();
    var tx = x0 + pxW - rPx, ty = y0 + rPx;
    ctx.save();
    ctx.strokeStyle = DIM_ROUND_COLOR; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 22, ty - 22); ctx.lineTo(tx + 70, ty - 22); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI*2); ctx.fillStyle = DIM_ROUND_COLOR; ctx.fill();
    ctx.font = '800 12px "PT Sans Narrow",Arial'; ctx.fillStyle = '#fff';
    var label = 'R'+numFmt(rMm)+' мм';
    var tw = ctx.measureText(label).width + 10;
    var lx = tx + 76, ly = ty - 22;
    ctx.fillRect(lx - 4, ly - 8, tw, 16);
    ctx.strokeStyle = DIM_ROUND_COLOR; ctx.lineWidth = 1; ctx.strokeRect(lx - 4, ly - 8, tw, 16);
    ctx.fillStyle = DIM_ROUND_COLOR; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
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
        ctx.fillStyle='#e6ecf5'; ctx.strokeStyle='#3b5c8f'; ctx.lineWidth=1.6;
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

  function wrapOpenTechDraw(){
    if(window._zrzOpenTechDrawWrapped) return;
    if(typeof window.openTechDraw !== 'function') return;
    var orig = window.openTechDraw;
    window.openTechDraw = function(itemId){
      try{
        var numId = parseInt(itemId,10)||0;
        if(numId>0 && window._editId===numId && window._editDraft && typeof collectDraft==='function'){
          var fresh = collectDraft(window._editDraft);
          if(fresh && fresh.id==null) fresh.id = numId;
          var idx = -1;
          for(var i=0;i<db.items.length;i++){ if(db.items[i].id===numId){ idx=i; break; } }
          if(idx>=0){
            var backup = db.items[idx];
            db.items[idx] = fresh;
            try{ return orig.call(this, itemId); }
            finally { db.items[idx] = backup; }
          }
        }
      }catch(e){ try{console.warn('[patch] wrapOpenTechDraw', e);}catch(_){} }
      return orig.apply(this, arguments);
    };
    window._zrzOpenTechDrawWrapped = true;
  }

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
      var c = e.target.closest('.chip'); if(!c) return;
      chs.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active');});
      c.classList.add('active');
      if(window._editDraft) window._editDraft.boltCount = Number(c.dataset.v);
      if(typeof saveDraft==='function') saveDraft();
    };
    offs.onclick = function(e){
      var c = e.target.closest('.chip'); if(!c) return;
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

  function injectCutoutUI(){
    var m = document.querySelector('.modal'); if(!m) return;
    var d = window._editDraft || {};
    if(d.type !== 'MIRROR') return;
    var wrap = document.getElementById('cutout_wrap'); if(!wrap) return;
    if(document.getElementById('zrz_cutout_ui')) return;
    var chk = document.getElementById('e_cutout');
    if(!chk || !chk.checked) return;
    var isCenter = d.cutoutCenter !== false;
    var dx = Number(d.cutoutDistX)||0, dy = Number(d.cutoutDistY)||0;
    var ex = d.cutoutEdgeX || 'left', ey = d.cutoutEdgeY || 'top';
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
    posChips.onclick = function(e){ var c = e.target.closest('.chip'); if(!c) return; setPos(c.dataset.v); };
    xInp.oninput = function(){ if(window._editDraft) window._editDraft.cutoutDistX = parseFloat(String(xInp.value).replace(',','.'))||0; if(typeof saveDraft==='function') saveDraft(); };
    yInp.oninput = function(){ if(window._editDraft) window._editDraft.cutoutDistY = parseFloat(String(yInp.value).replace(',','.'))||0; if(typeof saveDraft==='function') saveDraft(); };
    customDiv.querySelectorAll('button[data-edge]').forEach(function(b){
      b.onclick = function(){
        var axis = b.dataset.axis, edge = b.dataset.edge;
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
    var box = document.getElementById('socketsList'); if(!box) return;
    var d = window._editDraft;
    if(!d || !Array.isArray(d.socketsList)) return;
    d.socketsList.forEach(function(s, idx){
      var cnt = Number(s.count)||1;
      if(cnt < 2) return;
      var itemEl = box.children[idx]; if(!itemEl) return;
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
        var c = e.target.closest('.chip'); if(!c) return;
        chips.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active');});
        c.classList.add('active');
        if(window._editDraft && window._editDraft.socketsList[idx]) window._editDraft.socketsList[idx].orientation = c.dataset.or;
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
        } finally { setTimeout(function(){ _fbApplyingRemote = false; }, 300); }
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
    var modal = document.querySelector('.modal'); if(!modal) return;
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
    for(var i=0;i<allBtns.length;i++){ if((allBtns[i].textContent||'').trim() === 'Отмена'){ cancelBtn = allBtns[i]; break; } }
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
    var modal = document.querySelector('.modal'); if(!modal) return;
    if(modal.querySelector('#zrz_author_sig')) return;
    if(!document.getElementById('s_phone')) return;
    var html = '<div id="zrz_author_sig" style="text-align:center;padding:18px 0 6px;color:var(--muted);font-size:12px;line-height:1.7">'
      + '<div style="font-weight:800;color:var(--accent-deep);font-size:13px">Разработчик: '+AUTHOR_NAME+'</div>'
      + '<div>✈️ '+AUTHOR_TG+'</div>'
      + '<div style="opacity:.7">© 2026 «Зерцало»</div>'
      + '</div>';
    var allBtns = modal.querySelectorAll('.btn');
    var cancelBtn = null;
    for(var i=0;i<allBtns.length;i++){ if((allBtns[i].textContent||'').trim() === 'Отмена'){ cancelBtn = allBtns[i]; break; } }
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

  /* ═══════════════════════════════════════════════════════════
     v4.5.0 — ДОКУМЕНТАЦИЯ (7 вкладок)
     ═══════════════════════════════════════════════════════════ */
  function buildDocs(){
    var d = {};

    d.README = { title:'📘 README', content:[
'# Зерцало — управление замерами и заказами',
'',
'Веб-приложение для стекольной компании.',
'Полный цикл: заявка → замер → производство → монтаж → оплата.',
'',
'## Возможности',
'▸ Заказы и позиции (5 типов изделий × 6 форм).',
'▸ Чертёж A4: изометрия, вид спереди, вид сверху.',
'▸ Размерные линии: розетки, светильники, болты, вырезы,',
'   фацет, скругления — всё отражено на чертеже.',
'▸ Декоративные болты (4 / 6 / 8 шт) с настраиваемым отступом.',
'▸ Розетки с ориентацией: вертикально / горизонтально.',
'▸ Вырезы: круглый (Ø) или прямоугольный с отступом от края.',
'▸ Календарь событий (10 типов) и маршруты водителей.',
'▸ Клиенты, расширенные адреса (DaData), контрагенты.',
'▸ Прайс-лист: 7 групп, ~70 позиций, авторасчёт.',
'▸ Предзаказ (заявка) → полный заказ одним переключателем.',
'▸ Оплата замера и оплата заказа с конфетти.',
'▸ Синхронизация Firebase + защита базы от затирания.',
'',
'## Роли',
'Администратор, Менеджер, Мастер, Замерщик-монтажник, Водитель.',
'',
'## Разделы',
'🏠 Сегодня — дашборд.',
'👥 Клиенты — база клиентов и адресов.',
'📅 Календарь — события и маршруты.',
'☰ Ещё — контрагенты, отчёты, пользователи, настройки.',
'',
'## Установка',
'1. Открыть адрес приложения в браузере.',
'2. «Добавить на главный экран» (PWA).',
'3. Войти: admin / PIN 0000 (сменить при первом входе).',
'',
'## Разработчик',
'AUTHOR_NAME_PLACEHOLDER · AUTHOR_TG_PLACEHOLDER',
'© 2026'
    ].join('\n').replace('AUTHOR_NAME_PLACEHOLDER', AUTHOR_NAME).replace('AUTHOR_TG_PLACEHOLDER', AUTHOR_TG) };

    d.CHANGELOG = { title:'📋 CHANGELOG', content:[
'# История версий',
'',
'## v5.0.0 — Навигация, Волна 1',
'▸ Ролевой таббар: своя навигация под каждую роль.',
'▸ Хлебные крошки в модалках (откуда открыли).',
'▸ Уведомления — отдельная вкладка (админ/менеджер/мастер).',
'',
'## v4.6.0 — SVG-иконки вместо эмодзи',
'▸ Все эмодзи заменяются на контурные SVG (runtime).',
'▸ Единый стиль: stroke 1.75, размер 24×24, currentColor.',
'',
'## v4.5.0 — Обновление документации',
'▸ Полностью переписаны все вкладки.',
'▸ Новая вкладка «🛠 Техдокументация».',
'',
'## v4.4.2 — Вырез с отступом, фацет как рамка',
'',
'## v4.4.0 — Размеры вырезов, фацета, скруглений',
'',
'## v4.3.7 — Выноска для болтов',
'',
'## v4.3.0–4.3.2 — Размеры розеток и бра',
'',
'## v4.2.8 — Защита базы',
'',
'## v4.2.7 — Декоративные болты',
'',
'## v4.2.0 — Модуль патчей',
'',
'## v4.1.x — Предзаказы, прайс, DaData',
'',
'## v4.0.x — Ядро',
''
    ].join('\n') };

    d.DATA_MODEL = { title:'🗂 DATA_MODEL', content:[
'# Модель данных',
'',
'Объект db (localStorage, ключ mirror_orders_v2).',
'Синхронизация: Firebase Realtime Database, ветка zerzalo.',
'Конфликт: last-write-wins по updatedAt.',
'',
'## db.orders',
'id, orderNum, manualNum, clientId, addressId.',
'snapshot {clientName, clientPhone, addressFull}.',
'Статус: lead|new|work|ready|installed|declined|cancelled.',
'createdAt, updatedAt, measureDate.',
'orderTotal, orderPaid, measurePaid, measurePaidAmount.',
'isDraft, estimatedTotal, estimateLines[].',
'assignedUserIds[], clientNote, orderNote, masterComment, createdBy.',
'',
'## db.items',
'id, orderId, type (MIRROR|SHOWER|APRON|SHELF|PANNO),',
'shape (RECT|RECT4|CIRCLE|OVAL|FIGURED|TEMPLATE).',
'w, h, T, B, L, R (см), th (мм), qty.',
'glass, edge, facetWidth, frameColor, frameThickness.',
'mountType, mountCustom.',
'boltMount, boltCount (4|6|8), boltOffset (см).',
'cutoutEnabled, cutoutShape, cutoutW, cutoutH, cutoutCenter,',
'cutoutDistX, cutoutDistY, cutoutEdgeX, cutoutEdgeY.',
'socketsMount, socketsList[{count,step,distX,distY,edgeX,edgeY,orientation}].',
'lightsMount, lightsList[{distX,distY,edgeX,edgeY}].',
'cutV, cutVPos, cutH, cutHPos.',
'mirrorMeasureMode, mirrorInset, mirrorNicheCutMode, mirrorNicheRefCorner.',
'showerH, showerPanels, showerProfiles, showerHandle,',
'hingeCount, showerFitting, sillType.',
'apronMaterial, apronShape, apronDirection, apronSections,',
'apronMeasureMode, apronInset.',
'pannoLayout, shelfDepth.',
'photos[photoId], drawingIsoId, drawingFrontId, note.',
'roundedCorners, cornerRadius (мм).',
'',
'## db.clients',
'id, lastName, firstName, middleName, phone, phoneExtra,',
'email, note, tags[], archived.',
'',
'## db.addresses',
'id, clientId, label, region, district, settlement, city,',
'street, house, building, postalCode, entrance, floor,',
'apartment, intercom, liftNeeded, liftFloor, parkingCarry,',
'needPass, objectType, complexName, accessNote, geoLat, geoLon, geoNote.',
'',
'## db.events',
'id, type (10 типов), orderId, date, time, duration,',
'assignedUserIds[], note, status, legFromPrev{km,minutes}.',
'',
'## db.routes',
'id, title, date, assignedUserId,',
'points[{kind,refId,addressId,label,note,time,legFromPrev}].',
'',
'## db.contractors',
'id, name, category, contactName, phone, email, addressId, note, archived.',
'',
'## db.notifications',
'id, userId, type, title, body, linkOrderId, linkEventId, linkRouteId,',
'createdAt, readAt.',
'',
'## db.users',
'id, name, role (admin|manager|master|surveyor|driver),',
'login, phone, pinHash, active, mustChangePassword, permsOverride.',
'',
'## db.roles',
'{roleKey:{permKey:bool}} или null.',
'',
'## db.settings',
'phone, email, website, telegram, slogan, baseAddress.',
'prices (legacy), priceBook, morningDigest, appCheckSiteKey.',
'',
'## db.trash / db.sync',
'Корзина и состояние синхронизации.',
'',
'## Счётчики',
'nextOrder, nextItem, nextUser, nextClient, nextAddress,',
'nextEvent, nextContractor, nextRoute, nextNotification.'
    ].join('\n') };

    d.PRIVACY = { title:'🔒 PRIVACY', content:[
'# Приватность и данные',
'',
'## Локально',
'▸ Вся база приложения.',
'▸ Фото и чертежи (IndexedDB).',
'▸ Черновики (sessionStorage, 24 ч).',
'',
'## В Firebase',
'▸ Заказы, позиции, клиенты, адреса, события.',
'▸ Маршруты, контрагенты, уведомления.',
'▸ Оплата заказа и замера.',
'▸ Пользователи и роли (PIN не уходит).',
'▸ Прайс и настройки.',
'',
'Фото и чертежи в Firebase не уходят.',
'',
'## Внешние сервисы',
'▸ Firebase Realtime Database (Google).',
'▸ Google Fonts.',
'▸ DaData Suggestions.',
'▸ Nominatim, OSRM.',
'▸ Яндекс.Карты / Apple Maps (по тапу).',
'',
'## Доступ',
'▸ apiKey публичный — норма для веба.',
'▸ Security Rules: auth != null.',
'▸ PIN — SHA-256 с солью user.id.',
'',
'## Чего нет',
'▸ Куки для трекинга.',
'▸ Аналитики.',
'▸ Передачи данных третьим лицам.',
'',
'## Отзыв данных',
'▸ Настройки → Экспорт (JSON).',
'▸ Настройки → Удалить все данные.'
    ].join('\n') };

    d.BACKUP = { title:'💾 BACKUP', content:[
'# Резервное копирование',
'',
'## Экспорт',
'Настройки → 📥 Экспорт (JSON).',
'',
'## Импорт',
'Только для admin.',
'Настройки → 📤 Импорт → JSON.',
'Полностью заменяет текущую базу.',
'',
'## Синхронизация',
'▸ Изменения уходят в облако за ~1,5 сек.',
'▸ Свежие данные подтягиваются при запуске.',
'▸ last-write-wins по updatedAt.',
'',
'## Защита (v4.2.8)',
'▸ До первого pull метаданные не уходят.',
'▸ Первый pull заменяет их серверными.',
'▸ Кнопки в Настройках: «📥 Только подтянуть», «📤 Отправить сейчас».',
'',
'## Сценарии восстановления',
'1. Потеря телефона → новый + синхронизация.',
'2. Случайное удаление → JSON-бэкап.',
'3. Сломана база → Firebase Backups (30 дней).',
'',
'## Рекомендации',
'▸ Экспорт раз в неделю.',
'▸ Бэкапы в трёх местах.'
    ].join('\n') };

    d.AUTHOR = { title:'👤 Об авторе', content:[
'# Об авторе',
'',
'Зерцало — внутренний инструмент стекольной компании.',
'',
'## Разработчик',
'AUTHOR_NAME_PLACEHOLDER',
'',
'Telegram: AUTHOR_TG_PLACEHOLDER',
'',
'© 2026. Все права у заказчика.'
    ].join('\n').replace('AUTHOR_NAME_PLACEHOLDER', AUTHOR_NAME).replace('AUTHOR_TG_PLACEHOLDER', AUTHOR_TG) };

    d.TECH = { title:'🛠 Техдокументация', content:[
'# Техническая документация',
'',
'## Архитектура',
'index.html — ядро (HTML+CSS+JS, без сборки).',
'app-patches.js — динамические патчи (fetch с GitHub).',
'',
'## Репозиторий',
'github.com/elcomandan1e/Zercalo-Ver-1',
'· index.html — ядро.',
'· app-patches.js — активные патчи.',
'',
'## Стек',
'HTML5, CSS3, JavaScript ES2017, Firebase v10 (compat),',
'Anonymous Auth, IndexedDB, Service Worker, PWA.',
'',
'## Внешние сервисы',
'Firebase RTDB, DaData, Nominatim, OSRM, Google Fonts.',
'',
'## Схема синхронизации',
'push — debounce 1500 мс при каждом save().',
'pull — .on("value") + фолбэк .once() при возврате.',
'merge — last-write-wins по updatedAt.',
'',
'## Патчи — как работает',
'1. В конце index.html загрузчик app-patches.js.',
'2. fetch с ?t=Date.now() — обход кэша.',
'3. new Function() → выполнение.',
'4. window._zrzPatchInit() — отрисовка после патча.',
'',
'## Маркеры состояний',
'window._zrzCardRippleBound, _zrzTechDrawWrapped,',
'_zrzOpenTechDrawWrapped, _zrzOpenItemWrapped,',
'_zrzOpenSettingsWrapped, _zrzSvgIcons, _zrzShowModalWrapped,',
'_zrzRenderWrapped.',
'',
'## v5.0.0 — Навигация',
'· renderTabs переопределён — ролевой таббар.',
'· showModal обёрнут — вставляет хлебные крошки.',
'· render обёрнут — поддержка вкладки «Уведомления».',
'',
'## CSS-классы патча',
'zrz-card-ripple, zrz-orientation-chips, zrz-cutout-ui,',
'zrz-ic, zrz-crumbs, zrz-crumb, zrz-crumb-cur.',
'',
'## Отладка',
'?debug=1 — красная полоса ошибок.',
'Консоль: [app-patches] vX.Y.Z активен.',
'zrzPullOnly(), zrzPushNow() — вручную.',
'',
'## Хранилище',
'localStorage — mirror_orders_v2.',
'sessionStorage — черновики.',
'IndexedDB — zerzalo_photos_v1.',
'',
'## Версии',
'SCHEMA_VERSION — схема (миграции).',
'APP_VERSION — ядро.',
'PATCH_VERSION — активный патч.'
    ].join('\n') };

    return d;
  }
  function installDocs(){
    try{
      window.ZRZ_DOCS = buildDocs();
      if(window._docsTab && !window.ZRZ_DOCS[window._docsTab]) window._docsTab = 'README';
    }catch(e){}
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
    try{ installDocs(); }catch(e){}
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
  try{ installDocs(); }catch(e){}

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

/* ============================================================
   v4.6.0 · SVG-ИКОНКИ ВМЕСТО ЭМОДЗИ
   ============================================================ */
(function(){
  if (window._zrzSvgIcons) return;
  window._zrzSvgIcons = true;

  var BS  = String.fromCharCode(92);
  var NS  = 'http://www.w3.org/2000/svg';
  var XLK = 'http://www.w3.org/1999/xlink';

  var DEFS = {
    'ic-mirror':     '<rect x="5" y="2" width="14" height="18" rx="3"/><path d="M9 7l3-3"/>',
    'ic-shower':     '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M12 4v8"/><path d="M8 15v2"/><path d="M12 15v3"/><path d="M16 15v2"/>',
    'ic-apron':      '<path d="M4 3h16l-2 12H6L4 3z"/><path d="M7 15v5h10v-5"/>',
    'ic-shelf':      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16"/><path d="M9 8h6"/><path d="M9 16h6"/>',
    'ic-panno':      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    'ic-measure':    '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3"/><path d="M10 8v2"/><path d="M14 8v3"/><path d="M18 8v2"/>',
    'ic-remeasure':  '<rect x="2" y="6" width="18" height="6" rx="1"/><path d="M6 6v2"/><path d="M10 6v3"/><path d="M14 6v2"/><path d="M18 16v4"/><path d="M15 18l3 3 3-3"/>',
    'ic-install':    '<circle cx="17" cy="7" r="3"/><path d="M15 9l-9 9v2h2l9-9"/>',
    'ic-demontage':  '<path d="M14 4l6 6-3 1-4-4 1-3z"/><path d="M13 6L4 15v3h3l9-9"/>',
    'ic-delivery':   '<rect x="1" y="6" width="14" height="10" rx="1"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    'ic-purchase':   '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h12l3-9H6"/>',
    'ic-return':     '<path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-3"/>',
    'ic-tempering':  '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 0 1 1 2 2 2 0-3 1-5 1-7z"/>',
    'ic-meeting':    '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 4V2"/><path d="M12 4V2"/>',
    'ic-home':       '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    'ic-users':      '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.5"/><path d="M21 20c0-2-1-3.5-3-4"/>',
    'ic-user':       '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    'ic-calendar':   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    'ic-menu':       '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    'ic-settings':   '<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M5 5l2 2"/><path d="M17 17l2 2"/><path d="M5 19l2-2"/><path d="M17 7l2-2"/>',
    'ic-bell':       '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    'ic-light':      '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3 11.2V16h6v-1.8A6 6 0 0 0 12 3z"/>',
    'ic-socket':     '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/><path d="M9 15h6"/>',
    'ic-cut':        '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M20 4L8 16"/><path d="M14.5 14.5L20 20"/><path d="M8 8l12 12"/>',
    'ic-rounded':    '<path d="M21 3H11a8 8 0 0 0-8 8v10"/>',
    'ic-bolt':       '<path d="M12 2l8 5v10l-8 5-8-5V7z"/><circle cx="12" cy="12" r="3"/>',
    'ic-money':      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4"/><path d="M18 10v4"/>',
    'ic-send':       '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    'ic-print':      '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="6" y="14" width="12" height="7"/>',
    'ic-camera':     '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    'ic-edit':       '<path d="M16 3l5 5-13 13H3v-5z"/><path d="M14 5l5 5"/>',
    'ic-trash':      '<path d="M4 6h16"/><path d="M9 3h6l1 3H8z"/><path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/><path d="M10 10v8"/><path d="M14 10v8"/>',
    'ic-plus':       '<path d="M12 4v16"/><path d="M4 12h16"/>',
    'ic-arrow-left': '<path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>',
    'ic-check':      '<path d="M4 12l5 5 11-11"/>',
    'ic-cross':      '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    'ic-warn':       '<path d="M12 3L1 21h22L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18.5" r="0.7" fill="currentColor"/>',
    'ic-pin':        '<path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>',
    'ic-phone':      '<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    'ic-save':       '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><rect x="8" y="13" width="8" height="8"/>',
    'ic-lock':       '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'ic-electric':   '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    'ic-building':   '<rect x="4" y="3" width="16" height="18"/><path d="M8 7h2v2H8z"/><path d="M14 7h2v2h-2z"/><path d="M8 12h2v2H8z"/><path d="M14 12h2v2h-2z"/><path d="M10 18h4v3h-4z"/>',
    'ic-package':    '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    'ic-tray':       '<path d="M3 12h5l1 3h6l1-3h5"/><path d="M5 5h14l2 7v7H3v-7l2-7z"/>',
    'ic-square':     '<rect x="4" y="4" width="16" height="16" rx="1"/>',
    'ic-bath':       '<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z"/><path d="M6 12V5a2 2 0 0 1 4 0"/><path d="M6 21l-1 1"/><path d="M18 21l1 1"/>',
    'ic-handshake':  '<path d="M11 17l-3 3-6-6 4-4 2 2 4-4 5 5-6 4z"/>',
    'ic-factory':    '<path d="M3 21V9l6 4V9l6 4V7l6 3v11H3z"/><path d="M7 21v-5h3v5"/><path d="M14 21v-5h3v5"/>',
    'ic-tree':       '<path d="M12 3l5 8h-3l4 6H6l4-6H7l5-8z"/><path d="M12 17v4"/>',
    'ic-crown':      '<path d="M3 18l2-10 5 5 2-8 2 8 5-5 2 10z"/><path d="M3 21h18"/>',
    'ic-case':       '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    'ic-search':     '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
    'ic-filter':     '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    'ic-sun':        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
    'ic-moon':       '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z"/>',
    'ic-cloud':      '<path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 2 3.5 3.5 0 0 1-.5 6z"/>',
    'ic-download':   '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    'ic-upload':     '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    'ic-book':       '<path d="M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13h7a3 3 0 0 0 3-3V4z"/>',
    'ic-book-open':  '<path d="M12 6v15"/><path d="M3 5a3 3 0 0 1 3-3h6v18H6a3 3 0 0 0-3 3z"/><path d="M21 5a3 3 0 0 0-3-3h-6v18h6a3 3 0 0 1 3 3z"/>',
    'ic-help':       '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7v.5"/><circle cx="12" cy="17" r="0.7" fill="currentColor"/>',
    'ic-logout':     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    'ic-link':       '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    'ic-map':        '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    'ic-circle-dot': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
    'ic-backspace':  '<path d="M21 4H9L2 12l7 8h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/><path d="M17 9l-5 6"/><path d="M12 9l5 6"/>',
    'ic-key':        '<circle cx="8" cy="15" r="4"/><path d="M11 12l10-10"/><path d="M17 6l3 3"/><path d="M14 9l3 3"/>',
    'ic-palette':    '<path d="M12 3a9 9 0 0 0 0 18 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-10z"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/>',
    'ic-doc':        '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/>',
    'ic-info':       '<circle cx="12" cy="12" r="10"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.7" fill="currentColor"/>',
    'ic-tool':       '<path d="M14 3a4 4 0 0 0-3 6.5L4 16v3h3l6.5-7A4 4 0 1 0 14 3z"/>',
    'ic-door':       '<rect x="5" y="3" width="12" height="18" rx="1"/><circle cx="13" cy="12" r="1" fill="currentColor"/>',
    'ic-rug':        '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M7 5v14"/><path d="M17 5v14"/>',
    'ic-sunset':     '<path d="M3 18h18"/><path d="M3 21h18"/><path d="M8 14a4 4 0 1 1 8 0"/><path d="M12 4v6"/><path d="M8 8l4-4 4 4"/>'
  };

  var MAP = {
    '🪞':'ic-mirror', '🚿':'ic-shower', '🍳':'ic-apron', '🗄':'ic-shelf', '🖼':'ic-panno',
    '📏':'ic-measure', '📐':'ic-remeasure', '🔧':'ic-install', '🔨':'ic-demontage',
    '🚚':'ic-delivery', '🛒':'ic-purchase', '↩':'ic-return', '🔥':'ic-tempering',
    '☕':'ic-meeting', '👑':'ic-crown', '💼':'ic-case', '👤':'ic-user', '👥':'ic-users',
    '🏠':'ic-home', '🏢':'ic-building', '🏪':'ic-building', '🌳':'ic-tree',
    '📋':'ic-doc', '📦':'ic-package', '🤝':'ic-handshake', '🏭':'ic-factory',
    '📍':'ic-pin', '🛁':'ic-bath', '⬜':'ic-square',
    '🔔':'ic-bell', '⚙':'ic-settings', '☰':'ic-menu', '📅':'ic-calendar', '📆':'ic-calendar',
    '🔍':'ic-search', '🔎':'ic-search', '🎛':'ic-filter',
    '💡':'ic-light', '🔌':'ic-socket', '✂':'ic-cut', '⭕':'ic-rounded', '🔩':'ic-bolt',
    '💰':'ic-money', '📤':'ic-send', '🖨':'ic-print', '📷':'ic-camera',
    '✏':'ic-edit', '🗑':'ic-trash', '💾':'ic-save', '⚡':'ic-electric',
    '🔒':'ic-lock', '🔐':'ic-lock', '📞':'ic-phone', '⌫':'ic-backspace',
    '☀':'ic-sun', '🌙':'ic-moon', '☁':'ic-cloud', '📥':'ic-download',
    '🧹':'ic-trash', '📖':'ic-book', '📚':'ic-book-open', '🚪':'ic-door',
    '🌅':'ic-sunset', '⚠':'ic-warn', '✔':'ic-check', '✓':'ic-check',
    '✕':'ic-cross', '❌':'ic-cross', '🟢':'ic-circle-dot',
    '🟡':'ic-circle-dot', '🔴':'ic-circle-dot', '⚪':'ic-circle-dot',
    '🗺':'ic-map', '🔗':'ic-link', '🩺':'ic-info',
    '❓':'ic-help', '🎨':'ic-palette', '📊':'ic-doc', '🕐':'ic-info',
    '⏱':'ic-info', '❕':'ic-info', '‼':'ic-warn', '◯':'ic-circle-dot'
  };

  var KEYS = Object.keys(MAP).sort(function(a,b){ return b.length - a.length; });
  var ALT  = KEYS.join('|');
  var RE   = new RegExp('(' + ALT + ')' + BS + 'uFE0F?', 'g');

  function injectCss(){
    if (document.getElementById('zrz-svg-icons-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-svg-icons-css';
    st.textContent =
      '.zrz-ic{display:inline-flex;align-items:center;justify-content:center;' +
      'vertical-align:-0.15em;margin:0 0.15em;line-height:0;flex-shrink:0;' +
      'color:currentColor}' +
      '.zrz-ic>svg{display:block;width:1.1em;height:1.1em;stroke:currentColor;' +
      'fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}';
    (document.head || document.documentElement).appendChild(st);
  }

  function buildSprite(){
    if (document.getElementById('zrz-svg-sprite')) return;
    var wrap = document.createElement('div');
    wrap.id = 'zrz-svg-sprite';
    wrap.setAttribute('aria-hidden','true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    Object.keys(DEFS).forEach(function(id){
      var sym = document.createElementNS(NS, 'symbol');
      sym.setAttribute('id', id);
      sym.setAttribute('viewBox', '0 0 24 24');
      sym.setAttribute('fill', 'none');
      sym.setAttribute('stroke', 'currentColor');
      sym.setAttribute('stroke-width', '1.75');
      sym.setAttribute('stroke-linecap', 'round');
      sym.setAttribute('stroke-linejoin', 'round');
      sym.innerHTML = DEFS[id];
      svg.appendChild(sym);
    });
    wrap.appendChild(svg);
    if (document.body && document.body.firstChild) {
      document.body.insertBefore(wrap, document.body.firstChild);
    } else {
      document.body.appendChild(wrap);
    }
  }

  function makeIcon(id){
    var span = document.createElement('span');
    span.className = 'zrz-ic';
    span.setAttribute('aria-hidden','true');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width',  '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#' + id);
    use.setAttributeNS(XLK, 'xlink:href', '#' + id);
    svg.appendChild(use);
    span.appendChild(svg);
    return span;
  }

  function replaceInTextNode(node){
    var t = node.nodeValue;
    if (!t) return;
    var parent = node.parentNode;
    if (!parent) return;
    var ptag = (parent.tagName || '').toUpperCase();
    if (ptag === 'SCRIPT' || ptag === 'STYLE' || ptag === 'TEXTAREA' ||
        ptag === 'INPUT'  || ptag === 'OPTION' || ptag === 'SELECT') return;
    if (parent.isContentEditable) return;
    if (parent.classList && parent.classList.contains('zrz-ic')) return;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    RE.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var last = 0, hit = false;
    t.replace(RE, function(m, emoji, offset){
      var id = MAP[emoji];
      if (!id) return m;
      hit = true;
      if (offset > last) frag.appendChild(document.createTextNode(t.slice(last, offset)));
      frag.appendChild(makeIcon(id));
      last = offset + m.length;
      return m;
    });
    if (!hit) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    try { parent.replaceChild(frag, node); } catch(e){}
  }

  function walk(node){
    if (!node) return;
    if (node.nodeType === 3){ replaceInTextNode(node); return; }
    if (node.nodeType !== 1) return;
    var tag = (node.tagName || '').toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' ||
        tag === 'INPUT'  || tag === 'OPTION' || tag === 'SELECT' ||
        tag === 'SVG') return;
    if (node.isContentEditable) return;
    if (node.classList && node.classList.contains('zrz-ic')) return;
    var c = node.firstChild;
    while (c){
      var nx = c.nextSibling;
      walk(c);
      c = nx;
    }
  }

  function boot(){
    injectCss();
    buildSprite();
    walk(document.body);
    try {
      var mo = new MutationObserver(function(muts){
        for (var i = 0; i < muts.length; i++){
          var m = muts[i];
          if (m.type === 'childList'){
            for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
          } else if (m.type === 'characterData'){
            walk(m.target);
          }
        }
      });
      mo.observe(document.body, {childList:true, subtree:true, characterData:true});
      window._zrzSvgIconsObserver = mo;
    } catch(e){}
  }

  window.zrzRebuildIcons = function(){ walk(document.body); };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, {once:true});
})();

/* ============================================================
   v5.0.0 · НАВИГАЦИЯ — Волна 1
   • Ролевой таббар
   • Хлебные крошки в модалках
   • Уведомления как отдельная вкладка
   ============================================================ */
(function(){
  if(window._zrzNavApplied) return;
  window._zrzNavApplied = true;

  /* ---------- 1. РОЛЕВОЙ ТАББАР ---------- */

  function tabsForRole(u){
    if(!u) return [];
    var role = u.role;
    var unread = 0;
    try { unread = (typeof unreadNotificationsCount === 'function') ? unreadNotificationsCount(u.id) : 0; } catch(e){}
    if(role === 'driver'){
      return [
        {key:'orders',           ico:'🏠', label:'Сегодня'},
        {key:'calendar-routes',  ico:'🚚', label:'Маршруты'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    if(role === 'master'){
      return [
        {key:'orders',           ico:'🔧', label:'Работа'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'notifications',    ico:'🔔', label:'События', badge:unread},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    if(role === 'surveyor'){
      return [
        {key:'orders',           ico:'🏠', label:'Сегодня'},
        {key:'clients',          ico:'👥', label:'Клиенты'},
        {key:'calendar',         ico:'📅', label:'Календарь'},
        {key:'more',             ico:'☰', label:'Ещё'}
      ];
    }
    /* admin / manager */
    return [
      {key:'orders',           ico:'🏠', label:'Сегодня'},
      {key:'clients',          ico:'👥', label:'Клиенты'},
      {key:'calendar',         ico:'📅', label:'Календарь'},
      {key:'notifications',    ico:'🔔', label:'Уведомл.', badge:unread},
      {key:'more',             ico:'☰', label:'Ещё'}
    ];
  }

  function normalizeActiveTab(){
    var a = (typeof activeTab !== 'undefined') ? activeTab : 'orders';
    try {
      if(a === 'route_detail') return 'calendar-routes';
      if(a === 'calendar' && calState && calState.section === 'routes') return 'calendar-routes';
      if(a === 'contractors') return 'more';
    } catch(e){}
    return a;
  }

  function renderRoleTabs(){
    var el = document.getElementById('tabbar');
    if(!el) return;
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u){ el.style.display = 'none'; return; }
    if(document.getElementById('authScreen')){ el.style.display = 'none'; return; }
    el.style.display = 'flex';
    var tabs = tabsForRole(u);
    var activeKey = normalizeActiveTab();
    /* 5 вкладок — на телефоне они сжимаются, добавим компактный вид */
    if(tabs.length >= 5) el.classList.add('zrz-tabs-5');
    else el.classList.remove('zrz-tabs-5');
    el.innerHTML = tabs.map(function(t){
      var badge = t.badge ? '<span class="tabbar-badge">'+(t.badge>99?'99+':t.badge)+'</span>' : '';
      var isActive = (activeKey === t.key);
      return '<button type="button" class="tabbar-btn'+(isActive?' active':'')+'" data-tab="'+t.key+'" onclick="zrzSwitchTab(\''+t.key+'\')"><span class="tb-ico">'+t.ico+badge+'</span><span>'+t.label+'</span></button>';
    }).join('');
  }

  window.zrzSwitchTab = function(tab){
    try{
      if(tab === 'calendar-routes'){
        activeTab = 'calendar';
        try { calState.section = 'routes'; } catch(e){}
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'notifications'){
        activeTab = 'notifications';
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'more'){
        activeTab = 'more';
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'orders'){
        if(typeof switchTab === 'function') switchTab('orders');
        else { activeTab = 'orders'; render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'clients'){
        if(typeof switchTab === 'function') switchTab('clients');
        else { activeTab = 'clients'; render(); window.scrollTo(0,0); }
        return;
      }
      if(tab === 'calendar'){
        activeTab = 'calendar';
        try { calState.section = 'events'; } catch(e){}
        if(typeof haptic === 'function') haptic(6);
        if(typeof withViewTransition === 'function'){
          withViewTransition(function(){ render(); window.scrollTo(0,0); });
        } else { render(); window.scrollTo(0,0); }
        return;
      }
      if(typeof switchTab === 'function') switchTab(tab);
    }catch(e){ try{console.warn('[nav] switchTab', e);}catch(_){} }
  };

  /* Переопределяем ядровую renderTabs */
  window.renderTabs = renderRoleTabs;

  /* ---------- 2. УВЕДОМЛЕНИЯ КАК ВКЛАДКА ---------- */

  function renderNotificationsTab(){
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return '';
    var list = [];
    try { list = (typeof notificationsOfUser === 'function') ? notificationsOfUser(u.id) : []; } catch(e){}
    var unread = 0;
    try { unread = (typeof unreadNotificationsCount === 'function') ? unreadNotificationsCount(u.id) : 0; } catch(e){}
    var html = '<div class="section-title" style="margin-top:8px">🔔 Уведомления</div>';
    if(!list.length){
      html += '<div class="empty-cta"><span class="ec-ico">🔔</span><div class="ec-title">Пока нет уведомлений</div><div class="ec-sub">Здесь появятся назначения на события, изменения и маршруты.</div></div>';
      html += '<div class="footer-brand" style="margin-top:20px">'+(typeof LOGO_MARK==='function'?LOGO_MARK(20):'')+'<span>Зерцало • уведомления</span></div>';
      return html;
    }
    html += '<div class="chips sort-chips" style="margin-bottom:12px">';
    html += '<button type="button" class="chip sort-chip" onclick="markAllNotifRead();render()">✓ Прочитать все</button>';
    html += '<button type="button" class="chip sort-chip" onclick="clearReadNotif()">🧹 Удалить прочитанные</button>';
    html += '</div>';
    var readCnt = list.length - unread;
    html += '<div style="display:flex;gap:18px;font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:12px;padding:0 4px">';
    html += '<span>Непрочитанных: <b style="color:var(--accent-deep)">'+unread+'</b></span>';
    html += '<span>Прочитанных: <b>'+readCnt+'</b></span>';
    html += '<span>Всего: <b>'+list.length+'</b></span>';
    html += '</div>';
    html += list.map(function(n){
      var cls = n.readAt ? '' : ' unread';
      var ico = n.type === 'assigned' ? '📅' : (n.type === 'moved' ? '📆' : (n.type === 'removed' ? '🗑' : (n.type === 'route' ? '🚚' : '🔔')));
      return '<div class="notif-item'+cls+'" onclick="onNotifClick('+n.id+')">' +
        '<div class="notif-ico '+(n.type||'')+'">'+ico+'</div>' +
        '<div class="notif-body">' +
          '<div class="notif-title">'+esc(n.title||'')+'</div>' +
          '<div class="notif-text">'+esc(n.body||'')+'</div>' +
          '<div class="notif-time">'+new Date(n.createdAt).toLocaleString('ru-RU')+(n.readAt?' • прочитано':'')+'</div>' +
        '</div>' +
      '</div>';
    }).join('');
    html += '<div class="footer-brand" style="margin-top:20px">'+(typeof LOGO_MARK==='function'?LOGO_MARK(20):'')+'<span>Зерцало • уведомления</span></div>';
    return html;
  }
  window.renderNotificationsTab = renderNotificationsTab;

  /* Обёртка render() для поддержки activeTab === 'notifications' */
  function wrapRender(){
    if(window._zrzRenderWrapped) return;
    if(typeof window.render !== 'function') return;
    var orig = window.render;
    window.render = function(){
      var isNotif = (typeof activeTab !== 'undefined' && activeTab === 'notifications');
      if(isNotif) activeTab = 'more'; /* временно подменяем, чтобы ядро отрисовало что-то валидное */
      var res = orig.apply(this, arguments);
      if(isNotif){
        activeTab = 'notifications';
        var appEl = document.getElementById('app');
        if(appEl) appEl.innerHTML = renderNotificationsTab();
        /* Скрываем кнопки шапки, которые не нужны на этой вкладке */
        var backBtn = document.getElementById('backBtn');
        var shareBtn = document.getElementById('shareBtn');
        var settingsBtn = document.getElementById('settingsBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var notifBtn = document.getElementById('notifBtn');
        if(backBtn) backBtn.style.display = 'none';
        if(shareBtn) shareBtn.style.display = 'none';
        if(settingsBtn) settingsBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(notifBtn) notifBtn.style.display = 'none';
        if(typeof renderRoleTabs === 'function') renderRoleTabs();
      }
      return res;
    };
    window._zrzRenderWrapped = true;
  }

  /* ---------- 3. ХЛЕБНЫЕ КРОШКИ В МОДАЛКАХ ---------- */

  function buildCrumbsForModal(){
    var crumbs = [];
    var curTab = (typeof activeTab !== 'undefined') ? activeTab : 'orders';
    /* Корень */
    var rootLabel = 'Назад';
    if(curTab === 'orders') rootLabel = 'Заказы';
    else if(curTab === 'clients') rootLabel = 'Клиенты';
    else if(curTab === 'calendar') rootLabel = 'Календарь';
    else if(curTab === 'contractors') rootLabel = 'Контрагенты';
    else if(curTab === 'routes') rootLabel = 'Маршруты';
    else if(curTab === 'route_detail') rootLabel = 'Маршруты';
    else if(curTab === 'more') rootLabel = 'Ещё';
    else if(curTab === 'notifications') rootLabel = 'Уведомления';
    crumbs.push({label:rootLabel, closable:true});
    /* Промежуточные контексты */
    if(curTab === 'orders' && typeof currentOrderId !== 'undefined' && currentOrderId){
      try {
        var o = db.orders.find(function(x){return x.id === currentOrderId;});
        if(o) crumbs.push({label:'Заказ № ' + (o.orderNum || '—'), closable:false});
      } catch(e){}
    }
    if(curTab === 'clients' && typeof currentClientId !== 'undefined' && currentClientId){
      try {
        var c = db.clients.find(function(x){return x.id === currentClientId;});
        if(c){
          var nm = (typeof clientFullName === 'function') ? clientFullName(c) : '';
          crumbs.push({label:'Клиент: ' + (nm || 'Без имени'), closable:false});
        }
      } catch(e){}
    }
    if((curTab === 'route_detail' || curTab === 'routes') && typeof currentRouteId !== 'undefined' && currentRouteId){
      try {
        var r = db.routes.find(function(x){return x.id === currentRouteId;});
        if(r) crumbs.push({label:r.title || 'Маршрут', closable:false});
      } catch(e){}
    }
    return crumbs;
  }

  function injectCrumbs(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('.zrz-crumbs')) return;
    if(modal.querySelector('.modal-crumbs')) return;
    var crumbs = buildCrumbsForModal();
    if(!crumbs.length) return;
    var html = '<div class="zrz-crumbs">';
    crumbs.forEach(function(c, i){
      var isLast = (i === crumbs.length - 1);
      var cls = 'zrz-crumb' + (isLast ? ' zrz-crumb-cur' : '');
      var action = (!isLast && c.closable) ? ' onclick="closeModalWithConfirm()"' : '';
      html += '<span class="'+cls+'"'+action+'>'+esc(c.label)+'</span>';
      if(!isLast) html += '<span class="bc-sep">›</span>';
    });
    html += '</div>';
    var h2 = modal.querySelector('h2');
    if(h2) h2.insertAdjacentHTML('afterend', html);
    else modal.insertAdjacentHTML('afterbegin', html);
  }

  function wrapShowModal(){
    if(window._zrzShowModalWrapped) return;
    if(typeof window.showModal !== 'function') return;
    var orig = window.showModal;
    window.showModal = function(){
      var res = orig.apply(this, arguments);
      setTimeout(injectCrumbs, 30);
      return res;
    };
    window._zrzShowModalWrapped = true;
  }

  /* ---------- 4. CSS ---------- */

  function injectNavCss(){
    if(document.getElementById('zrz-nav-css')) return;
    var css = ''
      /* Крошки */
      + '.zrz-crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 0 10px;margin-bottom:4px;font-size:12px;color:var(--muted);font-weight:600}'
      + '.zrz-crumb{padding:3px 9px;background:var(--accent-soft);border-radius:8px;color:var(--accent-deep);transition:background .15s ease}'
      + '.zrz-crumb[onclick]{cursor:pointer}'
      + '.zrz-crumb[onclick]:active{background:var(--accent-line)}'
      + '.zrz-crumb-cur{background:transparent !important;color:var(--muted) !important;font-weight:800;padding-left:0}'
      + '.zrz-crumbs .bc-sep{color:var(--muted-2);font-weight:700}'
      /* Компактный таббар при 5 вкладках */
      + '.tabbar.zrz-tabs-5 .tabbar-btn{padding:8px 2px 6px;font-size:10px}'
      + '.tabbar.zrz-tabs-5 .tabbar-btn .tb-ico{font-size:20px}'
      + '.tabbar.zrz-tabs-5 .tabbar-btn span:last-child{font-size:9.5px;letter-spacing:-0.2px}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-nav-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 5. Запуск ---------- */

  function navApply(){
    try { injectNavCss(); } catch(e){}
    try { wrapShowModal(); } catch(e){}
    try { wrapRender(); } catch(e){}
    try {
      /* Перерисовать таббар — если приложение уже залогинено */
      if(typeof currentUser === 'function' && currentUser()){
        renderRoleTabs();
      }
    } catch(e){}
  }

  /* Хук: сразу после загрузки + небольшой интервал для случая,
     когда ядро ещё не успело отрисовать шапку/таббар */
  if(document.body) navApply();
  else document.addEventListener('DOMContentLoaded', navApply, {once:true});
  setTimeout(navApply, 400);
  setTimeout(navApply, 1200);

  /* Также вызываем при каждом открытии модалки — обрабатывается отдельно
     через wrapShowModal. И при перерисовке страницы — обновляем таббар. */
  var _navInterval = setInterval(function(){
    try {
      var el = document.getElementById('tabbar');
      if(!el) return;
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      /* Если таббар пустой или показывает старые 4 вкладки — перерисуем */
      var wantRole = tabsForRole(u).length;
      var haveCount = el.querySelectorAll('.tabbar-btn').length;
      if(haveCount !== wantRole){
        renderRoleTabs();
      }
    } catch(e){}
  }, 1500);
  setTimeout(function(){ clearInterval(_navInterval); }, 60000);

  /* Клики по старым кнопкам ядра (если они ещё остались) — перехватываем */
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.tabbar-btn');
    if(!btn) return;
    var tab = btn.getAttribute('data-tab');
    if(!tab) return;
    /* Если это уже наш обработчик — не мешаем */
    if(btn.getAttribute('onclick') && btn.getAttribute('onclick').indexOf('zrzSwitchTab') >= 0) return;
    e.preventDefault();
    e.stopPropagation();
    window.zrzSwitchTab(tab);
  }, true);

  try{console.log('[nav v5.0.0] Ролевой таббар + крошки + уведомления — активны');}catch(_){}
})();
