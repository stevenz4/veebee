import { PLAYERS, ZONE_RULES } from './data';
import { isFront, zoneOf, zonesOnCourt } from './rules';
import type { Phase, PlayerId, Role, RotationId, Situation } from './types';

export const SIT_LABEL: Record<Situation, string> = { recoit: 'On reçoit', sert: 'On sert' };
export const PHASE_LABEL: Record<Phase, string> = { service: 'Au service', jeu: 'En jeu' };
export const ROLE_LABEL: Record<Role, string> = { passeur: 'Passeur', r4: 'R4', central: 'Central', pointu: 'Pointu', libero: 'Libéro' };

function joinFr(parts: string[]): string {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

/** "Tu es en zone 6 : derrière C1 (zone 3), à droite de R4·2 (zone 5) et à gauche de P (zone 1)." */
export function zoneHint(rot: RotationId, sit: Situation, id: PlayerId): string {
  const zm = zonesOnCourt(rot, sit), z = zoneOf(zm, id), serving = sit === 'sert';
  if (!z) return '';
  if (serving && z === 1) return "Tu es en zone 1 et ton équipe sert : c'est toi qui sers.";
  const parts = ZONE_RULES[z]
    .filter(([, n]) => !(serving && n === 1))
    .map(([word, n]) => `${word} ${PLAYERS[zm[n]].code} (zone ${n})`);
  return `Tu es en zone ${z} : ${joinFr(parts)}.`;
}

/** Where the player goes once the serve is struck. */
export function destText(rot: RotationId, sit: Situation, id: PlayerId): string {
  const zm = zonesOnCourt(rot, sit), z = zoneOf(zm, id), role = PLAYERS[id].role;
  if (!z) return id === 'L' ? "Sur le banc : le libéro n'a pas le droit de servir." : 'Sur le banc : le libéro prend sa place au fond.';
  const front = isFront(z);
  if (sit === 'recoit') {
    if (role === 'passeur') return 'Va à la cible, au filet entre les zones 2 et 3.';
    if (role === 'libero') return "Réceptionne, puis couvre l'attaque.";
    if (role === 'r4') return front ? 'Réceptionne, puis attaque à gauche (zone 4).' : 'Réceptionne, puis attaque du fond au centre (pipe).';
    if (role === 'central') return 'Recule pour prendre son élan : balle rapide au centre.';
    return front ? 'Attaque à droite (zone 2).' : 'Attaque du fond, à droite (zone 1).';
  }
  if (z === 1) {
    const slot = role === 'passeur' || role === 'pointu' ? 1 : role === 'r4' ? 6 : 5;
    return `Sert, puis défend en zone ${slot}.`;
  }
  if (front) return role === 'r4' ? 'Contre à gauche (zone 4).' : role === 'central' ? 'Contre au centre (zone 3).' : 'Contre à droite (zone 2).';
  if (role === 'passeur' || role === 'pointu') return 'Défend à droite (zone 1).';
  if (role === 'r4') return 'Défend au centre arrière (zone 6).';
  return 'Défend à gauche (zone 5).';
}

/** Typical stance at the moment of the serve, in a few words. */
export function placeTip(rot: RotationId, sit: Situation, id: PlayerId): string {
  const z = zoneOf(zonesOnCourt(rot, sit), id), role = PLAYERS[id].role, front = isFront(z);
  if (sit === 'recoit') {
    if (role === 'passeur') return front ? 'au filet, au plus près de la cible.' : 'caché derrière un coéquipier, prêt à filer à la cible.';
    if (role === 'libero' || role === 'r4') return 'dans la ligne des trois réceptionneurs, vers 5 à 6 m du filet.';
    if (role === 'central') return 'au filet : le central avant ne réceptionne pas.';
    return front ? 'au filet : le pointu ne réceptionne pas.' : 'caché au fond, hors de la ligne de réception.';
  }
  return front ? 'au filet, serré contre les autres avants pour permuter vite.' : 'au fond, déjà orienté vers ta place de défense.';
}

export function roleHint(sit: Situation, id: PlayerId): string {
  const role = PLAYERS[id].role;
  if (sit === 'recoit') {
    if (role === 'passeur') return 'le passeur file toujours à la cible, au filet à droite du centre.';
    if (role === 'central') return 'le central avant prend son élan pour la balle rapide.';
    if (role === 'libero') return 'après la réception, le libéro couvre derrière les attaquants.';
    return "l'attaque se prépare : avant à gauche ou à droite, arrière au fond.";
  }
  return 'en défense, les avants contrent au filet et les arrières se partagent les zones 1, 6 et 5.';
}

/** French typography: non-breaking space before : ; ? ! » */
export const fr = (s: string) => s.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ');
