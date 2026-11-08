'use strict';

// Не секретны: ID клиента OAuth и ID рабочей таблицы.
const CLIENT_ID = '691644833271-fdg5938hbajg5vvbl0ajq9d37bdl8l94.apps.googleusercontent.com';
const SHEET_ID = '1jnd_dLwVKeCmVtFPlNCCBnxtE29wPWGz3NbwIwd8Br8';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const API = 'https://sheets.googleapis.com/v4/spreadsheets/';

// ?sheet=<ID> — читать тестовую таблицу вместо рабочей. Не запоминается.
const TEST_SHEET = (() => {
  const v = new URLSearchParams(location.search).get('sheet');
  return v && /^[A-Za-z0-9_-]{20,100}$/.test(v) && v !== SHEET_ID ? v : null;
})();
const ACTIVE_SHEET = TEST_SHEET || SHEET_ID;

// Токен живёт только в памяти страницы.
const auth = { token: null, expiresAt: 0, client: null, pending: null };

const $ = (id) => document.getElementById(id);
const D = window.VitrinaData;

// ---------- Сообщения (спокойным текстом) ----------
const MSG = {
  noAccess: 'Этот аккаунт не видит таблицу. Войдите аккаунтом, которому она открыта.',
  noNetwork: 'Нет сети. Проверьте подключение и попробуйте ещё раз.',
  googleDown: 'Google не ответил. Попробуйте чуть позже.',
  gisFailed: 'Не удалось загрузить вход Google. Проверьте сеть и обновите страницу.',
  cancelled: 'Вход не завершён. Можно попробовать ещё раз.',
};

class AppError extends Error {
  constructor(kind) { super(kind); this.kind = kind; }
}

// ---------- Вход через Google Identity Services ----------
function initAuth() {
  if (!window.google || !google.accounts || !google.accounts.oauth2) return false;
  auth.client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: onToken,
    error_callback: onTokenError,
  });
  return true;
}

function onToken(resp) {
  const p = auth.pending;
  auth.pending = null;
  if (resp.error || !resp.access_token) {
    p && p.reject(new AppError('cancelled'));
    return;
  }
  auth.token = resp.access_token;
  auth.expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60_000;
  p && p.resolve(auth.token);
}

function onTokenError() {
  const p = auth.pending;
  auth.pending = null;
  p && p.reject(new AppError('cancelled'));
}

// prompt: '' — тихий запрос (без окна, если доступ уже выдан).
function requestToken(prompt) {
  return new Promise((resolve, reject) => {
    if (!auth.client) { reject(new AppError('gisFailed')); return; }
    auth.pending = { resolve, reject };
    auth.client.requestAccessToken({ prompt });
  });
}

async function getToken() {
  if (auth.token && Date.now() < auth.expiresAt) return auth.token;
  auth.token = null;
  return requestToken('');
}

function signOut() {
  const t = auth.token;
  auth.token = null;
  auth.expiresAt = 0;
  state.view = null;
  $('report').replaceChildren();
  if (t && window.google) google.accounts.oauth2.revoke(t, () => {});
  showLogin('');
}

// ---------- Чтение таблицы ----------
async function sheetsBatchGet(ranges, retried = false) {
  const token = await getToken();
  const qs = new URLSearchParams({
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });
  ranges.forEach((r) => qs.append('ranges', r));

  let res;
  try {
    res = await fetch(`${API}${ACTIVE_SHEET}/values:batchGet?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AppError(navigator.onLine === false ? 'noNetwork' : 'googleDown');
  }

  if (res.status === 401 && !retried) {
    auth.token = null;
    return sheetsBatchGet(ranges, true);
  }
  if (res.status === 401) throw new AppError('cancelled');
  if (res.status === 403 || res.status === 404) throw new AppError('noAccess');
  if (!res.ok) throw new AppError('googleDown');
  return res.json();
}

// ---------- Форматирование (раздел 6.11) ----------
const MONTHS = ['янв', 'февр', 'марта', 'апр', 'мая', 'июня', 'июля', 'авг', 'сент', 'окт', 'нояб', 'дек'];
const NBSP = ' ';

function fmtNum(x, maxDec = 2) {
  const r = Math.round((Number(x) || 0) * 10 ** maxDec) / 10 ** maxDec;
  const [i, f] = Math.abs(r).toFixed(maxDec).replace(/0+$/, '').replace(/\.$/, '').split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (r < 0 ? '−' : '') + int + (f ? ',' + f : '');
}
const fmtH = (x) => fmtNum(x) + NBSP + 'ч';
const fmtPct = (x) => Math.round(Number(x) || 0) + '%';

function fmtDate(d) {
  if (!d) return '—';
  let s = `${d.getDate()}${NBSP}${MONTHS[d.getMonth()]}`;
  if (d.getFullYear() !== new Date().getFullYear()) s += `${NBSP}${d.getFullYear()}`;
  return s;
}

function fmtCell(v) {
  if (typeof v === 'number') return fmtDate(D.serialToDate(v));
  return v == null || v === '' ? '—' : String(v);
}

function fmtValue(v, unit) {
  if (v == null) return '—';
  return fmtNum(v) + (unit ? NBSP + unit : '');
}

// Разметка без innerHTML: h('div', {class: 'x'}, 'текст', child…)
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : String(k));
  return el;
}

// ---------- Экран ----------
const state = { view: null };

function showLogin(message) {
  $('screen-data').hidden = true;
  $('actions').hidden = true;
  $('screen-login').hidden = false;
  $('message').textContent = message || '';
  $('login').disabled = !auth.client;
}

function showData(view) {
  state.view = view;
  const updated = fmtCell(view.lastUpdate);
  $('updated').textContent = `Обновлено ${updated}`;
  const check = $('check-chip');
  check.hidden = view.checkCount === 0;
  check.textContent = `${view.checkCount} на проверку`;
  const now = new Date();
  $('data-message').textContent = `Прочитано из таблицы в ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  renderReport(view);
  $('screen-login').hidden = true;
  $('screen-data').hidden = false;
  $('actions').hidden = false;
}

async function load() {
  const keys = Object.keys(D.RANGES);
  const res = await sheetsBatchGet(keys.map((k) => D.RANGES[k]));
  const data = D.parseAll(res.valueRanges || []);
  showData(D.compute(data));
}

// ---------- Сверка (шаг 3): расчёты рядом с числами таблицы ----------
function table(head, rows) {
  return h('div', { class: 'table-wrap' },
    h('table', {},
      h('thead', {}, h('tr', {}, head.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}

// Отметка расхождения: «7,5 ч» или «7,5 ч ≠ 7 ч».
function same(a, b, fmt) {
  const ok = Math.abs((a || 0) - (b || 0)) < 0.005;
  return ok ? fmt(a) : h('span', { class: 'diff' }, `${fmt(a)} ≠ ${fmt(b)}`);
}

function section(title, ...kids) {
  return h('section', { class: 'card report-card' }, h('h2', {}, title), ...kids);
}

function renderReport(v) {
  const { period } = v;
  const weekTo = new Date(v.now);
  const weekLabel = `${fmtDate(period.week.from)} – ${fmtDate(weekTo)}`;

  // Навыки.
  const skillRows = v.skills.map((s) => [
    s.name,
    s.branch,
    String(s.level),
    same(D.levelForHours(v.curve, s.hours), s.level, String),
    fmtH(s.hours),
    same(period.total.bySkill.get(s.name) || 0, s.hours, fmtH),
    fmtH(period.month.bySkill.get(s.name) || 0),
    fmtH(period.week.bySkill.get(s.name) || 0),
    fmtPct(s.progress),
    fmtH(s.toNext),
  ]);

  // Ветки.
  const branchRows = v.branches.map((b) => {
    const o = v.overall[b] || {};
    return [
      b + (b === v.focusBranch ? ' (фокус)' : ''),
      fmtH(period.week.byBranch.get(b) || 0),
      fmtH(period.month.byBranch.get(b) || 0),
      fmtH(period.total.byBranch.get(b) || 0),
      `${o.level} (${fmtPct(o.progress)})`,
      o.source === 'таблица' ? `из «Настроек», ${fmtH(o.hours)}` : `по кривой, ${fmtH(o.hours)}`,
    ];
  });

  const grown = v.grownSkills.map((g) => `${g.name} → ${g.to}`);
  if (v.overallMonth) grown.unshift(`${v.overallMonth.branch} → ${v.overallMonth.to}`);

  const totals = [
    ['Неделя', weekLabel],
    ['Часы за неделю (сумма веток)', fmtH(period.week.sum)],
    ['Часы за месяц', fmtH(period.month.sum)],
    ['Часы всего', fmtH(period.total.sum)],
    ['Уровней за месяц', `${v.levelsThisMonth}${grown.length ? ' · ' + grown.join(', ') : ''}`],
    ['Растущий навык недели', v.growingSkill ? `${v.growingSkill.name}, +${fmtH(v.growingSkill.hours)} с понедельника` : 'за неделю часов нет'],
    ['На проверку', String(v.checkCount)],
    ['Ступеней взято (всего / в этом месяце)', `${v.stepsTaken} / ${v.stepsTakenMonth}`],
    ['Активных целей', `${v.activeGoals.length} → ${v.activeGoals.length > 1 ? 'карточки' : 'лестница сразу'}`],
  ];

  const goals = v.activeGoals.map((g) => h('div', { class: 'goal' },
    h('h3', {}, `${g.id} · ${g.name}`),
    h('p', { class: 'meta' }, `ступень ${g.stepN} из ${g.stepM} · сегменты: ${g.steps.map((s) => (s.taken ? '■' : '□')).join('')}`),
    h('ul', {},
      g.taken.map((s) => h('li', {}, `✓ ${s.n}. ${s.name} — взята ${fmtDate(s.takenAt)}`)),
      g.current && h('li', { class: 'current' },
        `→ ${g.current.n}. ${g.current.name}: `,
        g.needs3
          ? `нужно 3 месячных замера, есть ${g.nMeasures}`
          : `${fmtValue(g.current.fact, '')} из ${fmtValue(g.current.threshold, g.current.unit)}`,
        g.current.rule ? ` (${g.current.rule})` : ''),
      g.future.map((s) => h('li', { class: 'future' }, `${s.n}. ${s.name} — ${fmtValue(s.threshold, s.unit)}`)),
    ),
  ));

  const feed = v.feed.map((e) => {
    let text;
    if (e.type === 'hours') text = `+${fmtH(e.hours)} в ${e.skill}`;
    else if (e.type === 'level') text = `${e.skill} → уровень ${e.level}`;
    else text = `Взята ступень «${e.name}»`;
    return [fmtDate(e.date), text];
  });

  $('report').replaceChildren(
    section('Навыки',
      table(['Навык', 'Ветка', 'Уровень', 'Уровень по кривой', 'Опыт (табл.)', 'Часы по задачам', 'Месяц', 'Неделя', 'Прогресс', 'До след.'], skillRows)),
    section('Ветки и общий уровень',
      table(['Ветка', 'Неделя', 'Месяц', 'Всего', 'Общий уровень', 'Откуда'], branchRows)),
    section('Итоги', table(['Показатель', 'Значение'], totals)),
    section('Цели', goals.length ? goals : h('p', { class: 'meta' }, 'Активных целей нет')),
    section('Лента событий', feed.length ? table(['День', 'Событие'], feed) : h('p', { class: 'meta' }, 'Событий пока нет')),
  );
}

function handleError(err) {
  const kind = err instanceof AppError ? err.kind : 'googleDown';
  if (!(err instanceof AppError)) console.error(err && err.message);
  const text = MSG[kind] || MSG.googleDown;
  if (kind === 'noAccess' || kind === 'cancelled' || kind === 'gisFailed' || !auth.token) {
    // Нет действующего доступа — обратно к кнопке входа, данных не показываем.
    if (kind === 'noAccess' && auth.token && window.google) google.accounts.oauth2.revoke(auth.token, () => {});
    auth.token = null;
    showLogin(text);
  } else {
    // Сеть/Google временно — оставляем экран, пишем спокойно.
    $('data-message').textContent = text;
  }
}

async function onLoginClick() {
  $('login').disabled = true;
  $('message').textContent = '';
  try {
    await requestToken('select_account');
    await load();
  } catch (e) {
    handleError(e);
  } finally {
    $('login').disabled = !auth.client;
  }
}

async function onRefreshClick() {
  const btn = $('refresh');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Обновляю…';
  $('data-message').textContent = '';
  // Минимум 0,5 с, чтобы отклик был заметен даже при быстром ответе.
  const pause = new Promise((r) => setTimeout(r, 500));
  try { await Promise.all([load(), pause]); } catch (e) { handleError(e); } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// GIS грузится асинхронно — ждём его до 10 с.
function waitForGis(timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    (function tick() {
      if (initAuth()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 100);
    })();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  $('test-chip').hidden = !TEST_SHEET;
  $('login').addEventListener('click', onLoginClick);
  $('refresh').addEventListener('click', onRefreshClick);
  $('logout').addEventListener('click', signOut);
  const ok = await waitForGis();
  showLogin(ok ? '' : MSG.gisFailed);
});
