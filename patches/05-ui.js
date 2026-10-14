/* patches/05-ui.js — часть 1/2
   · SVG-иконки вместо эмодзи (runtime, Phosphor-стиль)
   · Спрайт <symbol> вставляется в <body>
   · MutationObserver заменяет эмодзи в текстовых узлах
   · Тёмная тема — автоматически через currentColor
   Часть 2: типографика Onest + JetBrains Mono
*/
(function(){
  if (window._zrz05UiP1) return;
  window._zrz05UiP1 = true;

  if (window._zrzSvgIcons) return;
  window._zrzSvgIcons = true;

  var BS  = String.fromCharCode(92);
  var NS  = 'http://www.w3.org/2000/svg';
  var XLK = 'http://www.w3.org/1999/xlink';

  /* ---------- Определения иконок: 24×24, stroke, currentColor ---------- */
  var DEFS = {
    'ic-mirror':     '<rect x="5" y="2" width="14" height="18" rx="3"/><path d="M9 7l3-3"/>',
    'ic-shower':     '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M12 4v8"/><path d="M8 15v2"/><path d="M12 15v3"/><path d="M16 15v2"/>',
    'ic-apron':      '<path d="M4 3h16l-2 12H6L4 3z"/><path d="M7 15v5h10v-5"/>',
    'ic-shelf':      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16"/><path d="M9 8h6"/><path d="M9 16h6"/>',
    'ic-panno':      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    'ic-measure':    '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3"/><path d="M10 8v2"/><path d="M14 8v3"/><path d="M18 8v2"/>',
    'ic-remeasure':  '<rect x="2" y="6" width="18" height="6" rx="1"/><path d="M6 6v2"/><path d="M10 6v3"/><path d="M14 6v2"/><path d="M18 16v4"/><path d="M15 18l3 3 3-3"/>',
    'ic-install':    '<circle cx="17" cy="7" r="3"/><path d="M15 9l-9 9v2h2l9-9"/>',
    'ic-demontage':  '<path d="M14 4l6 6-3 1-4-4 1-3z"/><path d="M13 6L4 15v3h3l9-9"/>',
    'ic-delivery':   '<rect x="1" y="6" width="14" height="10" rx="1"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    'ic-purchase':   '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h12l3-9H6"/>',
    'ic-return':     '<path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-3"/>',
    'ic-tempering':  '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 0 1 1 2 2 2 0-3 1-5 1-7z"/>',
    'ic-meeting':    '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 4V2"/><path d="M12 4V2"/>',
    'ic-home':       '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    'ic-users':      '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.5"/><path d="M21 20c0-2-1-3.5-3-4"/>',
    'ic-user':       '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    'ic-calendar':   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    'ic-menu':       '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    'ic-settings':   '<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M5 5l2 2"/><path d="M17 17l2 2"/><path d="M5 19l2-2"/><path d="M17 7l2-2"/>',
    'ic-bell':       '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    'ic-light':      '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3 11.2V16h6v-1.8A6 6 0 0 0 12 3z"/>',
    'ic-socket':     '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/><path d="M9 15h6"/>',
    'ic-cut':        '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M20 4L8 16"/><path d="M14.5 14.5L20 20"/><path d="M8 8l12 12"/>',
    'ic-rounded':    '<path d="M21 3H11a8 8 0 0 0-8 8v10"/>',
    'ic-bolt':       '<path d="M12 2l8 5v10l-8 5-8-5V7z"/><circle cx="12" cy="12" r="3"/>',
    'ic-money':      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4"/><path d="M18 10v4"/>',
    'ic-send':       '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    'ic-print':      '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="6" y="14" width="12" height="7"/>',
    'ic-camera':     '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    'ic-edit':       '<path d="M16 3l5 5-13 13H3v-5z"/><path d="M14 5l5 5"/>',
    'ic-trash':      '<path d="M4 6h16"/><path d="M9 3h6l1 3H8z"/><path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/><path d="M10 10v8"/><path d="M14 10v8"/>',
    'ic-plus':       '<path d="M12 4v16"/><path d="M4 12h16"/>',
    'ic-arrow-left': '<path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>',
    'ic-arrow-right':'<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
    'ic-check':      '<path d="M4 12l5 5 11-11"/>',
    'ic-cross':      '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    'ic-warn':       '<path d="M12 3L1 21h22L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18.5" r="0.7" fill="currentColor"/>',
    'ic-pin':        '<path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>',
    'ic-phone':      '<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    'ic-save':       '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><rect x="8" y="13" width="8" height="8"/>',
    'ic-lock':       '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'ic-electric':   '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    'ic-building':   '<rect x="4" y="3" width="16" height="18"/><path d="M8 7h2v2H8z"/><path d="M14 7h2v2h-2z"/><path d="M8 12h2v2H8z"/><path d="M14 12h2v2h-2z"/><path d="M10 18h4v3h-4z"/>',
    'ic-package':    '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    'ic-tray':       '<path d="M3 12h5l1 3h6l1-3h5"/><path d="M5 5h14l2 7v7H3v-7l2-7z"/>',
    'ic-square':     '<rect x="4" y="4" width="16" height="16" rx="1"/>',
    'ic-bath':       '<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z"/><path d="M6 12V5a2 2 0 0 1 4 0"/><path d="M6 21l-1 1"/><path d="M18 21l1 1"/>',
    'ic-handshake':  '<path d="M11 17l-3 3-6-6 4-4 2 2 4-4 5 5-6 4z"/>',
    'ic-factory':    '<path d="M3 21V9l6 4V9l6 4V7l6 3v11H3z"/><path d="M7 21v-5h3v5"/><path d="M14 21v-5h3v5"/>',
    'ic-tree':       '<path d="M12 3l5 8h-3l4 6H6l4-6H7l5-8z"/><path d="M12 17v4"/>',
    'ic-crown':      '<path d="M3 18l2-10 5 5 2-8 2 8 5-5 2 10z"/><path d="M3 21h18"/>',
    'ic-case':       '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    'ic-search':     '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
    'ic-filter':     '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    'ic-sun':        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
    'ic-moon':       '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z"/>',
    'ic-cloud':      '<path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 2 3.5 3.5 0 0 1-.5 6z"/>',
    'ic-download':   '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    'ic-upload':     '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    'ic-book':       '<path d="M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13h7a3 3 0 0 0 3-3V4z"/>',
    'ic-book-open':  '<path d="M12 6v15"/><path d="M3 5a3 3 0 0 1 3-3h6v18H6a3 3 0 0 0-3 3z"/><path d="M21 5a3 3 0 0 0-3-3h-6v18h6a3 3 0 0 1 3 3z"/>',
    'ic-help':       '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7v.5"/><circle cx="12" cy="17" r="0.7" fill="currentColor"/>',
    'ic-logout':     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    'ic-link':       '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    'ic-map':        '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    'ic-circle-dot': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
    'ic-backspace':  '<path d="M21 4H9L2 12l7 8h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/><path d="M17 9l-5 6"/><path d="M12 9l5 6"/>',
    'ic-key':        '<circle cx="8" cy="15" r="4"/><path d="M11 12l10-10"/><path d="M17 6l3 3"/><path d="M14 9l3 3"/>',
    'ic-palette':    '<path d="M12 3a9 9 0 0 0 0 18 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-10z"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/>',
    'ic-doc':        '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/>',
    'ic-info':       '<circle cx="12" cy="12" r="10"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.7" fill="currentColor"/>',
    'ic-tool':       '<path d="M14 3a4 4 0 0 0-3 6.5L4 16v3h3l6.5-7A4 4 0 1 0 14 3z"/>',
    'ic-door':       '<rect x="5" y="3" width="12" height="18" rx="1"/><circle cx="13" cy="12" r="1" fill="currentColor"/>',
    'ic-rug':        '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M7 5v14"/><path d="M17 5v14"/>',
    'ic-sunset':     '<path d="M3 18h18"/><path d="M3 21h18"/><path d="M8 14a4 4 0 1 1 8 0"/><path d="M12 4v6"/><path d="M8 8l4-4 4 4"/>'
  };

  /* ---------- Соответствие эмодзи → id иконки ---------- */
  var MAP = {
    '🪞':'ic-mirror', '🚿':'ic-shower', '🍳':'ic-apron', '🗄':'ic-shelf', '🖼':'ic-panno',
    '📏':'ic-measure', '📐':'ic-remeasure', '🔧':'ic-install', '🔨':'ic-demontage',
    '🚚':'ic-delivery', '🛒':'ic-purchase', '↩':'ic-return', '🔥':'ic-tempering',
    '☕':'ic-meeting', '👑':'ic-crown', '💼':'ic-case', '👤':'ic-user', '👥':'ic-users',
    '🏠':'ic-home', '🏢':'ic-building', '🏪':'ic-building', '🌳':'ic-tree',
    '📋':'ic-doc', '📦':'ic-package', '🤝':'ic-handshake', '🏭':'ic-factory',
    '📍':'ic-pin', '🛁':'ic-bath', '⬜':'ic-square',
    '🔔':'ic-bell', '⚙':'ic-settings', '☰':'ic-menu', '📅':'ic-calendar', '📆':'ic-calendar',
    '🔍':'ic-search', '🔎':'ic-search', '🎛':'ic-filter',
    '💡':'ic-light', '🔌':'ic-socket', '✂':'ic-cut', '⭕':'ic-rounded', '🔩':'ic-bolt',
    '💰':'ic-money', '📤':'ic-send', '🖨':'ic-print', '📷':'ic-camera',
    '✏':'ic-edit', '🗑':'ic-trash', '💾':'ic-save', '⚡':'ic-electric',
    '🔒':'ic-lock', '🔐':'ic-lock', '📞':'ic-phone', '⌫':'ic-backspace',
    '☀':'ic-sun', '🌙':'ic-moon', '☁':'ic-cloud', '📥':'ic-download',
    '🧹':'ic-trash', '📖':'ic-book', '📚':'ic-book-open', '🚪':'ic-door',
    '🌅':'ic-sunset', '⚠':'ic-warn', '✔':'ic-check', '✓':'ic-check',
    '✕':'ic-cross', '❌':'ic-cross', '🟢':'ic-circle-dot',
    '🟡':'ic-circle-dot', '🔴':'ic-circle-dot', '⚪':'ic-circle-dot',
    '🗺':'ic-map', '🔗':'ic-link', '🩺':'ic-info',
    '❓':'ic-help', '🎨':'ic-palette', '📊':'ic-doc', '🕐':'ic-info',
    '⏱':'ic-info', '❕':'ic-info', '‼':'ic-warn', '◯':'ic-circle-dot'
  };

  var KEYS = Object.keys(MAP).sort(function(a,b){ return b.length - a.length; });
  var ALT  = KEYS.join('|');
  var RE   = new RegExp('(' + ALT + ')' + BS + 'uFE0F?', 'g');

  /* ---------- CSS ---------- */
  function injectCss(){
    if (document.getElementById('zrz-svg-icons-css')) return;
    var st = document.createElement('style');
    st.id = 'zrz-svg-icons-css';
    st.textContent =
      '.zrz-ic{display:inline-flex;align-items:center;justify-content:center;' +
      'vertical-align:-0.15em;margin:0 0.15em;line-height:0;flex-shrink:0;' +
      'color:currentColor}' +
      '.zrz-ic>svg{display:block;width:1.1em;height:1.1em;stroke:currentColor;' +
      'fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- SVG-спрайт ---------- */
  function buildSprite(){
    if (document.getElementById('zrz-svg-sprite')) return;
    var wrap = document.createElement('div');
    wrap.id = 'zrz-svg-sprite';
    wrap.setAttribute('aria-hidden','true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    Object.keys(DEFS).forEach(function(id){
      var sym = document.createElementNS(NS, 'symbol');
      sym.setAttribute('id', id);
      sym.setAttribute('viewBox', '0 0 24 24');
      sym.setAttribute('fill', 'none');
      sym.setAttribute('stroke', 'currentColor');
      sym.setAttribute('stroke-width', '1.75');
      sym.setAttribute('stroke-linecap', 'round');
      sym.setAttribute('stroke-linejoin', 'round');
      sym.innerHTML = DEFS[id];
      svg.appendChild(sym);
    });
    wrap.appendChild(svg);
    if (document.body && document.body.firstChild) {
      document.body.insertBefore(wrap, document.body.firstChild);
    } else {
      document.body.appendChild(wrap);
    }
  }

  /* ---------- Создание span с SVG ---------- */
  function makeIcon(id){
    var span = document.createElement('span');
    span.className = 'zrz-ic';
    span.setAttribute('aria-hidden','true');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width',  '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#' + id);
    use.setAttributeNS(XLK, 'xlink:href', '#' + id);
    svg.appendChild(use);
    span.appendChild(svg);
    return span;
  }

  /* ---------- Замена в текстовом узле ---------- */
  function replaceInTextNode(node){
    var t = node.nodeValue;
    if (!t) return;
    var parent = node.parentNode;
    if (!parent) return;
    var ptag = (parent.tagName || '').toUpperCase();
    if (ptag === 'SCRIPT' || ptag === 'STYLE' || ptag === 'TEXTAREA' ||
        ptag === 'INPUT'  || ptag === 'OPTION' || ptag === 'SELECT') return;
    if (parent.isContentEditable) return;
    if (parent.classList && parent.classList.contains('zrz-ic')) return;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    RE.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var last = 0, hit = false;
    t.replace(RE, function(m, emoji, offset){
      var id = MAP[emoji];
      if (!id) return m;
      hit = true;
      if (offset > last) frag.appendChild(document.createTextNode(t.slice(last, offset)));
      frag.appendChild(makeIcon(id));
      last = offset + m.length;
      return m;
    });
    if (!hit) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    try { parent.replaceChild(frag, node); } catch(e){}
  }

  /* ---------- Обход дерева ---------- */
  function walk(node){
    if (!node) return;
    if (node.nodeType === 3){ replaceInTextNode(node); return; }
    if (node.nodeType !== 1) return;
    var tag = (node.tagName || '').toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' ||
        tag === 'INPUT'  || tag === 'OPTION' || tag === 'SELECT' ||
        tag === 'SVG') return;
    if (node.isContentEditable) return;
    if (node.classList && node.classList.contains('zrz-ic')) return;
    var c = node.firstChild;
    while (c){
      var nx = c.nextSibling;
      walk(c);
      c = nx;
    }
  }

  /* ---------- Старт ---------- */
  function boot(){
    injectCss();
    buildSprite();
    walk(document.body);
    try {
      var mo = new MutationObserver(function(muts){
        for (var i = 0; i < muts.length; i++){
          var m = muts[i];
          if (m.type === 'childList'){
            for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
          } else if (m.type === 'characterData'){
            walk(m.target);
          }
        }
      });
      mo.observe(document.body, {childList:true, subtree:true, characterData:true});
      window._zrzSvgIconsObserver = mo;
    } catch(e){}
  }

  window.zrzRebuildIcons = function(){ walk(document.body); };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, {once:true});

  try{ console.log('[05-ui p1] SVG-иконки активны'); }catch(_){}
})();/* patches/05-ui.js — часть 2/2
   · Основной шрифт: Onest (хорошая кириллица, свежий вид)
   · Моно: JetBrains Mono (номера заказов, цены)
   · Табличные цифры в ценах, номерах, размерах
   · Чертёж A4 (PT Sans Narrow) и логотип — не трогаем
*/
(function(){
  if(window._zrz05UiP2) return;
  window._zrz05UiP2 = true;

  var head = document.head || document.documentElement;

  /* ---------- Preconnect (быстрее загрузка) ---------- */

  function addLink(rel, href, extra){
    var l = document.createElement('link');
    l.rel = rel;
    if(href) l.href = href;
    if(extra) for(var k in extra){ try{ l.setAttribute(k, extra[k]); }catch(e){} }
    head.appendChild(l);
    return l;
  }

  if(!document.querySelector('link[href*="fonts.googleapis.com"][rel="preconnect"]')){
    addLink('preconnect', 'https://fonts.googleapis.com');
  }
  if(!document.querySelector('link[href*="fonts.gstatic.com"][rel="preconnect"]')){
    addLink('preconnect', 'https://fonts.gstatic.com', {crossorigin:'anonymous'});
  }

  /* ---------- Загрузка Onest + JetBrains Mono ---------- */

  var FONT_URL = 'https://fonts.googleapis.com/css2'
    + '?family=Onest:wght@300;400;500;600;700;800;900'
    + '&family=JetBrains+Mono:wght@400;500;600;700'
    + '&display=swap';

  if(!document.querySelector('link[href*="family=Onest"]')){
    addLink('stylesheet', FONT_URL);
  }

  /* ---------- CSS-переопределения ---------- */

  var old = document.getElementById('zrz-typo3-css');
  if(old) old.remove();

  var css = ''
    /* Основные переменные */
    + ':root{'
    +   '--font-sans:"Onest","Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif !important;'
    +   '--font-mono:"JetBrains Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace !important;'
    + '}'

    /* Body — Onest */
    + 'body,button,input,textarea,select{'
    +   'font-family:var(--font-sans) !important;'
    +   'font-feature-settings:"ss01" 1,"cv01" 1;'
    +   'letter-spacing:-0.005em;'
    + '}'

    /* Заголовки — плотнее */
    + 'h1,h2,h3,h4,h5,h6,.card-title,.modal h2,.order-num-lg{'
    +   'letter-spacing:-0.02em;'
    +   'font-feature-settings:"ss01" 1,"cv01" 1;'
    + '}'

    /* Цифры — табличные */
    + '.order-num,.order-num-lg,.payment-block .pb-val,.price-row input,.price-summary .pv,'
    + '.price-summary .pl,.report-bar-row .rval,.report-kpi-cell .num,.info-line .val{'
    +   'font-variant-numeric:tabular-nums;'
    +   'font-feature-settings:"tnum" 1;'
    + '}'

    /* Кнопки и чипы — чуть плотнее */
    + '.btn,.chip,.tabbar-btn,.tabbar-btn span,.key-btn,.role-btn,.team-chip,.cal-nav{'
    +   'letter-spacing:-0.01em;'
    + '}'

    /* Моно — только для номеров заказов */
    + '.order-num,.order-num-lg{'
    +   'font-family:var(--font-mono) !important;'
    + '}'

    /* Чертёж A4 — оставляем PT Sans Narrow */
    + 'canvas{font-family:var(--font-tech) !important}'
    ;

  var st = document.createElement('style');
  st.id = 'zrz-typo3-css';
  st.textContent = css;
  head.appendChild(st);

  /* ---------- Форсировать перерисовку после загрузки шрифта ---------- */

  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      try{
        document.body.style.opacity = '0.999';
        setTimeout(function(){ document.body.style.opacity = ''; }, 30);
      }catch(e){}
    }).catch(function(){});
  }

  try{ console.log('[05-ui p2] Onest + JetBrains Mono активны'); }catch(_){}
})();
