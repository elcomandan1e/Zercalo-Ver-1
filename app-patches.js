/* app-patches.js — загрузчик модулей «Зерцало» v6.0.0
   Модули лежат в patches/*.js и подгружаются параллельно.
   При обновлении меняй только нужный модуль.
*/
(function(){
  var PATCH_VERSION = '6.0.0';
  var BASE = 'https://raw.githubusercontent.com/elcomandan1e/Zercalo-Ver-1/main/patches/';

  /* Список модулей. Порядок ВАЖЕН — модули выполняются по очереди.
     Если фича не нужна — закомментируй строку. */
  var MODULES = [
    '01-core.js',
    '02-draw.js',
    '03-sync.js',
    '04-docs.js',
    '05-ui.js',
    '06-nav.js'
    '07-gestures'07-gestures.js'
  ];

  /* Защита от повторного запуска */
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

  /* Параллельная загрузка. Все модули независимы друг от друга —
     каждый сам проверяет, что нужные ему функции/данные есть. */
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

  /* Экспорт в консоль для отладки */
  window.zrzReloadPatches = function(){
    MODULES.forEach(loadOne);
  };
})();
