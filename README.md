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

## How it is built

```
src/engine/      Pure TypeScript puzzle engine. No DOM, no React.
  geometry.ts      points, affine transforms, polygon clipping
  fold.ts          the paper model: layers, folding, punching
  generator.ts     seeded puzzle generation and difficulty tuning
  distractors.ts   the three wrong answers
  frames.ts        what to draw at any moment of a fold animation
  daily.ts         the date-seeded daily set
src/game/        Scoring, saved progress, sharing, routing, translations
src/components/  SVG paper renderer, animation playback, the round UI
src/screens/     Home, free play, daily challenge
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

## Tuning difficulty

Edit `DIFFICULTY_CONFIG` in `src/engine/generator.ts`: grid size, number of folds and punches, allowed hole count, and how likely half, off-centre and diagonal folds are. Changing it changes which puzzle a seed produces, including past daily sets.

## Links

- `/#/play/hard/12345` opens one specific puzzle, so puzzles can be shared.
- `/#/daily` is the daily challenge: five puzzles, the same for everyone on a given calendar day, one attempt.

## Deploying

`dist/` is a plain static site and can go on any static host. Build command `npm run build`, output directory `dist`.

Security and cache headers are declared twice, once per host format: `vercel.json` for Vercel, `public/_headers` for Cloudflare Pages and Netlify. Keep them in step.

Progress is stored in `localStorage` under `wonderfold:v1`.
