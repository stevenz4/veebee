# veebee · Rotations Volley 3D

Learn volleyball rotations and **why a position fault is a fault**, on a 3D court.
5-1 system with a libero, FIVB rules. The interface is in French.

Live site: https://stevenz4.github.io/veebee/

## What you can do

- **Rotations**: the six rotations, receiving or serving, at the serve and after it. Play the rally to see who goes where.
- **Fautes**: find the player at fault in a random situation, then drag him back into his legal zone. A sandbox lets you move anyone.
- **Quiz**: pick your role, click where you stand. A wrong spot shows the broken rule as a red line on the court.

The key idea: each neighbour draws a line on the floor through his own feet. What is left between those lines is the
player's legal zone (green box). A red link between two players is a broken neighbour rule.

## Run it

Node 22.12 or later.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # rules, fault scenarios, rally plans, quiz grading
npm run build    # type check + production build in dist/
```

## How it is built

| Folder | Role |
| --- | --- |
| `src/domain` | Pure TypeScript: lineup, formations, FIVB 7.4 neighbour check, legal box, fault scenarios, scripted rally, quiz grading. Fully tested, no React or three.js. |
| `src/state` | Zustand store with every user action, plus `sim.ts`: the per-frame positions and tweens, kept out of React. |
| `src/scene` | React Three Fiber: hall, court, net, players, rule lines, legal box, camera, pointer input. Text on the court is drawn on canvases. |
| `src/ui` | The sidebar panels and the HUD over the court. |
| `reference/` | The single-file prototype this project was ported from. |

Stack: Vite, React 19, TypeScript, three.js with @react-three/fiber, Zustand, Vitest.

### The rules in code

FIVB rule 7.4 compares neighbours at the moment of the serve, by the position of their feet:

- **Depth**: 4 in front of 5, 3 in front of 6, 2 in front of 1.
- **Sides**: 4 left of 3, 3 left of 2, 5 left of 6, 6 left of 1.
- The server is free; when we serve, relations with zone 1 don't apply.
- The libero replaces the back-row central, except when that central serves.

`check()` in `src/domain/rules.ts` returns each relation and a sentence explaining every fault. `legalBox()` turns the same
relations into the green rectangle, and `nearestLegal()` gives the shortest way back into it.

## Deploy

Every push to `main` runs the tests, builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`).
One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The build uses a relative base path, so it works under any repository name.

## Debugging

`window.__veebee` exposes the store, the per-frame simulation, the formations and the three.js state, for the browser
console and automated checks. For example `__veebee.store.getState().turn()`.
