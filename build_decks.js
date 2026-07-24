// Генератор презентаций для лекций в Марабу.
// Запуск:  npm i pptxgenjs && node build_decks.js
// Кладёт lekciya_elektron.pptx и lekciya_turbulentnost.pptx рядом со скриптом.
//
// Дизайн намеренно минимальный — под последующий прогон через Claude Design.
// Все интерактивные места помечены блоками kind:"demo" (пунктирные заглушки),
// живой реквизит — kind:"live".

const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = __dirname;

const HFONT = "Cambria";   // заголовки
const BFONT = "Calibri";   // тело

// Палитры: индиго — электрон, бирюза — турбулентность. Hex без "#", без альфы.
const PAL_E = { bg:"FFFFFF", ink:"1B1B2F", muted:"6E6E80", accent:"3E2F8E",
  chip:"F2F0FB", demoFill:"EDEAF8", titleSub:"D9D4F2" };
const PAL_T = { bg:"FFFFFF", ink:"112530", muted:"5C6B73", accent:"0F6E86",
  chip:"EDF5F7", demoFill:"E2F0F3", titleSub:"CFE6ED" };

// ---------- блоки контента ----------
function bulletsBlk(s, c, y, h, items){
  const arr = items.map((t,i)=>({ text:t, options:{
    bullet:{ code:"2013", indent:16 }, breakLine: i!==items.length-1,
    paraSpaceAfter:10, fontFace:BFONT, fontSize:16, color:c.ink }}));
  s.addText(arr, { x:0.8, y, w:11.7, h, valign:"top", margin:0 });
}
function formulaBlk(s, c, y, h, text, caption, size){
  s.addShape("roundRect", { x:0.7, y, w:11.93, h, rectRadius:0.08,
    fill:{ color:c.chip }, line:{ type:"none" } });
  s.addText(text, { x:0.9, y: caption? y+0.2 : y, w:11.5,
    h: caption? h-0.8 : h, align:"center", valign:"middle",
    fontFace:HFONT, fontSize:size||28, bold:true, color:c.accent, margin:0 });
  if(caption) s.addText(caption, { x:1.0, y:y+h-0.64, w:11.3, h:0.5,
    align:"center", valign:"top", fontFace:BFONT, fontSize:13, italic:true,
    color:c.muted, margin:0 });
}
function demoBlk(s, c, y, h, desc){
  s.addShape("roundRect", { x:0.7, y, w:11.93, h, rectRadius:0.1,
    fill:{ color:c.demoFill }, line:{ color:c.accent, width:1.5, dashType:"dash" } });
  s.addText("ЗАГЛУШКА · ИНТЕРАКТИВНАЯ ДЕМКА", { x:0.9, y:y+0.2, w:11.5, h:0.35,
    align:"center", fontFace:BFONT, fontSize:12, bold:true, color:c.accent,
    charSpacing:2, margin:0 });
  s.addText(desc, { x:1.2, y:y+0.66, w:10.9, h:h-1.02, align:"center",
    valign:"middle", fontFace:BFONT, fontSize:16, color:c.ink, margin:0 });
}
function liveBlk(s, c, y, h, desc){
  s.addShape("roundRect", { x:0.7, y, w:11.93, h, rectRadius:0.1,
    fill:{ color:c.chip }, line:{ type:"none" } });
  s.addText("ЖИВОЙ ОПЫТ · РЕКВИЗИТ", { x:0.9, y:y+0.18, w:11.5, h:0.35,
    align:"center", fontFace:BFONT, fontSize:12, bold:true, color:c.accent,
    charSpacing:2, margin:0 });
  s.addText(desc, { x:1.2, y:y+0.62, w:10.9, h:h-0.96, align:"center",
    valign:"middle", fontFace:BFONT, fontSize:16, color:c.ink, margin:0 });
}
function leadBlk(s, c, y, h, text){
  s.addText(text, { x:0.78, y, w:11.7, h, fontFace:HFONT, fontSize:26,
    bold:true, color:c.accent, valign:"top", margin:0, lineSpacingMultiple:1.06 });
}
function compareBlk(s, c, y, h, left, right){
  const gap=0.4, w=(11.93-gap)/2, x1=0.7, x2=0.7+w+gap;
  [[x1,left],[x2,right]].forEach(([x,col])=>{
    s.addShape("roundRect", { x, y, w, h, rectRadius:0.08,
      fill:{ color:c.chip }, line:{ type:"none" } });
    s.addText(col.title, { x:x+0.3, y:y+0.22, w:w-0.6, h:0.5, fontFace:HFONT,
      fontSize:19, bold:true, color:c.accent, margin:0 });
    s.addText(col.body, { x:x+0.3, y:y+0.85, w:w-0.6, h:h-1.05, fontFace:BFONT,
      fontSize:15, color:c.ink, valign:"top", margin:0, lineSpacingMultiple:1.08 });
  });
}
function renderBlock(s, c, b, y, h){
  if(b.kind==="bullets") bulletsBlk(s,c,y,h,b.items);
  else if(b.kind==="formula") formulaBlk(s,c,y,h,b.text,b.caption,b.size);
  else if(b.kind==="demo") demoBlk(s,c,y,h,b.desc);
  else if(b.kind==="live") liveBlk(s,c,y,h,b.desc);
  else if(b.kind==="lead") leadBlk(s,c,y,h,b.text);
  else if(b.kind==="compare") compareBlk(s,c,y,h,b.left,b.right);
}
function blockH(kind, only){
  if(kind==="demo") return only?3.6:2.75;
  if(kind==="live") return only?3.0:1.7;
  if(kind==="formula") return only?2.8:1.9;
  if(kind==="compare") return only?4.2:3.3;
  if(kind==="lead") return only?2.3:1.2;
  return 0;
}

// ---------- типы слайдов ----------
function fullBg(s, color){
  s.addShape("rect", { x:0, y:0, w:13.333, h:7.5, fill:{ color }, line:{ type:"none" } });
}
function titleSlide(p, c, sl){
  const s = p.addSlide();
  fullBg(s, c.accent);
  s.addText(sl.title, { x:0.9, y:2.15, w:11.5, h:1.7, fontFace:HFONT, fontSize:46,
    bold:true, color:"FFFFFF", valign:"bottom", margin:0, lineSpacingMultiple:1.0 });
  s.addText(sl.subtitle, { x:0.9, y:3.95, w:11.2, h:0.9, fontFace:BFONT, fontSize:22,
    color:"FFFFFF", margin:0 });
  s.addText(sl.tag, { x:0.9, y:5.15, w:11.2, h:0.4, fontFace:BFONT, fontSize:13,
    bold:true, color:c.titleSub, charSpacing:2, margin:0 });
  if(sl.notes) s.addNotes(sl.notes);
}
function closingSlide(p, c, sl){
  const s = p.addSlide();
  fullBg(s, c.accent);
  s.addText(sl.title, { x:0.9, y:2.3, w:11.5, h:2.0, fontFace:HFONT, fontSize:32,
    bold:true, color:"FFFFFF", valign:"middle", margin:0, lineSpacingMultiple:1.06 });
  s.addText(sl.subtitle, { x:0.9, y:4.5, w:11.4, h:1.9, fontFace:BFONT, fontSize:16,
    color:c.titleSub, valign:"top", margin:0, lineSpacingMultiple:1.12 });
  if(sl.notes) s.addNotes(sl.notes);
}
function contentSlide(p, c, sl, idx){
  const s = p.addSlide();
  s.background = { color: c.bg };
  s.addText(sl.kicker, { x:0.78, y:0.5, w:11.7, h:0.3, fontFace:BFONT, fontSize:12.5,
    bold:true, color:c.accent, charSpacing:2, margin:0 });
  s.addText(sl.heading, { x:0.78, y:0.84, w:11.7, h:1.0, fontFace:HFONT, fontSize:32,
    bold:true, color:c.ink, valign:"top", margin:0, lineSpacingMultiple:1.02 });

  const blocks = sl.blocks;
  let hs, startY;
  if(blocks.length===1){ hs=[blockH(blocks[0].kind,true)]; startY=2.2; }
  else {
    startY=1.95;
    if(blocks.some(b=>b.kind==="bullets")){
      const other = blocks.find(b=>b.kind!=="bullets");
      const oh = blockH(other.kind,false);
      const bh = 5.0 - oh - 0.3;
      hs = blocks.map(b=> b.kind==="bullets"? bh : oh);
    } else {
      hs = blocks.map(b=>blockH(b.kind,false));
    }
  }
  let y = startY;
  blocks.forEach((b,i)=>{ renderBlock(s,c,b,y,hs[i]); y += hs[i] + 0.3; });

  s.addText(String(idx), { x:12.4, y:7.06, w:0.7, h:0.3, align:"right",
    fontFace:BFONT, fontSize:10, color:c.muted, margin:0 });
  if(sl.notes) s.addNotes(sl.notes);
}

async function buildDeck(spec, outPath){
  const p = new pptxgen();          // один экземпляр на файл
  p.layout = "LAYOUT_WIDE";         // ставить ДО добавления слайдов
  let n = 0;
  spec.slides.forEach(sl=>{
    if(sl.type==="title") titleSlide(p, spec.pal, sl);
    else if(sl.type==="closing") closingSlide(p, spec.pal, sl);
    else { n++; contentSlide(p, spec.pal, sl, n); }
  });
  await p.writeFile({ fileName: outPath });
  console.log("wrote", outPath);
}

// ================= ЭЛЕКТРОН (младшие, 11–14) =================
const electron = { pal: PAL_E, slides: [
  { type:"title", title:"Электрон", subtitle:"Шарик — или что-то более странное?",
    tag:"КВАНТОВАЯ МЕХАНИКА · МЛАДШАЯ ГРУППА (11–14)",
    notes:"Заглушки стоят на местах интерактивных демок. Дизайн намеренно простой — под доработку в Claude Design." },
  { type:"content", kicker:"О ЧЁМ ЛЕКЦИЯ", heading:"Один вопрос на всю лекцию",
    blocks:[
      { kind:"lead", text:"Электрон — это крошечный шарик или что-то, что не влезает в привычные слова?" },
      { kind:"bullets", items:[
        "Свет и атом уже прошли — теперь берёмся за вещество",
        "Правило: одна формула, остальное — «предскажи → покажи → вау»",
        "В финале передаём вопрос дальше, в «Интерпретации»" ] }
    ], notes:"Сквозной вопрос. Правило одной формулы. Цикл предскажи-покажи-вау." },
  { type:"content", kicker:"ШАГ 1 · ХУК", heading:"Статика в руках",
    blocks:[
      { kind:"bullets", items:[
        "Шарик о волосы → притягивает бумажки и струйку воды",
        "Внутри всех вещей есть что-то мелкое и заряженное",
        "Имя этому — электрон" ] },
      { kind:"live", desc:"Воздушный шарик, шерсть, мелкие бумажки (и Ван де Грааф, если камп даст). 2–3 минуты — это затравка интереса." }
    ], notes:"Хук статикой, тактильно, коротко." },
  { type:"content", kicker:"ШАГ 2", heading:"Сначала — обычный шарик",
    blocks:[
      { kind:"bullets", items:[
        "Катодный луч гнётся магнитом и электрическим полем",
        "Значит, это поток заряженных частиц (Томсон)",
        "У электрона есть масса и заряд — пока это просто шарик" ] },
      { kind:"demo", desc:"Пучок электронов, отклоняющийся в магнитном поле (опционально — чтобы «шарик» был убедителен перед сломом)" }
    ], notes:"Закрепляем интуицию «шарик» — её сломаем на следующем шаге." },
  { type:"content", kicker:"ШАГ 3 · ПРОГНОЗ", heading:"Стреляем по одному в две щели",
    blocks:[
      { kind:"compare",
        left:{ title:"Если электрон — шарик", body:"Две полоски напротив щелей — как мячики, брошенные сквозь две дырки в заборе." },
        right:{ title:"Голосуем всем залом", body:"Что увидим на экране? Фиксируем прогноз поднятием рук — до того, как покажем." } }
    ], notes:"Голосование до показа: две полоски?" },
  { type:"content", kicker:"ШАГ 3 · ГВОЗДЬ", heading:"А на экране — много полос",
    blocks:[
      { kind:"demo", desc:"Накопление двухщелевой картины (Тономура): точки копятся по одной и складываются в интерференцию — даже когда электроны летят строго по одному." }
    ], notes:"Кульминация: одному шарику не с чем интерферировать — а картина собирается." },
  { type:"content", kicker:"ШАГ 4", heading:"Волна шансов",
    blocks:[
      { kind:"bullets", items:[
        "Через какую щель пролетел — сказать нельзя",
        "Электрон описывается волной: не волной вещества, а волной вероятностей (ψ)",
        "Складываются именно шансы — поэтому и получаются полосы",
        "Боровская «орбита» — на самом деле облако шансов вокруг ядра" ] },
      { kind:"demo", desc:"Волна шансов → интерференционные полосы и электронное облако" }
    ], notes:"ψ как карта вероятностей. Орбита Бора → облако. В измерение не углубляемся." },
  { type:"content", kicker:"ШАГ 5", heading:"Дуализм и волна де Бройля",
    blocks:[
      { kind:"formula", text:"λ = h / (m · v)",
        caption:"Тяжелее и быстрее → короче волна.   Мяч: ~10⁻³⁴ м   ·   электрон: ~10⁻¹⁰ м" },
      { kind:"demo", desc:"Калькулятор длины волны де Бройля: ползунки масса/скорость с пресетами (мяч, человек, пылинка, электрон)" }
    ], notes:"Единственная формула. Контраст масштабов = разгадка «почему у нас не видно»." },
  { type:"closing", title:"А что эта волна на самом деле?",
    subtitle:"Она реальна — или это просто наше незнание? Что меняется в момент, когда мы смотрим? Об этом спорят до сих пор. Продолжение — в лекции «Интерпретации».",
    notes:"Клиффхэнгер, дверь открыта." }
]};

// ================= ТУРБУЛЕНТНОСТЬ (старшие, 14–18) =================
const turb = { pal: PAL_T, slides: [
  { type:"title", title:"Течения и турбулентность", subtitle:"Вся лекция — про одно число",
    tag:"КЛАССИЧЕСКАЯ ФИЗИКА · СТАРШАЯ ГРУППА (14–18)",
    notes:"Заглушки на местах интерактивных демок. Дизайн простой — под доработку в Claude Design." },
  { type:"content", kicker:"АКТ 0 · ХУК", heading:"Гладко — а потом хаос",
    blocks:[
      { kind:"bullets", items:[
        "Дымок или тонкая струйка: гладкий столбик срывается в хаос",
        "Вся сегодняшняя лекция — в этой одной картинке",
        "Спойлер: физика этого перехода не решена (Премия тысячелетия, $1 млн)" ] },
      { kind:"demo", desc:"Гладкий столбик → срыв в хаос; ползунок «расход»: сильнее поток — раньше срыв. Живой дым/струя тоже." }
    ], notes:"Рамка всей лекции; обещание, которое закроем в финале." },
  { type:"content", kicker:"АКТ 1 · СУПЕРСИЛА", heading:"Угадать физику из одних размерностей",
    blocks:[
      { kind:"bullets", items:[
        "От чего зависит период маятника — от массы груза? от амплитуды?",
        "Из единиц измерения время собирается только из длины и g",
        "Масса выпадает сама — и это предсказание можно проверить" ] },
      { kind:"formula", text:"T ≈ √( L / g )",
        caption:"Размерности фиксируют зависимость от L и g; массы в ответе нет" }
    ], notes:"Продаём метод: угадываем формулу без вывода." },
  { type:"content", kicker:"АКТ 1 · ПИ-ТЕОРЕМА", heading:"Сколько у задачи реальных ручек",
    blocks:[
      { kind:"formula", text:"N величин, k размерностей  →  N − k безразмерных групп", size:22,
        caption:"Столько независимых «ручек» на самом деле управляют явлением" },
      { kind:"demo", desc:"Размерный конструктор: собери величину из единиц + калькулятор числа безразмерных групп" }
    ], notes:"Пи-теорема на пальцах." },
  { type:"content", kicker:"АКТ 1 · КУЛЬМИНАЦИЯ", heading:"Энергия атомной бомбы — с фотографии",
    blocks:[
      { kind:"formula", text:"R ~ (E · t² / ρ)^(1/5)   →   E ~ ρ · R⁵ / t²", size:22,
        caption:"Дж. Тейлор оценил мощность «Тринити» по рассекреченным кадрам взрыва" },
      { kind:"bullets", items:[
        "Кадр с масштабом и меткой времени → радиус огненного шара R на момент t",
        "Плотность воздуха → считаем E → переводим в килотонны",
        "Сходится с реальными ~20 кт — лучшая реклама метода перед Рейнольдсом" ] }
    ], notes:"Фиксированная кульминация акта 1." },
  { type:"content", kicker:"АКТ 2 · ГЛАВНОЕ ЧИСЛО", heading:"Одно число выпадает само",
    blocks:[
      { kind:"formula", text:"Re = ρ · U · L / μ = U · L / ν",
        caption:"Отношение инерции к вязкости. Два течения с одинаковым Re ведут себя одинаково — муха или самолёт" },
      { kind:"demo", desc:"Данные множества разных опытов схлопываются на одну кривую, когда строишь их по Re" }
    ], notes:"Число Рейнольдса и динамическое подобие." },
  { type:"content", kicker:"АКТ 2 · ДИАПАЗОН", heading:"Почему модель предсказывает оригинал",
    blocks:[
      { kind:"bullets", items:[
        "Подгоняем Re — и масштабный эксперимент работает (аэротруба, бассейн)",
        "Это ровно про измерения и моделирование в реальной инженерии" ] },
      { kind:"compare",
        left:{ title:"Малый Re", body:"Мёд, бактерии, пылинки. Правит вязкость — жизнь без инерции, «не проскользить»." },
        right:{ title:"Большой Re", body:"Реки, самолёты, мы. Правит инерция — вихри, следы, турбулентность." } }
    ], notes:"Твоя территория: масштабирование экспериментов." },
  { type:"content", kicker:"АКТ 3 · УРАВНЕНИЕ", heading:"Навье–Стокс — это F = ma для капли",
    blocks:[
      { kind:"formula", text:"ρ (∂u/∂t + u·∇u) = −∇p + μ∇²u + f", size:22,
        caption:"Масса×ускорение = давление толкает + вязкость сглаживает + один нелинейный член" },
      { kind:"demo", desc:"Навье–Стокс «по слагаемым»: подсветка каждого члена и связка Re ↔ кто побеждает. Нелинейный член — тот самый «миллион долларов»." }
    ], notes:"Читаем как историю, не выводим." },
  { type:"content", kicker:"АКТ 4 · КОГДА РЕШАЕТСЯ", heading:"Ламинарные решения: монстр ручной",
    blocks:[
      { kind:"formula", text:"Труба:  u(r) = u_max (1 − r²/R²),   расход Q ∝ R⁴", size:22,
        caption:"Удвоил радиус — поток в 16 раз. Плюс Стокс: падение шарика в мёде" },
      { kind:"demo", desc:"Профили течения: труба (парабола), пластины (линейный профиль), падение шарика в мёде (Стокс)" }
    ], notes:"Затишье перед бурей: здесь физика элегантна." },
  { type:"content", kicker:"АКТ 5 · СРЫВ", heading:"Крутим Re вверх — и всё ломается",
    blocks:[
      { kind:"bullets", items:[
        "Опыт Рейнольдса (1883): струйка краски рвётся на критическом Re",
        "Дорожка Кармана за цилиндром, каскад вихрей до самой вязкости",
        "Уравнения детерминированы — а поведение непредсказуемо (эффект бабочки)" ] },
      { kind:"demo", desc:"Краска Рейнольдса → переход при критическом Re · дорожка Кармана · каскад вихрей" }
    ], notes:"Кульминация хаоса; связь с непредсказуемостью погоды." },
  { type:"closing", title:"Пользуемся каждым вдохом — а до конца не понимает никто",
    subtitle:"Этими уравнениями мы летаем, предсказываем погоду, ищем нефть, моделируем кровь — и до сих пор не умеем доказать, что решения всегда ведут себя прилично. Это и есть Премия тысячелетия.",
    notes:"Открытая граница, закрываем хук." }
]};

(async ()=>{
  await buildDeck(electron, path.join(OUT, "lekciya_elektron.pptx"));
  await buildDeck(turb,     path.join(OUT, "lekciya_turbulentnost.pptx"));
})();
