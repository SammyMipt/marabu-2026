/* Сквозной электрон — герой лекции, который не исчезает при смене слайда.

   Живёт в нижней полосе экрана (шина прибора, y ≈ 700 в локальных координатах
   слайда 1280×720) и всегда на виду. Меняет не место, а ПОВЕДЕНИЕ: по номеру
   беата, который deck.js кладёт в data-beat. Переходы между состояниями
   интерполируются, поэтому зал видит один и тот же объект, а не пять разных
   картинок: он разгоняется, размазывается в волну и собирается обратно.

   Обычный скрипт без модулей: колода обязана открываться с file:// без сети.
   Слой лекционный, не общий — подключается только из elektron/index.html. */

(function () {
  'use strict';

  var W = 1280, H = 720;
  var LANE_Y = 700;          /* шина под контентом: у всех слайдов padding-bottom 46px */
  var X_MIN = 64, X_MAX = 1150;
  var N = 110;               /* частиц в облаке шансов */

  var slides = document.querySelector('.reveal .slides');
  if (!slides) return;

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'electron-lane';
  slides.appendChild(canvas);

  var dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  /* Палитра дублирует токены темы: canvas переменных CSS не читает */
  var css = getComputedStyle(document.documentElement);
  var ACCENT = (css.getPropertyValue('--accent') || '#ffb454').trim();
  var INK = (css.getPropertyValue('--ink') || '#eceef6').trim();

  /* ── частицы облака ──────────────────────────────────────────
     Гауссовы смещения фиксированы: при spread → 0 все сходятся в одну точку,
     при spread → 1 расходятся в облако. Один и тот же набор всё время —
     поэтому морфинг читается как поведение объекта, а не как подмена. */
  var cloud = [];
  for (var i = 0; i < N; i++) {
    var g1 = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    var g2 = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    cloud.push({ gx: g1, gy: g2, ph: Math.random() * 6.283, sp: .6 + Math.random() * .8 });
  }

  /* ── состояния по беатам ─────────────────────────────────────
     v — скорость вдоль шины, spread — размазанность, jitter — дрожь,
     trail — длина следа, hits — вспышки на экране справа. */
  var MODES = {
    idle: { v: 26,  spread: 0,   jitter: 0,  trail: 0,  hits: 0, alpha: .55 },
    jump: { v: 10,  spread: .05, jitter: 1,  trail: 0,  hits: 0, alpha: .7  },
    beam: { v: 330, spread: 0,   jitter: 0,  trail: 1,  hits: 0, alpha: .8  },
    hit:  { v: 430, spread: 0,   jitter: 0,  trail: 1,  hits: 1, alpha: .85 },
    wave: { v: 40,  spread: 1,   jitter: 0,  trail: 0,  hits: 0, alpha: .7  },
    both: { v: 120, spread: .5,  jitter: 0,  trail: .5, hits: 0, alpha: .8  },
    fade: { v: 12,  spread: .25, jitter: 0,  trail: 0,  hits: 0, alpha: .18 }
  };

  var BY_BEAT = { '1': 'jump', '2': 'beam', '3': 'hit', '4': 'wave', '5': 'both' };

  var mode = 'idle';
  var cur = { v: 26, spread: 0, jitter: 0, trail: 0, hits: 0, alpha: 0 };
  var cx = X_MIN + 120;
  var t = 0;
  var history = [];
  var flashes = [];

  function target() {
    var m = MODES[mode] || MODES.idle;
    if (mode === 'both') {
      /* «и так, и так»: объект сам переливается из частицы в волну */
      var pulse = .5 - .5 * Math.cos(t * 1.45);
      return { v: m.v, spread: pulse, jitter: 0, trail: m.trail * (1 - pulse), hits: 0, alpha: m.alpha };
    }
    return m;
  }

  function approach(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); }

  function step(dt) {
    t += dt;
    var tg = target();
    cur.v = approach(cur.v, tg.v, 1.4, dt);
    cur.spread = approach(cur.spread, tg.spread, 1.8, dt);
    cur.jitter = approach(cur.jitter, tg.jitter, 3, dt);
    cur.trail = approach(cur.trail, tg.trail, 3, dt);
    cur.hits = approach(cur.hits, tg.hits, 3, dt);
    cur.alpha = approach(cur.alpha, tg.alpha, 2.2, dt);

    cx += cur.v * dt;

    /* Беат 1: «умеет перескакивать» — редкий резкий скачок вместо плавного хода */
    if (mode === 'jump' && Math.random() < dt * .8) cx += 60 + Math.random() * 90;

    if (cx > X_MAX) {
      if (cur.hits > .4) {
        flashes.push({ y: LANE_Y + (Math.random() - .5) * 26, life: 1 });
        if (flashes.length > 40) flashes.shift();
      }
      cx = X_MIN;
      history.length = 0;
    }

    history.push(cx);
    if (history.length > 22) history.shift();

    for (var f = flashes.length - 1; f >= 0; f--) {
      flashes[f].life -= dt * .22;
      if (flashes[f].life <= 0) flashes.splice(f, 1);
    }
  }

  function dot(x, y, r, a, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
    g.addColorStop(0, color);
    g.addColorStop(.34, color);
    g.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, 6.283);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (cur.alpha < .01) return;

    var jx = cur.jitter ? (Math.random() - .5) * 7 * cur.jitter : 0;
    var jy = cur.jitter ? (Math.random() - .5) * 5 * cur.jitter : 0;

    /* экран справа: копит вспышки, пока электрон в них попадает */
    if (cur.hits > .05 || flashes.length) {
      ctx.globalAlpha = .3 * Math.max(cur.hits, flashes.length ? .5 : 0) * cur.alpha;
      ctx.fillStyle = INK;
      ctx.fillRect(X_MAX + 10, LANE_Y - 18, 2, 36);
      for (var f = 0; f < flashes.length; f++) {
        dot(X_MAX + 11, flashes[f].y, 2.4, flashes[f].life * .5 * cur.alpha, '#ffffff');
      }
    }

    /* след пучка */
    if (cur.trail > .02) {
      for (var i = 0; i < history.length; i++) {
        var k = i / history.length;
        dot(history[i], LANE_Y, 2 + 2.6 * k, k * k * .3 * cur.trail * cur.alpha, ACCENT);
      }
    }

    /* облако шансов: плотность промодулирована интерференцией */
    if (cur.spread > .02) {
      for (var c = 0; c < N; c++) {
        var p = cloud[c];
        var breath = 1 + .12 * Math.sin(t * 1.1 * p.sp + p.ph);
        var ox = p.gx * 190 * cur.spread * breath;
        var oy = p.gy * 15 * cur.spread * breath;
        var band = Math.cos(ox * .045);
        var a = (.16 + .34 * band * band) * cur.spread * cur.alpha;
        dot(cx + ox + jx, LANE_Y + oy + jy, 1.9, a, ACCENT);
      }
    }

    /* ядро: чем сильнее размазан, тем слабее точка */
    dot(cx + jx, LANE_Y + jy, 5.2, (1 - .82 * cur.spread) * cur.alpha, ACCENT);
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
      console.error('electron-lane: сбой в кадре', e);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(function (now) { last = now; frame(now); });

  /* ── связь с колодой ─────────────────────────────────────────
     Беат берём из data-beat. У слайдов без беата (титул, развороты, финал)
     поведение сохраняется от предыдущего: объект не сбрасывается в исходное
     состояние оттого, что лектор показал разворот. */
  function pick(section) {
    if (!section) return;
    if (section.classList.contains('slide-closing')) { mode = 'fade'; return; }
    if (section.classList.contains('scan-loop')) { mode = 'idle'; return; }
    var beat = section.getAttribute('data-beat');
    if (beat && BY_BEAT[beat]) mode = BY_BEAT[beat];
  }

  if (window.Reveal) {
    Reveal.on('ready', function (e) { pick(e.currentSlide); });
    Reveal.on('slidechanged', function (e) { pick(e.currentSlide); });
  }

  window.__electronLane = { get mode() { return mode; }, state: cur };
})();
