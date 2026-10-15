/* patches/03-sync.js — синхронизация v2 (защита базы)
   Часть 1: Ур.1 — защита от пустоты; Ур.2 — снапшоты
   Часть 2: Экран «История базы» + автоснапшот в 23:00
   Часть 3: Watchdog входа + overlay загрузки
*/
(function(){
  if(window._zrz03SyncV2) return;
  window._zrz03SyncV2 = true;

  var SNAPSHOT_MIN_INTERVAL = 15 * 60 * 1000;
  var SNAPSHOT_KEEP_LAST    = 30;
  var _lastSnapshotAt = 0;
  var _pushBlockedLogged = false;
  var _startupGuardDone = false;

  function _count(arr){ return (Array.isArray(arr) ? arr.length : 0); }

  function _busyCount(data){
    if(!data) return 0;
    return _count(data.orders) + _count(data.events) + _count(data.clients)
         + _count(data.items) + _count(data.addresses) + _count(data.routes);
  }

  function _busyDataEmpty(){
    try { return _busyCount(window.db || {}) === 0; }
    catch(e){ return false; }
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

  function wrapFbPushAll(){
    if(window._zrz03PushAllWrapped) return;
    if(typeof window.fbPushAll !== 'function') return;
    var orig = window.fbPushAll;

    window.fbPushAll = function(){
      try {
        var ref = window._fbDbRef;
        if(!ref) return orig.apply(this, arguments);

        if(!_busyDataEmpty()){
          return _maybeSnapshot().then(function(){
            return orig.apply(null, arguments);
          });
        }

        return ref.once('value').then(function(snap){
          var remote = snap.val();
          var cloudN = _busyCount(remote);

          if(cloudN > 0){
            _logOnce('push заблокирован: локально пусто, в облаке ' + cloudN);
            _applyRemote(remote);
            return Promise.resolve();
          }

          return orig.apply(null, arguments);
        }).catch(function(e){
          try{ console.warn('[03-sync] guard err', e); }catch(_){}
          return Promise.resolve();
        });
      } catch(e){
        try{ console.warn('[03-sync] wrapFbPushAll err', e); }catch(_){}
        return Promise.resolve();
      }
    };
    window._zrz03PushAllWrapped = true;
  }

  function wrapSchedulePush(){
    if(window._zrz03SchedulePushWrapped) return;
    if(typeof window.schedulePush !== 'function') return;
    var orig = window.schedulePush;

    window.schedulePush = function(){
      try {
        if(_busyDataEmpty() && !window._zrzForcePush){
          return;
        }
      } catch(e){}
      return orig.apply(this, arguments);
    };
    window._zrz03SchedulePushWrapped = true;
  }

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

  function _startupGuard(){
  if(_startupGuardDone) return;
  try {
    if(!window.db || !window.db.currentUserId) return;
    _startupGuardDone = true;
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
/* patches/03-sync.js — Часть 2/3 */
/* ============ ZERZALO · SYNC v2 · Часть 2 — История базы ============ */
(function(){
  if(window._zrz03SyncV2P2) return;
  window._zrz03SyncV2P2 = true;

  var _autoSnapshotDoneFor = '';

  function _backupRef(){
    try {
      if(!window.firebase || typeof window.firebase.database !== 'function') return null;
      return window.firebase.database().ref('zerzalo_backups');
    } catch(e){ return null; }
  }

  function _fmtDate(ms){
    try {
      var d = new Date(ms);
      return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch(e){ return '—'; }
  }

  function _snapshotCount(b){
    return (Array.isArray(b.orders)?b.orders.length:0)
         + (Array.isArray(b.events)?b.events.length:0)
         + (Array.isArray(b.clients)?b.clients.length:0);
  }

  function _makeSnapshotNow(){
    var ref = window._fbDbRef;
    if(!ref){
      if(typeof uiAlert === 'function') uiAlert('Firebase не инициализирован');
      return Promise.reject(new Error('no ref'));
    }
    var b = _backupRef();
    if(!b){
      if(typeof uiAlert === 'function') uiAlert('Нет доступа к zerzalo_backups');
      return Promise.reject(new Error('no backup ref'));
    }

    return ref.once('value').then(function(snap){
      var cur = snap.val();
      if(!cur){
        if(typeof uiAlert === 'function') uiAlert('Нечего сохранять — в облаке пусто');
        return;
      }
      var key = 'z' + Date.now();
      var payload = {
        createdAt: Date.now(),
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
      return b.child(key).set(payload).then(function(){
        return _prune(b).then(function(){
          if(typeof uiAlert === 'function') uiAlert('✔ Снапшот сохранён: ' + _fmtDate(Date.now()));
          return key;
        });
      });
    }).catch(function(e){
      if(typeof uiAlert === 'function') uiAlert('Ошибка снапшота: ' + ((e && e.message) || e));
      throw e;
    });
  }

  function _prune(b){
    return b.once('value').then(function(snap){
      var all = snap.val() || {};
      var keys = Object.keys(all).sort();
      if(keys.length <= 30) return;
      var toDelete = keys.slice(0, keys.length - 30);
      return Promise.all(toDelete.map(function(k){ return b.child(k).remove().catch(function(){}); }));
    }).catch(function(){});
  }

  function _restoreSnapshot(key){
    var b = _backupRef();
    if(!b) return Promise.reject(new Error('no backup ref'));
    return b.child(key).once('value').then(function(snap){
      var payload = snap.val();
      if(!payload) throw new Error('снапшот пуст');

      var main = window._fbDbRef;
      if(!main) throw new Error('main ref');

      var beforeKey = 'z' + Date.now();
      return main.once('value').then(function(cur){
        var curV = cur.val();
        if(curV && _snapshotCount(curV) > 0){
          return b.child(beforeKey).set({
            createdAt: Date.now(),
            schemaVersion: curV.schemaVersion || 0,
            orders: curV.orders || [], events: curV.events || [], clients: curV.clients || [],
            items: curV.items || [], addresses: curV.addresses || [], routes: curV.routes || [],
            contractors: curV.contractors || [], users: curV.users || [],
            notifications: curV.notifications || [], roles: curV.roles || null,
            settings: curV.settings || {},
            nextOrder: curV.nextOrder || 1, nextItem: curV.nextItem || 1, nextUser: curV.nextUser || 1,
            nextClient: curV.nextClient || 1, nextAddress: curV.nextAddress || 1, nextEvent: curV.nextEvent || 1,
            nextContractor: curV.nextContractor || 1, nextRoute: curV.nextRoute || 1, nextNotification: curV.nextNotification || 1
          }).catch(function(){});
        }
      }).then(function(){
        var restore = {
          schemaVersion: payload.schemaVersion || 17,
          exportedAt: Date.now(),
          deviceId: (window.db && window.db.sync && window.db.sync.deviceId) || '',
          orders: payload.orders || [],
          items: payload.items || [],
          users: payload.users || [],
          clients: payload.clients || [],
          addresses: payload.addresses || [],
          events: payload.events || [],
          contractors: payload.contractors || [],
          routes: payload.routes || [],
          notifications: payload.notifications || [],
          roles: payload.roles || null,
          settings: payload.settings || {},
          trash: [],
          nextOrder: payload.nextOrder || 1,
          nextItem: payload.nextItem || 1,
          nextUser: payload.nextUser || 1,
          nextClient: payload.nextClient || 1,
          nextAddress: payload.nextAddress || 1,
          nextEvent: payload.nextEvent || 1,
          nextContractor: payload.nextContractor || 1,
          nextRoute: payload.nextRoute || 1,
          nextNotification: payload.nextNotification || 1
        };
        window._fbLastPushedAt = Date.now();
        return main.set(restore).then(function(){
          if(typeof window.applySyncPayload === 'function'){
            try {
              window._fbApplyingRemote = true;
              window.applySyncPayload(restore);
            } finally {
              setTimeout(function(){ window._fbApplyingRemote = false; }, 300);
            }
          }
          if(window.db && window.db.sync) window.db.sync.lastPullAt = Date.now();
          if(typeof window.save === 'function') window.save();
          if(typeof window.render === 'function'){ try{ window.render(); }catch(_){} }
        });
      });
    });
  }

  function _openHistoryScreen(){
    var b = _backupRef();
    if(!b){
      if(typeof uiAlert === 'function') uiAlert('Firebase не инициализирован');
      return;
    }

    b.once('value').then(function(snap){
      var all = snap.val() || {};
      var keys = Object.keys(all).sort().reverse();

      var html = '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' История базы</h2>';
      html += '<div class="draft-notice">Снапшоты автоматически сохраняются перед важными изменениями. Здесь можно откатить базу к любой из последних 30 точек.</div>';
      html += '<button type="button" class="btn btn-primary" style="margin-top:12px" onclick="zrzSyncMakeSnapshotNow()">📸 Сделать снапшот сейчас</button>';
      html += '<button type="button" class="btn btn-secondary" onclick="zrzSyncOpenFirebaseBackups()">🔗 Открыть в Firebase Console</button>';

      if(!keys.length){
        html += '<div class="empty" style="padding:30px;font-size:13px">Снапшотов пока нет</div>';
      } else {
        html += '<div class="section-title" style="margin-top:16px">Снапшоты (' + keys.length + ')</div>';
        html += '<div style="max-height:52vh;overflow-y:auto;margin-top:8px">';
        keys.forEach(function(k){
          var it = all[k] || {};
          var created = Number(it.createdAt) || 0;
          var nOrders = (it.orders || []).length;
          var nEvents = (it.events || []).length;
          var nClients = (it.clients || []).length;
          var nItems = (it.items || []).length;
          html += '<div class="card no-tap" style="padding:12px 16px 12px 20px;margin-bottom:8px">';
          html +=   '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">';
          html +=     '<div style="flex:1;min-width:0">';
          html +=       '<div style="font-weight:700;font-size:14px;color:var(--text)">' + _fmtDate(created) + '</div>';
          html +=       '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5">Заказов: ' + nOrders + ' · Позиций: ' + nItems + ' · Событий: ' + nEvents + ' · Клиентов: ' + nClients + '</div>';
          html +=     '</div>';
          html +=     '<button type="button" class="chip" style="padding:7px 12px;font-size:12px;background:var(--accent-soft);color:var(--accent-deep);white-space:nowrap" onclick="zrzSyncRestoreSnapshot(\'' + k + '\')">↩ Откатить</button>';
          html +=   '</div>';
          html += '</div>';
        });
        html += '</div>';
      }

      html += '<button type="button" class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';
      if(typeof showModal === 'function') showModal(html);
    }).catch(function(e){
      if(typeof uiAlert === 'function') uiAlert('Ошибка чтения снапшотов: ' + ((e && e.message) || e));
    });
  }

  function _checkAutoSnapshot(){
    try {
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var key = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

      if(h !== 23 || m > 30) return;
      if(_autoSnapshotDoneFor === key) return;
      _autoSnapshotDoneFor = key;

      var b = _backupRef();
      if(!b) return;
      b.once('value').then(function(snap){
        var all = snap.val() || {};
        var hasToday = Object.keys(all).some(function(k){
          var it = all[k];
          return it && Number(it.createdAt) > (Date.now() - 20 * 3600 * 1000);
        });
        if(hasToday) return;
        _makeSnapshotNow().catch(function(){});
      }).catch(function(){});
    } catch(e){}
  }

  function _initAuto(){
    setTimeout(_checkAutoSnapshot, 5000);
    setInterval(_checkAutoSnapshot, 5 * 60 * 1000);
  }

  window.zrzSyncMakeSnapshotNow = function(){
    _makeSnapshotNow().then(function(){
      setTimeout(_openHistoryScreen, 200);
    }).catch(function(){});
  };

  window.zrzSyncRestoreSnapshot = function(key){
    var b = _backupRef();
    if(!b) return;
    b.child(key).once('value').then(function(snap){
      var it = snap.val() || {};
      var nOrders = (it.orders || []).length;
      var nEvents = (it.events || []).length;
      var nClients = (it.clients || []).length;
      var created = Number(it.createdAt) || 0;

      var msg = 'Откатить базу к состоянию от ' + _fmtDate(created) + '?\n\n'
              + 'В снапшоте: заказов ' + nOrders + ', событий ' + nEvents + ', клиентов ' + nClients + '.\n\n'
              + '⚠ Текущее состояние сохранится как отдельный снапшот.';

      if(typeof uiConfirm !== 'function'){
        if(confirm(msg)) doRestore();
        return;
      }
      uiConfirm(msg, 'Откат базы', { danger: true, yesLabel: 'Откатить', noLabel: 'Отмена' })
        .then(function(ok){ if(ok) doRestore(); });

      function doRestore(){
        if(typeof uiAlert === 'function') uiAlert('Откатываем…');
        _restoreSnapshot(key).then(function(){
          if(typeof uiAlert === 'function') uiAlert('✔ База откатана к ' + _fmtDate(created));
        }).catch(function(e){
          if(typeof uiAlert === 'function') uiAlert('Ошибка: ' + ((e && e.message) || e));
        });
      }
    });
  };

  window.zrzSyncOpenFirebaseBackups = function(){
    try {
      var cfg = window.firebaseConfig || {};
      var pid = cfg.projectId || 'zercalo-673ed';
      var url = 'https://console.firebase.google.com/project/' + pid + '/database/' + pid + '-default-rtdb/data/~2Fzerzalo_backups';
      window.open(url, '_blank');
    } catch(e){}
  };

  window.zrzSyncOpenHistory = function(){ _openHistoryScreen(); };

  function _patchSyncPanel(){
    if(window._zrzSyncPanelPatched) return;
    if(typeof window.openSyncPanel !== 'function') return;
    var orig = window.openSyncPanel;
    window.openSyncPanel = function(){
      var r = orig.apply(this, arguments);
      setTimeout(_augmentSyncPanel, 120);
      return r;
    };
    window._zrzSyncPanelPatched = true;
  }

  function _augmentSyncPanel(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_history_btn')) return;
    var btns = modal.querySelectorAll('.btn');
    var closeBtn = null;
    for(var i = 0; i < btns.length; i++){
      var t = (btns[i].textContent || '').trim();
      if(t === 'Закрыть' || t === 'Отмена'){ closeBtn = btns[i]; break; }
    }
    if(!closeBtn) return;
    var btnHtml = '<button type="button" id="zrz_history_btn" class="btn btn-secondary" onclick="zrzSyncOpenHistory()">📜 История базы (снапшоты)</button>';
    closeBtn.insertAdjacentHTML('beforebegin', btnHtml);
  }

  function apply(){
    try{ _patchSyncPanel(); }catch(e){}
    try{ _augmentSyncPanel(); }catch(e){}
  }

  apply();
  setTimeout(apply, 800);
  setTimeout(apply, 2000);

  _initAuto();

  var _iv = setInterval(function(){
    try{ _patchSyncPanel(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[03-sync v2 p2] История базы + автоснапшот активны'); }catch(_){}
})();
/* patches/03-sync.js — Часть 3/3 */
/* ============ ZERZALO · SYNC v2 · Часть 3 — Watchdog входа ============ */
(function(){
  if(window._zrz03SyncV2P3) return;
  window._zrz03SyncV2P3 = true;

  var LOAD_TIMEOUT = 8000;
  var _initialLoadDone = false;

  function _busyCount(d){
    if(!d) return 0;
    return (d.orders||[]).length + (d.events||[]).length + (d.clients||[]).length
         + (d.items||[]).length + (d.addresses||[]).length + (d.routes||[]).length;
  }
  function _busyEmpty(){
    try { return _busyCount(window.db || {}) === 0; } catch(e){ return false; }
  }

  function _overlayCss(){
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
      '.zrz-load-title{font-size:18px;font-weight:700;color:var(--text,#2a3547);margin-bottom:8px}',
      '.zrz-load-status{font-size:14px;color:var(--muted,#8894a9);line-height:1.5;word-break:break-word}',
      '@keyframes zrzLoadSpin{to{transform:rotate(360deg)}}'
    ].join('');
    document.head.appendChild(st);
  }

  function _showOverlay(){
    if(document.getElementById('zrz-load-overlay')) return;
    var el = document.createElement('div');
    el.id = 'zrz-load-overlay';
    el.innerHTML = '<div class="zrz-load-spin"></div>'
      + '<div class="zrz-load-box">'
      +   '<div class="zrz-load-title">Загружаем базу</div>'
      +   '<div class="zrz-load-status" id="zrz-load-status">Подключаемся к облаку…</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function _setStatus(t){
    var el = document.getElementById('zrz-load-status');
    if(el) el.textContent = t;
  }

  function _hideOverlay(){
    var el = document.getElementById('zrz-load-overlay');
    if(!el) return;
    el.classList.add('zrz-load-hide');
    setTimeout(function(){ try{ el.remove(); }catch(_){} }, 320);
  }

  function _pullWithOverlay(){
    return new Promise(function(resolve){
      var ref = window._fbDbRef;
      if(!ref){
        _setStatus('Работаем локально');
        setTimeout(function(){ _hideOverlay(); resolve(); }, 500);
        return;
      }
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        _setStatus('Нет интернета, работаем офлайн');
        setTimeout(function(){ _hideOverlay(); resolve(); }, 700);
        return;
      }

      var done = false;
      function finish(){ if(done) return; done = true; _hideOverlay(); resolve(); }

      var timeoutId = setTimeout(function(){
        if(done) return;
        _setStatus('Медленная связь, продолжаем офлайн');
        setTimeout(finish, 600);
      }, LOAD_TIMEOUT);

      ref.once('value').then(function(snap){
        clearTimeout(timeoutId);
        if(done) return;
        var remote = snap.val();
        if(!remote){
          _setStatus('Начинаем с пустой базы');
          setTimeout(finish, 500);
          return;
        }
        var nO = (remote.orders || []).length;
        var nE = (remote.events || []).length;
        var nC = (remote.clients || []).length;
        _setStatus('Заказов: ' + nO + ' · Событий: ' + nE + ' · Клиентов: ' + nC);

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
        setTimeout(function(){
          if(typeof window.render === 'function'){ try{ window.render(); }catch(_){} }
          finish();
        }, 500);
      }).catch(function(){
        clearTimeout(timeoutId);
        if(done) return;
        _setStatus('Нет связи с облаком');
        setTimeout(finish, 600);
      });
    });
  }

  function _check(){
    if(_initialLoadDone) return;
    if(!window.db || !window.db.currentUserId) return;
    if(!_busyEmpty()){
      _initialLoadDone = true;
      return;
    }
    _initialLoadDone = true;
    _overlayCss();
    setTimeout(function(){
      _showOverlay();
      _pullWithOverlay();
    }, 100);
  }

  try {
    var obs = new MutationObserver(function(){
      if(!document.getElementById('authScreen') && window.db && window.db.currentUserId){
        obs.disconnect();
        setTimeout(_check, 200);
      }
    });
    obs.observe(document.body, { childList: true });
  } catch(e){}

  setInterval(_check, 400);

  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('button');
    if(!b) return;
    var t = (b.textContent || '').trim();
    if(t.indexOf('Выйти') >= 0){
      setTimeout(function(){ _initialLoadDone = false; }, 800);
    }
  }, true);

  try{ console.log('[03-sync v2 p3] watchdog входа активен'); }catch(_){}
})();
