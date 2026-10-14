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
/* patches/14-attention.js — Часть 2/2 · Оплата через событие
   · Флаг «Взять оплату» + сумма в форме события
   · Забрать у клиента / Передать поставщику (для Закупки и Встречи)
   · Кнопка «Забрал N ₽» у замерщика и водителя
   · Частичный приём → уведомление менеджеру
   · Отмена приёма денег
   · Сумма хранится в событии, заказ не трогаем
*/
(function(){
  if(window._zrz14PaymentP2) return;
  window._zrz14PaymentP2 = true;

  function esc2(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fmtMoney(n){
    return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function numVal(v){
    return parseFloat(String(v==null?'':v).replace(',', '.')) || 0;
  }
  function clientName(o){
    try { return (typeof orderClientName === 'function') ? (orderClientName(o) || '') : ''; }catch(e){ return ''; }
  }

  /* Типы событий, где доступно «Взять оплату» (по ролям) */
  var PAYMENT_TYPES = {
    driver:    ['delivery', 'return', 'purchase', 'meeting'],
    surveyor:  ['measure', 'remeasure', 'install', 'demontage', 'meeting']
  };

  /* Двусторонний обмен — для этих типов можно и «Забрать», и «Передать» */
  var BIDIRECTIONAL_TYPES = ['purchase', 'meeting'];

  /* ============================================================
     1. РАСЧЁТ «ПОЛУЧЕНО / ОСТАТОК»
     ============================================================ */

  function calcPaymentState(e){
    if(!e) return null;
    if(!e.paymentEnabled) return null;

    var want = numVal(e.paymentAmount);           /* сколько забрать у клиента */
    var give = numVal(e.paymentGiveAmount);       /* сколько передать поставщику */
    var got  = numVal(e.paymentReceivedAmount);   /* сколько фактически получили */

    return {
      want: want,
      give: give,
      got: got,
      received: !!e.paymentReceived,
      receivedAt: e.paymentReceivedAt || 0,
      receivedBy: e.paymentReceivedBy || null,
      short: (want > 0 && got < want) ? (want - got) : 0,
      isBi: BIDIRECTIONAL_TYPES.indexOf(e.type) >= 0
    };
  }

  /* ============================================================
     2. ФОРМА СОБЫТИЯ — добавляем секцию «💰 Оплата»
     ============================================================ */

  function injectPaymentUI(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_pay_block')) return;

    /* Ищем форму события по полю ev_type_chips */
    if(!modal.querySelector('#ev_type_chips')) return;

    /* Тип события и роль — от текущего пользователя */
    var u = (typeof currentUser === 'function') ? currentUser() : null;
    if(!u) return;

    var editor = window._evType || 'measure';  /* текущий выбранный тип в форме */
    var orderEl = document.getElementById('ev_order');
    var orderId = orderEl ? parseInt(orderEl.value, 10) || null : null;

    /* Находим блок «Заметка» — вставим перед ним */
    var noteEl = document.getElementById('ev_note');
    if(!noteEl) return;
    var noteLabel = noteEl.previousElementSibling;
    if(!noteLabel || noteLabel.tagName !== 'LABEL') return;

    var insertBefore = noteLabel;

    var html = '';
    html += '<div id="zrz_pay_block" class="zrz-pay-block" style="display:none;margin-top:14px">';
    html +=   '<div class="section-title" style="margin-top:0">💰 Оплата</div>';

    /* Чекбокс «Взять оплату» */
    html +=   '<div class="checkbox-row" style="background:linear-gradient(180deg,rgba(217,146,74,0.10),rgba(217,146,74,0.03));border:1.5px solid rgba(217,146,74,0.30)">';
    html +=     '<input type="checkbox" id="zrz_pay_chk"><label for="zrz_pay_chk">Взять оплату по этому событию</label>';
    html +=   '</div>';

    /* Поля оплаты — появятся при включении */
    html +=   '<div id="zrz_pay_fields" style="display:none;margin-top:12px">';

    /* Двусторонний обмен — Забрать + Передать */
    html +=     '<div id="zrz_pay_bi" style="display:none">';
    html +=       '<div class="row2">';
    html +=         '<div><label style="margin-top:0">Забрать у клиента, ₽</label>';
    html +=           '<input id="zrz_pay_recv" type="text" inputmode="decimal" placeholder="0"></div>';
    html +=         '<div><label style="margin-top:0">Передать поставщику, ₽</label>';
    html +=           '<input id="zrz_pay_give" type="text" inputmode="decimal" placeholder="0"></div>';
    html +=       '</div>';
    html +=     '</div>';

    /* Односторонний — только Забрать */
    html +=     '<div id="zrz_pay_single" style="display:none">';
    html +=       '<label style="margin-top:0">Забрать у клиента, ₽</label>';
    html +=       '<input id="zrz_pay_single_amt" type="text" inputmode="decimal" placeholder="0">';
    html +=     '</div>';

    /* Подсказка */
    html +=     '<div class="draft-notice" style="margin-top:12px;font-size:12px;line-height:1.5">';
    html +=       'Сумма сохраняется в событии. В заказ не уходит — менеджер вносит вручную.';
    html +=     '</div>';

    html +=   '</div>';
    html += '</div>';

    insertBefore.insertAdjacentHTML('beforebegin', html);

    /* --- Логика отображения --- */
    var block  = document.getElementById('zrz_pay_block');
    var chk    = document.getElementById('zrz_pay_chk');
    var fields = document.getElementById('zrz_pay_fields');
    var biBox  = document.getElementById('zrz_pay_bi');
    var oneBox = document.getElementById('zrz_pay_single');

    /* Проверяем: доступен ли тип события для оплаты у этой роли */
    function typeAvailable(type, role){
      var allowed = PAYMENT_TYPES[role] || [];
      if(allowed.length) return allowed.indexOf(type) >= 0;
      /* Если роль не в списке — показываем всем (админ/менеджер) */
      return true;
    }

    function updateVisibility(){
      /* Тип события поменялся? */
      var t = window._evType || 'measure';
      var role = u.role;
      var canPay = typeAvailable(t, role);

      block.style.display = canPay ? 'block' : 'none';

      /* Двусторонний или односторонний? */
      var isBi = BIDIRECTIONAL_TYPES.indexOf(t) >= 0;
      biBox.style.display  = isBi ? 'block' : 'none';
      oneBox.style.display = isBi ? 'none'  : 'block';

      /* Поля видимы? */
      fields.style.display = chk.checked ? 'block' : 'none';
    }

    /* Загружаем существующие значения (если правим событие) */
    var currentEventId = window._zrz14EditingEventId || null;
    var curEvent = null;
    if(currentEventId){
      try { curEvent = db.events.find(function(x){ return x.id === currentEventId; }); }catch(e){}
    }
    if(curEvent && curEvent.paymentEnabled){
      chk.checked = true;
      var recvEl = document.getElementById('zrz_pay_recv');
      var giveEl = document.getElementById('zrz_pay_give');
      var singleEl = document.getElementById('zrz_pay_single_amt');
      if(recvEl && curEvent.paymentAmount) recvEl.value = fmtMoney(curEvent.paymentAmount);
      if(giveEl && curEvent.paymentGiveAmount) giveEl.value = fmtMoney(curEvent.paymentGiveAmount);
      if(singleEl && curEvent.paymentAmount) singleEl.value = fmtMoney(curEvent.paymentAmount);
    }

    chk.onchange = updateVisibility;
    updateVisibility();

    /* Слушаем смену типа события — через интервал, т.к. чипы перерисовываются ядром */
    var lastType = window._evType;
    var iv = setInterval(function(){
      var t = window._evType;
      if(t !== lastType){
        lastType = t;
        updateVisibility();
      }
      /* Если модалка закрылась — остановить */
      if(!document.getElementById('zrz_pay_block')) clearInterval(iv);
    }, 300);
  }

  /* Запоминаем id редактируемого события */
  function wrapOpenEventForm(){
    if(window._zrz14EventFormWrapped) return;
    if(typeof window.openEventForm !== 'function') return;
    var orig = window.openEventForm;
    window.openEventForm = function(dateYmd, eventId, presetOrderId){
      window._zrz14EditingEventId = eventId || null;
      var res = orig.apply(this, arguments);
      setTimeout(injectPaymentUI, 130);
      return res;
    };
    window._zrz14EventFormWrapped = true;
  }

  /* Также — сохраняем значения оплаты при сохранении события */
  function wrapSaveEventForm(){
    if(window._zrz14EventSaveWrapped) return;
    if(typeof window.saveEventForm !== 'function') return;
    var orig = window.saveEventForm;
    window.saveEventForm = function(eventId){
      /* Собираем значения ДО того как ядро закроет модалку */
      var payEnabled = false;
      var payAmount = 0;
      var payGive = 0;
      try {
        var chk = document.getElementById('zrz_pay_chk');
        if(chk) payEnabled = !!chk.checked;
        if(payEnabled){
          var t = window._evType || 'measure';
          var isBi = BIDIRECTIONAL_TYPES.indexOf(t) >= 0;
          if(isBi){
            payAmount = numVal((document.getElementById('zrz_pay_recv')||{}).value);
            payGive   = numVal((document.getElementById('zrz_pay_give')||{}).value);
          } else {
            payAmount = numVal((document.getElementById('zrz_pay_single_amt')||{}).value);
            payGive = 0;
          }
        }
      }catch(e){ try{console.warn('[14 p2] save collect', e);}catch(_){} }

      var res = orig.apply(this, arguments);

      /* Пишем значения в событие отложенно — ядро уже сохранило, теперь дополняем */
      setTimeout(function(){
        try {
          var targetId = eventId;
          if(!targetId){
            /* Новое событие — последнее в массиве (обычно так) */
            var evs = db.events || [];
            if(evs.length) targetId = evs[evs.length - 1].id;
          }
          if(!targetId) return;
          var e = db.events.find(function(x){ return x.id === targetId; });
          if(!e) return;
          e.paymentEnabled = !!payEnabled;
          e.paymentAmount = payAmount || 0;
          e.paymentGiveAmount = payGive || 0;
          e.updatedAt = Date.now();
          if(typeof touch === 'function') touch(e);
          if(typeof save === 'function') save();
        }catch(err){ try{console.warn('[14 p2] save write', err);}catch(_){} }
      }, 80);

      return res;
    };
    window._zrz14EventSaveWrapped = true;
  }

  /* ============================================================
     3. БЛОК ОПЛАТЫ В КАРТОЧКЕ СОБЫТИЯ (для замерщика/водителя)
     ============================================================ */

  /* Строим HTML блока оплаты — для вставки в календарь и в карточку заказа */
  function buildPaymentBlock(e){
    var p = calcPaymentState(e);
    if(!p) return '';

    var u = (typeof currentUser === 'function') ? currentUser() : null;
    var canReceive = false;
    if(u && (u.role === 'surveyor' || u.role === 'driver')){
      if(Array.isArray(e.assignedUserIds) && e.assignedUserIds.indexOf(u.id) >= 0) canReceive = true;
    }
    /* Админ/менеджер тоже могут отметить */
    if(u && (u.role === 'admin' || u.role === 'manager')) canReceive = true;

    var html = '<div class="zrz-pay-card">';
    html += '<div class="zrz-pay-card-title">💰 Оплата</div>';

    /* Строки с суммами */
    if(p.isBi){
      if(p.want > 0){
        html += '<div class="zrz-pay-card-row"><span>Забрать у клиента:</span><b>' + fmtMoney(p.want) + ' ₽</b></div>';
      }
      if(p.give > 0){
        html += '<div class="zrz-pay-card-row"><span>Передать поставщику:</span><b>' + fmtMoney(p.give) + ' ₽</b></div>';
      }
    } else {
      if(p.want > 0){
        html += '<div class="zrz-pay-card-row"><span>Сумма к получению:</span><b>' + fmtMoney(p.want) + ' ₽</b></div>';
      }
    }

    /* Состояние приёма */
    if(p.received){
      var byName = '';
      try {
        if(p.receivedBy && Array.isArray(db.users)){
          var uu = db.users.find(function(x){ return x.id === p.receivedBy; });
          if(uu) byName = uu.name.split(' ')[0];
        }
      }catch(e){}

      html += '<div class="zrz-pay-card-status zrz-pay-card-ok">';
      html +=   '<span>✓ Получено:</span><b>' + fmtMoney(p.got) + ' ₽</b>';
      if(byName) html += '<span class="zrz-pay-card-by">' + esc2(byName) + '</span>';
      html += '</div>';

      if(p.short > 0){
        html += '<div class="zrz-pay-card-status zrz-pay-card-warn">';
        html +=   '<span>⚠ Остаток:</span><b>' + fmtMoney(p.short) + ' ₽</b>';
        html += '</div>';
      }

      if(canReceive){
        html += '<button type="button" class="zrz-pay-card-btn zrz-pay-card-btn-cancel" onclick="zrz14CancelReceive(' + e.id + ')">Отменить приём денег</button>';
      }
    } else {
      if(canReceive){
        html += '<button type="button" class="zrz-pay-card-btn" onclick="zrz14ReceiveMoney(' + e.id + ')">💰 Забрал</button>';
      } else {
        html += '<div class="zrz-pay-card-hint">Отметить может исполнитель события или менеджер</div>';
      }
    }

    html += '</div>';
    return html;
  }

  /* ============================================================
     4. МОДАЛКА «ЗАБРАЛ N ₽»
     ============================================================ */

  window.zrz14ReceiveMoney = function(eventId){
    var e = null;
    try { e = db.events.find(function(x){ return x.id === eventId; }); }catch(err){}
    if(!e) return;
    var p = calcPaymentState(e);
    if(!p) return;

    var suggested = p.want || 0;
    var bi = p.isBi;
    var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;

    var html = '';
    html += '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' Забрал деньги</h2>';
    html += '<div class="modal-crumbs"><span>' + ((typeof eventTypeLabel==='function')?eventTypeLabel(e.type||'measure'):'Событие') + '</span><span class="bc-sep">/</span><span class="bc-cur">Оплата</span></div>';

    if(o){
      html += '<div class="draft-notice">Заказ №' + esc2(o.orderNum||'—') + ' · ' + esc2(clientName(o)||'') + '</div>';
    }
    if(bi){
      html += '<div class="draft-notice" style="margin-top:6px">Двусторонний обмен — уточни, сколько забрал и сколько отдал.</div>';
    }

    /* Поле «Забрал» */
    html += '<label>' + (bi ? 'Забрал у клиента, ₽' : 'Сколько получено, ₽') + '</label>';
    html += '<input id="zrz_recv_amt" type="text" inputmode="decimal" value="' + (suggested ? fmtMoney(suggested) : '') + '" placeholder="0">';

    /* Для двустороннего — поле «Передал» */
    if(bi){
      html += '<label>Передал поставщику, ₽ (если есть)</label>';
      html += '<input id="zrz_give_amt" type="text" inputmode="decimal" value="' + (p.give ? fmtMoney(p.give) : '') + '" placeholder="0">';
    }

    /* Подсказка про остаток */
    html += '<div id="zrz_recv_hint" class="draft-notice" style="margin-top:12px;font-size:12px;line-height:1.5">';
    if(suggested > 0){
      html += 'Ожидалось: <b>' + fmtMoney(suggested) + ' ₽</b>. Если взял меньше — менеджер получит уведомление.';
    } else {
      html += 'Сумма не задана в событии. Впиши фактически полученную.';
    }
    html += '</div>';

    html += '<button class="btn btn-primary" style="margin-top:14px" onclick="zrz14ConfirmReceive(' + eventId + ')">✓ Забрал</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal()">Отмена</button>';

    try {
      if(typeof showModal === 'function') showModal(html);
    }catch(err){ return; }

    setTimeout(function(){
      var inp = document.getElementById('zrz_recv_amt');
      if(inp){ try{ inp.focus(); inp.select(); }catch(e){} }
    }, 150);
  };

  window.zrz14ConfirmReceive = function(eventId){
    var e = null;
    try { e = db.events.find(function(x){ return x.id === eventId; }); }catch(err){}
    if(!e) return;

    var inp = document.getElementById('zrz_recv_amt');
    var got = inp ? numVal(inp.value) : 0;
    var give = 0;
    var giveInp = document.getElementById('zrz_give_amt');
    if(giveInp) give = numVal(giveInp.value);

    if(got < 0){ got = 0; }

    e.paymentReceived = true;
    e.paymentReceivedAmount = got;
    e.paymentReceivedAt = Date.now();
    e.paymentReceivedBy = (db.currentUserId) || null;
    if(give > 0) e.paymentGivenAmount = give;
    e.updatedAt = Date.now();
    if(typeof touch === 'function') touch(e);

    if(typeof save === 'function') save();
    try { if(typeof haptic === 'function') haptic([15, 40, 15]); }catch(_){}

    /* Частичная оплата? → уведомление менеджеру */
    var p = calcPaymentState(e);
    if(p && p.short > 0){
      notifyManagerPartial(e, p);
    }

    try { if(typeof closeModal === 'function') closeModal(); }catch(_){}
    setTimeout(function(){
      try { if(typeof render === 'function') render(); }catch(_){}
    }, 100);
  };

  window.zrz14CancelReceive = async function(eventId){
    var e = null;
    try { e = db.events.find(function(x){ return x.id === eventId; }); }catch(err){}
    if(!e) return;

    var ok = false;
    try {
      ok = await uiConfirm(
        'Отменить приём денег по этому событию?\n\nДанные о приёме будут удалены.',
        'Отмена',
        { danger:true, yesLabel:'Отменить' }
      );
    }catch(err){ ok = false; }
    if(!ok) return;

    e.paymentReceived = false;
    e.paymentReceivedAmount = 0;
    e.paymentReceivedAt = 0;
    e.paymentReceivedBy = null;
    e.paymentGivenAmount = 0;
    e.updatedAt = Date.now();
    if(typeof touch === 'function') touch(e);

    if(typeof save === 'function') save();
    try { if(typeof haptic === 'function') haptic(8); }catch(_){}
    setTimeout(function(){
      try { if(typeof render === 'function') render(); }catch(_){}
    }, 100);
  };

  /* ============================================================
     5. УВЕДОМЛЕНИЕ МЕНЕДЖЕРУ О ЧАСТИЧНОЙ ОПЛАТЕ
     ============================================================ */

  function notifyManagerPartial(e, p){
    try {
      if(!Array.isArray(db.users)) return;
      var recips = db.users.filter(function(u){
        return u.active && (u.role === 'admin' || u.role === 'manager');
      }).map(function(u){ return u.id; });
      /* Не уведомляем того, кто сам отмечал */
      var me = db.currentUserId;
      recips = recips.filter(function(uid){ return uid !== me; });
      if(!recips.length) return;

      var o = e.orderId ? db.orders.find(function(x){ return x.id === e.orderId; }) : null;
      var title = '💰 Оплата получена частично';
      var body = '';
      if(o){
        body += '№' + (o.orderNum||'—') + ' · ' + (clientName(o)||'') + '\n';
      }
      body += 'Ожидалось: ' + fmtMoney(p.want) + ' ₽ · Получено: ' + fmtMoney(p.got) + ' ₽\n';
      body += 'Остаток: ' + fmtMoney(p.short) + ' ₽ — надо решить с клиентом';

      if(typeof createNotificationsFor === 'function'){
        createNotificationsFor(recips, {
          type: 'info',
          title: title,
          body: body,
          linkEventId: e.id,
          linkOrderId: e.orderId || null
        });
      }
    }catch(err){ try{console.warn('[14 p2] notify', err);}catch(_){} }
  }

  /* ============================================================
     6. ПОДМЕНА БЛОКА ОПЛАТЫ В КАРТОЧКЕ СОБЫТИЯ
     Нам нужно вставить блок .zrz-pay-card в места, где показывается событие.
     ============================================================ */

  /* Открытие события через openEventFromCalendar — оборачиваем */
  function wrapOpenEventFromCalendar(){
    if(window._zrz14OpenEventWrapped) return;
    if(typeof window.openEventFromCalendar !== 'function') return;
    var orig = window.openEventFromCalendar;
    window.openEventFromCalendar = function(evId){
      var e = null;
      try { e = db.events.find(function(x){ return x.id === evId; }); }catch(err){}
      /* Если оплата включена и есть что показать — предложим сначала карточку с оплатой */
      if(e && e.paymentEnabled){
        /* Вызываем оригинал — откроется форма редактирования события */
        var res = orig.apply(this, arguments);
        /* Через время — вставляем блок оплаты в форму */
        setTimeout(function(){
          try { injectPaymentCardIntoForm(e); }catch(err){}
        }, 250);
        return res;
      }
      return orig.apply(this, arguments);
    };
    window._zrz14OpenEventWrapped = true;
  }

  /* Вставляем блок оплаты в модалку редактирования события */
  function injectPaymentCardIntoForm(e){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('.zrz-pay-card')) return;
    var html = buildPaymentBlock(e);
    if(!html) return;

    /* Находим блок «Заметка» — вставим после */
    var noteEl = document.getElementById('ev_note');
    if(!noteEl) return;

    /* Найдём контейнер */
    var anchor = noteEl.parentNode;
    if(!anchor) return;

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    /* Вставляем после textarea заметки */
    if(noteEl.nextSibling) anchor.insertBefore(wrap.firstChild, noteEl.nextSibling);
    else anchor.appendChild(wrap.firstChild);
  }

  /* Также — при открытии события из карточки заказа (список событий) */
  function wrapRenderOrderEventsBlock(){
    if(window._zrz14OrderEventsWrapped) return;
    if(typeof window.renderOrderEventsBlock !== 'function') return;
    var orig = window.renderOrderEventsBlock;
    window.renderOrderEventsBlock = function(o){
      var html = orig.apply(this, arguments);
      try {
        /* Найдём события с оплатой для этого заказа и добавим их блоки */
        var evs = (db.events || []).filter(function(e){
          return e.orderId === o.id && e.paymentEnabled;
        });
        if(!evs.length) return html;
        var blocks = evs.map(function(e){
          return buildPaymentBlock(e);
        }).join('');
        if(!blocks) return html;
        /* Вставляем после блока событий — просто добавляем к HTML */
        html += blocks;
      }catch(err){ try{console.warn('[14 p2] renderOrderEvents', err);}catch(_){} }
      return html;
    };
    window._zrz14OrderEventsWrapped = true;
  }

  /* ============================================================
     7. CSS
     ============================================================ */

  function injectCss(){
    if(document.getElementById('zrz-pay-css')) return;
    var css = ''
      /* Блок оплаты в форме события */
      + '.zrz-pay-block .section-title{margin-top:0}'
      /* Карточка оплаты в просмотре события */
      + '.zrz-pay-card{margin:12px 0;padding:14px 16px;border-radius:16px;'
      +   'background:linear-gradient(180deg,rgba(217,146,74,0.12),rgba(217,146,74,0.04));'
      +   'border:1.5px solid rgba(217,146,74,0.32)}'
      + 'html[data-theme="dark"] .zrz-pay-card{background:linear-gradient(180deg,rgba(224,168,102,0.14),rgba(224,168,102,0.05));border-color:rgba(224,168,102,0.34)}'
      + '.zrz-pay-card-title{font-size:12.5px;font-weight:800;color:#8a5a0c;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
      + 'html[data-theme="dark"] .zrz-pay-card-title{color:#e0a866}'
      + '.zrz-pay-card-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;'
      +   'border-bottom:1px dashed rgba(217,146,74,0.22)}'
      + '.zrz-pay-card-row:last-child{border-bottom:none}'
      + '.zrz-pay-card-row span{color:var(--text-soft);font-weight:500}'
      + '.zrz-pay-card-row b{font-weight:800;color:var(--text);font-family:var(--font-mono);letter-spacing:-0.02em}'
      /* Статус приёма */
      + '.zrz-pay-card-status{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;'
      +   'margin-top:10px;font-size:13.5px;font-weight:700}'
      + '.zrz-pay-card-ok{background:rgba(76,175,125,0.14);color:#2c7a54;border:1px solid rgba(76,175,125,0.30)}'
      + 'html[data-theme="dark"] .zrz-pay-card-ok{color:#86efac;background:rgba(78,195,140,0.16);border-color:rgba(78,195,140,0.32)}'
      + '.zrz-pay-card-ok b{font-weight:800;font-family:var(--font-mono)}'
      + '.zrz-pay-card-by{margin-left:auto;font-size:11.5px;font-weight:600;opacity:0.8;'
      +   'background:rgba(255,255,255,0.5);padding:2px 8px;border-radius:8px}'
      + 'html[data-theme="dark"] .zrz-pay-card-by{background:rgba(255,255,255,0.08)}'
      + '.zrz-pay-card-warn{background:rgba(224,168,102,0.20);color:#8a5a0c;border:1px solid rgba(217,146,74,0.40)}'
      + 'html[data-theme="dark"] .zrz-pay-card-warn{color:#e0a866;background:rgba(224,168,102,0.16)}'
      + '.zrz-pay-card-warn b{font-weight:800;font-family:var(--font-mono)}'
      /* Кнопки */
      + '.zrz-pay-card-btn{display:block;width:100%;padding:13px 18px;margin-top:12px;'
      +   'border:none;border-radius:14px;'
      +   'background:linear-gradient(135deg,#e0a866,#d9924a);color:#fff;'
      +   'font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;'
      +   'box-shadow:0 6px 18px rgba(217,146,74,0.35);'
      +   'transition:transform .14s ease,box-shadow .14s ease}'
      + '.zrz-pay-card-btn:active{transform:scale(0.98);box-shadow:0 3px 10px rgba(217,146,74,0.45)}'
      + '.zrz-pay-card-btn-cancel{background:var(--surface);color:var(--danger);'
      +   'border:1.5px solid rgba(201,101,101,0.28);box-shadow:none;font-size:13.5px;padding:11px 16px}'
      + '.zrz-pay-card-btn-cancel:active{background:rgba(201,101,101,0.08)}'
      + '.zrz-pay-card-hint{margin-top:10px;font-size:12px;color:var(--muted);text-align:center;'
      +   'line-height:1.5;font-weight:600}'
      ;

    var st = document.createElement('style');
    st.id = 'zrz-pay-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ============================================================
     8. ЗАПУСК
     ============================================================ */

  function apply(){
    try { injectCss(); }catch(e){}
    try { wrapOpenEventForm(); }catch(e){}
    try { wrapSaveEventForm(); }catch(e){}
    try { wrapOpenEventFromCalendar(); }catch(e){}
    try { wrapRenderOrderEventsBlock(); }catch(e){}
  }

  if(document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, {once:true});
  setTimeout(apply, 700);
  setTimeout(apply, 1800);

  /* Подстраховка */
  var _iv = setInterval(function(){
    try { wrapOpenEventForm(); }catch(e){}
    try { wrapSaveEventForm(); }catch(e){}
    try { wrapOpenEventFromCalendar(); }catch(e){}
    try { wrapRenderOrderEventsBlock(); }catch(e){}
  }, 2500);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[14 p2] оплата через событие активна'); }catch(_){}
})();
