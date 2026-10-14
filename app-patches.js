/* app-patches.js — загрузчик модулей «Зерцало» v6.0.0 */
(function(){
  var PATCH_VERSION = '6.0.0';
  var BASE = 'https://raw.githubusercontent.com/elcomandan1e/Zercalo-Ver-1/main/patches/';

  var MODULES = [
    '01-core.js',
    '02-draw.js',
    '03-sync.js',
    '04-docs.js',
    '05-ui.js',
    '06-nav.js',
    '08-order-num.js',
    '10-statuses.js',
    '11-status-picker.js'
  ];

  if(window._zrzLoaderRunning) return;
  window._zrzLoaderRunning = true;

  var stamp = Date.now();

  function loadOne(name){
    var url = BASE + name + '?t=' + stamp;
    return fetch(url, {cache:'no-store'})
      .then(function(r){
        if(!r.ok) throw new Error('HTTP ' + r.status + ' on ' + name);
        return r.text();
      })
      .then(function(code){
        if(!code || !code.trim()) return;
        try {
          (new Function(code))();
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

  function boot(){
    var tasks = MODULES.map(loadOne);
    Promise.all(tasks).then(function(){
      try { console.log('[app-patches] loader v' + PATCH_VERSION + ' — все модули загружены'); } catch(_){}
      if(typeof window._zrzPatchInit === 'function'){
        try { window._zrzPatchInit(); } catch(e){}
      }
    });
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }

  window.zrzReloadPatches = function(){
    MODULES.forEach(loadOne);
  };
})();
