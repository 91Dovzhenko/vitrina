'use strict';
// Сборка: должна совпадать с <meta name="vitrina-build"> в index.html (см. bump-version.sh).
(window.VITRINA_BUILD = window.VITRINA_BUILD || {}).demo = '2026-11-10.1';
// ?demo=normal|changes|levelup|goal|empty|goals — данные-примеры из design/Main.dc.html.
// Не из таблицы: работают без входа и только для проверки состояний.

(function () {
  const VARIANTS = ['normal', 'changes', 'levelup', 'goal', 'empty', 'goals',
    // Сайд-квесты и план на сегодня (холст, ряд QP_*).
    'questdone', 'noquests', 'manyquests', 'planmorning', 'planstale', 'planold', 'planempty'];
  const QP = new Set(VARIANTS.slice(6));
  // Состояния QP_* построены на «обычном дне».
  const baseOf = (v) => (QP.has(v) ? 'normal' : v);

  // Кривая уровней по правилу системы: база 3 ч, рост √N.
  function curve() {
    const out = [];
    let acc = 0;
    for (let l = 1; l <= 30; l++) {
      const per = 3 * Math.sqrt(l);
      out.push({ level: l, per, acc });
      acc += per;
    }
    return out;
  }

  const SKILLS = [
    ['Сценарий', 'Креатор'], ['Речь на камеру', 'Креатор'], ['Съёмка', 'Креатор'], ['Монтаж', 'Креатор'],
    ['Упаковка', 'Креатор'], ['Маркетинг', 'Креатор'], ['ИИ и агентные системы', 'Креатор'],
    ['Финансы', 'Профессия'], ['Внедрение ИИ', 'Профессия'], ['Продукт', 'Профессия'],
  ];

  const d = (day) => new Date(2026, 10, day);
  const task = (day, skill, hours) => ({ date: d(day), hours, skills: [skill], perSkill: hours, check: false });

  function tasksFor(v) {
    if (v === 'empty') return [];
    const base = [
      task(2, 'Речь на камеру', 2), task(2, 'Упаковка', 1.5),
      task(5, 'Финансы', 2), task(5, 'Внедрение ИИ', 0.75),
    ];
    if (v === 'changes' || v === 'levelup') base.push(task(7, 'Сценарий', 3.5), task(7, 'Продукт', 1));
    return base;
  }

  function nowFor(v) {
    // План: время «сейчас» подобрано под подписи среза на макетах.
    if (v === 'planmorning') return new Date(2026, 10, 5, 8, 50);
    if (v === 'planstale') return new Date(2026, 10, 5, 14, 10);
    if (v === 'planempty') return new Date(2026, 10, 5, 9, 20);
    if (QP.has(v)) return new Date(2026, 10, 5, 14, 30);
    if (v === 'empty') return new Date(2026, 10, 1, 10, 0);
    if (v === 'changes' || v === 'levelup' || v === 'goal') return new Date(2026, 10, 7, 21, 10);
    return new Date(2026, 10, 5, 15, 30);
  }

  function stepsFin(taken) {
    return [
      { n: 1, name: '1 000 ₽ с контента', threshold: 1000, unit: '₽', rule: 'один раз', fact: taken ? 1200 : 0, taken, takenAt: taken ? d(7) : null },
      { n: 2, name: '20 тыс. ₽/мес стабильно', threshold: 20000, unit: '₽/мес', rule: 'среднее за 3 мес', fact: 400 },
      { n: 3, name: '50 тыс. ₽/мес', threshold: 50000, unit: '₽/мес', rule: 'среднее за 3 мес' },
      { n: 4, name: '100 тыс. ₽/мес', threshold: 100000, unit: '₽/мес', rule: 'среднее за 3 мес' },
      { n: 5, name: '200 тыс. ₽/мес', threshold: 200000, unit: '₽/мес', rule: 'среднее за 3 мес' },
      { n: 6, name: '400 тыс. ₽/мес', threshold: 400000, unit: '₽/мес', rule: 'среднее за 3 мес' },
    ].map((s) => ({ id: 'DF' + s.n, goalId: 'DG1', taken: false, takenAt: null, fact: null, criterion: '', canTake: false, ...s }));
  }

  function goalsFor(v) {
    const goals = [{ id: 'DG1', name: '500 тыс. ₽/мес чистыми', criterion: '~80% от контента. Вершина лестницы — 400 тыс. ₽/мес с контента в среднем за 3 мес', status: 'активна' }];
    let steps = stepsFin(v === 'goal');
    const measures = [
      { month: new Date(2026, 9, 1), goalId: 'DG1', value: 0 },
      ...(v === 'goal' ? [{ month: new Date(2026, 10, 1), goalId: 'DG1', value: 1200 }] : []),
    ];
    if (v === 'goals') {
      goals[0].criterion = '~80% от контента. Лестница по доходу с контента до 400 тыс. ₽/мес в среднем за 3 мес';
      goals.push(
        { id: 'DG2', name: 'YouTube: 10 000 подписчиков', criterion: 'Ступень берётся, когда число подписчиков достигло порога', status: 'активна' },
        { id: 'DG3', name: 'Третья цель', criterion: 'Условная цель, чтобы проверить, как выглядят три карточки', status: 'активна' });
      const yt = [1000, 2000, 3000, 5000, 8000, 10000].map((t, i) => ({
        id: 'DY' + (i + 1), goalId: 'DG2', n: i + 1, name: `${fmtNum(t)} подписчиков`, threshold: t, unit: 'чел.', rule: 'один раз',
        criterion: '', taken: false, takenAt: null, fact: null, canTake: false,
      }));
      const third = [1, 2, 3, 4, 5].map((n) => ({
        id: 'DT' + n, goalId: 'DG3', n, name: n === 5 ? 'Ступень 5 — цель' : `Ступень ${n}`, threshold: n * 10, unit: '', rule: 'один раз',
        criterion: '', taken: false, takenAt: null, fact: null, canTake: false,
      }));
      steps = steps.concat(yt, third);
    }
    return {
      goals: goals.map((g) => ({ metric: '', unit: '', current: 0, target: 0, progress: 0, avg3: null, achieved: false, rule: 'среднее за 3 мес', ...g })),
      steps, measures,
    };
  }

  // Сайд-квесты — пример с макета (не из таблицы).
  function questsFor(v) {
    if (v === 'noquests' || v === 'empty') return [];
    const q = (id, name, skill, hours, est, extra) => ({ id, name, skill, hours, est, status: 'incomplete', closedAt: null, ...extra });
    const list = [
      q('DQ1', 'Библия стендапа', 'Сценарий', 4.5, 12),
      q('DQ2', 'Курс по обложкам', 'Упаковка', 2, 6),
      q('DQ3', '10 разборов заголовков', 'Упаковка', 3.5, 3),
    ];
    if (v === 'questdone') list[0] = { ...list[0], hours: 11, status: 'completed', closedAt: d(5) };
    if (v === 'manyquests') list.push(q('DQ4', 'Подборка разборов монтажа', 'Монтаж', 1.5, null));
    return list;
  }

  // План — пример с макета; названия проектов обобщены (реальные проекты в код не кладём).
  function planFor(v) {
    const now = nowFor(v);
    const at = (dd, hh, mm) => new Date(2026, 10, dd, hh, mm);
    const cut = v === 'planmorning' ? at(5, 8, 40) : v === 'planstale' ? at(5, 11, 5)
      : v === 'planold' ? at(4, 23, 40) : v === 'planempty' ? at(5, 9, 15)
      : QP.has(v) ? at(5, 14, 20) : new Date(now.getTime() - 10 * 60000);
    if (v === 'planempty') {
      return { missing: false, cut, day: now, areas: [], empty: true, planned: 0, done: 0, tasks: 0, doneTasks: 0, noEst: 0 };
    }
    const morning = v === 'planmorning';
    const P = (area, project, tasks, planned, doneTasks, done, noEst = 0) => ({
      area, project, tasks, planned, doneTasks: morning ? 0 : doneTasks, done: morning ? 0 : done, noEst: morning ? noEst : 0,
    });
    const items = [
      P('Проекты', 'Финансовая модель', 1, 2, 1, 2),
      P('Проекты', 'Клиент', 1, 0.75, 0, 0),
      P('Проекты', 'Сайт', 1, 0.25, 0, 0),
      P('Личное', 'Личное', 7, 2.75, 1, 0.5, 1),
      P('Личное', 'Система продуктивности', 1, 1.5, 0, 0),
      P('Блог', 'Блог: общее', 2, 0.75, 0, 0, 1),
      P('Обучение', 'Чтение', 1, 0.5, 0, 0),
    ];
    const areas = [];
    for (const it of items) {
      let a = areas.find((x) => x.name === it.area);
      if (!a) { a = { name: it.area, planned: 0, done: 0, tasks: 0, doneTasks: 0, projects: [] }; areas.push(a); }
      a.planned += it.planned; a.done += it.done; a.tasks += it.tasks; a.doneTasks += it.doneTasks; a.projects.push(it);
    }
    const sum = (k) => items.reduce((x, it) => x + it[k], 0);
    return { missing: false, cut, day: now, areas, empty: false, planned: sum('planned'), done: sum('done'), tasks: sum('tasks'), doneTasks: sum('doneTasks'), noEst: sum('noEst') };
  }

  function data(variant) {
    const v = baseOf(variant);
    const c = curve();
    const tasks = tasksFor(v);
    const hours = new Map();
    for (const t of tasks) hours.set(t.skills[0], (hours.get(t.skills[0]) || 0) + t.hours);
    const skills = SKILLS.map(([name, branch]) => {
      const hrs = hours.get(name) || 0;
      const info = window.VitrinaData.levelInfo(c, hrs);
      return { name, branch, hours: hrs, level: info.level, toNext: info.toNext, progress: info.progress };
    });
    const g = goalsFor(v);
    const settings = new Map([['Ветка фокуса', 'Креатор']]);
    return { skills, tasks, goals: g.goals, steps: g.steps, measures: g.measures, curve: c, settings, quests: questsFor(variant), plan: planFor(variant) };
  }

  // Изменения «с прошлого захода» — как на артбордах.
  function changes(v) {
    if (v === 'questdone') {
      return { first: false, any: true, hours: 0, bySkill: new Map(), branchUps: [], newSteps: [], doneQuests: [{ id: 'DQ1', name: 'Библия стендапа' }] };
    }
    v = baseOf(v);
    if (v === 'changes' || v === 'levelup') {
      return {
        first: false, any: true, hours: 4.5,
        bySkill: new Map([
          ['Сценарий', { hours: 3.5, levelUp: v === 'levelup', fromLevel: 1, toLevel: 2 }],
          ['Продукт', { hours: 1, levelUp: false, fromLevel: 1, toLevel: 1 }],
        ]),
        branchUps: [], newSteps: [],
      };
    }
    if (v === 'goal') {
      return { first: false, any: true, hours: 0, bySkill: new Map(), branchUps: [], newSteps: [{ id: 'DF1', name: '1 000 ₽ с контента' }] };
    }
    if (v === 'empty') return { first: true, any: false, demoText: 'Система запущена — ждём первых часов' };
    return { first: false, any: false };
  }

  const param = new URLSearchParams(location.search).get('demo');
  const variant = VARIANTS.includes(param) ? param : null;

  window.VitrinaDemo = { variant, data, changes, now: nowFor };
})();
