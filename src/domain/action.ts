// "Jouer l'action": a scripted rally as a timeline (seconds), independent of any rendering.
import { F, OPP, PLAYERS, SERVE_SPOT, TARGET } from './data';
import { isFront, onCourt, zoneOf, zonesOnCourt } from './rules';
import type { PlayerId, RotationId, Situation, Vec2 } from './types';

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export type Vec3 = [number, number, number];

/** Key-framed path on the floor; segments are eased. */
export class Track {
  k: { t: number; x: number; z: number }[];
  constructor(x: number, z: number) {
    this.k = [{ t: 0, x, z }];
  }
  move(t0: number, t1: number, x: number, z: number): this {
    const l = this.k[this.k.length - 1];
    this.k.push({ t: t0, x: l.x, z: l.z }, { t: t1, x, z });
    return this;
  }
  at(t: number): Vec2 {
    const k = this.k;
    if (t <= k[0].t) return [k[0].x, k[0].z];
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i], span = b.t - a.t;
        const e = ease(span > 0 ? (t - a.t) / span : 1);
        return [a.x + (b.x - a.x) * e, a.z + (b.z - a.z) * e];
      }
    }
    const l = k[k.length - 1];
    return [l.x, l.z];
  }
}

/** Quadratic Bézier flight of the ball between two contacts. */
export interface BallSeg { t0: number; t1: number; p0: Vec3; c: Vec3; p1: Vec3 }
export interface Jump { id?: PlayerId; opp?: number; t0: number; t1: number; h: number }
export interface ActionPlan {
  T: Partial<Record<PlayerId, Track>>;
  OT: Track[];
  jumps: Jump[];
  ball: BallSeg[];
  caps: [number, string][];
  dur: number;
}

export function bez(s: BallSeg, u: number): Vec3 {
  const v = 1 - u;
  return [0, 1, 2].map((i) => v * v * s.p0[i] + 2 * v * u * s.c[i] + u * u * s.p1[i]) as Vec3;
}

export function ballAt(plan: ActionPlan, t: number): Vec3 {
  const seg = plan.ball.find((s) => t >= s.t0 && t <= s.t1);
  if (seg) return bez(seg, (t - seg.t0) / (seg.t1 - seg.t0));
  return t < plan.ball[0].t0 ? plan.ball[0].p0 : plan.ball[plan.ball.length - 1].p1;
}

export function captionAt(plan: ActionPlan, t: number): string {
  let cap = '';
  for (const [t0, text] of plan.caps) if (t >= t0) cap = text;
  return cap;
}

/** Height of a jump at time t (sine arc), 0 when not jumping. */
export function jumpHeight(j: Jump, t: number): number {
  return t < j.t0 || t > j.t1 ? 0 : j.h * Math.sin((Math.PI * (t - j.t0)) / (j.t1 - j.t0));
}

export function buildAction(rot: RotationId, sit: Situation): ActionPlan {
  const f = F[rot][sit], zm = zonesOnCourt(rot, sit), on = onCourt(zm);
  const front = (id: PlayerId) => isFront(zoneOf(zm, id));
  const T: Partial<Record<PlayerId, Track>> = {};
  const jumps: Jump[] = [], ball: BallSeg[] = [], caps: [number, string][] = [];
  for (const id of on) { const p = f.service[id]!; T[id] = new Track(p[0], p[1]); }
  const OT = OPP[sit].map((p) => new Track(p[0], p[1]));
  const seg = (t0: number, t1: number, p0: Vec3, c: Vec3, p1: Vec3) => ball.push({ t0, t1, p0, c, p1 });
  const oh = on.find((id) => (id === 'R41' || id === 'R42') && front(id))!;
  const mc = on.find((id) => (id === 'C1' || id === 'C2') && front(id))!;
  const tg = TARGET;
  const jeu = (id: PlayerId) => f.jeu[id]!;
  let dur: number;

  if (sit === 'recoit') {
    const TS = 0.55, TP = 1.65, TSET = 2.6, THIT = 3.45, TL = 3.8;
    dur = 4.7;
    for (const id of on) {
      const j = jeu(id), tr = T[id]!;
      if (id === oh) {
        tr.move(TP, TP + 0.85, j[0], j[1]).move(TSET + 0.1, THIT, -3.3, 1.0);
        jumps.push({ id, t0: THIT - 0.42, t1: THIT + 0.38, h: 0.85 });
      } else if (id === 'R41' || id === 'R42' || id === 'L') {
        tr.move(TP + 0.05, TP + 0.95, j[0], j[1]);
      } else if (id === 'P') {
        tr.move(TS, TS + 1.0, j[0], j[1]);
      } else if (id === mc) {
        tr.move(TS + 0.1, TS + 0.9, j[0], j[1]).move(TP + 0.35, TSET, 0.45, 1.0);
        jumps.push({ id, t0: TSET - 0.3, t1: TSET + 0.35, h: 0.8 });
      } else {
        tr.move(TS + 0.1, TS + 1.0, j[0], j[1]);
      }
    }
    const sv = OPP.recoit[0], lp = f.service.L!;
    const rc: Vec3 = [lp[0], 0.85, lp[1]], hit: Vec3 = [sv[0], 3.35, sv[1] + 0.25];
    const st: Vec3 = [tg[0], 2.75, tg[1] + 0.1], ap: Vec3 = [-3.3, 3.2, 0.6], land: Vec3 = [1.9, 0.11, -6.3];
    seg(0, TS, [sv[0] - 0.34, 1.02, sv[1] + 0.12], [sv[0] - 0.1, 3.9, sv[1] + 0.2], hit);
    seg(TS, TP, hit, [(sv[0] + rc[0]) / 2, 4.8, (sv[1] + rc[2]) / 2], rc);
    seg(TP, TSET, rc, [(rc[0] + st[0]) / 2, 6.2, (rc[2] + st[2]) / 2], st);
    seg(TSET, THIT, st, [-1.0, 5.4, 0.65], ap);
    seg(THIT, TL, ap, [-0.7, 2.4, -2.8], land);
    seg(TL, TL + 0.6, land, [2.25, 1.3, -7.35], [2.6, 0.11, -8.4]);
    OT[0].move(TS + 0.2, TS + 1.5, -2.4, -7.0);
    OT[1].move(2.75, 3.2, -3.3, -0.45);
    OT[2].move(2.75, 3.2, -2.45, -0.45);
    jumps.push({ opp: 1, t0: 3.25, t1: 3.8, h: 0.75 }, { opp: 2, t0: 3.25, t1: 3.8, h: 0.75 });
    caps.push([0, 'Service adverse'], [TS, 'Frappe : le passeur file à la cible'], [TP, 'Réception du libéro'],
      [TSET, `Passe vers ${PLAYERS[oh].code} à gauche`], [THIT - 0.15, 'Attaque !'], [TL + 0.25, 'Point pour nous']);
  } else {
    const S0 = 0.6, SR = 1.7, SSET = 2.65, SHIT = 3.5, SD = 3.85, SE = 4.75;
    dur = 5.35;
    const server = zm[1];
    const rf = on.find((id) => (id === 'P' || id === 'PT') && front(id))!;
    const d5 = on.find((id) => jeu(id)[0] < -2 && jeu(id)[1] > 5)!;
    for (const id of on) {
      const j = jeu(id);
      if (id === server) T[id]!.move(S0 + 0.15, S0 + 1.45, j[0], j[1]);
      else T[id]!.move(S0 + 0.05, S0 + 1.0, j[0], j[1]);
    }
    T[rf]!.move(2.85, 3.25, 3.35, 0.45);
    T[mc]!.move(2.85, 3.25, 2.55, 0.45);
    jumps.push({ id: rf, t0: 3.3, t1: 3.85, h: 0.75 }, { id: mc, t0: 3.3, t1: 3.85, h: 0.75 });
    T[d5]!.move(3.45, 3.8, -2.75, 6.55);
    T.P!.move(rf === 'P' ? 3.95 : 3.8, 4.6, tg[0], tg[1] + 0.2);
    const sp = SERVE_SPOT, shit: Vec3 = [sp[0], 3.45, sp[1] - 0.25];
    const orc: Vec3 = [OPP.sert[1][0], 0.85, OPP.sert[1][1]];
    const ost: Vec3 = [-1.3, 2.75, -0.75], oap: Vec3 = [3.25, 3.2, -0.6], dig: Vec3 = [-2.75, 0.85, 6.55];
    seg(0, S0, [sp[0] + 0.34, 1.02, sp[1] - 0.12], [sp[0] + 0.1, 4.0, sp[1] - 0.2], shit);
    seg(S0, SR, shit, [(sp[0] + orc[0]) / 2, 4.8, (sp[1] + orc[2]) / 2], orc);
    seg(SR, SSET, orc, [-0.65, 6.0, -3.5], ost);
    seg(SSET, SHIT, ost, [1.0, 5.3, -0.65], oap);
    seg(SHIT, SD, oap, [0.25, 2.5, 2.9], dig);
    seg(SD, SE, dig, [-0.7, 6.2, 3.7], [tg[0], 2.85, tg[1] + 0.25]);
    OT[2].move(SR + 0.1, SSET, 3.6, -3.4).move(SSET + 0.1, SHIT, 3.25, -1.0);
    jumps.push({ opp: 2, t0: SHIT - 0.42, t1: SHIT + 0.38, h: 0.85 });
    OT[3].move(SR, SR + 0.6, -1.3, -0.7);
    caps.push([0, 'Notre service'], [S0, 'Frappe : chacun permute vers son poste'], [SR, 'Réception adverse'],
      [SSET, 'Passe adverse'], [3.2, 'Contre à deux'], [SD, 'Défense en zone 5'], [SE - 0.15, 'Contre-attaque']);
  }
  return { T, OT, jumps, ball, caps, dur };
}
