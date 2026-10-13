# Wonderfold

**Fold. Punch. Unfold.** A paper-folding puzzle for the browser: watch a sheet get folded, see where it is punched, and pick what it looks like opened flat.

No account, no backend. Works offline once loaded.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm test` | Unit tests (engine + game logic) |
| `npm run test:e2e` | Playwright tests on desktop, tablet and two phone sizes (`npx playwright install chromium` first) |
| `npm run check` | Everything CI runs: types, lint, unit, build, e2e |
| `npm run assets` | Regenerate icons and the social card in `public/` |
| `npm run levels` | Re-pick the 50 campaign levels (rewrites `src/game/levels.data.ts`) |

## How it is built

```
src/engine/      Pure TypeScript puzzle engine. No DOM, no React.
  geometry.ts      points, affine transforms, polygon clipping
  fold.ts          the paper model: layers, folding, punching
  generator.ts     seeded puzzle generation and difficulty tuning
  distractors.ts   the three wrong answers
  frames.ts        what to draw at any moment of a fold animation
  workbench.ts     folding by hand: which creases are on offer, fold, flip, punch
  daily.ts         the date-seeded daily set
src/game/        Levels, scoring, saved progress, sharing, routing, translations
src/components/  SVG paper renderer, animation playback, the round UI
src/screens/     Home, level maps, classic play, reverse play, create, daily challenge
e2e/             Playwright tests
```

### The paper model

The folded paper is a stack of **layers**. Each layer is a convex piece of the original sheet plus the rigid motion that carries it to where it currently lies. Folding clips every layer along the crease and reflects the pieces on the moving side; punching finds every layer under the punch and maps the point back through that layer's motion to the original sheet.

Creases sit on grid lines or 45° diagonals through grid corners, so every coordinate is a multiple of 0.5 and the arithmetic is exact.

The same layers drive the animation: a flap rotating about its crease is drawn as a squash towards the crease, so the picture on screen is always the model, never a separate approximation.

### Wrong answers

Each distractor models a real reasoning slip: a forgotten fold, a crease or punch remembered one cell off, the whole pattern mirrored or rotated, one hole nudged, or a miscounted layer. Harder levels prefer look-alikes with the same number of holes.

### Correctness

`npm test` generates 1,500 puzzles per difficulty and checks each against an independent oracle that pushes every cell of the flat sheet *forwards* through the folds, sharing no code with the layer model. It also checks that the four options are distinct, in bounds, and that exactly one is right.

### Modes

- **Classic** (`#/levels`): watch the folds, pick the unfolded sheet out of four. A wrong answer does not reveal the solution; the player tries again.
- **Reverse** (`#/reverse`): the unfolded sheet is the question. The player clicks creases on the sheet (grid lines and 45° diagonals) to fold it, in the order clicked, then punches it and unfolds to compare. Undo, redo, start over, and "fold the other way" are always available. The number of punches is capped at the reference solution's, so the pattern cannot be made by punching every hole directly. Any fold sequence that produces the pattern counts.
- **Create** (`#/create`): the same folding tools on a blank 4×4 or 6×6 sheet. The result is packed into a link (`#/custom/4v2h2_23`) that opens as a classic four-choice puzzle, with wrong answers generated from the folds. No server involved.

### Levels

Classic and Reverse are each 50 fixed levels in five tiers of ten, numbered `1-0` to `5-9` and unlocked one at a time, with separate progress. They live as plain data in `src/game/levels.data.ts`, so they never change by accident. `npm run levels` picks them from the generator's output: distinct puzzles, spread from easiest to hardest by rating, with no puzzle shared between the two campaigns. Tiers 1–2 are 4×4 sheets, 3–4 are 6×6 with diagonals and second punches, tier 5 is the hard set. `npm test` checks every classic level against the oracle and replays every reverse level's solution through the same moves the player has.

## Tuning difficulty

Edit `DIFFICULTY_CONFIG` in `src/engine/generator.ts`: grid size, number of folds and punches, allowed hole count, and how likely half, off-centre and diagonal folds are. Changing it changes which puzzle a seed produces, including past daily sets. The campaign levels are unaffected until you run `npm run levels`.

## Links

- `/#/play/hard/12345` opens one specific puzzle, so puzzles can be shared.
- `/#/daily` is the daily challenge: five puzzles, the same for everyone on a given calendar day, one attempt.

## Deploying

`dist/` is a plain static site and can go on any static host. Build command `npm run build`, output directory `dist`.

Security and cache headers are declared twice, once per host format: `vercel.json` for Vercel, `public/_headers` for Cloudflare Pages and Netlify. Keep them in step.

Progress is stored in `localStorage` under `wonderfold:v1`.
