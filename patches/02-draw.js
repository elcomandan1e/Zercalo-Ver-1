/* patches/02-draw.js — чертежи: часть 1/2
   · Размерные хелперы (выноски, стрелки)
   · Декоративные болты (4/6/8 шт)
   · Вырезы (прямоугольный/круглый + отступы)
   · Фацет (рамка внутри зеркала)
   · Скругления углов (дуги + выноска R)
   Часть 2: розетки, светильники, полная замена drawTechIso
*/
(function(){
  if(window._zrz02DrawP1) return;
  window._zrz02DrawP1 = true;

  var DIM_COLOR = '#c14d4d';

  window._zrzDimLineFull = function(ctx, obj1, obj2, dimP1, dimP2, label, color){
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
  };

  window._zrzDimInline = function(ctx, x1, y1, x2, y2, label, color){
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
  };

  window._zrzGetBoltOffset = function(d){
    var v = Number(d.boltOffset);
    if(!v || v<=0) return 5;
    if(v<1) v = 1;
    if(v>30) v = 30;
    return v;
  };
  window._zrzBoltLayout = function(W, H, cnt, offCm){
    var off = offCm || 5;
    if(W < 2*off+1) off = Math.max(1, W/8);
    if(H < 2*off+1) off = Math.max(1, H/8);
    var pts = [{x:off,y:off},{x:W-off,y:off},{x:off,y:H-off},{x:W-off,y:H-off}];
    if(cnt>=6){ pts.push({x:W/2,y:off}); pts.push({x:W/2,y:H-off}); }
    if(cnt>=8){ pts.push({x:off,y:H/2}); pts.push({x:W-off,y:H/2}); }
    return pts;
  };
  function drawBoltCircle(ctx, px, py, r){
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
    ctx.fillStyle = '#eaf1fb'; ctx.fill();
    ctx.strokeStyle = '#1e4d7b'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, r*0.35), 0, Math.PI*2);
    ctx.fillStyle = '#1e4d7b'; ctx.fill();
  }
  window._zrzDrawBoltsWithCallout = function(ctx, x0, y0, sc3, W, H, d, calloutLeftLimit){
    if(!d.boltMount) return;
    var cnt = Number(d.boltCount)||0;
    if(cnt<4) return;
    var off = window._zrzGetBoltOffset(d);
    var pts = window._zrzBoltLayout(W, H, cnt, off);
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
  };

  window._zrzApronTotalWH = function(d){
    var secs = Array.isArray(d.apronSections)?d.apronSections:[];
    if(!secs.length) return null;
    var totalW = 0, maxH = 0;
    secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
    if(totalW<1||maxH<1) return null;
    return {W: totalW, H: maxH};
  };

  var DIM_CUT_COLOR   = '#c95a1e';
  var DIM_FACET_COLOR = '#c95a1e';
  var DIM_ROUND_COLOR = '#c14d4d';

  window._zrzCutoutRect = function(d, x0, y0, pxW, pxH, sc3){
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
  };

  window._zrzDrawCutout = function(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.cutoutEnabled) return;
    var r = window._zrzCutoutRect(d, x0, y0, pxW, pxH, sc3);
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
    window._zrzDimInline(ctx, r.x, dimY, r.x + r.w, dimY, labelW, DIM_CUT_COLOR);
    if(r.shape === 'rect' && r.hCm !== r.wCm){
      var gapRight = (x0 + pxW) - (r.x + r.w);
      var dimX = (gapRight >= 24) ? (r.x + r.w + 14) : (r.x - 14);
      window._zrzDimInline(ctx, dimX, r.y, dimX, r.y + r.h, numFmt(r.hCm)+' см', DIM_CUT_COLOR);
    }
    if(d.cutoutCenter === false){
      var edgeX = (d.cutoutEdgeX === 'right') ? (x0 + pxW) : x0;
      var refX  = (d.cutoutEdgeX === 'right') ? (r.x + r.w) : r.x;
      var yX = cy - 24; if(yX < y0 + 8) yX = cy + 24;
      window._zrzDimInline(ctx, edgeX, yX, refX, yX, numFmt(d.cutoutDistX||0)+' см', DIM_CUT_COLOR);
      var edgeY = (d.cutoutEdgeY === 'bottom') ? (y0 + pxH) : y0;
      var refY  = (d.cutoutEdgeY === 'bottom') ? (r.y + r.h) : r.y;
      var xY = cx - 24; if(xY < x0 + 8) xY = cx + 24;
      window._zrzDimInline(ctx, xY, edgeY, xY, refY, numFmt(d.cutoutDistY||0)+' см', DIM_CUT_COLOR);
    }
  };

  window._zrzDrawFacetDims = function(ctx, x0, y0, pxW, pxH, sc3, d){
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
  };

  window._zrzDrawRoundedCorners = function(ctx, x0, y0, pxW, pxH, sc3, d){
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
  };

  try{ console.log('[02-draw p1] размеры, болты, вырезы, фацет, скругления — готовы'); }catch(_){}
})();
/* patches/02-draw.js — часть 2/2 (v5) */
/* patches/02-draw.js — часть 2/2 (v5)
   Розетки (X/Y, шаг, ориентация)
   Светильники (бра)
   Полная замена drawTechIso для зеркал/полок/панно:
   · штрих подсветки только по сторонам, без рамки
   · круг и овал — правильной формы во всех видах
   · выноска со сторонами ниже, без наложения
*/
(function(){
  if(window._zrz02DrawP2v5) return;
  window._zrz02DrawP2v5 = true;

  var DIM_SOCKET_COLOR = '#a05c26';
  var DIM_LIGHT_COLOR  = '#7a3d8a';

  /* ---------- Штриховка по сторонам (без рамки) ---------- */
  function _hatchSided(ctx, x, y, w, h, insPx, widPx, sides){
    if(widPx <= 0) return;
    if(!sides) sides = { top:true, right:true, bottom:true, left:true };
    if(insPx + widPx >= w/2 || insPx + widPx >= h/2) return;
    function hatchRect(rx, ry, rw, rh){
      if(rw <= 0 || rh <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.strokeStyle = 'rgba(140,110,70,0.65)';
      ctx.lineWidth = 0.9;
      var step = 4.5;
      ctx.beginPath();
      for(var i = -rh; i < rw + rh; i += step){
        ctx.moveTo(rx + i, ry);
        ctx.lineTo(rx + i + rh, ry + rh);
      }
      ctx.stroke();
      ctx.restore();
    }
    if(sides.top)    hatchRect(x + insPx,             y + insPx,             w - 2*insPx, widPx);
    if(sides.bottom) hatchRect(x + insPx,             y + h - insPx - widPx, w - 2*insPx, widPx);
    if(sides.left)   hatchRect(x + insPx,             y + insPx,             widPx,       h - 2*insPx);
    if(sides.right)  hatchRect(x + w - insPx - widPx, y + insPx,             widPx,       h - 2*insPx);
  }

  function _callout(ctx, x0, y0, pxW, pxH, blArr){
    var hasOn = blArr.indexOf('На зеркале') >= 0;
    var hasBehind = blArr.indexOf('Из-за зеркала') >= 0;
    if(!hasOn && !hasBehind) return;
    var sides = (typeof window._backlightSides === 'function') ? window._backlightSides(blArr) : null;
    var names = [];
    if(sides){
      if(sides.left)   names.push('слева');
      if(sides.right)  names.push('справа');
      if(sides.top)    names.push('сверху');
      if(sides.bottom) names.push('снизу');
    }
    var head = hasOn ? '💡 на зеркале' : '💡 из-за зеркала';
    var sub = names.length ? ('Стороны: ' + names.join(', ')) : '';
    var cx = x0 + pxW / 2;
    var ty = y0 + pxH + 70;
    ctx.save();
    ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.fillStyle = '#8a6a2c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(head, cx, ty);
    if(sub){
      ctx.font = '600 10px "PT Sans Narrow",Arial';
      ctx.fillStyle = '#a08a54';
      ctx.fillText(sub, cx, ty + 14);
    }
    ctx.restore();
  }

  /* ---------- Путь формы (RECT / CIRCLE / OVAL) ---------- */
  function _shapePath(ctx, x0, y0, pxW, pxH, shape, rPx){
    ctx.beginPath();
    if(shape === 'CIRCLE'){
      var rr = Math.min(pxW, pxH) / 2;
      ctx.arc(x0 + pxW/2, y0 + pxH/2, rr, 0, Math.PI*2);
    } else if(shape === 'OVAL'){
      if(ctx.ellipse){
        ctx.ellipse(x0 + pxW/2, y0 + pxH/2, pxW/2, pxH/2, 0, 0, Math.PI*2);
      } else {
        ctx.save();
        ctx.translate(x0 + pxW/2, y0 + pxH/2);
        ctx.scale(1, pxH / pxW);
        ctx.arc(0, 0, pxW/2, 0, Math.PI*2);
        ctx.restore();
      }
    } else if(typeof canvasRoundRect === 'function'){
      canvasRoundRect(ctx, x0, y0, pxW, pxH, rPx || 0);
    } else {
      ctx.rect(x0, y0, pxW, pxH);
    }
  }

  /* ---------- Центры розеток ---------- */
  window._zrzSocketCenters = function(s, x0, y0, pxW, pxH, sc3){
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
  };

  function _socketDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.socketsMount || !Array.isArray(d.socketsList) || !d.socketsList.length) return;
    for(var i=0;i<d.socketsList.length;i++){
      var s = d.socketsList[i];
      var info = window._zrzSocketCenters(s, x0, y0, pxW, pxH, sc3);
      var pts = info.pts;
      if(!pts.length) continue;
      var first = pts[0], last = pts[pts.length-1];
      var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
      var minY = Math.min.apply(null, pts.map(function(p){return p.y;}));
      var maxY = Math.max.apply(null, pts.map(function(p){return p.y;}));
      var minX = Math.min.apply(null, pts.map(function(p){return p.x;}));
      var maxX = Math.max.apply(null, pts.map(function(p){return p.x;}));
      var edgeXpx = (s.edgeX==='right') ? (x0 + pxW) : x0;
      window._zrzDimLineFull(ctx, {x:edgeXpx, y:maxY+6}, {x:info.baseX, y:maxY+6},
                                  {x:edgeXpx, y:maxY+40}, {x:info.baseX, y:maxY+40},
                                  numFmt(dx)+' см', DIM_SOCKET_COLOR);
      var yDimX = (s.edgeX==='right') ? (minX-46) : (maxX+46);
      var edgeYpx = (s.edgeY==='top') ? y0 : (y0 + pxH);
      window._zrzDimLineFull(ctx, {x:maxX+6, y:edgeYpx}, {x:maxX+6, y:info.baseY},
                                  {x:yDimX, y:edgeYpx}, {x:yDimX, y:info.baseY},
                                  numFmt(dy)+' см', DIM_SOCKET_COLOR);
      if(pts.length > 1){
        if(info.or === 'horizontal'){
          var yStep = (s.edgeY==='top') ? (maxY+20) : (minY-28);
          window._zrzDimLineFull(ctx, {x:first.x, y:yStep>maxY?maxY:minY}, {x:last.x, y:yStep>maxY?maxY:minY},
                                      {x:first.x, y:yStep}, {x:last.x, y:yStep},
                                      'шаг '+numFmt(info.stepCm)+' см', DIM_SOCKET_COLOR);
        } else {
          var xStep = (s.edgeX==='right') ? (maxX+46+44) : (minX-46-44);
          window._zrzDimLineFull(ctx, {x:minX, y:first.y}, {x:minX, y:last.y},
                                      {x:xStep, y:first.y}, {x:xStep, y:last.y},
                                      'шаг '+numFmt(info.stepCm)+' см', DIM_SOCKET_COLOR);
        }
      }
    }
  }

  function _lightDims(ctx, x0, y0, pxW, pxH, sc3, d){
    if(!d.lightsMount || !Array.isArray(d.lightsList) || !d.lightsList.length) return;
    for(var i=0;i<d.lightsList.length;i++){
      var s = d.lightsList[i];
      var dx = Number(s.distX)||0, dy = Number(s.distY)||0;
      var baseX = (s.edgeX==='right') ? (x0 + pxW - dx*sc3) : (x0 + dx*sc3);
      var baseY = (s.edgeY==='bottom')? (y0 + pxH - dy*sc3) : (y0 + dy*sc3);
      var edgeXpx = (s.edgeX==='right') ? (x0 + pxW) : x0;
      var edgeYpx = (s.edgeY==='top') ? y0 : (y0 + pxH);
      window._zrzDimLineFull(ctx, {x:edgeXpx, y:baseY-6}, {x:baseX, y:baseY-6},
                                  {x:edgeXpx, y:baseY-46}, {x:baseX, y:baseY-46},
                                  numFmt(dx)+' см', DIM_LIGHT_COLOR);
      var yDimX = (s.edgeX==='right') ? (baseX-46) : (baseX+46);
      window._zrzDimLineFull(ctx, {x:baseX+(s.edgeX==='right'?6:-6), y:edgeYpx}, {x:baseX+(s.edgeX==='right'?6:-6), y:baseY},
                                  {x:yDimX, y:edgeYpx}, {x:yDimX, y:baseY},
                                  numFmt(dy)+' см', DIM_LIGHT_COLOR);
    }
  }

  /* ---------- Розетки и светильники для вида спереди/сверху ---------- */
  function _drawSocketsAndLightsFront(ctx, x, y, w, h, d, overrideSize){
    if(d.type !== 'MIRROR' && d.type !== 'PANNO') return;
    var gd = null; try{ gd = glassDimensions(d); }catch(e){ return; }
    if(!gd || !gd.w || !gd.h) return;
    var cx = x + w/2, cy = y + h/2;
    var sc3 = Math.min((w-80)/Math.max(gd.w||1,1), (h-60)/Math.max(gd.h||1,1));
    var pxW = gd.w * sc3, pxH = gd.h * sc3;
    var x0 = cx - pxW/2, y0 = cy - pxH/2;

    if(d.socketsMount && Array.isArray(d.socketsList) && typeof window._zrzSocketCenters === 'function'){
      var sockR = Math.max(5, (7/2) * sc3);
      for(var si=0; si<d.socketsList.length; si++){
        var s = d.socketsList[si];
        var info = window._zrzSocketCenters(s, x0, y0, pxW, pxH, sc3);
        for(var pi=0; pi<info.pts.length; pi++){
          var p = info.pts[pi];
          ctx.save();
          ctx.fillStyle = '#f5c93a';
          ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, sockR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x-sockR-4, p.y); ctx.lineTo(p.x+sockR+4, p.y);
          ctx.moveTo(p.x, p.y-sockR-4); ctx.lineTo(p.x, p.y+sockR+4);
          ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 0.9; ctx.stroke();
          ctx.restore();
        }
      }
    }
    if(d.lightsMount && Array.isArray(d.lightsList)){
      var lightR = Math.max(6, (8/2) * sc3);
      for(var li=0; li<d.lightsList.length; li++){
        var ls = d.lightsList[li];
        var dxL = Number(ls.distX)||0, dyL = Number(ls.distY)||0;
        var baseX = (ls.edgeX==='right') ? (x0 + pxW - dxL*sc3) : (x0 + dxL*sc3);
        var baseY = (ls.edgeY==='bottom')? (y0 + pxH - dyL*sc3) : (y0 + dyL*sc3);
        ctx.save();
        ctx.fillStyle = '#e6ecf5'; ctx.strokeStyle = '#3b5c8f'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(baseX, baseY, lightR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(baseX, baseY, Math.max(2, lightR*0.4), 0, Math.PI*2);
        ctx.strokeStyle = '#3b5c8f'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
    if(typeof window._zrzDimLineFull === 'function'){
      _socketDims(ctx, x0, y0, pxW, pxH, sc3, d);
      _lightDims(ctx, x0, y0, pxW, pxH, sc3, d);
    }
  }

  /* ============================================================
     ПОЛНАЯ ЗАМЕНА drawTechIso ДЛЯ MIRROR / SHELF / PANNO
     ============================================================ */
  function _drawIsoV5(ctx, x, y, w, h, dims, scale, d){
    var cx = x + w/2, cy = y + h/2;
    ctx.save();
    var ink = '#1a2733';

    ctx.strokeStyle = '#e8eef7';
    ctx.lineWidth = 1;
    ctx.strokeRect(x-4, y-4, w+8, h+8);

    var gd = glassDimensions(d);
    var _padL=64, _padR=88, _padT=48, _padB=78;
    var _avW = Math.max(80, w - _padL - _padR);
    var _avH = Math.max(60, h - _padT - _padB);
    var sc3 = Math.min(_avW/Math.max(gd.w||1,1), _avH/Math.max(gd.h||1,1));
    var pxW = gd.w * sc3, pxH = gd.h * sc3;
    var x0 = cx - pxW/2, y0 = cy - pxH/2 + 12;
    var _shape = d.shape || 'RECT';

    /* Лучи из-за зеркала */
    if(typeof window._drawMirrorBacklightRays === 'function'){
      window._drawMirrorBacklightRays(ctx, x0, y0, pxW, pxH, d, sc3);
    }

    var _rMm = (d.roundedCorners && (_shape==='RECT'||_shape==='RECT4')) ? (Number(d.cornerRadius)||0) : 0;
    var _rPx = _rMm / 10 * sc3;

    var _blArr = (typeof backlightArr === 'function') ? backlightArr(d) : [];
    var _hasOnBack = _blArr.indexOf('На зеркале') >= 0;
    var _boPx = Math.max(2, (Number(d.backlightOffset)||2) * sc3);
    var _bwPx = Math.max(6, (Number(d.backlightWidth)||2) * sc3);

    /* Фон стекла */
    ctx.fillStyle = 'rgba(200,221,240,0.55)';
    _shapePath(ctx, x0, y0, pxW, pxH, _shape, _rPx);
    ctx.fill();

    /* Штрих подсветки — только для прямоугольных форм */
    if(_hasOnBack && _shape !== 'CIRCLE' && _shape !== 'OVAL'){
      var sides = (typeof window._backlightSides === 'function') ? window._backlightSides(_blArr) : null;
      _hatchSided(ctx, x0, y0, pxW, pxH, _boPx, _bwPx, sides);
    }

    /* Внешняя рамка стекла */
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.2;
    _shapePath(ctx, x0, y0, pxW, pxH, _shape, _rPx);
    ctx.stroke();

    /* Фацет */
    if(typeof window._drawMirrorFacet === 'function'){
      window._drawMirrorFacet(ctx, x0, y0, pxW, pxH, d, sc3);
    }

    /* Разрезы */
    if(d.cutV || d.cutH){
      ctx.save();
      ctx.strokeStyle = '#9d3668'; ctx.lineWidth = 1.4; ctx.setLineDash([7,4]);
      if(d.cutV){
        var cvx = x0 + (Number(d.cutVPos)||0)*sc3;
        ctx.beginPath(); ctx.moveTo(cvx, y0-4); ctx.lineTo(cvx, y0+pxH+4); ctx.stroke();
      }
      if(d.cutH){
        var chy = y0 + (Number(d.cutHPos)||0)*sc3;
        ctx.beginPath(); ctx.moveTo(x0-4, chy); ctx.lineTo(x0+pxW+4, chy); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();
    }

    /* Вырез */
    if(d.cutoutEnabled && Number(d.cutoutW) > 0){
      ctx.save();
      ctx.strokeStyle = '#c95a1e'; ctx.lineWidth = 1.6;
      if((d.cutoutShape||'rect') === 'circle'){
        var rrC = Number(d.cutoutW)*sc3/2;
        ctx.beginPath(); ctx.arc(x0+pxW/2, y0+pxH/2, rrC, 0, Math.PI*2); ctx.stroke();
      } else if(Number(d.cutoutH) > 0){
        var cow = Number(d.cutoutW)*sc3, coh = Number(d.cutoutH)*sc3;
        ctx.beginPath();
        ctx.rect(x0+pxW/2-cow/2, y0+pxH/2-coh/2, cow, coh);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* Розетки */
    if(d.socketsMount && Array.isArray(d.socketsList) && typeof window._zrzSocketCenters === 'function'){
      var sockR = Math.max(4, (7/2) * sc3);
      for(var si=0; si<d.socketsList.length; si++){
        var s = d.socketsList[si];
        var info = window._zrzSocketCenters(s, x0, y0, pxW, pxH, sc3);
        for(var pi=0; pi<info.pts.length; pi++){
          var p = info.pts[pi];
          ctx.save();
          ctx.fillStyle = '#f5c93a';
          ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(p.x, p.y, sockR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x-sockR-3, p.y); ctx.lineTo(p.x+sockR+3, p.y);
          ctx.moveTo(p.x, p.y-sockR-3); ctx.lineTo(p.x, p.y+sockR+3);
          ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 0.85; ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* Светильники */
    if(d.lightsMount && Array.isArray(d.lightsList)){
      var lightR = Math.max(5, (8/2) * sc3);
      for(var li=0; li<d.lightsList.length; li++){
        var ls = d.lightsList[li];
        var dxL = Number(ls.distX)||0, dyL = Number(ls.distY)||0;
        var baseX = (ls.edgeX==='right') ? (x0 + pxW - dxL*sc3) : (x0 + dxL*sc3);
        var baseY = (ls.edgeY==='bottom')? (y0 + pxH - dyL*sc3) : (y0 + dyL*sc3);
        ctx.save();
        ctx.fillStyle = '#e6ecf5'; ctx.strokeStyle = '#3b5c8f'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(baseX, baseY, lightR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(baseX, baseY, Math.max(2, lightR*0.4), 0, Math.PI*2);
        ctx.strokeStyle = '#3b5c8f'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }

    /* Болты — только для прямоугольных форм */
    if(d.boltMount && _shape !== 'CIRCLE' && _shape !== 'OVAL' && typeof window._zrzDrawBoltsWithCallout === 'function'){
      window._zrzDrawBoltsWithCallout(ctx, x0, y0, sc3, gd.w, gd.h, d, x);
    }

    /* Выноска радиуса */
    if(_rMm > 0 && _rPx > 4 && typeof window._rCalloutArrow === 'function'){
      window._rCalloutArrow(ctx, x0+pxW-_rPx, y0+pxH-_rPx, _rPx, _rMm);
    }

    /* Размеры H и W */
    if(typeof window._dimH === 'function'){ window._dimH(ctx, x0, x0+pxW, y0+pxH+18, numFmt(gd.w)+' см'); }
    if(typeof window._dimV === 'function'){ window._dimV(ctx, y0, y0+pxH, x0+pxW+22, numFmt(gd.h)+' см'); }

    /* Маркер разреза */
    if(d.cutV && typeof window._drawSectionMark === 'function'){
      window._drawSectionMark(ctx, x0-22, y0, y0+pxH, 'А');
    }

    /* Размеры розеток и светильников */
    if(typeof window._zrzDimLineFull === 'function'){
      _socketDims(ctx, x0, y0, pxW, pxH, sc3, d);
      _lightDims(ctx, x0, y0, pxW, pxH, sc3, d);
    }

    /* Выноска со сторонами подсветки */
    _callout(ctx, x0, y0, pxW, pxH, _blArr);

    ctx.restore();
  }

  /* ============================================================
     ОБЁРТКИ
     ============================================================ */

  function wrapIso(){
    if(window._zrzDrawIsoV5Wrapped) return;
    if(typeof window.drawTechIso !== 'function') return;
    var orig = window.drawTechIso;
    var nw = function(ctx, x, y, w, h, dims, scale, d){
      if(d && d.type !== 'SHOWER' && d.type !== 'APRON'){
        try { return _drawIsoV5(ctx, x, y, w, h, dims, scale, d); }
        catch(e){ try{console.warn('[02-draw v5] iso', e);}catch(_){} }
      }
      return orig.apply(this, arguments);
    };
    nw._zrzV5 = true;
    window.drawTechIso = nw;
    window._zrzDrawIsoV5Wrapped = true;
  }

  function wrapFront(){
    if(window._zrzDrawFrontV5Wrapped) return;
    if(typeof window.drawTechFront !== 'function') return;
    var orig = window.drawTechFront;
    var nw = function(ctx, x, y, w, h, d){
      var res = orig.apply(this, arguments);
      if(!d || d.type !== 'MIRROR') return res;
      if(d.shape !== 'CIRCLE' && d.shape !== 'OVAL') return res;
      try {
        var gd = glassDimensions(d);
        var cx = x + w/2, cy = y + h/2;
        var sc3 = Math.min((w-80)/Math.max(gd.w||1,1), (h-60)/Math.max(gd.h||1,1));
        var pxW = gd.w * sc3, pxH = gd.h * sc3;
        var x0 = cx - pxW/2, y0 = cy - pxH/2;

        /* Затираем ядровой прямоугольник */
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(x0 - 6, y0 - 6, pxW + 12, pxH + 12);
        ctx.restore();

        /* Фон */
        ctx.save();
        ctx.fillStyle = 'rgba(200,221,240,0.35)';
        _shapePath(ctx, x0, y0, pxW, pxH, d.shape, 0);
        ctx.fill();
        /* Рамка */
        ctx.strokeStyle = '#3d86c8';
        ctx.lineWidth = 2.5;
        _shapePath(ctx, x0, y0, pxW, pxH, d.shape, 0);
        ctx.stroke();
        ctx.restore();

        /* Подсветка «на зеркале» для овала (для круга обычно не ставят) */
        if(d.shape === 'OVAL' && Array.isArray(d.backlight) && d.backlight.indexOf('На зеркале') >= 0){
          var sides = (typeof window._backlightSides === 'function') ? window._backlightSides(d.backlight) : null;
          var _boPx = Math.max(2, (Number(d.backlightOffset)||2) * sc3);
          var _bwPx = Math.max(6, (Number(d.backlightWidth)||2) * sc3);
          ctx.save();
          ctx.beginPath();
          if(ctx.ellipse){ ctx.ellipse(cx, cy, pxW/2, pxH/2, 0, 0, Math.PI*2); }
          else { ctx.arc(cx, cy, pxW/2, 0, Math.PI*2); }
          ctx.clip();
          if(sides){
            function hatchBand(rx, ry, rw, rh){
              if(rw <= 0 || rh <= 0) return;
              ctx.save();
              ctx.beginPath();
              ctx.rect(rx, ry, rw, rh);
              ctx.clip();
              ctx.strokeStyle = 'rgba(140,110,70,0.65)';
              ctx.lineWidth = 0.9;
              var step = 4.5;
              ctx.beginPath();
              for(var i = -rh; i < rw + rh; i += step){
                ctx.moveTo(rx + i, ry);
                ctx.lineTo(rx + i + rh, ry + rh);
              }
              ctx.stroke();
              ctx.restore();
            }
            if(sides.left)   hatchBand(x0 + _boPx, y0 + _boPx, _bwPx, pxH - 2*_boPx);
            if(sides.right)  hatchBand(x0 + pxW - _boPx - _bwPx, y0 + _boPx, _bwPx, pxH - 2*_boPx);
            if(sides.top)    hatchBand(x0 + _boPx, y0 + _boPx, pxW - 2*_boPx, _bwPx);
            if(sides.bottom) hatchBand(x0 + _boPx, y0 + pxH - _boPx - _bwPx, pxW - 2*_boPx, _bwPx);
          }
          ctx.restore();
        }

        /* Розетки и светильники */
        _drawSocketsAndLightsFront(ctx, x, y, w, h, d);

        /* Размеры W и H */
        if(typeof window._dimH === 'function'){ window._dimH(ctx, x0, x0+pxW, y0+pxH+18, numFmt(gd.w)+' см'); }
        if(typeof window._dimV === 'function'){ window._dimV(ctx, y0, y0+pxH, x0+pxW+22, numFmt(gd.h)+' см'); }
      } catch(e){ try{console.warn('[02-draw v5 front]', e);}catch(_){} }
      return res;
    };
    nw._zrzV5 = true;
    window.drawTechFront = nw;
    window._zrzDrawFrontV5Wrapped = true;
  }

  function wrapPlan(){
    if(window._zrzDrawPlanV5Wrapped) return;
    if(typeof window.drawTechPlan !== 'function') return;
    var orig = window.drawTechPlan;
    var nw = function(ctx, x, y, w, h, d){
      var res = orig.apply(this, arguments);
      if(!d || d.type !== 'MIRROR') return res;
      if(d.shape !== 'CIRCLE' && d.shape !== 'OVAL') return res;
      try {
        var gd = glassDimensions(d);
        var cx = x + w/2, cy = y + h/2;
        var sc3 = Math.min((w-80)/Math.max(gd.w||1,1), (h-60)/Math.max(gd.h||1,1));
        var pxW = gd.w * sc3, pxH = gd.h * sc3;
        var x0 = cx - pxW/2, y0 = cy - pxH/2;

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(x0 - 6, y0 - 6, pxW + 12, pxH + 12);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(200,221,240,0.4)';
        ctx.strokeStyle = '#3d86c8';
        ctx.lineWidth = 2.5;
        _shapePath(ctx, x0, y0, pxW, pxH, d.shape, 0);
        ctx.fill();
        _shapePath(ctx, x0, y0, pxW, pxH, d.shape, 0);
        ctx.stroke();
        ctx.restore();

        var label = 'Вид сверху: ' + numFmt(gd.w) + ' см' + (d.shape === 'CIRCLE' ? (' × Ø' + numFmt(gd.h)) : (' × ' + numFmt(gd.h))) + ' × ' + numFmt(d.th||4) + ' мм';
        ctx.save();
        ctx.fillStyle = '#c14d4d';
        ctx.font = '700 14px "PT Sans Narrow",Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, cx, cy - Math.max(pxW,pxH)/2 - 10);
        ctx.restore();
      } catch(e){ try{console.warn('[02-draw v5 plan]', e);}catch(_){} }
      return res;
    };
    nw._zrzV5 = true;
    window.drawTechPlan = nw;
    window._zrzDrawPlanV5Wrapped = true;
  }

  function wrapOpenTechDraw(){
    if(window._zrzOpenTechDrawV5Wrapped) return;
    if(typeof window.openTechDraw !== 'function') return;
    var orig = window.openTechDraw;
    var nw = function(itemId){
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
      }catch(e){ try{console.warn('[02-draw v5] openTechDraw', e);}catch(_){} }
      return orig.apply(this, arguments);
    };
    window.openTechDraw = nw;
    window._zrzOpenTechDrawV5Wrapped = true;
  }

  function apply(){
    try{ wrapIso(); }catch(e){}
    try{ wrapFront(); }catch(e){}
    try{ wrapPlan(); }catch(e){}
    try{ wrapOpenTechDraw(); }catch(e){}
  }
  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  var _iv = setInterval(function(){
    try{ wrapIso(); }catch(e){}
    try{ wrapFront(); }catch(e){}
    try{ wrapPlan(); }catch(e){}
    try{ wrapOpenTechDraw(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[02-draw v5] штрих по сторонам + круг/овал во всех видах'); }catch(_){}
})();
