export type PlayerId = 'P' | 'R41' | 'C1' | 'PT' | 'R42' | 'C2' | 'L';
export type Role = 'passeur' | 'r4' | 'central' | 'pointu' | 'libero';
export type RotationId = 'P1' | 'P6' | 'P5' | 'P4' | 'P3' | 'P2';
export type Situation = 'recoit' | 'sert';
export type Phase = 'service' | 'jeu';
export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

/** [x, d] in metres, seen from our camp facing the net: x from left (-4.5) to right (4.5), d = distance from the net. */
export type Vec2 = [number, number];
export type Formation = Partial<Record<PlayerId, Vec2>>;
export type ZoneMap = Record<Zone, PlayerId>;
export type PosOf = (id: PlayerId) => Vec2;

export interface Player {
  id: PlayerId;
  code: string;
  num: number;
  nom: string;
  role: Role;
}

/** depth: a must be closer to the net than b. lat: a must be left of b. */
export interface Relation {
  a: Zone;
  b: Zone;
  type: 'depth' | 'lat';
}

export interface RelationResult extends Relation {
  ida: PlayerId;
  idb: PlayerId;
  ok: boolean;
  exempt: boolean;
}

export interface Fault {
  kind: 'rel' | 'server' | 'out';
  ids: PlayerId[];
  msg: string;
}

export interface CheckResult {
  zm: ZoneMap;
  rels: RelationResult[];
  faults: Fault[];
}

/** One "ligne de position": the line through a neighbour's feet that the player must not cross. */
export interface Bound {
  axis: 'x' | 'z';
  side: 'min' | 'max';
  value: number;
  ref: PlayerId;
  refZone: Zone;
  ok: boolean;
}

export interface LegalBox {
  xmin: number;
  xmax: number;
  zmin: number;
  zmax: number;
  bounds: Bound[];
  zone: Zone;
  server: boolean;
  empty: boolean;
  inCourt: boolean;
  ok: boolean;
}

export interface FaultScenario {
  rot: RotationId;
  sit: Situation;
  pos: Formation;
  moved: PlayerId;
  ida: PlayerId;
  idb: PlayerId;
  msg: string;
  key: string;
}

export const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];
