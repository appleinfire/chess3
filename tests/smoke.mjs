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
const tapCell = i => page.locator(`polygon.cell[data-i="${i}"]`).dispatchEvent('pointerdown');
await tapCell(12); const dots = await page.locator('.mark circle').count(); if (dots !== 2) throw new Error('dots ' + dots);
await tapCell(28);
let turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 1) throw new Error('turn ' + turn);
await tapCell(32 + 11); await tapCell(32 + 27); // Black d2-d4
turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 2) throw new Error('turn2 ' + turn);
await page.screenshot({ path: path.join(out, 'board.png') });
await page.click('#undo'); turn = await page.evaluate(() => window.__chess3.state.turn); if (turn !== 1) throw new Error('undo');
await page.click('#rules'); await page.screenshot({ path: path.join(out, 'rules.png') }); await page.click('#dOk');
await page.click('#settings'); await page.selectOption('#vw', 'table'); await page.selectOption('#lg', 'ru'); await page.fill('#nm0', 'Masha'); await page.click('#dOk');
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, 'table-ru.png') });
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } }); await p2.goto(url); await p2.screenshot({ path: path.join(out, 'phone.png') });
if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('smoke: ok');
