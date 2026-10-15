/* patches/02-draw.js — чертежи: часть 1/2
   · Размерные хелперы (выноски, стрелки)
   · Декоративные болты (4/6/8 шт)
   · Вырезы (прямоугольный/круглый + отступы)
   · Фацет (рамка внутри зеркала)
   · Скругления углов (дуги + выноска R)
   Часть 2: розетки, светильники, обёртки drawTechIso/drawTechFront
*/
(function(){
  if(window._zrz02DrawP1) return;
  window._zrz02DrawP1 = true;

  var DIM_COLOR = '#c14d4d';

  /* ---------- Выноска: размерная линия между двумя точками ---------- */
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

  /* ---------- Размер внутри элемента (без выносных линий) ---------- */
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

  /* ---------- Болты: отступ и раскладка ---------- */
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

  /* ---------- Фартук: общий габарит W×H ---------- */
  window._zrzApronTotalWH = function(d){
    var secs = Array.isArray(d.apronSections)?d.apronSections:[];
    if(!secs.length) return null;
    var totalW = 0, maxH = 0;
    secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
    if(totalW<1||maxH<1) return null;
    return {W: totalW, H: maxH};
  };

  /* ---------- Вырез ---------- */
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

  /* ---------- Фацет ---------- */
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

  /* ---------- Скругления углов ---------- */
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
/* patches/02-draw.js — часть 2/2
   · Розетки (X/Y, шаг, ориентация)
   · Светильники (бра)
   · Обёртки drawTechIso и drawTechFront —
     заставляют ядро рисовать болты, вырезы, фацет,
     скругления, розетки и светильники на чертеже.
   · ФИКС: штриховка подсветки в изометрии — только по нужным сторонам
*/
