import { F, IDS, LINEUP, ORDER, PLAYERS, RELATIONS } from './data';
import { ZONES } from './types';
import type {
  Bound, CheckResult, Fault, FaultScenario, Formation, LegalBox, PlayerId, PosOf, RelationResult,
  RotationId, Situation, Vec2, Zone, ZoneMap,
} from './types';

const isCentral = (id: PlayerId) => id === 'C1' || id === 'C2';

/** Who stands in each zone. The libero replaces the back-row central, except while that central serves. */
export function zonesOnCourt(rot: RotationId, sit: Situation): ZoneMap {
  const zm: ZoneMap = { ...LINEUP[rot] };
  for (const z of [1, 5, 6] as Zone[]) {
    if (isCentral(zm[z]) && !(sit === 'sert' && z === 1)) zm[z] = 'L';
  }
  return zm;
}

export const zoneOf = (zm: ZoneMap, id: PlayerId): Zone | 0 => ZONES.find((z) => zm[z] === id) ?? 0;
export const onCourt = (zm: ZoneMap): PlayerId[] => ZONES.map((z) => zm[z]);
export const isFront = (z: number) => z >= 2 && z <= 4;

export function offCourt(rot: RotationId, sit: Situation): PlayerId {
  const on = onCourt(zonesOnCourt(rot, sit));
  return IDS.find((id) => !on.includes(id)) ?? 'L';
}

function relMsg(r: RelationResult): string {
  const a = `${PLAYERS[r.ida].code} (zone ${r.a})`;
  const b = `${PLAYERS[r.idb].code} (zone ${r.b})`;
  return r.type === 'depth' ? `${a} doit être devant ${b}, plus près du filet.` : `${a} doit être à gauche de ${b}.`;
}

/** The seven neighbour relations at the moment of the serve (FIVB 7.4), feet on court, and the server's zone. */
export function check(rot: RotationId, sit: Situation, posOf: PosOf): CheckResult {
  const zm = zonesOnCourt(rot, sit);
  const serving = sit === 'sert';
  const rels: RelationResult[] = [];
  const faults: Fault[] = [];
  for (const r of RELATIONS) {
    const ida = zm[r.a], idb = zm[r.b];
    const exempt = serving && (r.a === 1 || r.b === 1);
    const pa = posOf(ida), pb = posOf(idb);
    const ok = exempt || (r.type === 'depth' ? pa[1] < pb[1] : pa[0] < pb[0]);
    const rel: RelationResult = { ...r, ida, idb, ok, exempt };
    rels.push(rel);
    if (!ok) faults.push({ kind: 'rel', ids: [ida, idb], msg: relMsg(rel) });
  }
  for (const z of ZONES) {
    const id = zm[z], p = posOf(id), code = PLAYERS[id].code;
    if (serving && z === 1) {
      if (!(p[1] >= 9 && Math.abs(p[0]) <= 4.5)) {
        faults.push({ kind: 'server', ids: [id], msg: `${code} sert : il doit être derrière la ligne de fond, entre les prolongements des lignes de côté.` });
      }
    } else if (Math.abs(p[0]) > 4.55 || p[1] < -0.05 || p[1] > 9.05) {
      faults.push({ kind: 'out', ids: [id], msg: `${code} (zone ${z}) doit avoir les pieds dans le terrain au moment du service.` });
    }
  }
  return { zm, rels, faults };
}

/**
 * Legal rectangle of one player at the serve. Each neighbour draws a line through his own feet;
 * the player must stay on the right side of every line, and inside the court.
 */
export function legalBox(rot: RotationId, sit: Situation, id: PlayerId, posOf: PosOf): LegalBox | null {
  const zm = zonesOnCourt(rot, sit);
  const z = zoneOf(zm, id);
  if (!z) return null;
  const serving = sit === 'sert';
  const server = serving && z === 1;
  const p = posOf(id);
  const lim = { xmin: -4.5, xmax: 4.5, zmin: server ? 9 : 0, zmax: server ? 12.5 : 9 };
  const bounds: Bound[] = [];
  if (!server) {
    for (const r of RELATIONS) {
      if (r.a !== z && r.b !== z) continue;
      const oz = r.a === z ? r.b : r.a;
      if (serving && oz === 1) continue;
      const axis = r.type === 'depth' ? 'z' : 'x';
      const side = r.a === z ? 'max' : 'min';
      const i = axis === 'z' ? 1 : 0;
      const value = posOf(zm[oz])[i];
      const key = (axis + side) as keyof typeof lim;
      lim[key] = side === 'max' ? Math.min(lim[key], value) : Math.max(lim[key], value);
      bounds.push({ axis, side, value, ref: zm[oz], refZone: oz, ok: side === 'max' ? p[i] < value : p[i] > value });
    }
  }
  const inCourt = server
    ? p[1] >= 9 && Math.abs(p[0]) <= 4.5
    : Math.abs(p[0]) <= 4.5 && p[1] >= 0 && p[1] <= 9;
  return {
    ...lim, bounds, zone: z, server, inCourt,
    empty: lim.xmin >= lim.xmax || lim.zmin >= lim.zmax,
    ok: inCourt && bounds.every((b) => b.ok),
  };
}

const BOUND_WORD = { 'z-max': 'Devant', 'z-min': 'Derrière', 'x-max': 'À gauche de', 'x-min': 'À droite de' } as const;

export function boundText(b: Bound, withZone = false): string {
  return `${BOUND_WORD[`${b.axis}-${b.side}`]} ${PLAYERS[b.ref].code}${withZone ? ` (zone ${b.refZone})` : ''}`;
}

/** Closest spot inside the legal rectangle, kept m metres away from its edges. */
export function nearestLegal(box: LegalBox | null, p: Vec2, m: number): Vec2 | null {
  if (!box || box.empty) return null;
  const mx = Math.min(m, (box.xmax - box.xmin) / 2);
  const mz = Math.min(m, (box.zmax - box.zmin) / 2);
  return [
    Math.max(box.xmin + mx, Math.min(box.xmax - mx, p[0])),
    Math.max(box.zmin + mz, Math.min(box.zmax - mz, p[1])),
  ];
}

export const metres = (n: number) => n.toFixed(1).replace('.', ',');

export function fixText(from: Vec2, to: Vec2): string {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const d = metres(Math.hypot(dx, dz));
  if (Math.abs(dz) >= Math.abs(dx)) return `${dz > 0 ? 'Recule' : 'Avance'} de ${d} m`;
  return `Décale-toi de ${d} m à ${dx > 0 ? 'droite' : 'gauche'}`;
}

/** "Trouve la faute": one player crosses exactly one neighbour line, by a plausible distance (under 2 m). */
export function allFaultScenarios(): FaultScenario[] {
  const out: FaultScenario[] = [];
  for (const rot of ORDER) {
    for (const sit of ['recoit', 'sert'] as Situation[]) {
      const base = F[rot][sit].service;
      const zm = zonesOnCourt(rot, sit);
      RELATIONS.forEach((r, ri) => {
        if (sit === 'sert' && (r.a === 1 || r.b === 1)) return;
        for (const mz of [r.a, r.b]) {
          const id = zm[mz], other = zm[mz === r.a ? r.b : r.a];
          const ax = r.type === 'depth' ? 1 : 0, dir = mz === r.a ? 1 : -1;
          const start = base[id]!, gap = (base[other]![ax] - start[ax]) * dir;
          search: for (const over of [0.4, 0.7]) {
            if (gap + over > 2) break;
            for (const side of [0, 0.6, -0.6]) {
              const np: Vec2 = [start[0], start[1]];
              np[ax] += (gap + over) * dir;
              np[1 - ax] += side;
              if (Math.abs(np[0]) > 4.2 || np[1] < 0.35 || np[1] > 8.7) continue;
              const pos: Formation = { ...base, [id]: np };
              const crowded = onCourt(zm).some((k) => k !== id && Math.hypot(pos[k]![0] - np[0], pos[k]![1] - np[1]) < 0.75);
              if (crowded) continue;
              const chk = check(rot, sit, (k) => pos[k]!);
              if (chk.faults.length !== 1 || chk.rels[ri].ok) continue;
              out.push({ rot, sit, pos, moved: id, ida: chk.rels[ri].ida, idb: chk.rels[ri].idb, msg: chk.faults[0].msg, key: `${rot}${sit}${ri}${id}` });
              break search;
            }
          }
        }
      });
    }
  }
  return out;
}

let cache: FaultScenario[] | null = null;
export function faultScenario(rnd: () => number = Math.random): FaultScenario {
  cache ??= allFaultScenarios();
  return cache[Math.floor(rnd() * cache.length)];
}
