// Data copied from the validated prototype (reference/rotations-volley-3d.html).
import type { Formation, Phase, Player, PlayerId, Relation, RotationId, Situation, Vec2, Zone } from './types';

export const PLAYERS: Record<PlayerId, Player> = {
  P:   { id: 'P',   code: 'P',    num: 7,  nom: 'Passeur',                   role: 'passeur' },
  R41: { id: 'R41', code: 'R4·1', num: 4,  nom: 'Réceptionneur-attaquant 1', role: 'r4' },
  C1:  { id: 'C1',  code: 'C1',   num: 11, nom: 'Central 1',                 role: 'central' },
  PT:  { id: 'PT',  code: 'Pt',   num: 9,  nom: 'Pointu',                    role: 'pointu' },
  R42: { id: 'R42', code: 'R4·2', num: 2,  nom: 'Réceptionneur-attaquant 2', role: 'r4' },
  C2:  { id: 'C2',  code: 'C2',   num: 15, nom: 'Central 2',                 role: 'central' },
  L:   { id: 'L',   code: 'L',    num: 1,  nom: 'Libéro',                    role: 'libero' }
};
export const IDS: PlayerId[] = ['P', 'R41', 'C1', 'PT', 'R42', 'C2', 'L'];
// Rotation order as the team rotates (clockwise): setter zone 1, 6, 5, 4, 3, 2.
export const ORDER: RotationId[] = ['P1', 'P6', 'P5', 'P4', 'P3', 'P2'];
// Lineup "central devant le passeur": serving order P, R4·1, C1, Pt, R4·2, C2.
export const LINEUP: Record<RotationId, Record<Zone, PlayerId>> = {
  P1: { 1: 'P',   2: 'R41', 3: 'C1',  4: 'PT',  5: 'R42', 6: 'C2'  },
  P6: { 1: 'R41', 2: 'C1',  3: 'PT',  4: 'R42', 5: 'C2',  6: 'P'   },
  P5: { 1: 'C1',  2: 'PT',  3: 'R42', 4: 'C2',  5: 'P',   6: 'R41' },
  P4: { 1: 'PT',  2: 'R42', 3: 'C2',  4: 'P',   5: 'R41', 6: 'C1'  },
  P3: { 1: 'R42', 2: 'C2',  3: 'P',   4: 'R41', 5: 'C1',  6: 'PT'  },
  P2: { 1: 'C2',  2: 'P',   3: 'R41', 4: 'C1',  5: 'PT',  6: 'R42' }
};
export const TARGET: Vec2 = [1.3, 0.6];        // setter's target at the net
export const BENCH: Vec2 = [-5.7, 6.2];        // libero replacement zone, bench side
export const SERVE_SPOT: Vec2 = [2.4, 10.2];   // our server, behind the end line

// Formations: service = legal stance at the moment of the serve; jeu = where each player goes after.
export const F: Record<RotationId, Record<Situation, Record<Phase, Formation>>> = {
  P1: {
    recoit: {
      service: { PT: [-1.6, 0.9], C1: [-0.5, 0.9], R41: [0.2, 5.5], R42: [-2.7, 5.8], L: [2.5, 6.0], P: [3.9, 6.6] },
      jeu:     { P: [1.3, 0.6], R41: [-3.7, 3.5], C1: [0.3, 3.0], PT: [3.7, 3.5], R42: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { P: [2.4, 10.2], PT: [-0.9, 0.8], C1: [0, 0.8], R41: [0.9, 0.8], R42: [-1.0, 6.2], L: [-0.1, 6.4] },
      jeu:     { R41: [-2.8, 0.9], C1: [0, 0.9], PT: [2.8, 0.9], P: [2.8, 6.8], R42: [0, 7.4], L: [-2.8, 6.8] }
    }
  },
  P6: {
    recoit: {
      service: { R42: [-2.8, 5.2], PT: [0.4, 0.7], C1: [1.4, 0.7], L: [-0.2, 6.2], P: [0.9, 1.6], R41: [2.6, 6.0] },
      jeu:     { P: [1.3, 0.6], R42: [-3.7, 3.5], C1: [0.3, 3.0], PT: [3.7, 3.5], R41: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { R41: [2.4, 10.2], R42: [-2.6, 0.8], PT: [0.4, 0.8], C1: [1.3, 0.8], L: [-2.6, 6.4], P: [0.9, 6.0] },
      jeu:     { R42: [-2.8, 0.9], C1: [0, 0.9], PT: [2.8, 0.9], P: [2.8, 6.8], R41: [0, 7.4], L: [-2.8, 6.8] }
    }
  },
  P5: {
    recoit: {
      service: { C2: [-3.6, 0.7], P: [-3.1, 1.6], R42: [-2.3, 5.0], PT: [2.8, 0.8], R41: [0.2, 6.2], L: [2.8, 6.0] },
      jeu:     { P: [1.3, 0.6], R42: [-3.7, 3.5], C2: [0.3, 3.0], PT: [3.7, 3.5], R41: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { C1: [2.4, 10.2], C2: [-1.6, 0.8], R42: [-0.6, 0.8], PT: [2.6, 0.8], P: [-0.2, 5.8], R41: [0.6, 6.4] },
      jeu:     { R42: [-2.8, 0.9], C2: [0, 0.9], PT: [2.8, 0.9], P: [2.8, 6.8], R41: [0, 7.4], C1: [-2.8, 6.8] }
    }
  },
  P4: {
    recoit: {
      service: { P: [-0.6, 0.7], C2: [0.3, 0.7], R42: [0.9, 5.4], R41: [-2.6, 5.8], L: [2.8, 6.0], PT: [3.9, 6.8] },
      jeu:     { P: [1.3, 0.6], R42: [-3.7, 3.5], C2: [0.3, 3.0], PT: [3.3, 7.0], R41: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { PT: [2.4, 10.2], P: [-0.9, 0.8], C2: [0, 0.8], R42: [0.9, 0.8], R41: [-1.0, 6.2], L: [-0.1, 6.4] },
      jeu:     { R42: [-2.8, 0.9], C2: [0, 0.9], P: [2.8, 0.9], PT: [2.8, 6.8], R41: [0, 7.4], L: [-2.8, 6.8] }
    }
  },
  P3: {
    recoit: {
      service: { R41: [-2.6, 5.2], P: [0.8, 0.7], C2: [1.8, 0.7], L: [-0.2, 6.2], PT: [1.2, 7.4], R42: [2.6, 6.0] },
      jeu:     { P: [1.3, 0.6], R41: [-3.7, 3.5], C2: [0.3, 3.0], PT: [3.3, 7.0], R42: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { R42: [2.4, 10.2], R41: [-2.6, 0.8], P: [0.4, 0.8], C2: [1.3, 0.8], L: [-2.6, 6.4], PT: [0.9, 6.0] },
      jeu:     { R41: [-2.8, 0.9], C2: [0, 0.9], P: [2.8, 0.9], PT: [2.8, 6.8], R42: [0, 7.4], L: [-2.8, 6.8] }
    }
  },
  P2: {
    recoit: {
      service: { C1: [-3.4, 0.7], R41: [-2.4, 5.0], P: [2.4, 0.7], PT: [0.2, 7.8], R42: [0.8, 6.2], L: [3.0, 6.0] },
      jeu:     { P: [1.3, 0.6], R41: [-3.7, 3.5], C1: [0.3, 3.0], PT: [3.3, 7.0], R42: [-0.4, 7.0], L: [-2.2, 5.8] }
    },
    sert: {
      service: { C2: [2.4, 10.2], C1: [-1.6, 0.8], R41: [-0.6, 0.8], P: [2.6, 0.8], PT: [-0.2, 5.8], R42: [0.6, 6.4] },
      jeu:     { R41: [-2.8, 0.9], C1: [0, 0.9], P: [2.8, 0.9], PT: [2.8, 6.8], R42: [0, 7.4], C2: [-2.8, 6.8] }
    }
  }
};

export const INFO: Record<RotationId, { titre: string; recoit: string; sert: string }> = {
  P1: { titre: 'Passeur en zone 1',
    recoit: "Le passeur part du fond à droite, caché derrière le libéro, et file au filet dès la frappe du serveur. Trois attaquants devant : pointu, C1 et R4·1.",
    sert: "Le passeur est au service. Devant, le pointu, C1 et R4·1 se resserrent au centre pour permuter dès la frappe." },
  P6: { titre: 'Passeur en zone 6',
    recoit: "Le passeur se colle derrière le pointu, à un mètre du filet : c'est le chemin le plus court vers la cible.",
    sert: "R4·1 sert. Le passeur attend au centre arrière, puis glisse en défense à droite, en zone 1." },
  P5: { titre: 'Passeur en zone 5',
    recoit: "La rotation piège : le passeur se cache derrière C2, au filet côté gauche, puis longe le filet jusqu'à la cible.",
    sert: "C1 sert, donc le libéro reste sur le banc pour ce point : il n'a pas le droit de servir. C1 défend ensuite à gauche, en zone 5." },
  P4: { titre: 'Passeur en zone 4',
    recoit: "Le passeur est devant, à gauche de C2. Seulement deux attaquants avant (R4·2 et C2) : le pointu attaque depuis la ligne arrière.",
    sert: "Le pointu sert. Devant, le passeur se place à gauche du central, puis permute à droite pour contrer." },
  P3: { titre: 'Passeur en zone 3',
    recoit: "Le passeur est au filet, au centre. Il glisse vers la cible pendant que R4·1 réceptionne à gauche.",
    sert: "R4·2 sert. Le passeur part contrer à droite et C2 revient au centre." },
  P2: { titre: 'Passeur en zone 2',
    recoit: "Le passeur est déjà à sa place, au filet à droite. Le pointu (zone 5) se cache au fond, derrière la réception.",
    sert: "C2 sert, donc pas de libéro sur ce point. C2 défend ensuite à gauche, en zone 5." }
};

// Opponents (z < 0 is their camp, same x axis). recoit = they serve, sert = they receive.
export const OPP: Record<Situation, Vec2[]> = {
  recoit: [[-2.2, -10.2], [-2.6, -0.9], [0, -0.9], [2.6, -0.9], [2.6, -6.8], [0, -7.4]],
  sert:   [[-2.6, -5.8], [0, -6.2], [2.6, -5.8], [-1.6, -0.8], [0.4, -0.9], [1.6, -7.8]]
};

// The seven neighbour relations checked at the moment of the serve (FIVB 7.4).
// depth: a must be closer to the net than b. lat: a must be left of b.
export const RELATIONS: Relation[] = [
  { a: 4, b: 5, type: 'depth' }, { a: 3, b: 6, type: 'depth' }, { a: 2, b: 1, type: 'depth' },
  { a: 4, b: 3, type: 'lat' }, { a: 3, b: 2, type: 'lat' },
  { a: 5, b: 6, type: 'lat' }, { a: 6, b: 1, type: 'lat' }
];
export const ZONE_RULES: Record<Zone, [string, Zone][]> = {
  1: [['derrière', 2], ['à droite de', 6]],
  2: [['devant', 1], ['à droite de', 3]],
  3: [['devant', 6], ['à droite de', 4], ['à gauche de', 2]],
  4: [['devant', 5], ['à gauche de', 3]],
  5: [['derrière', 4], ['à gauche de', 6]],
  6: [['derrière', 3], ['à droite de', 5], ['à gauche de', 1]]
};
