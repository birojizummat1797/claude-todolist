'use strict';

/* ---------- constants ---------- */
const KEY = 'todolist.v1';
const VERSION = '6';
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD = ['Душ', 'Сей', 'Чор', 'Пай', 'Жум', 'Шан', 'Якш'];
const WD_FULL = ['Душанба', 'Сешанба', 'Чоршанба', 'Пайшанба', 'Жума', 'Шанба', 'Якшанба'];
const CATS = ['Шахсий', 'Иш', 'Ўқиш', 'Соғлиқ', 'Молия', 'Бошқа'];
const PRIO = { 1: 'Паст', 2: 'Ўрта', 3: 'Юқори' };

const TEMPLATES = {
  blank: { name: 'Бўш (ўзим ёзаман)', steps: '' },
  learn: {
    name: 'Янги нарса ўрганиш',
    steps: [
      'Мақсад ва кутилган натижани аниқ ёзиш | 0.5',
      'Манбаларни танлаш (1–2 та асосий) | 1',
      'Асослар: назария | 4',
      'Асослар: амалий машқлар | 4',
      'Кичик амалий мини-лойиҳа | 6',
      'Хатоларни таҳлил қилиш | 2',
      'Мураккаб мавзулар | 4',
      'Якуний лойиҳа ёки имтиҳонга тайёргарлик | 6'
    ].join('\n')
  },
  project: {
    name: 'Лойиҳа ёки иш топшириғи',
    steps: [
      'Талабларни аниқлаш | 1',
      'Режа ва тузилмани чизиш | 2',
      'Биринчи ишчи версия (МВП) | 8',
      'Синаш ва хатоларни тузатиш | 4',
      'Сайқаллаш ва ҳужжатлаштириш | 3',
      'Топшириш ёки эълон қилиш | 1'
    ].join('\n')
  },
  health: {
    name: 'Соғлиқ ва спорт',
    steps: [
      'Ҳозирги кўрсаткичларни ўлчаш | 0.5',
      'Ҳафталик машқ режасини тузиш | 1',
      '1-ҳафта: енгил бошланиш | 3',
      '2-ҳафта: юкни секин ошириш | 4',
      '3-ҳафта: асосий режим | 5',
      'Натижаларни ўлчаб таққослаш | 0.5'
    ].join('\n')
  }
};

/* ---------- date helpers (local time, YYYY-MM-DD) ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const wdIndex = s => (parse(s).getDay() + 6) % 7; // Monday = 0
const fmtShort = s => `${pad(parse(s).getDate())}.${pad(parse(s).getMonth() + 1)}`;
const fmtLong = s => `${parse(s).getDate()}-${MONTHS[parse(s).getMonth()].toLowerCase()}, ${WD_FULL[wdIndex(s)]}`;
const hrs = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- state ---------- */
const defaultState = () => ({ tasks: [], goals: [], capacity: 6, theme: 'auto', habits: [], reviews: {} });
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
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Сақлаб бўлмади: браузер рухсат бермаяпти'); }
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
    <button class="sw" data-act="theme" data-id="${t.id}" aria-pressed="${t.id === S.theme}" aria-label="${t.name}"
      style="background:linear-gradient(135deg,${t.p.join(',')})"></button><span class="swl">${t.name}</span></div>`).join('');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}

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
  if (d === 0) return { text: 'Бугун', cls: 'today' };
  if (d === 1) return { text: 'Эртага', cls: '' };
  if (d === -1) return { text: 'Кеча', cls: t.done ? '' : 'late' };
  return { text: fmtShort(t.date), cls: d < 0 && !t.done ? 'late' : '' };
}
function sortTasks(list) {
  return list.slice().sort((a, b) =>
    (a.done - b.done) ||
    ((a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : 0) ||
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
  return `<li class="task ${taskState(t)}" data-tid="${t.id}">
    <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Бажарилди">
    <div class="body">
      <div class="t"><span>${esc(t.title)}</span></div>
      <div class="meta">
        ${t.done ? `<span class="badge fin">✓ Бажарилди${t.doneAt ? ' ' + fmtShort(t.doneAt) : ''}</span>` : ''}
        ${dl && !t.done ? `<span class="badge ${dl.cls}">${dl.text}</span>` : ''}
        <span class="badge p${t.priority}">${PRIO[t.priority]}</span>
        <span class="badge">${esc(t.cat)}</span>
        ${estOf(t) ? `<span class="badge">${hrs(estOf(t))} соат</span>` : ''}
        ${t.goalId ? '<span class="badge">🎯 мақсад</span>' : ''}
        ${t.moved ? `<span class="badge late">↻ ${t.moved} марта сурилган</span>` : ''}
      </div>
      ${t.notes ? `<div class="meta">${esc(t.notes)}</div>` : ''}
      ${!t.done && (taskState(t) === 'st-late' || taskState(t) === 'st-today') ? `<div class="meta">
        ${taskState(t) === 'st-late' ? `<button class="link" data-act="resched" data-id="${t.id}" data-to="0">Бугунга кўчириш</button>` : ''}
        <button class="link" data-act="resched" data-id="${t.id}" data-to="1">Эртага</button>
        <button class="link" data-act="edit" data-id="${t.id}">Санани танлаш</button></div>` : ''}
    </div>
    ${t.done ? '' : `<button class="icon star ${isFocus(t) ? 'on' : ''}" data-act="focus" data-id="${t.id}" aria-label="Бугунги фокус" title="Бугунги фокус">${isFocus(t) ? '★' : '☆'}</button>`}
    <button class="icon" data-act="edit" data-id="${t.id}" aria-label="Таҳрирлаш">✎</button>
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
  const msg = !doneToday && !openNow ? 'Бугунга режа қўйинг: энг муҳим 1–3 та ишни танланг.' :
    openNow === 0 ? 'Бугунги ишлар тугади. Баракалла!' :
    doneToday === 0 ? `Бугун ${openNow} та иш кутяпти. Биринчисидан бошланг.` :
    `${doneToday} та бажарилди, ${openNow} та қолди. Давом этинг.`;
  return `<section class="card today-card">
    <div class="grow"><p class="big">Бугун, ${fmtLong(td)}</p><p class="muted">${msg}</p></div>
    ${st ? `<span class="fire">🔥 ${st} кун</span>` : ''}
    <button class="ghost" data-act="review">${rev ? `Кун якуни: ${'★'.repeat(rev.rating)}` : 'Кун якуни'}</button>
  </section>`;
}
function focusHtml() {
  const list = S.tasks.filter(isFocus);
  return `<section class="card"><h2>⭐ Бугунги фокус (${list.length}/3)</h2>
    ${list.length ? `<ul class="list">${list.map(taskHtml).join('')}</ul>` : '<p class="hint">Энг муҳим 1–3 та ишни ☆ тугмаси билан танланг. Кун охирида шулар асосий мезон бўлади.</p>'}</section>`;
}
function renderTasks() {
  const list = filtered();
  const open = S.tasks.filter(pending).length;
  const late = S.tasks.filter(t => !t.done && t.date && t.date < today()).length;
  view.innerHTML = `
  ${summaryHtml()}
  ${focusHtml()}
  <section class="card">
    <form class="quick" id="quick">
      <input name="title" placeholder="Янги вазифа..." required maxlength="200" autocomplete="off" aria-label="Вазифа номи">
      <input type="date" name="date" value="${today()}" aria-label="Муддат">
      <button class="primary" type="submit">Қўшиш</button>
    </form>
    <div class="chips" role="group" aria-label="Фильтр">
      ${FILTERS.map(([k, n]) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${UI.filter === k}">${n}${k === 'done' && S.tasks.some(t => t.done) ? ` (${S.tasks.filter(t => t.done).length})` : ''}</button>`).join('')}
    </div>
    <input class="search" type="search" id="q" placeholder="Қидириш..." value="${esc(UI.q)}" aria-label="Қидириш">
    <p class="muted small">Очиқ: ${open} · Кечиккан: ${late}</p>
    ${list.length ? `<ul class="list">${list.map(taskHtml).join('')}</ul>` : `<p class="empty">${UI.filter === 'done' ? 'Ҳали бажарилган вазифа йўқ.' : 'Фаол вазифа йўқ. Янгисини қўшинг!'}</p>`}
    ${S.tasks.some(t => t.done) ? '<button class="link small" data-act="clear-done">Бажарилганларни тозалаш</button>' : ''}
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
    <h2>Кунлик одатлар</h2>
    <p class="muted small">Ҳар куни такрорланадиган ишлар: намоз, спорт, китоб, сув. Мақсад — занжирни узмаслик.</p>
    <form class="quick" id="habitForm" style="grid-template-columns:1fr auto">
      <input name="title" placeholder="Янги одат..." required maxlength="80" autocomplete="off" aria-label="Одат номи">
      <button class="primary" type="submit">Қўшиш</button>
    </form>
    ${S.habits.length ? `<p class="muted small" style="margin-top:12px">Бугун: ${doneN}/${S.habits.length}</p>
    <ul class="list">${S.habits.map(h => {
      const ok = habitDone(h, td);
      const st = habitStreak(h);
      return `<li class="task ${ok ? 'st-done' : 'st-today'}">
        <input type="checkbox" data-act="habit" data-id="${h.id}" ${ok ? 'checked' : ''} aria-label="Бугун бажарилди">
        <div class="body">
          <div class="t">${esc(h.title)}</div>
          <div class="meta"><span class="dots" title="Сўнгги 7 кун">${dots(h)}</span>
            <span class="badge">${st ? '🔥 ' + st + ' кун' : 'занжир йўқ'}</span>
            <span class="badge">30 кун: ${habitRate(h, 30)}%</span></div>
        </div>
        <button class="icon" data-act="habit-del" data-id="${h.id}" aria-label="Ўчириш">✕</button>
      </li>`;
    }).join('')}</ul>` : '<p class="empty">Ҳали одат қўшилмаган.</p>'}
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
    cells += `<button class="day ${parse(d).getMonth() !== m ? 'out' : ''} ${d === td ? 'today' : ''} ${d === UI.sel ? 'sel' : ''}" data-act="pick" data-date="${d}" aria-label="${fmtLong(d)}">
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

  view.innerHTML = `
  <div class="cal-layout">
    <section class="card">
      <div class="cal-head">
        <button data-act="cal-prev" aria-label="Олдинги ой">‹</button>
        <h2>${MONTHS[m]} ${y}</h2>
        <button data-act="cal-next" aria-label="Кейинги ой">›</button>
        <button data-act="cal-today">Бугун</button>
      </div>
      <div class="grid">${WD.map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div>
      <div class="legend">
        <span><span class="c pend">3</span> очиқ</span>
        <span><span class="c late">2</span> кечиккан</span>
        <span><span class="c ok">✓1</span> бажарилган</span>
        <span>▬ юклама (яшил → сариқ → қизил)</span>
      </div>
    </section>
    <aside>
      <section class="card">
        ${lateAll.length ? `<div class="banner bad">Кечиккан ишлар: ${lateAll.length} та. <button class="ghost" data-act="move-late">Бугунга кўчириш</button></div>` : ''}
        ${next7.length ? `<div class="banner warn">Юклама лимитдан ошган кунлар: ${next7.map(fmtShort).join(', ')}. Баъзи ишларни бошқа кунга кўчиринг.</div>` : ''}
        <p class="small muted">Шу ҳафта: ${wkDone}/${wk.length} вазифа бажарилган</p>
        <div class="cap">Кунлик лимит <input type="number" id="cap" min="1" max="16" step="0.5" value="${S.capacity}"> соат</div>
      </section>
      <section class="card">
        <h2>${fmtLong(UI.sel)}</h2>
        <p class="small muted">Режалаштирилган: ${hrs(selLoad)} / ${hrs(S.capacity)} соат</p>
        ${selLoad > S.capacity ? '<div class="banner warn">Бу кунга ҳаддан ташқари кўп иш режалаштирилган.</div>' : ''}
        ${dayTasks.length ? `<ul class="list">${dayTasks.map(taskHtml).join('')}</ul>` : '<p class="empty">Бу кунга вазифа йўқ.</p>'}
        <button class="primary" data-act="add-on-day">+ Вазифа қўшиш</button>
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
  if (s === null) return { l: '—', t: 'Маълумот етарли эмас', c: 'var(--muted)' };
  if (s >= 90) return { l: 'A', t: 'Аъло', c: 'var(--ok)' };
  if (s >= 75) return { l: 'B', t: 'Яхши', c: 'var(--ok)' };
  if (s >= 60) return { l: 'C', t: 'Қониқарли', c: 'var(--warn)' };
  if (s >= 40) return { l: 'D', t: 'Суст', c: 'var(--warn)' };
  return { l: 'E', t: 'Жиддий эътибор керак', c: 'var(--bad)' };
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
    if (cur.open.length) add(ratio >= 0.4 ? 'high' : ratio >= 0.2 ? 'mid' : 'low', 'Бажарилмаган ишлар',
      `Муддати ўтган ${cur.open.length} та иш бажарилмаган (${Math.round(ratio * 100)}%). Ҳақиқатан керак эмасини ўчиринг, керагини аниқ вақт билан режалаштиринг.`);
    if (cur.done.length && cur.ot < 0.85) add(cur.ot < 0.5 ? 'high' : cur.ot < 0.7 ? 'mid' : 'low', 'Вақтида бажарилмаган',
      `Бажарилганларнинг фақат ${Math.round(cur.ot * 100)}% вақтида тугаган. Муддатларни реалистикроқ қўйинг (тахминий вақтга 20% қўшинг).`);
    if (cur.moved.length) add(cur.moved.length >= 3 || cur.moved.length / cur.due.length > 0.3 ? 'high' : cur.moved.length >= 2 ? 'mid' : 'low', 'Кечиктирилган ишлар',
      `${cur.moved.length} та иш бошқа кунга суриб қўйилган. Сурилганлар дастлабки муддати бўйича баҳоланади. Иш кўп бўлса, камроқ вазифа қўйинг.`);
    const hiOpen = cur.open.filter(t => t.priority === 3).length;
    if (hiOpen) add('high', 'Муҳим ишлар қолиб кетган', `«Юқори» муҳимликдаги ${hiOpen} та иш бажарилмаган. Эртага энг аввал шуларни қилинг.`);
    const cats = catStats(cur.due).filter(c => c.total >= 2).sort((a, b) => a.rate - b.rate);
    if (cats.length && cats[0].rate < 0.5) add('mid', `«${cats[0].cat}» йўналиши суст`, `Бу тоифада ишларнинг фақат ${Math.round(cats[0].rate * 100)}% бажарилган. Унга алоҳида вақт ажратинг.`);
  }
  if (cur.hasH) {
    const worst = S.habits.map(h => ({ h, r: habitRate(h, cur.days) })).sort((a, b) => a.r - b.r)[0];
    if (worst.r < 85) add(worst.r < 50 ? 'high' : worst.r < 70 ? 'mid' : 'low', 'Одатда узилиш', `«${worst.h.title}» одати ${worst.r}% бажарилган. Занжирни узмаслик учун уни кунинг бошига қўйинг.`);
  }
  if (cur.days >= 7 && cur.activeDays < cur.days * 0.4) add(cur.activeDays < cur.days * 0.2 ? 'high' : 'mid', 'Фаол кунлар кам', `${cur.days} кундан фақат ${cur.activeDays} кун иш бажарилган. Ҳар куни камида битта кичик иш қилинг.`);
  const td = today();
  const over = [];
  for (let i = 0; i < 7; i++) if (dayLoad(addDays(td, i)) > S.capacity) over.push(addDays(td, i));
  if (over.length) add('low', 'Келгуси кунларда ортиқча юклама', `${over.map(fmtShort).join(', ')} кунларида иш лимитдан ошиб кетган. Бир қисмини бошқа кунга олдиндан суринг.`);
  const revs = Object.entries(S.reviews).filter(([d]) => d >= addDays(td, -(cur.days - 1)));
  if (cur.days >= 7 && !revs.length) add('low', 'Кун якуни ёзилмаган', 'Кечқурун 1 дақиқа ўзингизни баҳоланг: бу интизомнинг энг кучли воситаси.');
  else if (revs.length >= 3 && revs.reduce((a, [, r]) => a + r.rating, 0) / revs.length < 3) add('mid', 'Ўзингизни паст баҳоляпсиз', 'Кун баҳолари ўртача 3 дан паст. Сабабини изоҳларда ёзинг ва кўпроқ дам беринг.');
  // strengths
  if (cur.score !== null && prev.score !== null && cur.score > prev.score) good.push(`Олдинги даврга нисбатан +${cur.score - prev.score} балл яхшиланиш.`);
  if (cur.due.length && cur.cr === 1) good.push('Муддати келган ҳамма иш бажарилган.');
  if (cur.done.length >= 3 && cur.ot >= 0.9) good.push('Ишларнинг деярли ҳаммаси ўз вақтида битган.');
  if (cur.hasH && cur.habits >= 0.9) good.push('Одатларда жуда барқарорсиз.');
  const st = streak();
  if (st >= 3) good.push(`Узлуксиз ${st} кун иш бажаряпсиз.`);
  const byWd = Array(7).fill(0);
  cur.doneAll.forEach(t => byWd[wdIndex(t.doneAt)]++);
  const max = Math.max(...byWd);
  if (max > 1) good.push(`Энг унумли кунингиз: ${WD_FULL[byWd.indexOf(max)]}. Муҳим ишларни шу кунга қўйинг.`);
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
  const p = PERIODS[UI.period];
  if (cur.score === null) return `${p.t[0].toUpperCase() + p.t.slice(1)} баҳо учун маълумот йўқ. Вазифаларга сана қўйинг ёки одат қўшинг.`;
  let t = `Сиз ${p.t} ${cur.score}% натижа қайд этдингиз (${g.l} — ${g.t}).`;
  if (cur.due.length) t += ` Муддати келган ${cur.due.length} та ишдан ${cur.done.length} таси бажарилди.`;
  if (prev.score !== null) t += cur.score > prev.score ? ` Олдинги даврдан ${cur.score - prev.score} балл яхши.` : cur.score < prev.score ? ` Олдинги даврдан ${prev.score - cur.score} балл паст.` : ' Олдинги давр билан бир хил.';
  return t;
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
  <div class="seg" role="group" aria-label="Давр">
    ${Object.entries(PERIODS).map(([n, p]) => `<button data-act="period" data-n="${n}" aria-pressed="${UI.period === Number(n)}">${p.b}</button>`).join('')}
  </div>
  <section class="card">
    <h2>Умумий баҳо · ${fmtShort(from)} – ${fmtShort(to)}</h2>
    <div class="score">
      <div class="ring" style="--p:${cur.score ?? 0};--c:${g.c}"><div><div><b>${cur.score ?? '—'}</b><br><span>100 дан</span></div></div></div>
      <div>
        <div style="font-size:1.4rem;font-weight:700;color:${g.c}">${g.l} · ${g.t}</div>
        ${prev.score !== null && cur.score !== null ? `<div class="muted small">Олдинги давр: ${prev.score}</div>` : ''}
        <div class="formula">${cur.hasH ? 'Баҳо = 50% бажарилган ишлар + 20% вақтида бажариш + 10% фаол кунлар + 20% одатлар.' : 'Баҳо = 60% бажарилган ишлар + 25% вақтида бажариш + 15% фаол кунлар.'} Сурилган иш дастлабки муддати бўйича ҳисобланади.</div>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><b>${cur.done.length}/${cur.due.length}</b><span>бажарилди</span></div>
      <div class="kpi"><b>${Math.round(cur.ot * 100)}%</b><span>вақтида бажарилган</span></div>
      <div class="kpi"><b>${cur.open.length}</b><span>бажарилмаган</span></div>
      <div class="kpi"><b>${cur.moved.length}</b><span>кечиктирилган</span></div>
      <div class="kpi"><b>${cur.activeDays}/${cur.days}</b><span>фаол кун</span></div>
      <div class="kpi"><b>${streak()}</b><span>кун узлуксиз</span></div>
    </div>
  </section>
  ${UI.period > 1 ? `  <section class="card">
    <h2>Кунлар бўйича бажарилган ишлар</h2>
    <div class="bars">${perDay.map(x => `<div class="bar ${x.n ? '' : 'zero'}" style="height:${(x.n / maxN) * 100}%" title="${fmtShort(x.d)}: ${x.n}"></div>`).join('')}</div>
    <div class="axis">${perDay.map((x, i) => `<span>${UI.period <= 7 || i % 5 === 0 ? fmtShort(x.d) : ''}</span>`).join('')}</div>
  </section>` : ''}
  <div class="rm-grid">
    <section class="card">
      <h2>Тоифалар бўйича</h2>
      ${cats.length ? cats.map(c => `<div class="rowbar"><span>${esc(c.cat)}</span><div class="track"><i style="width:${c.rate * 100}%"></i></div><span>${c.done}/${c.total}</span></div>`).join('') : '<p class="muted">Маълумот йўқ.</p>'}
    </section>
    <section class="card">
      <h2>Хулоса</h2>
      <p>${esc(narrative(cur, prev, g))}</p>
      ${an.good.length ? `<h3>Яхши томонлар</h3><ul class="tips">${an.good.map(t => `<li>✅ ${esc(t)}</li>`).join('')}</ul>` : ''}
      <h3>Камчиликлар ${an.bad.length ? `(${an.bad.length})` : ''}</h3>
      ${an.bad.length ? an.bad.map(b => `<div class="flaw"><span class="sev ${b.sev}">${SEV[b.sev].n}</span><div><b>${esc(b.title)}</b><br>${esc(b.text)}</div></div>`).join('') : '<p class="muted">Жиддий камчилик топилмади. Баракалла!</p>'}
    </section>
  </div>
  ${S.habits.length ? `<section class="card"><h2>Одатлар (${UI.period} кун)</h2>
    ${S.habits.map(h => `<div class="rowbar"><span>${esc(h.title)}</span><div class="track"><i style="width:${habitRate(h, UI.period)}%"></i></div><span>${habitRate(h, UI.period)}%</span></div>`).join('')}</section>` : ''}
  ${(() => {
    const rs = Object.entries(S.reviews).filter(([d]) => d >= from && d <= to).sort((a, b) => b[0].localeCompare(a[0]));
    if (!rs.length) return '';
    const avg = rs.reduce((a, [, r]) => a + r.rating, 0) / rs.length;
    return `<section class="card"><h2>Кун якунлари</h2><p class="muted small">${rs.length} кун баҳоланган, ўртача ${avg.toFixed(1).replace('.', ',')}/5</p>
      ${rs.filter(([, r]) => r.note).slice(0, 5).map(([d, r]) => `<div class="note"><b>${fmtShort(d)} · ${'★'.repeat(r.rating)}</b>${esc(r.note)}</div>`).join('')}</section>`;
  })()}
  ${lateList.length ? `<section class="card"><h2>Бажарилмаган ишлар (${lateList.length})</h2><ul class="list">${lateList.map(taskHtml).join('')}</ul></section>` : ''}
  ${finished.length ? `<section class="card"><h2>Бажарилган ишлар (${cur.doneAll.length})</h2><ul class="list">${finished.map(taskHtml).join('')}</ul></section>` : ''}`;
}

/* ---------- roadmap planner ---------- */
function parseSteps(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [name, h] = l.split('|').map(x => x.trim());
    const hours = Math.max(0.25, Math.min(100, parseFloat((h || '1').replace(',', '.')) || 1));
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
  items.push({ title: 'Якуний текшириш ва хулоса', date: revDate, hours: 0.5, review: true });
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
      <h2>Янги мақсад ва йўл харитаси</h2>
      <form id="rmForm">
        <label>Мақсад
          <input name="title" required maxlength="120" value="${esc(r.title)}" placeholder="масалан, Инглиз тили B1 даражаси">
        </label>
        <div class="row2">
          <label>Охирги муддат
            <input type="date" name="deadline" required min="${today()}" value="${r.deadline}">
          </label>
          <label>Кунига неча соат ажратаман
            <input type="number" name="perDay" min="0.5" max="16" step="0.5" value="${r.perDay}">
          </label>
        </div>
        <div>
          <span class="small muted">Қайси кунлари ишлайман</span>
          <div class="days">${WD.map((w, i) => `<label><input type="checkbox" name="days" value="${i}" ${r.days.includes(i) ? 'checked' : ''}><span>${w}</span></label>`).join('')}</div>
        </div>
        <label>Шаблон
          <select name="tpl">${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}" ${r.tpl === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
        </label>
        <label>Қадамлар (ҳар қатор: «номи | соат»)
          <textarea name="steps" rows="9" placeholder="Мисол:&#10;Грамматика асослари | 6&#10;Луғат: 500 та сўз | 8">${esc(r.steps)}</textarea>
        </label>
        <div class="actions"><button type="submit" class="primary">Режа тузиш</button></div>
      </form>
      <p class="small muted">Қандай ишлайди: муддатдан орқага қараб режалайди, иш кунларининг тахминан 15% ини захира қилиб қолдиради, кунлик лимитни ва календарда аллақачон бор юкламани ҳисобга олади. Бу қоидага асосланган ҳисоблаш, сунъий интеллект эмас: қадамларни ва соатларни ўзингиз реалистик қўйишингиз муҳим.</p>
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
  if (!S.goals.length) return '<h2>Мақсадларим</h2><p class="muted">Ҳозирча мақсад йўқ.</p>';
  return '<h2>Мақсадларим</h2>' + S.goals.map(g => {
    const ts = sortTasks(S.tasks.filter(t => t.goalId === g.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const done = ts.filter(t => t.done).length;
    const pct = ts.length ? Math.round((done / ts.length) * 100) : 0;
    return `<div class="goal">
      <b>${esc(g.title)}</b> <span class="muted small">· муддат ${fmtShort(g.deadline)}</span>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="small muted">${done}/${ts.length} қадам · ${pct}%</span>
      <button class="link small" data-act="del-goal" data-id="${g.id}">ўчириш</button>
      <details data-gid="${g.id}" ${UI.openGoals.has(g.id) ? 'open' : ''}><summary>Қадамларни кўриш (${ts.length})</summary>
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
    ? `<div class="banner bad">Бу муддатга сиғмайди: ${hrs(p.overflow)} соат ортиқча. Кунига тахминан ${hrs(p.need)} соат керак, ёки муддатни узайтиринг, ёки қадамларни қисқартиринг.</div>`
    : `<div class="banner ok">Режа сиғади. Жами ${hrs(p.total)} соат, ${p.workDays} иш куни${p.bufferDays ? `, шундан охирги ${p.bufferDays} таси захира` : ''}.</div>`;
  box.innerHTML = `<section class="card">
    <h2>Йўл харитаси: ${esc(p.goal.title)}</h2>
    ${warn}
    <ol class="timeline">${p.items.map(i => `<li class="${i.over ? 'over' : i.review ? 'rev' : ''}">
      <div class="d">${fmtLong(i.date)} · ${hrs(i.hours)} соат${i.over ? ' · сиғмаган' : ''}</div>${esc(i.title)}</li>`).join('')}</ol>
    <div class="actions"><button class="primary" data-act="apply-plan">Календарга қўшиш</button></div>
  </section>`;
}
function submitRoadmap(form) {
  const f = new FormData(form);
  const r = UI.rm;
  r.title = String(f.get('title')).trim();
  r.deadline = f.get('deadline');
  r.perDay = Math.max(0.5, parseFloat(f.get('perDay')) || 1);
  r.days = f.getAll('days').map(Number);
  r.tpl = f.get('tpl');
  r.steps = String(f.get('steps'));
  if (!r.days.length) return toast('Камида битта иш кунини танланг');
  if (r.deadline < today()) return toast('Муддат ўтиб кетган');
  const steps = parseSteps(r.steps);
  if (!steps.length) return toast('Қадамларни ёзинг ёки шаблон танланг');
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
    id: uid(), title: i.title, notes: '', date: i.date, est: i.hours, priority: i.review ? 2 : 2,
    cat: i.review ? 'Бошқа' : 'Ўқиш', done: false, doneAt: null, goalId: goal.id, created: Date.now() + n
  }));
  save();
  UI.plan = null;
  UI.rm.title = ''; UI.rm.steps = ''; UI.rm.tpl = 'blank';
  UI.openGoals.add(goal.id);
  toast(`${p.items.length} та вазифа календарга қўшилди`);
  renderRoadmap();
}

/* ---------- task dialog ---------- */
const dlg = document.getElementById('taskDlg');
const form = document.getElementById('taskForm');
let editingId = null;
form.cat.innerHTML = CATS.map(c => `<option>${c}</option>`).join('');

function openTask(id, defaults = {}) {
  editingId = id;
  const t = id ? byId(id) : { title: '', notes: '', date: '', est: '', priority: 2, cat: CATS[0], ...defaults };
  document.getElementById('taskDlgTitle').textContent = id ? 'Вазифани таҳрирлаш' : 'Янги вазифа';
  form.title.value = t.title; form.notes.value = t.notes || ''; form.date.value = t.date || '';
  form.est.value = t.est || ''; form.priority.value = t.priority; form.cat.value = t.cat;
  document.getElementById('taskDel').hidden = !id;
  dlg.showModal();
  form.title.focus();
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    title: form.title.value.trim(), notes: form.notes.value.trim(), date: form.date.value,
    est: form.est.value ? Number(form.est.value) : '', priority: Number(form.priority.value), cat: form.cat.value
  };
  if (!data.title) return;
  if (editingId) {
    const t = byId(editingId);
    const nd = data.date;
    data.date = t.date;
    Object.assign(t, data);
    if (nd !== t.date) { if (t.done) t.date = nd; else reschedule(t, nd); }
  }
  else S.tasks.push({ id: uid(), ...data, done: false, doneAt: null, created: Date.now() });
  save(); dlg.close(); render();
});
document.getElementById('taskCancel').onclick = () => dlg.close();
document.getElementById('taskDel').onclick = () => {
  if (!confirm('Вазифа ўчирилсинми?')) return;
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
  save(); revDlg.close(); toast('Кун якуни сақланди'); render();
});
document.getElementById('revCancel').onclick = () => revDlg.close();

/* ---------- events ---------- */
document.getElementById('themeBtn').addEventListener('click', e => {
  const box = document.getElementById('themes');
  box.hidden = !box.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!box.hidden));
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
      else if (S.tasks.filter(isFocus).length >= 3) return toast('Фокусда 3 тадан ортиқ иш бўлмасин. Бирини олиб ташланг.');
      else t.focus = today();
      save(); return render();
    }
    case 'review': return openReview();
    case 'habit': {
      const h = S.habits.find(x => x.id === id);
      const td = today();
      h.days = h.days.filter(d => d !== td);
      if (el.checked) h.days.push(td);
      save(); return render();
    }
    case 'habit-del':
      if (confirm('Одат ўчирилсинми? Унинг тарихи ҳам йўқолади.')) {
        S.habits = S.habits.filter(h => h.id !== id); save(); render();
      }
      return;
    case 'theme':
      S.theme = id; save(); applyTheme(); renderThemes(); return;
    case 'filter': UI.filter = el.dataset.k; return render();
    case 'clear-done':
      if (confirm('Барча бажарилган вазифалар ўчирилсинми? Ҳисобот ҳам ўзгаради.')) {
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
      save(); toast('Бугунга кўчирилди. Сурилган ишлар дастлабки муддати бўйича баҳоланади'); return render();
    }
    case 'resched': {
      const t = byId(id);
      reschedule(t, addDays(today(), Number(el.dataset.to)));
      save(); toast(el.dataset.to === '0' ? 'Бугунга кўчирилди' : 'Эртага кўчирилди'); return render();
    }
    case 'period': UI.period = Number(el.dataset.n); return render();
    case 'apply-plan': return applyPlan();
    case 'del-goal':
      if (confirm('Мақсад ва унинг бажарилмаган қадамлари ўчирилсинми? Бажарилганлари ҳисобот учун қолади.')) {
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
    const f = new FormData(e.target);
    S.tasks.push({
      id: uid(), title: String(f.get('title')).trim(), notes: '', date: f.get('date') || '', est: '',
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
    e.target.form.steps.value = TEMPLATES[e.target.value].steps;
  } else if (e.target.id === 'import') {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(txt => {
      const raw = JSON.parse(txt);
      if (!raw || !Array.isArray(raw.tasks)) throw new Error('bad');
      if (!confirm('Жорий маълумотлар файлдагиси билан алмаштирилсинми?')) return;
      S = { ...defaultState(), ...raw };
      save(); render(); toast('Маълумот тикланди');
    }).catch(() => toast('Файл нотўғри')).finally(() => { e.target.value = ''; });
  }
});

// Ask the browser not to evict our data when storage is low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
applyTheme();
renderThemes();
document.getElementById('ver').textContent = `· Версия ${VERSION}`;
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  // When a newer version takes over, reload once so the old code never keeps running.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
}
