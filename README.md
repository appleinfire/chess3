# Chess for Three

Three-player chess for one shared iPad (or any browser). The board is the classic hexagon of 96 cells.
It is a static web page with no server and no accounts. The game is saved on the device, so you can close it and come back later.

## Play

- Open the GitHub Pages site in Safari on the iPad, tap **Share → Add to Home Screen**. It then opens full screen and works offline.
- Or open `dist/chess3.html`: the same game in one file.
- Tap one of your pieces: green dots show where it can go, rings show what it can capture. Tap a dot to move.
- **Undo** takes back moves one at a time (handy for kids). **New game** offers the normal start or **Set up pieces**.
- **Rules** switches rules on and off for the next game (see "Rule switches" below) and has a short how-to-play.
- **On a phone held upright** the board lies on its corner (turned 90°) so it fills the tall screen, the player names move to a strip
  above the board, and the toolbar shows icons (↶ undo, + new game, ? rules, ⚙ settings). Turned sideways, or on an iPad, the layout is the normal one.
- **Zoom**: the ⤢ button in the phone strip zooms in on the side of the player to move; ⤡ shows the whole board again.
  Anywhere (also on the iPad) two fingers pinch to zoom, and one finger drags the zoomed board. A tap counts only if the finger did not move.
- **Settings**: player names, language (English / Russian), sounds, and the board view:
  - *Board stays still*: all pieces are upright for someone sitting at the bottom.
  - *Board turns to the player to move*: the board rotates so the player whose turn it is sees their side at the bottom.
  - *Pieces face their players*: for three people sitting around an iPad lying flat on the table.

## The board

The hexagon is made of three parts, one per player. Each part has 8 files (a–h) and 4 rows (1–4) = 32 cells, so 96 in total.
Each player starts on rows 1–2 of their own part, set up like normal chess (queen on d1, king on e1).

The parts meet along row 4:

- files a–d of a player touch files h–e of the player on their left (a4 next to h4, d4 next to e4);
- files e–h touch files d–a of the player on their right.

So a straight line that goes "up" past your row 4 goes on into a neighbour's part, going down toward their row 1. For example, your d-file
continues into the left neighbour's e-file. The six cells d4 and e4 of all three players meet at the centre.

## Rules

- Turns go White → Black → Red.
- Pieces move as in normal chess, along the lines of the board.
- **Through the centre.** A diagonal that runs into the centre point forks: from d4 it can go on to the d4 of either other player
  (then c3, b2, a1 of that player); from e4 to either other e4. That way a bishop always stays on its own colour.
  A king or a pawn capturing through the centre uses the same rule.
- **Knights** jump one cell straight and then one cell diagonally onward (the usual L), following the lines across the seams.
- **Pawns** move toward the centre. When they cross row 4 into another player's part, they keep going toward that player's row 1.
  The first move from row 2 may be two cells. On the first row of another player a pawn becomes a queen.
  En passant is off unless switched on (see "Rule switches").
- **Castling** as in normal chess: king and rook have not moved, the cells between are empty, the king is not in check and does not cross an attacked cell.
- **Check.** You may not make a move that leaves your king attacked by any other player.
- **Checkmate.** If on your turn your king is in check and you have no legal move, you are out. Your pieces leave the board (or stay frozen, if switched) and the other two play on.
- **Taking a king.** If someone leaves a king in check (for example, the previous player put it there), the next player may capture it. That player is out.
- **No moves but not in check**: you skip your turn.
- **The end.** The last player with a king wins. If only kings are left, or nobody can move, it is a draw.

## Rule switches

Under **Rules**, for the next game (the defaults are the rules above):

| Switch | Default | When changed |
| --- | --- | --- |
| Teams | everyone for themselves | two players against the third: teammates cannot capture or check each other, and they win together when the third player is out (even if one of them was knocked out earlier). The pair has a ★ by their names. |
| Diagonals fork through the centre | on | off: diagonals stop at the centre point. |
| Castling | on | off: no castling. |
| Pawn two-cell first step | on | off: pawns always step one cell. |
| En passant | off | on: right after a pawn steps two cells, the next player may take it as if it stepped one. |
| A king left in check can be taken | on | off: kings are never taken; a player must still get out of check on their turn. |
| A pawn at the end becomes | always a queen | the player picks a queen, rook, bishop or knight. |
| When a player is out | their pieces leave the board | their pieces stay, frozen: they do not move or attack, and anyone may capture them. |

## Set up pieces (custom start)

**New game → Set up pieces** opens the editor with the last custom position (or the normal start).
Pick a player and a piece, then tap cells; tap the same piece again to remove it, or use **Remove**.
Placing a king moves that player's king (one king each). **Empty board** and **Normal start** reset the board.
Examples: give a stronger player a handicap (no queen, no rooks), or play two players against one with fewer pieces for the pair.

**Start the game** checks the position: each player with pieces needs exactly one king, pawns may not stand on another
player's first row, and at least two sides must have a king. A player with no pieces at all simply sits out, so two can play on the big board.
Kings and rooks standing on their starting cells may still castle. **Play again** at the end of a custom game starts the same position again.

## Project layout

- `index.html`: page, styles, toolbar.
- `js/rules.js`: all the rules (board model, moves, check, mate). No DOM, so the tests run it in Node.
- `js/ui.js`: the SVG board, taps, undo, settings, English and Russian text.
- `sw.js`, `manifest.webmanifest`, `icons/`: home-screen app and offline copy. Bump the cache name in `sw.js` when app files change.
- `tools/single.py`: builds `dist/chess3.html` (one file). `tools/icons.mjs` draws the icons.
- `tests/rules.test.js`: rules tests (`node tests/rules.test.js`). `tests/smoke.mjs`: browser test with Playwright.

Deploy: `.github/workflows/pages.yml` runs the tests and publishes the site on every push to `main`
(in the repository settings, Pages → Source must be **GitHub Actions**).
