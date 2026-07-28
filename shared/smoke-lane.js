/* Струйка «Турбулентности»: живёт на титуле и переходит с ним в акт 0.

   Физика в shared/smoke.js. Слой сквозной, поверх всей колоды, и на границе
   титул → акт 0 не гаснет и не перезапускается: зал видит ту же самую струю,
   которая шла, пока все рассаживались. Первый слайд акта 0 не показывает
   новую картинку, а договаривает уже увиденную.

   Где показывать — решает контент: слайд объявляет smoke:true, deck.js
   вешает data-smoke. Источник смещён вправо, текст живёт слева и с дымом
   не спорит. При prefers-reduced-motion струя замирает. */

(function () {
  'use strict';
  if (!window.makeSmoke) return;

  var W = 1280, H = 720;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'smoke-lane';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');

  var smoke = window.makeSmoke({ width: W, height: H, flow: 1.15, srcX: 0.74, rate: 34, maxParts: 520 });
  var vis = 0, target = 0, raf, last = 0;

  function attach() {
    var host = document.querySelector('.reveal-viewport') || document.body;
    host.appendChild(canvas);
    resize();
    window.addEventListener('resize', resize);
    if (window.Reveal && Reveal.on) {
      Reveal.on('slidechanged', onSlide);
      Reveal.on('ready', onSlide);
    }
    onSlide();
    raf = requestAnimationFrame(function (t) { last = t; frame(t); });
  }

  function onSlide() {
    var cur = window.Reveal && Reveal.getCurrentSlide && Reveal.getCurrentSlide();
    target = cur && cur.hasAttribute('data-smoke') ? 1 : 0;
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;

    vis += (target - vis) * Math.min(1, dt * 1.7);
    if (vis > 0.004) {
      if (!reduced) smoke.step(dt);
      var r = canvas.getBoundingClientRect();
      if (r.width && r.height) {
        var dpr = window.devicePixelRatio || 1;
        var s = Math.min(r.width / W, r.height / H);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr * s, 0, 0, dpr * s,
                         (r.width - W * s) / 2 * dpr, (r.height - H * s) / 2 * dpr);
        smoke.draw(ctx, W, H, { tint: '190,228,236', alpha: vis });
      }
    } else if (vis <= 0.004 && smoke.parts.length) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      smoke.reset();
    }
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();

  window.__smokeLane = { smoke: smoke, get visible() { return vis; } };
})();
