/* ============ ZERZALO · GESTURE TESTER (debug only) ============ */
(function () {
  'use strict';
  if (window._zrzGestureTester) return;
  if (location.search.indexOf('debug=1') === -1) return;
  window._zrzGestureTester = true;

  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function toast(msg, color) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;top:80px;transform:translateX(-50%);' +
      'background:' + (color || '#4A90E2') + ';color:#fff;padding:12px 20px;' +
      'border-radius:14px;font-weight:800;font-size:14px;z-index:99999;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:Onest,sans-serif;';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 1200);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 1600);
  }

  function buildScreen() {
    var old = document.getElementById('zrz_gt_screen');
    if (old) { old.remove(); return; }

    var screen = document.createElement('div');
    screen.id = 'zrz_gt_screen';
    screen.style.cssText = 'position:fixed;inset:0;background:#f4f6fa;z-index:99990;' +
      'overflow:auto;padding:16px;font-family:Onest,sans-serif;-webkit-overflow-scrolling:touch;';

    var html = '';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">';
    html +=   '<button id="zrz_gt_close" style="width:42px;height:42px;border-radius:12px;border:none;background:#fff;font-size:20px;box-shadow:0 2px 6px rgba(0,0,0,.08)">←</button>';
    html +=   '<div style="flex:1"><div style="font-size:20px;font-weight:800">🧪 Тест жестов</div>';
    html +=   '<div style="font-size:12.5px;color:#666;margin-top:2px">Долгий тап · свайп → · свайп ←</div></div>';
    html += '</div>';

    html += '<div style="background:#fff3d6;border:1.5px solid #ffb800;border-radius:14px;padding:12px;font-size:13px;line-height:1.5;color:#7a4a00;margin-bottom:18px">';
    html +=   '👉 <b>Долгий тап</b> (удержать) — откроется Bottom Sheet';
    html +=   '<br>👉 <b>Свайп вправо</b> — зелёная подсветка + звонок';
    html +=   '<br>👉 <b>Свайп влево</b> — синяя подсветка + карта';
    html +=   '<br>👉 <b>Обычный тап</b> — работает как раньше';
    html += '</div>';

    html += '<div style="font-size:13px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;margin:0 4px 10px">ТЕСТОВЫЕ ЭЛЕМЕНТЫ</div>';

    ['🧪 Тестовое событие №1', '🧪 Тестовое событие №2', '🧪 Тестовое событие №3'].forEach(function (lbl, i) {
      html += '<div class="zrz_gt_item" data-i="' + i + '" style="background:#fff;border-radius:16px;padding:16px;margin-bottom:10px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;align-items:center;gap:12px;' +
        'user-select:none;-webkit-user-select:none;cursor:pointer;transition:background .15s">';
      html +=   '<div style="font-size:22px">📏</div>';
      html +=   '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">' + esc2(lbl) + '</div>';
      html +=   '<div style="font-size:12.5px;color:#888;margin-top:2px">Удерживай / свайпай</div></div>';
      html +=   '<div style="font-size:20px;color:#bbb">›</div>';
      html += '</div>';
    });

    html += '<div id="zrz_gt_log" style="margin-top:18px;padding:14px;background:#1a1a1a;color:#0f0;' +
      'border-radius:14px;font-family:monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;min-height:60px">Лог действий появится здесь…</div>';

    html += '<div style="height:40px"></div>';
    screen.innerHTML = html;
    document.body.appendChild(screen);

    document.getElementById('zrz_gt_close').addEventListener('click', function () {
      screen.remove();
    });

    var logEl = document.getElementById('zrz_gt_log');
    function log(msg) {
      var time = new Date().toTimeString().slice(0, 8);
      logEl.textContent = '[' + time + '] ' + msg + '\n' + logEl.textContent;
      if (logEl.textContent.length > 500) logEl.textContent = logEl.textContent.slice(0, 500);
    }

    Array.prototype.forEach.call(screen.querySelectorAll('.zrz_gt_item'), function (el) {
      var idx = el.getAttribute('data-i');
      var name = 'Событие #' + (parseInt(idx, 10) + 1);

      if (typeof window.zrzAttachActions !== 'function') {
        el.style.opacity = '0.5';
        log('❌ zrzAttachActions не загружен');
        return;
      }

      window.zrzAttachActions(el, {
        longPress: [
          { ico:'👁',  label:'Открыть',    act:function () { log('✅ Долгий тап → Открыть (' + name + ')'); toast('Открыть · ' + name, '#4A90E2'); } },
          { ico:'✓',   label:'Отметить',   act:function () { log('✅ Долгий тап → Отметить (' + name + ')'); toast('Отмечено · ' + name, '#34C759'); } },
          { ico:'📞',  label:'Позвонить',  act:function () { log('✅ Долгий тап → Позвонить (' + name + ')'); toast('Звонок · ' + name, '#4A90E2'); } },
          { ico:'🗺',  label:'Карта',      act:function () { log('✅ Долгий тап → Карта (' + name + ')'); toast('Карта · ' + name, '#AF52DE'); } },
          { ico:'🗑',  label:'Удалить',    act:function () { log('✅ Долгий тап → Удалить (' + name + ')'); toast('Удалено · ' + name, '#E74C3C'); }, danger:true }
        ],
        swipeRight: { ico:'📞', label:'Позвонить', act:function () { log('✅ Свайп вправо → Позвонить (' + name + ')'); toast('📞 ' + name, '#34C759'); } },
        swipeLeft:  { ico:'🗺', label:'Карта',     act:function () { log('✅ Свайп влево → Карта (' + name + ')'); toast('🗺 ' + name, '#4A90E2'); } }
      });

      /* Обычный тап — просто лог */
      el.addEventListener('click', function (e) {
        if (el._zrzBlockClick) return;
        log('👆 Обычный тап (' + name + ')');
      });
    });

    log('✅ Экран готов. Тестируй!');
    log('typeof zrzAttachActions = ' + typeof window.zrzAttachActions);
  }

  function addButton() {
    if (!document.body) { setTimeout(addButton, 200); return; }
    if (document.getElementById('zrz_gt_btn')) return;

    var btn = document.createElement('button');
    btn.id = 'zrz_gt_btn';
    btn.type = 'button';
    btn.textContent = '🧪';
    btn.style.cssText = 'position:fixed;left:14px;bottom:calc(160px + env(safe-area-inset-bottom,0px));' +
      'width:48px;height:48px;border-radius:50%;border:none;' +
      'background:linear-gradient(135deg,#ffb800,#ff8a00);color:#fff;font-size:22px;' +
      'box-shadow:0 6px 18px rgba(255,138,0,.4);z-index:99998;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;padding:0;';
    btn.addEventListener('click', buildScreen);
    document.body.appendChild(btn);
  }

  if (document.readyState === 'complete') setTimeout(addButton, 1200);
  else window.addEventListener('load', function () { setTimeout(addButton, 1200); });

  try { console.log('[07] тестер жестов активен (только ?debug=1)'); } catch (_) {}
})();
/* ============ ZERZALO · UNIVERSAL ACTIONS · 07-gestures part3 ============ */
(function () {
  'use strict';
  if (window._zrzActionsLoaded) return;
  window._zrzActionsLoaded = true;

  var LONG_PRESS_MS = 500;
  var SWIPE_THRESHOLD = 60;
  var MOVE_TOLERANCE = 12;

  function gesturesDisabled() {
    try {
      if (localStorage.getItem('zrz_gestures_disabled') === '1') return true;
      var p = JSON.parse(localStorage.getItem('zrz_user_prefs') || '{}');
      if (p && p.gestures === false) return true;
    } catch (e) {}
    return false;
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function openActionSheet(items, ctx) {
    var bg = document.createElement('div');
    bg.className = 'zrz-as-bg';
    var h = '<div class="zrz-as">';
    h += '<div class="zrz-as-handle"></div>';
    h += '<div class="zrz-as-list">';
    items.forEach(function (it, i) {
      h += '<button type="button" class="zrz-as-item' + (it.danger ? ' zrz-as-danger' : '') + '" data-i="' + i + '">'
        +   '<span class="zrz-as-ico">' + (it.ico || '•') + '</span>'
        +   '<span class="zrz-as-lbl">' + esc2(it.label) + '</span>'
        + '</button>';
    });
    h += '</div>';
    h += '<button type="button" class="zrz-as-cancel">Отмена</button>';
    h += '</div>';
    bg.innerHTML = h;
    document.body.appendChild(bg);

    function done() {
      try { bg.remove(); } catch (e) {}
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') done(); }
    document.addEventListener('keydown', onKey);

    bg.addEventListener('click', function (e) {
      if (e.target === bg) { done(); return; }
      if (e.target.closest('.zrz-as-cancel')) { done(); return; }
      var it = e.target.closest('.zrz-as-item');
      if (!it) return;
      var idx = parseInt(it.getAttribute('data-i'), 10);
      var item = items[idx];
      if (!item) return;
      done();
      buzz(14);
      setTimeout(function () {
        try { if (typeof item.act === 'function') item.act(ctx); } catch (err) { console.warn('[zrzActions]', err); }
      }, 60);
    });
  }

  function attach(el, opts) {
    if (!el || el._zrzActionsAttached) return;
    el._zrzActionsAttached = true;
    opts = opts || {};

    var st = {
      id: null,
      sx: 0, sy: 0,
      dir: null,
      moved: false,
      longTimer: null,
      longFired: false,
      lastDx: 0
    };

    function onStart(e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      st.id = t.identifier;
      st.sx = t.clientX;
      st.sy = t.clientY;
      st.dir = null;
      st.moved = false;
      st.longFired = false;
      st.lastDx = 0;

      if (opts.longPress && opts.longPress.length && !gesturesDisabled()) {
        st.longTimer = setTimeout(function () {
          st.longFired = true;
          st.longTimer = null;
          buzz([18, 40, 18]);
          openActionSheet(opts.longPress, opts);
        }, LONG_PRESS_MS);
      }
    }

    function onMove(e) {
      if (st.id === null) return;
      var t = null;
      for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === st.id) { t = e.touches[i]; break; }
      }
      if (!t) return;

      var dx = t.clientX - st.sx;
      var dy = t.clientY - st.sy;
      var adx = Math.abs(dx), ady = Math.abs(dy);

      if (!st.moved && (adx > MOVE_TOLERANCE || ady > MOVE_TOLERANCE)) {
        st.moved = true;
        if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      }

      if (st.dir === null && st.moved) {
        if (adx > ady * 1.3) st.dir = 'x';
        else st.dir = 'y';
      }

      if (st.dir === 'x') {
        e.preventDefault();
        st.lastDx = dx;
        var shift = Math.max(-90, Math.min(90, dx));
        el.style.transition = 'none';
        el.style.transform = 'translateX(' + shift + 'px)';
        el.classList.toggle('zrz-sw-r', shift > 20);
        el.classList.toggle('zrz-sw-l', shift < -20);
      }
    }

    function onEnd(e) {
      var wasLong = st.longFired;
      var dir = st.dir;
      var dx = st.lastDx;

      if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      st.id = null;
      st.dir = null;
      st.longFired = false;
      st.lastDx = 0;
      st.moved = false;

      el.style.transition = 'transform .2s ease';
      el.style.transform = '';
      el.classList.remove('zrz-sw-r', 'zrz-sw-l');

      if (wasLong) {
        el._zrzBlockClick = true;
        setTimeout(function () { el._zrzBlockClick = false; }, 400);
        return;
      }

      if (dir === 'x') {
        if (dx > SWIPE_THRESHOLD && opts.swipeRight) {
          buzz(14);
          try { if (typeof opts.swipeRight.act === 'function') opts.swipeRight.act(opts); } catch (err) {}
        } else if (dx < -SWIPE_THRESHOLD && opts.swipeLeft) {
          buzz(14);
          try { if (typeof opts.swipeLeft.act === 'function') opts.swipeLeft.act(opts); } catch (err) {}
        }
      }
    }

    function onCancel() {
      if (st.longTimer) { clearTimeout(st.longTimer); st.longTimer = null; }
      st.id = null;
      st.dir = null;
      st.moved = false;
      st.longFired = false;
      el.style.transition = 'transform .2s ease';
      el.style.transform = '';
      el.classList.remove('zrz-sw-r', 'zrz-sw-l');
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onCancel, { passive: true });

    el.addEventListener('click', function (e) {
      if (el._zrzBlockClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    el.addEventListener('contextmenu', function (e) {
      if (!opts.longPress || !opts.longPress.length) return;
      e.preventDefault();
      openActionSheet(opts.longPress, opts);
    });
  }

  var st = document.createElement('style');
  st.setAttribute('data-zrz', 'actions');
  st.textContent = [
    '.zrz-as-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9500;display:flex;align-items:flex-end;animation:zrzAsFade .2s ease;font-family:Onest,system-ui,sans-serif}',
    '.zrz-as{background:#fff;width:100%;max-height:78vh;border-radius:22px 22px 0 0;padding:0 0 calc(env(safe-area-inset-bottom,0px) + 8px);box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:zrzAsUp .28s cubic-bezier(.34,1.56,.64,1);overflow:auto}',
    '.zrz-as-handle{width:40px;height:4px;background:#ddd;border-radius:2px;margin:10px auto 6px}',
    '.zrz-as-list{padding:6px 8px 4px}',
    '.zrz-as-item{display:flex;align-items:center;gap:14px;width:100%;padding:15px 14px;border:none;background:transparent;font-family:inherit;font-size:15.5px;font-weight:600;color:#111;text-align:left;cursor:pointer;border-radius:14px;transition:background .15s}',
    '.zrz-as-item:active{background:#eef3ff}',
    '.zrz-as-ico{font-size:20px;line-height:1;width:28px;text-align:center;flex-shrink:0}',
    '.zrz-as-lbl{flex:1;min-width:0}',
    '.zrz-as-danger{color:#c0392b}',
    '.zrz-as-danger:active{background:#fdecea}',
    '.zrz-as-cancel{display:block;width:calc(100% - 16px);margin:6px 8px 8px;padding:14px;border:none;background:#f5f5f7;border-radius:14px;font-family:inherit;font-size:15px;font-weight:700;color:#555;cursor:pointer}',
    '.zrz-as-cancel:active{background:#e8e8eb}',
    '.zrz-sw-r{background:linear-gradient(90deg,rgba(76,175,125,0.20) 0%,var(--surface, #fff) 45%) !important}',
    '.zrz-sw-l{background:linear-gradient(270deg,rgba(59,134,200,0.20) 0%,var(--surface, #fff) 45%) !important}',
    '@keyframes zrzAsFade{from{opacity:0}to{opacity:1}}',
    '@keyframes zrzAsUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
  ].join('');
  if (!document.querySelector('style[data-zrz="actions"]')) document.head.appendChild(st);

  window.zrzAttachActions = attach;
  window.zrzActionSheet = openActionSheet;

  try { console.log('[07 p3] универсальный компонент жестов активен'); } catch (_) {}
})();
