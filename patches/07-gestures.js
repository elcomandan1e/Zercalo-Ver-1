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
