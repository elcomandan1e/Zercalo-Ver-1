/* app-patches.js — загрузчик модулей «Зерцало» v6.1.1
   · Прелоадер: модули грузятся за занавесом
   · Ожидание загрузки шрифта Onest перед показом
   · Версионирование модулей — HTTP-кеш работает
*/
(function(){
  var PATCH_VERSION = '6.1.15';
  var BASE = 'https://raw.githubusercontent.com/elcomandan1e/Zercalo-Ver-1/main/patches/';

  var MODULES = [
    '01-core.js',
    '02-draw.js',
    '03-sync.js',
    '04-docs.js',
    '05-ui.js',
    '06-nav.js',
    '07-gestures.js',
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
