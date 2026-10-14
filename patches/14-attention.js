/* patches/14-attention.js — Часть 1/2
   · Автоотметка событий при смене статуса заказа
   · «Требует внимания» — роль-зависимые триггеры
   · Напоминание 19:00 с фразами для 4 ролей
   Часть 2: оплата через событие
*/
(function(){
  if(window._zrz14AttentionP1) return;
  window._zrz14AttentionP1 = true;

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
  function daysAgo(ms){
    return Math.floor((Date.now() - ms) / 86400000);
  }
  function fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function clientName(o){
    try { return (typeof orderClientName === 'function') ? (orderClientName(o) || '') : ''; }catch(e){ return ''; }
  }
  function clientPhone(o){
    try { return (typeof orderClientPhone === 'function') ? (orderClientPhone(o) || '') : ''; }catch(e){ return ''; }
  }

  /* ============================================================
     1. АВТООТМЕТКА СОБЫТИЙ
     ============================================================ */
  var _autoCache = {};

  function runAutoMark(){
    var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    var changed = false;

    orders.forEach(function(o){
      if(!o) return;
      var key = o.id + ':' + o.status;
      if(_autoCache[key]) return;

      var targets = null;
      if(o.status === 'measure_done') targets = ['measure','remeasure'];
      else if(o.status === 'installed' || o.status === 'closed') targets = ['install','demontage'];
      else return;

      events.forEach(function(e){
        if(!e || e.orderId !== o.id) return;
        if(e.status === 'done') return;
        if(targets.indexOf(e.type) < 0) return;
        e.status = 'done';
        e.updatedAt = Date.now();
        changed = true;
      });
      _autoCache[key] = true;
    });

    if(changed){
      setTimeout(function(){
        try { if(typeof render === 'function') render(); }catch(e){}
      }, 200);
    }
  }

  function wrapSave(){
    if(window._zrz14SaveWrapped) return;
    if(typeof window.save !== 'function') return;
    var orig = window.save;
    window.save = function(){
      try { runAutoMark(); }catch(e){}
      return orig.apply(this, arguments);
    };
    window._zrz14SaveWrapped = true;
  }

  setTimeout(runAutoMark, 3000);

  /* ============================================================
     2. «ТРЕБУЕТ ВНИМАНИЯ» — ТРИГГЕРЫ ПО РОЛЯМ
     ============================================================ */
  function calcAttention(u){
    var items = [];
    if(!u) return items;
    var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    var routes = (window.db && Array.isArray(db.routes)) ? db.routes : [];
    var tk = todayKey();

    try {
      /* ---------- АДМИН / МЕНЕДЖЕР ---------- */
      if(u.role === 'admin' || u.role === 'manager'){
        events.forEach(function(e){
          if(e.type !== 'measure' && e.type !== 'remeasure') return;
          if(!e.date || e.date > tk) return;
          if(e.date === tk && e.time){
            var tm = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes(e.time) : null;
            if(tm != null){
              var now = new Date();
              var nowMin = now.getHours()*60 + now.getMinutes();
              if(nowMin - tm < 12*60) return;
            }
          }
          var o = orders.find(function(x){ return x.id === e.orderId; });
          if(!o) return;
          if(o.status !== 'lead' && o.status !== 'measure_scheduled') return;
          var when = e.date === tk ? Date.now() : new Date(e.date).getTime();
          items.push({
            ico:'📏',
            title:'Замер не внесён',
            sub:'№'+(o.orderNum||'—')+' · '+(clientName(o)||'')+' · '+daysAgo(when)+' дн.',
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });

        orders.forEach(function(o){
          if(o.status !== 'paused') return;
          var since = o.statusChangedAt || o.updatedAt || o.createdAt || Date.now();
          var d = daysAgo(since);
          if(d < 3) return;
          items.push({
            ico:'⏸',
            title:'На паузе '+d+' дн.',
            sub:'№'+(o.orderNum||'—')+' · '+(clientName(o)||'')+(o.pausedReason?' · '+o.pausedReason:''),
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });

        orders.forEach(function(o){
          var total = Number(o.orderTotal)||0;
          var paid = Number(o.orderPaid)||0;
          if(total <= paid) return;
          if(o.status === 'closed' || o.status === 'declined') return;
          var since = o.statusChangedAt || o.updatedAt || o.createdAt || Date.now();
          var d = daysAgo(since);
          if(d < 30) return;
          items.push({
            ico:'💰',
            title:'Долг '+d+' дн.',
            sub:'№'+(o.orderNum||'—')+' · '+(clientName(o)||'')+' · '+fmtMoney(total-paid)+' ₽',
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });

        events.forEach(function(e){
          if(e.date !== tk) return;
          if(e.status === 'done') return;
          if(Array.isArray(e.assignedUserIds) && e.assignedUserIds.length) return;
          var o = orders.find(function(x){ return x.id === e.orderId; });
          items.push({
            ico:'👥',
            title:'Событие без команды',
            sub:(e.time||'—')+' · №'+(o?(o.orderNum||'—'):'—')+' · '+((typeof eventTypeLabel==='function')?eventTypeLabel(e.type||'measure'):'Событие'),
            actions:[{label:'Открыть', act:'open_event', eid:e.id}]
          });
        });
      }

      /* ---------- МАСТЕР ---------- */
      else if(u.role === 'master'){
        orders.forEach(function(o){
          if(o.status !== 'work') return;
          var since = o.updatedAt || o.createdAt || Date.now();
          var d = daysAgo(since);
          if(d < 21) return;
          items.push({
            ico:'🔧',
            title:'В работе '+d+' дн. без движения',
            sub:'№'+(o.orderNum||'—')+' · '+(clientName(o)||''),
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });
        orders.forEach(function(o){
          if(o.status !== 'ready') return;
          var since = o.updatedAt || o.createdAt || Date.now();
          var d = daysAgo(since);
          if(d < 14) return;
          items.push({
            ico:'🚚',
            title:'Готов '+d+' дн., монтажа нет',
            sub:'№'+(o.orderNum||'—')+' · '+(clientName(o)||''),
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });
      }

      /* ---------- ЗАМЕРЩИК-МОНТАЖНИК ---------- */
      else if(u.role === 'surveyor'){
        var uid = u.id;
        var today = events.filter(function(e){
          if(!e || e.date !== tk) return false;
          if(!Array.isArray(e.assignedUserIds)) return false;
          return e.assignedUserIds.indexOf(uid) >= 0;
        });

        events.forEach(function(e){
          if(e.date !== tk) return;
          if(e.status === 'done') return;
          if(Array.isArray(e.assignedUserIds) && e.assignedUserIds.length) return;
          items.push({
            ico:'👥',
            title:'Событие без команды',
            sub:(e.time||'—')+' · '+((typeof eventTypeLabel==='function')?eventTypeLabel(e.type||'measure'):'Событие'),
            actions:[{label:'Открыть', act:'open_event', eid:e.id}]
          });
        });

        var now = new Date();
        var nowMin = now.getHours()*60 + now.getMinutes();
        today.forEach(function(e){
          if(e.status === 'done') return;
          var tm = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes(e.time) : null;
          if(tm == null) return;
          if(nowMin - tm < 60) return;
          var o = orders.find(function(x){ return x.id === e.orderId; });
          if(!o) return;
          if(o.status === 'measure_done' || o.status === 'installed' || o.status === 'closed') return;
          items.push({
            ico:'📝',
            title:'Данные не внесены',
            sub:(e.time||'')+' · '+(clientName(o)||'')+' — передай менеджеру',
            actions:[{label:'Открыть', act:'open_event', eid:e.id}]
          });
        });

        today.forEach(function(e){
          var o = e.orderId ? orders.find(function(x){ return x.id === e.orderId; }) : null;
          if(!o) return;
          if(clientPhone(o)) return;
          items.push({
            ico:'📞',
            title:'Нет телефона клиента',
            sub:(e.time||'')+' · '+(clientName(o)||'Заказ')+' — не позвонишь',
            actions:[{label:'Открыть', act:'open_order', oid:o.id}]
          });
        });

        if(today.length >= 4){
          items.push({
            ico:'🗓',
            title:'Плотный день: '+today.length+' событий',
            sub:'Может, что-то перенести?',
            actions:[]
          });
        }
      }

      /* ---------- ВОДИТЕЛЬ ---------- */
      else if(u.role === 'driver'){
        var todayRoutes = routes.filter(function(r){ return r && r.date === tk; });

        todayRoutes.forEach(function(r){
          var pts = Array.isArray(r.points) ? r.points : [];

          if(!r.time && !r.startTime && pts.length && !pts[0].time){
            items.push({
              ico:'⏰',
              title:'Маршрут без времени старта',
              sub:(r.title||'Маршрут')+' — когда выезжать?',
              actions:[{label:'Открыть', act:'open_route', rid:r.id}]
            });
          }

          var noPhone = 0, noAddr = 0;
          pts.forEach(function(p){
            if(p.kind === 'order'){
              var o = orders.find(function(x){ return x.id === p.refId; });
              if(o){
                if(!clientPhone(o)) noPhone++;
                if(!(o.addressId || (o.snapshot && o.snapshot.addressFull))) noAddr++;
              }
            } else if(p.kind === 'custom'){
              if(!p.addressId && !p.label) noAddr++;
            }
          });
          if(noPhone > 0){
            items.push({
              ico:'📞',
              title:noPhone+' точек без телефона',
              sub:(r.title||'Маршрут')+' — не связаться',
              actions:[{label:'Открыть', act:'open_route', rid:r.id}]
            });
          }
          if(noAddr > 0){
            items.push({
              ico:'📍',
              title:noAddr+' точек без адреса',
              sub:(r.title||'Маршрут')+' — не построить маршрут',
              actions:[{label:'Открыть', act:'open_route', rid:r.id}]
            });
          }

          if(pts.length >= 5){
            items.push({
              ico:'🗓',
              title:'Плотный день: '+pts.length+' точек',
              sub:(r.title||'Маршрут')+' — всё успеть?',
              actions:[{label:'Открыть', act:'open_route', rid:r.id}]
            });
          }
        });
      }
    }catch(e){ try{console.warn('[14] calcAttention', e);}catch(_){} }

    var seen = {};
    items = items.filter(function(it){
      var k = it.title + '|' + it.sub;
      if(seen[k]) return false;
      seen[k] = true;
      return true;
    });

    return items.slice(0, 6);
  }

  function buildAttHtml(items){
    var html = '<div class="zrz-att">';
    html += '<div class="zrz-att-head">🔥 Требует внимания</div>';
    items.forEach(function(it){
      html += '<div class="zrz-att-item">'
        + '<div class="zrz-att-ico">'+esc2(it.ico)+'</div>'
        + '<div class="zrz-att-body">'
        +   '<div class="zrz-att-title">'+esc2(it.title)+'</div>'
        +   '<div class="zrz-att-sub">'+esc2(it.sub)+'</div>'
        + '</div>';
      if(it.actions && it.actions.length){
        html += '<div class="zrz-att-actions">';
        it.actions.forEach(function(a){
          var act = '';
          if(a.act === 'open_order') act = 'zrzDashOpenOrder('+a.oid+')';
          if(a.act === 'open_event') act = 'zrzDashOpenEvent('+a.eid+')';
          if(a.act === 'open_route') act = 'zrz14OpenRoute('+a.rid+')';
          html += '<button type="button" class="zrz-att-btn" onclick="'+act+'">'+esc2(a.label)+'</button>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  window.zrz14OpenRoute = function(rid){
    try { if(typeof openRoute === 'function') return openRoute(rid); }catch(e){}
  };

  function rewriteAttentionBlock(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      var items = calcAttention(u);
      var old = document.querySelector('.zrz-att');

      if(!items.length){
        if(old) old.remove();
        return;
      }

      var html = buildAttHtml(items);

      if(old){
        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        old.parentNode.replaceChild(wrap.firstChild, old);
        return;
      }

      var anchor = document.querySelector('.zrz-dash-head') || document.querySelector('.zrz-kpi');
      if(anchor && anchor.parentNode){
        var wrap2 = document.createElement('div');
        wrap2.innerHTML = html;
        anchor.parentNode.insertBefore(wrap2.firstChild, anchor.nextSibling);
      }
    }catch(e){ try{console.warn('[14] rewriteAtt', e);}catch(_){} }
  }

  function wrapRender(){
    if(window._zrz14RenderWrapped) return;
    if(typeof window.render !== 'function') return;
    var orig = window.render;
    window.render = function(){
      var r = orig.apply(this, arguments);
      setTimeout(rewriteAttentionBlock, 60);
      return r;
    };
    window._zrz14RenderWrapped = true;
  }

  /* ============================================================
     3. НАПОМИНАНИЕ 19:00 + ФРАЗЫ
     ============================================================ */

  var PHRASES = {
    surveyor: [
      'Спи, размеры во сне не меняются — проверено',
      'Пусть завтра ниша окажется прямее, чем ты думал',
      'Замерь один раз — спи спокойно всю ночь',
      'Клиент сказал «примерно 80» — спи, разберёмся утром',
      'Рулетка на столе, совесть чиста',
      'Пусть завтра стены будут из гипсокартона, а не из кирпича',
      'Спи, у соседей сверху тоже есть перфоратор',
      'Кто замеряет нишу — тот знает цену ровным углам',
      'Завтра домофон откроют с первого раза. Хотя бы раз в жизни',
      'Спи, зеркало само себя не повесит — но утром повесишь',
      'Ниша 79.5 см — и ты весь день об этом думаешь',
      'Спи спокойно, паркинг не займут до утра',
      'Уровень в сумке, надежда в сердце',
      'Завтра, возможно, попадёшь в лифт с первого раза',
      'Спи, силикон подсохнет сам',
      'Кто мерил сталинку — тот не боится ничего',
      'Спи, электрика в стене там, где ты её не ждёшь',
      'Завтра клиент не будет смотреть в телефон, пока ты меришь',
      'Спи, сверло не сломается в первом отверстии',
      'Если замер идеален — ты в правильной профессии',
      'Спи, дозамер утром покажет, что вчера ты был прав',
      'Фартук по уровню — и жизнь удалась',
      'Спи, подъезд не будет пахнуть вчерашним борщом',
      'Кто ставит душевые — тот знает, где протечёт',
      'Спи, герметик не потечёт вниз',
      'Завтра зеркало встанет ровно, а клиент скажет «спасибо»',
      'Спи, ниша не расширится, сколько её ни проси',
      'Кто мерил панно — тот видел всё',
      'Спи, шуруповёрт заряжен на 100%',
      'Спокойной ночи, завтра снова ниши, стены и вера в ровные углы'
    ],
    master: [
      'Стекло подождёт — оно терпеливое',
      'Спи, сколы появляются только в рабочее время',
      'Фацет блестит даже во сне — не переживай',
      'Кто режет стекло — тот умеет дышать медленно',
      'Спи, клей подсохнет, а ты — отдохни',
      'Завтра фреза будет острее, чем сегодня. Возможно',
      'Спи, стружка в кроссовках — это норма жизни',
      'Кто варит зеркала — тот знает, что счастье в точности',
      'Замер по чертежу сошёлся — можно спать',
      'Спи, шлифмашинка тихая, когда спит хозяин',
      'Кромка ровная — душа поёт',
      'Спи, скол в углу — это дизайн, не брак',
      'Кто душевые собирает — тот знает, что такое терпение',
      'Спи, стеклорез сам не порежет',
      'Полировка — она как медитация, только в маске',
      'Спи, пыль от шлифовки за ночь осядет',
      'Стекло не бьётся, пока ты спишь. Проверено',
      'Спи, утром полки, вечером — опять полки',
      'Кто фацет делает — тот ценит тишину',
      'Спи, сверло не уведёт в сторону — оно тоже устало',
      'Замер по шаблону — и счастье в цеху',
      'Спи, закалка утром снова испортит планы',
      'Отполировал — можно и поспать',
      'Спи, герметик не подведёт',
      'Кто зеркала режет — тот спит с чистой совестью',
      'Спи, стеллаж выдержит любые стёкла',
      'Заказ закроется завтра. Наверное',
      'Спи, цех стоит, а ты — жив',
      'Панно почти готово — спи со спокойной душой',
      'Спокойной ночи, завтра снова шум, пыль и красивое стекло'
    ],
    manager: [
      'Спи, клиент сказал «я подумаю» — это уже победа',
      'Заявка с 11 вечера? Она подождёт до 9 утра',
      'Спи, прайс не подорожает до завтра. Наверное',
      'Кто продаёт зеркала — тот знает, что клиент всегда прав. Иногда',
      'Спи, клиент не передумает. Хотя может',
      'Замерщик опоздает — а виноват почему-то ты',
      'Спи, счёт никто не оспорит. Хотя один раз был случай',
      'Кто с заявками работает — тот спит с телефоном',
      'Спи, «дешевле» — это не вопрос, это диагноз',
      'Клиент хочет «как на картинке» — спи, завтра разберёмся',
      'Спи, тендер на 5 зеркал не выиграют без тебя',
      'Цифры в CRM сойдутся. Возможно, не с первого раза',
      'Спи, зарплата завтра. Или послезавтра',
      'Кто менеджер — тот знает, что заказчик всегда торопится',
      'Спи, тендер — не война, но близко',
      'Клиент не позвонит в 23:47. Ладно, может позвонит',
      'Спи, договор не сам себя подпишет',
      'Кто обещал скидку — тот теперь думает, как выкрутиться',
      'Спи, душевая сама не продастся, но утром — продашь',
      'Замер назначен — 50% успеха. Спи',
      'Спи, клиент оставил номер — значит, вернётся',
      'Прайс не убежит, а вот кофе — убежал',
      'Спи, договор подпишут. Может, даже сегодня. Может',
      'Кто работал с клиентами — тот спит глубоко и без снов',
      'Спи, маржа не уйдёт к конкурентам за ночь',
      'Звонок в 8 утра — это уже традиция',
      'Спи, клиент всё ещё выбирает между тобой и «подумать»',
      'Кто заключает сделки — тот умеет ждать',
      'Спи, касса утром снова полная. Или почти',
      'Спокойной ночи, завтра снова всех спасёшь'
    ],
    driver: [
      'Пусть зеркало доедет без трещин',
      'Стекло пристёгнуто — совесть чиста',
      'Завтра дорога, сегодня — диван',
      'Ключи на крючок, проблемы на потом',
      'Ночь без пробок — уже маленькое счастье',
      'Спи, навигатор утром вспомнит, куда ехать',
      'Кто возит зеркала — тот знает, где все лежачие полицейские',
      'Спи, клиент «в пяти минутах» — это всего час по факту',
      'Дорога — она как жизнь: главное не торопиться',
      'Спи, грузчик завтра будет сильным. Обещал',
      'Кто стёкла возил — тот видел истину',
      'Спи, мотор остыл, можно и голову остудить',
      'Парковка у бизнес-центра — отдельный вид спорта',
      'Спи, зеркало в стойке, трещины не заведутся',
      'Кто доставлял панно — тот знает, как звучит тишина',
      'Спи, пробки спят до 7 утра',
      'Фура обгоняет — а ты потом догоняешь карму',
      'Спи, шиномонтаж утром закроется сам',
      'Кто возит душевые — тот умеет тормозить мягко',
      'Спи, бампер не поцарапается сам',
      'Заправка через дорогу — а счастье через сон',
      'Спи, гаишники тоже люди. Иногда',
      'Кто за рулём весь день — тот ночью спит как убитый',
      'Спи, утренний выезд не отменяется',
      'Двор — это тоже дорога, просто с эмоциями',
      'Спи, бензин не подорожает до утра. Хотя может',
      'Кто первый встал — тот без пробок',
      'Спи, стёкла привязаны крепче, чем твои нервы',
      'Доставка — не работа, а образ жизни',
      'Спокойной ночи, дорога подождёт до рассвета'
    ]
  };

  function pickPhrase(role){
    var arr = PHRASES[role];
    if(!arr || !arr.length) return '';
    var key = 'zrz_phrase_last_' + role;
    var last = '';
    try { last = localStorage.getItem(key) || ''; }catch(e){}
    var pool = arr.filter(function(p){ return p !== last; });
    if(!pool.length) pool = arr;
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(key, chosen); }catch(e){}
    return chosen;
  }

  var EVENT_PLURAL = {
    measure:'Замеров', remeasure:'Дозамеров', install:'Монтажей',
    demontage:'Демонтажей', delivery:'Доставок', purchase:'Закупок',
    return:'Возвратов', tempering_out:'Закалок', tempering_in:'Закалок',
    meeting:'Встреч'
  };

  function buildBreakdown(events){
    var counts = {};
    events.forEach(function(e){
      var t = e.type || 'measure';
      counts[t] = (counts[t]||0) + 1;
    });
    var parts = [];
    Object.keys(counts).forEach(function(k){
      parts.push((EVENT_PLURAL[k]||'Событий') + ': ' + counts[k]);
    });
    return parts.join(' · ');
  }

  function getReminderStamp(uid){
    try { return localStorage.getItem('zrz_evening_reminder_' + uid) || ''; }catch(e){ return ''; }
  }
  function setReminderStamp(uid, v){
    try { localStorage.setItem('zrz_evening_reminder_' + uid, v); }catch(e){}
  }

  function buildReminderFor(u){
    var tk = todayKey();
    var orders = (window.db && Array.isArray(db.orders)) ? db.orders : [];
    var events = (window.db && Array.isArray(db.events)) ? db.events : [];
    var routes = (window.db && Array.isArray(db.routes)) ? db.routes : [];

    /* МОНТАЖНИК */
    if(u.role === 'surveyor'){
      var mine = events.filter(function(e){
        if(!e || e.date !== tk) return false;
        if(!Array.isArray(e.assignedUserIds)) return false;
        return e.assignedUserIds.indexOf(u.id) >= 0;
      });
      if(!mine.length){
        return {
          title: '🌆 Рабочий день закончен',
          body: 'Сегодня без выездов\n\n' + pickPhrase('surveyor')
        };
      }
      var allDone = mine.every(function(e){ return e.status === 'done'; });
      var bd = buildBreakdown(mine);
      if(allDone){
        return {
          title: '🌆 Рабочий день закончен',
          body: bd + '\n✅ Всё внесено, красавчик!\n\n' + pickPhrase('surveyor')
        };
      }
      return {
        title: '🌆 Рабочий день закончен',
        body: bd + '\n⚠️ Внеси данные — команда ждёт\n\n' + pickPhrase('surveyor')
      };
    }

    /* МАСТЕР */
    if(u.role === 'master'){
      var work = orders.filter(function(o){ return o.status === 'work'; });
      var ready = orders.filter(function(o){ return o.status === 'ready'; });
      var body = '';
      if(work.length) body += 'В работе: ' + work.length + ' заказ' + (work.length===1?'':'ов') + '\n';
      if(ready.length) body += 'Готово к передаче: ' + ready.length + '\n';
      if(!body) body = 'Сегодня всё по нулям\n';
      body += '\n' + pickPhrase('master');
      return {
        title: '🌆 Рабочий день закончен',
        body: body.trim()
      };
    }

    /* МЕНЕДЖЕР */
    if(u.role === 'manager'){
      var allToday = events.filter(function(e){ return e && e.date === tk; });
      if(!allToday.length){
        return {
          title: '🌆 Рабочий день закончен',
          body: 'Событий сегодня не было\n\n' + pickPhrase('manager')
        };
      }
      var bdM = buildBreakdown(allToday);
      return {
        title: '🌆 Рабочий день закончен',
        body: bdM + '\n' + pickPhrase('manager')
      };
    }

    /* ВОДИТЕЛЬ */
    if(u.role === 'driver'){
      var myRoutes = routes.filter(function(r){ return r && r.date === tk && r.assignedUserId === u.id; });
      if(!myRoutes.length){
        return {
          title: '🌆 Рабочий день закончен',
          body: 'Сегодня без маршрутов\n\n' + pickPhrase('driver')
        };
      }
      var totalPts = 0;
      myRoutes.forEach(function(r){ totalPts += (Array.isArray(r.points)?r.points.length:0); });
      return {
        title: '🌆 Рабочий день закончен',
        body: 'Маршрутов: ' + myRoutes.length + ' · Точек: ' + totalPts + '\n\n' + pickPhrase('driver')
      };
    }

    return null;
  }

  function fireReminder(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u) return;
      if(u.role === 'admin') return;
      if(!('Notification' in window) || Notification.permission !== 'granted') return;

      var tk = todayKey();
      if(getReminderStamp(u.id) === tk) return;

      var now = new Date();
      var h = now.getHours();
      if(h < 19) return;

      var r = buildReminderFor(u);
      if(!r) return;

      try {
        if(typeof createNotification === 'function'){
          createNotification({
            userId: u.id,
            type: 'reminder',
            title: r.title,
            body: r.body
          });
        }
      }catch(e){}

      setReminderStamp(u.id, tk);
    }catch(e){ try{console.warn('[14] reminder', e);}catch(_){} }
  }

  function initReminderLoop(){
    if(window._zrz14ReminderBound) return;
    window._zrz14ReminderBound = true;
    setTimeout(fireReminder, 4000);
    setInterval(fireReminder, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') fireReminder();
    });
  }

  window.zrz14TestReminder = function(){
    try {
      var u = (typeof currentUser === 'function') ? currentUser() : null;
      if(!u){ return; }
      try { localStorage.removeItem('zrz_evening_reminder_' + u.id); }catch(e){}
      var r = buildReminderFor(u);
      if(!r){ if(typeof uiAlert === 'function') uiAlert('Для этой роли нет текста'); return; }
      if(typeof createNotification === 'function'){
        createNotification({ userId: u.id, type:'reminder', title:r.title, body:r.body });
      }
      if(typeof uiAlert === 'function') uiAlert('Проверка напоминания:\n\n'+r.title+'\n\n'+r.body);
    }catch(e){}
  };

  /* ============================================================
     4. CSS
     ============================================================ */
  function injectCss(){
    if(document.getElementById('zrz-attention-css')) return;
    var css = ''
      + '.zrz-att{margin:8px 0 16px;padding:14px;border-radius:18px;'
      +   'background:linear-gradient(180deg,rgba(217,146,74,0.10),rgba(217,146,74,0.03));'
      +   'border:1.5px solid rgba(217,146,74,0.30)}'
      + 'html[data-theme="dark"] .zrz-att{background:linear-gradient(180deg,rgba(224,168,102,0.12),rgba(224,168,102,0.04));border-color:rgba(224,168,102,0.32)}'
      + '.zrz-att-head{font-size:12.5px;font-weight:800;color:#8a5a0c;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
      + 'html[data-theme="dark"] .zrz-att-head{color:#e0a866}'
      + '.zrz-att-item{display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--surface);border-radius:12px;margin-bottom:8px;border:1px solid rgba(217,146,74,0.15)}'
      + '.zrz-att-item:last-child{margin-bottom:0}'
      + '.zrz-att-ico{font-size:20px;line-height:1;flex-shrink:0;padding-top:2px}'
      + '.zrz-att-body{flex:1;min-width:0}'
      + '.zrz-att-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:2px}'
      + '.zrz-att-sub{font-size:12px;color:var(--muted);line-height:1.4;word-break:break-word}'
      + '.zrz-att-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}'
      + '.zrz-att-btn{padding:6px 12px;border-radius:10px;border:none;background:var(--accent-soft);color:var(--accent-deep);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}'
      + '.zrz-att-btn:active{background:var(--accent-line);transform:scale(0.96)}'
      ;
    var st = document.createElement('style');
    st.id = 'zrz-attention-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapSave(); }catch(e){}
    try { wrapRender(); }catch(e){}
    try { initReminderLoop(); }catch(e){}
    try { rewriteAttentionBlock(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 500);
  setTimeout(apply, 1500);

  var _iv = setInterval(function(){
    try { wrapSave(); }catch(e){}
    try { wrapRender(); }catch(e){}
    try { rewriteAttentionBlock(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[14 p1] автоотметка + внимание + напоминание 19:00 — активны'); }catch(_){}
})();
