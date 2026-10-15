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
/* patches/15-tests.js — галерея чертежей (Часть 2) */
(function(){
  if(window._zrz15DrawGallery) return;
  window._zrz15DrawGallery = true;

  /* ---------- Утилита: собрать элемент для теста ---------- */
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

  /* ---------- Набор вариантов для галереи ---------- */
  function _buildVariants(){
    return [
      /* --- Формы зеркала --- */
      { grp:'Формы зеркала', name:'RECT 60×180',        d:_mkItem('MIRROR','RECT') },
      { grp:'Формы зеркала', name:'RECT4',              d:_mkItem('MIRROR','RECT4', {T:60,B:60,L:180,R:180}) },
      { grp:'Формы зеркала', name:'CIRCLE Ø60',         d:_mkItem('MIRROR','CIRCLE', {w:60,h:60}) },
      { grp:'Формы зеркала', name:'OVAL 60×100',        d:_mkItem('MIRROR','OVAL', {w:60,h:100}) },
      { grp:'Формы зеркала', name:'FIGURED R50',        d:_mkItem('MIRROR','FIGURED', {cornerRadius:50}) },
      { grp:'Формы зеркала', name:'TEMPLATE',           d:_mkItem('MIRROR','TEMPLATE') },

      /* --- Ниша --- */
      { grp:'Ниша', name:'Ниша (стекло по меньшему)',   d:_mkItem('MIRROR','RECT', {mirrorMeasureMode:'niche', T:62,B:62,L:182,R:182, mirrorNicheCutMode:'min'}) },
      { grp:'Ниша', name:'Ниша (стекло на косую)',      d:_mkItem('MIRROR','RECT', {mirrorMeasureMode:'niche', T:62,B:60,L:182,R:180, mirrorNicheCutMode:'bevel'}) },
      { grp:'Ниша', name:'Ниша + стекло (both)',        d:_mkItem('MIRROR','RECT', {mirrorMeasureMode:'both', T:62,B:62,L:182,R:182, w:60,h:180}) },

      /* --- Опции зеркала --- */
      { grp:'Опции', name:'Скругления R50',             d:_mkItem('MIRROR','RECT', {roundedCorners:true, cornerRadius:50}) },
      { grp:'Опции', name:'Фацет 20 мм',                d:_mkItem('MIRROR','RECT', {edge:'Фацет', facetWidth:20}) },
      { grp:'Опции', name:'Рамка золото 30',            d:_mkItem('MIRROR','RECT', {frameColor:'gold', frameThickness:30}) },

      /* --- Подсветка «на зеркале» --- */
      { grp:'Подсветка на зеркале', name:'По периметру',     d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По периметру'], backlightOffset:2, backlightWidth:2}) },
      { grp:'Подсветка на зеркале', name:'2 вертикальных',   d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По 2 вертикальным сторонам'], backlightOffset:2, backlightWidth:2}) },
      { grp:'Подсветка на зеркале', name:'2 горизонтальных', d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По 2 горизонтальным сторонам'], backlightOffset:2, backlightWidth:2}) },
      { grp:'Подсветка на зеркале', name:'Сверху',           d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','Сверху'], backlightOffset:2, backlightWidth:2}) },
      { grp:'Подсветка на зеркале', name:'Снизу',            d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','Снизу'], backlightOffset:2, backlightWidth:2}) },
      { grp:'Подсветка на зеркале', name:'Только левая',     d:_mkItem('MIRROR','RECT', {electric:true, backlight:['На зеркале','По левой стороне'], backlightOffset:2, backlightWidth:2}) },

      /* --- Подсветка «из-за зеркала» --- */
      { grp:'Подсветка из-за зеркала', name:'По периметру',  d:_mkItem('MIRROR','RECT', {electric:true, backlight:['Из-за зеркала','По периметру']}) },
      { grp:'Подсветка из-за зеркала', name:'2 вертикальных',d:_mkItem('MIRROR','RECT', {electric:true, backlight:['Из-за зеркала','По 2 вертикальным сторонам']}) },
      { grp:'Подсветка из-за зеркала', name:'Снизу',         d:_mkItem('MIRROR','RECT', {electric:true, backlight:['Из-за зеркала','Снизу']}) },

      /* --- Розетки --- */
      { grp:'Розетки', name:'1 розетка',            d:_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:1,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom'}]}) },
      { grp:'Розетки', name:'2 розетки (верт.)',    d:_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:2,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom'}]}) },
      { grp:'Розетки', name:'3 розетки (гориз.)',   d:_mkItem('MIRROR','RECT', {socketsMount:true, socketsList:[{count:3,step:7.1,distX:30,distY:110,edgeX:'left',edgeY:'bottom',orientation:'horizontal'}]}) },

      /* --- Светильники --- */
      { grp:'Светильники', name:'1 сверху слева',  d:_mkItem('MIRROR','RECT', {lightsMount:true, lightsList:[{distX:30,distY:10,edgeX:'left',edgeY:'top'}]}) },
      { grp:'Светильники', name:'2 по верхним углам', d:_mkItem('MIRROR','RECT', {lightsMount:true, lightsList:[{distX:15,distY:10,edgeX:'left',edgeY:'top'},{distX:15,distY:10,edgeX:'right',edgeY:'top'}]}) },

      /* --- Болты --- */
      { grp:'Болты', name:'4 болта', d:_mkItem('MIRROR','RECT', {boltMount:true, boltCount:4, boltOffset:5}) },
      { grp:'Болты', name:'6 болтов', d:_mkItem('MIRROR','RECT', {boltMount:true, boltCount:6, boltOffset:5}) },
      { grp:'Болты', name:'8 болтов', d:_mkItem('MIRROR','RECT', {boltMount:true, boltCount:8, boltOffset:5}) },

      /* --- Вырез / разрез --- */
      { grp:'Вырез / разрез', name:'Вырез прямоуг.', d:_mkItem('MIRROR','RECT', {cutoutEnabled:true, cutoutShape:'rect', cutoutW:20, cutoutH:10}) },
      { grp:'Вырез / разрез', name:'Вырез круглый', d:_mkItem('MIRROR','RECT', {cutoutEnabled:true, cutoutShape:'circle', cutoutW:15, cutoutH:15}) },
      { grp:'Вырез / разрез', name:'Вертикальный рез', d:_mkItem('MIRROR','RECT', {cutV:true, cutVPos:30}) },
      { grp:'Вырез / разрез', name:'Крест реза',     d:_mkItem('MIRROR','RECT', {cutV:true, cutVPos:30, cutH:true, cutHPos:90}) },

      /* --- Душевая --- */
      { grp:'Душевая', name:'Дверь + добор',  d:_mkItem('SHOWER', null, {
        showerPanels:[{type:'door',length:70,angle:0,hingeSide:'left',swing:'out'},{type:'fixed',length:50,angle:90,hingeSide:'left',swing:'out'}],
        showerProfiles:[{kind:'wall',mount:'left',panelIndex:0,color:'chrome',note:'',offsetFromTop:null,wallLen:null}]
      })},
      { grp:'Душевая', name:'С поддоном',  d:_mkItem('SHOWER', null, {
        showerBaseType:'tray', baseW:90, baseD:90, baseH:15,
        showerPanels:[{type:'door',length:70,angle:0,hingeSide:'left',swing:'out'}]
      })},
      { grp:'Душевая', name:'С ручкой',  d:_mkItem('SHOWER', null, {
        showerPanels:[{type:'door',length:70,angle:0,hingeSide:'left',swing:'out'}],
        showerHandle:{kind:'bow',panelIndex:0,offsetFromTop:100,edge:'right',offsetEdge:7,holeDiameter:10,holeDistance:300}
      })},
      { grp:'Душевая', name:'Со штангой',  d:_mkItem('SHOWER', null, {
        showerPanels:[{type:'door',length:70,angle:0,hingeSide:'left',swing:'out'}],
        showerProfiles:[{kind:'rod',mount:'right',panelIndex:0,color:'chrome',note:'',offsetFromTop:4,wallLen:30}]
      })},

      /* --- Фартук --- */
      { grp:'Фартук', name:'Прямая',     d:_mkItem('APRON', null, {apronShape:'straight', apronSections:[{bottom:200,top:200,left:60,right:60}]}) },
      { grp:'Фартук', name:'Г-образная', d:_mkItem('APRON', null, {apronShape:'L', apronSections:[{bottom:200,top:200,left:60,right:60},{bottom:100,top:100,left:60,right:60}]}) },
      { grp:'Фартук', name:'П-образная', d:_mkItem('APRON', null, {apronShape:'U', apronSections:[{bottom:200,top:200,left:60,right:60},{bottom:100,top:100,left:60,right:60},{bottom:100,top:100,left:60,right:60}]}) },
      { grp:'Фартук', name:'Зеркальный', d:_mkItem('APRON', null, {apronMaterial:'mirror', apronSections:[{bottom:200,top:200,left:60,right:60}]}) },

      /* --- Прочее --- */
      { grp:'Прочее', name:'Полка 60×80',       d:_mkItem('SHELF','RECT', {shelfDepth:15}) },
      { grp:'Прочее', name:'Панно рамка',       d:_mkItem('PANNO','RECT', {pannoLayout:'frame'}) },
      { grp:'Прочее', name:'Панно крест',       d:_mkItem('PANNO','RECT', {pannoLayout:'x'}) }
    ];
  }

  /* ---------- Экран галереи ---------- */

  function _openGallery(){
    var variants = _buildVariants();

    var html = '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' 🖼 Галерея чертежей</h2>';
    html += '<div class="draft-notice">Всё что должно корректно рисоваться. Тап на превью — открыть в полном размере.</div>';
    html += '<div style="font-size:12px;color:var(--muted);margin:8px 0 12px">Вариантов: <b>' + variants.length + '</b></div>';

    /* Группировка */
    var groups = {};
    variants.forEach(function(v, idx){
      if(!groups[v.grp]) groups[v.grp] = [];
      groups[v.grp].push({v: v, idx: idx});
    });

    html += '<div id="zrz-gallery-root" style="max-height:66vh;overflow-y:auto;padding-right:2px">';
    Object.keys(groups).forEach(function(grpName){
      html += '<div class="section-title" style="margin-top:14px">' + _esc(grpName) + '</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:8px">';
      groups[grpName].forEach(function(g){
        html += '<div class="zrz-gal-cell" data-idx="' + g.idx + '" style="background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:8px;cursor:pointer;text-align:center">';
        html +=   '<div class="zrz-gal-canvas-wrap" style="background:#f6f8fc;border-radius:10px;padding:4px;min-height:100px;display:flex;align-items:center;justify-content:center"></div>';
        html +=   '<div style="font-size:11px;font-weight:700;color:var(--text);margin-top:6px;line-height:1.3">' + _esc(g.v.name) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';

    showModal(html);

    /* Отрисовка мини-canvas в каждой ячейке */
    setTimeout(function(){
      var cells = document.querySelectorAll('.zrz-gal-cell');
      for(var i=0;i<cells.length;i++){
        var idx = parseInt(cells[i].getAttribute('data-idx'), 10);
        var v = variants[idx];
        if(!v) continue;
        var wrap = cells[i].querySelector('.zrz-gal-canvas-wrap');
        if(!wrap) continue;
        try {
          var cv = makeTechCanvas(v.d);
          /* Масштаб мини-версии */
          var maxW = 140;
          var ratio = cv.height / cv.width;
          var displayW = maxW;
          var displayH = Math.round(maxW * ratio);
          cv.style.width = displayW + 'px';
          cv.style.height = 'auto';
          cv.style.borderRadius = '8px';
          cv.style.display = 'block';
          wrap.innerHTML = '';
          wrap.appendChild(cv);
        } catch(e){
          wrap.innerHTML = '<div style="color:#c14d4d;font-size:11px;padding:10px">Ошибка:<br>' + _esc(String((e && e.message) || e)) + '</div>';
        }
      }
    }, 60);

    /* Тап по ячейке — полный размер */
    setTimeout(function(){
      var root = document.getElementById('zrz-gallery-root');
      if(!root) return;
      root.addEventListener('click', function(e){
        var cell = e.target.closest('.zrz-gal-cell');
        if(!cell) return;
        var idx = parseInt(cell.getAttribute('data-idx'), 10);
        var v = variants[idx];
        if(!v) return;
        _openFullPreview(v);
      });
    }, 80);
  }

  function _openFullPreview(v){
    try {
      var cv = makeTechCanvas(v.d);
      var url = cv.toDataURL('image/png');
      var html = '<h2>' + (typeof LOGO_MARK === 'function' ? LOGO_MARK(30) : '') + ' ' + _esc(v.name) + '</h2>';
      html += '<div style="font-size:12px;color:var(--muted);margin:6px 0 12px">' + _esc(v.grp) + '</div>';
      html += '<div style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid var(--line);max-height:64vh;overflow-y:auto">';
      html +=   '<img src="' + url + '" style="width:100%;display:block">';
      html += '</div>';
      html += '<button class="btn btn-primary" onclick="zrzGalDownload()" style="margin-top:10px">💾 Скачать PNG</button>';
      html += '<button class="btn btn-secondary" onclick="closeModal();zrzGalOpenAgain()">← Назад</button>';
      window._zrzGalLastUrl = url;
      showModal(html);
    } catch(e){
      if(typeof uiAlert === 'function') uiAlert('Ошибка: ' + ((e && e.message) || e));
    }
  }

  window.zrzGalDownload = function(){
    if(!window._zrzGalLastUrl) return;
    var a = document.createElement('a');
    a.href = window._zrzGalLastUrl;
    a.download = 'zerzalo-gallery-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ a.remove(); }, 100);
  };

  window.zrzGalOpenAgain = function(){
    setTimeout(_openGallery, 100);
  };

  window.zrzOpenDrawGallery = _openGallery;

  /* ---------- Кнопка в тестовом стенде ---------- */

  function _augmentTestReport(){
    var modal = document.querySelector('.modal');
    if(!modal) return;
    if(modal.querySelector('#zrz_gal_btn')) return;
    /* Ищем кнопку «Прогнать заново» — типичный признак тестового стенда */
    var btns = modal.querySelectorAll('.btn');
    var anchor = null;
    for(var i=0;i<btns.length;i++){
      var t = (btns[i].textContent || '').trim();
      if(t.indexOf('Прогнать') >= 0 || t.indexOf('Скопировать отчёт') >= 0){ anchor = btns[i]; break; }
    }
    if(!anchor) return;
    var html = '<button type="button" id="zrz_gal_btn" class="btn btn-primary" onclick="closeModal();setTimeout(zrzOpenDrawGallery,150)">🖼 Галерея чертежей</button>';
    anchor.insertAdjacentHTML('beforebegin', html);
  }

  function _wrapRunTestStand(){
    if(window._zrzRunTestStandWrapped) return;
    if(typeof window.runTestStand !== 'function') return;
    var orig = window.runTestStand;
    window.runTestStand = function(){
      var r = orig.apply(this, arguments);
      setTimeout(_augmentTestReport, 120);
      return r;
    };
    window._zrzRunTestStandWrapped = true;
  }

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function apply(){
    try{ _wrapRunTestStand(); }catch(e){}
    try{ _augmentTestReport(); }catch(e){}
  }
  apply();
  setTimeout(apply, 800);
  setTimeout(apply, 2000);

  var _iv = setInterval(function(){
    try{ _wrapRunTestStand(); }catch(e){}
  }, 2000);
  setTimeout(function(){ clearInterval(_iv); }, 60000);

  try{ console.log('[15 draw-gallery] галерея чертежей активна'); }catch(_){}
})();
