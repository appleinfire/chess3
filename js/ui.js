// Screens: draws the hexagonal board in SVG, handles taps, undo, names, settings. Rules are in rules.js.
(function () {
  'use strict';
  const C = window.Chess3, $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const KEY = 'chess3-v1';

  // ---- words (English and Russian) ----
  const T = {
    en: { title: 'Chess for Three', undo: 'Undo', 'new': 'New game', rules: 'Rules', settings: 'Settings',
      names: ['White', 'Black', 'Red'], toMove: '{n} to move', check: '{n}, your king is in check!',
      mate: '{n} is checkmated and out of the game.', king: '{b} took the king of {n}! {n} is out.',
      pass: '{n} has no moves and skips a turn.', promo: 'The pawn became a queen!', wins: '{n} wins!', draw: 'Draw!',
      sure: 'Start a new game?', yes: 'Yes, new game', no: 'Keep playing', close: 'Done', again: 'Play again',
      view: 'Board view', vFixed: 'Board stays still', vTurn: 'Board turns to the player to move', vTable: 'Pieces face their players',
      lang: 'Language', nameOf: 'Name of player {k}', sound: 'Sounds',
      rulesTitle: 'How to play', rulesText: [
        'Three players take turns: White, then Black, then Red.',
        'Pieces move like in normal chess. Tap a piece to see where it can go.',
        'Lines go across the middle into the other players’ parts of the board.',
        'A bishop that goes through the very centre can turn to either other player. It always stays on its colour.',
        'Pawns walk toward the centre, then into another player’s part. On that player’s first row a pawn becomes a queen.',
        'You may not leave your king in check. If you have no move to save it, you are checkmated and out.',
        'If someone leaves a king in check, the next player may take it!',
        'The last king on the board wins.'] },
    ru: { title: 'Шахматы на троих', undo: 'Назад', 'new': 'Новая игра', rules: 'Правила', settings: 'Настройки',
      names: ['Белые', 'Чёрные', 'Красные'], toMove: 'Ходят {n}', check: '{n}: шах королю!',
      mate: '{n}: мат, выбывают из игры.', king: '{b} съели короля! {n} выбывают.',
      pass: '{n}: нет ходов, пропуск.', promo: 'Пешка стала ферзём!', wins: 'Победили {n}!', draw: 'Ничья!',
      sure: 'Начать новую игру?', yes: 'Да, новая игра', no: 'Играть дальше', close: 'Готово', again: 'Играть ещё',
      view: 'Вид доски', vFixed: 'Доска стоит на месте', vTurn: 'Доска поворачивается к тому, чей ход', vTable: 'Фигуры смотрят на своих игроков',
      lang: 'Язык', nameOf: 'Имя игрока {k}', sound: 'Звуки',
      rulesTitle: 'Как играть', rulesText: [
        'Три игрока ходят по очереди: белые, потом чёрные, потом красные.',
        'Фигуры ходят как в обычных шахматах. Нажми на фигуру, и увидишь, куда она может пойти.',
        'Линии проходят через середину в части доски других игроков.',
        'Слон, проходящий через самый центр, может свернуть к любому из двух других игроков. Он всегда остаётся на своём цвете.',
        'Пешки идут к центру, а потом в часть другого игрока. На его первом ряду пешка становится ферзём.',
        'Нельзя оставлять своего короля под шахом. Если спасти его нечем, это мат, и игрок выбывает.',
        'Если кто-то оставил короля под шахом, следующий игрок может его съесть!',
        'Побеждает последний король на доске.'] }
  };

  // ---- saved data ----
  let save = { lang: (navigator.language || 'en').slice(0, 2) === 'ru' ? 'ru' : 'en', names: [null, null, null], view: 'fixed', sound: true, game: null, hist: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.game && s.game.board) save = Object.assign(save, s); } catch (e) { /* no storage */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* no storage */ } };
  let st = save.game || C.newGame(), sel = null, moves = [], animate = false;
  const tr = () => T[save.lang] || T.en;
  const nameOf = p => save.names[p] || tr().names[p];
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

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

  // Rotation of the whole board ("turn" view) and of each piece so it reads upright (or faces its owner).
  const worldRot = () => save.view === 'turn' ? 120 * st.turn : 0;
  const pieceRot = o => save.view === 'table' ? -120 * o : -worldRot();

  let world, cellsG, marksG, piecesG, labelsG;
  function build() {
    svg.textContent = '';
    world = el('g', { id: 'world' }, svg);
    el('polygon', { points: V.map(p => p.map(x => x * 1.035).join(',')).join(' '), fill: '#4a2f1b', stroke: '#d9a441', 'stroke-width': 0.006 }, world);
    cellsG = el('g', {}, world); marksG = el('g', { class: 'mark' }, world); piecesG = el('g', {}, world); labelsG = el('g', {}, world);
    for (let i = 0; i < 96; i++) {
      const c = el('polygon', { points: cellPoly[i].map(p => p.join(',')).join(' '), class: 'cell ' + ((C.fileOf(i) + C.rankOf(i)) % 2 ? 'l' : 'd'), 'data-i': i }, cellsG);
      c.addEventListener('pointerdown', e => { e.preventDefault(); tap(i); });
    }
    // Small file letters along each player's first row.
    for (let s = 0; s < 3; s++) for (let f = 0; f < 8; f++) {
      const i = C.idx(s, f, 0), q = kite(s, f >= 4), p = bil(q, (f % 4 + 0.5) / 4, -0.035);
      const g = el('g', { transform: `translate(${p[0]},${p[1]})` }, world);
      const t = el('text', { 'font-size': 0.034, fill: '#d9a441', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Alegreya Sans, sans-serif', transform: `rotate(${-120 * s})` }, g);
      t.textContent = 'abcdefgh'[f]; void i;
    }
  }

  function render() {
    const t = tr();
    document.documentElement.lang = save.lang;
    $('title').textContent = t.title; document.title = t.title;
    $('undo').textContent = t.undo; $('new').textContent = t['new']; $('rules').textContent = t.rules; $('settings').textContent = t.settings;
    $('undo').disabled = !save.hist.length;
    world.style.transform = `rotate(${worldRot()}deg)`;
    marksG.textContent = ''; piecesG.textContent = ''; labelsG.textContent = '';
    const poly = (i, attrs) => el('polygon', Object.assign({ points: cellPoly[i].map(p => p.join(',')).join(' ') }, attrs), marksG);
    if (st.last) { poly(st.last.from, { fill: 'rgba(217,164,65,.35)' }); poly(st.last.to, { fill: 'rgba(217,164,65,.5)' }); }
    for (let p = 0; p < 3; p++) if (st.alive[p] && C.inCheck(st, p)) {
      const k = st.board.findIndex(x => x && x.o === p && x.t === 'k'); poly(k, { fill: 'rgba(224,71,60,.75)' });
    }
    if (sel != null) poly(sel, { fill: 'rgba(120,200,120,.55)' });
    for (const m of moves) {
      const [x, y] = cellMid[m.to], r = cellSize[m.to];
      if (st.board[m.to]) el('circle', { cx: x, cy: y, r: r * 0.44, fill: 'none', stroke: 'rgba(40,140,60,.9)', 'stroke-width': r * 0.1 }, marksG);
      else el('circle', { cx: x, cy: y, r: r * 0.17, fill: 'rgba(30,110,50,.75)' }, marksG);
    }
    for (let i = 0; i < 96; i++) {
      const pc = st.board[i]; if (!pc) continue;
      const [x, y] = cellMid[i], sz = cellSize[i] * 0.95;
      const g = el('g', { class: 'piece', transform: `translate(${x},${y})`, 'data-i': i }, piecesG);
      const rg = el('g', { class: 'rot', style: `transform: rotate(${pieceRot(pc.o)}deg)` }, g);
      const tx = el('text', { class: 'o' + pc.o, 'font-size': sz, 'stroke-width': sz * 0.07, y: sz * 0.02 }, rg);
      tx.textContent = GLYPH[pc.t] + '︎';
    }
    // Player name plates outside each player's side, facing that player.
    for (let p = 0; p < 3; p++) {
      const m = M[2 * p], g = el('g', { class: 'label' + (p === st.turn && st.winner == null && !st.draw ? ' on' : '') + (st.alive[p] ? '' : ' out'),
        transform: `translate(${m[0] * 1.17},${m[1] * 1.17}) rotate(${-120 * p})` }, labelsG);
      const caps = st.captured[p].filter(x => x !== 'k').length, text = nameOf(p) + (caps ? '  +' + caps : '');
      const w = Math.max(0.42, text.length * 0.05 + 0.12);
      el('rect', { class: 'bg', x: -w / 2, y: -0.065, width: w, height: 0.13, rx: 0.065 }, g);
      el('circle', { cx: -w / 2 + 0.07, cy: 0, r: 0.032, class: 'o' + p, 'stroke-width': 0.006 }, g);
      const tx = el('text', { x: 0.03, 'font-size': 0.075, fill: '#f1e7d3' }, g); tx.textContent = text;
    }
    // Status line.
    const s = $('status'); s.className = 'status'; s.textContent = '';
    const chip = p => { const c = document.createElement('span'); c.className = 'chip'; c.style.background = ['var(--ivory)', 'var(--ebony)', 'var(--ruby)'][p]; s.appendChild(c); };
    const ev = (st.events || []).filter(e => e.type !== 'check');
    let msg = ev.map(e => fill(e.type === 'kingTaken' ? t.king : t[e.type], { n: nameOf(e.p), b: nameOf(e.by) })).join(' ');
    if (st.winner != null) { chip(st.winner); msg = (msg ? msg + ' ' : '') + fill(t.wins, { n: nameOf(st.winner) }); }
    else if (st.draw) msg = (msg ? msg + ' ' : '') + t.draw;
    else {
      chip(st.turn);
      const chk = C.inCheck(st, st.turn);
      msg = (msg ? msg + ' ' : '') + fill(chk ? t.check : t.toMove, { n: nameOf(st.turn) });
      if (chk) s.classList.add('alarm');
    }
    s.appendChild(document.createTextNode(msg));
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
    if ((st.winner != null || st.draw) && !shownEnd) { shownEnd = true; setTimeout(showEnd, 500); }
  }
  let shownEnd = st.winner != null || st.draw;

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

  function tap(i) {
    if (st.winner != null || st.draw) return;
    const m = moves.find(x => x.to === i);
    if (sel != null && m) {
      save.hist.push(st); if (save.hist.length > 300) save.hist.shift();
      const cap = !!st.board[m.to];
      st = C.move(st, m); sel = null; moves = []; animate = true;
      beep(cap ? 330 : 520, cap ? 0.25 : 0.12);
      if (st.events.some(e => e.type === 'check')) setTimeout(() => beep(880, 0.3), 150);
      persist(); render(); return;
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
  dlg.addEventListener('pointerdown', e => { if (e.target === dlg && !dlg.dataset.lock) shut(); });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function newGame() { st = C.newGame(); save.hist = []; sel = null; moves = []; shownEnd = false; persist(); render(); }
  function showEnd() {
    const t = tr();
    open(`<div class="big">${st.winner != null ? esc(fill(t.wins, { n: nameOf(st.winner) })) : esc(t.draw)}</div>
      <div class="row"><button id="dClose" type="button">${esc(t.close)}</button><button class="primary" id="dAgain" type="button">${esc(t.again)}</button></div>`,
    () => { $('dClose').onclick = shut; $('dAgain').onclick = () => { shut(); newGame(); }; });
  }
  $('new').onclick = () => {
    const t = tr();
    open(`<h2>${esc(t.sure)}</h2><div class="row"><button id="dNo" type="button">${esc(t.no)}</button><button class="primary" id="dYes" type="button">${esc(t.yes)}</button></div>`,
      () => { $('dNo').onclick = shut; $('dYes').onclick = () => { shut(); newGame(); }; });
  };
  $('undo').onclick = () => {
    if (!save.hist.length) return;
    st = save.hist.pop(); sel = null; moves = []; shownEnd = st.winner != null || st.draw; persist(); render();
  };
  $('rules').onclick = () => {
    const t = tr();
    open(`<h2>${esc(t.rulesTitle)}</h2><ul>${t.rulesText.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="row"><button class="primary" id="dOk" type="button">${esc(t.close)}</button></div>`, () => { $('dOk').onclick = shut; });
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

  build(); render();
  window.__chess3 = { get state() { return st; }, tap };
})();
