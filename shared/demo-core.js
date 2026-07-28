/* Общее ядро интерактивных демок.

   Подключается после react / react-dom / htm, до кода самой демки.
   Здесь живёт всё, что иначе расползлось бы по файлам пятью слегка
   разными копиями: канва с retina-масштабированием, цикл анимации,
   выборка точек из распределения и UI-компоненты.

   Вида здесь нет вообще — только классы из shared/demo.css. */

(function (global) {
  'use strict';

  var h = React.createElement;
  var html = htm.bind(h);
  var useRef = React.useRef, useEffect = React.useEffect, useState = React.useState;

  /* ── математика ──────────────────────────────────────────── */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Выборка из произвольной плотности методом отбраковки.
     pdf не обязана быть нормированной, ymax — её верхняя оценка. */
  function sampleFrom(pdf, xmin, xmax, ymax) {
    for (var i = 0; i < 400; i++) {
      var x = xmin + Math.random() * (xmax - xmin);
      if (Math.random() * ymax <= pdf(x)) return x;
    }
    return xmin + Math.random() * (xmax - xmin);
  }

  /* Русские числительные: plural(2, 'электрон', 'электрона', 'электронов') */
  function plural(n, one, few, many) {
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if ([2, 3, 4].indexOf(n % 10) >= 0 && [12, 13, 14].indexOf(n % 100) < 0) return few;
    return many;
  }

  /* ── канва и цикл анимации ───────────────────────────────────
     Логические координаты W×H вписываются в элемент с сохранением
     пропорций; drawFn получает готовый ctx уже в этих координатах.
     step(dt) вызывается каждый кадр, dt ограничен сверху, чтобы
     после сворачивания вкладки не было скачка на секунды.
     Исключение внутри кадра не рвёт цикл насмерть: иначе одна ошибка
     навсегда замораживает демку посреди лекции. */

  function useStage(W, H, step, draw) {
    var ref = useRef(null);
    var fns = useRef({});
    fns.current.step = step;
    fns.current.draw = draw;

    useEffect(function () {
      var canvas = ref.current;
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var raf, last = 0, alive = true, broken = false;

      function frame(now) {
        if (!alive) return;
        var dt = Math.min(0.05, (now - last) / 1000 || 0);
        last = now;
        try {
          if (fns.current.step) fns.current.step(dt);
          paint(ctx, canvas, W, H, fns.current.draw);
        } catch (e) {
          if (!broken) { broken = true; console.error('демка: сбой в кадре', e); }
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(function (t) { last = t; frame(t); });

      /* Прогон модели без анимации: rAF не тикает, пока вкладка скрыта,
         поэтому автопроверкам нужен способ продвинуть время руками.
         __demoTick(dt, шагов) — ровно те же вызовы step, что в кадре. */
      global.__demoTick = function (dt, times) {
        var n = times || 1;
        for (var i = 0; i < n; i++) if (fns.current.step) fns.current.step(dt || 1 / 60);
        return n;
      };

      return function () { alive = false; cancelAnimationFrame(raf); global.__demoTick = null; };
    }, []);

    return ref;
  }

  function paint(ctx, canvas, W, H, draw) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dpr = window.devicePixelRatio || 1;
    var cw = Math.round(rect.width * dpr), ch = Math.round(rect.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    var s = Math.min(rect.width / W, rect.height / H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s,
                     (rect.width - W * s) / 2 * dpr, (rect.height - H * s) / 2 * dpr);
    if (draw) draw(ctx, W, H);
  }

  /* ── примитивы рисования ─────────────────────────────────── */

  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Свечение: на тёмной сцене всё живое светится, а не лежит плоским.
     rgb — строка «R,G,B», чтобы не плодить конверсии в каждой демке. */
  function glow(ctx, x, y, r, rgb, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(.35, 'rgba(' + rgb + ',' + (a * .5) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  }

  /* Электрон: светящийся кружок с минусом. Один и тот же значок во всех
     демках — зал должен узнавать его без пояснений. */
  function electron(ctx, x, y, scale) {
    scale = scale || 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(scale, scale);
    glow(ctx, 0, 0, 26, '122,166,255', .45);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.284);
    ctx.fillStyle = '#7aa6ff'; ctx.fill();
    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.restore();
  }

  /* Приборный индикатор: подпись капсом и крупное моноширинное число.
     Тот же элемент, что в «двух щелях», — чтобы во всех демках показания
     читались одинаково и с задних рядов. */
  function readout(ctx, x, y, capt, value, color) {
    ctx.textAlign = 'right';
    ctx.font = '600 15px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#8c93ac';
    ctx.fillText(capt, x, y);
    ctx.font = '600 32px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = color || '#ffb454';
    ctx.fillText(String(value), x, y + 38);
    ctx.textAlign = 'center';
  }

  function label(ctx, x, y, text, size, color, align) {
    ctx.fillStyle = color || '#8c93ac';
    ctx.font = (size || 19) + 'px "Golos Text", system-ui, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.fillText(text, x, y);
  }

  /* ── UI ──────────────────────────────────────────────────── */

  function Btn(p) {
    return html`<button class=${'btn' + (p.active ? ' is-active' : '') + (p.action ? ' btn-action' : '')}
                        disabled=${!!p.disabled} onClick=${p.onClick}>${p.children}</button>`;
  }

  /* cls — модификатор группы: 'step' для шагового регулятора,
     где значению хватает пары знаков и общая ширина ползунка лишняя. */
  function Group(p) {
    return html`<div class=${'control-group' + (p.cls ? ' ' + p.cls : '')}>
      ${p.label ? html`<span class="control-label">${p.label}</span>` : null}
      ${p.children}
    </div>`;
  }

  /* Ползунок; при log:true шкала логарифмическая, value/min/max — в
     реальных единицах, а не в позициях ручки. */
  function Slider(p) {
    var log = !!p.log;
    var toPos = function (v) { return log ? Math.log10(v) : v; };
    var fromPos = function (x) { return log ? Math.pow(10, x) : x; };
    return html`<div class="control-group">
      ${p.label ? html`<span class="control-label">${p.label}</span>` : null}
      <input type="range" class="slider"
             min=${toPos(p.min)} max=${toPos(p.max)}
             step=${p.step != null ? p.step : (toPos(p.max) - toPos(p.min)) / 200}
             value=${toPos(p.value)}
             onInput=${function (e) { p.onChange(fromPos(parseFloat(e.target.value))); }} />
      ${p.display ? html`<span class="control-value">${p.display}</span>` : null}
    </div>`;
  }

  function Status(p) {
    /* текст обязан лежать в одном span: прямые текстовые узлы во flex
       становятся отдельными элементами и пробелы между ними схлопываются */
    return html`<div class="status"><span dangerouslySetInnerHTML=${{ __html: p.html }}></span></div>`;
  }

  function mount(Component) {
    ReactDOM.createRoot(document.getElementById('root')).render(h(Component));
  }

  global.DemoCore = {
    h: h, html: html,
    clamp: clamp, ease: ease, lerp: lerp, sampleFrom: sampleFrom, plural: plural,
    useStage: useStage, roundRect: roundRect, electron: electron, label: label,
    glow: glow, readout: readout,
    Btn: Btn, Group: Group, Slider: Slider, Status: Status, mount: mount
  };
})(window);
