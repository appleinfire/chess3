// Draws the app icons: node tools/icons.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(), p = await b.newPage();
const pts = r => [0, 1, 2, 3, 4, 5].map(k => { const a = (120 - 60 * k) * Math.PI / 180; return `${r * Math.cos(a)},${r * Math.sin(a)}`; }).join(' ');
for (const s of [180, 192, 512]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<body style="margin:0;background:#1f2a24"><svg width="${s}" height="${s}" viewBox="-1 -1 2 2">
    <polygon points="${pts(0.82)}" fill="#e9cf9f" stroke="#d9a441" stroke-width="0.05"/>
    <polygon points="${pts(0.82)}" fill="none" stroke="#9a6a3f" stroke-width="0.02" transform="scale(0.6)"/>
    <text x="0" y="0.06" font-size="0.9" text-anchor="middle" dominant-baseline="central" fill="#1c1a19" font-family="DejaVu Sans">♞︎</text>
    <circle cx="-0.62" cy="0.62" r="0.11" fill="#f7f0e1" stroke="#3b2a18" stroke-width="0.03"/>
    <circle cx="0.62" cy="0.62" r="0.11" fill="#c8262c" stroke="#3a0b0d" stroke-width="0.03"/>
    <circle cx="0" cy="-0.86" r="0.11" fill="#1c1a19" stroke="#efe3c9" stroke-width="0.03"/></svg></body>`);
  await p.screenshot({ path: `icons/icon-${s}.png` });
}
await b.close();
