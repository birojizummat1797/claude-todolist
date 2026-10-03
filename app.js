'use strict';

/* ---------- constants ---------- */
// Category and priority values are stored in Uzbek Cyrillic and translated only for display.
const KEY = 'todolist.v1';
const VERSION = '9';
const CATS = ['Шахсий', 'Иш', 'Ўқиш', 'Соғлиқ', 'Молия', 'Бошқа'];
const PRIO = { 1: 'Паст', 2: 'Ўрта', 3: 'Юқори' };

const NAMES = {
  uz: {
    months: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентабр', 'Октабр', 'Ноябр', 'Декабр'],
    wd: ['Душ', 'Сей', 'Чор', 'Пай', 'Жум', 'Шан', 'Якш'],
    wdFull: ['Душанба', 'Сешанба', 'Чоршанба', 'Пайшанба', 'Жума', 'Шанба', 'Якшанба']
  },
  ru: {
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    monthsGen: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    wd: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    wdFull: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    wdFull: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
};
const isUz = () => LANG.startsWith('uz');
const nm = () => NAMES[isUz() ? 'uz' : LANG];
const L = s => (LANG === 'uz-Latn' ? translit(s) : s); // Latin Uzbek is derived from Cyrillic names
const monthName = i => L(nm().months[i]);
const wdShort = i => L(nm().wd[i]);
const wdFull = i => L(nm().wdFull[i]);

const TEMPLATES = {
  blank: { name: 'Бўш (ўзим ёзаман)', steps: [] },
  learn: {
    name: 'Янги нарса ўрганиш',
    steps: [
      ['Мақсад ва кутилган натижани аниқ ёзиш', 0.5], ['Манбаларни танлаш (1–2 та асосий)', 1],
      ['Асослар: назария', 4], ['Асослар: амалий машқлар', 4], ['Кичик амалий мини-лойиҳа', 6],
      ['Хатоларни таҳлил қилиш', 2], ['Мураккаб мавзулар', 4], ['Якуний лойиҳа ёки имтиҳонга тайёргарлик', 6]
    ]
  },
  project: {
    name: 'Лойиҳа ёки иш топшириғи',
    steps: [
      ['Талабларни аниқлаш', 1], ['Режа ва тузилмани чизиш', 2], ['Биринчи ишчи версия (МВП)', 8],
      ['Синаш ва хатоларни тузатиш', 4], ['Сайқаллаш ва ҳужжатлаштириш', 3], ['Топшириш ёки эълон қилиш', 1]
    ]
  },
  health: {
    name: 'Соғлиқ ва спорт',
    steps: [
      ['Ҳозирги кўрсаткичларни ўлчаш', 0.5], ['Ҳафталик машқ режасини тузиш', 1], ['1-ҳафта: енгил бошланиш', 3],
      ['2-ҳафта: юкни секин ошириш', 4], ['3-ҳафта: асосий режим', 5], ['Натижаларни ўлчаб таққослаш', 0.5]
    ]
  }
};
const templateText = k => TEMPLATES[k].steps.map(([n, h]) => `${tr(n)} | ${fmtHM(h)}`).join('\n');

/* ---------- date helpers (local time, YYYY-MM-DD) ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const wdIndex = s => (parse(s).getDay() + 6) % 7; // Monday = 0
const fmtShort = s => `${pad(parse(s).getDate())}.${pad(parse(s).getMonth() + 1)}`;
function fmtLong(s, lowerRu = false) {
  const d = parse(s).getDate();
  const m = parse(s).getMonth();
  const w = wdFull(wdIndex(s));
  if (isUz()) return `${d}-${monthName(m).toLowerCase()}, ${w}`;
  if (LANG === 'ru') {
    const r = `${w}, ${d} ${NAMES.ru.monthsGen[m]}`;
    return lowerRu ? r : r[0].toUpperCase() + r.slice(1);
  }
  return `${w}, ${monthName(m)} ${d}`;
}
const hrs = n => { const v = (Math.round(n * 10) / 10).toString(); return LANG === 'en' ? v : v.replace('.', ','); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* start time helpers (HH:MM) */
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
function timeRange(t) {
  if (!t.time) return '';
  const e = Number(t.est) || 0;
  return e ? `${t.time}–${fmtMin(toMin(t.time) + Math.round(e * 60))}` : t.time;
}
/* duration helpers: tasks store hours (a float); the UI works in hours:minutes */
function fmtDur(h) {
  const m = Math.round((Number(h) || 0) * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const parts = [];
  if (hh) parts.push(`${hh} ${tr('соат')}`);
  if (mm || !hh) parts.push(`${mm} ${tr('дақ')}`);
  return parts.join(' ');
}
const fmtHM = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
const DUR_PRESETS = [15, 30, 45, 60, 90, 120];
function durHtml() {
  return `<div class="dur-box"><span class="dur-title">⏱ ${esc(tr('Давомийлиги'))}</span>
    <div class="dur">
      <input type="number" name="estH" min="0" max="23" inputmode="numeric" placeholder="0" aria-label="${esc(tr('соат'))}"><span>${esc(tr('соат'))}</span>
      <input type="number" name="estM" min="0" max="59" inputmode="numeric" placeholder="0" aria-label="${esc(tr('дақ'))}"><span>${esc(tr('дақ'))}</span>
    </div>
    <div class="dur-chips">${DUR_PRESETS.map(m => `<button type="button" data-act="dur" data-m="${m}">${fmtHM(m / 60)}</button>`).join('')}</div>
    <small class="endhint"></small></div>`;
}
function readDur(f) {
  const total = (Number(f.estH.value) || 0) * 60 + (Number(f.estM.value) || 0);
  return total > 0 ? Math.round(total) / 60 : '';
}
function setDur(f, est) {
  const m = Math.round((Number(est) || 0) * 60);
  f.estH.value = m ? Math.floor(m / 60) || '' : '';
  f.estM.value = m ? m % 60 || '' : '';
  updateEndHint(f);
}
function updateEndHint(f) {
  const box = f.querySelector('.endhint');
  if (!box) return;
  const est = readDur(f);
  box.textContent = f.time && f.time.value && est ? tr('Тугаш вақти: {t}', { t: fmtMin(toMin(f.time.value) + Math.round(est * 60)) }) : '';
}
// Open timed tasks of one day that overlap each other.
function overlaps(list) {
  const items = list.filter(t => t.time && !t.done).map(t => {
    const s = toMin(t.time);
    return { t, s, e: s + Math.max(15, Math.round((Number(t.est) || 0) * 60)) };
  }).sort((a, b) => a.s - b.s);
  const out = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (items[j].s < items[i].e) out.push([items[i].t, items[j].t]);
  }
  return out;
}

/* ---------- state ---------- */
const defaultState = () => ({ tasks: [], goals: [], capacity: 6, theme: 'auto', habits: [], reviews: {}, lang: 'uz-Cyrl' });
const THEMES = [
  { id: 'auto', c: '#2f6fed', name: 'Оддий', mode: '', p: ['#dbe6ff', '#eddfff', '#d9f3e6'] },
  { id: 'aurora', c: '#0a1024', name: 'Аврора', mode: 'dark', p: ['#19b88f', '#5a57ee', '#b24fd6'] },
  { id: 'night', c: '#090c1c', name: 'Тун', mode: 'dark', p: ['#1c2a6b', '#3a1d6e', '#0c4a5c'] },
  { id: 'ocean', c: '#5db2f0', name: 'Океан', mode: 'light', p: ['#5db2f0', '#8fe8d8', '#a9c6ff'] },
  { id: 'sunset', c: '#ff9a6a', name: 'Шафақ', mode: 'light', p: ['#ff9a6a', '#ff7fae', '#c78cff'] },
  { id: 'forest', c: '#7fd49a', name: 'Ўрмон', mode: 'light', p: ['#7fd49a', '#5fc4a8', '#dcee8f'] },
  { id: 'lavender', c: '#c4a8ff', name: 'Лаванда', mode: 'light', p: ['#c4a8ff', '#ffb8e0', '#b0c8ff'] }
];
let S = load();
const UI = {
  tab: 'tasks',
  filter: 'all',
  q: '',
  cal: { y: new Date().getFullYear(), m: new Date().getMonth() },
  sel: today(),
  period: 7,
  rm: { title: '', deadline: '', perDay: 2, days: [0, 1, 2, 3, 4], tpl: 'blank', steps: '' },
  plan: null,
  openGoals: new Set()
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.tasks)) return { ...defaultState(), ...raw };
  } catch (e) { /* ignore */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast(tr('Сақлаб бўлмади: браузер рухсат бермаяпти')); }
}
function applyTheme() {
  const t = THEMES.find(x => x.id === S.theme) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = t.id;
  document.querySelector('meta[name=theme-color]').content = t.c;
  if (t.mode) root.dataset.mode = t.mode; else delete root.dataset.mode;
}
function renderThemes() {
  document.getElementById('themes').innerHTML = THEMES.map(t => `<div class="swc">
    <button class="sw" data-act="theme" data-id="${t.id}" aria-pressed="${t.id === S.theme}" aria-label="${esc(tr(t.name))}"
      style="background:linear-gradient(135deg,${t.p.join(',')})"></button><span class="swl">${esc(tr(t.name))}</span></div>`).join('');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- language ---------- */
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = tr(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
  document.getElementById('ver').textContent = `· ${tr('Версия')} ${VERSION}`;
  document.getElementById('greetMenu').innerHTML = GREETS.map(x => `<button class="chip" data-act="preview-greet" data-id="${x.id}">${x.flag} ${esc(x.name)}</button>`).join('');
}
/* ---------- welcome greetings ---------- */
// Seven greetings, each in its own language with its own animation.
// Every launch shows the next one in a shuffled round of seven; a new round never puts a greeting
// in the same position as the previous round and never repeats the one shown last.
const GREETS = [
  { id: 1, dir: 'ltr', lang: 'uz', flag: '🇺🇿', name: 'Ўзбекча', hello: 'Бугун қалайсиз, дўстим?', sub: 'Сизни кўрганимиздан хурсандмиз!', skip: 'Ўтказиш учун босинг' },
  { id: 2, dir: 'ltr', lang: 'ru', flag: '🇷🇺', name: 'Русский', hello: 'Здравствуйте, уважаемый друг!', sub: 'Мы искренне рады вашему возвращению.', skip: 'Нажмите, чтобы пропустить' },
  { id: 3, dir: 'ltr', lang: 'en', flag: '🇬🇧', name: 'English', hello: 'Welcome back, champion!', sub: 'Your next quest starts now. Ready?', skip: 'PRESS ANY KEY' },
  { id: 4, dir: 'ltr', lang: 'fr', flag: '🇫🇷', name: 'Français', hello: 'Bonjour, cher ami !', sub: 'Quel plaisir de vous revoir.', skip: 'Touchez pour passer' },
  { id: 5, dir: 'rtl', lang: 'ar', flag: '🇸🇦', name: 'العربية', hello: 'السلام عليكم يا صديقي', sub: 'يسعدنا عودتك، نتمنى لك يوماً مباركاً', skip: 'اضغط للتخطي' },
  { id: 6, dir: 'ltr', lang: 'zh', flag: '🇨🇳', name: '中文', hello: '你好，朋友！', sub: '欢迎回来，今天也一起加油！', skip: '点击跳过' },
  { id: 7, dir: 'ltr', lang: 'tr', flag: '🇹🇷', name: 'Türkçe', hello: 'Merhaba dostum!', sub: 'Seni tekrar görmek ne güzel.', skip: 'Geçmek için dokun' }
];
const GKEY = 'todolist.greet.v1';
const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
function newOrder(prev) {
  for (let n = 0; n < 500; n++) {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7]);
    if (a.every((v, i) => v !== prev[i]) && a[0] !== prev[6]) return a;
  }
  return shuffle([1, 2, 3, 4, 5, 6, 7]);
}
function nextGreetId() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(GKEY)); } catch (e) { /* ignore */ }
  if (!g || !Array.isArray(g.cur) || g.cur.length !== 7) g = { cur: [1, 2, 3, 4, 5, 6, 7], prev: null, pos: 0 };
  const id = g.cur[g.pos];
  g.pos++;
  if (g.pos >= 7) { g.prev = g.cur; g.cur = newOrder(g.prev); g.pos = 0; }
  try { localStorage.setItem(GKEY, JSON.stringify(g)); } catch (e) { /* ignore */ }
  return id;
}
const rnd = (a, b) => a + Math.random() * (b - a);
// Words are kept together (nowrap) so a long greeting never breaks in the middle of a word.
function splitChars(text, byWord) {
  if (byWord) return text.split(' ').map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`).join(' ');
  let i = 0;
  return text.split(' ').map(w => `<b class="w">${Array.from(w).map(ch => `<span style="--i:${i++}">${esc(ch)}</span>`).join('')}</b>`).join(' ');
}
function greetDecor(id) {
  switch (id) {
    case 1: return '<div class="sun"></div><div class="rays"></div><svg class="hills" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 120V72Q70 28 140 62T270 50T400 68V120Z"/></svg>';
    case 2: return Array.from({ length: 70 }, () => `<i class="star" style="left:${rnd(0, 100).toFixed(1)}%;top:${rnd(0, 100).toFixed(1)}%;--s:${rnd(1, 3).toFixed(1)}px;--d:${rnd(0, 4).toFixed(1)}s"></i>`).join('') + '<b class="shoot"></b><b class="shoot s2"></b>';
    case 3: return '<div class="floor"></div><div class="sun3"></div><div class="scan"></div>';
    case 4: return '<div class="curtain l"></div><div class="curtain r"></div><div class="gold-line top"></div><div class="gold-line bot"></div>';
    case 5: return '<svg class="star8" viewBox="0 0 200 200"><g fill="none" stroke="currentColor" stroke-width="1.4"><rect x="42" y="42" width="116" height="116"/><rect x="42" y="42" width="116" height="116" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="64"/><circle cx="100" cy="100" r="34"/><circle cx="100" cy="100" r="8"/></g></svg><svg class="star8 s2" viewBox="0 0 200 200"><g fill="none" stroke="currentColor" stroke-width="1.4"><rect x="42" y="42" width="116" height="116"/><rect x="42" y="42" width="116" height="116" transform="rotate(45 100 100)"/></g></svg>';
    case 6: return Array.from({ length: 7 }, (_, i) => `<div class="lantern" style="left:${(6 + i * 14.5 + rnd(-3, 3)).toFixed(1)}%;--d:${(i * 0.55).toFixed(2)}s;--sz:${Math.round(rnd(34, 58))}px"></div>`).join('');
    default: return '<svg class="wave w1" viewBox="0 0 800 100" preserveAspectRatio="none"><path d="M0 50Q100 0 200 50T400 50T600 50T800 50V100H0Z"/></svg><svg class="wave w2" viewBox="0 0 800 100" preserveAspectRatio="none"><path d="M0 50Q100 100 200 50T400 50T600 50T800 50V100H0Z"/></svg><svg class="wave w3" viewBox="0 0 800 100" preserveAspectRatio="none"><path d="M0 40Q100 0 200 40T400 40T600 40T800 40V100H0Z"/></svg>'
      + Array.from({ length: 16 }, () => `<i class="bubble" style="left:${rnd(2, 98).toFixed(1)}%;--sz:${Math.round(rnd(6, 20))}px;--d:${rnd(0, 5).toFixed(1)}s;--t:${rnd(5, 9).toFixed(1)}s"></i>`).join('');
  }
}
function runSplash(forceId, preview = false) {
  const old = document.getElementById('splash');
  if (old) old.remove();
  const q = Number((location.search.match(/[?&]greet=(\d)/) || [])[1]);
  const id = forceId || (q >= 1 && q <= 7 ? q : nextGreetId());
  const g = GREETS[id - 1];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.id = 'splash';
  el.className = `sp-v${id}`;
  el.dir = g.dir;
  el.lang = g.lang;
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="sp-deco">${greetDecor(id)}</div>
    <div class="sp-center">
      <div class="sp-logo-wrap"><i class="sp-ring"></i><i class="sp-ring r2"></i>
        <svg class="sp-logo" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46"/><path d="M28 50l14 14 26-30"/></svg></div>
      <p class="sp-hello">${id === 2 ? '' : splitChars(g.hello, id === 5)}</p>
      <p class="sp-sub">${esc(g.sub)}</p>
      <div class="sp-bar"><i></i></div>
      <p class="sp-skip">${esc(g.skip)}</p>
      <p class="sp-brand">✔ ${esc(tr('Режаларим'))}</p>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('splashing');
  if (id === 2) { // typewriter
    const target = el.querySelector('.sp-hello');
    if (reduce) target.textContent = g.hello;
    else { let n = 0; setTimeout(function type() { n++; target.textContent = g.hello.slice(0, n); if (n < g.hello.length) setTimeout(type, 55); }, 900); }
  }
  let gone = false;
  const done = () => {
    if (gone) return;
    gone = true;
    el.classList.add('out');
    document.body.classList.remove('splashing');
    setTimeout(() => el.remove(), 600);
  };
  setTimeout(done, reduce ? 1200 : 5000);
  // ignore the tap that opened a preview, then close on any tap or key
  setTimeout(() => ['click', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, done, { once: true })), preview ? 400 : 0);
}

function applyLang() {
  LANG = LANGS[S.lang] ? S.lang : 'uz-Cyrl';
  document.documentElement.lang = LANG;
  document.title = tr('Режаларим');
  document.querySelector('meta[name=description]').content = tr('Календарь, ҳисобот ва йўл харитаси билан вазифалар рўйхати');
  document.getElementById('lang').value = LANG;
  applyStatic();
  buildDialogOptions();
  renderThemes();
}
document.getElementById('lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

/* ---------- task helpers ---------- */
const byId = id => S.tasks.find(t => t.id === id);
const pending = t => !t.done;
const estOf = t => Number(t.est) || 0;
function dayLoad(date, excludeDone = true) {
  return S.tasks.filter(t => t.date === date && (!excludeDone || !t.done)).reduce((a, t) => a + estOf(t), 0);
}
function dateLabel(t) {
  if (!t.date) return null;
  const d = diffDays(today(), t.date);
  if (d === 0) return { text: tr('Бугун'), cls: 'today' };
  if (d === 1) return { text: tr('Эртага'), cls: '' };
  if (d === -1) return { text: tr('Кеча'), cls: t.done ? '' : 'late' };
  return { text: fmtShort(t.date), cls: d < 0 && !t.done ? 'late' : '' };
}
function sortTasks(list) {
  return list.slice().sort((a, b) =>
    (a.done - b.done) ||
    ((a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : 0) ||
    ((a.time || '99:99') < (b.time || '99:99') ? -1 : (a.time || '99:99') > (b.time || '99:99') ? 1 : 0) ||
    (b.priority - a.priority) || (a.created - b.created));
}
// Postponing a task that is already due is recorded, so it still counts against the score.
function reschedule(t, nd) {
  if (t.date && t.date <= today() && (!nd || nd > t.date)) { t.origDate = t.origDate || t.date; t.moved = (t.moved || 0) + 1; }
  t.date = nd;
}
const isFocus = t => t.focus === today() && !t.done;
function taskState(t) {
  if (t.done) return 'st-done';
  if (!t.date) return 'st-none';
  const d = diffDays(today(), t.date);
  return d < 0 ? 'st-late' : d === 0 ? 'st-today' : 'st-soon';
}
function taskHtml(t) {
  const dl = dateLabel(t);
  const state = taskState(t);
  return `<li class="task ${state}" data-tid="${t.id}">
    <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="${esc(tr('Бажарилди'))}">
    <div class="body">
      <div class="t"><span>${esc(t.title)}</span></div>
      <div class="meta">
        ${t.done ? `<span class="badge fin">✓ ${esc(tr('Бажарилди'))}${t.doneAt ? ' ' + fmtShort(t.doneAt) : ''}</span>` : ''}
        ${dl && !t.done ? `<span class="badge ${dl.cls}">${esc(dl.text)}</span>` : ''}
        ${t.time ? `<span class="badge time">🕐 ${timeRange(t)}</span>` : ''}
        <span class="badge p${t.priority}">${esc(tr(PRIO[t.priority]))}</span>
        <span class="badge">${esc(tr(t.cat))}</span>
        ${estOf(t) ? `<span class="badge">${esc(fmtDur(estOf(t)))}</span>` : ''}
        ${t.goalId ? `<span class="badge">🎯 ${esc(tr('мақсад'))}</span>` : ''}
        ${t.moved ? `<span class="badge late">↻ ${esc(tr('{n} марта сурилган', { n: t.moved }))}</span>` : ''}
      </div>
      ${t.notes ? `<div class="meta">${esc(t.notes)}</div>` : ''}
      ${!t.done && (state === 'st-late' || state === 'st-today') ? `<div class="meta">
        ${state === 'st-late' ? `<button class="link" data-act="resched" data-id="${t.id}" data-to="0">${esc(tr('Бугунга кўчириш'))}</button>` : ''}
        <button class="link" data-act="resched" data-id="${t.id}" data-to="1">${esc(tr('Эртага'))}</button>
        <button class="link" data-act="edit" data-id="${t.id}">${esc(tr('Санани танлаш'))}</button></div>` : ''}
    </div>
    ${t.done ? '' : `<button class="icon star ${isFocus(t) ? 'on' : ''}" data-act="focus" data-id="${t.id}" aria-label="${esc(tr('Бугунги фокус'))}" title="${esc(tr('Бугунги фокус'))}">${isFocus(t) ? '★' : '☆'}</button>`}
    <button class="icon" data-act="edit" data-id="${t.id}" aria-label="${esc(tr('Таҳрирлаш'))}">✎</button>
  </li>`;
}

/* ---------- views ---------- */
const view = document.getElementById('view');

function render() {
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === UI.tab));
  ({ tasks: renderTasks, habits: renderHabits, calendar: renderCalendar, roadmap: renderRoadmap, report: renderReport })[UI.tab]();
}

/* Tasks */
const FILTERS = [['all', 'Фаол'], ['today', 'Бугун'], ['late', 'Кечиккан'], ['soon', 'Келгуси'], ['done', 'Бажарилган']];
function filtered() {
  const q = UI.q.trim().toLowerCase();
  return sortTasks(S.tasks.filter(t =>
    (!q || (t.title + ' ' + (t.notes || '')).toLowerCase().includes(q)) && matchesFilter(t) &&
    !(isFocus(t) && (UI.filter === 'all' || UI.filter === 'today'))));
}
function refresh() {
  if (UI.tab === 'roadmap') updateGoals(); else render();
}
function matchesFilter(t) {
  const td = today();
  switch (UI.filter) {
    case 'today': return !t.done && t.date === td;
    case 'late': return !t.done && t.date && t.date < td;
    case 'soon': return !t.done && t.date && t.date > td;
    case 'done': return t.done;
    default: return !t.done;
  }
}
function summaryHtml() {
  const td = today();
  const doneToday = S.tasks.filter(t => t.done && t.doneAt === td).length;
  const openNow = S.tasks.filter(t => !t.done && t.date && t.date <= td).length;
  const st = streak();
  const rev = S.reviews[td];
  const now = new Date();
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const next = S.tasks.filter(t => !t.done && t.date === td && t.time && t.time >= nowStr).sort((a, b) => a.time.localeCompare(b.time))[0];
  const msg = !doneToday && !openNow ? tr('Бугунга режа қўйинг: энг муҳим 1–3 та ишни танланг.') :
    openNow === 0 ? tr('Бугунги ишлар тугади. Баракалла!') :
    doneToday === 0 ? tr('Бугун {n} та иш кутяпти. Биринчисидан бошланг.', { n: openNow }) :
    tr('{d} та бажарилди, {n} та қолди. Давом этинг.', { d: doneToday, n: openNow });
  return `<section class="card today-card">
    <div class="grow"><p class="big">${esc(tr('Бугун, {date}', { date: fmtLong(td, true) }))}</p><p class="muted">${esc(msg)}</p>
      ${next ? `<p class="next">🕐 ${esc(tr('Кейинги: {time} — {title}', { time: next.time, title: next.title }))}</p>` : ''}</div>
    ${st ? `<span class="fire">🔥 ${esc(tr('{n} кун', { n: st }))}</span>` : ''}
    <button class="ghost" data-act="review">${rev ? esc(tr('Кун якуни')) + ': ' + '★'.repeat(rev.rating) : esc(tr('Кун якуни'))}</button>
  </section>`;
}
function focusHtml() {
  const list = S.tasks.filter(isFocus);
  return `<section class="card"><h2>⭐ ${esc(tr('Бугунги фокус'))} (${list.length}/3)</h2>
    ${list.length ? `<ul class="list">${list.map(taskHtml).join('')}</ul>` : `<p class="hint">${esc(tr('Энг муҳим 1–3 та ишни ☆ тугмаси билан танланг. Кун охирида шулар асосий мезон бўлади.'))}</p>`}</section>`;
}
function renderTasks() {
  const list = filtered();
  const open = S.tasks.filter(pending).length;
  const late = S.tasks.filter(t => !t.done && t.date && t.date < today()).length;
  const doneCount = S.tasks.filter(t => t.done).length;
  view.innerHTML = `
  ${summaryHtml()}
  ${focusHtml()}
  <section class="card">
    <form class="quick" id="quick">
      <label class="q-title"><span>${esc(tr('Номи'))}</span>
        <input name="title" placeholder="${esc(tr('Янги вазифа...'))}" required maxlength="200" autocomplete="off"></label>
      <label><span>📅 ${esc(tr('Муддат'))}</span>
        <input type="date" name="date" value="${today()}"></label>
      <label><span>🕐 ${esc(tr('Бошланиш вақти'))}</span>
        <input type="time" name="time"></label>
      ${durHtml()}
      <button class="primary" type="submit">${esc(tr('Қўшиш'))}</button>
    </form>
    <div class="chips" role="group" aria-label="${esc(tr('Фильтр'))}">
      ${FILTERS.map(([k, n]) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${UI.filter === k}">${esc(tr(n))}${k === 'done' && doneCount ? ` (${doneCount})` : ''}</button>`).join('')}
    </div>
    <input class="search" type="search" id="q" placeholder="${esc(tr('Қидириш...'))}" value="${esc(UI.q)}" aria-label="${esc(tr('Қидириш...'))}">
    <p class="muted small">${esc(tr('Очиқ'))}: ${open} · ${esc(tr('Кечиккан'))}: ${late}</p>
    ${list.length ? `<ul class="list">${list.map(taskHtml).join('')}</ul>` : `<p class="empty">${esc(UI.filter === 'done' ? tr('Ҳали бажарилган вазифа йўқ.') : tr('Фаол вазифа йўқ. Янгисини қўшинг!'))}</p>`}
    ${doneCount ? `<button class="link small" data-act="clear-done">${esc(tr('Бажарилганларни тозалаш'))}</button>` : ''}
  </section>`;
}

/* Habits */
const habitDone = (h, d) => h.days.includes(d);
function habitStreak(h) {
  let d = today();
  if (!habitDone(h, d)) d = addDays(d, -1);
  let n = 0;
  while (habitDone(h, d)) { n++; d = addDays(d, -1); }
  return n;
}
function habitRate(h, n) {
  const from = addDays(today(), -(n - 1));
  const start = h.created > from ? h.created : from;
  const span = diffDays(start, today()) + 1;
  return Math.round((h.days.filter(d => d >= start && d <= today()).length / span) * 100);
}
function renderHabits() {
  const td = today();
  const dots = h => Array.from({ length: 7 }, (_, i) => `<i class="${habitDone(h, addDays(td, i - 6)) ? 'on' : ''}"></i>`).join('');
  const doneN = S.habits.filter(h => habitDone(h, td)).length;
  view.innerHTML = `
  <section class="card">
    <h2>${esc(tr('Кунлик одатлар'))}</h2>
    <p class="muted small">${esc(tr('Ҳар куни такрорланадиган ишлар: намоз, спорт, китоб, сув. Мақсад — занжирни узмаслик.'))}</p>
    <form class="quick" id="habitForm" style="grid-template-columns:1fr auto">
      <input name="title" placeholder="${esc(tr('Янги одат...'))}" required maxlength="80" autocomplete="off" aria-label="${esc(tr('Одат номи'))}">
      <button class="primary" type="submit">${esc(tr('Қўшиш'))}</button>
    </form>
    ${S.habits.length ? `<p class="muted small" style="margin-top:12px">${esc(tr('Бугун'))}: ${doneN}/${S.habits.length}</p>
    <ul class="list">${S.habits.map(h => {
      const ok = habitDone(h, td);
      const st = habitStreak(h);
      return `<li class="task ${ok ? 'st-done' : 'st-today'}">
        <input type="checkbox" data-act="habit" data-id="${h.id}" ${ok ? 'checked' : ''} aria-label="${esc(tr('Бугун бажарилди'))}">
        <div class="body">
          <div class="t">${esc(h.title)}</div>
          <div class="meta"><span class="dots" title="${esc(tr('Сўнгги 7 кун'))}">${dots(h)}</span>
            <span class="badge">${st ? '🔥 ' + esc(tr('{n} кун', { n: st })) : esc(tr('занжир йўқ'))}</span>
            <span class="badge">${esc(tr('30 кун'))}: ${habitRate(h, 30)}%</span></div>
        </div>
        <button class="icon" data-act="habit-del" data-id="${h.id}" aria-label="${esc(tr('Ўчириш'))}">✕</button>
      </li>`;
    }).join('')}</ul>` : `<p class="empty">${esc(tr('Ҳали одат қўшилмаган.'))}</p>`}
  </section>`;
}

/* Calendar */
function renderCalendar() {
  const { y, m } = UI.cal;
  const first = ymd(new Date(y, m, 1));
  const start = addDays(first, -wdIndex(first));
  const td = today();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i >= 35 && parse(d).getMonth() !== m) break;
    const ts = S.tasks.filter(t => t.date === d);
    const open = ts.filter(pending).length;
    const done = ts.length - open;
    const load = dayLoad(d);
    const pct = Math.min(100, (load / S.capacity) * 100);
    const lcls = load > S.capacity ? 'over' : load > S.capacity * 0.8 ? 'warn' : '';
    const late = d < td && open > 0;
    cells += `<button class="day ${parse(d).getMonth() !== m ? 'out' : ''} ${d === td ? 'today' : ''} ${d === UI.sel ? 'sel' : ''}" data-act="pick" data-date="${d}" aria-label="${esc(fmtLong(d))}">
      <span class="dn">${parse(d).getDate()}</span>
      ${open ? `<span class="c ${late ? 'late' : 'pend'}">${open}</span>` : ''}
      ${done ? `<span class="c ok">✓${done}</span>` : ''}
      ${load ? `<i class="load ${lcls}" style="width:${pct}%"></i>` : ''}
    </button>`;
  }
  const lateAll = S.tasks.filter(t => !t.done && t.date && t.date < td);
  const wkStart = addDays(td, -wdIndex(td));
  const wk = S.tasks.filter(t => t.date >= wkStart && t.date <= addDays(wkStart, 6));
  const wkDone = wk.filter(t => t.done).length;
  const next7 = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(td, i);
    if (dayLoad(d) > S.capacity) next7.push(d);
  }
  const dayTasks = sortTasks(S.tasks.filter(t => t.date === UI.sel));
  const selLoad = dayLoad(UI.sel);
  const clash = overlaps(dayTasks);

  view.innerHTML = `
  <div class="cal-layout">
    <section class="card">
      <div class="cal-head">
        <button data-act="cal-prev" aria-label="${esc(tr('Олдинги ой'))}">‹</button>
        <h2>${esc(monthName(m))} ${y}</h2>
        <button data-act="cal-next" aria-label="${esc(tr('Кейинги ой'))}">›</button>
        <button data-act="cal-today">${esc(tr('Бугун'))}</button>
      </div>
      <div class="grid">${NAMES.uz.wd.map((_, i) => `<div class="wd">${esc(wdShort(i))}</div>`).join('')}${cells}</div>
      <div class="legend">
        <span><span class="c pend">3</span> ${esc(tr('очиқ'))}</span>
        <span><span class="c late">2</span> ${esc(tr('кечиккан'))}</span>
        <span><span class="c ok">✓1</span> ${esc(tr('бажарилган'))}</span>
        <span>▬ ${esc(tr('юклама (яшил → сариқ → қизил)'))}</span>
      </div>
    </section>
    <aside>
      <section class="card">
        ${lateAll.length ? `<div class="banner bad">${esc(tr('Кечиккан ишлар: {n} та.', { n: lateAll.length }))} <button class="ghost" data-act="move-late">${esc(tr('Бугунга кўчириш'))}</button></div>` : ''}
        ${next7.length ? `<div class="banner warn">${esc(tr('Юклама лимитдан ошган кунлар: {days}. Баъзи ишларни бошқа кунга кўчиринг.', { days: next7.map(fmtShort).join(', ') }))}</div>` : ''}
        <p class="small muted">${esc(tr('Шу ҳафта: {a}/{b} вазифа бажарилган', { a: wkDone, b: wk.length }))}</p>
        <div class="cap">${esc(tr('Кунлик лимит'))} <input type="number" id="cap" min="1" max="16" step="0.5" value="${S.capacity}"> ${esc(tr('соат'))}</div>
      </section>
      <section class="card">
        <h2>${esc(fmtLong(UI.sel))}</h2>
        <p class="small muted">${esc(tr('Режалаштирилган: {a} / {b}', { a: fmtDur(selLoad), b: fmtDur(S.capacity) }))}</p>
        ${selLoad > S.capacity ? `<div class="banner warn">${esc(tr('Бу кунга ҳаддан ташқари кўп иш режалаштирилган.'))}</div>` : ''}
        ${clash.length ? `<div class="banner warn">🕐 ${esc(tr('Вақтлар устма-уст тушмоқда: «{a}» ва «{b}».', { a: clash[0][0].title, b: clash[0][1].title }))}</div>` : ''}
        ${dayTasks.length ? `<ul class="list">${dayTasks.map(taskHtml).join('')}</ul>` : `<p class="empty">${esc(tr('Бу кунга вазифа йўқ.'))}</p>`}
        <button class="primary" data-act="add-on-day">+ ${esc(tr('Вазифа қўшиш'))}</button>
      </section>
    </aside>
  </div>`;
}

/* Report */
// A postponed task is still judged by its ORIGINAL due date, so moving a date cannot hide a miss.
const scoreDate = t => t.origDate || t.date;
function stats(from, to) {
  const days = diffDays(from, to) + 1;
  // A task due today that is still open is not late yet, so it is left out of the score.
  const due = S.tasks.filter(t => { const d = scoreDate(t); return d && d >= from && d <= to && (t.done || d < today()); });
  const done = due.filter(t => t.done);
  const onTime = done.filter(t => t.doneAt && t.doneAt <= scoreDate(t));
  const doneAll = S.tasks.filter(t => t.done && t.doneAt && t.doneAt >= from && t.doneAt <= to);
  const activeDays = new Set(doneAll.map(t => t.doneAt)).size;
  const cr = due.length ? done.length / due.length : 0;
  const ot = done.length ? onTime.length / done.length : 0;
  const act = Math.min(1, activeDays / (days * 0.7));
  const hasH = S.habits.length > 0;
  const habits = hasH ? S.habits.reduce((a, h) => a + habitRate(h, days), 0) / S.habits.length / 100 : 0;
  let score = null;
  if (due.length) score = Math.round(100 * (hasH ? 0.5 * cr + 0.2 * ot + 0.1 * act + 0.2 * habits : 0.6 * cr + 0.25 * ot + 0.15 * act));
  else if (hasH) score = Math.round(100 * habits);
  const moved = due.filter(t => t.moved > 0);
  return { days, due, done, onTime, doneAll, activeDays, cr, ot, act, habits, hasH, score, moved, open: due.filter(pending) };
}
function grade(s) {
  if (s === null) return { l: '—', t: tr('Маълумот етарли эмас'), c: 'var(--muted)' };
  if (s >= 90) return { l: 'A', t: tr('Аъло'), c: 'var(--ok)' };
  if (s >= 75) return { l: 'B', t: tr('Яхши'), c: 'var(--ok)' };
  if (s >= 60) return { l: 'C', t: tr('Қониқарли'), c: 'var(--warn)' };
  if (s >= 40) return { l: 'D', t: tr('Суст'), c: 'var(--warn)' };
  return { l: 'E', t: tr('Жиддий эътибор керак'), c: 'var(--bad)' };
}
function streak() {
  const set = new Set(S.tasks.filter(t => t.done && t.doneAt).map(t => t.doneAt));
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
const SEV = { high: { n: 'Жиддий', o: 0 }, mid: { n: 'Ўртача', o: 1 }, low: { n: 'Енгил', o: 2 } };
function analyze(cur, prev) {
  const bad = [];
  const good = [];
  const add = (sev, title, text) => bad.push({ sev, title, text });
  if (!cur.due.length && !cur.hasH) return { bad, good };
  if (cur.due.length) {
    const ratio = cur.open.length / cur.due.length;
    if (cur.open.length) add(ratio >= 0.4 ? 'high' : ratio >= 0.2 ? 'mid' : 'low', tr('Бажарилмаган ишлар'),
      tr('Муддати ўтган {n} та иш бажарилмаган ({p}%). Ҳақиқатан керак эмасини ўчиринг, керагини аниқ вақт билан режалаштиринг.', { n: cur.open.length, p: Math.round(ratio * 100) }));
    if (cur.done.length && cur.ot < 0.85) add(cur.ot < 0.5 ? 'high' : cur.ot < 0.7 ? 'mid' : 'low', tr('Вақтида бажарилмаган'),
      tr('Бажарилганларнинг фақат {p}% вақтида тугаган. Муддатларни реалистикроқ қўйинг (тахминий вақтга 20% қўшинг).', { p: Math.round(cur.ot * 100) }));
    if (cur.moved.length) add(cur.moved.length >= 3 || cur.moved.length / cur.due.length > 0.3 ? 'high' : cur.moved.length >= 2 ? 'mid' : 'low', tr('Кечиктирилган ишлар'),
      tr('{n} та иш бошқа кунга суриб қўйилган. Сурилганлар дастлабки муддати бўйича баҳоланади. Иш кўп бўлса, камроқ вазифа қўйинг.', { n: cur.moved.length }));
    const hiOpen = cur.open.filter(t => t.priority === 3).length;
    if (hiOpen) add('high', tr('Муҳим ишлар қолиб кетган'), tr('«Юқори» муҳимликдаги {n} та иш бажарилмаган. Эртага энг аввал шуларни қилинг.', { n: hiOpen }));
    const cats = catStats(cur.due).filter(c => c.total >= 2).sort((a, b) => a.rate - b.rate);
    if (cats.length && cats[0].rate < 0.5) add('mid', tr('«{c}» йўналиши суст', { c: tr(cats[0].cat) }), tr('Бу тоифада ишларнинг фақат {p}% бажарилган. Унга алоҳида вақт ажратинг.', { p: Math.round(cats[0].rate * 100) }));
  }
  if (cur.hasH) {
    const worst = S.habits.map(h => ({ h, r: habitRate(h, cur.days) })).sort((a, b) => a.r - b.r)[0];
    if (worst.r < 85) add(worst.r < 50 ? 'high' : worst.r < 70 ? 'mid' : 'low', tr('Одатда узилиш'), tr('«{h}» одати {p}% бажарилган. Занжирни узмаслик учун уни кунинг бошига қўйинг.', { h: worst.h.title, p: worst.r }));
  }
  if (cur.days >= 7 && cur.activeDays < cur.days * 0.4) add(cur.activeDays < cur.days * 0.2 ? 'high' : 'mid', tr('Фаол кунлар кам'), tr('{d} кундан фақат {a} кун иш бажарилган. Ҳар куни камида битта кичик иш қилинг.', { d: cur.days, a: cur.activeDays }));
  const td = today();
  const over = [];
  for (let i = 0; i < 7; i++) if (dayLoad(addDays(td, i)) > S.capacity) over.push(addDays(td, i));
  if (over.length) add('low', tr('Келгуси кунларда ортиқча юклама'), tr('{days} кунларида иш лимитдан ошиб кетган. Бир қисмини бошқа кунга олдиндан суринг.', { days: over.map(fmtShort).join(', ') }));
  const revs = Object.entries(S.reviews).filter(([d]) => d >= addDays(td, -(cur.days - 1)));
  if (cur.days >= 7 && !revs.length) add('low', tr('Кун якуни ёзилмаган'), tr('Кечқурун 1 дақиқа ўзингизни баҳоланг: бу интизомнинг энг кучли воситаси.'));
  else if (revs.length >= 3 && revs.reduce((a, [, r]) => a + r.rating, 0) / revs.length < 3) add('mid', tr('Ўзингизни паст баҳоляпсиз'), tr('Кун баҳолари ўртача 3 дан паст. Сабабини изоҳларда ёзинг ва кўпроқ дам беринг.'));
  // strengths
  if (cur.score !== null && prev.score !== null && cur.score > prev.score) good.push(tr('Олдинги даврга нисбатан +{n} балл яхшиланиш.', { n: cur.score - prev.score }));
  if (cur.due.length && cur.cr === 1) good.push(tr('Муддати келган ҳамма иш бажарилган.'));
  if (cur.done.length >= 3 && cur.ot >= 0.9) good.push(tr('Ишларнинг деярли ҳаммаси ўз вақтида битган.'));
  if (cur.hasH && cur.habits >= 0.9) good.push(tr('Одатларда жуда барқарорсиз.'));
  const st = streak();
  if (st >= 3) good.push(tr('Узлуксиз {n} кун иш бажаряпсиз.', { n: st }));
  const byWd = Array(7).fill(0);
  cur.doneAll.forEach(t => byWd[wdIndex(t.doneAt)]++);
  const max = Math.max(...byWd);
  if (max > 1) good.push(tr('Энг унумли кунингиз: {d}. Муҳим ишларни шу кунга қўйинг.', { d: wdFull(byWd.indexOf(max)) }));
  bad.sort((a, b) => SEV[a.sev].o - SEV[b.sev].o);
  return { bad, good };
}
function catStats(list) {
  const map = {};
  list.forEach(t => { (map[t.cat] ||= { cat: t.cat, total: 0, done: 0 }); map[t.cat].total++; if (t.done) map[t.cat].done++; });
  return Object.values(map).map(c => ({ ...c, rate: c.done / c.total })).sort((a, b) => b.total - a.total);
}
const PERIODS = { 1: { b: 'Кунлик', t: 'бугун' }, 7: { b: 'Ҳафталик', t: 'сўнгги 7 кунда' }, 15: { b: '15 кунлик', t: 'сўнгги 15 кунда' }, 30: { b: 'Ойлик', t: 'сўнгги 30 кунда' } };
function narrative(cur, prev, g) {
  const p = tr(PERIODS[UI.period].t);
  if (cur.score === null) return tr('Бу даврда баҳо учун маълумот йўқ. Вазифаларга сана қўйинг ёки одат қўшинг.');
  let s = tr('Сиз {p} {score}% натижа қайд этдингиз ({g}).', { p, score: cur.score, g: `${g.l} — ${g.t}` });
  if (cur.due.length) s += ' ' + tr('Муддати келган {n} та ишдан {k} таси бажарилди.', { n: cur.due.length, k: cur.done.length });
  if (prev.score !== null) s += ' ' + (cur.score > prev.score ? tr('Олдинги даврдан {n} балл яхши.', { n: cur.score - prev.score }) : cur.score < prev.score ? tr('Олдинги даврдан {n} балл паст.', { n: prev.score - cur.score }) : tr('Олдинги давр билан бир хил.'));
  return s;
}
function renderReport() {
  const to = today();
  const from = addDays(to, -(UI.period - 1));
  const cur = stats(from, to);
  const prev = stats(addDays(from, -UI.period), addDays(from, -1));
  const g = grade(cur.score);
  const perDay = [];
  for (let i = 0; i < UI.period; i++) {
    const d = addDays(from, i);
    perDay.push({ d, n: S.tasks.filter(t => t.done && t.doneAt === d).length });
  }
  const maxN = Math.max(1, ...perDay.map(x => x.n));
  const cats = catStats(cur.due);
  const an = analyze(cur, prev);
  const lateList = sortTasks(cur.open);
  const finished = cur.doneAll.slice().sort((a, b) => b.doneAt.localeCompare(a.doneAt)).slice(0, 40);

  view.innerHTML = `
  <div class="seg" role="group" aria-label="${esc(tr('Давр'))}">
    ${Object.entries(PERIODS).map(([n, p]) => `<button data-act="period" data-n="${n}" aria-pressed="${UI.period === Number(n)}">${esc(tr(p.b))}</button>`).join('')}
  </div>
  <section class="card">
    <h2>${esc(tr('Умумий баҳо'))} · ${fmtShort(from)} – ${fmtShort(to)}</h2>
    <div class="score">
      <div class="ring" style="--p:${cur.score ?? 0};--c:${g.c}"><div><div><b>${cur.score ?? '—'}</b><br><span>${esc(tr('100 дан'))}</span></div></div></div>
      <div>
        <div style="font-size:1.4rem;font-weight:700;color:${g.c}">${g.l} · ${esc(g.t)}</div>
        ${prev.score !== null && cur.score !== null ? `<div class="muted small">${esc(tr('Олдинги давр'))}: ${prev.score}</div>` : ''}
        <div class="formula">${esc(cur.hasH ? tr('Баҳо = 50% бажарилган ишлар + 20% вақтида бажариш + 10% фаол кунлар + 20% одатлар.') : tr('Баҳо = 60% бажарилган ишлар + 25% вақтида бажариш + 15% фаол кунлар.'))} ${esc(tr('Сурилган иш дастлабки муддати бўйича ҳисобланади.'))}</div>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><b>${cur.done.length}/${cur.due.length}</b><span>${esc(tr('бажарилди'))}</span></div>
      <div class="kpi"><b>${Math.round(cur.ot * 100)}%</b><span>${esc(tr('вақтида бажарилган'))}</span></div>
      <div class="kpi"><b>${cur.open.length}</b><span>${esc(tr('бажарилмаган'))}</span></div>
      <div class="kpi"><b>${cur.moved.length}</b><span>${esc(tr('кечиктирилган'))}</span></div>
      <div class="kpi"><b>${cur.activeDays}/${cur.days}</b><span>${esc(tr('фаол кун'))}</span></div>
      <div class="kpi"><b>${streak()}</b><span>${esc(tr('кун узлуксиз'))}</span></div>
    </div>
  </section>
  ${UI.period > 1 ? `<section class="card">
    <h2>${esc(tr('Кунлар бўйича бажарилган ишлар'))}</h2>
    <div class="bars">${perDay.map(x => `<div class="bar ${x.n ? '' : 'zero'}" style="height:${(x.n / maxN) * 100}%" title="${fmtShort(x.d)}: ${x.n}"></div>`).join('')}</div>
    <div class="axis">${perDay.map((x, i) => `<span>${UI.period <= 7 || i % 5 === 0 ? fmtShort(x.d) : ''}</span>`).join('')}</div>
  </section>` : ''}
  <div class="rm-grid">
    <section class="card">
      <h2>${esc(tr('Тоифалар бўйича'))}</h2>
      ${cats.length ? cats.map(c => `<div class="rowbar"><span>${esc(tr(c.cat))}</span><div class="track"><i style="width:${c.rate * 100}%"></i></div><span>${c.done}/${c.total}</span></div>`).join('') : `<p class="muted">${esc(tr('Маълумот йўқ.'))}</p>`}
    </section>
    <section class="card">
      <h2>${esc(tr('Хулоса'))}</h2>
      <p>${esc(narrative(cur, prev, g))}</p>
      ${an.good.length ? `<h3>${esc(tr('Яхши томонлар'))}</h3><ul class="tips">${an.good.map(x => `<li>✅ ${esc(x)}</li>`).join('')}</ul>` : ''}
      <h3>${esc(tr('Камчиликлар'))} ${an.bad.length ? `(${an.bad.length})` : ''}</h3>
      ${an.bad.length ? an.bad.map(b => `<div class="flaw"><span class="sev ${b.sev}">${esc(tr(SEV[b.sev].n))}</span><div><b>${esc(b.title)}</b><br>${esc(b.text)}</div></div>`).join('') : `<p class="muted">${esc(tr('Жиддий камчилик топилмади. Баракалла!'))}</p>`}
    </section>
  </div>
  ${S.habits.length ? `<section class="card"><h2>${esc(tr('Одатлар'))} (${esc(tr(PERIODS[UI.period].b))})</h2>
    ${S.habits.map(h => `<div class="rowbar"><span>${esc(h.title)}</span><div class="track"><i style="width:${habitRate(h, UI.period)}%"></i></div><span>${habitRate(h, UI.period)}%</span></div>`).join('')}</section>` : ''}
  ${(() => {
    const rs = Object.entries(S.reviews).filter(([d]) => d >= from && d <= to).sort((a, b) => b[0].localeCompare(a[0]));
    if (!rs.length) return '';
    const avg = rs.reduce((a, [, r]) => a + r.rating, 0) / rs.length;
    return `<section class="card"><h2>${esc(tr('Кун якунлари'))}</h2><p class="muted small">${esc(tr('{n} кун баҳоланган, ўртача {a}/5', { n: rs.length, a: LANG === 'en' ? avg.toFixed(1) : avg.toFixed(1).replace('.', ',') }))}</p>
      ${rs.filter(([, r]) => r.note).slice(0, 5).map(([d, r]) => `<div class="note"><b>${fmtShort(d)} · ${'★'.repeat(r.rating)}</b>${esc(r.note)}</div>`).join('')}</section>`;
  })()}
  ${lateList.length ? `<section class="card"><h2>${esc(tr('Бажарилмаган ишлар'))} (${lateList.length})</h2><ul class="list">${lateList.map(taskHtml).join('')}</ul></section>` : ''}
  ${finished.length ? `<section class="card"><h2>${esc(tr('Бажарилган ишлар'))} (${cur.doneAll.length})</h2><ul class="list">${finished.map(taskHtml).join('')}</ul></section>` : ''}`;
}

/* ---------- roadmap planner ---------- */
function parseSteps(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [name, h] = l.split('|').map(x => x.trim());
    const raw = (h || '1').trim().replace(',', '.');
    const hm = raw.match(/^(\d+):(\d{1,2})$/); // "1:20" means 1 hour 20 minutes
    const hours = Math.max(0.25, Math.min(100, hm ? Number(hm[1]) + Number(hm[2]) / 60 : parseFloat(raw) || 1));
    return { title: name.slice(0, 200), hours };
  });
}
/* Plans backwards from the deadline: keeps ~15% of working days as a buffer,
   respects the daily capacity and the load already on the calendar. */
function buildPlan({ start, deadline, perDay, days, steps, load }) {
  const work = [];
  for (let d = start; d <= deadline; d = addDays(d, 1)) if (days.includes(wdIndex(d))) work.push(d);
  const bufN = work.length >= 6 ? Math.max(1, Math.floor(work.length * 0.15)) : 0;
  const usable = work.slice(0, work.length - bufN);
  const buffer = work.slice(work.length - bufN);
  const used = {};
  let idx = 0;
  const items = [];
  let overflow = 0;
  steps.forEach(st => {
    let left = st.hours;
    const parts = [];
    while (left > 0.001 && idx < usable.length) {
      const d = usable[idx];
      const free = perDay - (load[d] || 0) - (used[d] || 0);
      if (free < 0.25) { idx++; continue; }
      const take = Math.min(free, left);
      parts.push({ date: d, hours: take });
      used[d] = (used[d] || 0) + take;
      left -= take;
    }
    if (left > 0.001) {
      overflow += left;
      parts.push({ date: deadline, hours: left, over: true });
    }
    parts.forEach((p, i) => items.push({
      title: parts.length > 1 ? `${st.title} (${i + 1}/${parts.length})` : st.title,
      date: p.date, hours: Math.round(p.hours * 100) / 100, over: !!p.over
    }));
  });
  const total = steps.reduce((a, s) => a + s.hours, 0);
  const revDate = buffer[0] || deadline;
  items.push({ title: tr('Якуний текшириш ва хулоса'), date: revDate, hours: 0.5, review: true });
  return {
    items, total, overflow, fits: overflow < 0.001,
    need: usable.length ? Math.ceil((total / usable.length) * 2) / 2 : total,
    workDays: work.length, bufferDays: bufN
  };
}
function renderRoadmap() {
  const r = UI.rm;
  if (!r.deadline) r.deadline = addDays(today(), 30);
  view.innerHTML = `
  <div class="rm-grid">
    <section class="card">
      <h2>${esc(tr('Янги мақсад ва йўл харитаси'))}</h2>
      <form id="rmForm">
        <label>${esc(tr('Мақсад'))}
          <input name="title" required maxlength="120" value="${esc(r.title)}" placeholder="${esc(tr('масалан, Инглиз тили B1 даражаси'))}">
        </label>
        <div class="row2">
          <label>${esc(tr('Охирги муддат'))}
            <input type="date" name="deadline" required min="${today()}" value="${r.deadline}">
          </label>
          <label>${esc(tr('Кунига неча соат ажратаман'))}
            <input type="number" name="perDay" min="0.5" max="16" step="0.5" value="${r.perDay}">
          </label>
        </div>
        <div>
          <span class="small muted">${esc(tr('Қайси кунлари ишлайман'))}</span>
          <div class="days">${NAMES.uz.wd.map((_, i) => `<label><input type="checkbox" name="days" value="${i}" ${r.days.includes(i) ? 'checked' : ''}><span>${esc(wdShort(i))}</span></label>`).join('')}</div>
        </div>
        <label>${esc(tr('Шаблон'))}
          <select name="tpl">${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}" ${r.tpl === k ? 'selected' : ''}>${esc(tr(v.name))}</option>`).join('')}</select>
        </label>
        <label>${esc(tr('Қадамлар (ҳар қатор: «номи | соат ёки 1:20»)'))}
          <textarea name="steps" rows="9" placeholder="${esc(tr('Мисол:'))}&#10;${esc(tr('Грамматика асослари'))} | 6:00&#10;${esc(tr('Луғат: 500 та сўз'))} | 8:30">${esc(r.steps)}</textarea>
        </label>
        <div class="actions"><button type="submit" class="primary">${esc(tr('Режа тузиш'))}</button></div>
      </form>
      <p class="small muted">${esc(tr('Қандай ишлайди: муддатдан орқага қараб режалайди, иш кунларининг тахминан 15% ини захира қилиб қолдиради, кунлик лимитни ва календарда аллақачон бор юкламани ҳисобга олади. Бу қоидага асосланган ҳисоблаш, сунъий интеллект эмас: қадамларни ва соатларни ўзингиз реалистик қўйишингиз муҳим.'))}</p>
    </section>
    <section>
      <div id="rmPreview"></div>
      <section class="card goals" id="goalsBox"></section>
    </section>
  </div>`;
  renderPreview();
  updateGoals();
}
function goalsHtml() {
  if (!S.goals.length) return `<h2>${esc(tr('Мақсадларим'))}</h2><p class="muted">${esc(tr('Ҳозирча мақсад йўқ.'))}</p>`;
  return `<h2>${esc(tr('Мақсадларим'))}</h2>` + S.goals.map(g => {
    const ts = sortTasks(S.tasks.filter(t => t.goalId === g.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const done = ts.filter(t => t.done).length;
    const pct = ts.length ? Math.round((done / ts.length) * 100) : 0;
    return `<div class="goal">
      <b>${esc(g.title)}</b> <span class="muted small">· ${esc(tr('муддат'))} ${fmtShort(g.deadline)}</span>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small muted">${done}/${ts.length} ${esc(tr('қадам'))} · ${pct}%</span>
      <button class="link small" data-act="del-goal" data-id="${g.id}">${esc(tr('ўчириш'))}</button>
      <details data-gid="${g.id}" ${UI.openGoals.has(g.id) ? 'open' : ''}><summary>${esc(tr('Қадамларни кўриш ({n})', { n: ts.length }))}</summary>
        <ul class="list">${ts.map(taskHtml).join('')}</ul></details>
    </div>`;
  }).join('');
}
// Only the goals box is rebuilt so unsaved text in the planner form is never lost.
function updateGoals() {
  const box = document.getElementById('goalsBox');
  if (box) box.innerHTML = goalsHtml();
}
function renderPreview() {
  const box = document.getElementById('rmPreview');
  if (!box) return;
  const p = UI.plan;
  if (!p) { box.innerHTML = ''; return; }
  const warn = !p.fits
    ? `<div class="banner bad">${esc(tr('Бу муддатга сиғмайди: {o} ортиқча. Кунига тахминан {n} керак, ёки муддатни узайтиринг, ёки қадамларни қисқартиринг.', { o: fmtDur(p.overflow), n: fmtDur(p.need) }))}</div>`
    : `<div class="banner ok">${esc(tr('Режа сиғади. Жами {t}, {d} иш куни', { t: fmtDur(p.total), d: p.workDays }))}${p.bufferDays ? esc(tr(', шундан охирги {b} таси захира', { b: p.bufferDays })) : ''}.</div>`;
  box.innerHTML = `<section class="card">
    <h2>${esc(tr('Йўл харитаси'))}: ${esc(p.goal.title)}</h2>
    ${warn}
    <ol class="timeline">${p.items.map(i => `<li class="${i.over ? 'over' : i.review ? 'rev' : ''}">
      <div class="d">${esc(fmtLong(i.date))} · ${esc(fmtDur(i.hours))}${i.over ? ' · ' + esc(tr('сиғмаган')) : ''}</div>${esc(i.title)}</li>`).join('')}</ol>
    <div class="actions"><button class="primary" data-act="apply-plan">${esc(tr('Календарга қўшиш'))}</button></div>
  </section>`;
}
function submitRoadmap(f) {
  const fd = new FormData(f);
  const r = UI.rm;
  r.title = String(fd.get('title')).trim();
  r.deadline = fd.get('deadline');
  r.perDay = Math.max(0.5, parseFloat(fd.get('perDay')) || 1);
  r.days = fd.getAll('days').map(Number);
  r.tpl = fd.get('tpl');
  r.steps = String(fd.get('steps'));
  if (!r.days.length) return toast(tr('Камида битта иш кунини танланг'));
  if (r.deadline < today()) return toast(tr('Муддат ўтиб кетган'));
  const steps = parseSteps(r.steps);
  if (!steps.length) return toast(tr('Қадамларни ёзинг ёки шаблон танланг'));
  const load = {};
  S.tasks.forEach(t => { if (t.date && !t.done) load[t.date] = (load[t.date] || 0) + estOf(t); });
  const plan = buildPlan({ start: today(), deadline: r.deadline, perDay: r.perDay, days: r.days, steps, load });
  UI.plan = { ...plan, goal: { title: r.title, deadline: r.deadline } };
  renderPreview();
  document.getElementById('rmPreview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function applyPlan() {
  const p = UI.plan;
  if (!p) return;
  const goal = { id: uid(), title: p.goal.title, deadline: p.goal.deadline, created: Date.now() };
  S.goals.push(goal);
  p.items.forEach((i, n) => S.tasks.push({
    id: uid(), title: i.title, notes: '', date: i.date, time: '', est: i.hours, priority: 2,
    cat: i.review ? 'Бошқа' : 'Ўқиш', done: false, doneAt: null, goalId: goal.id, created: Date.now() + n
  }));
  save();
  UI.plan = null;
  UI.rm.title = ''; UI.rm.steps = ''; UI.rm.tpl = 'blank';
  UI.openGoals.add(goal.id);
  toast(tr('{n} та вазифа календарга қўшилди', { n: p.items.length }));
  renderRoadmap();
}

/* ---------- task dialog ---------- */
const dlg = document.getElementById('taskDlg');
const form = document.getElementById('taskForm');
let editingId = null;
function buildDialogOptions() {
  const est = form.estH ? readDur(form) : '';
  form.querySelector('.dur-slot').innerHTML = durHtml();
  setDur(form, est);
  const cat = form.cat.value;
  const pr = form.priority.value || '2';
  form.cat.innerHTML = CATS.map(c => `<option value="${c}">${esc(tr(c))}</option>`).join('');
  form.priority.innerHTML = [1, 2, 3].map(p => `<option value="${p}">${esc(tr(PRIO[p]))}</option>`).join('');
  if (cat) form.cat.value = cat;
  form.priority.value = pr;
}

function openTask(id, defaults = {}) {
  editingId = id;
  const t = id ? byId(id) : { title: '', notes: '', date: '', time: '', est: '', priority: 2, cat: CATS[0], ...defaults };
  document.getElementById('taskDlgTitle').textContent = id ? tr('Вазифани таҳрирлаш') : tr('Янги вазифа');
  form.title.value = t.title; form.notes.value = t.notes || ''; form.date.value = t.date || '';
  form.time.value = t.time || '';
  setDur(form, t.est); form.priority.value = t.priority; form.cat.value = t.cat;
  document.getElementById('taskDel').hidden = !id;
  dlg.showModal();
  form.title.focus();
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    title: form.title.value.trim(), notes: form.notes.value.trim(), date: form.date.value, time: form.time.value,
    est: readDur(form), priority: Number(form.priority.value), cat: form.cat.value
  };
  if (!data.title) return;
  if (editingId) {
    const t = byId(editingId);
    const nd = data.date;
    data.date = t.date;
    Object.assign(t, data);
    if (nd !== t.date) { if (t.done) t.date = nd; else reschedule(t, nd); }
  } else S.tasks.push({ id: uid(), ...data, done: false, doneAt: null, created: Date.now() });
  save(); dlg.close(); render();
});
document.getElementById('taskCancel').onclick = () => dlg.close();
document.getElementById('taskDel').onclick = () => {
  if (!confirm(tr('Вазифа ўчирилсинми?'))) return;
  S.tasks = S.tasks.filter(t => t.id !== editingId);
  save(); dlg.close(); render();
};

/* ---------- end-of-day review ---------- */
const revDlg = document.getElementById('revDlg');
const revForm = document.getElementById('revForm');
function openReview() {
  const r = S.reviews[today()];
  revForm.reset();
  if (r) { revForm.rating.value = r.rating; revForm.note.value = r.note || ''; }
  revDlg.showModal();
}
revForm.addEventListener('submit', e => {
  e.preventDefault();
  S.reviews[today()] = { rating: Number(revForm.rating.value), note: revForm.note.value.trim() };
  save(); revDlg.close(); toast(tr('Кун якуни сақланди')); render();
});
document.getElementById('revCancel').onclick = () => revDlg.close();

/* ---------- events ---------- */
document.getElementById('themeBtn').addEventListener('click', e => {
  const box = document.getElementById('themes');
  box.hidden = !box.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!box.hidden));
});
document.getElementById('lang').addEventListener('change', e => {
  S.lang = e.target.value;
  save(); applyLang(); render();
});
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) { UI.tab = b.dataset.tab; render(); }
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  switch (act) {
    case 'toggle': {
      const t = byId(id);
      t.done = el.checked;
      t.doneAt = t.done ? today() : null;
      save();
      refresh();
      return;
    }
    case 'edit': return openTask(id);
    case 'focus': {
      const t = byId(id);
      if (isFocus(t)) t.focus = '';
      else if (S.tasks.filter(isFocus).length >= 3) return toast(tr('Фокусда 3 тадан ортиқ иш бўлмасин. Бирини олиб ташланг.'));
      else t.focus = today();
      save(); return render();
    }
    case 'review': return openReview();
    case 'dur': {
      const f = el.closest('form');
      const m = Number(el.dataset.m);
      f.estH.value = Math.floor(m / 60) || '';
      f.estM.value = m % 60 || '';
      updateEndHint(f);
      return;
    }
    case 'preview-greet': return runSplash(Number(el.dataset.id), true);
    case 'greet-menu': {
      const box = document.getElementById('greetMenu');
      box.hidden = !box.hidden;
      return;
    }
    case 'habit': {
      const h = S.habits.find(x => x.id === id);
      const td = today();
      h.days = h.days.filter(d => d !== td);
      if (el.checked) h.days.push(td);
      save(); return render();
    }
    case 'habit-del':
      if (confirm(tr('Одат ўчирилсинми? Унинг тарихи ҳам йўқолади.'))) {
        S.habits = S.habits.filter(h => h.id !== id); save(); render();
      }
      return;
    case 'theme':
      S.theme = id; save(); applyTheme(); renderThemes(); return;
    case 'filter': UI.filter = el.dataset.k; return render();
    case 'clear-done':
      if (confirm(tr('Барча бажарилган вазифалар ўчирилсинми? Ҳисобот ҳам ўзгаради.'))) {
        S.tasks = S.tasks.filter(t => !t.done); save(); render();
      }
      return;
    case 'cal-prev': UI.cal.m--; if (UI.cal.m < 0) { UI.cal.m = 11; UI.cal.y--; } return render();
    case 'cal-next': UI.cal.m++; if (UI.cal.m > 11) { UI.cal.m = 0; UI.cal.y++; } return render();
    case 'cal-today': UI.cal = { y: new Date().getFullYear(), m: new Date().getMonth() }; UI.sel = today(); return render();
    case 'pick': UI.sel = el.dataset.date; return render();
    case 'add-on-day': return openTask(null, { date: UI.sel });
    case 'move-late': {
      const td = today();
      S.tasks.forEach(t => { if (!t.done && t.date && t.date < td) reschedule(t, td); });
      save(); toast(tr('Бугунга кўчирилди. Сурилган ишлар дастлабки муддати бўйича баҳоланади')); return render();
    }
    case 'resched': {
      const t = byId(id);
      reschedule(t, addDays(today(), Number(el.dataset.to)));
      save(); toast(el.dataset.to === '0' ? tr('Бугунга кўчирилди') : tr('Эртага кўчирилди')); return render();
    }
    case 'period': UI.period = Number(el.dataset.n); return render();
    case 'apply-plan': return applyPlan();
    case 'del-goal':
      if (confirm(tr('Мақсад ва унинг бажарилмаган қадамлари ўчирилсинми? Бажарилганлари ҳисобот учун қолади.'))) {
        S.goals = S.goals.filter(g => g.id !== id);
        S.tasks = S.tasks.filter(t => t.goalId !== id || t.done);
        S.tasks.forEach(t => { if (t.goalId === id) t.goalId = null; });
        save(); updateGoals();
      }
      return;
    case 'export': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
      a.download = `rejalarim-${today()}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      return;
    }
  }
});

document.addEventListener('toggle', e => {
  if (e.target.matches('details[data-gid]')) {
    const id = e.target.dataset.gid;
    if (e.target.open) UI.openGoals.add(id); else UI.openGoals.delete(id);
  }
}, true);

document.addEventListener('submit', e => {
  if (e.target.id === 'habitForm') {
    e.preventDefault();
    S.habits.push({ id: uid(), title: String(new FormData(e.target).get('title')).trim(), created: today(), days: [] });
    save(); render();
    document.querySelector('#habitForm input').focus();
    return;
  }
  if (e.target.id === 'quick') {
    e.preventDefault();
    const fd = new FormData(e.target);
    S.tasks.push({
      id: uid(), title: String(fd.get('title')).trim(), notes: '', date: fd.get('date') || '', time: fd.get('time') || '', est: readDur(e.target),
      priority: 2, cat: CATS[0], done: false, doneAt: null, created: Date.now()
    });
    save(); render();
    document.querySelector('#quick input[name=title]').focus();
  } else if (e.target.id === 'rmForm') {
    e.preventDefault();
    submitRoadmap(e.target);
  }
});

document.addEventListener('input', e => {
  const f = e.target.form;
  if (f && f.querySelector('.endhint') && e.target.matches('input[name=estH], input[name=estM], input[name=time]')) updateEndHint(f);
  if (e.target.id === 'q') {
    UI.q = e.target.value;
    const pos = e.target.selectionStart;
    renderTasks();
    const q = document.getElementById('q');
    q.focus(); q.setSelectionRange(pos, pos);
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'cap') {
    S.capacity = Math.max(1, Math.min(16, Number(e.target.value) || 6));
    save(); render();
  } else if (e.target.name === 'tpl' && e.target.form && e.target.form.id === 'rmForm') {
    e.target.form.steps.value = templateText(e.target.value);
  } else if (e.target.id === 'import') {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(txt => {
      const raw = JSON.parse(txt);
      if (!raw || !Array.isArray(raw.tasks)) throw new Error('bad');
      if (!confirm(tr('Жорий маълумотлар файлдагиси билан алмаштирилсинми?'))) return;
      S = { ...defaultState(), ...raw };
      save(); applyLang(); applyTheme(); render(); toast(tr('Маълумот тикланди'));
    }).catch(() => toast(tr('Файл нотўғри'))).finally(() => { e.target.value = ''; });
  }
});

// Ask the browser not to evict our data when storage is low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
applyTheme();
applyLang();
render();
runSplash();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  // When a newer version takes over, reload once so the old code never keeps running.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
}
