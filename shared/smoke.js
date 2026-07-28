/* Струйка дыма: гладкий столбик, который срывается в хаос.

   Физика, а не декорация. У реальной струи возмущение не появляется вдруг:
   оно есть всегда, но пока течение медленное, вязкость его гасит. С ростом
   скорости малое возмущение начинает РАСТИ — по высоте экспоненциально, это
   линейная стадия неустойчивости. Когда амплитуда сравнивается с толщиной
   самой струи, линейная теория перестаёт работать, моды перемешиваются,
   и начинается хаос.

   Отсюда всё, что нужно хуку:
     · внизу столбик гладкий — возмущение ещё мало;
     · выше идут ровные волны — растущая мода видна невооружённым глазом;
     · ещё выше клубы — нелинейная стадия;
     · и главное: чем сильнее поток, тем РАНЬШЕ срыв. Ровно то, что зал
       предсказывает в акте 0, и заранее посеянная мысль про Рейнольдса.

   Используется дважды: фоном титульного слайда и демкой акта 0. */

(function (global) {
  'use strict';

  var A0 = 0.55;        /* начальное возмущение, px */
  var A_SAT = 44;       /* насыщение: дальше линейная стадия кончается */
  /* Подобран так, чтобы на сцене демки (430 px) срыв ходил по кадру от
     верхней кромки до нижней трети, пока ползунок идёт от 0.7 до 2.6. */
  var L_GROW = 78;
  var LAMBDA = 150;     /* длина волны самой быстрой моды */

  function makeSmoke(opts) {
    opts = opts || {};
    var st = {
      parts: [],
      flow: opts.flow || 1,          /* «расход»: аналог числа Рейнольдса */
      spawn: 0,
      rate: opts.rate || 46,
      t: 0,
      width: opts.width || 1000,
      height: opts.height || 430,
      srcX: opts.srcX != null ? opts.srcX : 0.5,   /* доля ширины */
      maxParts: opts.maxParts || 460
    };

    /* Масштаб роста падает с потоком: сильнее поток — быстрее растёт
       возмущение — ниже точка срыва. Это и есть ответ на вопрос зала. */
    function growScale() { return L_GROW / Math.pow(st.flow, 0.85); }

    /* Амплитуда возмущения на высоте h. Экспоненциальный рост с выходом
       на насыщение: tanh не даёт улететь в бесконечность, как это делает
       чистая экспонента, и физически отвечает нелинейной стадии. */
    function amp(h) {
      var lin = A0 * Math.exp(h / growScale());
      return A_SAT * Math.tanh(lin / A_SAT);
    }

    /* Высота, на которой срыв уже очевиден: амплитуда взяла половину
       насыщения. Нужна и для подписи, и для линии на демке. */
    function breakHeight() {
      return growScale() * Math.log(A_SAT / (2 * A0));
    }

    function spawnOne() {
      st.parts.push({
        x0: (Math.random() - 0.5) * 5,
        h: 0,
        seed: Math.random() * 6.283,
        phase: Math.random() * 6.283,
        wander: 0,
        life: 0,
        size: 4 + Math.random() * 3
      });
      if (st.parts.length > st.maxParts) st.parts.shift();
    }

    function step(dt) {
      st.t += dt;
      var rise = 96 * st.flow;                    /* скорость подъёма, px/с */
      var sat = A_SAT;

      st.spawn += st.rate * st.flow * dt;
      while (st.spawn >= 1) { st.spawn -= 1; spawnOne(); }

      for (var i = st.parts.length - 1; i >= 0; i--) {
        var p = st.parts[i];
        p.h += rise * dt;
        p.life += dt;

        /* Хаотическая добавка включается вместе с насыщением: пока
           амплитуда мала, блуждания почти нет, и столбик держится гладким. */
        var a = amp(p.h), k = a / sat;
        p.wander += (Math.random() - 0.5) * k * k * 62 * dt;

        if (p.h > st.height * 1.12) st.parts.splice(i, 1);
      }
    }

    /* Поперечное смещение частицы: две моды с разными длинами волн плюс
       накопленное блуждание. Второй мода нужна, чтобы после срыва картинка
       не осталась периодической. */
    function offset(p) {
      var a = amp(p.h);
      var w1 = Math.sin(6.283 * p.h / LAMBDA + p.phase);
      var w2 = Math.sin(6.283 * p.h / (LAMBDA * 0.42) + p.seed * 2 + st.t * 0.6);
      return a * (w1 + 0.45 * w2) + p.wander;
    }

    function draw(ctx, w, h, style) {
      style = style || {};
      var cx = w * st.srcX, base = h + 6;
      var tint = style.tint || '210,236,240';
      var alpha = style.alpha != null ? style.alpha : 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      st.parts.forEach(function (p) {
        var y = base - p.h;
        if (y < -30) return;
        var a = amp(p.h), k = Math.min(1, a / A_SAT);
        var x = cx + p.x0 + offset(p);
        /* клуб растёт по мере подъёма и тает */
        var r = p.size * (1 + p.h / 190 + k * 1.5);
        var fade = Math.max(0, 1 - p.h / (h * 1.05));
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + tint + ',' + (0.30 * fade * alpha) + ')');
        g.addColorStop(1, 'rgba(' + tint + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      });
      ctx.restore();
    }

    st.step = step;
    st.draw = draw;
    st.amp = amp;
    st.breakHeight = breakHeight;
    st.reset = function () { st.parts = []; st.spawn = 0; };
    return st;
  }

  global.makeSmoke = makeSmoke;
})(window);
