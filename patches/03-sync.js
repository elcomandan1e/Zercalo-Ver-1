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
