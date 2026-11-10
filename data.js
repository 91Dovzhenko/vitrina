'use strict';
// Сборка: должна совпадать с <meta name="vitrina-build"> в index.html (см. bump-version.sh).
(window.VITRINA_BUILD = window.VITRINA_BUILD || {}).data = '2026-11-10.22';
// Слой данных: разбор листов и расчёты. Чистые функции, без DOM и без сети.

const RANGES = {
  skills: 'Навыки!A1:H',
  tasks: 'Задачи!A1:O',
  goals: 'Цели!A1:P',
  steps: 'Ступени!A1:M',
  measures: 'Замеры!A1:D',
  curve: 'Кривая уровней!A1:C',
  settings: 'Настройки!K1:L30',
  projects: 'Проекты!A1:Z',
  plan: 'План!A1:H',
};
// Листы, без которых витрина работает: нет листа — блок пишет спокойную строку.
const OPTIONAL = new Set(['projects', 'plan']);

// ---------- Общие помощники ----------
const EPS = 1e-6;

// Заголовок → ключ: «Опыт, ч» и «Опыт ч» дают одно и то же.
function normHeader(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, '');
}

// Строки листа → массив объектов по заголовкам. Пустые строки пропускаются.
// cols: { ключВКоде: 'Заголовок в таблице' }; лишние колонки не читаются.
function rowsByHeader(values, cols) {
  const rows = values || [];
  const head = (rows[0] || []).map(normHeader);
  const idx = {};
  for (const [key, title] of Object.entries(cols)) idx[key] = head.indexOf(normHeader(title));
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (!row.some((v) => v !== '' && v != null)) continue;
    const o = {};
    for (const key in idx) o[key] = idx[key] >= 0 ? row[idx[key]] : undefined;
    out.push(o);
  }
  return out;
}

function str(v) { return v == null ? '' : String(v).trim(); }

function num(v) {
  if (typeof v === 'number') return v;
  const s = str(v).replace(/\s| /g, '').replace('%', '').replace(',', '.');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Проценты: 0,56 (UNFORMATTED) или «56%» → 56.
function pct(v) {
  if (typeof v === 'number') return v <= 1 + EPS ? v * 100 : v;
  return num(v);
}

function bool(v) {
  if (typeof v === 'boolean') return v;
  const s = str(v).toLowerCase();
  return s === 'true' || s === 'да' || s === 'истина' || s === '1';
}

// Серийный номер Google (дни с 30.12.1899) → местная дата.
function serialToDate(serial) {
  const days = Math.floor(serial);
  const d = new Date(1899, 11, 30 + days);
  d.setMilliseconds(Math.round((serial - days) * 86400000));
  return d;
}

// Дата из ячейки: серийный номер или текст «09.11.2026» / «11.2026».
function toDate(v) {
  if (typeof v === 'number' && v > 0) return serialToDate(v);
  const s = str(v);
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[2], +m[1] - 1, 1);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function splitSkills(v) {
  return str(v).split(',').map((s) => s.trim()).filter(Boolean);
}

// ---------- Разбор листов ----------
function parseAll(valueRanges) {
  const byName = {};
  const missing = new Set();
  const keys = Object.keys(RANGES);
  keys.forEach((k, i) => {
    byName[k] = (valueRanges[i] && valueRanges[i].values) || [];
    if (valueRanges[i] && valueRanges[i].missing) missing.add(k);
  });

  const skills = rowsByHeader(byName.skills, {
    name: 'Навык', branch: 'Ветка', active: 'Активен', hours: 'Опыт ч',
    level: 'Уровень', toNext: 'До следующего ч', progress: 'Прогресс уровня %',
  })
    .filter((s) => str(s.name) && bool(s.active))
    .map((s) => ({
      name: str(s.name), branch: str(s.branch), hours: num(s.hours),
      level: Math.round(num(s.level)) || 1, toNext: num(s.toNext), progress: pct(s.progress),
    }));

  // Из задач берём только нужные колонки; название, проект и область не читаются.
  const tasks = rowsByHeader(byName.tasks, {
    closed: 'Дата закрытия', hours: 'Часы', skills: 'Навыки итог',
    nSkills: 'Число навыков', perSkill: 'Часов на навык', check: 'Проверить', loaded: 'Загружено',
    pid: 'project_id', // только чтобы сопоставить задачу с квестом
  })
    .map((t) => ({
      date: toDate(t.closed), hours: num(t.hours), skills: splitSkills(t.skills),
      perSkill: num(t.perSkill), check: str(t.check) !== '', pid: str(t.pid),
    }))
    .filter((t) => t.date);

  const goals = rowsByHeader(byName.goals, {
    id: 'goal_id', name: 'Название', metric: 'Метрика лестницы', unit: 'Ед.',
    current: 'Текущее значение', target: 'Целевое значение', criterion: 'Критерий достижения',
    status: 'Статус', progress: 'Прогресс %', avg3: 'Среднее за 3 мес', achieved: 'Достигнута по правилу',
    rule: 'Как считаем',
  })
    .filter((g) => str(g.id))
    .map((g) => ({
      id: str(g.id), name: str(g.name), metric: str(g.metric), unit: str(g.unit),
      current: num(g.current), target: num(g.target), criterion: str(g.criterion),
      status: str(g.status).toLowerCase(), progress: pct(g.progress),
      avg3: str(g.avg3) === '' ? null : num(g.avg3), achieved: str(g.achieved).toLowerCase() === 'да',
      // «Как считаем» (колонка P): «один раз» — по максимальному замеру, иначе — среднее за 3 мес.
      rule: str(g.rule).toLowerCase(),
    }));

  const steps = rowsByHeader(byName.steps, {
    id: 'step_id', goalId: 'goal_id', n: '№', name: 'Название', threshold: 'Порог', unit: 'Ед.',
    rule: 'Как считаем', criterion: 'Критерий', status: 'Статус', takenAt: 'Дата взятия',
    fact: 'Факт по правилу', canTake: 'Можно брать',
  })
    .filter((s) => str(s.id) && str(s.goalId))
    .map((s) => ({
      id: str(s.id), goalId: str(s.goalId), n: Math.round(num(s.n)), name: str(s.name),
      threshold: num(s.threshold), unit: str(s.unit), rule: str(s.rule).toLowerCase(),
      criterion: str(s.criterion), taken: str(s.status).toLowerCase() === 'взята',
      takenAt: toDate(s.takenAt), fact: str(s.fact) === '' ? null : num(s.fact),
      canTake: str(s.canTake).toLowerCase() === 'да',
    }));

  const measures = rowsByHeader(byName.measures, { month: 'Месяц', goalId: 'goal_id', value: 'Значение' })
    .filter((m) => str(m.goalId))
    .map((m) => ({ month: toDate(m.month), goalId: str(m.goalId), value: num(m.value) }));

  const curve = rowsByHeader(byName.curve, { level: 'Уровень', per: 'Часов на уровень', acc: 'Накоплено к уровню ч' })
    .map((c) => ({ level: Math.round(num(c.level)), per: num(c.per), acc: num(c.acc) }))
    .filter((c) => c.level > 0)
    .sort((a, b) => a.level - b.level);

  const settings = new Map();
  for (const row of byName.settings) {
    const k = str(row[0]);
    if (k) settings.set(k, row[1]);
  }

  const quests = parseQuests(byName.projects);
  byName.projects = null; // остальные проекты не держим
  const plan = parsePlan(byName.plan, missing.has('plan'));

  return { skills, tasks, goals, steps, measures, curve, settings, quests, plan };
}

// ---------- Сайд-квесты (лист «Проекты», 09_ТЗ, раздел 3) ----------
// Квест — проект с «Квест» = TRUE; остальные строки отбрасываем сразу.
// Одного навыка у квеста нет: навыки и их часы считаются в compute() из «Задач» по project_id.
function parseQuests(values) {
  return rowsByHeader(values, {
    id: 'things_id', name: 'Название', status: 'Статус в Things', quest: 'Квест',
    est: 'Оценка квеста ч', hours: 'Часы квеста', closed: 'Дата закрытия',
  })
    .filter((q) => bool(q.quest))
    .map((q) => ({
      id: str(q.id) || str(q.name), name: str(q.name), status: str(q.status).toLowerCase(),
      est: str(q.est) === '' ? null : num(q.est), hours: num(q.hours),
      closedAt: toDate(q.closed),
    }))
    .filter((q) => q.name);
}

// Навыки квеста: закрытые задачи с project_id = things_id квеста; каждому навыку из
// «Навыки итог» — «Часов на навык». По убыванию часов. Только навыки из листа «Навыки».
function questSkills(q, tasks, activeNames) {
  if (Array.isArray(q.skillsPreset)) return q.skillsPreset; // демо
  const m = new Map();
  for (const t of tasks) {
    if (!t.pid || t.pid !== q.id) continue;
    for (const s of t.skills) if (activeNames.has(s) && t.perSkill > EPS) m.set(s, (m.get(s) || 0) + t.perSkill);
  }
  return [...m].map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'ru'));
}

// ---------- План на сегодня (лист «План», 09_ТЗ, раздел 4) ----------
function toInstant(v) {
  if (typeof v === 'number' && v > 0) return serialToDate(v);
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? toDate(s) : d;
}

function parsePlan(values, missing) {
  const rows = values || [];
  if (missing || !rows.length) return { missing: true };
  // Шапка: «Срез» и «Дата плана» по тексту в колонке A; таблица — от строки с «Область».
  let cut = null, day = null, headAt = -1;
  rows.forEach((r, i) => {
    const k = normHeader(r && r[0]);
    if (k === 'срез') cut = toInstant(r[1]);
    else if (k === 'датаплана') day = toDate(r[1]) || toInstant(r[1]);
    else if (k === 'область' && headAt < 0) headAt = i;
  });
  if (headAt < 0 && !cut) return { missing: true };
  const items = headAt < 0 ? [] : rowsByHeader(rows.slice(headAt), {
    area: 'Область', project: 'Проект', pid: 'project_id', tasks: 'Задач', doneTasks: 'Выполнено задач',
    planned: 'Запланировано ч', done: 'Выполнено ч', noEst: 'Без оценки',
  }).map((r) => ({
    area: str(r.area) || '—', project: str(r.project) || str(r.area) || '—', pid: str(r.pid),
    tasks: Math.round(num(r.tasks)), doneTasks: Math.round(num(r.doneTasks)),
    planned: num(r.planned), done: num(r.done), noEst: Math.round(num(r.noEst)),
  }));
  // Области — в порядке первого появления в листе, проекты внутри — тоже.
  const areas = [];
  const byArea = new Map();
  for (const it of items) {
    let a = byArea.get(it.area);
    if (!a) { a = { name: it.area, planned: 0, done: 0, tasks: 0, doneTasks: 0, projects: [] }; byArea.set(it.area, a); areas.push(a); }
    a.planned += it.planned; a.done += it.done; a.tasks += it.tasks; a.doneTasks += it.doneTasks;
    a.projects.push(it);
  }
  const sum = (k) => items.reduce((x, it) => x + it[k], 0);
  return {
    missing: false, cut, day, areas, empty: items.length === 0,
    planned: sum('planned'), done: sum('done'), tasks: sum('tasks'), doneTasks: sum('doneTasks'), noEst: sum('noEst'),
  };
}

// Свежесть среза от его возраста: fresh — серое время; stale — сегодня, старше часа; old — не сегодня.
function planFreshness(cut, now) {
  if (!cut) return { kind: 'fresh', label: 'данные из Things, время среза неизвестно' };
  const hm = `${cut.getHours()}:${String(cut.getMinutes()).padStart(2, '0')}`;
  const hm2 = hm.padStart(5, '0');
  const age = now - cut;
  const sameDay = dayKey(cut) === dayKey(now);
  if (sameDay && age < 3600000) return { kind: 'fresh', label: `данные из Things на ${hm2}` };
  if (sameDay) return { kind: 'stale', label: `данные на ${hm2} · ${Math.floor(age / 3600000)} ч назад` };
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(cut) === dayKey(y)) return { kind: 'old', label: `данные на вчера, ${hm2}` };
  const MON = ['янв', 'февр', 'марта', 'апр', 'мая', 'июня', 'июля', 'авг', 'сент', 'окт', 'нояб', 'дек'];
  const yr = cut.getFullYear() !== now.getFullYear() ? ` ${cut.getFullYear()}` : '';
  return { kind: 'old', label: `данные на ${cut.getDate()} ${MON[cut.getMonth()]}.${yr}, ${hm2}` };
}

// ---------- Расчёты (раздел 6 ТЗ) ----------

// Наибольший уровень, у которого «Накоплено к уровню» ≤ часам.
function levelForHours(curve, hours) {
  let lvl = curve.length ? curve[0].level : 1;
  for (const c of curve) if (c.acc <= hours + EPS) lvl = c.level; else break;
  return lvl;
}

// Уровень, прогресс и остаток до следующего по часам (для ветки не из таблицы).
function levelInfo(curve, hours) {
  const level = levelForHours(curve, hours);
  const cur = curve.find((c) => c.level === level);
  const next = curve.find((c) => c.level === level + 1);
  if (!cur || !next) return { level, progress: 100, toNext: 0 };
  const span = next.acc - cur.acc;
  return { level, progress: span > 0 ? ((hours - cur.acc) / span) * 100 : 0, toNext: Math.max(0, next.acc - hours) };
}

function startOfWeek(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // пн = 0
  d.setDate(d.getDate() - dow);
  return d;
}

function startOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Часы по навыку за период [from, to). from = null — с начала.
function hoursBySkill(tasks, from, to) {
  const m = new Map();
  for (const t of tasks) {
    if (from && t.date < from) continue;
    if (to && t.date >= to) continue;
    for (const s of t.skills) m.set(s, (m.get(s) || 0) + t.perSkill);
  }
  return m;
}

function hoursByBranch(skills, bySkill) {
  const m = new Map();
  for (const s of skills) m.set(s.branch, (m.get(s.branch) || 0) + (bySkill.get(s.name) || 0));
  return m;
}

function sumMap(m) { let x = 0; for (const v of m.values()) x += v; return x; }

function compute(data, now = new Date(), focusOverride = null) {
  const { skills, tasks, goals, steps, measures, curve, settings } = data;
  const weekFrom = startOfWeek(now);
  const monthFrom = startOfMonth(now);
  const activeNames = new Set(skills.map((s) => s.name));
  const branches = [...new Set(skills.map((s) => s.branch))];

  // 1–3. Часы по навыку и ветке: неделя, месяц, всего.
  const week = hoursBySkill(tasks, weekFrom, null);
  const month = hoursBySkill(tasks, monthFrom, null);
  const total = hoursBySkill(tasks, null, null);
  const keep = (m) => new Map([...m].filter(([k]) => activeNames.has(k)));
  const period = {
    week: { from: weekFrom, bySkill: keep(week), byBranch: hoursByBranch(skills, week) },
    month: { from: monthFrom, bySkill: keep(month), byBranch: hoursByBranch(skills, month) },
    total: { bySkill: keep(total), byBranch: hoursByBranch(skills, total) },
  };
  for (const p of Object.values(period)) p.sum = sumMap(p.byBranch);

  // Общий уровень: ветка фокуса — из «Настроек», другие — по кривой (п. 7).
  const tableFocus = str(settings.get('Ветка фокуса')) || branches[0] || '';
  const focusBranch = focusOverride && branches.includes(focusOverride) ? focusOverride : tableFocus;
  const branchHoursFromSkills = new Map();
  for (const s of skills) branchHoursFromSkills.set(s.branch, (branchHoursFromSkills.get(s.branch) || 0) + s.hours);
  const overall = {};
  for (const b of branches) {
    const hours = branchHoursFromSkills.get(b) || 0;
    const calc = levelInfo(curve, hours);
    overall[b] = { hours, ...calc, source: 'кривая' };
  }
  if (tableFocus && settings.has('Общий уровень')) {
    overall[tableFocus] = {
      ...(overall[tableFocus] || {}),
      hours: num(settings.get('Часы ветки фокуса')),
      level: Math.round(num(settings.get('Общий уровень'))),
      progress: pct(settings.get('Прогресс общего уровня')),
      source: 'таблица',
    };
  }

  // 5. Уровней за месяц.
  const grownSkills = [];
  let levelsThisMonth = 0;
  for (const s of skills) {
    const before = levelForHours(curve, s.hours - (month.get(s.name) || 0));
    const d = s.level - before;
    if (d > 0) { levelsThisMonth += d; grownSkills.push({ name: s.name, from: before, to: s.level }); }
  }
  let overallMonth = null;
  if (overall[focusBranch]) {
    const ofHours = overall[focusBranch].hours;
    const before = levelForHours(curve, ofHours - (period.month.byBranch.get(focusBranch) || 0));
    const d = overall[focusBranch].level - before;
    if (d > 0) { levelsThisMonth += d; overallMonth = { branch: focusBranch, from: before, to: overall[focusBranch].level }; }
  }

  // 6. Растущий навык недели.
  const branchOf = new Map(skills.map((s) => [s.name, s.branch]));
  const weekRank = [...period.week.bySkill].filter(([, h]) => h > EPS).sort((a, b) =>
    b[1] - a[1]
    || (branchOf.get(b[0]) === focusBranch) - (branchOf.get(a[0]) === focusBranch)
    || a[0].localeCompare(b[0], 'ru'));
  const growingSkill = weekRank.length ? { name: weekRank[0][0], hours: weekRank[0][1] } : null;

  // 8. Лента событий.
  const quests = (data.quests || []).map((q) => ({ ...q, skills: questSkills(q, tasks, activeNames) }));
  const feed = buildFeed(tasks, steps, curve, activeNames, quests);

  // Сайд-квесты: активные — incomplete, в порядке листа. Метка на узле — у каждого навыка,
  // куда активный квест уже дал часы; строка подсказки — с часами этого навыка из квеста.
  const activeQuests = quests.filter((q) => q.status === 'incomplete');
  const questsBySkill = new Map();
  for (const q of activeQuests) {
    for (const sk of q.skills) {
      if (!questsBySkill.has(sk.name)) questsBySkill.set(sk.name, []);
      questsBySkill.get(sk.name).push({ quest: q, hours: sk.hours });
    }
  }
  const plan = data.plan || { missing: true };
  const planFresh = plan.missing ? null : planFreshness(plan.cut, now);

  // 9. «Проверить».
  const checkCount = tasks.filter((t) => t.check).length;

  // 10. Цели и лестницы.
  const activeGoals = goals.filter((g) => g.status === 'активна').map((g) => goalLadder(g, steps, measures));
  const firstTask = tasks.reduce((m, t) => (!m || t.date < m ? t.date : m), null);
  const stepsTakenMonth = steps.filter((s) => s.taken && s.takenAt && s.takenAt >= monthFrom).length;

  return {
    now, curve, focusBranch, tableFocus, branches, skills, period, overall,
    levelsThisMonth, grownSkills, overallMonth, growingSkill, feed, checkCount,
    activeGoals, stepsTaken: steps.filter((s) => s.taken).length, stepsTakenMonth,
    lastUpdate: settings.get('Последнее обновление'),
    firstTask,
    takenStepIds: steps.filter((s) => s.taken).map((s) => s.id),
    stepsById: new Map(steps.map((s) => [s.id, s])),
    quests, activeQuests, questsBySkill,
    completedQuests: quests.filter((q) => q.status === 'completed'),
    plan, planFresh,
  };
}

function buildFeed(tasks, steps, curve, activeNames, quests = []) {
  const events = [];
  const sorted = [...tasks].sort((a, b) => a.date - b.date);

  // «+N ч в {Навык}» — по дню и навыку.
  const byDaySkill = new Map();
  for (const t of sorted) {
    for (const s of t.skills) {
      if (!activeNames.has(s) || t.perSkill <= EPS) continue;
      const k = dayKey(t.date) + '|' + s;
      const e = byDaySkill.get(k) || { type: 'hours', date: t.date, skill: s, hours: 0, order: 0 };
      e.hours += t.perSkill;
      byDaySkill.set(k, e);
    }
  }
  events.push(...byDaySkill.values());

  // «{Навык} → уровень N» — проигрыш задач по датам.
  const acc = new Map();
  for (const t of sorted) {
    for (const s of t.skills) {
      if (!activeNames.has(s)) continue;
      const before = acc.get(s) || 0;
      const after = before + t.perSkill;
      acc.set(s, after);
      const l0 = levelForHours(curve, before);
      const l1 = levelForHours(curve, after);
      for (let l = l0 + 1; l <= l1; l++) events.push({ type: 'level', date: t.date, skill: s, level: l, order: 1 });
    }
  }

  // «Квест пройден: <название> → <навык>» — по дате закрытия проекта.
  for (const q of quests) {
    if (q.status === 'completed' && q.closedAt) events.push({ type: 'quest', date: q.closedAt, name: q.name, order: 3 });
  }

  // «Взята ступень „…“».
  for (const s of steps) {
    if (s.taken && s.takenAt) events.push({ type: 'step', date: s.takenAt, name: s.name, goalId: s.goalId, order: 2 });
  }

  // Новые сверху; в пределах дня — ступень, уровень, часы.
  events.sort((a, b) => dayKey(b.date).localeCompare(dayKey(a.date)) || b.order - a.order);
  return events.slice(0, 10);
}

function goalLadder(goal, steps, measures) {
  const own = steps.filter((s) => s.goalId === goal.id).sort((a, b) => a.n - b.n);
  const current = own.find((s) => !s.taken) || null;
  const own3 = measures.filter((m) => m.goalId === goal.id && m.month).sort((a, b) => a.month - b.month);
  const nMeasures = own3.length;
  const needs3 = !!current && current.rule.includes('3 мес') && nMeasures < 3;
  // Факт цели по её правилу из листа «Цели».
  const oneTime = String(goal.rule || '').includes('один раз');
  let goalFact = null;
  if (oneTime) goalFact = nMeasures ? Math.max(...own3.map((m) => m.value)) : null;
  else if (nMeasures >= 3) goalFact = own3.slice(-3).reduce((a, m) => a + m.value, 0) / 3;
  // Текущая ступень без «Факта по правилу» берёт факт цели.
  const cur = current && current.fact == null && goalFact != null ? { ...current, fact: goalFact } : current;
  const steps2 = cur === current ? own : own.map((s) => (s === current ? cur : s));
  return {
    ...goal,
    goalRule: oneTime ? 'один раз' : 'среднее за 3 мес',
    goalFact,
    steps: steps2,
    taken: own.filter((s) => s.taken),
    current: cur,
    future: cur ? steps2.filter((s) => !s.taken && s !== cur) : [],
    stepN: current ? current.n : own.length,
    stepM: own.length,
    nMeasures,
    measures: own3,
    needs3,
  };
}

// ---------- «Что изменилось с прошлого захода» (раздел 7 ТЗ) ----------
// Снимок: только числа и названия навыков, без задач.
function makeSnapshot(v) {
  const skills = {};
  for (const s of v.skills) skills[s.name] = [Math.round(s.hours * 100) / 100, s.level];
  const branches = {};
  for (const b of v.branches) branches[b] = (v.overall[b] || {}).level || 1;
  return { at: Date.now(), skills, branches, steps: [...v.takenStepIds], quests: (v.completedQuests || []).map((q) => q.id) };
}

function diffSnapshot(prev, v) {
  if (!prev || typeof prev !== 'object' || !prev.skills) return { first: true, any: false };
  const bySkill = new Map();
  let hours = 0;
  for (const s of v.skills) {
    const old = prev.skills[s.name];
    const oldH = old ? Number(old[0]) || 0 : 0;
    const oldL = old ? Number(old[1]) || 1 : 1;
    const dh = s.hours - oldH;
    const up = s.level > oldL;
    if (dh > 0.004 || up) {
      bySkill.set(s.name, { hours: Math.max(0, dh), levelUp: up, fromLevel: oldL, toLevel: s.level });
      if (dh > 0) hours += dh;
    }
  }
  const branchUps = v.branches
    .filter((b) => prev.branches && prev.branches[b] != null && (v.overall[b] || {}).level > prev.branches[b])
    .map((b) => ({ branch: b, level: v.overall[b].level }));
  const had = new Set(prev.steps || []);
  const newSteps = v.takenStepIds.filter((id) => !had.has(id)).map((id) => v.stepsById.get(id)).filter(Boolean);
  // Пройденный квест: закрыт в день прошлого захода или позже и ещё не был показан пройденным.
  const seen = new Set(prev.quests || []);
  const prevDay = prev.at ? dayKey(new Date(prev.at)) : '';
  const doneQuests = (v.completedQuests || []).filter((q) => q.closedAt && dayKey(q.closedAt) >= prevDay && !seen.has(q.id));
  const any = bySkill.size > 0 || branchUps.length > 0 || newSteps.length > 0 || doneQuests.length > 0;
  return { first: false, any, at: prev.at, hours, bySkill, branchUps, newSteps, doneQuests };
}

window.VitrinaData = { RANGES, OPTIONAL, planFreshness, parseAll, compute, makeSnapshot, diffSnapshot, levelForHours, levelInfo, toDate, serialToDate, normHeader };
