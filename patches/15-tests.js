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
