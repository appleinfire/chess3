// Browser test: node tests/smoke.mjs  (Playwright + Chromium). Plays a few taps and takes screenshots.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'url';
import path from 'path';
const dir = path.dirname(fileURLToPath(import.meta.url)), url = 'file://' + path.join(dir, '..', 'index.html');
const out = process.env.SHOTS || path.join(dir, '..', 'shots');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/fonts|manifest|Failed to load/.test(m.text()) && errors.push(m.text()));
await page.goto(url);
await page.evaluate(() => localStorage.clear()); await page.reload();
const n = await page.locator('polygon.cell').count(); if (n !== 96) throw new Error('cells ' + n);
const pieces = await page.locator('g.piece').count(); if (pieces !== 48) throw new Error('pieces ' + pieces);
// White pawn e2 -> e4 by tapping cells (cell index = seg*32 + rank*8 + file).
const tapCell = async i => { const c = page.locator(`polygon.cell[data-i="${i}"]`); await c.dispatchEvent('pointerdown'); await c.dispatchEvent('pointerup'); };
await tapCell(12); const dots = await page.locator('.mark circle').count(); if (dots !== 2) throw new Error('dots ' + dots);
await tapCell(28);
let turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 1) throw new Error('turn ' + turn);
await tapCell(32 + 11); await tapCell(32 + 27); // Black d2-d4
turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 2) throw new Error('turn2 ' + turn);
await page.screenshot({ path: path.join(out, 'board.png') });
await page.click('#undo'); turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 1) throw new Error('undo');
// Rule switches: White + Black against Red, promotion by choice, frozen pieces; save and start.
await page.click('#rules'); await page.screenshot({ path: path.join(out, 'rules.png') });
await page.selectOption('#rTeams', '1'); await page.selectOption('#rPromo', 'choose'); await page.selectOption('#rMated', 'freeze'); await page.uncheck('#rCastling');
await page.click('#rStart');
let R = await page.evaluate(() => window.__chess3.state.rules);
if (JSON.stringify(R.teams) !== '[0,0,1]' || R.promo !== 'choose' || R.castling !== false || R.mated !== 'freeze') throw new Error('rules ' + JSON.stringify(R));
// Piece editor: Red plays without a queen.
await page.click('#new'); await page.click('#dCustom');
if (!await page.evaluate(() => window.__chess3.editing)) throw new Error('editor did not open');
await page.click('.who[data-o="2"]'); await page.click('.kind[data-t="x"]');
await tapCell(64 + 3); // Red's d1 queen
await page.click('.who[data-o="0"]'); await page.click('.kind[data-t="q"]'); await tapCell(18); // an extra White queen on c3
await page.screenshot({ path: path.join(out, 'editor.png') });
await page.click('#eStart');
let s = await page.evaluate(() => window.__chess3.state);
const count = o => s.board.filter(x => x && x.o === o).length;
if (count(2) !== 15 || count(0) !== 17 || s.board[67] || s.board[18].t !== 'q') throw new Error('custom start ' + count(0) + ' ' + count(2));
await page.screenshot({ path: path.join(out, 'teams.png') });
// A piece that can be captured is shown clearly: the cell is filled (class "cap"), not just ringed.
await page.click('#new'); await page.click('#dCustom'); await page.click('#eReset');
await page.click('.who[data-o="2"]'); await page.click('.kind[data-t="p"]'); await tapCell(19); // a Red pawn on White's d3 (Black is White's teammate here)
await page.click('#eStart'); await tapCell(12); // White's e2 pawn can take it
const caps = await page.locator('polygon.cap').count(); if (caps !== 1) throw new Error('capture cells ' + caps);
await page.screenshot({ path: path.join(out, 'capture.png') });
await tapCell(12);
// A bad setup is refused with a message.
await page.click('#new'); await page.click('#dCustom'); await page.click('#eClear'); await page.click('#eStart');
if (!await page.evaluate(() => window.__chess3.editing)) throw new Error('empty board was accepted');
const msg = await page.textContent('#status'); if (!/two sides/.test(msg)) throw new Error('msg ' + msg);
await page.click('#eCancel');
await page.click('#settings'); await page.selectOption('#vw', 'table'); await page.selectOption('#lg', 'ru'); await page.fill('#nm0', 'Masha'); await page.click('#dOk');
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, 'table-ru.png') });
// Phone held upright: board on its corner, player strip, icon toolbar, zoom and pan.
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } }); await p2.goto(url);
await p2.evaluate(() => localStorage.clear()); await p2.reload();
if (!await p2.evaluate(() => document.body.classList.contains('compact'))) throw new Error('phone layout not used');
if (!/rotate\(90deg\)/.test(await p2.getAttribute('#world', 'style'))) throw new Error('board not turned');
if (await p2.isHidden('#players')) throw new Error('no player strip');
const realTap = async (pg, i) => { const b = await pg.locator(`polygon.cell[data-i="${i}"]`).boundingBox(); await pg.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
await realTap(p2, 12); await realTap(p2, 28); // White e2-e4 with real taps
if (await p2.evaluate(() => window.__chess3.state.turn) !== 1) throw new Error('phone tap move');
const vb0 = (await p2.getAttribute('#board', 'viewBox')).split(' ').map(Number);
await p2.click('#zoomBtn');
const vb1 = (await p2.getAttribute('#board', 'viewBox')).split(' ').map(Number);
if (!(vb1[2] < vb0[2] * 0.6)) throw new Error('zoom ' + vb1);
await p2.screenshot({ path: path.join(out, 'phone-zoom.png') });
// Drag pans the zoomed board and does not count as a tap.
const sb = await p2.locator('#board').boundingBox();
await p2.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p2.mouse.down();
await p2.mouse.move(sb.x + sb.width / 2 + 60, sb.y + sb.height / 2 + 40, { steps: 5 }); await p2.mouse.up();
const vb2 = (await p2.getAttribute('#board', 'viewBox')).split(' ').map(Number);
if (vb2[0] === vb1[0] || await p2.evaluate(() => window.__chess3.state.turn) !== 1) throw new Error('pan');
await p2.click('#zoomBtn');
await p2.screenshot({ path: path.join(out, 'phone.png') });
// Turning the phone sideways goes back to the normal layout.
await p2.setViewportSize({ width: 844, height: 390 }); await p2.waitForTimeout(200);
if (await p2.evaluate(() => document.body.classList.contains('compact'))) throw new Error('landscape still compact');
if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('smoke: ok');
