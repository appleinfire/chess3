// Three-player chess rules on the 96-cell hexagonal board. No DOM here, so tests can run it in Node.
//
// Board model: three segments (one per player), each 8 files (a-h) x 4 ranks (1-4) = 32 cells.
// A cell index is seg*32 + rank*8 + file (file and rank from 0). Each player starts on ranks 1-2 of
// their own segment. Rank 4 is where segments meet:
//   files a-d of player p border files h-e of the previous player (p-1), rank 4 to rank 4;
//   files e-h of player p border files d-a of the next player (p+1).
// So walking "up" past your rank 4 you enter a neighbour's segment walking "down" toward their rank 1.
// The six cells d4/e4 of all players meet at the centre. A diagonal through the centre forks:
// from d4 it continues to the d4 of both other players (then c3, b2, a1); from e4 to both other e4s.
// That keeps every bishop on its own colour.
(function (root) {
  'use strict';
  const C = {};
  const mod3 = x => ((x % 3) + 3) % 3;
  const idx = (s, f, r) => s * 32 + r * 8 + f;
  const segOf = i => i >> 5, fileOf = i => i & 7, rankOf = i => (i >> 3) & 3;
  const BACK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ALL = ORTHO.concat(DIAG);
  Object.assign(C, { idx, segOf, fileOf, rankOf, ORTHO, DIAG });

  // One step from cell i in direction (df, dr) given in that cell's segment coordinates.
  // Returns a list of [cell, df, dr]: the direction is re-expressed in the new cell's segment.
  // Empty list = off the board; two entries = a diagonal through the centre.
  function step(i, df, dr) {
    const s = segOf(i), f = fileOf(i), r = rankOf(i), nf = f + df, nr = r + dr;
    if (nr < 0 || nf < 0 || nf > 7) return [];
    if (nr <= 3) return [[idx(s, nf, nr), df, dr]];
    const left = f < 4;
    if (df === 0) return [[idx(left ? mod3(s - 1) : mod3(s + 1), 7 - f, 3), 0, -1]];
    if (left === (nf < 4)) return [[idx(left ? mod3(s - 1) : mod3(s + 1), 7 - nf, 3), -df, -1]];
    // Through the centre (from d4 going right-up, or e4 going left-up).
    return [mod3(s + 1), mod3(s + 2)].map(q => f === 3 ? [idx(q, 3, 3), -1, -1] : [idx(q, 4, 3), 1, -1]);
  }
  C.step = step;

  const near = new Array(96), knightT = new Array(96);
  for (let i = 0; i < 96; i++) {
    const n = new Set();
    for (const [a, b] of ALL) for (const [t] of step(i, a, b)) n.add(t);
    near[i] = [...n];
    // Knight: one straight step, then one diagonal step that keeps going the same way (or the other order).
    const k = new Set();
    for (const [a, b] of ORTHO) for (const [c, x, y] of step(i, a, b))
      for (const [p, q] of (x ? [[x, 1], [x, -1]] : [[1, y], [-1, y]])) for (const [t] of step(c, p, q)) k.add(t);
    for (const [a, b] of DIAG) for (const [c, x, y] of step(i, a, b))
      for (const [p, q] of [[x, 0], [0, y]]) for (const [t] of step(c, p, q)) k.add(t);
    k.delete(i); for (const t of near[i]) k.delete(t);
    knightT[i] = [...k];
  }
  C.near = near; C.knight = knightT;

  function slide(board, i, dirs, once, o, out) {
    for (const [df, dr] of dirs) {
      let front = [[i, df, dr]]; const seen = new Set([i]);
      while (front.length) {
        const next = [];
        for (const [c, a, b] of front) for (const st of step(c, a, b)) {
          const t = st[0]; if (seen.has(t)) continue; seen.add(t);
          const q = board[t];
          if (!q) { out.push(t); if (!once) next.push(st); } else if (q.o !== o) out.push(t);
        }
        front = next;
      }
    }
  }

  // Cells the piece on i can move to, ignoring checks and castling. attack=true: cells it attacks
  // (for pawns that is the two forward diagonals, empty or not).
  function targets(board, i, attack) {
    const pc = board[i]; if (!pc) return [];
    const out = [];
    switch (pc.t) {
      case 'k': for (const t of near[i]) if (!board[t] || board[t].o !== pc.o) out.push(t); break;
      case 'n': for (const t of knightT[i]) if (!board[t] || board[t].o !== pc.o) out.push(t); break;
      case 'r': slide(board, i, ORTHO, false, pc.o, out); break;
      case 'b': slide(board, i, DIAG, false, pc.o, out); break;
      case 'q': slide(board, i, ALL, false, pc.o, out); break;
      case 'p': {
        const fd = segOf(i) === pc.o ? 1 : -1;
        for (const df of [1, -1]) for (const [t] of step(i, df, fd))
          if (attack || (board[t] && board[t].o !== pc.o)) out.push(t);
        if (attack) break;
        const f1 = step(i, 0, fd)[0];
        if (f1 && !board[f1[0]]) {
          out.push(f1[0]);
          if (segOf(i) === pc.o && rankOf(i) === 1) { const f2 = step(f1[0], 0, 1)[0]; if (f2 && !board[f2[0]]) out.push(f2[0]); }
        }
        break;
      }
    }
    return [...new Set(out)];
  }
  C.targets = targets;

  C.newGame = function () {
    const board = new Array(96).fill(null);
    for (let s = 0; s < 3; s++) for (let f = 0; f < 8; f++) {
      board[idx(s, f, 0)] = { o: s, t: BACK[f] };
      board[idx(s, f, 1)] = { o: s, t: 'p' };
    }
    return { board, turn: 0, alive: [true, true, true], out: [null, null, null], captured: [[], [], []],
      last: null, events: [], winner: null, draw: false, moves: 0 };
  };

  const kingOf = (board, o) => board.findIndex(p => p && p.o === o && p.t === 'k');
  function attacked(board, cell, byWho) {
    for (let j = 0; j < 96; j++) { const p = board[j]; if (p && byWho(p.o) && targets(board, j, true).includes(cell)) return true; }
    return false;
  }
  C.attacked = attacked;
  C.inCheck = (st, o) => { const k = kingOf(st.board, o); return k >= 0 && attacked(st.board, k, x => x !== o && st.alive[x]); };

  function play(board, m) { // returns a new board
    const b = board.slice(), pc = b[m.from];
    b[m.to] = { ...pc, m: 1 }; b[m.from] = null;
    if (m.rook != null) { b[m.rookTo] = { ...b[m.rook], m: 1 }; b[m.rook] = null; }
    if (pc.t === 'p' && rankOf(m.to) === 0 && segOf(m.to) !== pc.o) b[m.to].t = 'q';
    return b;
  }

  // All legal moves of player o: a move may not leave o's own king attacked by a player still in the game.
  function legal(st, o, from) {
    const res = [], foes = x => x !== o && st.alive[x];
    const list = from == null ? [...Array(96).keys()] : [from];
    for (const i of list) {
      const pc = st.board[i]; if (!pc || pc.o !== o) continue;
      const cand = targets(st.board, i, false).map(to => ({ from: i, to }));
      if (pc.t === 'k' && !pc.m && i === idx(o, 4, 0) && !attacked(st.board, i, foes)) {
        for (const [rf, path, kTo, rTo] of [[7, [5, 6], 6, 5], [0, [3, 2, 1], 2, 3]]) {
          const r = st.board[idx(o, rf, 0)];
          if (!r || r.o !== o || r.t !== 'r' || r.m) continue;
          if (path.some(f => st.board[idx(o, f, 0)])) continue;
          if (path.slice(0, 2).some(f => attacked(st.board, idx(o, f, 0), foes))) continue; // the king may not cross an attacked cell
          cand.push({ from: i, to: idx(o, kTo, 0), rook: idx(o, rf, 0), rookTo: idx(o, rTo, 0) });
        }
      }
      for (const m of cand) {
        const b = play(st.board, m), k = kingOf(b, o);
        if (!attacked(b, k, foes)) res.push(m);
      }
    }
    return res;
  }
  C.legal = legal;

  function eliminate(st, o, why) {
    st.alive[o] = false; st.out[o] = why;
    for (let j = 0; j < 96; j++) if (st.board[j] && st.board[j].o === o) st.board[j] = null;
  }

  // Make move m for the player to move. Returns the new state (the old one is not changed).
  C.move = function (st0, m) {
    const st = JSON.parse(JSON.stringify(st0));
    const me = st.turn, pc = st.board[m.from], cap = st.board[m.to];
    st.events = [];
    st.board = play(st.board, m);
    if (cap) {
      st.captured[me].push(cap.t);
      if (cap.t === 'k') { eliminate(st, cap.o, 'king'); st.events.push({ type: 'kingTaken', p: cap.o, by: me }); }
    }
    if (pc.t === 'p' && st.board[m.to].t === 'q') st.events.push({ type: 'promo', p: me });
    st.last = { from: m.from, to: m.to }; st.moves++;
    advance(st);
    return st;
  };

  function onlyKings(st) { return st.board.every(p => !p || p.t === 'k'); }

  // Pass the turn on: skip players who are out, knock out a player who is checkmated,
  // let a stalemated player pass. Ends the game when one player is left.
  function advance(st) {
    let passes = 0;
    for (let guard = 0; guard < 9; guard++) {
      const left = [0, 1, 2].filter(x => st.alive[x]);
      if (left.length <= 1) { st.winner = left[0]; return; }
      if (onlyKings(st)) { st.draw = true; return; }
      let p = st.turn; do p = mod3(p + 1); while (!st.alive[p]);
      st.turn = p;
      if (legal(st, p).length) { if (C.inCheck(st, p)) st.events.push({ type: 'check', p }); return; }
      if (C.inCheck(st, p)) { eliminate(st, p, 'mate'); st.events.push({ type: 'mate', p }); passes = 0; continue; }
      st.events.push({ type: 'pass', p });
      if (++passes >= left.length) { st.draw = true; return; }
    }
  }

  // Square names like "Wd4" for tests and debugging.
  C.name = i => 'WBR'[segOf(i)] + 'abcdefgh'[fileOf(i)] + (rankOf(i) + 1);
  C.cell = n => idx('WBR'.indexOf(n[0]), 'abcdefgh'.indexOf(n[1]), +n[2] - 1);

  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.Chess3 = C;
})(typeof window !== 'undefined' ? window : globalThis);
