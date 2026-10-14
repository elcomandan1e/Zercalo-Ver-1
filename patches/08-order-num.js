/* patches/08-order-num.js — быстрое редактирование номера заказа
   · Тап на номер (в списке или в деталях) → модалка
   · Изменить номер вручную (до 40 символов)
   · Вернуть автонумерацию (если был ручной)
   · Только для тех, у кого есть право редактировать заказ
*/
(function(){
  if(window._zrz08OrderNum) return;
  window._zrz08OrderNum = true;

  /* ---------- Проверка прав ---------- */
  function canEditNum(o){
    try { return (typeof canEditOrder === 'function') && canEditOrder(o); } catch(e){ return false; }
  }

  /* ---------- Экранирование ---------- */
  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ---------- Открытие модалки ---------- */
  function openEditModal(orderId){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); } catch(e){}
    if(!o){ return; }
    if(!canEditNum(o)){
      try { if(typeof uiAlert === 'function') uiAlert('Нет прав на изменение номера'); }catch(_){}
      return;
    }
    try { if(typeof haptic === 'function') haptic(6); } catch(_){}

    var currentNum = o.orderNum || '';
    var isManual = !!o.manualNum;

    var html = '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' Номер заказа</h2>';
    html += '<div class="modal-crumbs"><span>Заказ</span><span class="bc-sep">/</span><span class="bc-cur">Номер</span></div>';
    html += '<label>Номер заказа</label>';
    html += '<input id="zrz_num_input" type="text" maxlength="40" value="' + esc2(currentNum) + '" autocomplete="off" spellcheck="false">';
    html += '<div id="zrz_num_hint" style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">'
      + (isManual
          ? '✏️ Ручная нумерация активна. Можно изменить номер или вернуть автонумерацию.'
          : '🔄 Автонумерация. Если задать номер вручную — счётчик для этого дня отключится.')
      + '</div>';
    html += '<div class="draft-notice" style="margin-top:14px">'
      + '<b>Формат автонумерации:</b> <b>ДД/ММ</b> или <b>ДД/ММ-N</b>, '
      + 'где N — порядковый номер заказа в этот день.'
      + '</div>';
    html += '<button class="btn btn-primary" onclick="zrzSaveOrderNum(' + orderId + ')">Сохранить</button>';
    if(isManual){
      html += '<button class="btn btn-secondary" onclick="zrzResetOrderNum(' + orderId + ')">↺ Вернуть автонумерацию</button>';
    }
    html += '<button class="btn btn-secondary" onclick="closeModal()">Отмена</button>';

    try {
      if(typeof showModal === 'function'){
        showModal(html);
      } else {
        if(typeof uiAlert === 'function') uiAlert('showModal недоступен');
        return;
      }
    } catch(e){
      try { console.warn('[08-order-num] showModal', e); }catch(_){}
      return;
    }

    setTimeout(function(){
      var inp = document.getElementById('zrz_num_input');
      if(inp){
        try { inp.focus(); inp.select(); }catch(e){}
        inp.addEventListener('keydown', function(e){
          if(e.key === 'Enter'){ e.preventDefault(); window.zrzSaveOrderNum(orderId); }
        });
      }
    }, 120);
  }

  /* ---------- Сохранение ---------- */
  window.zrzSaveOrderNum = function(orderId){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); } catch(e){}
    if(!o) return;
    if(!canEditNum(o)){ try{ uiAlert('Нет прав'); }catch(_){}; return; }

    var inp = document.getElementById('zrz_num_input');
    if(!inp) return;
    var v = String(inp.value || '').trim();

    if(!v){
      try{ uiAlert('Введите номер заказа'); }catch(_){}
      return;
    }
    if(v.length > 40){
      try{ uiAlert('Максимум 40 символов'); }catch(_){}
      return;
    }
    /* Если номер не изменился и он уже ручной — просто закрыть */
    if(v === (o.orderNum || '') && o.manualNum){
      try{ if(typeof closeModal === 'function') closeModal(); }catch(_){}
      return;
    }

    o.orderNum = v;
    o.manualNum = true;
    try { if(typeof touch === 'function') touch(o); }catch(_){}
    try { if(typeof save === 'function') save(); }catch(_){}
    try { if(typeof haptic === 'function') haptic([15, 40, 15]); }catch(_){}

    try { if(typeof closeModal === 'function') closeModal(); }catch(_){}
    setTimeout(function(){
      try { if(typeof render === 'function') render(); }catch(_){}
    }, 80);
  };

  /* ---------- Возврат автонумерации ---------- */
  window.zrzResetOrderNum = async function(orderId){
    var o = null;
    try { o = db.orders.find(function(x){ return x.id === orderId; }); } catch(e){}
    if(!o) return;
    if(!canEditNum(o)){ try{ uiAlert('Нет прав'); }catch(_){}; return; }

    var ok = false;
    try {
      ok = await uiConfirm(
        'Вернуть автонумерацию?\n\nНомер пересчитается автоматически по порядку в этот день.',
        'Автонумерация',
        { yesLabel: 'Вернуть' }
      );
    } catch(e){ ok = false; }
    if(!ok) return;

    o.manualNum = false;
    try {
      var dk = (typeof orderDateKey === 'function') ? orderDateKey(o) : '';
      if(dk && typeof renumberDayOrders === 'function') renumberDayOrders(dk);
    } catch(e){}
    try { if(typeof touch === 'function') touch(o); }catch(_){}
    try { if(typeof save === 'function') save(); }catch(_){}
    try { if(typeof haptic === 'function') haptic([15, 40, 15]); }catch(_){}

    try { if(typeof closeModal === 'function') closeModal(); }catch(_){}
    setTimeout(function(){
      try { if(typeof render === 'function') render(); }catch(_){}
      try { if(typeof uiAlert === 'function') uiAlert('Номер: ' + (o.orderNum || '—')); }catch(_){}
    }, 100);
  };

  /* ---------- Перехват тапа по номеру ---------- */

  function findOrderIdFromEl(el){
    if(!el) return null;

    /* В деталях заказа — номер .order-num-lg, используем currentOrderId */
    if(el.classList && el.classList.contains('order-num-lg')){
      try { return (typeof currentOrderId !== 'undefined') ? currentOrderId : null; }catch(e){ return null; }
    }

    /* В списке — .order-num внутри .swipe-wrap[data-oid] */
    var wrap = el.closest && el.closest('.swipe-wrap[data-oid]');
    if(wrap){
      var v = parseInt(wrap.getAttribute('data-oid'), 10);
      if(v) return v;
    }

    /* Fallback — ищем в onclick у ближайшей .card */
    var card = el.closest && el.closest('.card');
    if(card){
      var oc = card.getAttribute('onclick') || '';
      var m = oc.match(/openOrder\((\d+)\)/);
      if(m) return parseInt(m[1], 10);
    }
    return null;
  }

  function bindNumClick(){
    if(window._zrz08NumClickBound) return;
    window._zrz08NumClickBound = true;

    document.addEventListener('click', function(e){
      var el = e.target.closest && e.target.closest('.order-num, .order-num-lg');
      if(!el) return;

      var oid = findOrderIdFromEl(el);
      if(!oid) return;

      var o = null;
      try { o = db.orders.find(function(x){ return x.id === oid; }); }catch(_){}
      if(!o) return;
      if(!canEditNum(o)) return; /* без прав — пусть ядро обработает как обычно */

      e.preventDefault();
      e.stopPropagation();
      openEditModal(oid);
    }, true);
  }

  /* ---------- CSS: подсказка, что номер кликабельный ---------- */

  function injectCss(){
    if(document.getElementById('zrz-order-num-css')) return;
    var css = ''
      + '.order-num, .order-num-lg{cursor:pointer;transition:transform .12s ease,filter .15s ease}'
      + '.order-num:hover, .order-num-lg:hover{filter:brightness(1.08)}'
      + '.order-num:active, .order-num-lg:active{transform:scale(0.96)}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-order-num-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- Запуск ---------- */

  function apply(){
    try { injectCss(); }catch(e){}
    try { bindNumClick(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  try{ console.log('[08-order-num] редактирование номера заказа активно'); }catch(_){}
})();
