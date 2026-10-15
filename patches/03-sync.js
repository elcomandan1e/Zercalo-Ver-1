/* patches/03-sync.js — синхронизация v2 (защита базы)
   Часть 1: Ур.1 — защита от пустоты; Ур.2 — снапшоты
   Часть 2: Экран «История базы» + автоснапшот в 23:00
*/
(function(){
  if(window._zrz03SyncV2) return;
  window._zrz03SyncV2 = true;

  var SNAPSHOT_MIN_INTERVAL = 15 * 60 * 1000;  /* 15 мин */
  var SNAPSHOT_KEEP_LAST    = 30;
  var _lastSnapshotAt = 0;
  var _pushBlockedLogged = false;
  var _startupGuardDone = false;

  /* ---------- Хелперы ---------- */

  function _count(arr){ return (Array.isArray(arr) ? arr.length : 0); }

  function _busyCount(data){
    if(!data) return 0;
    return _count(data.orders) + _count(data.events) + _count(data.clients)
         + _count(data.items) + _count(data.addresses) + _count(data.routes);
  }

  function _busyDataEmpty(){
    try {
      var d = window.db || {};
      return _busyCount(d) === 0;
    } catch(e){ return false; }
  }

  function _logOnce(msg){
    if(_pushBlockedLogged) return;
    _pushBlockedLogged = true;
    try{ console.warn('[03-sync] ' + msg); }catch(_){}
    try{
      if(typeof window.__showErr === 'function') window.__showErr('[03-sync] ' + msg);
    }catch(_){}
  }

  function _applyRemote(remote){
    try {
      if(typeof window.applySyncPayload !== 'function') return false;
      window._fbApplyingRemote = true;
      try {
        window.applySyncPayload(remote);
      } finally {
        setTimeout(function(){ window._fbApplyingRemote = false; }, 300);
      }
      if(window.db && window.db.sync) window.db.sync.lastPullAt = Date.now();
      if(typeof window.save === 'function') window.save();
      if(typeof window.render === 'function'){ try{ window.render(); }catch(_){} }
      return true;
    } catch(e){
      try{ console.warn('[03-sync] applyRemote err', e); }catch(_){}
      return false;
    }
  }

  /* ---------- Ур.2: снапшоты ---------- */

  function _getBackupRef(){
    try {
      if(!window._fbDbRef) return null;
      if(!window.firebase || typeof window.firebase.database !== 'function') return null;
      return window.firebase.database().ref('zerzalo_backups');
    } catch(e){ return null; }
  }

  function _pruneSnapshots(backupRef){
    if(!backupRef) return Promise.resolve();
    return backupRef.once('value').then(function(snap){
      var all = snap.val() || {};
      var keys = Object.keys(all).sort();
      if(keys.length <= SNAPSHOT_KEEP_LAST) return;
      var cut = keys.length - SNAPSHOT_KEEP_LAST;
      var toDelete = keys.slice(0, cut);
      return Promise.all(toDelete.map(function(k){
        return backupRef.child(k).remove().catch(function(){});
      }));
    }).catch(function(){});
  }

  function _maybeSnapshot(){
    try {
      var now = Date.now();
      if(now - _lastSnapshotAt < SNAPSHOT_MIN_INTERVAL){
        return Promise.resolve();
      }
      var mainRef = window._fbDbRef;
      if(!mainRef) return Promise.resolve();
      var backupRef = _getBackupRef();
      if(!backupRef) return Promise.resolve();

      _lastSnapshotAt = now;

      return mainRef.once('value').then(function(snap){
        var cur = snap.val();
        if(!cur) return;
        if(_busyCount(cur) === 0) return;
        var key = 'z' + now;
        var payload = {
          createdAt: now,
          schemaVersion: cur.schemaVersion || 0,
          orders: cur.orders || [],
          events: cur.events || [],
          clients: cur.clients || [],
          items: cur.items || [],
          addresses: cur.addresses || [],
          routes: cur.routes || [],
          contractors: cur.contractors || [],
          users: cur.users || [],
          notifications: cur.notifications || [],
          roles: cur.roles || null,
          settings: cur.settings || {},
          nextOrder: cur.nextOrder || 1,
          nextItem: cur.nextItem || 1,
          nextUser: cur.nextUser || 1,
          nextClient: cur.nextClient || 1,
          nextAddress: cur.nextAddress || 1,
          nextEvent: cur.nextEvent || 1,
          nextContractor: cur.nextContractor || 1,
          nextRoute: cur.nextRoute || 1,
          nextNotification: cur.nextNotification || 1
        };
        return backupRef.child(key).set(payload).then(function(){
          try{ console.log('[03-sync] snapshot ' + key); }catch(_){}
          return _pruneSnapshots(backupRef);
        });
      }).catch(function(e){
        try{ console.warn('[03-sync] snapshot err', e); }catch(_){}
      });
    } catch(e){
      return Promise.resolve();
    }
  }

  /* ---------- Ур.1: обёртка fbPushAll ---------- */

  function wrapFbPushAll(){
    if(window._zrz03PushAllWrapped) return;
    if(typeof window.fbPushAll !== 'function') return;
    var orig = window.fbPushAll;

    window.fbPushAll = function(){
      try {
        var ref = window._fbDbRef;
        if(!ref) return orig.apply(this, arguments);

        /* Локально есть данные — можно пушить, но сначала снапшот */
        if(!_busyDataEmpty()){
          return _maybeSnapshot().then(function(){
            return orig.apply(null, arguments);
          });
        }

        /* Локально пусто → проверяем облако */
        return ref.once('value').then(function(snap){
          var remote = snap.val();
          var cloudN = _busyCount(remote);

          if(cloudN > 0){
            _logOnce('push заблокирован: локально пусто, в облаке ' + cloudN);
            _applyRemote(remote);
            return Promise.resolve();
          }

          /* Облако тоже пусто — можно пушить (первый запуск) */
          return orig.apply(null, arguments);
        }).catch(function(e){
          try{ console.warn('[03-sync] guard err', e); }catch(_){}
          /* При ошибке проверки — не пушим */
          return Promise.resolve();
        });
      } catch(e){
        try{ console.warn('[03-sync] wrapFbPushAll err', e); }catch(_){}
        return Promise.resolve();
      }
    };
    window._zrz03PushAllWrapped = true;
  }

  /* ---------- Ур.1: обёртка schedulePush ---------- */

  function wrapSchedulePush(){
    if(window._zrz03SchedulePushWrapped) return;
    if(typeof window.schedulePush !== 'function') return;
    var orig = window.schedulePush;

    window.schedulePush = function(){
      try {
        if(_busyDataEmpty() && !window._zrzForcePush){
          /* Локально пусто — таймер не ставим.
             Данные придут при следующем pull из облака. */
          return;
        }
      } catch(e){}
      return orig.apply(this, arguments);
    };
    window._zrz03SchedulePushWrapped = true;
  }

  /* ---------- Обёртка syncNow (ручная команда — разрешаем всегда) ---------- */

  function wrapSyncNow(){
    if(window._zrz03SyncNowWrapped) return;
    if(typeof window.syncNow !== 'function') return;
    var orig = window.syncNow;

    window.syncNow = function(){
      try {
        window._zrzForcePush = true;
        setTimeout(function(){ window._zrzForcePush = false; }, 3000);
      } catch(e){}
      return orig.apply(this, arguments);
    };
    window._zrz03SyncNowWrapped = true;
  }

  /* ---------- Проверка при старте ---------- */

  function _startupGuard(){
    if(_startupGuardDone) return;
    _startupGuardDone = true;
    try {
      var ref = window._fbDbRef;
      if(!ref) return;
      if(!_busyDataEmpty()) return;

      ref.once('value').then(function(snap){
        var remote = snap.val();
        if(!remote) return;
        var cnt = _busyCount(remote);
        if(cnt === 0) return;
        try{ console.log('[03-sync] startup: локально пусто, в облаке ' + cnt + ' → pull'); }catch(_){}
        _applyRemote(remote);
      }).catch(function(){});
    } catch(e){}
  }

  /* ---------- Запуск ---------- */

  function apply(){
    try{ wrapFbPushAll(); }catch(e){}
    try{ wrapSchedulePush(); }catch(e){}
    try{ wrapSyncNow(); }catch(e){}
  }

  apply();
  setTimeout(apply, 800);
  setTimeout(apply, 2000);

  setTimeout(_startupGuard, 2500);

  var _iv = setInterval(function(){
    try{ wrapFbPushAll(); }catch(e){}
    try{ wrapSchedulePush(); }catch(e){}
    try{ wrapSyncNow(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[03-sync v2] защита от пустоты + снапшоты активны'); }catch(_){}
})();
/* Часть 2 — История базы — будет дописана ниже */
/* ============ ZERZALO · SYNC v2 · Часть 3 — Экран входа с загрузкой ============ */
(function(){
  if(window._zrz03SyncV2P3) return;
  window._zrz03SyncV2P3 = true;

  var LOAD_TIMEOUT = 8000; /* макс 8 сек ждём облако */

  /* ---------- Хелперы ---------- */

  function _busyCount(data){
    if(!data) return 0;
    return (Array.isArray(data.orders)?data.orders.length:0)
         + (Array.isArray(data.events)?data.events.length:0)
         + (Array.isArray(data.clients)?data.clients.length:0)
         + (Array.isArray(data.items)?data.items.length:0)
         + (Array.isArray(data.addresses)?data.addresses.length:0)
         + (Array.isArray(data.routes)?data.routes.length:0);
  }

  function _busyDataEmpty(){
    try { return _busyCount(window.db || {}) === 0; }
    catch(e){ return false; }
  }

  /* ---------- Overlay загрузки ---------- */

  function _showLoadOverlay(){
    if(document.getElementById('zrz-load-overlay')) return;
    var el = document.createElement('div');
    el.id = 'zrz-load-overlay';
    el.setAttribute('data-zrz', 'load');
    el.innerHTML = ''
      + '<div class="zrz-load-spin"></div>'
      + '<div class="zrz-load-box">'
      +   '<div class="zrz-load-title">Загружаем базу</div>'
      +   '<div class="zrz-load-status" id="zrz-load-status">Подключаемся к облаку…</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function _setLoadStatus(text){
    var el = document.getElementById('zrz-load-status');
    if(el) el.textContent = text;
  }

  function _hideLoadOverlay(){
    var el = document.getElementById('zrz-load-overlay');
    if(!el) return;
    el.classList.add('zrz-load-hide');
    setTimeout(function(){ try{ el.remove(); }catch(_){} }, 320);
  }

  /* ---------- CSS ---------- */

  function _injectCss(){
    if(document.getElementById('zrz-load-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-load-css';
    st.textContent = [
      '#zrz-load-overlay{position:fixed;inset:0;z-index:950;',
        'background:var(--bg-1,#f6f8fc);',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'gap:22px;padding:24px;font-family:Onest,system-ui,-apple-system,sans-serif;',
        'opacity:1;transition:opacity .3s ease;',
        '-webkit-tap-highlight-color:transparent;user-select:none}',
      '#zrz-load-overlay.zrz-load-hide{opacity:0}',
      '.zrz-load-spin{width:62px;height:62px;border-radius:50%;',
        'border:4px solid var(--accent-line,#d6e2f3);',
        'border-top-color:var(--accent,#5b7fb8);',
        'animation:zrzLoadSpin .9s linear infinite;flex-shrink:0}',
      '.zrz-load-box{text-align:center;max-width:340px}',
      '.zrz-load-title{font-size:18px;font-weight:700;color:var(--text,#2a3547);margin-bottom:8px;letter-spacing:-0.01em}',
      '.zrz-load-status{font-size:14px;color:var(--muted,#8894a9);line-height:1.5;word-break:break-word}',
      '@keyframes zrzLoadSpin{to{transform:rotate(360deg)}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- Pull с overlay ---------- */

  function _pullWithOverlay(){
    return new Promise(function(resolve){
      var ref = window._fbDbRef;
      if(!ref){
        _setLoadStatus('Работаем локально');
        setTimeout(function(){ _hideLoadOverlay(); resolve(); }, 600);
        return;
      }
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        _setLoadStatus('Нет интернета, работаем офлайн');
        setTimeout(function(){ _hideLoadOverlay(); resolve(); }, 800);
        return;
      }

      var done = false;
      function finish(){
        if(done) return;
        done = true;
        _hideLoadOverlay();
        resolve();
      }

      var timeoutId = setTimeout(function(){
        if(done) return;
        _setLoadStatus('Медленная связь, продолжаем в офлайне');
        setTimeout(finish, 700);
      }, LOAD_TIMEOUT);

      ref.once('value').then(function(snap){
        clearTimeout(timeoutId);
        if(done) return;
        var remote = snap.val();
        if(!remote){
          _setLoadStatus('Начинаем с пустой базы');
          setTimeout(finish, 500);
          return;
        }
        var nO = (remote.orders || []).length;
        var nE = (remote.events || []).length;
        var nC = (remote.clients || []).length;
        _setLoadStatus('Заказов: ' + nO + ' · Событий: ' + nE + ' · Клиентов: ' + nC);

        if(typeof window.applySyncPayload === 'function'){
          try {
            window._fbApplyingRemote = true;
            window.applySyncPayload(remote);
          } finally {
            setTimeout(function(){ window._fbApplyingRemote = false; }, 300);
          }
          if(window.db && window.db.sync) window.db.sync.lastPullAt = Date.now();
          if(typeof window.save === 'function') window.save();
        }
        setTimeout(finish, 700);
      }).catch(function(e){
        clearTimeout(timeoutId);
        if(done) return;
        _setLoadStatus('Нет связи с облаком');
        setTimeout(finish, 700);
      });
    });
  }

  /* ---------- Обёртка login() ---------- */

  function _wrapLogin(){
    if(window._zrz03LoginWrapped) return;
    if(typeof window.login !== 'function') return;
    var orig = window.login;

    window.login = async function(userId, pin){
      var r = await orig.apply(this, arguments);
      if(r && r.ok){
        var needLoad = _busyDataEmpty();
        if(needLoad){
          _injectCss();
          setTimeout(function(){
            _showLoadOverlay();
            _pullWithOverlay().then(function(){
              if(typeof window.render === 'function'){
                try{ window.render(); }catch(_){}
              }
            });
          }, 80);
        } else {
          /* Данные локально есть — пускаем сразу, pull в фоне */
          if(typeof window.schedulePull === 'function'){
            try{ window.schedulePull(); }catch(_){}
          }
        }
      }
      return r;
    };
    window._zrz03LoginWrapped = true;
  }

  /* ---------- Запуск ---------- */

  function apply(){
    try{ _injectCss(); }catch(e){}
    try{ _wrapLogin(); }catch(e){}
  }

  apply();
  setTimeout(apply, 800);
  setTimeout(apply, 2000);

  var _iv = setInterval(function(){ try{ _wrapLogin(); }catch(e){} }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[03-sync v2 p3] экран загрузки при входе активен'); }catch(_){}
})();
