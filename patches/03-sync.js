/* patches/03-sync.js — синхронизация и защита базы
   · Защита от затирания: до первого pull push НЕ отправляет
     users/roles/settings
   · Первый pull заменяет их серверными
   · Кнопки zrzPullOnly() и zrzPushNow() — вручную
   · Ре-подписка .on('value') с обёрткой защищённого set
   · Блок «🛡 Защита базы» в Настройках
   · Подпись разработчика в Настройках
*/
(function(){
  if(window._zrz03Sync) return;
  window._zrz03Sync = true;

  /* ---------- Состояние модуля ---------- */

  var _firstPullDone = false;
  var _serverEmpty = false;
  var _startTime = Date.now();

  function getRef(){
    try { return window._fbDbRef || null; } catch(e){ return null; }
  }
  function getLastPushed(){
    try { return Number(window._fbLastPushedAt) || 0; } catch(e){ return 0; }
  }
  function setLastPushed(t){
    try { window._fbLastPushedAt = t; } catch(e){}
  }
  function getApplyingRemote(){
    try { return !!window._fbApplyingRemote; } catch(e){ return false; }
  }
  function setApplyingRemote(v){
    try { window._fbApplyingRemote = v; } catch(e){}
  }

  /* ---------- Правила защиты ---------- */

  function guardBlock(){
    if(window._zrzForcePush) return false;
    if(_serverEmpty) return false;
    if(!window.db || !db.sync) return true;
    if(db.sync.lastPullAt){
      if(window._zrzPushUntil && Date.now() < window._zrzPushUntil) return true;
      return false;
    }
    if(Date.now() - _startTime > 60000) return false;
    return true;
  }

  function safePayload(data){
    if(!data || typeof data !== 'object') return data;
    var safe = {};
    for(var k in data){
      if(!Object.prototype.hasOwnProperty.call(data, k)) continue;
      if(k === 'users' || k === 'roles' || k === 'settings') continue;
      safe[k] = data[k];
    }
    return safe;
  }

  function firstPullProcess(remote){
    if(_firstPullDone) return;
    _firstPullDone = true;
    if(!remote || !remote.users || !remote.users.length){ _serverEmpty = true; return; }
    try {
      if(Array.isArray(remote.users)) window.db.users = JSON.parse(JSON.stringify(remote.users));
      if(remote.roles && typeof remote.roles === 'object') window.db.roles = JSON.parse(JSON.stringify(remote.roles));
      if(remote.settings && typeof remote.settings === 'object'){
        var keepSync = window.db.sync;
        window.db.settings = JSON.parse(JSON.stringify(remote.settings));
        window.db.sync = keepSync;
      }
    } catch(e){}
  }

  /* ---------- Обёртка ref.set и ref.once ---------- */

  function blockRef(ref){
    try {
      if(!ref || ref.__zrzBlocked) return;
      var origSet = ref.set.bind(ref);
      ref.set = function(data){
        if(guardBlock()) return origSet(safePayload(data));
        return origSet(data);
      };
      var origOnce = ref.once.bind(ref);
      ref.once = function(event){
        var promise = origOnce(event);
        if(event === 'value'){
          return promise.then(function(snap){
            var remote = snap.val();
            if(!remote){ _serverEmpty = true; }
            else if(!_firstPullDone){ firstPullProcess(remote); }
            return snap;
          });
        }
        return promise;
      };
      ref.__zrzBlocked = true;
    } catch(e){}
  }

  /* ---------- Ре-подписка на .on('value') ---------- */

  function resubscribe(){
    try {
      var ref = getRef();
      if(!ref) return;
      blockRef(ref);
      if(ref.__zrzResubscribed) return;
      ref.off('value');
      ref.on('value', function(snap){
        if(Date.now() - getLastPushed() < 800) return;
        var remote = snap.val();
        if(!remote) return;
        setApplyingRemote(true);
        try {
          firstPullProcess(remote);
          if(typeof window.applySyncPayload === 'function') window.applySyncPayload(remote);
          if(window.db.sync) window.db.sync.lastPullAt = Date.now();
          if(typeof window.save === 'function') window.save();
          if(typeof window.render === 'function'){ try{ window.render(); }catch(e){} }
        } finally {
          setTimeout(function(){ setApplyingRemote(false); }, 300);
        }
      }, function(err){
        if(window.db.sync){
          window.db.sync.status = 'error';
          window.db.sync.lastError = String((err && err.message) || err);
        }
        try{ if(typeof window.updateSyncDot === 'function') window.updateSyncDot(); }catch(_){}
      });
      ref.__zrzResubscribed = true;
    } catch(e){}
  }

  /* ---------- Периодический блок на старте ---------- */

  var _setupIv = setInterval(function(){
    var ref = getRef();
    if(ref){
      blockRef(ref);
      resubscribe();
    }
  }, 250);
  setTimeout(function(){ clearInterval(_setupIv); }, 25000);

  setTimeout(resubscribe, 80);
  setTimeout(resubscribe, 600);
  setTimeout(resubscribe, 1500);

  /* ---------- Ручные команды ---------- */

  window.zrzPullOnly = function(){
    try {
      var ref = getRef();
      if(!ref){ if(typeof uiAlert === 'function') uiAlert('Firebase не инициализирован'); return; }
      if(typeof isOnline === 'function' && !isOnline()){ uiAlert('Нет интернета'); return; }
      uiConfirm('Подтянуть данные с сервера?','Подтянуть',{yesLabel:'Подтянуть'}).then(function(ok){
        if(!ok) return;
        ref.once('value').then(function(snap){
          var remote = snap.val();
          if(!remote){ uiAlert('На сервере пока пусто'); return; }
          _firstPullDone = false;
          setApplyingRemote(true);
          try {
            firstPullProcess(remote);
            if(typeof window.applySyncPayload === 'function') window.applySyncPayload(remote);
            if(window.db.sync) window.db.sync.lastPullAt = Date.now();
            if(typeof window.save === 'function') window.save();
            if(typeof window.render === 'function') window.render();
          } finally {
            setTimeout(function(){ setApplyingRemote(false); }, 400);
          }
          uiAlert('✔ Данные подтянуты с сервера');
        }).catch(function(e){ uiAlert('Ошибка: '+((e&&e.message)||e)); });
      });
    } catch(e){ if(typeof uiAlert === 'function') uiAlert('Ошибка: '+((e&&e.message)||e)); }
  };

  window.zrzPushNow = function(){
    window._zrzForcePush = true;
    try {
      var ref = getRef();
      if(!ref){ uiAlert('Firebase не инициализирован'); return; }
      if(typeof isOnline === 'function' && !isOnline()){ uiAlert('Нет интернета'); return; }
      var payload = (typeof window.buildSyncPayload === 'function') ? window.buildSyncPayload() : null;
      if(!payload){ uiAlert('buildSyncPayload недоступен'); return; }
      setLastPushed(Date.now());
      ref.set(payload).then(function(){
        if(window.db.sync){
          window.db.sync.lastPushAt = Date.now();
          window.db.sync.status = 'idle';
          window.db.sync.lastError = '';
        }
        try{ if(typeof window.updateSyncDot === 'function') window.updateSyncDot(); }catch(_){}
        uiAlert('✔ Отправлено на сервер');
      }).catch(function(e){
        if(window.db.sync){
          window.db.sync.status = 'error';
          window.db.sync.lastError = String((e && e.message) || e);
        }
        try{ if(typeof window.updateSyncDot === 'function') window.updateSyncDot(); }catch(_){}
        uiAlert('Ошибка: '+((e&&e.message)||e));
      });
    } finally {
      setTimeout(function(){ window._zrzForcePush = false; }, 3000);
    }
  };

  /* ---------- Блок «🛡 Защита базы» в Настройках ---------- */

  function augmentSettings(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_guard_block')) return;
    if(!document.getElementById('s_phone')) return;

    var html = '<div id="zrz_guard_block" style="margin-top:14px;padding:14px;'
      + 'background:linear-gradient(180deg,rgba(76,175,125,0.10),rgba(76,175,125,0.04));'
      + 'border:1.5px solid rgba(76,175,125,0.35);border-radius:14px">';
    html += '<div style="font-size:12px;font-weight:800;text-transform:uppercase;'
      + 'letter-spacing:1px;color:#2c7a54;margin-bottom:8px">🛡 Защита базы</div>';
    var pulled = window.db && window.db.sync && window.db.sync.lastPullAt;
    var pushed = window.db && window.db.sync && window.db.sync.lastPushAt;
    if(pulled) html += '<div style="font-size:12px;color:var(--muted);line-height:1.5">'
      + '📥 Приём: <b>' + new Date(pulled).toLocaleString('ru-RU') + '</b></div>';
    if(pushed) html += '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px">'
      + '📤 Отправка: <b>' + new Date(pushed).toLocaleString('ru-RU') + '</b></div>';
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

  /* ---------- Подпись разработчика ---------- */

  function injectAuthorSignature(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_author_sig')) return;
    if(!document.getElementById('s_phone')) return;

    var html = '<div id="zrz_author_sig" style="text-align:center;padding:18px 0 6px;'
      + 'color:var(--muted);font-size:12px;line-height:1.7">'
      + '<div style="font-weight:800;color:var(--accent-deep);font-size:13px">'
      + 'Разработчик: Лютиков А.С.</div>'
      + '<div>✈️ @el_c0mandan1e</div>'
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

  /* ---------- Обёртка openSettings ---------- */

  function wrapOpenSettings(){
    if(window._zrzSyncOpenSettingsWrapped) return;
    if(typeof window.openSettings !== 'function') return;
    var orig = window.openSettings;
    window.openSettings = function(){
      var r = orig.apply(this, arguments);
      setTimeout(augmentSettings, 70);
      setTimeout(injectAuthorSignature, 90);
      return r;
    };
    window._zrzSyncOpenSettingsWrapped = true;
  }

  /* ---------- Запуск ---------- */

  function apply(){
    try { blockRef(getRef()); } catch(e){}
    try { resubscribe(); } catch(e){}
    try { wrapOpenSettings(); } catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  /* Polling для обёртки openSettings — если ядро переопределит */
  var _iv = setInterval(function(){
    try { wrapOpenSettings(); } catch(e){}
    try { blockRef(getRef()); } catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[03-sync] синхронизация и защита базы активны'); }catch(_){}
})();
