/* app-patches.js — динамические патчи «Зерцало»
   Активные фичи:
     v4.2.1 — скрыть OSRM.
     v4.2.3 — типографика.
     v4.2.4 — цвета фурнитуры.
     v4.2.5 — конфетти, пульс, пружина.
     v4.2.6 — усиленный ripple.
     v4.2.7 — болты для зеркал и фартуков.
     v4.2.8 — защита базы: не пушим метаданные до первого pull.
*/
(function(){
  var PATCH_VERSION = '4.2.8';
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

  /* ─── v4.2.5: конфетти ─── */
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

  /* ─── v4.2.6: усиленный ripple ─── */
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
      wave.style.left = x+'px';
      wave.style.top = y+'px';
      wave.style.width = '40px';
      wave.style.height = '40px';
      wave.style.setProperty('--zrz-scale', (far/20).toFixed(2));
      card.appendChild(wave);
      setTimeout(function(){ wave.remove(); }, 900);
    }, true);
  }

  /* ─── v4.2.7: болты ─── */
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
  function apronTotalWH(d){
    var secs = Array.isArray(d.apronSections)?d.apronSections:[];
    if(!secs.length) return null;
    var totalW = 0, maxH = 0;
    secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
    if(totalW<1||maxH<1) return null;
    return {W: totalW, H: maxH};
  }
  function drawMirrorBolts(ctx, x0, y0, sc3, d){
    if(!d.boltMount) return;
    var cnt = Number(d.boltCount)||0;
    if(cnt<4) return;
    var g = null; try{ g = glassDimensions(d); }catch(e){ return; }
    if(!g || !g.w || !g.h) return;
    var pts = boltLayout(g.w, g.h, cnt, 5);
    var r = Math.max(3, Math.min(7, 0.45*sc3));
    ctx.save();
    pts.forEach(function(p){ drawBoltCircle(ctx, x0 + p.x*sc3, y0 + p.y*sc3, r); });
    ctx.fillStyle = '#1e4d7b'; ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🔩 '+pts.length+' болтов Ø8 мм · отступ 5 см', x0 + (g.w*sc3)/2, y0 + g.h*sc3 + 14);
    ctx.restore();
  }
  function drawApronBoltsIso(ctx, x, y, w, h, d){
    var wh = apronTotalWH(d); if(!wh) return;
    var cnt = Number(d.boltCount)||0; if(cnt<4) return;
    var pts = boltLayout(wh.W, wh.H, cnt, 5);
    var cx=x+w/2, cy=y+h/2;
    var sc3 = Math.min((w-160)/wh.W, (h-80)/wh.H);
    var pxW = wh.W*sc3, pxH = wh.H*sc3;
    var x0 = cx - pxW/2, y0 = cy - pxH/2 + 12;
    var r = Math.max(3, Math.min(7, 0.45*sc3));
    ctx.save();
    pts.forEach(function(p){ drawBoltCircle(ctx, x0 + p.x*sc3, y0 + p.y*sc3, r); });
    ctx.fillStyle = '#1e4d7b'; ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🔩 '+pts.length+' болтов Ø8 мм · отступ 5 см', cx, y0 + pxH + 14);
    ctx.restore();
  }
  function drawApronBoltsFront(ctx, x, y, w, h, d){
    var secs = Array.isArray(d.apronSections)?d.apronSections:[];
    if(!secs.length) return;
    var cnt = Number(d.boltCount)||0; if(cnt<4) return;
    var totalW = 0, maxH = 0;
    secs.forEach(function(s){ totalW += Number(s.bottom)||0; maxH = Math.max(maxH, Number(s.left)||0, Number(s.right)||0); });
    if(totalW<1||maxH<1) return;
    var cx=x+w/2, cy=y+h/2;
    var gap = 16;
    var sc = Math.min((w-80-gap*(secs.length-1))/totalW, (h-60)/maxH);
    var startX = cx - (totalW*sc + gap*(secs.length-1))/2;
    var baseY = cy + maxH*sc/2 - 10;
    var pts = boltLayout(totalW, maxH, cnt, 5);
    var r = Math.max(3, Math.min(7, 0.45*sc));
    ctx.save();
    pts.forEach(function(p){ drawBoltCircle(ctx, startX + p.x*sc, baseY - maxH*sc + p.y*sc, r); });
    ctx.fillStyle = '#1e4d7b'; ctx.font = '700 11px "PT Sans Narrow",Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🔩 '+pts.length+' болтов Ø8 мм · отступ 5 см', startX + (totalW*sc)/2, baseY + 30);
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
          if(!d.boltMount) return res;
          if(d.type==='MIRROR'){
            var cx=x+w/2, cy=y+h/2;
            var gd = glassDimensions(d);
            var _padL=64,_padR=88,_padT=48,_padB=78;
            var _avW=Math.max(80,w-_padL-_padR), _avH=Math.max(60,h-_padT-_padB);
            var sc3=Math.min(_avW/Math.max(gd.w||1,1), _avH/Math.max(gd.h||1,1));
            var pxW=gd.w*sc3, pxH=gd.h*sc3;
            var x0=cx-pxW/2, y0=cy-pxH/2+12;
            drawMirrorBolts(ctx, x0, y0, sc3, d);
          } else if(d.type==='APRON'){
            drawApronBoltsIso(ctx, x, y, w, h, d);
          }
        }catch(e){}
        return res;
      };
    }
    if(typeof window.drawTechFront === 'function'){
      var origFront = window.drawTechFront;
      window.drawTechFront = function(ctx, x, y, w, h, d){
        var res = origFront.apply(this, arguments);
        try{
          if(!d.boltMount) return res;
          if(d.type==='MIRROR'){
            var cx=x+w/2, cy=y+h/2;
            var gd = glassDimensions(d);
            var sc3=Math.min((w-80)/Math.max(gd.w||1,1),(h-60)/Math.max(gd.h||1,1));
            var pxW=gd.w*sc3, pxH=gd.h*sc3;
            var x0=cx-pxW/2, y0=cy-pxH/2;
            drawMirrorBolts(ctx, x0, y0, sc3, d);
          } else if(d.type==='APRON'){
            drawApronBoltsFront(ctx, x, y, w, h, d);
          }
        }catch(e){}
        return res;
      };
    }
  }
  function injectBoltUI(){
    var m = document.querySelector('.modal');
    if(!m) return;
    if(m.querySelector('#zrz_bolt_block')) return;
    var d = window._editDraft || {};
    if(d.type!=='MIRROR' && d.type!=='APRON') return;
    var anchor = document.getElementById('calcBox');
    if(!anchor) return;
    var html = '<div id="zrz_bolt_block" style="margin-top:14px">'
      + '<div class="section-title" style="margin-top:0">🔩 Декоративные болты</div>'
      + '<div class="checkbox-row" style="background:linear-gradient(180deg,rgba(59,92,143,0.10),rgba(59,92,143,0.04));border:1.5px solid rgba(59,92,143,0.28)">'
      + '<input type="checkbox" id="zrz_bolt_chk"><label for="zrz_bolt_chk">Крепление на декоративные болты</label>'
      + '</div>'
      + '<div id="zrz_bolt_count_wrap" style="display:none;margin-top:10px">'
      + '  <label style="margin-top:0">Количество</label>'
      + '  <div class="chips" id="zrz_bolt_chips">'
      + '    <button type="button" class="chip" data-v="4">4 болта · по углам</button>'
      + '    <button type="button" class="chip" data-v="6">6 болтов · +верх/низ</button>'
      + '    <button type="button" class="chip" data-v="8">8 болтов · +лево/право</button>'
      + '  </div>'
      + '  <div class="shower-hint" style="text-align:left;margin-top:6px">Отступ от угла — 5 см. Расположение смотри на чертеже.</div>'
      + '</div></div>';
    anchor.insertAdjacentHTML('beforebegin', html);
    var chk = document.getElementById('zrz_bolt_chk');
    var ww = document.getElementById('zrz_bolt_count_wrap');
    var chs = document.getElementById('zrz_bolt_chips');
    chk.checked = !!d.boltMount;
    ww.style.display = d.boltMount ? 'block' : 'none';
    var cnt = Number(d.boltCount) || 4;
    chs.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', Number(c.dataset.v)===cnt); });
    chk.onchange = function(){
      if(window._editDraft) window._editDraft.boltMount = chk.checked;
      ww.style.display = chk.checked ? 'block' : 'none';
      if(chk.checked && !window._editDraft.boltCount) window._editDraft.boltCount = 4;
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
      setTimeout(injectBoltUI, 40);
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

  /* ═══════════════════════════════════════════════════════════
     v4.2.8 — ЗАЩИТА БАЗЫ
     ═══════════════════════════════════════════════════════════
     Проблема: новый телефон, чистая база → дефолтный админ и пустые
     настройки. При синхронизации с сервером локальные метаданные
     могут «победить» серверные по updatedAt и затереть их.

     Решение:
     1. Пока pull не прошёл, push идёт БЕЗ users/roles/settings.
     2. Первый pull заменяет users/roles/settings целиком (не merge).
     3. Ручные кнопки в настройках + индикатор.
  */

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
    /* Если pull так и не пришёл за 60 секунд — считаем, что сети нет.
       Разрешаем push, иначе пользователь не сможет сохранить ничего до сети. */
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
    if(!remote || !remote.users || !remote.users.length){
      _zrzServerEmpty = true;
      try{console.log('[zrz-guard] сервер пуст, локальные метаданные остаются');}catch(_){}
      return;
    }
    try{
      if(Array.isArray(remote.users)) db.users = JSON.parse(JSON.stringify(remote.users));
      if(remote.roles && typeof remote.roles === 'object') db.roles = JSON.parse(JSON.stringify(remote.roles));
      if(remote.settings && typeof remote.settings === 'object'){
        var keepSync = db.sync;
        db.settings = JSON.parse(JSON.stringify(remote.settings));
        db.sync = keepSync;
      }
      try{console.log('[zrz-guard] метаданные заменены серверными (users='+db.users.length+')');}catch(_){}
    }catch(e){ try{console.warn('[zrz-guard] firstPull error', e);}catch(_){} }
  }

  function _zrzBlockRef(ref){
    try{
      if(!ref || ref.__zrzBlocked) return;
      /* .set — замена payload */
      var origSet = ref.set.bind(ref);
      ref.set = function(data){
        if(_zrzGuardBlock()){
          try{console.warn('[zrz-guard] push без метаданных (pull ещё не прошёл)');}catch(_){}
          return origSet(_zrzSafePayload(data));
        }
        return origSet(data);
      };
      /* .once — перехватываем первое чтение, чтобы засечь первый pull */
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
      try{console.log('[zrz-guard] подписка переустановлена');}catch(_){}
    }catch(e){ try{console.warn('[zrz-guard] resub error', e);}catch(_){} }
  }

  /* Периодически проверяем, что _fbDbRef создан и блокируем его */
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

  /* Ручные кнопки */
  window.zrzPullOnly = function(){
    try{
      if(typeof _fbDbRef === 'undefined' || !_fbDbRef){ uiAlert('Firebase не инициализирован'); return; }
      if(!isOnline()){ uiAlert('Нет интернета'); return; }
      uiConfirm('Подтянуть данные с сервера?\n\nЛокальные пользователи, роли и настройки будут заменены серверными. Заказы, клиенты, события — сольются (останутся самые свежие).', 'Подтянуть', {yesLabel:'Подтянуть'}).then(function(ok){
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
            save();
            render();
          } finally {
            setTimeout(function(){ _fbApplyingRemote = false; }, 400);
          }
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
    }finally{
      setTimeout(function(){ window._zrzForcePush = false; }, 3000);
    }
  };

  /* Индикатор в настройках */
  function _zrzAugmentSettings(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_guard_block')) return;
    /* Только для настроек — ищем поле s_phone */
    if(!document.getElementById('s_phone')) return;

    var html = '<div id="zrz_guard_block" style="margin-top:14px;padding:14px;background:linear-gradient(180deg,rgba(76,175,125,0.10),rgba(76,175,125,0.04));border:1.5px solid rgba(76,175,125,0.35);border-radius:14px">';
    html += '<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#2c7a54;margin-bottom:8px">🛡 Защита базы</div>';

    var pulled = db.sync && db.sync.lastPullAt;
    var pushed = db.sync && db.sync.lastPushAt;

    if(pulled){
      html += '<div style="font-size:12px;color:var(--muted);line-height:1.5">📥 Приём: <b>'+new Date(pulled).toLocaleString('ru-RU')+'</b></div>';
    } else {
      html += '<div style="font-size:12.5px;color:#a05c26;font-weight:600;line-height:1.5">⚠ Первый приём ещё не сделан. Отправка метаданных (пользователи, роли, настройки) заблокирована, чтобы не затереть сервер.</div>';
    }
    if(pushed){
      html += '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px">📤 Отправка: <b>'+new Date(pushed).toLocaleString('ru-RU')+'</b></div>';
    }
    if(_zrzServerEmpty){
      html += '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px">Сервер при последней проверке был пуст</div>';
    }

    html += '<button type="button" class="btn btn-secondary" style="margin-top:10px;padding:10px;font-size:14px" onclick="zrzPullOnly()">📥 Только подтянуть с сервера</button>';
    html += '<button type="button" class="btn btn-secondary" style="margin-top:6px;padding:10px;font-size:14px" onclick="zrzPushNow()">📤 Отправить сейчас</button>';
    html += '</div>';

    /* Вставляем перед кнопкой «Отмена», если она есть */
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

  /* ─── CSS ─── */
  function injectCss(){
    if(document.getElementById('zrz-patch-css')) return;
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
    + 'header{padding:11px 16px !important;}'
    + 'header button{width:44px !important;height:44px !important;border-radius:14px !important;font-size:21px !important;}'
    + '.progress-wrap{height:5px !important;}'
    + '.order-num{font-size:12.5px !important;font-weight:800 !important;padding:4px 14px !important;}'
    + '.order-num-lg{font-size:24px !important;font-weight:800 !important;padding:12px 26px !important;}'
    + '.team-chip{font-size:13.5px !important;padding:9px 15px 9px 11px !important;font-weight:600 !important;}'
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
    + '@media (max-width:420px){.card{padding:18px 18px 18px 22px !important;}.modal h2{font-size:21px !important;}.btn{padding:15px 18px !important;font-size:15.5px !important;}}'
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
    try{ wrapOpenItem(); }catch(e){}
    try{ wrapCollectDraft(); }catch(e){}
    try{ wrapBuildReceipt(); }catch(e){}
    try{ injectBoltUI(); }catch(e){}
    try{ wrapOpenSettings(); }catch(e){}
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
