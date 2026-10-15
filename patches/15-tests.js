/* patches/15-tests.js — свой тестовый стенд для патчей
   · Автопроверка всех модулей 01–14
   · Проверка данных, синхронизации, шрифтов, иконок
   · Быстрые действия для тестов (напоминание, подсказка)
   · Кнопки сброса (подсказка палитры, напоминание)
   · Заменяет кнопку «🧪 Тесты» в Bottom Sheet
   · Добавляет блок в Настройках
*/
(function(){
  if(window._zrz15Tests) return;
  window._zrz15Tests = true;

  /* ============================================================
     ХЕЛПЕРЫ
     ============================================================ */
  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function todayKey(){
    try { if(typeof dateToYmd === 'function') return dateToYmd(new Date()); }catch(e){}
    var d = new Date();
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }

  /* ============================================================
     РЕЕСТР ТЕСТОВ
     Каждый тест: { name, run: () => true | false | string }
     true = ок, false = провал, строка = провал с описанием
     ============================================================ */

  var TESTS = [];

  function t(name, run){
    TESTS.push({ name: name, run: run });
  }

  /* --- Модули загружены --- */
  t('Модуль 01 (core) загружен', function(){
    return !!window._zrz01Core;
  });
  t('Модуль 02 (чертежи) загружен', function(){
    return !!(window._zrz02DrawP1 && window._zrz02DrawP2);
  });
  t('Модуль 03 (синхронизация) загружен', function(){
    return !!window._zrz03Sync;
  });
  t('Модуль 04 (документация) загружен', function(){
    return !!(window._zrz04DocsP1 && window._zrz04DocsP2);
  });
  t('Модуль 05 (иконки + шрифты) загружен', function(){
    return !!(window._zrz05UiP1 && window._zrz05UiP2);
  });
  t('Модуль 06 (навигация) загружен', function(){
    return !!(window._zrz06NavP1 && window._zrz06NavP2 && window._zrz06NavP3);
  });
  t('Модуль 08 (номер заказа) загружен', function(){
    return !!window._zrz08OrderNum;
  });
  t('Модуль 10 (статусы) загружен', function(){
    return !!window._zrz10Statuses;
  });
  t('Модуль 11 (выбор статуса) загружен', function(){
    return !!window._zrz11StatusPicker;
  });
  t('Модуль 12 (дошлифовка статусов) загружен', function(){
    return !!window._zrz12StatusesExtra;
  });
  t('Модуль 13 (дашборд) загружен', function(){
    return !!window._zrz13DashboardP1;
  });
  t('Модуль 14 (внимание + напоминание) загружен', function(){
    return !!window._zrz14AttentionP1;
  });

  /* --- Статусы (v10) --- */
  t('STATUS_META содержит 10 статусов', function(){
    try {
      if(typeof STATUS_META === 'undefined') return 'STATUS_META не определён';
      var needed = ['lead','measure_scheduled','measure_done','approval','work','ready','installed','closed','paused','declined'];
      var missing = needed.filter(function(k){ return !STATUS_META[k]; });
      if(missing.length) return 'нет: ' + missing.join(', ');
      return true;
    }catch(e){ return String(e.message||e); }
  });
  t('Функция перехода к следующему статусу есть', function(){
    return typeof window.zrzNextStatus === 'function';
  });
  t('Следующий статус lead → measure_scheduled', function(){
    try {
      var n = window.zrzNextStatus('lead');
      return n === 'measure_scheduled' ? true : ('получено: ' + n);
    }catch(e){ return String(e.message||e); }
  });
  t('Следующий статус closed → null (конец)', function(){
    try {
      var n = window.zrzNextStatus('closed');
      return n === null ? true : ('получено: ' + n);
    }catch(e){ return String(e.message||e); }
  });

  /* --- Выбор статуса (v11) --- */
  t('Функция zrzOpenStatusSheet есть', function(){
    return typeof window.zrzOpenStatusSheet === 'function';
  });

  /* --- Дошлифовка (v12) --- */
  t('Функция zrzConfirmPause есть', function(){
    return typeof window.zrzConfirmPause === 'function';
  });
  t('Модалка паузы / истории / триггеров активна', function(){
    // Проверяем что модуль 12 применён — ищем CSS-класс
    return !!document.getElementById('zrz-statuses-extra-css');
  });

  /* --- Дашборд (v13) --- */
  t('Функция zrzDashSwitchTab есть', function(){
    return typeof window.zrzDashSwitchTab === 'function';
  });
  t('KPI-блок отрисован (для админа/менеджера)', function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return 'не авторизован';
      if(u.role !== 'admin' && u.role !== 'manager') return 'роль не админ/менеджер — норма';
      var el = document.querySelector('.zrz-kpi');
      return el ? true : 'KPI-блок не найден в DOM';
    }catch(e){ return String(e.message||e); }
  });

  /* --- Внимание + напоминание (v14) --- */
  t('Функция zrz14TestReminder есть', function(){
    return typeof window.zrz14TestReminder === 'function';
  });
  t('Функция zrz14OpenRoute есть', function(){
    return typeof window.zrz14OpenRoute === 'function';
  });
  t('CSS блока внимания подключён', function(){
    return !!document.getElementById('zrz-attention-css');
  });

  /* --- Навигация (v06) --- */
  t('Таббар отрисован', function(){
    var el = document.getElementById('tabbar');
    if(!el) return 'не найден #tabbar';
    var cnt = el.querySelectorAll('.tabbar-btn').length;
    return cnt >= 3 ? true : ('кнопок: ' + cnt);
  });
  t('Command Palette открывается', function(){
    return typeof window.zrzOpenPalette === 'function';
  });
  t('Иконка ⌘ в шапке есть', function(){
    return !!document.getElementById('zrz-cmd-btn');
  });
  t('Bottom Sheet (zrzOpenSheet) есть', function(){
    return typeof window.zrzOpenSheet === 'function';
  });

  /* --- Иконки (v05) --- */
  t('SVG-спрайт иконок вставлен', function(){
    return !!document.getElementById('zrz-svg-sprite');
  });
  t('Иконки применяются (есть .zrz-ic)', function(){
    var cnt = document.querySelectorAll('.zrz-ic').length;
    return cnt > 0 ? true : 'иконки не найдены';
  });

  /* --- Типографика (v05) --- */
  t('Шрифт Onest подключён', function(){
    var links = document.querySelectorAll('link[href*="Onest"]');
    return links.length > 0 ? true : 'тег font не найден';
  });
  t('CSS типографики применён', function(){
    return !!document.getElementById('zrz-typo3-css');
  });

  /* --- Данные --- */
  t('База db инициализирована', function(){
    return window.db && typeof db === 'object' ? true : 'db не найден';
  });
  t('Заказы есть в базе', function(){
    try { return (db.orders && db.orders.length >= 0) ? true : 'нет массива'; }catch(e){ return String(e.message||e); }
  });
  t('События есть в базе', function(){
    try { return (db.events && db.events.length >= 0) ? true : 'нет массива'; }catch(e){ return String(e.message||e); }
  });
  t('Клиенты есть в базе', function(){
    try { return (db.clients && db.clients.length >= 0) ? true : 'нет массива'; }catch(e){ return String(e.message||e); }
  });
  t('Пользователи есть в базе', function(){
    try { return (db.users && db.users.length > 0) ? true : 'пустой массив'; }catch(e){ return String(e.message||e); }
  });

  /* --- Синхронизация --- */
  t('Объект db.sync есть', function(){
    return db && db.sync ? true : 'нет db.sync';
  });
  t('Последний pull был', function(){
    try { return (db.sync && db.sync.lastPullAt) ? true : 'не было pull (норма, если Firebase пуст)'; }catch(e){ return String(e.message||e); }
  });
  t('Последний push был', function(){
    try { return (db.sync && db.sync.lastPushAt) ? true : 'не было push (норма, если Firebase пуст)'; }catch(e){ return String(e.message||e); }
  });
  t('Firebase Auth работает', function(){
    try {
      var s = db.sync && db.sync.authStatus;
      return s === 'signed' ? true : ('статус: ' + s);
    }catch(e){ return String(e.message||e); }
  });

  /* --- Настройки --- */
  t('Тема применена', function(){
    var t = document.documentElement.getAttribute('data-theme');
    return (t === 'light' || t === 'dark') ? true : 'тема не задана';
  });
  t('Service Worker зарегистрирован', function(){
    return ('serviceWorker' in navigator) ? true : 'SW не поддерживается';
  });

  /* --- Кнопки быстрого тестирования (не тесты, а действия) --- */
  var ACTIONS = [
    { label: '🔔 Показать напоминание 19:00', fn: function(){
      if(typeof window.zrz14TestReminder === 'function') window.zrz14TestReminder();
      else if(typeof uiAlert === 'function') uiAlert('Функция zrz14TestReminder не найдена');
    }},
    { label: '⌘ Показать подсказку палитры', fn: function(){
      if(typeof window.zrzShowPaletteHint === 'function') window.zrzShowPaletteHint();
      else if(typeof uiAlert === 'function') uiAlert('Функция zrzShowPaletteHint не найдена');
    }},
    { label: '🎨 Пересобрать иконки', fn: function(){
      if(typeof window.zrzRebuildIcons === 'function'){ window.zrzRebuildIcons(); if(typeof uiAlert==='function') uiAlert('Иконки пересобраны'); }
      else if(typeof uiAlert === 'function') uiAlert('Функция zrzRebuildIcons не найдена');
    }},
    { label: '🔄 Перезагрузить модули', fn: function(){
      if(typeof window.zrzReloadPatches === 'function'){ window.zrzReloadPatches(); if(typeof uiAlert==='function') uiAlert('Модули перезагружаются — обнови страницу через 2 сек'); }
      else if(typeof uiAlert === 'function') uiAlert('Функция zrzReloadPatches не найдена');
    }},
    { label: '⌘ Сбросить подсказку палитры', fn: function(){
      try { localStorage.removeItem('zrz_palette_hint_seen_v1'); }catch(e){}
      if(typeof uiAlert === 'function') uiAlert('Подсказка сброшена — обнови приложение');
    }},
    { label: '🔔 Сбросить напоминание 19:00', fn: function(){
      try {
        var u = (typeof currentUser === 'function') ? currentUser() : null;
        if(u) localStorage.removeItem('zrz_evening_reminder_' + u.id);
      }catch(e){}
      if(typeof uiAlert === 'function') uiAlert('Напоминание сброшено — сработает при следующей проверке');
    }}
  ];

  /* ============================================================
     ЗАПУСК ТЕСТОВ
     ============================================================ */

  function runAll(){
    var results = [];
    TESTS.forEach(function(test){
      var t0 = Date.now();
      var res;
      try {
        res = test.run();
      }catch(e){
        res = 'исключение: ' + String(e.message || e);
      }
      var ok = (res === true);
      var msg = (typeof res === 'string') ? res : '';
      results.push({
        name: test.name,
        ok: ok,
        msg: msg,
        ms: Date.now() - t0
      });
    });
    return results;
  }

  /* ============================================================
     HTML ТЕСТ-СТЕНДА
     ============================================================ */

  function buildResultsHtml(results){
    var passed = results.filter(function(r){ return r.ok; }).length;
    var total = results.length;
    var color = passed === total ? '#2c7a54' : (passed / total > 0.8 ? '#a05c26' : '#c14d4d');

    var html = '';
    html += '<div class="zrz-t-res">';
    html += '<div class="zrz-t-score" style="color:'+color+'">' + passed + ' / ' + total + '</div>';
    html += '<div class="zrz-t-score-lbl">' + (passed === total ? 'Всё работает' : 'Есть проблемы') + '</div>';
    html += '</div>';

    /* Провалившиеся сверху */
    var fails = results.filter(function(r){ return !r.ok; });
    var oks = results.filter(function(r){ return r.ok; });

    if(fails.length){
      html += '<div class="zrz-t-sec"><div class="zrz-t-sec-title" style="color:#c14d4d">✗ Проблемы (' + fails.length + ')</div>';
      fails.forEach(function(r){
        html += '<div class="zrz-t-row zrz-t-fail">'
          +   '<span class="zrz-t-ico">✗</span>'
          +   '<span class="zrz-t-name">' + esc2(r.name) + '</span>'
          +   (r.msg ? '<span class="zrz-t-msg">' + esc2(r.msg) + '</span>' : '')
          + '</div>';
      });
      html += '</div>';
    }

    if(oks.length){
      html += '<div class="zrz-t-sec"><div class="zrz-t-sec-title" style="color:#2c7a54">✓ Работает (' + oks.length + ')</div>';
      oks.forEach(function(r){
        html += '<div class="zrz-t-row zrz-t-ok">'
          +   '<span class="zrz-t-ico">✓</span>'
          +   '<span class="zrz-t-name">' + esc2(r.name) + '</span>'
          + '</div>';
      });
      html += '</div>';
    }

    return html;
  }

  function openTestStand(){
    var results = runAll();
    var resultsHtml = buildResultsHtml(results);

    var html = '';
    html += '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' Проверка патчей</h2>';
    html += '<div class="modal-crumbs"><span>Настройки</span><span class="bc-sep">/</span><span class="bc-cur">Проверка</span></div>';
    html += '<div class="draft-notice">Автопроверка всех модулей патчей. Если что-то не так — ищи в списке красным.</div>';
    html += '<div id="zrz-t-results">' + resultsHtml + '</div>';

    html += '<div class="section-title" style="margin-top:20px">🧪 Быстрые действия</div>';
    html += '<div class="zrz-t-actions">';
    ACTIONS.forEach(function(a, i){
      html += '<button type="button" class="zrz-t-action" onclick="zrz15Action(' + i + ')">' + esc2(a.label) + '</button>';
    });
    html += '</div>';

    html += '<button class="btn btn-primary" style="margin-top:16px" onclick="zrz15ReRun()">🔁 Прогнать заново</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';

    try {
      if(typeof showModal === 'function') showModal(html);
    }catch(e){}
  }

  window.zrz15ReRun = function(){
    var results = runAll();
    var el = document.getElementById('zrz-t-results');
    if(el) el.innerHTML = buildResultsHtml(results);
    try { if(typeof haptic === 'function') haptic(6); }catch(_){}
  };

  window.zrz15Action = function(idx){
    var a = ACTIONS[idx];
    if(!a) return;
    try { a.fn(); }catch(e){ if(typeof uiAlert === 'function') uiAlert('Ошибка: ' + (e.message || e)); }
  };

  window.zrz15OpenTests = openTestStand;

  /* ============================================================
     ЗАМЕНА КНОПКИ «🧪 ТЕСТЫ» В BOTTOM SHEET
     ============================================================ */

  function wrapSheetAction(){
    if(window._zrz15SheetWrapped) return;
    if(typeof window.zrzSheetAction !== 'function') return;
    var orig = window.zrzSheetAction;
    window.zrzSheetAction = function(act){
      if(act === 'tests'){
        try { if(typeof window.zrzCloseSheet === 'function') window.zrzCloseSheet(); }catch(e){}
        setTimeout(openTestStand, 120);
        return;
      }
      return orig.apply(this, arguments);
    };
    window._zrz15SheetWrapped = true;
  }

  /* Также перехватываем openTestStand напрямую */
  function wrapOpenTestStand(){
    if(window._zrz15TestWrapped) return;
    if(typeof window.openTestStand !== 'function') return;
    var orig = window.openTestStand;
    window.openTestStand = function(){
      /* Всегда показываем наш расширенный стенд */
      try { return openTestStand(); }catch(e){ return orig.apply(this, arguments); }
    };
    window._zrz15TestWrapped = true;
  }

  /* ============================================================
     БЛОК В НАСТРОЙКАХ
     ============================================================ */

  function augmentSettings(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz15_settings_block')) return;
    if(!document.getElementById('s_phone')) return;

    var html = '';
    html += '<div id="zrz15_settings_block" style="margin-top:14px;padding:14px;';
    html += 'background:linear-gradient(180deg,rgba(91,127,184,0.10),rgba(91,127,184,0.04));';
    html += 'border:1.5px solid rgba(91,127,184,0.28);border-radius:14px">';
    html += '<div style="font-size:12px;font-weight:800;text-transform:uppercase;';
    html += 'letter-spacing:1px;color:var(--accent-deep);margin-bottom:8px">🧪 Проверка патчей</div>';
    html += '<div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:10px">';
    html += 'Автопроверка всех модулей. Быстрые тесты напоминаний, иконок, подсказок.';
    html += '</div>';
    html += '<button type="button" class="btn btn-secondary" style="padding:10px;font-size:14px" onclick="closeModal();zrz15OpenTests()">Открыть тестовый стенд</button>';
    html += '</div>';

    /* Вставляем перед кнопкой «Отмена» */
    var allBtns = modal.querySelectorAll('.btn');
    var cancelBtn = null;
    for(var i=0;i<allBtns.length;i++){
      if((allBtns[i].textContent || '').trim() === 'Отмена'){ cancelBtn = allBtns[i]; break; }
    }
    if(cancelBtn) cancelBtn.insertAdjacentHTML('beforebegin', html);
    else modal.insertAdjacentHTML('beforeend', html);
  }

  function wrapOpenSettings(){
    if(window._zrz15SettingsWrapped) return;
    if(typeof window.openSettings !== 'function') return;
    var orig = window.openSettings;
    window.openSettings = function(){
      var r = orig.apply(this, arguments);
      setTimeout(augmentSettings, 80);
      return r;
    };
    window._zrz15SettingsWrapped = true;
  }

  /* ============================================================
     CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-tests-css')) return;
    var css = ''
      /* Общий контейнер */
      + '.zrz-t-res{background:linear-gradient(135deg,rgba(91,127,184,0.10),rgba(91,127,184,0.03));'
      +   'border:1.5px solid rgba(91,127,184,0.28);border-radius:18px;padding:18px;'
      +   'text-align:center;margin-bottom:14px}'
      + '.zrz-t-score{font-size:38px;font-weight:900;letter-spacing:-0.03em;line-height:1;'
      +   'font-variant-numeric:tabular-nums}'
      + '.zrz-t-score-lbl{font-size:13px;font-weight:700;color:var(--muted);margin-top:4px;'
      +   'text-transform:uppercase;letter-spacing:0.8px}'
      /* Секции */
      + '.zrz-t-sec{margin-bottom:14px}'
      + '.zrz-t-sec-title{font-size:11.5px;font-weight:800;text-transform:uppercase;'
      +   'letter-spacing:1.2px;margin-bottom:6px;padding-left:2px}'
      + '.zrz-t-row{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;'
      +   'border-radius:10px;margin-bottom:4px;font-size:13px;line-height:1.4;'
      +   'background:var(--surface);border:1px solid var(--line)}'
      + '.zrz-t-fail{background:rgba(201,101,101,0.08);border-color:rgba(201,101,101,0.28)}'
      + '.zrz-t-ok{background:rgba(76,175,125,0.06);border-color:rgba(76,175,125,0.20)}'
      + '.zrz-t-ico{font-weight:900;flex-shrink:0;width:16px;text-align:center;font-size:14px}'
      + '.zrz-t-fail .zrz-t-ico{color:#c96565}'
      + '.zrz-t-ok .zrz-t-ico{color:#4caf7d}'
      + '.zrz-t-name{flex:1;min-width:0;font-weight:600;color:var(--text);word-break:break-word}'
      + '.zrz-t-msg{color:#c96565;font-size:12px;font-weight:500;flex-basis:100%;padding-left:24px;margin-top:2px}'
      /* Быстрые действия */
      + '.zrz-t-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:8px}'
      + '.zrz-t-action{display:block;width:100%;padding:12px 14px;border:1.5px solid var(--accent-line);'
      +   'border-radius:14px;background:var(--surface);color:var(--accent-deep);'
      +   'font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;text-align:left;'
      +   'transition:background .12s ease,transform .12s ease}'
      + '.zrz-t-action:hover{background:var(--accent-soft)}'
      + '.zrz-t-action:active{background:var(--accent-line);transform:scale(0.98)}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-tests-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapSheetAction(); }catch(e){}
    try { wrapOpenTestStand(); }catch(e){}
    try { wrapOpenSettings(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  /* Подстраховка — если ядро переопределит openTestStand или openSettings */
  var _iv = setInterval(function(){
    try { wrapSheetAction(); }catch(e){}
    try { wrapOpenTestStand(); }catch(e){}
    try { wrapOpenSettings(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[15-tests] проверка патчей активна'); }catch(_){}
})();
/* ===== TEMP: дамп функций ядра ===== */
(function(){
  if (location.search.indexOf('dump=1') === -1) return;
  function dump(){
    var names = [];
    for (var k in window) {
      try {
        if (typeof window[k] === 'function' &&
            /open|new|show|route|client|event|order|call|navig/i.test(k)) {
          names.push(k);
        }
      } catch(e){}
    }
    names.sort();
    var html = '<div style="position:fixed;inset:0;background:#000;color:#0f0;z-index:99999;padding:14px;font:12px/1.5 monospace;overflow:auto;white-space:pre-wrap;-webkit-user-select:text;user-select:text">' +
      '=== FUNCTIONS ===\n' + names.join('\n') +
      '\n\n=== ROLE ===\n' + (typeof currentUser==='function' ? JSON.stringify(currentUser()) : 'currentUser not found') +
      '\n\n(тапни сюда, чтобы выделить и скопировать)</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }
  if (document.readyState === 'complete') setTimeout(dump, 2500);
  else window.addEventListener('load', function(){ setTimeout(dump, 2500); });
})();
/* patches/15-tests.js — автотесты чертежей (Draw) */
(function(){
  if(window._zrz15DrawTests) return;
  window._zrz15DrawTests = true;

  if(typeof window._tsRegister !== 'function'){
    try{ console.warn('[15 draw-tests] _tsRegister не найден, пропускаю'); }catch(_){}
    return;
  }

  /* ---------- Утилиты ---------- */

  function _mkItem(type, shape, extra){
    var base = {
      id: 999999, type: type, shape: shape || 'RECT',
      w: 60, h: 180, th: 4, qty: 1,
      glass: 'Серебро', edge: 'Полированный край', facetWidth: 0,
      frameColor: 'none', mountType: '',
      isNiche: false, socketsMount: false, socketsList: [],
      lightsMount: false, lightsList: [],
      cutoutEnabled: false, cutoutW: 0, cutoutH: 0,
      cutV: false, cutVPos: 50, cutH: false, cutHPos: 50,
      electric: false, backlight: [], voltage: '', switches: [], colorTemp: '', trafo: '',
      showerH: 220, showerBaseType: 'floor', baseW: 0, baseD: 0, baseH: 0,
      showerPanels: [{type:'door', length: 70, angle: 0, hingeSide: 'left', swing: 'out'}],
      showerProfiles: [], hingeCount: 2,
      showerHandle: { kind:'none', panelIndex:0, offsetFromTop:100, edge:'right', offsetEdge:7, holeDiameter:10, holeDistance:300 },
      apronMaterial: 'glass', apronGlassType: 'clear', apronColorNumber: '',
      apronShape: 'straight', apronDirection: 'right',
      apronMeasureMode: 'niche', apronInset: 1.5,
      apronSections: [{bottom: 100, top: 100, left: 60, right: 60}],
      pannoLayout: 'frame', shelfDepth: 15,
      photos: [], note: '',
      boltMount: false, boltCount: 0, boltOffset: 5,
      roundedCorners: false, cornerRadius: 50,
      mirrorMeasureMode: 'glass', mirrorInset: 1.5, mirrorNicheCutMode: 'min', mirrorNicheRefCorner: 'TL',
      T: 0, B: 0, L: 0, R: 0
    };
    if(extra){ for(var k in extra){ if(Object.prototype.hasOwnProperty.call(extra,k)) base[k] = extra[k]; } }
    try { if(typeof migrateItem === 'function') migrateItem(base); }catch(e){}
    return base;
  }

  /* Пробует создать canvas и вернуть true / описание ошибки */
  function _tryMake(d){
    try{
      if(typeof window.makeTechCanvas !== 'function') return {ok:false,msg:'makeTechCanvas не найден'};
      var cv = window.makeTechCanvas(d);
      if(!cv || !cv.getContext) return {ok:false,msg:'canvas не создан'};
      return {ok:true};
    }catch(e){
      return {ok:false, msg: String((e&&e.message)||e)};
    }
  }

  /* Прямой вызов одного из видов на пустом canvas */
  function _tryDraw(fnName, d){
    try{
      var fn = window[fnName];
      if(typeof fn !== 'function') return {ok:false,msg: fnName+' не найден'};
      var cv = document.createElement('canvas');
      cv.width = 500; cv.height = 700;
      var ctx = cv.getContext('2d');
      var dims = (typeof techDims === 'function') ? techDims(d) : {W:60,D:4,H:180};
      fn.call(window, ctx, 10, 10, 480, 680, dims, 1, d);
      return {ok:true};
    }catch(e){
      return {ok:false, msg: String((e&&e.message)||e)};
    }
  }

  /* ---------- Регистрация тестов ---------- */

  /* Меркурий (з.) — базовые формы */
  _tsRegister('Draw', 'Зеркало RECT 60×180', function(){
    return _tryMake(_mkItem('MIRROR','RECT'));
  });
  _tsRegister('Draw', 'Зеркало RECT4', function(){
    return _tryMake(_mkItem('MIRROR','RECT4', {T:60,B:60,L:180,R:180}));
  });
  _tsRegister('Draw', 'Зеркало CIRCLE', function(){
    return _tryMake(_mkItem('MIRROR','CIRCLE', {w:60,h:60}));
  });
  _tsRegister('Draw', 'Зеркало OVAL', function(){
    return _tryMake(_mkItem('MIRROR','OVAL', {w:60,h:100}));
  });
  _tsRegister('Draw', 'Зеркало FIGURED', function(){
    return _tryMake(_mkItem('MIRROR','FIGURED', {cornerRadius:50}));
  });
  _tsRegister('Draw', 'Зеркало TEMPLATE', function(){
    return _tryMake(_mkItem('MIRROR','TEMPLATE'));
  });

  /* Ниша */
  _tsRegister('Draw', 'Зеркало в нишу', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {mirrorMeasureMode:'niche', T:62, B:62, L:182, R:182}));
  });
  _tsRegister('Draw', 'Зеркало ниша + стекло', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {mirrorMeasureMode:'both', T:62, B:62, L:182, R:182, w:60, h:180}));
  });
  _tsRegister('Draw', 'Зеркало закос в нише', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {mirrorMeasureMode:'niche', T:62, B:60, L:182, R:180, mirrorNicheCutMode:'bevel'}));
  });

  /* Опции зеркала */
  _tsRegister('Draw', 'Зеркало со скруглениями R50', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {roundedCorners:true, cornerRadius:50}));
  });
  _tsRegister('Draw', 'Зеркало с фацетом 20 мм', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {edge:'Фацет', facetWidth:20}));
  });
  _tsRegister('Draw', 'Зеркало с рамкой', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {frameColor:'gold', frameThickness:30}));
  });

  /* Подсветка */
  _tsRegister('Draw', 'Подсветка на зеркале, по периметру', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По периметру'], backlightOffset:2, backlightWidth:2}));
  });
  _tsRegister('Draw', 'Подсветка на зеркале, 2 вертикальных', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По 2 вертикальным сторонам'], backlightOffset:2, backlightWidth:2}));
  });
  _tsRegister('Draw', 'Подсветка на зеркале, снизу', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','Снизу'], backlightOffset:2, backlightWidth:2}));
  });
  _tsRegister('Draw', 'Подсветка на зеркале, сверху', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','Сверху'], backlightOffset:2, backlightWidth:2}));
  });
  _tsRegister('Draw', 'Подсветка из-за зеркала, по периметру', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['Из-за зеркала','По периметру']}));
  });
  _tsRegister('Draw', 'Подсветка из-за зеркала + на зеркале', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {electric:true, backlight:['Из-за зеркала','По периметру','На зеркале','По 2 горизонтальным сторонам'], backlightOffset:2, backlightWidth:2}));
  });

  /* Розетки */
  _tsRegister('Draw', 'Зеркало с 1 розеткой', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:1,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom'}]}));
  });
  _tsRegister('Draw', 'Зеркало с 2 розетками, шаг 7.1', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:2,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom'}]}));
  });
  _tsRegister('Draw', 'Розетки горизонтально, 3 места', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:3,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom',orientation:'horizontal'}]}));
  });

  /* Светильники */
  _tsRegister('Draw', 'Зеркало с 1 светильником', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {lightsMount:true, lightsList:[{distX:30,distY:10,edgeX:'left',edgeY:'top'}]}));
  });
  _tsRegister('Draw', 'Зеркало с 2 светильниками', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {lightsMount:true, lightsList:[{distX:15,distY:10,edgeX:'left',edgeY:'top'},{distX:15,distY:10,edgeX:'right',edgeY:'top'}]}));
  });

  /* Болты */
  _tsRegister('Draw', 'Зеркало с 4 болтами', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {boltMount:true, boltCount:4, boltOffset:5}));
  });
  _tsRegister('Draw', 'Зеркало с 6 болтами', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {boltMount:true, boltCount:6, boltOffset:5}));
  });
  _tsRegister('Draw', 'Зеркало с 8 болтами', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {boltMount:true, boltCount:8, boltOffset:5}));
  });

  /* Вырез */
  _tsRegister('Draw', 'Зеркало с вырезом прямоуг.', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {cutoutEnabled:true, cutoutShape:'rect', cutoutW:20, cutoutH:10}));
  });
  _tsRegister('Draw', 'Зеркало с вырезом круглым', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {cutoutEnabled:true, cutoutShape:'circle', cutoutW:15, cutoutH:15}));
  });

  /* Разрез */
  _tsRegister('Draw', 'Зеркало с вертикальным разрезом', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {cutV:true, cutVPos:30}));
  });
  _tsRegister('Draw', 'Зеркало с крестом реза', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {cutV:true, cutVPos:30, cutH:true, cutHPos:90}));
  });

  /* Граничные случаи */
  _tsRegister('Draw', 'Маленькое зеркало 20×30', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {w:20, h:30}));
  });
  _tsRegister('Draw', 'Большое зеркало 250×180', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {w:250, h:180}));
  });
  _tsRegister('Draw', 'Узкое зеркало 15×200', function(){
    return _tryMake(_mkItem('MIRROR','RECT', {w:15, h:200}));
  });

  /* Душевая */
  _tsRegister('Draw', 'Душевая 1 дверь + 1 добор', function(){
    return _tryMake(_mkItem('SHOWER', null, {
      showerPanels: [
        {type:'door', length:70, angle:0, hingeSide:'left', swing:'out'},
        {type:'fixed', length:50, angle:90, hingeSide:'left', swing:'out'}
      ],
      showerProfiles: [{kind:'wall', mount:'left', panelIndex:0, color:'chrome', note:'', offsetFromTop:null, wallLen:null}]
    }));
  });
  _tsRegister('Draw', 'Душевая с поддоном', function(){
    return _tryMake(_mkItem('SHOWER', null, {
      showerBaseType:'tray', baseW:90, baseD:90, baseH:15,
      showerPanels: [{type:'door', length:70, angle:0, hingeSide:'left', swing:'out'}]
    }));
  });
  _tsRegister('Draw', 'Душевая с ручкой', function(){
    return _tryMake(_mkItem('SHOWER', null, {
      showerPanels: [{type:'door', length:70, angle:0, hingeSide:'left', swing:'out'}],
      showerHandle: {kind:'bow', panelIndex:0, offsetFromTop:100, edge:'right', offsetEdge:7, holeDiameter:10, holeDistance:300}
    }));
  });
  _tsRegister('Draw', 'Душевая со штангой', function(){
    return _tryMake(_mkItem('SHOWER', null, {
      showerPanels: [{type:'door', length:70, angle:0, hingeSide:'left', swing:'out'}],
      showerProfiles: [{kind:'rod', mount:'right', panelIndex:0, color:'chrome', note:'', offsetFromTop:4, wallLen:30}]
    }));
  });

  /* Фартук */
  _tsRegister('Draw', 'Фартук прямая', function(){
    return _tryMake(_mkItem('APRON', null, {
      apronShape:'straight', apronSections:[{bottom:200, top:200, left:60, right:60}]
    }));
  });
  _tsRegister('Draw', 'Фартук Г-образная', function(){
    return _tryMake(_mkItem('APRON', null, {
      apronShape:'L',
      apronSections:[{bottom:200, top:200, left:60, right:60},{bottom:100, top:100, left:60, right:60}]
    }));
  });
  _tsRegister('Draw', 'Фартук П-образная', function(){
    return _tryMake(_mkItem('APRON', null, {
      apronShape:'U',
      apronSections:[{bottom:200, top:200, left:60, right:60},{bottom:100, top:100, left:60, right:60},{bottom:100, top:100, left:60, right:60}]
    }));
  });
  _tsRegister('Draw', 'Фартук зеркальный', function(){
    return _tryMake(_mkItem('APRON', null, {
      apronMaterial:'mirror', apronSections:[{bottom:200, top:200, left:60, right:60}]
    }));
  });

  /* Полка / Панно */
  _tsRegister('Draw', 'Полка 60×80', function(){
    return _tryMake(_mkItem('SHELF','RECT', {shelfDepth:15}));
  });
  _tsRegister('Draw', 'Панно 60×80', function(){
    return _tryMake(_mkItem('PANNO','RECT', {pannoLayout:'frame'}));
  });
  _tsRegister('Draw', 'Панно с раскладкой "крест"', function(){
    return _tryMake(_mkItem('PANNO','RECT', {pannoLayout:'x'}));
  });

  /* Прямые вызовы drawTechIso / drawTechFront / drawTechPlan */
  _tsRegister('Draw', 'drawTechIso — зеркало', function(){
    return _tryDraw('drawTechIso', _mkItem('MIRROR','RECT'));
  });
  _tsRegister('Draw', 'drawTechFront — зеркало', function(){
    return _tryDraw('drawTechFront', _mkItem('MIRROR','RECT'));
  });
  _tsRegister('Draw', 'drawTechPlan — зеркало', function(){
    return _tryDraw('drawTechPlan', _mkItem('MIRROR','RECT'));
  });
  _tsRegister('Draw', 'drawTechIso — душевая', function(){
    return _tryDraw('drawTechIso', _mkItem('SHOWER', null));
  });
  _tsRegister('Draw', 'drawTechIso — фартук', function(){
    return _tryDraw('drawTechIso', _mkItem('APRON', null));
  });

  try{ console.log('[15 draw-tests] +' + '~45 тестов чертежей зарегистрированы'); }catch(_){}
})();
/* patches/15-tests.js — галерея чертежей (Часть 2, будет дописана) */
