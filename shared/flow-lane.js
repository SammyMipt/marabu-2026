/* Сквозное течение «Турбулентности»: одна струя живёт всю лекцию.

   У «Электрона» через всю лекцию идёт один электрон, который меняет не
   место, а поведение. Здесь то же самое и по той же причине: зал должен
   видеть один и тот же поток, который на глазах меняет характер, а не
   пять разных картинок в пяти актах.

   Поведение берётся из data-beat, который deck.js ставит по кикеру «АКТ N»:

     акт 1  метод         спокойное ламинарное течение, ровные линии
     акт 2  число Re      то же течение, но быстрее, и линии чуть дышат
     акт 3  уравнение     нелинейность: волна растёт вниз по потоку
     акт 4  когда решается труба: у стенок ноль, в середине быстро
     акт 5  Рейнольдс     тело в потоке, за ним дорожка вихрей и каскад
     финал                почти гаснет

   На титуле и в акте 0 полоса молчит: там работает струйка (smoke-lane),
   и два потока в одном кадре спорили бы. Переходы между состояниями
   интерполируются, набор частиц один и тот же всё время.

   Смещения считаются аналитически от координаты, а не интегрированием:
   картинка не расходится за сорок минут показа и не копит ошибку.
   При prefers-reduced-motion поток замирает. */

(function () {
  'use strict';

  var W = 1280, H = 720;
  var LANE_Y = 694;        /* контент слайда заканчивается на 680 */
  var HALF = 15;           /* полутолщина полосы */
  var X0 = 56, X1 = 1216;
  var N = 150;
  var BODY_X = 320;        /* тело в потоке: акт 5 */

  var slides = document.querySelector('.reveal .slides');
  if (!slides) return;

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'flow-lane';
  canvas.setAttribute('aria-hidden', 'true');
  slides.appendChild(canvas);

  var dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  /* Палитра дублирует токены темы: canvas переменных CSS не читает */
  var css = getComputedStyle(document.documentElement);
  var ACCENT = (css.getPropertyValue('--accent') || '#35c8d8').trim();
  var MUTED = (css.getPropertyValue('--muted') || '#86a0a8').trim();

  var parts = [];
  for (var i = 0; i < N; i++) {
    parts.push({
      x: X0 + Math.random() * (X1 - X0),
      rel: (Math.random() * 2 - 1),
      phase: Math.random() * 6.283
    });
  }

  /* speed — px/с вдоль полосы; wave — амплитуда растущей волны;
     walls — профиль трубы; shed — дорожка вихрей; cascade — мелкие масштабы;
     body — тело в потоке. */
  var MODES = {
    idle:  { speed: 54,  wave: 0,  walls: 0, shed: 0, cascade: 0,  body: 0, alpha: .34 },
    calm:  { speed: 76,  wave: 0,  walls: 0, shed: 0, cascade: 0,  body: 0, alpha: .40 },
    fast:  { speed: 165, wave: 4,  walls: 0, shed: 0, cascade: 0,  body: 0, alpha: .48 },
    grow:  { speed: 155, wave: 20, walls: 0, shed: 0, cascade: .1, body: 0, alpha: .52 },
    pipe:  { speed: 108, wave: 0,  walls: 1, shed: 0, cascade: 0,  body: 0, alpha: .46 },
    chaos: { speed: 205, wave: 0,  walls: 0, shed: 1, cascade: .9, body: 1, alpha: .58 },
    fade:  { speed: 34,  wave: 7,  walls: 0, shed: 0, cascade: .2, body: 0, alpha: .14 },
    off:   { speed: 60,  wave: 0,  walls: 0, shed: 0, cascade: 0,  body: 0, alpha: 0 }
  };

  var BY_BEAT = { '1': 'calm', '2': 'fast', '3': 'grow', '4': 'pipe', '5': 'chaos' };

  var mode = 'off';
  var cur = { speed: 60, wave: 0, walls: 0, shed: 0, cascade: 0, body: 0, alpha: 0 };
  var t = 0;
  var vortices = [];
  var shedTimer = 0, shedSign = 1;

  function approach(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); }

  function step(dt) {
    t += dt;
    var m = MODES[mode] || MODES.off;
    cur.speed = approach(cur.speed, m.speed, 1.3, dt);
    cur.wave = approach(cur.wave, m.wave, 1.6, dt);
    cur.walls = approach(cur.walls, m.walls, 2.2, dt);
    cur.shed = approach(cur.shed, m.shed, 1.8, dt);
    cur.cascade = approach(cur.cascade, m.cascade, 1.8, dt);
    cur.body = approach(cur.body, m.body, 2.4, dt);
    cur.alpha = approach(cur.alpha, m.alpha, 2.2, dt);

    /* Срыв вихрей: пока shed заметен, за телом с постоянным периодом
       сходят вихри — попеременно сверху и снизу, как и положено дорожке. */
    if (cur.shed > .05) {
      shedTimer += dt;
      if (shedTimer > .46) {
        shedTimer = 0;
        shedSign = -shedSign;
        vortices.push({ x: BODY_X + 46, s: shedSign, age: 0 });
        if (vortices.length > 12) vortices.shift();
      }
    }
    for (var v = vortices.length - 1; v >= 0; v--) {
      vortices[v].x += cur.speed * .62 * dt;
      vortices[v].age += dt;
      if (vortices[v].x > X1 + 60) vortices.splice(v, 1);
    }

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      /* В трубе у стенок жидкость стоит: профиль замедляет края */
      var prof = 1 - cur.walls * .88 * p.rel * p.rel;
      p.x += cur.speed * prof * dt;
      if (p.x > X1) { p.x = X0; p.phase = Math.random() * 6.283; }
    }
  }

  /* Смещение частицы по вертикали: растущая волна + вихри + мелкие масштабы */
  function offset(p) {
    var y = p.rel * HALF;
    var s = (p.x - X0) / (X1 - X0);

    if (cur.wave > .01) {
      /* Возмущение растёт вниз по потоку: слева гладко, справа заметно */
      var g = s * s;
      y += cur.wave * g * Math.sin(p.x / 150 - t * 1.7);
    }
    if (cur.body > .05) {
      /* Поток расходится перед телом */
      var db = p.x - BODY_X;
      y += (p.rel >= 0 ? 1 : -1) * 16 * cur.body * Math.exp(-db * db / 2600);
    }
    if (cur.shed > .05) {
      for (var v = 0; v < vortices.length; v++) {
        var d = p.x - vortices[v].x;
        var decay = Math.max(0, 1 - vortices[v].age / 5.5);
        y += vortices[v].s * 30 * cur.shed * decay * Math.exp(-d * d / 1500);
      }
    }
    if (cur.cascade > .02) {
      y += cur.cascade * 6 * s * Math.sin(p.x * .03 + p.phase + t * 1.4);
      y += cur.cascade * 2.6 * s * Math.sin(p.x * .062 - p.phase * 2 + t * 2.1);
    }
    return LANE_Y + y;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (cur.alpha < .01) return;

    /* Стенки трубы */
    if (cur.walls > .05) {
      ctx.strokeStyle = MUTED;
      ctx.globalAlpha = .34 * cur.walls * cur.alpha / .5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X0 - 20, LANE_Y - HALF - 7); ctx.lineTo(X1 + 20, LANE_Y - HALF - 7);
      ctx.moveTo(X0 - 20, LANE_Y + HALF + 7); ctx.lineTo(X1 + 20, LANE_Y + HALF + 7);
      ctx.stroke();
    }

    /* Линии тока. Каждая — гладкая кривая по пяти точкам поля вдоль потока:
       прямой отрезок в хаосе давал рваную щетину, и полоса читалась как сбой
       отрисовки. Кривая Безье по серединам звеньев убирает изломы, мягкий
       ореол снимает жёсткость краёв. Один путь на все частицы — дешевле
       и ровнее по яркости. */
    ctx.strokeStyle = ACCENT;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var SEG = 7;
    function streak(p, prof) {
      var len = 16 + cur.speed * .1 * prof;
      var px = [], py = [], q;
      for (q = 0; q <= SEG; q++) {
        var xx = p.x - len * (1 - q / SEG);
        px.push(xx);
        py.push(offset({ x: xx, rel: p.rel, phase: p.phase }));
      }
      ctx.moveTo(px[0], py[0]);
      for (q = 1; q < SEG; q++) {
        ctx.quadraticCurveTo(px[q], py[q], (px[q] + px[q + 1]) / 2, (py[q] + py[q + 1]) / 2);
      }
      ctx.lineTo(px[SEG], py[SEG]);
    }

    /* мягкий подслой: широкая полупрозрачная линия под основной */
    ctx.globalAlpha = cur.alpha * .3;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      streak(p, 1 - cur.walls * .88 * p.rel * p.rel);
    }
    ctx.stroke();

    ctx.globalAlpha = cur.alpha;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (var j = 0; j < parts.length; j++) {
      var p2 = parts[j];
      streak(p2, 1 - cur.walls * .88 * p2.rel * p2.rel);
    }
    ctx.stroke();

    /* Вихри: дорожка должна читаться сама, а не угадываться по линиям */
    if (cur.shed > .05) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      for (var v = 0; v < vortices.length; v++) {
        var vo = vortices[v];
        var decay = Math.max(0, 1 - vo.age / 5.5);
        if (decay <= 0) continue;
        var r = 8 + 7 * (1 - decay);
        var cy = LANE_Y + vo.s * 9;
        /* полувиток: направление закрутки зависит от того, с какой
           стороны тела сошёл вихрь. Рисуем в два прохода — широкий мягкий
           и тонкий поверх, чтобы дуга не была резкой чертой. */
        var a0 = vo.s > 0 ? 3.6 : 0.4, a1 = vo.s > 0 ? 6.6 : 3.4;
        ctx.globalAlpha = .2 * decay * cur.shed * (cur.alpha / .58);
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(vo.x, cy, r, a0, a1); ctx.stroke();
        ctx.globalAlpha = .5 * decay * cur.shed * (cur.alpha / .58);
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(vo.x, cy, r, a0, a1); ctx.stroke();
      }
    }

    /* Тело в потоке */
    if (cur.body > .05) {
      ctx.globalAlpha = cur.alpha;
      ctx.beginPath();
      ctx.arc(BODY_X, LANE_Y, 13, 0, 6.283);
      ctx.fillStyle = '#0a1a1f'; ctx.fill();
      ctx.strokeStyle = MUTED; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  var last = 0, alive = true;
  function frame(now) {
    if (!alive) return;
    var dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    try {
      if (!reduce) step(dt);
      draw();
    } catch (e) {
      alive = false;
      console.error('flow-lane: сбой в кадре', e);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(function (now) { last = now; frame(now); });

  /* Титул и акт 0 отданы струйке: там data-smoke, и полоса молчит.
     У слайдов без беата (развороты) поведение сохраняется от предыдущего —
     поток не сбрасывается оттого, что лектор показал разворот. */
  function pick(section) {
    if (!section) return;
    if (section.hasAttribute('data-smoke') ||
        section.classList.contains('slide-title')) { mode = 'off'; return; }
    if (section.classList.contains('slide-closing')) { mode = 'fade'; return; }
    var beat = section.getAttribute('data-beat');
    if (beat && BY_BEAT[beat]) mode = BY_BEAT[beat];
    else if (mode === 'off') mode = 'idle';
  }

  if (window.Reveal) {
    Reveal.on('ready', function (e) { pick(e.currentSlide); });
    Reveal.on('slidechanged', function (e) { pick(e.currentSlide); });
  }

  window.__flowLane = {
    get mode() { return mode; }, state: cur, vortices: vortices,
    /* Ручной кадр: rAF не идёт, пока документ скрыт, и проверить отрисовку
       иначе нельзя. Полезно и на репетиции — прогнать поток без показа. */
    tick: function (dt) { step(dt || 1 / 60); draw(); }
  };
})();
