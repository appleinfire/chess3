// Rules tests: node tests/rules.test.js
const assert = require('assert');
const C = require('../js/rules.js');
let n = 0; const t = (name, fn) => { fn(); n++; };
const c = C.cell, nm = C.name;
const empty = () => { const s = C.newGame(); s.board = new Array(96).fill(null); return s; };
const put = (s, cell, o, tp, moved) => { s.board[c(cell)] = { o, t: tp, ...(moved ? { m: 1 } : {}) }; };
const tg = (s, cell) => C.targets(s.board, c(cell), false).map(nm).sort();

t('every step can be walked back', () => {
  for (let i = 0; i < 96; i++) for (const [a, b] of C.ORTHO.concat(C.DIAG)) for (const [j, x, y] of C.step(i, a, b))
    assert(C.step(j, -x, -y).some(([k]) => k === i), `${nm(i)} ${a},${b} -> ${nm(j)} has no way back`);
});

t('diagonals keep their colour, straight steps change it', () => {
  const col = i => (C.fileOf(i) + C.rankOf(i)) % 2;
  for (let i = 0; i < 96; i++) {
    for (const [a, b] of C.DIAG) for (const [j] of C.step(i, a, b)) assert.strictEqual(col(i), col(j), nm(i) + '>' + nm(j));
    for (const [a, b] of C.ORTHO) for (const [j] of C.step(i, a, b)) assert.notStrictEqual(col(i), col(j));
  }
});

t('the seams: rank 4 meets the neighbours, the centre forks', () => {
  assert.deepStrictEqual(C.step(c('Wd4'), 0, 1).map(([j]) => nm(j)), ['Re4']);
  assert.deepStrictEqual(C.step(c('We4'), 0, 1).map(([j]) => nm(j)), ['Bd4']);
  assert.deepStrictEqual(C.step(c('Wa4'), 0, 1).map(([j]) => nm(j)), ['Rh4']);
  assert.deepStrictEqual(C.step(c('Wd4'), 1, 1).map(([j]) => nm(j)).sort(), ['Bd4', 'Rd4']);
  assert.deepStrictEqual(C.step(c('We4'), -1, 1).map(([j]) => nm(j)).sort(), ['Be4', 'Re4']);
  assert.deepStrictEqual(C.step(c('Wc4'), 1, 1).map(([j]) => nm(j)), ['Re4']);
  assert.strictEqual(C.step(c('Wa1'), 0, -1).length, 0);
  assert.strictEqual(C.step(c('Wa3'), -1, 0).length, 0);
});

t('every cell has 3 to 8 king neighbours, centre cells more', () => {
  for (let i = 0; i < 96; i++) assert(C.near[i].length >= 3 && C.near[i].length <= 9, nm(i) + ' ' + C.near[i].length);
  assert.strictEqual(C.near[c('Wa1')].length, 3);
  assert.strictEqual(C.near[c('Wc2')].length, 8);
  assert.strictEqual(C.near[c('Wd4')].length, 9); // 8 plus the extra centre diagonal
});

t('knights: normal in the open, jump over the seams', () => {
  assert.strictEqual(C.knight[c('Wd2')].length, 6); // c4, e4, b1, f1, b3, f3
  assert.deepStrictEqual(C.knight[c('Wb1')].map(nm).sort(), ['Wa3', 'Wc3', 'Wd2']);
  for (let i = 0; i < 96; i++) assert(C.knight[i].length >= 2, nm(i));
  // From c3, two up and one right lands across rank 4 in Red's segment.
  assert(C.knight[c('Wc3')].map(nm).includes('Re4'));
});

t('opening position: 20 moves for each player, 16 pieces each', () => {
  const s = C.newGame();
  for (let p = 0; p < 3; p++) { assert.strictEqual(C.legal(s, p).length, 20); assert.strictEqual(s.board.filter(x => x && x.o === p).length, 16); }
});

t('a rook runs down a file into the neighbour segment', () => {
  const s = empty(); put(s, 'Wd1', 0, 'r');
  const r = tg(s, 'Wd1');
  assert(r.includes('Re4') && r.includes('Re1') && r.includes('Wa1') && r.includes('Wh1'));
  assert.strictEqual(r.length, 3 + 4 + 3 + 4); // up own d, down Red's e, along rank 1
});

t('a bishop through the centre can go to both other players', () => {
  const s = empty(); put(s, 'Wa1', 0, 'b');
  const r = tg(s, 'Wa1');
  for (const x of ['Wb2', 'Wd4', 'Bd4', 'Ba1', 'Rd4', 'Ra1']) assert(r.includes(x), x);
});

t('pawns go forward, then down through the neighbour and become queens', () => {
  const s = empty(); put(s, 'Wd2', 0, 'p');
  assert.deepStrictEqual(tg(s, 'Wd2'), ['Wd3', 'Wd4']);
  const s2 = empty(); put(s2, 'Wd4', 0, 'p', 1);
  assert.deepStrictEqual(tg(s2, 'Wd4'), ['Re4']);
  const s3 = empty(); put(s3, 'Re2', 0, 'p', 1); put(s3, 'Wh1', 0, 'k'); put(s3, 'Be1', 1, 'k'); put(s3, 'Ra1', 2, 'k');
  const s4 = C.move(s3, { from: c('Re2'), to: c('Re1') });
  assert.strictEqual(s4.board[c('Re1')].t, 'q');
  // Captures are diagonal and forward, across the seam too.
  const s5 = empty(); put(s5, 'We4', 0, 'p', 1); put(s5, 'Bc4', 1, 'n'); put(s5, 'Be4', 1, 'n');
  assert.deepStrictEqual(tg(s5, 'We4'), ['Bc4', 'Bd4', 'Be4']); // two captures (one through the centre) and a step
});

t('castling both ways, not through check', () => {
  const s = empty(); put(s, 'We1', 0, 'k'); put(s, 'Wa1', 0, 'r'); put(s, 'Wh1', 0, 'r'); put(s, 'Ba1', 1, 'k'); put(s, 'Ra1', 2, 'k');
  const ks = C.legal(s, 0, c('We1')).map(m => nm(m.to));
  assert(ks.includes('Wg1') && ks.includes('Wc1'));
  const s2 = C.move(s, C.legal(s, 0, c('We1')).find(m => nm(m.to) === 'Wg1'));
  assert.strictEqual(s2.board[c('Wf1')].t, 'r');
  put(s, 'Wf4', 1, 'r'); // Black rook watches f1
  const ks2 = C.legal(s, 0, c('We1')).map(m => nm(m.to));
  assert(!ks2.includes('Wg1') && ks2.includes('Wc1'));
});

t('you may not leave your king in check, from either opponent', () => {
  const s = empty(); put(s, 'We1', 0, 'k'); put(s, 'We2', 0, 'n'); put(s, 'Bd4', 2, 'r'); put(s, 'Ba1', 1, 'k'); put(s, 'Ra1', 2, 'k');
  // Red rook on Black's d4 looks down Black's d file into White's e file: the knight is pinned.
  assert.strictEqual(C.legal(s, 0, c('We2')).length, 0);
});

t('a mated player is out and the last one standing wins', () => {
  // Red queen to b2, guarded by the rook on b4: White's king in the corner has no way out.
  const m = empty(); m.turn = 2;
  put(m, 'Wa1', 0, 'k'); put(m, 'Wc2', 2, 'q'); put(m, 'Wb4', 2, 'r'); put(m, 'Bh1', 1, 'k'); put(m, 'Rh1', 2, 'k');
  const m2 = C.move(m, { from: c('Wc2'), to: c('Wb2') });
  assert.strictEqual(m2.alive[0], false); assert.strictEqual(m2.out[0], 'mate');
  assert.strictEqual(m2.turn, 1); assert.strictEqual(m2.winner, null);
});

t('capturing a king (left in check by someone else) knocks that player out', () => {
  const s = empty(); s.turn = 1;
  put(s, 'Wa1', 0, 'k'); put(s, 'Wa3', 1, 'r'); put(s, 'Bh1', 1, 'k'); put(s, 'Rh1', 2, 'k');
  const s2 = C.move(s, { from: c('Wa3'), to: c('Wa1') });
  assert.strictEqual(s2.alive[0], false); assert.strictEqual(s2.out[0], 'king');
  assert.strictEqual(s2.turn, 2);
  // With White out, Black mates Red and wins.
  const w = empty(); w.turn = 1; w.alive = [false, true, true];
  put(w, 'Bh1', 1, 'k'); put(w, 'Ra1', 2, 'k'); put(w, 'Rb3', 1, 'q'); put(w, 'Rb4', 1, 'r');
  const w2 = C.move(w, { from: c('Rb3'), to: c('Rb2') });
  assert.strictEqual(w2.winner, 1);
});

t('only kings left is a draw', () => {
  const s3 = empty(); put(s3, 'Wa1', 0, 'k'); put(s3, 'Bh1', 1, 'k'); put(s3, 'Rh1', 2, 'k'); put(s3, 'Wb2', 1, 'n');
  // White takes the knight.
  const kn = C.legal(s3, 0).find(m => nm(m.to) === 'Wb2');
  assert(kn); assert(C.move(s3, kn).draw);
});

t('a random game never breaks the rules engine', () => {
  let seed = 7; const rnd = k => (seed = (seed * 1103515245 + 12345) % 2147483648) % k;
  for (let g = 0; g < 6; g++) {
    let s = C.newGame();
    for (let ply = 0; ply < 300 && s.winner == null && !s.draw; ply++) {
      const ms = C.legal(s, s.turn); assert(ms.length > 0, 'player to move must have a move');
      s = C.move(s, ms[rnd(ms.length)]);
      for (let p = 0; p < 3; p++) assert.strictEqual(s.alive[p], s.board.some(x => x && x.o === p && x.t === 'k'));
    }
  }
});

console.log('rules: ' + n + ' tests passed');
