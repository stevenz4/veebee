// Per-frame simulation: where every body is right now. Plain mutable data, read and written
// inside the render loop, so animation never goes through React.
import type { ActionPlan } from '../domain/action';
import { ease } from '../domain/action';
import { BENCH, F, IDS, OPP } from '../domain/data';
import type { PlayerId, RelationResult, Vec2 } from '../domain/types';

export const reducedMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Tween { fx: number; fz: number; tx: number; tz: number; t0: number; dur: number }
export interface Body { x: number; z: number; y: number; tw: Tween | null }

const body = (p: Vec2): Body => ({ x: p[0], z: p[1], y: 0, tw: null });

export const sim = {
  players: Object.fromEntries(IDS.map((id) => [id, body(F.P1.recoit.service[id] ?? BENCH)])) as Record<PlayerId, Body>,
  opps: OPP.recoit.map(body),
  ball: { visible: false, x: 0, y: 1, z: 0 },
  action: null as { plan: ActionPlan; t0: number } | null,
  /** The seven neighbour links drawn this frame: null when hidden. */
  links: [] as (RelationResult | null)[],
  badIds: new Set<PlayerId>(),
};

/** Ease a body to (x, z) in dur seconds, after an optional delay. */
export function moveTo(b: Body, x: number, z: number, dur = 0.7, delay = 0) {
  if (reducedMotion) { dur = 0.01; delay = 0; }
  b.tw = { fx: b.x, fz: b.z, tx: x, tz: z, t0: performance.now() + delay * 1000, dur: Math.max(10, dur * 1000) };
}

export function teleport(b: Body, x: number, z: number) {
  b.tw = null;
  b.x = x;
  b.z = z;
}

export function stepTweens(now: number) {
  for (const b of [...Object.values(sim.players), ...sim.opps]) {
    if (!b.tw) continue;
    const t = (now - b.tw.t0) / b.tw.dur;
    if (t < 0) continue;
    const k = ease(Math.min(1, t));
    b.x = b.tw.fx + (b.tw.tx - b.tw.fx) * k;
    b.z = b.tw.fz + (b.tw.tz - b.tw.fz) * k;
    if (t >= 1) b.tw = null;
  }
}

export const livePos = (id: PlayerId): Vec2 => [sim.players[id].x, sim.players[id].z];
