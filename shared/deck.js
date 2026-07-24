/* Рендер колоды: window.DECK (spec из slides.js) -> DOM-секции reveal.js.
   Обычный скрипт без модулей — колода обязана открываться с file:// без сети
   и без сборки. Контент попадает в DOM только через textContent. */

(function () {
  'use strict';

  var spec = window.DECK;
  var root = document.getElementById('slides');
  if (!spec || !root) {
    console.error('deck.js: нет window.DECK или #slides');
    return;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var BLOCKS = {
    lead: function (b) {
      return el('div', 'blk blk-lead', b.text);
    },
    bullets: function (b) {
      var ul = el('ul', 'blk blk-bullets');
      b.items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      return ul;
    },
    formula: function (b) {
      var box = el('div', 'blk blk-formula');
      box.appendChild(el('div', 'formula-text' + (b.size === 'small' ? ' small' : ''), b.text));
      if (b.caption) box.appendChild(el('div', 'formula-caption', b.caption));
      return box;
    },
    demo: function (b) {
      var box = el('div', 'blk blk-demo');
      box.appendChild(el('div', 'blk-label', 'ЗАГЛУШКА · ИНТЕРАКТИВНАЯ ДЕМКА'));
      if (b.src) {
        box.classList.add('has-frame');
        var f = el('iframe', 'demo-frame');
        f.setAttribute('data-src', b.src); /* reveal лениво подгружает по data-src */
        f.setAttribute('data-preload', ''); /* прогрев в пределах viewDistance — демка не стартует холодной на глазах у зала */
        f.setAttribute('allow', 'fullscreen');
        box.appendChild(f);
      }
      if (b.desc) box.appendChild(el('div', 'blk-desc', b.desc));
      return box;
    },
    live: function (b) {
      var box = el('div', 'blk blk-live');
      box.appendChild(el('div', 'blk-label', 'ЖИВОЙ ОПЫТ · РЕКВИЗИТ'));
      box.appendChild(el('div', 'blk-desc', b.desc));
      return box;
    },
    compare: function (b) {
      var row = el('div', 'blk blk-compare');
      [b.left, b.right].forEach(function (col) {
        var c = el('div', 'compare-col');
        c.appendChild(el('div', 'compare-title', col.title));
        c.appendChild(el('div', 'compare-body', col.body));
        row.appendChild(c);
      });
      return row;
    },
    video: function (b) {
      var box = el('div', 'blk blk-video');
      if (b.src) {
        var f = el('iframe', 'video-frame');
        f.setAttribute('data-src', b.src);
        f.setAttribute('allow', 'autoplay; fullscreen');
        box.appendChild(f);
      } else {
        box.appendChild(el('div', 'blk-label', 'ЗАГЛУШКА · ВИДЕО'));
      }
      if (b.caption) box.appendChild(el('div', 'blk-desc', b.caption));
      return box;
    }
  };

  var accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim();

  spec.slides.forEach(function (sl) {
    var s = document.createElement('section');
    var inner = el('div', 'slide-inner');

    if (sl.type === 'title' || sl.type === 'closing') {
      s.className = 'slide-accent slide-' + sl.type;
      s.setAttribute('data-background-color', accent);
      inner.appendChild(el('h1', 'accent-title', sl.title));
      if (sl.subtitle) inner.appendChild(el('p', 'accent-subtitle', sl.subtitle));
      if (sl.tag) inner.appendChild(el('p', 'accent-tag', sl.tag));
    } else {
      s.className = 'slide-content';
      if (sl.kicker) inner.appendChild(el('p', 'kicker', sl.kicker));
      inner.appendChild(el('h2', 'heading', sl.heading));
      var wrap = el('div', 'blocks');
      (sl.blocks || []).forEach(function (b) {
        var render = BLOCKS[b.kind];
        if (render) wrap.appendChild(render(b));
        else console.warn('deck.js: неизвестный тип блока', b.kind);
      });
      inner.appendChild(wrap);
    }

    s.appendChild(inner);
    if (sl.notes) s.appendChild(el('aside', 'notes', sl.notes));
    root.appendChild(s);
  });

  if (spec.meta && spec.meta.title) {
    document.title = spec.meta.title + (spec.meta.event ? ' — ' + spec.meta.event : '');
  }

  Reveal.initialize({
    width: 1280,
    height: 720,
    margin: 0.04,
    hash: true,                       /* ссылка на конкретный слайд */
    center: false,
    transition: 'none',
    controls: false,
    progress: true,
    slideNumber: true,
    /* null: iframe с data-preload прогреваются заранее (viewDistance), остальные — при показе.
       Кликер (PageUp/PageDown) работает из коробки: дефолтные клавиши reveal 5.x. */
    preloadIframes: null,
    plugins: [RevealNotes]
  });
})();
