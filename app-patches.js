/* app-patches.js — загрузчик модулей «Зерцало» v6.1.1
   · Прелоадер: модули грузятся за занавесом
   · Ожидание загрузки шрифта Onest перед показом
   · Версионирование модулей — HTTP-кеш работает
*/
(function(){
  var PATCH_VERSION = '6.1.21';
  var BASE = 'https://raw.githubusercontent.com/elcomandan1e/Zercalo-Ver-1/main/patches/';

  var MODULES = [
    '01-core.js',
    '02-draw.js',
    '03-sync.js',
    '04-docs.js',
    '05-ui.js',
    '06-nav.js',
    //'07-gestures.js',
    '08-order-num.js',
    '10-statuses.js',
    '11-status-picker.js',
    '12-statuses-extra.js',
    '13-dashboard.js',
    '14-attention.js',
    '15-tests.js'
  ];

  if(window._zrzLoaderRunning) return;
  window._zrzLoaderRunning = true;

  var _preloader = null;

  function buildPreloader(){
    if(_preloader) return;
    var el = document.createElement('div');
    el.id = 'zrz-preloader';
    el.innerHTML =
      '<div class="zrz-pre-inner">'
      +   '<div class="zrz-pre-logo">'
      +     '<svg viewBox="0 0 120 120" width="72" height="72" xmlns="http://www.w3.org/2000/svg">'
      +       '<circle cx="60" cy="56" r="52" fill="#e6f1fb"/>'
      +       '<circle cx="60" cy="56" r="50" fill="none" stroke="#1e4d7b" stroke-width="5"/>'
      +       '<rect x="21" y="46.5" width="16" height="58" rx="5" fill="#bfdcf2" stroke="#1e4d7b" stroke-width="1.4" opacity="0.55"/>'
      +       '<rect x="99" y="46.5" width="16" height="58" rx="5" fill="#bfdcf2" stroke="#1e4d7b" stroke-width="1.4" opacity="0.55"/>'
      +       '<rect x="40" y="24.5" width="16" height="80" rx="5" fill="#bfdcf2" stroke="#1e4d7b" stroke-width="1.4" opacity="0.7"/>'
      +       '<rect x="80" y="24.5" width="16" height="80" rx="5" fill="#bfdcf2" stroke="#1e4d7b" stroke-width="1.4" opacity="0.7"/>'
      +       '<rect x="60" y="8.5" width="16" height="96" rx="5" fill="#bfdcf2" stroke="#1e4d7b" stroke-width="1.4"/>'
      +       '<rect x="54.5" y="2" width="4" height="104" fill="#fff" opacity="0.55"/>'
      +     '</svg>'
      +   '</div>'
      +   '<div class="zrz-pre-title">Зерцало</div>'
      +   '<div class="zrz-pre-spinner"><div class="zrz-pre-dot"></div><div class="zrz-pre-dot"></div><div class="zrz-pre-dot"></div></div>'
      + '</div>';
    document.body.appendChild(el);
    _preloader = el;
  }

  function hidePreloader(){
    if(!_preloader) return;
    _preloader.classList.add('zrz-pre-hide');
    setTimeout(function(){
      if(_preloader && _preloader.parentNode) _preloader.parentNode.removeChild(_preloader);
      _preloader = null;
    }, 350);
  }

  function injectPreloaderCss(){
    if(document.getElementById('zrz-preloader-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-preloader-css';
    st.textContent =
      '#zrz-preloader{position:fixed;inset:0;z-index:9998;background:#f6f8fc;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'transition:opacity .32s ease,visibility .32s ease;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}'
      + 'html[data-theme="dark"] #zrz-preloader{background:#141a24}'
      + '#zrz-preloader.zrz-pre-hide{opacity:0;visibility:hidden;pointer-events:none}'
      + '.zrz-pre-inner{display:flex;flex-direction:column;align-items:center;gap:14px}'
      + '.zrz-pre-logo{opacity:0;animation:zrz-pre-pop .5s cubic-bezier(.2,.85,.3,1) .05s forwards}'
      + '.zrz-pre-title{font-size:20px;font-weight:800;letter-spacing:1px;color:#1e4d7b;'
      +   'opacity:0;animation:zrz-pre-pop .5s cubic-bezier(.2,.85,.3,1) .18s forwards}'
      + 'html[data-theme="dark"] .zrz-pre-title{color:#a8c3eb}'
      + '.zrz-pre-spinner{display:flex;gap:6px;margin-top:6px;opacity:0;'
      +   'animation:zrz-pre-pop .4s ease .3s forwards}'
      + '.zrz-pre-dot{width:8px;height:8px;border-radius:50%;background:#5b7fb8;'
      +   'animation:zrz-pre-bounce 1.1s ease-in-out infinite}'
      + '.zrz-pre-dot:nth-child(2){animation-delay:.15s;background:#7ba0dd}'
      + '.zrz-pre-dot:nth-child(3){animation-delay:.3s;background:#8fbce2}'
      + '@keyframes zrz-pre-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
      + '@keyframes zrz-pre-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}'
      +   '30%{transform:translateY(-8px);opacity:1}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function showPreloaderNow(){
    injectPreloaderCss();
    if(document.body) buildPreloader();
    else {
      var iv = setInterval(function(){
        if(document.body){ clearInterval(iv); buildPreloader(); }
      }, 10);
      setTimeout(function(){ clearInterval(iv); }, 1000);
    }
  }

  var _loaded = 0;
  var _total = MODULES.length;

  function loadOne(name){
    var url = BASE + name + '?v=' + PATCH_VERSION;
    return fetch(url, {cache:'default'})
      .then(function(r){
        if(!r.ok) throw new Error('HTTP ' + r.status + ' on ' + name);
        return r.text();
      })
      .then(function(code){
        if(!code || !code.trim()) return;
        try {
          (new Function(code))();
          _loaded++;
          try { console.log('[patch] ' + name + ' — OK (' + code.length + ' bytes)'); } catch(_){}
        } catch(e){
          try { console.warn('[patch] ' + name + ' — error:', e); } catch(_){}
          if(typeof __showErr === 'function') __showErr('[patch:' + name + '] ' + (e.message || e));
        }
      })
      .catch(function(e){
        try { console.warn('[patch] ' + name + ' — fetch failed:', e); } catch(_){}
      });
  }

  /* Ждём загрузку шрифта Onest — 3 сек максимум */
  function waitForFonts(){
    return new Promise(function(resolve){
      if(!document.fonts || !document.fonts.load){ resolve(); return; }
      var done = false;
      var finish = function(){ if(!done){ done = true; resolve(); } };
      Promise.all([
        document.fonts.load('400 16px Onest'),
        document.fonts.load('700 16px Onest'),
        document.fonts.load('800 16px Onest')
      ]).then(finish).catch(finish);
      setTimeout(finish, 3000);
    });
  }

  function boot(){
    var tasks = MODULES.map(loadOne);
    Promise.all(tasks).then(function(){
      try { console.log('[app-patches] loader v' + PATCH_VERSION + ' — загружено ' + _loaded + '/' + _total); } catch(_){}
      if(typeof window._zrzPatchInit === 'function'){
        try { window._zrzPatchInit(); } catch(e){}
      }
      /* Перед скрытием ждём шрифт */
      waitForFonts().then(function(){
        setTimeout(hidePreloader, 300);
      });
    }).catch(function(){
      setTimeout(hidePreloader, 200);
    });
    setTimeout(hidePreloader, 5000);
  }

  showPreloaderNow();

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }

  window.zrzReloadPatches = function(){ MODULES.forEach(loadOne); };
})();
/* ============ ZERZALO · SYNC v2 · Часть 2 — История базы ============ */
(function(){
  if(window._zrz03SyncV2P2) return;
  window._zrz03SyncV2P2 = true;

  var _autoSnapshotDoneFor = '';

  /* ---------- Работа с backup-ref ---------- */

  function _backupRef(){
    try {
      if(!window.firebase || typeof window.firebase.database !== 'function') return null;
      return window.firebase.database().ref('zerzalo_backups');
    } catch(e){ return null; }
  }

  function _fmtNum(n){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

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

  /* ---------- Ручной снапшот ---------- */

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

  /* ---------- Откат к снапшоту ---------- */

  function _restoreSnapshot(key){
    var b = _backupRef();
    if(!b) return Promise.reject(new Error('no backup ref'));
    return b.child(key).once('value').then(function(snap){
      var payload = snap.val();
      if(!payload) throw new Error('снапшот пуст');

      var main = window._fbDbRef;
      if(!main) throw new Error('main ref');

      /* Снимаем снапшот текущего состояния перед откатом */
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
        /* Пишем снапшот в основную ветку */
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
          /* Локально применяем */
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

  /* ---------- Экран «История базы» ---------- */

  function _openHistoryScreen(){
    var b = _backupRef();
    if(!b){
      if(typeof uiAlert === 'function') uiAlert('Firebase не инициализирован');
      return;
    }

    b.once('value').then(function(snap){
      var all = snap.val() || {};
      var keys = Object.keys(all).sort().reverse();  /* свежие сверху */

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

  /* ---------- Автоснапшот в 23:00 ---------- */

  function _checkAutoSnapshot(){
    try {
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var key = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

      if(h !== 23 || m > 30) return;      /* только в 23:00–23:30 */
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
        if(hasToday){
          /* Уже делали снапшот за последние 20 часов — пропускаем */
          return;
        }
        _makeSnapshotNow().catch(function(){});
      }).catch(function(){});
    } catch(e){}
  }

  function _initAuto(){
    setTimeout(_checkAutoSnapshot, 5000);
    setInterval(_checkAutoSnapshot, 5 * 60 * 1000);
  }

  /* ---------- Глобальные команды для onclick ---------- */

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
              + '⚠ Текущее состояние сохранится как отдельный снапшот (можно будет вернуться).';

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

  /* ---------- Кнопка в настройках синхронизации ---------- */

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
    /* Ищем любую кнопку "Закрыть" чтобы вставить перед ней */
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

  /* ---------- Запуск ---------- */

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
