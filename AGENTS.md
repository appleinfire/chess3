# Chess for Three: notes for coding agents

Read README.md first: it describes every rule. Plain HTML/CSS/JS, no framework, no npm dependencies, no build step for the site.

- Rules live in `js/rules.js` (switches in `RULES`, each one tested in `tests/rules.test.js`) (no DOM, tested in Node); screens in `js/ui.js`; styles in `index.html`.
- Before every commit: `node tests/rules.test.js` and `python3 tools/single.py` (rebuilds `dist/chess3.html`, never edit it by hand).
  Browser test: `node tests/smoke.mjs` (Playwright + Chromium).
- When app files change, bump the cache name in `sw.js`.
- Text the players see is short and simple, in English and Russian (`T` in `js/ui.js`). Update README.md when a rule changes.
- Work on a branch and open a pull request into `main`.
