// Screens: draws the hexagonal board in SVG, handles taps, undo, names, settings, the rule switches and
// the piece editor for custom starting positions. Rules are in rules.js.
(function () {
  'use strict';
  const C = window.Chess3, $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const KEY = 'chess3-v1';

  // ---- words (English and Russian) ----
  const T = {
    en: { title: 'Chess for Three', undo: 'Undo', 'new': 'New game', rules: 'Rules', settings: 'Settings',
      names: ['White', 'Black', 'Red'], toMove: '{n} to move', check: '{n}, your king is in check!',
      mate: '{n} is checkmated and out of the game.', king: '{b} took the king of {n}! {n} is out.',
      pass: '{n} has no moves and skips a turn.', promo: 'The pawn became a {t}!', wins: '{n} wins!', winTeam: '{n} win!', and: ' and ', draw: 'Draw!',
      pieceName: { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' },
      sure: 'Start a new game?', standard: 'Normal start', custom: 'Set up pieces', no: 'Keep playing', close: 'Done', again: 'Play again',
      view: 'Board view', vFixed: 'Board stays still', vTurn: 'Board turns to the player to move', vTable: 'Pieces face their players',
      lang: 'Language', nameOf: 'Name of player {k}', sound: 'Sounds',
      // Rule switches
      rulesFor: 'Rules for the next game', saveRules: 'Save', saveStart: 'Save and start a new game',
      rCentre: 'Diagonals fork through the centre', rCastling: 'Castling', rDouble: 'Pawns may step two cells on their first move',
      rEp: 'En passant (taking a pawn that just stepped two cells)', rKingCap: 'A king left in check can be taken',
      rPromo: 'A pawn at the end becomes', promoQ: 'always a queen', promoChoose: 'any piece the player picks',
      rMated: 'When a player is out', matedRemove: 'their pieces leave the board', matedFreeze: 'their pieces stay, frozen',
      rTeams: 'Teams', teamNone: 'Everyone for themselves', teamVs: '{a} + {b} against {c}',
      inGame: 'This game: ', nowRules: 'How to play',
      // Piece editor
      editHint: 'Pick a player and a piece, then tap cells. Tap a piece again to remove it.',
      erase: 'Remove', clear: 'Empty board', reset: 'Normal start', cancel: 'Cancel', start: 'Start the game', noPieces: '{n}: no pieces (sits out)',
      eTwoKings: '{n} has more than one king.', eNoKing: '{n} needs a king.', eSides: 'At least two sides need a king.',
      ePawnRow: 'A pawn of {n} stands on another player’s first row.',
      pick: 'What should the pawn become?', zoom: 'Zoom',
      rulesText: [
        'Three players take turns: White, then Black, then Red.',
        'Pieces move like in normal chess. Tap a piece to see where it can go.',
        'Lines go across the middle into the other players’ parts of the board.',
        'A bishop that goes through the very centre can turn to either other player. It always stays on its colour.',
        'Pawns walk toward the centre, then into another player’s part. On that player’s first row a pawn changes into a queen.',
        'You may not leave your king in check. If you have no move to save it, you are checkmated and out.',
        'If someone leaves a king in check, the next player may take it!',
        'The last king on the board wins (or the last team).'] },
    ru: { title: 'Шахматы на троих', undo: 'Назад', 'new': 'Новая игра', rules: 'Правила', settings: 'Настройки',
      names: ['Белые', 'Чёрные', 'Красные'], toMove: 'Ходят {n}', check: '{n}: шах королю!',
      mate: '{n}: мат, выбывают из игры.', king: '{b} съели короля! {n} выбывают.',
      pass: '{n}: нет ходов, пропуск.', promo: 'Пешка стала {t}!', wins: 'Победили {n}!', winTeam: 'Победили {n}!', and: ' и ', draw: 'Ничья!',
      pieceName: { q: 'ферзём', r: 'ладьёй', b: 'слоном', n: 'конём' },
      sure: 'Начать новую игру?', standard: 'Обычная расстановка', custom: 'Расставить фигуры', no: 'Играть дальше', close: 'Готово', again: 'Играть ещё',
      view: 'Вид доски', vFixed: 'Доска стоит на месте', vTurn: 'Доска поворачивается к тому, чей ход', vTable: 'Фигуры смотрят на своих игроков',
      lang: 'Язык', nameOf: 'Имя игрока {k}', sound: 'Звуки',
      rulesFor: 'Правила для следующей игры', saveRules: 'Сохранить', saveStart: 'Сохранить и начать новую игру',
      rCentre: 'Диагонали через центр раздваиваются', rCastling: 'Рокировка', rDouble: 'Пешка первым ходом может пойти на две клетки',
      rEp: 'Взятие на проходе', rKingCap: 'Короля, оставленного под шахом, можно съесть',
      rPromo: 'Пешка в конце пути становится', promoQ: 'всегда ферзём', promoChoose: 'любой фигурой на выбор',
      rMated: 'Когда игрок выбывает', matedRemove: 'его фигуры уходят с доски', matedFreeze: 'его фигуры остаются и замирают',
      rTeams: 'Команды', teamNone: 'Каждый сам за себя', teamVs: '{a} + {b} против {c}',
      inGame: 'В этой игре: ', nowRules: 'Как играть',
      editHint: 'Выбери игрока и фигуру, потом нажимай на клетки. Нажми на фигуру ещё раз, чтобы убрать её.',
      erase: 'Убрать', clear: 'Пустая доска', reset: 'Обычная расстановка', cancel: 'Отмена', start: 'Начать игру', noPieces: '{n}: нет фигур (не играют)',
      eTwoKings: 'У игрока «{n}» больше одного короля.', eNoKing: 'Игроку «{n}» нужен король.', eSides: 'Король нужен хотя бы двум сторонам.',
      ePawnRow: 'Пешка игрока «{n}» стоит на первом ряду другого игрока.',
      pick: 'Кем станет пешка?', zoom: 'Приблизить',
      rulesText: [
        'Три игрока ходят по очереди: белые, потом чёрные, потом красные.',
        'Фигуры ходят как в обычных шахматах. Нажми на фигуру, и увидишь, куда она может пойти.',
        'Линии проходят через середину в части доски других игроков.',
        'Слон, проходящий через самый центр, может свернуть к любому из двух других игроков. Он всегда остаётся на своём цвете.',
        'Пешки идут к центру, а потом в часть другого игрока. На его первом ряду пешка превращается в ферзя.',
        'Нельзя оставлять своего короля под шахом. Если спасти его нечем, это мат, и игрок выбывает.',
        'Если кто-то оставил короля под шахом, следующий игрок может его съесть!',
        'Побеждает последний король на доске (или последняя команда).'] }
  };
  const TEAMS = [null, [0, 0, 1], [0, 1, 0], [1, 0, 0]];

  // ---- saved data ----
  let save = { lang: (navigator.language || 'en').slice(0, 2) === 'ru' ? 'ru' : 'en', names: [null, null, null], view: 'fixed', sound: true,
    rules: Object.assign({}, C.RULES), game: null, hist: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.game && s.game.board) save = Object.assign(save, s); } catch (e) { /* no storage */ }
  // Saves from the first version: one winner instead of a list.
  const fix = g => { if (g && !('winners' in g)) g.winners = g.winner != null ? [g.winner] : null; return g; };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* no storage */ } };
  let st = fix(save.game) || C.newGame(save.rules), sel = null, moves = [], animate = false;
  let edit = null; // the piece editor: { board, o (player), t (piece or 'x' to remove), err }
  const tr = () => T[save.lang] || T.en;
  const nameOf = p => save.names[p] || tr().names[p];
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);
  const over = () => st.winners != null || st.draw;

  // ---- geometry: hexagon of radius 1, White's side at the bottom ----
  const V = [0, 1, 2, 3, 4, 5].map(k => { const a = (120 - 60 * k) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const M = V.map((v, k) => mid(v, V[(k + 1) % 6])), O = [0, 0];
  const kite = (s, right) => right ? [M[2 * s], V[2 * s + 1], M[2 * s + 1], O] : [V[2 * s], M[2 * s], O, M[(2 * s + 5) % 6]];
  const bil = (q, u, v) => [0, 1].map(k => (1 - u) * (1 - v) * q[0][k] + u * (1 - v) * q[1][k] + u * v * q[2][k] + (1 - u) * v * q[3][k]);
  const cellPoly = [], cellMid = [], cellSize = [];
  for (let i = 0; i < 96; i++) {
    const s = C.segOf(i), f = C.fileOf(i), r = C.rankOf(i), q = kite(s, f >= 4), u = (f % 4) / 4, v = r / 4, d = 0.25;
    const pts = [bil(q, u, v), bil(q, u + d, v), bil(q, u + d, v + d), bil(q, u, v + d)];
    cellPoly[i] = pts; cellMid[i] = bil(q, u + d / 2, v + d / 2);
    const area = Math.abs(pts.reduce((a, p, k) => { const n = pts[(k + 1) % 4]; return a + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;
    cellSize[i] = Math.sqrt(area);
  }

  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const svg = $('board');
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const glyph = t => GLYPH[t] + '︎';

  // Rotation of the whole board ("turn" view) and of each piece so it reads upright (or faces its owner).
  // Phone held upright: the board lies on its corner (turned 90 degrees) so its long side runs down the
  // tall screen, the name plates move to a strip above it, and the toolbar shows icons.
  let compact = false;
  const isCompact = () => window.innerWidth < 700 && window.innerHeight > window.innerWidth * 1.15;
  const worldRot = () => (compact ? 90 : 0) + (save.view === 'turn' && !edit ? 120 * st.turn : 0);
  const pieceRot = o => save.view === 'table' ? -120 * o : -worldRot();

  let world, marksG, piecesG, labelsG;
  function build() {
    svg.textContent = '';
    world = el('g', { id: 'world' }, svg);
    el('polygon', { points: V.map(p => p.map(x => x * 1.035).join(',')).join(' '), fill: '#4a2f1b', stroke: '#d9a441', 'stroke-width': 0.006 }, world);
    const cellsG = el('g', {}, world); marksG = el('g', { class: 'mark' }, world); piecesG = el('g', {}, world); labelsG = el('g', {}, world);
    for (let i = 0; i < 96; i++) {
      const c = el('polygon', { points: cellPoly[i].map(p => p.join(',')).join(' '), class: 'cell ' + ((C.fileOf(i) + C.rankOf(i)) % 2 ? 'l' : 'd'), 'data-i': i }, cellsG);
    }
    // Small file letters along each player's first row.
    for (let s = 0; s < 3; s++) for (let f = 0; f < 8; f++) {
      const p = bil(kite(s, f >= 4), (f % 4 + 0.5) / 4, -0.035);
      const g = el('g', { transform: `translate(${p[0]},${p[1]})` }, world);
      el('text', { 'font-size': 0.034, fill: '#d9a441', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Alegreya Sans, sans-serif', transform: `rotate(${-120 * s})` }, g).textContent = 'abcdefgh'[f];
    }
  }

  function render() {
    const t = tr(), board = edit ? edit.board : st.board;
    document.documentElement.lang = save.lang;
    $('title').textContent = t.title; document.title = t.title;
    for (const [id, icon] of [['undo', '\u21B6'], ['new', '+'], ['rules', '?'], ['settings', '\u2699']]) {
      $(id).textContent = compact ? icon : t[id]; $(id).setAttribute('aria-label', t[id]); $(id).title = t[id];
    }
    $('undo').disabled = !save.hist.length || !!edit;
    world.style.transform = `rotate(${worldRot()}deg)`;
    marksG.textContent = ''; piecesG.textContent = ''; labelsG.textContent = '';
    const poly = (i, attrs) => el('polygon', Object.assign({ points: cellPoly[i].map(p => p.join(',')).join(' ') }, attrs), marksG);
    if (!edit) {
      if (st.last) { poly(st.last.from, { fill: 'rgba(217,164,65,.35)' }); poly(st.last.to, { fill: 'rgba(217,164,65,.5)' }); }
      for (let p = 0; p < 3; p++) if (C.inCheck(st, p)) poly(st.board.findIndex(x => x && x.o === p && x.t === 'k'), { fill: 'rgba(224,71,60,.75)' });
      if (sel != null) poly(sel, { fill: 'rgba(120,200,120,.55)' });
      for (const m of moves) {
        const [x, y] = cellMid[m.to], r = cellSize[m.to];
        if (st.board[m.to] || (st.ep && m.to === st.ep.skip && st.board[m.from].t === 'p' && st.board[m.from].o !== st.ep.o))
          el('circle', { cx: x, cy: y, r: r * 0.44, fill: 'none', stroke: 'rgba(40,140,60,.9)', 'stroke-width': r * 0.1 }, marksG);
        else el('circle', { cx: x, cy: y, r: r * 0.17, fill: 'rgba(30,110,50,.75)' }, marksG);
      }
    }
    for (let i = 0; i < 96; i++) {
      const pc = board[i]; if (!pc) continue;
      const [x, y] = cellMid[i], sz = cellSize[i] * (compact ? 1.05 : 0.95), frozen = !edit && !st.alive[pc.o];
      const g = el('g', { class: 'piece' + (frozen ? ' frozen' : ''), transform: `translate(${x},${y})`, 'data-i': i }, piecesG);
      const rg = el('g', { class: 'rot', style: `transform: rotate(${pieceRot(pc.o)}deg)` }, g);
      el('text', { class: 'o' + pc.o, 'font-size': sz, 'stroke-width': sz * 0.07, y: sz * 0.02 }, rg).textContent = glyph(pc.t);
    }
    // Player name plates outside each player's side, facing that player. Teammates share a star colour.
    const R = edit ? save.rules : st.rules || {};
    for (let p = 0; p < 3 && !compact; p++) {
      const m = M[2 * p], playing = edit ? edit.board.some(x => x && x.o === p) : st.alive[p];
      const g = el('g', { class: 'label' + (!edit && p === st.turn && !over() ? ' on' : '') + (playing ? '' : ' out'),
        transform: `translate(${m[0] * 1.17},${m[1] * 1.17}) rotate(${-120 * p})` }, labelsG);
      const caps = edit ? 0 : st.captured[p].filter(x => x !== 'k').length;
      const team = R.teams ? (R.teams[p] === R.teams[[0, 1, 2].find(x => R.teams.filter(y => y === R.teams[x]).length === 2)] ? ' ★' : '') : '';
      const text = nameOf(p) + team + (caps ? '  +' + caps : '');
      const w = Math.max(0.42, text.length * 0.05 + 0.12);
      el('rect', { class: 'bg', x: -w / 2, y: -0.065, width: w, height: 0.13, rx: 0.065 }, g);
      el('circle', { cx: -w / 2 + 0.07, cy: 0, r: 0.032, class: 'o' + p, 'stroke-width': 0.006 }, g);
      el('text', { x: 0.03, 'font-size': 0.075, fill: '#f1e7d3' }, g).textContent = text;
    }
    renderStatus(t);
    renderStrip(t, R);
    renderPalette(t);
    if (animate && st.last) {
      animate = false;
      const g = piecesG.querySelector(`[data-i="${st.last.to}"] text`), a = cellMid[st.last.from], b = cellMid[st.last.to];
      if (g && g.animate) {
        // Slide from the old cell: the offset is in board units, turned into the piece's own (rotated) frame.
        const rot = -pieceRot(st.board[st.last.to].o) * Math.PI / 180, dx = a[0] - b[0], dy = a[1] - b[1];
        const lx = dx * Math.cos(rot) - dy * Math.sin(rot), ly = dx * Math.sin(rot) + dy * Math.cos(rot);
        try { g.animate([{ transform: `translate(${lx}px,${ly}px)` }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out' }); } catch (e) { /* no animation */ }
      }
    }
    if (over() && !shownEnd && !edit) { shownEnd = true; setTimeout(showEnd, 500); }
  }
  let shownEnd = over();

  // Player strip (phones): names with the player to move lit up, and the zoom button.
  function renderStrip(t, R) {
    const strip = $('players'); strip.hidden = !compact; if (!compact) return;
    const html = [0, 1, 2].map(p => {
      const playing = edit ? edit.board.some(x => x && x.o === p) : st.alive[p];
      const caps = edit ? 0 : st.captured[p].filter(x => x !== 'k').length;
      const team = R.teams && R.teams.filter(y => y === R.teams[p]).length === 2 ? ' \u2605' : '';
      return `<span class="pl${!edit && p === st.turn && !over() ? ' on' : ''}${playing ? '' : ' out'}"><i class="chip" style="background:${['var(--ivory)', 'var(--ebony)', 'var(--ruby)'][p]}"></i>${esc(nameOf(p) + team)}${caps ? ' +' + caps : ''}</span>`;
    }).join('') + `<button type="button" id="zoomBtn" class="zoom${zoom > 1 ? ' on' : ''}" aria-label="${esc(t.zoom)}" title="${esc(t.zoom)}">${zoom > 1 ? '\u2921' : '\u2922'}</button>`;
    strip.innerHTML = html;
    $('zoomBtn').onclick = () => { zoom > 1 ? setZoom(1) : setZoom(1.8, true); };
  }

  // ---- zoom and pan: a button on phones, a two-finger pinch anywhere; drag with one finger when zoomed in ----
  let zoom = 1, cx = 0, cy = 0;
  const baseBox = () => compact ? [-0.915, -1.045, 1.83, 2.09] : [-1.13, -1.13, 2.26, 2.26];
  function applyView() {
    const [x, y, w, h] = baseBox(), zw = w / zoom, zh = h / zoom;
    const lim = v => Math.max(-0.8, Math.min(0.8, v));
    if (zoom <= 1) { cx = 0; cy = 0; } else { cx = lim(cx); cy = lim(cy); }
    svg.setAttribute('viewBox', zoom <= 1 ? `${x} ${y} ${w} ${h}` : `${cx - zw / 2} ${cy - zh / 2} ${zw} ${zh}`);
  }
  function setZoom(z, toPlayer) {
    zoom = Math.max(1, Math.min(2.6, z));
    if (toPlayer && zoom > 1) {
      // Centre on the side of the player to move, as it appears on screen (the board may be turned).
      const m = M[2 * st.turn], a = worldRot() * Math.PI / 180, px = m[0] * 0.5, py = m[1] * 0.5;
      cx = px * Math.cos(a) - py * Math.sin(a); cy = px * Math.sin(a) + py * Math.cos(a);
    }
    applyView(); if (toPlayer !== undefined) render();
  }
  const pts = new Map(); let press = null, pinch = null;
  svg.addEventListener('pointerdown', e => {
    e.preventDefault(); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { const c = e.target.closest && e.target.closest('[data-i]'); press = { x: e.clientX, y: e.clientY, cell: c ? +c.dataset.i : null, moved: false, cx, cy }; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom }; if (press) press.moved = true; }
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; setZoom(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d); return; }
    if (!press || pts.size !== 1) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < 12) return;
    press.moved = true;
    if (zoom > 1) { const k = svg.getScreenCTM().a; cx = press.cx - dx / k; cy = press.cy - dy / k; applyView(); }
  });
  const lift = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2 && pinch) { pinch = null; render(); }
    if (pts.size === 0) {
      if (press && !press.moved && press.cell != null && e.type === 'pointerup') edit ? editTap(press.cell) : tap(press.cell);
      press = null;
    }
  };
  svg.addEventListener('pointerup', lift); svg.addEventListener('pointercancel', lift);
  function layout() {
    const c = isCompact(); if (c === compact && svg.dataset.ready) return;
    compact = c; svg.dataset.ready = 1; document.body.classList.toggle('compact', compact); applyView(); render();
  }
  window.addEventListener('resize', layout);

  const winText = t => st.winners.length > 1 ? fill(t.winTeam, { n: st.winners.map(nameOf).join(t.and) }) : fill(t.wins, { n: nameOf(st.winners[0]) });
  function renderStatus(t) {
    const s = $('status'); s.className = 'status'; s.textContent = '';
    const chip = p => { const c = document.createElement('span'); c.className = 'chip'; c.style.background = ['var(--ivory)', 'var(--ebony)', 'var(--ruby)'][p]; s.appendChild(c); };
    if (edit) { s.textContent = edit.err || t.editHint; if (edit.err) s.classList.add('alarm'); return; }
    const ev = (st.events || []).filter(e => e.type !== 'check');
    let msg = ev.map(e => fill(e.type === 'kingTaken' ? t.king : t[e.type], { n: nameOf(e.p), b: nameOf(e.by), t: t.pieceName[e.t] || '' })).join(' ');
    if (st.winners != null) { st.winners.forEach(chip); msg = (msg ? msg + ' ' : '') + winText(t); }
    else if (st.draw) msg = (msg ? msg + ' ' : '') + t.draw;
    else {
      chip(st.turn);
      const chk = C.inCheck(st, st.turn);
      msg = (msg ? msg + ' ' : '') + fill(chk ? t.check : t.toMove, { n: nameOf(st.turn) });
      if (chk) s.classList.add('alarm');
    }
    s.appendChild(document.createTextNode(msg));
  }

  // ---- piece editor ----
  function renderPalette(t) {
    const pal = $('palette'); pal.hidden = !edit; if (!edit) return;
    const who = [0, 1, 2].map(p => `<button type="button" class="who${edit.o === p ? ' on' : ''}" data-o="${p}"><span class="chip" style="background:${['var(--ivory)', 'var(--ebony)', 'var(--ruby)'][p]}"></span>${esc(nameOf(p))}</button>`).join('');
    const kinds = ['k', 'q', 'r', 'b', 'n', 'p'].map(k => `<button type="button" class="kind o${edit.o}${edit.t === k ? ' on' : ''}" data-t="${k}" aria-label="${k}"><span>${glyph(k)}</span></button>`).join('')
      + `<button type="button" class="kind erase${edit.t === 'x' ? ' on' : ''}" data-t="x">${esc(t.erase)}</button>`;
    const counts = [0, 1, 2].map(p => edit.board.filter(x => x && x.o === p).length);
    const note = counts.map((n, p) => n ? '' : fill(t.noPieces, { n: nameOf(p) })).filter(Boolean).join(' · ');
    pal.innerHTML = `<div class="prow">${who}</div><div class="prow">${kinds}</div>
      ${note ? `<div class="pnote">${esc(note)}</div>` : ''}
      <div class="prow"><button type="button" id="eReset">${esc(t.reset)}</button><button type="button" id="eClear">${esc(t.clear)}</button>
      <button type="button" id="eCancel">${esc(t.cancel)}</button><button type="button" class="primary" id="eStart">${esc(t.start)}</button></div>`;
    pal.querySelectorAll('.who').forEach(b => b.onclick = () => { edit.o = +b.dataset.o; render(); });
    pal.querySelectorAll('.kind').forEach(b => b.onclick = () => { edit.t = b.dataset.t; render(); });
    $('eReset').onclick = () => { edit.board = C.standardBoard(); edit.err = null; render(); };
    $('eClear').onclick = () => { edit.board = new Array(96).fill(null); edit.err = null; render(); };
    $('eCancel').onclick = () => { edit = null; render(); };
    $('eStart').onclick = () => {
      const bad = C.checkSetup(edit.board, save.rules), t2 = tr();
      if (bad) { edit.err = fill({ twoKings: t2.eTwoKings, noKing: t2.eNoKing, sides: t2.eSides, pawnRow: t2.ePawnRow }[bad.error], { n: bad.p != null ? nameOf(bad.p) : '' }); beep(200, 0.2); render(); return; }
      save.setup = edit.board; const b = edit.board; edit = null; startGame(b);
    };
  }
  function editTap(i) {
    const b = edit.board, cur = b[i]; edit.err = null;
    if (edit.t === 'x' || (cur && cur.o === edit.o && cur.t === edit.t)) b[i] = null;
    else {
      if (edit.t === 'k') for (let j = 0; j < 96; j++) if (b[j] && b[j].o === edit.o && b[j].t === 'k') b[j] = null; // one king each: it moves
      b[i] = { o: edit.o, t: edit.t };
    }
    beep(600, 0.04); render();
  }
  function openEditor() { edit = { board: (save.setup || C.standardBoard()).map(p => p && { o: p.o, t: p.t }), o: 0, t: 'q', err: null }; sel = null; moves = []; render(); }

  // ---- sounds (tiny clicks from Web Audio, started by a tap) ----
  let ac = null;
  function beep(freq, len) {
    if (!save.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + len);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + len);
    } catch (e) { /* no sound */ }
  }

  function doMove(m) {
    save.hist.push(st); if (save.hist.length > 300) save.hist.shift();
    const cap = !!st.board[m.to];
    st = C.move(st, m); sel = null; moves = []; animate = true;
    beep(cap ? 330 : 520, cap ? 0.25 : 0.12);
    if (st.events.some(e => e.type === 'check')) setTimeout(() => beep(880, 0.3), 150);
    persist(); render();
  }
  function tap(i) {
    if (over()) return;
    const ms = moves.filter(x => x.to === i);
    if (sel != null && ms.length) {
      if (ms.length > 1) return pickPromo(ms); // the player chooses what the pawn becomes
      return doMove(ms[0]);
    }
    const pc = st.board[i];
    if (pc && pc.o === st.turn && i !== sel) { sel = i; moves = C.legal(st, st.turn, i); beep(700, 0.05); }
    else { sel = null; moves = []; }
    render();
  }
  function persist() { save.game = st; store(); }

  // ---- dialogs ----
  const dlg = $('dlg'), card = $('dlgCard');
  function open(html, wire) { card.innerHTML = html; dlg.hidden = false; wire && wire(); const b = card.querySelector('button'); b && b.focus(); }
  const shut = () => { dlg.hidden = true; };
  dlg.addEventListener('pointerdown', e => { if (e.target === dlg) shut(); });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function startGame(board) { st = C.newGame(save.rules, board); st.custom = !!board; save.hist = []; sel = null; moves = []; shownEnd = false; persist(); render(); }
  function pickPromo(ms) {
    const t = tr(), o = st.turn;
    open(`<h2>${esc(t.pick)}</h2><div class="row promo">${ms.map(m => `<button type="button" class="kind o${o}" data-p="${m.promo}" aria-label="${esc(t.pieceName[m.promo])}"><span>${glyph(m.promo)}</span></button>`).join('')}</div>`,
      () => card.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { shut(); doMove(ms.find(m => m.promo === b.dataset.p)); }));
  }
  function showEnd() {
    const t = tr();
    open(`<div class="big">${st.winners != null ? esc(winText(t)) : esc(t.draw)}</div>
      <div class="row"><button id="dClose" type="button">${esc(t.close)}</button><button class="primary" id="dAgain" type="button">${esc(t.again)}</button></div>`,
    () => { $('dClose').onclick = shut; $('dAgain').onclick = () => { shut(); startGame(st.custom ? save.setup : null); }; });
  }
  $('new').onclick = () => {
    const t = tr();
    open(`<h2>${esc(t.sure)}</h2><div class="row"><button id="dNo" type="button">${esc(t.no)}</button>
      <button id="dCustom" type="button">${esc(t.custom)}</button><button class="primary" id="dYes" type="button">${esc(t.standard)}</button></div>`,
    () => { $('dNo').onclick = shut; $('dYes').onclick = () => { shut(); edit = null; startGame(); }; $('dCustom').onclick = () => { shut(); openEditor(); }; });
  };
  $('undo').onclick = () => {
    if (!save.hist.length || edit) return;
    st = fix(save.hist.pop()); sel = null; moves = []; shownEnd = over(); persist(); render();
  };

  // Rule switches (for the next game) and the short how-to-play.
  $('rules').onclick = () => {
    const t = tr(), R = Object.assign({}, C.RULES, save.rules);
    const box = (id, on, label) => `<label class="tog" for="${id}"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><span>${esc(label)}</span></label>`;
    const n = nameOf, teamOpts = TEAMS.map((tm, k) => {
      const lbl = !tm ? t.teamNone : (() => { const lone = tm.findIndex(x => tm.filter(y => y === x).length === 1), pair = [0, 1, 2].filter(x => x !== lone); return fill(t.teamVs, { a: n(pair[0]), b: n(pair[1]), c: n(lone) }); })();
      return `<option value="${k}">${esc(lbl)}</option>`;
    }).join('');
    open(`<h2>${esc(t.rulesFor)}</h2>
      <label for="rTeams">${esc(t.rTeams)}<select id="rTeams">${teamOpts}</select></label>
      ${box('rCentre', R.centreFork, t.rCentre)}${box('rCastling', R.castling, t.rCastling)}${box('rDouble', R.doubleStep, t.rDouble)}
      ${box('rEp', R.enPassant, t.rEp)}${box('rKingCap', R.kingCapture, t.rKingCap)}
      <label for="rPromo">${esc(t.rPromo)}<select id="rPromo"><option value="queen">${esc(t.promoQ)}</option><option value="choose">${esc(t.promoChoose)}</option></select></label>
      <label for="rMated">${esc(t.rMated)}<select id="rMated"><option value="remove">${esc(t.matedRemove)}</option><option value="freeze">${esc(t.matedFreeze)}</option></select></label>
      <div class="row"><button id="rSave" type="button">${esc(t.saveRules)}</button><button class="primary" id="rStart" type="button">${esc(t.saveStart)}</button></div>
      <h2>${esc(t.nowRules)}</h2><ul>${t.rulesText.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="row"><button id="rClose" type="button">${esc(t.close)}</button></div>`,
    () => {
      $('rTeams').value = String(Math.max(0, TEAMS.findIndex(x => JSON.stringify(x) === JSON.stringify(R.teams))));
      $('rPromo').value = R.promo; $('rMated').value = R.mated;
      const read = () => {
        save.rules = { centreFork: $('rCentre').checked, castling: $('rCastling').checked, doubleStep: $('rDouble').checked, enPassant: $('rEp').checked,
          kingCapture: $('rKingCap').checked, promo: $('rPromo').value, mated: $('rMated').value, teams: TEAMS[+$('rTeams').value] };
        store();
      };
      $('rSave').onclick = () => { read(); shut(); };
      $('rStart').onclick = () => { read(); shut(); edit = null; startGame(); };
      $('rClose').onclick = shut;
    });
  };
  $('settings').onclick = () => {
    const t = tr();
    open(`<h2>${esc(t.settings)}</h2>
      ${[0, 1, 2].map(p => `<label for="nm${p}">${esc(fill(t.nameOf, { k: p + 1 }))} (${esc(t.names[p])})<input id="nm${p}" maxlength="14" value="${esc(save.names[p] || '')}" placeholder="${esc(t.names[p])}"></label>`).join('')}
      <label for="vw">${esc(t.view)}<select id="vw">
        <option value="fixed">${esc(t.vFixed)}</option><option value="turn">${esc(t.vTurn)}</option><option value="table">${esc(t.vTable)}</option></select></label>
      <label for="lg">${esc(t.lang)}<select id="lg"><option value="en">English</option><option value="ru">Русский</option></select></label>
      <label for="snd">${esc(t.sound)}<select id="snd"><option value="1">✓</option><option value="0">✕</option></select></label>
      <div class="row"><button class="primary" id="dOk" type="button">${esc(t.close)}</button></div>`,
    () => {
      $('vw').value = save.view; $('lg').value = save.lang; $('snd').value = save.sound ? '1' : '0';
      $('dOk').onclick = () => {
        save.names = [0, 1, 2].map(p => $('nm' + p).value.trim() || null);
        save.view = $('vw').value; save.lang = $('lg').value; save.sound = $('snd').value === '1';
        store(); shut(); render();
      };
    });
  };

  // Keep the screen on during a game where the browser allows it.
  const wake = () => { try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* not allowed */ } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
  wake();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

  build(); layout();
  window.__chess3 = { get state() { return st; }, tap, get editing() { return !!edit; } };
})();
