'use strict';

// Не секретны: ID клиента OAuth и ID таблицы.
const CLIENT_ID = '691644833271-fdg5938hbajg5vvbl0ajq9d37bdl8l94.apps.googleusercontent.com';
const SHEET_ID = '1jnd_dLwVKeCmVtFPlNCCBnxtE29wPWGz3NbwIwd8Br8';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const API = 'https://sheets.googleapis.com/v4/spreadsheets/';

// Токен живёт только в памяти страницы.
const auth = { token: null, expiresAt: 0, client: null, pending: null };

const $ = (id) => document.getElementById(id);

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
    res = await fetch(`${API}${SHEET_ID}/values:batchGet?${qs}`, {
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

// Пары «Параметр → Значение» из Настройки!K:L, поиск по тексту в K.
function readSettings(values) {
  const map = new Map();
  for (const row of values || []) {
    const key = row[0] == null ? '' : String(row[0]).trim();
    if (key) map.set(key, row[1]);
  }
  return map;
}

// ---------- Форматирование ----------
const MONTHS = ['янв', 'февр', 'марта', 'апр', 'мая', 'июня', 'июля', 'авг', 'сент', 'окт', 'нояб', 'дек'];
const NBSP = ' ';

// Серийный номер Google (дни с 30.12.1899) → местная дата.
function serialToDate(serial) {
  const days = Math.floor(serial);
  const ms = Math.round((serial - days) * 86400000);
  const d = new Date(1899, 11, 30 + days);
  d.setMilliseconds(ms);
  return d;
}

function formatDateTime(v) {
  if (typeof v === 'number') {
    const d = serialToDate(v);
    const hasTime = v % 1 !== 0;
    let s = `${d.getDate()}${NBSP}${MONTHS[d.getMonth()]}`;
    if (d.getFullYear() !== new Date().getFullYear()) s += `${NBSP}${d.getFullYear()}`;
    if (hasTime) s += `, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    return s;
  }
  return v == null || v === '' ? '—' : String(v);
}

// ---------- Экран ----------
function showLogin(message) {
  $('screen-data').hidden = true;
  $('actions').hidden = true;
  $('screen-login').hidden = false;
  $('message').textContent = message || '';
  $('login').disabled = !auth.client;
}

function showData(settings) {
  const updated = formatDateTime(settings.get('Последнее обновление'));
  $('last-update').textContent = updated;
  $('updated').textContent = `Обновлено ${updated}`;
  const now = new Date();
  $('data-message').textContent = `Прочитано из таблицы в ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  $('screen-login').hidden = true;
  $('screen-data').hidden = false;
  $('actions').hidden = false;
}

async function load() {
  const data = await sheetsBatchGet(['Настройки!K1:L30']);
  const settings = readSettings(data.valueRanges[0].values);
  showData(settings);
}

function handleError(err) {
  const kind = err instanceof AppError ? err.kind : 'googleDown';
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
  $('login').addEventListener('click', onLoginClick);
  $('refresh').addEventListener('click', onRefreshClick);
  $('logout').addEventListener('click', signOut);
  const ok = await waitForGis();
  showLogin(ok ? '' : MSG.gisFailed);
});
