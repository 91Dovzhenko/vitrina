'use strict';
// Сборка: должна совпадать с <meta name="vitrina-build"> в index.html (см. bump-version.sh).
(window.VITRINA_BUILD = window.VITRINA_BUILD || {}).view = '2026-11-09.4';
// Экран «обычный день» по design/Main.dc.html. Только показ, без правки данных.

const SVGNS = 'http://www.w3.org/2000/svg';
const ACCENT = '#C5F25A';
const ACCENT_D = '#3D6A00';
const ACCENT_SOFT = 'rgba(197, 242, 90, 0.45)';
const RING_C = 175.93; // 2π·28

const ICONS = {
  pack: 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M8 8h8v8H8z',
  script: 'M4 20l1.2-4.8L15.5 4.9a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z M13.5 7l3.5 3.5 M4 20h7',
  speech: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M6 11a6 6 0 0 0 12 0 M12 17v4 M9 21h6',
  shoot: 'M4 7.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M15 10.5l6-3v9l-6-3',
  edit: 'M6 9a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M8.5 7.5L20 19 M8.5 16.5L20 5',
  mkt: 'M3 10v4h3l8 4.5V5.5L6 10z M17.5 9a4 4 0 0 1 0 6 M6.5 14l1.2 5h2.3l-1-4.6',
  ai: 'M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z M18.5 15l.9 2.1l2.1.9l-2.1.9l-.9 2.1l-.9-2.1l-2.1-.9l2.1-.9z',
  prod: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5l8-4.5 M12 12v9',
  aiimpl: 'M12 2.5v2.5 M12 19v2.5 M2.5 12H5 M19 12h2.5 M5.3 5.3l1.8 1.8 M16.9 16.9l1.8 1.8 M5.3 18.7l1.8-1.8 M16.9 7.1l1.8-1.8 M12 6.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z M12 9.5l.7 1.8l1.8.7l-1.8.7l-.7 1.8l-.7-1.8l-1.8-.7l1.8-.7z',
  fin: 'M4 20h16 M5 15.5l4.5-4.5l3.5 3.5L19.5 8 M15 8h4.5v4.5',
  up: 'M12 19V5 M6 11l6-6l6 6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M9 20h6 M10 17h4',
  flag: 'M5 21V4 M5 4h11l-2 4l2 4H5',
  chevron: 'M6 9l6 6l6-6',
  // Нейтральная иконка-узел для навыка без своей иконки.
  node: 'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z M12 3v5 M12 16v5 M3 12h5 M16 12h5',
};

// Навык → иконка. Новый навык без записи получает ICONS.node.
const SKILL_ICON = {
  'упаковка': 'pack', 'сценарий': 'script', 'речь на камеру': 'speech', 'съемка': 'shoot',
  'монтаж': 'edit', 'маркетинг': 'mkt', 'ии и агентные системы': 'ai', 'продукт': 'prod',
  'внедрение ии': 'aiimpl', 'финансы': 'fin',
};
function skillIcon(name) {
  const k = String(name).toLowerCase().replace(/ё/g, 'е').trim();
  return ICONS[SKILL_ICON[k]] || ICONS.node;
}

const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

// «в Монтаж», «во Внедрение ИИ».
function vo(name) {
  return /^[ВвФф][^аеёиоуыэюяАЕЁИОУЫЭЮЯ]/.test(name) ? 'во' : 'в';
}

function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k) el.append(k);
  return el;
}

function icon(d, size, stroke, width = 1.8) {
  return s('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    s('path', { d, stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function weekRange(from, now) {
  if (from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear()) {
    return from.getDate() === now.getDate() ? fmtDate(now) : `${from.getDate()}–${now.getDate()}${NBSP}${MONTHS[now.getMonth()]}`;
  }
  return `${fmtDate(from)} – ${fmtDate(now)}`;
}

// ---------- Колонка статистики ----------
function renderStats(v) {
  const [b1, b2] = v.branches;
  const w = v.period.week;
  const w1 = w.byBranch.get(b1) || 0;
  const w2 = w.byBranch.get(b2) || 0;
  const sum = w1 + w2;
  const branchRow = (name, val, color) => h('div', { class: 'week-row' },
    h('span', { class: 'week-name' }, h('span', { class: 'sw', style: `background:${color}` }), name),
    h('span', { class: 'strong' }, fmtH(val)));

  const week = h('section', { class: 'card week' },
    h('div', { class: 'card-head' }, h('h2', { class: 'h-card' }, 'Эта неделя'), h('span', { class: 'meta' }, weekRange(w.from, v.now))),
    h('div', { class: 'big-row' }, h('span', { class: 'num-44' }, fmtNum(sum)), h('span', { class: 'unit' }, 'ч')),
    h('div', { class: 'split', style: sum > 0 ? '' : 'background:#EEF0EA' },
      h('div', { style: `width:${sum ? (w1 / sum) * 100 : 0}%;background:${ACCENT}` }),
      h('div', { style: `width:${sum ? (w2 / sum) * 100 : 0}%;background:#15171A` })),
    h('div', { class: 'week-rows' }, b1 && branchRow(b1, w1, ACCENT), b2 && branchRow(b2, w2, '#15171A')),
    h('div', { class: 'rule' }),
    h('div', { class: 'grid3' },
      h('span', {}), h('span', { class: 'muted r' }, b1 || ''), h('span', { class: 'muted r' }, b2 || ''),
      h('span', { class: 'semi' }, MONTHS_NOM[v.now.getMonth()]),
      h('span', { class: 'strong r' }, fmtH(v.period.month.byBranch.get(b1) || 0)),
      h('span', { class: 'strong r' }, fmtH(v.period.month.byBranch.get(b2) || 0)),
      h('span', { class: 'semi' }, 'Всего'),
      h('span', { class: 'strong r' }, fmtH(v.period.total.byBranch.get(b1) || 0)),
      h('span', { class: 'strong r' }, fmtH(v.period.total.byBranch.get(b2) || 0))));

  // Плитки: уровни за месяц и ступени цели.
  const lv = v.levelsThisMonth;
  const grown = [];
  if (v.overallMonth) grown.push(`${v.overallMonth.branch} → ${v.overallMonth.to}`);
  for (const g of v.grownSkills) grown.push(`${g.name} → ${g.to}`);
  let lvSub;
  if (!grown.length) {
    const next = Math.min(...v.skills.map((x) => x.toNext).filter((x) => x > 0), Infinity);
    lvSub = Number.isFinite(next) ? `следующий — через ${fmtH(next)}` : '';
  }
  // «Креатор → 4», «Креатор и Монтаж», «Креатор и ещё 3».
  const names = [v.overallMonth && v.overallMonth.branch, ...v.grownSkills.map((g) => g.name)].filter(Boolean);
  if (grown.length === 1) lvSub = grown[0];
  else if (names.length === 2) lvSub = `${names[0]} и ${names[1]}`;
  else if (names.length > 2) lvSub = `${names[0]} и ещё ${names.length - 1}`;
  const monthGen = MONTHS_NOM[v.now.getMonth()].toLowerCase();
  const lvTile = h('section', { class: 'tile' },
    h('span', { class: 'num-36' }, String(lv)),
    h('span', { class: 'tile-word' }, `${plural(lv, ['уровень', 'уровня', 'уровней'])} за ${monthGen}`),
    h('span', { class: 'tile-sub' }, lvSub));

  const taken = v.activeGoals.flatMap((g) => g.taken).sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
  const nextStep = v.activeGoals.map((g) => g.current).find(Boolean);
  const stHot = !!(v.changes && v.changes.newSteps && v.changes.newSteps.length);
  const stTile = h('section', { class: 'tile' + (stHot ? ' tile-dark' : '') },
    h('span', { class: 'num-36' }, String(taken.length)),
    h('span', { class: 'tile-word' }, `${plural(taken.length, ['ступень', 'ступени', 'ступеней'])} цели`),
    h('span', { class: 'tile-sub' }, taken.length ? taken[0].name : nextStep ? `первая — ${nextStep.name}` : ''));

  const g = v.growingSkill;
  const grow = g
    ? h('section', { class: 'card grow' },
      h('span', { class: 'grow-title' }, 'Растущий навык недели'),
      h('div', { class: 'grow-row' },
        h('div', { class: 'grow-icon' }, icon(skillIcon(g.name), 24, ACCENT)),
        h('div', { class: 'col2' }, h('span', { class: 'grow-name' }, g.name), h('span', { class: 'grow-sub' }, `+${fmtH(g.hours)} с понедельника`))))
    : h('section', { class: 'card grow grow-none' },
      h('span', { class: 'grow-title' }, 'Растущий навык недели'),
      h('div', { class: 'grow-row' }, h('div', { class: 'grow-empty' }), h('span', { class: 'meta-14' }, 'Появится после первых часов')));

  return h('aside', { class: 'col-left', 'aria-label': 'Статистика' },
    week, h('div', { class: 'tiles' }, lvTile, stTile), grow);
}

// ---------- Дерево навыков ----------
// Раскладка от данных: левая ветка — дуга слева от персонажа, правая — справа.
function layoutBranch(skills, side) {
  const n = skills.length;
  if (side === 'left') {
    const step = n > 1 ? Math.min(85, 500 / (n - 1)) : 0;
    const y0 = 320 - (step * (n - 1)) / 2;
    return skills.map((sk, i) => {
      const y = n === 1 ? 300 : y0 + i * step;
      return { ...sk, x: Math.round(175 + 0.0012 * (y - 320) ** 2), y: Math.round(y) };
    });
  }
  const step = n > 1 ? Math.min(115, 480 / (n - 1)) : 0;
  const y0 = 300 - (step * (n - 1)) / 2;
  return skills.map((sk, i) => {
    const y = y0 + i * step;
    return { ...sk, x: Math.round(560 - 0.003 * Math.min(140, Math.abs(y - 300)) ** 2), y: Math.round(y) };
  });
}

function renderTree(v, ui) {
  const [bL, bR] = v.branches;
  const focus = v.focusBranch;
  const hl = (v.changes && v.changes.bySkill) || new Map();
  const nodes = [
    ...layoutBranch(v.skills.filter((x) => x.branch === bL), 'left').map((n) => ({ ...n, side: 'left' })),
    ...layoutBranch(v.skills.filter((x) => x.branch === bR), 'right').map((n) => ({ ...n, side: 'right' })),
  ].map((n) => {
    const total = v.period.total.bySkill.get(n.name) || 0;
    const ch = hl.get(n.name);
    return { ...n, total, open: total > 0 || n.level > 1, isFocus: n.branch === focus, grown: ch && ch.hours > 0 ? ch : null, levelup: !!(ch && ch.levelUp) };
  });

  const canvas = h('div', { class: 'tree-canvas' });
  const bg = s('svg', { width: 720, height: 620, viewBox: '0 0 720 620', fill: 'none', 'aria-hidden': 'true', class: 'abs' },
    s('ellipse', { cx: 380, cy: 300, rx: 250, ry: 280, stroke: '#EEF0EA', 'stroke-width': 1.5, 'stroke-dasharray': '3 7' }));

  // Пути: сначала неоткрытые, потом второй ветки, сверху — фокуса.
  const openL = nodes.some((n) => n.side === 'left' && n.open);
  const openR = nodes.some((n) => n.side === 'right' && n.open);
  const pathEls = [];
  const addPath = (d, lit, isFocus) => {
    const rank = !lit ? 0 : isFocus ? 2 : 1;
    let parts;
    if (!lit) parts = [s('path', { d, stroke: '#DADCD5', 'stroke-width': 2, 'stroke-dasharray': '4 6', 'stroke-linecap': 'round' })];
    else if (isFocus) parts = [
      s('path', { d, stroke: ACCENT, 'stroke-width': 16, 'stroke-linecap': 'round', opacity: 0.55 }),
      s('path', { d, stroke: ACCENT_D, 'stroke-width': 3, 'stroke-linecap': 'round' })];
    else parts = [
      s('path', { d, stroke: ACCENT_SOFT, 'stroke-width': 9, 'stroke-linecap': 'round' }),
      s('path', { d, stroke: ACCENT_D, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.45 })];
    pathEls.push({ rank, parts });
  };
  addPath('M380 300 L280 300', openL, bL === focus);
  addPath('M480 300 L380 300', openR, bR === focus);
  for (const n of nodes) {
    const d = n.side === 'left'
      ? `M280 300 C250 300 ${n.x + 30} ${n.y} ${n.x} ${n.y}`
      : `M480 300 C510 300 ${n.x - 30} ${n.y} ${n.x} ${n.y}`;
    addPath(d, n.open, n.isFocus);
  }
  pathEls.sort((a, b) => a.rank - b.rank);
  const paths = s('svg', { width: 720, height: 620, viewBox: '0 0 720 620', fill: 'none', 'aria-hidden': 'true', class: 'abs' },
    pathEls.flatMap((p) => p.parts));
  const hubStyle = (open, isFocus, r, cx) => isFocus
    ? s('circle', { cx, cy: 300, r, fill: open ? ACCENT_D : '#DADCD5' })
    : s('circle', { cx, cy: 300, r, fill: '#FFFFFF', stroke: open ? ACCENT_D : '#DADCD5', 'stroke-width': 2, opacity: open ? 0.6 : 1 });
  const hubs = s('svg', { width: 720, height: 620, viewBox: '0 0 720 620', fill: 'none', 'aria-hidden': 'true', class: 'abs' },
    hubStyle(openL, bL === focus, bL === focus ? 6 : 5, 280), hubStyle(openR, bR === focus, bR === focus ? 6 : 5, 480));
  canvas.append(bg, paths, hubs);

  // Подписи веток — кнопки переключения фокуса.
  const count = (b) => v.skills.filter((x) => x.branch === b).length;
  const branchLabel = (b, left, top) => {
    if (!b) return null;
    const isF = b === focus;
    const n = count(b);
    return h('div', { class: 'branch-label', style: `left:${left}px;top:${top}px` },
      h('button', {
        type: 'button', class: 'pill-branch' + (isF ? ' is-focus' : ''), 'aria-pressed': String(isF),
        'aria-label': isF ? `${b} — ветка фокуса` : `Сделать ${b} веткой фокуса`,
      }, b),
      h('span', { class: 'meta-12' }, `${isF ? 'ветка фокуса · ' : ''}${n} ${plural(n, ['навык', 'навыка', 'навыков'])}`));
  };
  const rightTop = Math.max(0, Math.min(...nodes.filter((n) => n.side === 'right').map((n) => n.y), 300) - 89);
  const lblL = branchLabel(bL, 0, 0);
  const lblR = branchLabel(bR, 500, rightTop);
  canvas.append(...[lblL, lblR].filter(Boolean));
  for (const [lbl, b] of [[lblL, bL], [lblR, bR]]) {
    if (lbl) lbl.querySelector('button').addEventListener('click', () => ui.setFocus(b));
  }

  // Персонаж, тень, общий уровень.
  const ov = v.overall[focus] || { level: 1, progress: 0, hours: 0 };
  canvas.append(
    h('div', { class: 'shadow-feet', 'aria-hidden': 'true' }),
    h('img', { class: 'avatar', src: 'avatar.png', alt: 'Персонаж — Виталий', width: 116, height: 330 }),
    h('div', { class: 'overall' },
      h('div', { class: 'overall-row' }, h('span', { class: 'overall-word' }, 'Уровень'), h('span', { class: 'num-52' }, String(ov.level))),
      h('div', { class: 'bar-8' }, h('div', { style: `width:${Math.max(0, Math.min(100, ov.progress))}%` })),
      h('span', { class: 'meta-12 c' }, ov.hours > 0
        ? `${fmtPct(ov.progress)} до уровня ${ov.level + 1} · ${fmtH(ov.hours)} в ветке`
        : `Первые часы в ветке «${focus}» поднимут уровень`)));

  // Узлы.
  const tip = h('div', { class: 'tip', role: 'tooltip', id: 'tree-tip', hidden: true });
  for (const n of nodes) {
    const pct = Math.max(0, Math.min(100, n.progress));
    const btn = h('button', {
      type: 'button', class: 'node-btn',
      'aria-label': n.name + (n.open ? `, уровень ${n.level}, ${fmtPct(pct)} до следующего` : ', ещё не открыт'),
      'aria-describedby': 'tree-tip',
    });
    if (n.levelup) {
      btn.append(s('svg', { width: 136, height: 136, viewBox: '0 0 136 136', fill: 'none', 'aria-hidden': 'true', class: 'burst' },
        s('circle', { cx: 68, cy: 68, r: 50, fill: ACCENT_SOFT }),
        s('path', { d: 'M68 6v12 M68 118v12 M6 68h12 M118 68h12 M24 24l8.5 8.5 M103.5 103.5l8.5 8.5 M24 112l8.5-8.5 M103.5 32.5l8.5-8.5', stroke: ACCENT_D, 'stroke-width': 3, 'stroke-linecap': 'round' }),
        s('path', { d: 'M114 14l2 5l5 2l-5 2l-2 5l-2-5l-5-2l5-2z M18 104l1.6 4l4 1.6l-4 1.6l-1.6 4l-1.6-4l-4-1.6l4-1.6z', fill: ACCENT_D })));
    }
    if (n.open) {
      const base = '0 10px 24px rgba(21, 23, 26, 0.10)';
      let shadow = `0 0 0 6px ${n.isFocus ? ACCENT_SOFT : 'rgba(21, 23, 26, 0.04)'}, ${base}`;
      if (n.grown && !n.levelup) shadow = `0 0 0 3px ${ACCENT}, 0 0 0 10px ${ACCENT_SOFT}, ${base}`;
      if (n.levelup) shadow = `0 0 0 3px ${ACCENT_D}, ${base}`;
      const dash = ((n.levelup ? 100 : pct) / 100) * RING_C;
      btn.append(
        h('span', { class: 'node-disc', style: `box-shadow:${shadow}` }),
        s('svg', { width: 64, height: 64, viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': 'true', class: 'ring' },
          s('circle', { cx: 32, cy: 32, r: 28, stroke: '#EEF0EA', 'stroke-width': 4.5 }),
          s('circle', { cx: 32, cy: 32, r: 28, stroke: ACCENT, 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-dasharray': `${dash.toFixed(1)} ${RING_C}` })),
        h('span', { class: 'node-icon' }, icon(skillIcon(n.name), 26, '#15171A')),
        h('span', { class: n.levelup ? 'badge badge-up' : 'badge' }, String(n.level)));
    } else {
      btn.append(h('span', { class: 'node-locked' }), h('span', { class: 'node-icon' }, icon(skillIcon(n.name), 22, '#8E9289')));
    }
    if (n.levelup) btn.append(h('span', { class: 'node-chip chip-dark' }, 'Новый уровень!'));
    else if (n.grown) btn.append(h('span', { class: 'node-chip' }, `+${fmtH(n.grown.hours)}`));

    const sub = n.levelup ? `Уровень ${n.level} · только что` : n.open ? `${fmtPct(pct)} · ${fmtH(n.total)}` : 'не открыт';
    const label = h('div', { class: 'node-text', style: `text-align:${n.side === 'left' ? 'right' : 'left'}` },
      h('span', { class: 'node-name' + (n.open ? '' : ' is-locked') }, n.name),
      h('span', { class: 'node-sub' + (n.levelup ? ' is-up' : '') }, sub));
    const wrap = h('div', {
      class: 'node', style: `left:${n.side === 'left' ? n.x - 160 : n.x - 32}px;top:${n.y - 32}px;flex-direction:${n.side === 'left' ? 'row-reverse' : 'row'}`,
    }, btn, label);
    canvas.append(wrap);

    const show = () => {
      const left = n.side === 'left' ? n.x + 44 : n.x - 44 - 232;
      const top = Math.max(0, Math.min(470, n.y - 64));
      tip.replaceChildren(...[
        h('div', { class: 'tip-head' }, h('span', { class: 'tip-name' }, n.name), h('span', { class: 'tip-lvl' }, n.open ? `ур.${NBSP}${n.level}` : 'не открыт')),
        h('div', { class: 'tip-bar' }, h('div', { style: `width:${n.open ? pct : 0}%` })),
        h('div', { class: 'tip-row' }, h('span', {}, 'Всего часов'), h('b', {}, fmtH(n.total))),
        h('div', { class: 'tip-row' }, h('span', {}, n.open ? `До уровня ${n.level + 1}` : 'До первого уровня'), h('b', {}, fmtH(n.toNext))),
        !n.open && h('span', { class: 'tip-note' }, 'Откроется с первыми часами'),
      ].filter(Boolean));
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      tip.hidden = false;
    };
    const hide = () => { tip.hidden = true; };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('focus', show);
    btn.addEventListener('blur', hide);
  }
  canvas.append(tip);

  const legend = h('div', { class: 'legend' },
    h('span', {}, h('span', { class: 'lg-path' }), 'Пройденный путь'),
    h('span', {}, h('span', { class: 'lg-open' }), 'Открыт'),
    h('span', {}, h('span', { class: 'lg-locked' }), 'Ещё не открыт'));

  const fit = h('div', { class: 'tree-fit' }, canvas);
  return h('section', { class: 'tree', 'aria-label': 'Дерево навыков' },
    h('div', { class: 'tree-head' }, h('h2', { class: 'h-tree' }, 'Дерево навыков'), legend),
    fit);
}

// Холст 720×620 уменьшается под ширину карточки, не увеличивается.
const treeFitObserver = new ResizeObserver((entries) => {
  for (const e of entries) {
    const scale = Math.min(1, e.contentRect.width / 720);
    e.target.style.setProperty('--tree-scale', scale);
    e.target.style.height = `${620 * scale}px`;
  }
});

// ---------- Цели ----------
function unitShort(u) { return String(u || '').split('/')[0].trim(); }
function monthShort(d) {
  return MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? NBSP + d.getFullYear() : '');
}

function factFor(g) {
  const c = g.current;
  const u = unitShort(c.unit);
  const avg = c.rule.includes('3 мес');
  const withU = (x) => fmtNum(x) + (u ? NBSP + u : '');
  let note;
  if (g.needs3) note = `нужно 3 месячных замера, есть ${g.nMeasures}`;
  else if (avg) note = 'Замеры: ' + g.measures.slice(-3).map((m) => `${monthShort(m.month)} ${withU(m.value)}`).join(' · ');
  else if (c.rule.includes('один раз')) {
    const last = g.measures[g.measures.length - 1];
    note = 'Хватит одного раза' + (last ? ` · замер: ${monthShort(last.month)}` : ' · замеров пока нет');
  } else note = c.criterion || c.rule;
  const value = g.needs3 || c.fact == null ? '—' : withU(c.fact);
  const pct = c.threshold > 0 && c.fact != null && !g.needs3 ? Math.max(0, Math.min(100, (c.fact / c.threshold) * 100)) : 0;
  return { label: avg ? 'Среднее за 3 мес' : 'Факт по правилу', value, of: `из ${withU(c.threshold)}`, pct, note };
}

function currentStepCard(g, compact) {
  const c = g.current;
  const f = factFor(g);
  return h('div', { class: compact ? 'step-current compact' : 'step-current' },
    h('div', { class: 'step-head' },
      h('span', { class: 'step-n dark' }, String(c.n)),
      h('span', { class: 'step-title' }, c.name),
      h('span', { class: 'now' }, 'сейчас')),
    h('div', { class: 'fact-row' },
      h('span', { class: 'fact-label' }, f.label),
      h('span', {}, h('b', { class: 'fact-value' }, f.value), h('span', { class: 'muted' }, ' ' + f.of))),
    h('div', { class: 'bar-6' }, h('div', { style: `width:${f.pct}%` })),
    h('span', { class: 'meta-12' }, f.note));
}

function ladderSteps(g, compact) {
  // Сверху — вершина, снизу — первая ступень, как в дизайне.
  const desc = [...g.steps].sort((a, b) => b.n - a.n);
  return desc.map((st) => {
    if (st.taken) {
      return h('li', { class: 'step-taken' },
        s('svg', { width: 120, height: 60, viewBox: '0 0 120 60', fill: 'none', 'aria-hidden': 'true', class: 'sparkles' },
          s('path', { d: 'M96 10l2 5l5 2l-5 2l-2 5l-2-5l-5-2l5-2z M76 34l1.4 3.6l3.6 1.4l-3.6 1.4l-1.4 3.6l-1.4-3.6l-3.6-1.4l3.6-1.4z M110 40l1 2.5l2.5 1l-2.5 1l-1 2.5l-1-2.5l-2.5-1l2.5-1z', fill: ACCENT, opacity: 0.8 })),
        h('span', { class: 'trophy' }, icon(ICONS.trophy, 22, '#15171A')),
        h('div', { class: 'col2 rel' },
          h('span', { class: 'step-title' }, st.name),
          h('span', { class: 'taken-sub' }, `Ступень ${st.n} взята${st.takenAt ? ' · ' + fmtDate(st.takenAt) : ''}`)));
    }
    if (st === g.current) return h('li', {}, currentStepCard(g, compact));
    return h('li', { class: compact ? 'step-future compact' : 'step-future' },
      h('span', { class: 'step-n' }, String(st.n)),
      h('span', { class: 'step-title muted2' }, st.name),
      st.n === g.stepM && h('span', { role: 'img', 'aria-label': 'Цель' }, icon(ICONS.flag, 18, '#3E423C')));
  });
}

function renderSingleGoal(g) {
  return h('section', { class: 'card ladder' },
    h('div', { class: 'card-head' }, h('h2', { class: 'h-card' }, 'Лестница цели'), h('span', { class: 'chip-soft' }, `${g.taken.length} из ${g.stepM} взято`)),
    h('div', { class: 'col2 g4' }, h('span', { class: 'goal-title' }, g.name), g.criterion && h('span', { class: 'meta-13' }, g.criterion)),
    h('ol', { class: 'steps' }, ladderSteps(g, false)));
}

function renderGoalCards(goals, ui) {
  const takenAll = goals.reduce((a, g) => a + g.taken.length, 0);
  const cards = goals.map((g) => {
    const open = ui.openGoal === g.id;
    const segs = g.steps.map((st) => {
      const cur = st === g.current;
      return h('span', { class: 'seg' + (st.taken ? ' seg-taken' : cur ? ' seg-cur' : '') });
    });
    const btn = h('button', { type: 'button', class: 'goal-btn', 'aria-expanded': String(open), 'aria-controls': `goal-${g.id}` },
      h('div', { class: 'goal-row' },
        h('span', { class: 'goal-icon' }, icon(ICONS.flag, 18, open ? ACCENT : '#15171A')),
        h('span', { class: 'col2 grow1' },
          h('span', { class: 'goal-name' }, g.name),
          h('span', { class: 'meta-12 semi' }, g.current ? `Сейчас: ${g.current.name}` : 'Все ступени взяты')),
        h('span', { class: 'chev' }, icon(ICONS.chevron, 18, '#3E423C', 2))),
      h('div', { class: 'goal-row' },
        h('span', { class: 'segs' }, segs),
        h('span', { class: 'meta-12 strong2' }, g.current ? `ступень ${g.stepN} из ${g.stepM}` : `${g.stepM} из ${g.stepM}`)));
    btn.addEventListener('click', () => ui.toggleGoal(g.id));
    return h('div', { class: 'goal-card' + (open ? ' is-open' : '') },
      btn,
      open && h('div', { class: 'goal-body', id: `goal-${g.id}` },
        g.criterion && h('span', { class: 'meta-13' }, g.criterion),
        h('ol', { class: 'steps' }, ladderSteps(g, true))));
  });
  return h('section', { class: 'card goals' },
    h('div', { class: 'card-head' }, h('h2', { class: 'h-card' }, 'Цели'),
      h('span', { class: 'chip-soft' }, `${goals.length} ${plural(goals.length, ['цель', 'цели', 'целей'])} · ${takenAll} ${plural(takenAll, ['ступень', 'ступени', 'ступеней'])} взято`)),
    cards);
}

// ---------- Лента ----------
function renderFeed(v) {
  const ch = v.changes || {};
  const bySkill = ch.bySkill || new Map();
  const newStepNames = new Set((ch.newSteps || []).map((st) => st.name));
  const items = v.feed.map((e) => {
    let text, ic;
    if (e.type === 'hours') { text = `+${fmtH(e.hours)} ${vo(e.skill)} ${e.skill}`; ic = skillIcon(e.skill); }
    else if (e.type === 'level') { text = `${e.skill} → уровень ${e.level}`; ic = ICONS.up; }
    else { text = `Взята ступень «${e.name}»`; ic = ICONS.trophy; }
    const lu = e.type === 'level' && bySkill.get(e.skill);
    const hot = (lu && e.level > lu.fromLevel && e.level <= lu.toLevel) || (e.type === 'step' && newStepNames.has(e.name));
    return h('li', { class: 'ev' + (hot ? ' is-hot' : '') },
      h('span', { class: 'ev-icon' }, icon(ic, 18, '#15171A')),
      h('span', { class: 'ev-text' }, text),
      h('span', { class: 'meta-12' }, fmtDate(e.date)));
  });
  return h('section', { class: 'card feed' },
    h('h2', { class: 'h-card' }, 'Последние события'),
    items.length ? h('ul', { class: 'events' }, items)
      : h('div', { class: 'quiet' }, h('span', { class: 'quiet-title' }, 'Пока тихо'),
        h('span', { class: 'meta-13' }, 'Первая закрытая задача с часами откроет навык и появится здесь.')));
}

// Сводка для плашки: «+4,5 ч · Сценарий → уровень 2 · Продукт +1 ч».
function changesSummary(ch) {
  const parts = [];
  if (ch.hours > 0.004) parts.push(`+${fmtH(ch.hours)}`);
  for (const [name, c] of ch.bySkill) if (c.levelUp) parts.push(`${name} → уровень ${c.toLevel}`);
  for (const b of ch.branchUps) parts.push(`${b.branch} → уровень ${b.level}`);
  for (const [name, c] of ch.bySkill) if (!c.levelUp && c.hours > 0.004) parts.push(`${name} +${fmtH(c.hours)}`);
  for (const st of ch.newSteps) parts.push(`Взята ступень «${st.name}»`);
  const head = parts[0] && parts[0].startsWith('+') ? 1 : 0;
  // Ступени важнее мелких часов: если не влезает, оставляем их и сокращаем середину.
  const max = 4;
  if (parts.length <= max) return parts.join(' · ');
  const steps = parts.filter((x) => x.startsWith('Взята'));
  const rest = parts.filter((x) => !x.startsWith('Взята'));
  const keep = rest.slice(0, Math.max(head + 1, max - steps.length)).concat(steps);
  return `${keep.join(' · ')} и ещё ${parts.length - keep.length}`;
}

// Плашка в шапке. null — хранилище недоступно, блок не показываем.
function renderStatus(v) {
  const ch = v.changes;
  if (!ch) return null;
  if (ch.any) {
    return h('div', { class: 'status status-hot', role: 'status' },
      h('span', { class: 'status-label' }, 'С прошлого захода'), changesSummary(ch));
  }
  let text;
  if (ch.demoText) text = ch.demoText;
  else if (ch.first) text = 'Первый заход — запомнил, с чего начинаем';
  else text = 'С прошлого захода без изменений';
  return h('div', { class: 'status', role: 'status' }, h('span', { class: 'status-dot' }), text);
}

// ---------- Телефон (до 768 px) по design/Mobile.dc.html ----------
const MOBILE_MQ = window.matchMedia('(max-width: 767px)');
const RING_M = 119.38; // 2π·19

function renderMobileHero(v) {
  const ov = v.overall[v.focusBranch] || { level: 1, progress: 0, hours: 0 };
  return h('section', { class: 'card m-hero' },
    h('div', { class: 'm-avatar' },
      h('div', { class: 'm-feet', 'aria-hidden': 'true' }),
      h('img', { src: 'avatar.png', alt: 'Персонаж — Виталий', width: 78, height: 222 })),
    h('div', { class: 'm-hero-body' },
      h('span', { class: 'm-pill is-focus' }, v.focusBranch),
      h('div', { class: 'overall-row' }, h('span', { class: 'overall-word' }, 'Уровень'), h('span', { class: 'num-56' }, String(ov.level))),
      h('div', { class: 'bar-8 w100' }, h('div', { style: `width:${Math.max(0, Math.min(100, ov.progress))}%` })),
      h('span', { class: 'meta-12 lh' }, ov.hours > 0
        ? `${fmtPct(ov.progress)} до уровня ${ov.level + 1} · ${fmtH(ov.hours)} в ветке`
        : `Первые часы в ветке «${v.focusBranch}» поднимут уровень`)));
}

function renderMobileBranch(v, b, ui) {
  const isF = b === v.focusBranch;
  const hl = (v.changes && v.changes.bySkill) || new Map();
  const list = v.skills.filter((x) => x.branch === b).map((x) => {
    const total = v.period.total.bySkill.get(x.name) || 0;
    return { ...x, total, open: total > 0 || x.level > 1, ch: hl.get(x.name) };
  });
  // Открытые навыки сверху, порядок внутри — как в таблице.
  list.sort((a, c) => c.open - a.open);
  const openN = list.filter((x) => x.open).length;
  const pill = h('button', {
    type: 'button', class: 'm-pill' + (isF ? ' is-focus' : ''), 'aria-pressed': String(isF),
    'aria-label': isF ? `${b} — ветка фокуса` : `Сделать ${b} веткой фокуса`,
  }, b);
  pill.addEventListener('click', () => ui.setFocus(b));
  const rows = list.map((x) => {
    const pct = Math.max(0, Math.min(100, x.progress));
    if (!x.open) {
      return h('div', { class: 'm-skill' },
        h('div', { class: 'm-node' }, h('div', { class: 'm-locked' }, icon(skillIcon(x.name), 18, '#8E9289'))),
        h('div', { class: 'col2 grow1' },
          h('span', { class: 'm-name is-locked' }, x.name),
          h('span', { class: 'meta-12 w500' }, `не открыт · первый уровень через ${fmtH(x.toNext)}`)));
    }
    const up = x.ch && x.ch.levelUp;
    const grown = x.ch && x.ch.hours > 0.004 ? x.ch.hours : 0;
    return h('div', { class: 'm-skill' },
      h('div', { class: 'm-node', style: `box-shadow:0 0 0 4px ${isF ? ACCENT_SOFT : 'rgba(21, 23, 26, 0.04)'}` },
        s('svg', { width: 44, height: 44, viewBox: '0 0 44 44', fill: 'none', 'aria-hidden': 'true', class: 'ring' },
          s('circle', { cx: 22, cy: 22, r: 19, stroke: '#EEF0EA', 'stroke-width': 3.5 }),
          s('circle', { cx: 22, cy: 22, r: 19, stroke: ACCENT, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-dasharray': `${((up ? 100 : pct) / 100 * RING_M).toFixed(1)} ${RING_M}` })),
        h('span', { class: 'node-icon' }, icon(skillIcon(x.name), 20, '#15171A'))),
      h('div', { class: 'col6 grow1' },
        h('div', { class: 'm-line' },
          h('span', { class: 'm-name' }, x.name),
          h('span', { class: 'm-total' }, grown ? h('span', { class: 'm-grown' }, `+${fmtH(grown)}`) : null, fmtH(x.total))),
        h('div', { class: 'bar-6 track' }, h('div', { style: `width:${up ? 100 : pct}%;background:${ACCENT}` })),
        h('span', { class: 'meta-12 w500' + (up ? ' is-up' : '') },
          up ? `Уровень ${x.level} · только что` : `${fmtPct(pct)} · до уровня ${x.level + 1} ещё ${fmtH(x.toNext)}`)),
      h('span', { class: 'm-badge' + (up ? ' is-up' : ''), 'aria-label': `уровень ${x.level}` }, String(x.level)));
  });
  return h('section', { class: 'card m-branch' },
    h('div', { class: 'm-branch-head' }, pill,
      h('span', { class: 'meta-12' }, `${isF ? 'ветка фокуса · ' : ''}${openN} из ${list.length} открыто`)),
    rows);
}

function renderMobileWeek(v) {
  const [b1, b2] = v.branches;
  const p = v.period;
  const w1 = p.week.byBranch.get(b1) || 0;
  const w2 = p.week.byBranch.get(b2) || 0;
  const sum = w1 + w2;
  const row = (label, per) => [
    h('span', { class: 'semi' }, label),
    h('span', { class: 'strong r' }, fmtH(per.byBranch.get(b1) || 0)),
    h('span', { class: 'strong r' }, fmtH(per.byBranch.get(b2) || 0))];
  return h('section', { class: 'card m-week' },
    h('div', { class: 'card-head base' }, h('h2', { class: 'h-card' }, 'Эта неделя'), h('span', { class: 'meta' }, weekRange(p.week.from, v.now))),
    h('div', { class: 'big-row' }, h('span', { class: 'num-40' }, fmtNum(sum)), h('span', { class: 'unit' }, 'ч')),
    h('div', { class: 'split', style: sum > 0 ? '' : 'background:#EEF0EA' },
      h('div', { style: `width:${sum ? (w1 / sum) * 100 : 0}%;background:${ACCENT}` }),
      h('div', { style: `width:${sum ? (w2 / sum) * 100 : 0}%;background:#15171A` })),
    h('div', { class: 'grid3 m-grid' },
      h('span', {}),
      h('span', { class: 'muted r m-key' }, h('span', { class: 'sw8', style: `background:${ACCENT}` }), b1 || ''),
      h('span', { class: 'muted r m-key' }, h('span', { class: 'sw8', style: 'background:#15171A' }), b2 || ''),
      ...row('Неделя', p.week), ...row(MONTHS_NOM[v.now.getMonth()], p.month), ...row('Всего', p.total)));
}

function renderMobileGrow(v) {
  const g = v.growingSkill;
  if (!g) {
    return h('section', { class: 'card m-grow is-none' },
      h('div', { class: 'grow-empty m48' }),
      h('div', { class: 'col2' }, h('span', { class: 'm-grow-title' }, 'Растущий навык недели'), h('span', { class: 'meta-13' }, 'Появится после первых часов')));
  }
  return h('section', { class: 'card m-grow' },
    h('div', { class: 'grow-icon m48' }, icon(skillIcon(g.name), 22, ACCENT)),
    h('div', { class: 'col2' },
      h('span', { class: 'm-grow-title' }, 'Растущий навык недели'),
      h('span', { class: 'm-grow-name' }, g.name),
      h('span', { class: 'm-grow-sub' }, `+${fmtH(g.hours)} с понедельника`)));
}

// Лестница на телефоне: последняя взятая, текущая, следующая и «ещё N».
function renderMobileGoal(g) {
  const asc = [...g.steps].sort((a, b) => a.n - b.n);
  const lastTaken = g.taken.length ? [...g.taken].sort((a, b) => b.n - a.n)[0] : null;
  const next = g.current ? asc.find((st) => !st.taken && st.n > g.current.n) : null;
  const shown = [g.current, next].filter(Boolean);
  const rest = asc.filter((st) => !st.taken && !shown.includes(st)).length;
  const sub = { ...g, steps: [lastTaken, ...shown].filter(Boolean) };
  return h('section', { class: 'card ladder m-ladder' },
    h('div', { class: 'card-head' }, h('h2', { class: 'h-card' }, 'Лестница цели'), h('span', { class: 'chip-soft' }, `${g.taken.length} из ${g.stepM} взято`)),
    h('div', { class: 'col2 g4' }, h('span', { class: 'goal-title m18' }, g.name), g.criterion && h('span', { class: 'meta-13' }, g.criterion)),
    h('ol', { class: 'steps' }, ladderSteps(sub, false).reverse()),
    rest > 0 && h('span', { class: 'meta-13 semi pad4' }, `Ещё ${rest} ${plural(rest, ['ступень', 'ступени', 'ступеней'])} до цели`));
}

function renderMobile(v, ui) {
  const branches = [v.focusBranch, ...v.branches.filter((b) => b !== v.focusBranch)].filter(Boolean);
  const goals = v.activeGoals;
  return h('div', { class: 'm-layout' },
    safe('Уровень', () => renderMobileHero(v)),
    branches.map((b) => safe(b, () => renderMobileBranch(v, b, ui))),
    safe('Эта неделя', () => renderMobileWeek(v)),
    safe('Итоги месяца', () => renderStats(v).querySelector('.tiles')),
    safe('Растущий навык недели', () => renderMobileGrow(v)),
    goals.length ? safe('Цели', () => (goals.length > 1 ? renderGoalCards(goals, ui) : renderMobileGoal(goals[0]))) : null,
    safe('Последние события', () => renderFeed(v)));
}

// ---------- Сборка ----------
// Один сломанный блок не должен ронять весь экран: вместо него — спокойная карточка.
const blockErrors = [];
function safe(title, fn) {
  try { return fn(); } catch (e) {
    blockErrors.push(`${title}: ${(e && e.message) || e}`);
    return h('section', { class: 'card quiet-card' },
      h('h2', { class: 'h-card' }, title),
      h('span', { class: 'meta-13' }, 'Этот блок не удалось показать. Остальное на экране — верно.'),
      h('span', { class: 'err-detail' }, `${(e && e.name) || 'Error'}: ${(e && e.message) || ''}`.slice(0, 160)));
  }
}

function renderMain(v, ui) {
  blockErrors.length = 0;
  if (MOBILE_MQ.matches) return renderMobile(v, ui);
  const goals = v.activeGoals;
  const right = h('aside', { class: 'col-right', 'aria-label': 'Цель и события' },
    goals.length ? safe('Цели', () => (goals.length > 1 ? renderGoalCards(goals, ui) : renderSingleGoal(goals[0]))) : null,
    safe('Последние события', () => renderFeed(v)));
  const tree = safe('Дерево навыков', () => renderTree(v, ui));
  const root = h('div', { class: 'layout' }, safe('Статистика', () => renderStats(v)), tree, right);
  const fit = tree.querySelector('.tree-fit');
  if (fit) treeFitObserver.observe(fit);
  return root;
}

window.VitrinaView = { blockErrors, renderMain, renderStatus, changesSummary, MOBILE_MQ };
