// Three-player chess rules on the 96-cell hexagonal board. No DOM here, so tests can run it in Node.
//
// Board model: three segments (one per player), each 8 files (a-h) x 4 ranks (1-4) = 32 cells.
// A cell index is seg*32 + rank*8 + file (file and rank from 0). Each player starts on ranks 1-2 of
// their own segment. Rank 4 is where segments meet:
//   files a-d of player p border files h-e of the previous player (p-1), rank 4 to rank 4;
//   files e-h of player p border files d-a of the next player (p+1).
// So walking "up" past your rank 4 you enter a neighbour's segment walking "down" toward their rank 1.
// The six cells d4/e4 of all players meet at the centre. With the centre fork on, a diagonal through the
// centre forks: from d4 it continues to the d4 of both other players (then c3, b2, a1); from e4 to both
// other e4s. That keeps every bishop on its own colour. With it off, diagonals stop at the centre point.
//
// Rule switches live in state.rules (see RULES); a game can also start from any custom position.
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

  // The switchable rules and their defaults.
  //   centreFork: diagonals through the centre fork to both other players (off: they stop there).
  //   castling, doubleStep (pawn's first move may be two cells), enPassant (only the very next player may take).
  //   promo: 'queen' (a pawn always becomes a queen) or 'choose' (the player picks).
  //   kingCapture: a king left in check may be taken by the next player (off: kings are never taken).
  //   mated: 'remove' (a player who is out loses all pieces) or 'freeze' (the pieces stay, cannot move or attack,
  //          and can be captured).
  //   teams: null (everyone for themselves) or a team number per player, e.g. [0, 0, 1] = White and Black vs Red.
  //          Teammates do not capture or check each other; a team wins when no other team has a king left.
  const RULES = { centreFork: true, castling: true, doubleStep: true, enPassant: false, promo: 'queen',
    kingCapture: true, mated: 'remove', teams: null };
  C.RULES = RULES;
  const rulesOf = st => Object.assign({}, RULES, st.rules || {});
  const teamOf = (R, o) => R.teams ? R.teams[o] : o;
  const friend = (R, a, b) => teamOf(R, a) === teamOf(R, b);
  C.teamOf = teamOf;

  // One step from cell i in direction (df, dr) given in that cell's segment coordinates.
  // Returns a list of [cell, df, dr]: the direction is re-expressed in the new cell's segment.
  // Empty list = off the board; two entries = a diagonal through the centre.
  function step(i, df, dr, fork = true) {
    const s = segOf(i), f = fileOf(i), r = rankOf(i), nf = f + df, nr = r + dr;
    if (nr < 0 || nf < 0 || nf > 7) return [];
    if (nr <= 3) return [[idx(s, nf, nr), df, dr]];
    const left = f < 4;
    if (df === 0) return [[idx(left ? mod3(s - 1) : mod3(s + 1), 7 - f, 3), 0, -1]];
    if (left === (nf < 4)) return [[idx(left ? mod3(s - 1) : mod3(s + 1), 7 - nf, 3), -df, -1]];
    if (!fork) return [];
    // Through the centre (from d4 going right-up, or e4 going left-up).
    return [mod3(s + 1), mod3(s + 2)].map(q => f === 3 ? [idx(q, 3, 3), -1, -1] : [idx(q, 4, 3), 1, -1]);
  }
  C.step = step;

  // King-step and knight-jump tables, with the centre fork on [1] and off [0].
  const near = [[], []], knightT = [[], []];
  for (const fk of [0, 1]) for (let i = 0; i < 96; i++) {
    const n = new Set(), sp = (c, a, b) => step(c, a, b, !!fk);
    for (const [a, b] of ALL) for (const [t] of sp(i, a, b)) n.add(t);
    near[fk][i] = [...n];
    // Knight: one straight step, then one diagonal step that keeps going the same way (or the other order).
    const k = new Set();
    for (const [a, b] of ORTHO) for (const [c, x, y] of sp(i, a, b))
      for (const [p, q] of (x ? [[x, 1], [x, -1]] : [[1, y], [-1, y]])) for (const [t] of sp(c, p, q)) k.add(t);
    for (const [a, b] of DIAG) for (const [c, x, y] of sp(i, a, b))
      for (const [p, q] of [[x, 0], [0, y]]) for (const [t] of sp(c, p, q)) k.add(t);
    k.delete(i); for (const t of n) k.delete(t);
    knightT[fk][i] = [...k];
  }
  C.near = near[1]; C.knight = knightT[1]; C.tables = { near, knight: knightT };

  // Cells the piece on i can move to, ignoring checks and castling. attack=true: cells it attacks
  // (for pawns that is the two forward diagonals, empty or not). board defaults to st.board.
  function targets(st, i, attack, board = st.board) {
    const pc = board[i]; if (!pc) return [];
    const R = rulesOf(st), fk = R.centreFork ? 1 : 0, out = [];
    const open = t => !board[t] || !friend(R, board[t].o, pc.o);
    const slide = dirs => {
      for (const [df, dr] of dirs) {
        let front = [[i, df, dr]]; const seen = new Set([i]);
        while (front.length) {
          const next = [];
          for (const [c, a, b] of front) for (const s of step(c, a, b, !!fk)) {
            const t = s[0]; if (seen.has(t)) continue; seen.add(t);
            if (!board[t]) { out.push(t); next.push(s); } else if (open(t)) out.push(t);
          }
          front = next;
        }
      }
    };
    switch (pc.t) {
      case 'k': for (const t of near[fk][i]) if (open(t)) out.push(t); break;
      case 'n': for (const t of knightT[fk][i]) if (open(t)) out.push(t); break;
      case 'r': slide(ORTHO); break;
      case 'b': slide(DIAG); break;
      case 'q': slide(ALL); break;
      case 'p': {
        const fd = segOf(i) === pc.o ? 1 : -1;
        for (const df of [1, -1]) for (const [t] of step(i, df, fd, !!fk)) {
          if (attack || (board[t] && open(t))) out.push(t);
          else if (R.enPassant && st.ep && st.ep.skip === t && !board[t] && !friend(R, st.ep.o, pc.o)) out.push(t);
        }
        if (attack) break;
        const f1 = step(i, 0, fd)[0];
        if (f1 && !board[f1[0]]) {
          out.push(f1[0]);
          if (R.doubleStep && segOf(i) === pc.o && rankOf(i) === 1) { const f2 = step(f1[0], 0, 1)[0]; if (f2 && !board[f2[0]]) out.push(f2[0]); }
        }
        break;
      }
    }
    return [...new Set(out)];
  }
  C.targets = targets;

  C.standardBoard = function () {
    const board = new Array(96).fill(null);
    for (let s = 0; s < 3; s++) for (let f = 0; f < 8; f++) { board[idx(s, f, 0)] = { o: s, t: BACK[f] }; board[idx(s, f, 1)] = { o: s, t: 'p' }; }
    return board;
  };

  // What is wrong with a custom position, or null if it can be played. Each player in the game needs
  // exactly one king (a player with no pieces at all simply does not play); pawns may not stand on
  // another player's first row (they would already be queens); at least two sides must play.
  C.checkSetup = function (board, rules) {
    const R = Object.assign({}, RULES, rules || {});
    for (let o = 0; o < 3; o++) {
      const mine = board.filter(p => p && p.o === o), kings = mine.filter(p => p.t === 'k').length;
      if (kings > 1) return { error: 'twoKings', p: o };
      if (mine.length && !kings) return { error: 'noKing', p: o };
    }
    for (let i = 0; i < 96; i++) { const p = board[i]; if (p && p.t === 'p' && rankOf(i) === 0 && segOf(i) !== p.o) return { error: 'pawnRow', p: p.o }; }
    const sides = new Set([0, 1, 2].filter(o => board.some(p => p && p.o === o && p.t === 'k')).map(o => teamOf(R, o)));
    if (sides.size < 2) return { error: 'sides' };
    return null;
  };

  // A new game: the standard start, or a custom board (pieces on their starting squares may still castle).
  C.newGame = function (rules, board) {
    const st = { board: (board || C.standardBoard()).map(p => p && { o: p.o, t: p.t }), turn: 2, rules: Object.assign({}, RULES, rules || {}),
      alive: [0, 1, 2].map(o => (board || C.standardBoard()).some(p => p && p.o === o && p.t === 'k')),
      out: [null, null, null], captured: [[], [], []], last: null, ep: null, events: [], winners: null, draw: false, moves: 0 };
    for (let o = 0; o < 3; o++) if (!st.alive[o]) st.out[o] = 'none';
    advance(st);
    return st;
  };

  const kingOf = (board, o) => board.findIndex(p => p && p.o === o && p.t === 'k');
  // Is cell attacked by a piece whose owner passes byWho? (Frozen pieces never attack: pass alive players only.)
  function attacked(st, board, cell, byWho) {
    for (let j = 0; j < 96; j++) { const p = board[j]; if (p && byWho(p.o) && targets(st, j, true, board).includes(cell)) return true; }
    return false;
  }
  C.attacked = (st, cell, byWho) => attacked(st, st.board, cell, byWho);
  const foesOf = (st, o) => { const R = rulesOf(st); return x => st.alive[x] && !friend(R, x, o); };
  C.inCheck = (st, o) => { const k = kingOf(st.board, o); return st.alive[o] && k >= 0 && attacked(st, st.board, k, foesOf(st, o)); };

  function play(st, board, m) { // returns a new board
    const b = board.slice(), pc = b[m.from];
    const R = rulesOf(st);
    // En passant: a pawn steps onto the cell an enemy pawn just skipped, and that pawn is taken.
    if (R.enPassant && pc.t === 'p' && st.ep && m.to === st.ep.skip && !b[m.to] && !friend(R, pc.o, st.ep.o)) b[st.ep.pawn] = null;
    b[m.to] = { ...pc, m: 1 }; b[m.from] = null;
    if (m.rook != null) { b[m.rookTo] = { ...b[m.rook], m: 1 }; b[m.rook] = null; }
    if (pc.t === 'p' && rankOf(m.to) === 0 && segOf(m.to) !== pc.o) b[m.to].t = m.promo || 'q';
    return b;
  }

  // All legal moves of player o: a move may not leave o's own king attacked by a player still in the game.
  function legal(st, o, from) {
    const R = rulesOf(st), res = [], foes = foesOf(st, o);
    const list = from == null ? [...Array(96).keys()] : [from];
    for (const i of list) {
      const pc = st.board[i]; if (!pc || pc.o !== o) continue;
      let cand = targets(st, i, false).map(to => ({ from: i, to }));
      if (!R.kingCapture) cand = cand.filter(m => { const q = st.board[m.to]; return !(q && q.t === 'k' && st.alive[q.o]); });
      if (pc.t === 'p') cand = cand.flatMap(m => rankOf(m.to) === 0 && segOf(m.to) !== o
        ? (R.promo === 'choose' ? ['q', 'r', 'b', 'n'] : ['q']).map(promo => ({ ...m, promo })) : [m]);
      if (R.castling && pc.t === 'k' && !pc.m && i === idx(o, 4, 0) && !attacked(st, st.board, i, foes)) {
        for (const [rf, path, kTo, rTo] of [[7, [5, 6], 6, 5], [0, [3, 2, 1], 2, 3]]) {
          const r = st.board[idx(o, rf, 0)];
          if (!r || r.o !== o || r.t !== 'r' || r.m) continue;
          if (path.some(f => st.board[idx(o, f, 0)])) continue;
          if (path.slice(0, 2).some(f => attacked(st, st.board, idx(o, f, 0), foes))) continue; // the king may not cross an attacked cell
          cand.push({ from: i, to: idx(o, kTo, 0), rook: idx(o, rf, 0), rookTo: idx(o, rTo, 0) });
        }
      }
      for (const m of cand) {
        const b = play(st, st.board, m), k = kingOf(b, o);
        if (!attacked(st, b, k, foes)) res.push(m);
      }
    }
    return res;
  }
  C.legal = legal;

  function eliminate(st, o, why) {
    st.alive[o] = false; st.out[o] = why;
    if (rulesOf(st).mated === 'remove') for (let j = 0; j < 96; j++) if (st.board[j] && st.board[j].o === o) st.board[j] = null;
  }

  // Make move m for the player to move. Returns the new state (the old one is not changed).
  C.move = function (st0, m) {
    const st = JSON.parse(JSON.stringify(st0));
    const me = st.turn, pc = st.board[m.from];
    let cap = st.board[m.to];
    st.events = [];
    const before = st.board;
    st.board = play(st, st.board, m);
    if (!cap && pc.t === 'p' && st.ep && m.to === st.ep.skip && before[st.ep.pawn] && !st.board[st.ep.pawn]) cap = before[st.ep.pawn];
    if (cap) {
      st.captured[me].push(cap.t);
      if (cap.t === 'k' && st.alive[cap.o]) { eliminate(st, cap.o, 'king'); st.events.push({ type: 'kingTaken', p: cap.o, by: me }); }
    }
    if (pc.t === 'p' && st.board[m.to].t !== 'p') st.events.push({ type: 'promo', p: me, t: st.board[m.to].t });
    // En passant is possible only for the next move, after a two-cell pawn step.
    st.ep = pc.t === 'p' && segOf(m.from) === me && rankOf(m.from) === 1 && segOf(m.to) === me && rankOf(m.to) === 3
      ? { skip: idx(me, fileOf(m.from), 2), pawn: m.to, o: me } : null;
    st.last = { from: m.from, to: m.to }; st.moves++;
    advance(st);
    return st;
  };

  // Pass the turn on: skip players who are out, knock out a player who is checkmated,
  // let a stalemated player pass. Ends the game when one side is left.
  function advance(st) {
    const R = rulesOf(st);
    let passes = 0;
    for (let guard = 0; guard < 9; guard++) {
      const left = [0, 1, 2].filter(x => st.alive[x]), sides = new Set(left.map(x => teamOf(R, x)));
      if (sides.size <= 1) { const t = teamOf(R, left[0]); st.winners = [0, 1, 2].filter(x => left.length && teamOf(R, x) === t && (R.teams || st.alive[x])); return; }
      if (st.board.every(p => !p || p.t === 'k' || !st.alive[p.o])) { st.draw = true; return; }
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
