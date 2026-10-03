'use strict';

/* ---------- constants ---------- */
const KEY = 'todolist.v1';
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
const defaultState = () => ({ tasks: [], goals: [], capacity: 6 });
let S = load();
const UI = {
  tab: 'tasks',
  filter: 'all',
  q: '',
  cal: { y: new Date().getFullYear(), m: new Date().getMonth() },
  sel: today(),
  period: 7,
  rm: { title: '', deadline: '', perDay: 2, days: [0, 1, 2, 3, 4], tpl: 'blank', steps: '' },
  plan: null
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
function taskHtml(t) {
  const dl = dateLabel(t);
  return `<li class="task ${t.done ? 'done' : ''}">
    <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Бажарилди">
    <div class="body">
      <div class="t">${esc(t.title)}</div>
      <div class="meta">
        ${dl ? `<span class="badge ${dl.cls}">${dl.text}</span>` : ''}
        <span class="badge p${t.priority}">${PRIO[t.priority]}</span>
        <span class="badge">${esc(t.cat)}</span>
        ${estOf(t) ? `<span class="badge">${hrs(estOf(t))} соат</span>` : ''}
        ${t.goalId ? '<span class="badge">🎯 мақсад</span>' : ''}
      </div>
      ${t.notes ? `<div class="meta">${esc(t.notes)}</div>` : ''}
    </div>
    <button class="icon" data-act="edit" data-id="${t.id}" aria-label="Таҳрирлаш">✎</button>
  </li>`;
}

/* ---------- views ---------- */
const view = document.getElementById('view');

function render() {
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === UI.tab));
  ({ tasks: renderTasks, calendar: renderCalendar, roadmap: renderRoadmap, report: renderReport })[UI.tab]();
}

/* Tasks */
const FILTERS = [['all', 'Ҳаммаси'], ['today', 'Бугун'], ['late', 'Кечиккан'], ['soon', 'Келгуси'], ['done', 'Бажарилган']];
function filtered() {
  const td = today();
  const q = UI.q.trim().toLowerCase();
  return sortTasks(S.tasks.filter(t => {
    if (q && !(t.title + ' ' + (t.notes || '')).toLowerCase().includes(q)) return false;
    switch (UI.filter) {
      case 'today': return !t.done && t.date === td;
      case 'late': return !t.done && t.date && t.date < td;
      case 'soon': return !t.done && t.date && t.date > td;
      case 'done': return t.done;
      default: return true;
    }
  }));
}
function renderTasks() {
  const list = filtered();
  const open = S.tasks.filter(pending).length;
  const late = S.tasks.filter(t => !t.done && t.date && t.date < today()).length;
  view.innerHTML = `
  <section class="card">
    <form class="quick" id="quick">
      <input name="title" placeholder="Янги вазифа..." required maxlength="200" autocomplete="off" aria-label="Вазифа номи">
      <input type="date" name="date" value="${today()}" aria-label="Муддат">
      <button class="primary" type="submit">Қўшиш</button>
    </form>
    <div class="chips" role="group" aria-label="Фильтр">
      ${FILTERS.map(([k, n]) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${UI.filter === k}">${n}</button>`).join('')}
    </div>
    <input class="search" type="search" id="q" placeholder="Қидириш..." value="${esc(UI.q)}" aria-label="Қидириш">
    <p class="muted small">Очиқ: ${open} · Кечиккан: ${late}</p>
    ${list.length ? `<ul class="list">${list.map(taskHtml).join('')}</ul>` : '<p class="empty">Бу ерда ҳозирча вазифа йўқ.</p>'}
    ${S.tasks.some(t => t.done) ? '<button class="link small" data-act="clear-done">Бажарилганларни тозалаш</button>' : ''}
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
function stats(from, to) {
  const days = diffDays(from, to) + 1;
  // A task due today that is still open is not late yet, so it is left out of the score.
  const due = S.tasks.filter(t => t.date && t.date >= from && t.date <= to && (t.done || t.date < today()));
  const done = due.filter(t => t.done);
  const onTime = done.filter(t => t.doneAt && t.doneAt <= t.date);
  const doneAll = S.tasks.filter(t => t.done && t.doneAt && t.doneAt >= from && t.doneAt <= to);
  const activeDays = new Set(doneAll.map(t => t.doneAt)).size;
  const cr = due.length ? done.length / due.length : 0;
  const ot = done.length ? onTime.length / done.length : 0;
  const act = Math.min(1, activeDays / (days * 0.7));
  const score = due.length ? Math.round(100 * (0.6 * cr + 0.25 * ot + 0.15 * act)) : null;
  return { days, due, done, onTime, doneAll, activeDays, cr, ot, act, score, open: due.filter(pending) };
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
function insights(cur, prev, from, to) {
  const tips = [];
  if (cur.due.length === 0) {
    tips.push('Бу даврда муддатли вазифа йўқ. Баҳо бериш учун вазифаларга сана қўйинг.');
    return tips;
  }
  if (prev.score !== null) {
    const diff = cur.score - prev.score;
    tips.push(diff > 0 ? `Олдинги даврга нисбатан +${diff} балл яхшиланиш. Давом этинг.` :
      diff < 0 ? `Олдинги даврга нисбатан ${diff} балл пасайиш. Сабабини ўйлаб кўринг: вазифалар кўпми ёки вақт камми?` :
        'Натижа олдинги давр билан бир хил.');
  }
  if (cur.open.length) tips.push(`Бажарилмаган ва муддати ўтган иш: ${cur.open.length} та. Уларни бугунга кўчиринг ёки ҳақиқатан керак эмасини ўчиринг.`);
  if (cur.done.length && cur.ot < 0.7) tips.push(`Бажарилганларнинг фақат ${Math.round(cur.ot * 100)}% вақтида битган. Муддатларни реалистикроқ қўйинг (тахминий вақтга 20% қўшиб).`);
  const byWd = Array(7).fill(0);
  cur.doneAll.forEach(t => byWd[wdIndex(t.doneAt)]++);
  const max = Math.max(...byWd);
  if (max > 1) tips.push(`Энг унумли кунингиз: ${WD_FULL[byWd.indexOf(max)]}. Муҳим ишларни шу кунга қўйинг.`);
  const cats = catStats(cur.due).filter(c => c.total >= 2).sort((a, b) => a.rate - b.rate);
  if (cats.length && cats[0].rate < 0.5) tips.push(`«${cats[0].cat}» тоифасида кўп иш қолиб кетяпти (${Math.round(cats[0].rate * 100)}%). Бу йўналишга алоҳида вақт ажратинг.`);
  const s = streak();
  if (s >= 3) tips.push(`Узлуксиз ${s} кун вазифа бажаряпсиз. Бу яхши одат!`);
  else if (cur.activeDays < cur.days * 0.4) tips.push('Бажариш кунлари кам. Ҳар куни битта кичик иш қилишга ҳаракат қилинг, узлуксизлик муҳим.');
  const td = today();
  const upcoming = S.tasks.filter(t => !t.done && t.date && t.date > td && t.date <= addDays(td, 7)).length;
  if (!upcoming) tips.push('Келгуси 7 кунга режа йўқ. «Режа» бўлимида мақсад қўйиб, йўл харитаси тузинг.');
  if (cur.score >= 90 && !cur.open.length) tips.push('Ажойиб давр! Энди мураккаброқ мақсад қўйиш мумкин.');
  return tips;
}
function catStats(list) {
  const map = {};
  list.forEach(t => { (map[t.cat] ||= { cat: t.cat, total: 0, done: 0 }); map[t.cat].total++; if (t.done) map[t.cat].done++; });
  return Object.values(map).map(c => ({ ...c, rate: c.done / c.total })).sort((a, b) => b.total - a.total);
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
  const tips = insights(cur, prev, from, to);
  const lateList = sortTasks(cur.open);

  view.innerHTML = `
  <div class="seg" role="group" aria-label="Давр">
    <button data-act="period" data-n="7" aria-pressed="${UI.period === 7}">7 кун</button>
    <button data-act="period" data-n="30" aria-pressed="${UI.period === 30}">30 кун</button>
  </div>
  <section class="card">
    <h2>Умумий баҳо · ${fmtShort(from)} – ${fmtShort(to)}</h2>
    <div class="score">
      <div class="ring" style="--p:${cur.score ?? 0};--c:${g.c}"><div><div><b>${cur.score ?? '—'}</b><br><span>100 дан</span></div></div></div>
      <div>
        <div style="font-size:1.4rem;font-weight:700;color:${g.c}">${g.l} · ${g.t}</div>
        ${prev.score !== null && cur.score !== null ? `<div class="muted small">Олдинги давр: ${prev.score}</div>` : ''}
        <div class="formula">Баҳо = 60% бажарилган улуши + 25% вақтида бажарилиши + 15% фаол кунлар. Фақат шу даврда муддати бор вазифалар ҳисобга олинади.</div>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><b>${cur.done.length}/${cur.due.length}</b><span>бажарилди</span></div>
      <div class="kpi"><b>${Math.round(cur.ot * 100)}%</b><span>вақтида бажарилган</span></div>
      <div class="kpi"><b>${cur.open.length}</b><span>кечиккан</span></div>
      <div class="kpi"><b>${cur.activeDays}/${cur.days}</b><span>фаол кун</span></div>
      <div class="kpi"><b>${streak()}</b><span>кун узлуксиз</span></div>
    </div>
  </section>
  <section class="card">
    <h2>Кунлар бўйича бажарилган ишлар</h2>
    <div class="bars">${perDay.map(x => `<div class="bar ${x.n ? '' : 'zero'}" style="height:${(x.n / maxN) * 100}%" title="${fmtShort(x.d)}: ${x.n}"></div>`).join('')}</div>
    <div class="axis">${perDay.map((x, i) => `<span>${UI.period === 7 || i % 5 === 0 ? fmtShort(x.d) : ''}</span>`).join('')}</div>
  </section>
  <div class="rm-grid">
    <section class="card">
      <h2>Тоифалар бўйича</h2>
      ${cats.length ? cats.map(c => `<div class="rowbar"><span>${esc(c.cat)}</span><div class="track"><i style="width:${c.rate * 100}%"></i></div><span>${c.done}/${c.total}</span></div>`).join('') : '<p class="muted">Маълумот йўқ.</p>'}
    </section>
    <section class="card">
      <h2>Хулоса ва тавсиялар</h2>
      <ul class="tips">${tips.length ? tips.map(t => `<li>${esc(t)}</li>`).join('') : '<li>Ҳозирча тавсия йўқ.</li>'}</ul>
    </section>
  </div>
  ${lateList.length ? `<section class="card"><h2>Кечиккан ишлар</h2><ul class="list">${lateList.map(taskHtml).join('')}</ul></section>` : ''}`;
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
  const goals = S.goals.map(g => {
    const ts = S.tasks.filter(t => t.goalId === g.id);
    const done = ts.filter(t => t.done).length;
    return { ...g, total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
  });
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
      <section class="card">
        <h2>Мақсадларим</h2>
        ${goals.length ? goals.map(g => `<div class="goal">
          <b>${esc(g.title)}</b> <span class="muted small">· муддат ${fmtShort(g.deadline)}</span>
          <div class="progress"><i style="width:${g.pct}%"></i></div>
          <span class="small muted">${g.done}/${g.total} қадам · ${g.pct}%</span>
          <button class="link small" data-act="del-goal" data-id="${g.id}">ўчириш</button>
        </div>`).join('') : '<p class="muted">Ҳозирча мақсад йўқ.</p>'}
      </section>
    </section>
  </div>`;
  renderPreview();
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
  if (editingId) Object.assign(byId(editingId), data);
  else S.tasks.push({ id: uid(), ...data, done: false, doneAt: null, created: Date.now() });
  save(); dlg.close(); render();
});
document.getElementById('taskCancel').onclick = () => dlg.close();
document.getElementById('taskDel').onclick = () => {
  if (!confirm('Вазифа ўчирилсинми?')) return;
  S.tasks = S.tasks.filter(t => t.id !== editingId);
  save(); dlg.close(); render();
};

/* ---------- events ---------- */
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
      save(); render();
      return;
    }
    case 'edit': return openTask(id);
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
      S.tasks.forEach(t => { if (!t.done && t.date && t.date < td) t.date = td; });
      save(); toast('Кечиккан ишлар бугунга кўчирилди'); return render();
    }
    case 'period': UI.period = Number(el.dataset.n); return render();
    case 'apply-plan': return applyPlan();
    case 'del-goal':
      if (confirm('Мақсад ва унинг бажарилмаган қадамлари ўчирилсинми? Бажарилганлари ҳисобот учун қолади.')) {
        S.goals = S.goals.filter(g => g.id !== id);
        S.tasks = S.tasks.filter(t => t.goalId !== id || t.done);
        S.tasks.forEach(t => { if (t.goalId === id) t.goalId = null; });
        save(); renderRoadmap();
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

document.addEventListener('submit', e => {
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

render();
