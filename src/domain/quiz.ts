// Quiz "Où tu te places ?": pick a question, judge a click on the court.
import { F, ORDER, PLAYERS } from './data';
import { check, metres, onCourt, zoneOf, zonesOnCourt } from './rules';
import { SIT_LABEL, destText, placeTip, roleHint, zoneHint } from './texts';
import type { Phase, PlayerId, Role, RotationId, Situation, Vec2 } from './types';

export type QuizType = 'service' | 'jeu' | 'mix';
export const QUIZ_TYPES: QuizType[] = ['service', 'jeu', 'mix'];
export type Level = 'parfait' | 'bien' | 'loin' | 'faute';

export interface Question { rot: RotationId; sit: Situation; phase: Phase; id: PlayerId }
export interface Answer {
  /** Where the player clicked (null when the answer was revealed). */
  at: Vec2 | null;
  level: Level;
  title: string;
  lines: string[];
  /** A revealed answer counts as a miss. */
  scored: boolean;
}

/** Distance to the model spot, in metres. */
export const PERFECT = 1.2;
export const GOOD = 2.2;

const pick = <T>(a: readonly T[], rnd: () => number): T => a[Math.floor(rnd() * a.length)];

export function newQuestion(role: Role, type: QuizType, prev: Question | null, rnd: () => number = Math.random): Question | null {
  for (let tries = 0; tries < 60; tries++) {
    const rot = pick(ORDER, rnd);
    const sit = pick(['recoit', 'sert'] as const, rnd);
    const phase: Phase = type === 'mix' ? pick(['service', 'service', 'jeu'] as const, rnd) : type;
    const cands = onCourt(zonesOnCourt(rot, sit)).filter((id) => PLAYERS[id].role === role);
    if (!cands.length) continue;
    const q: Question = { rot, sit, phase, id: pick(cands, rnd) };
    if (prev && prev.rot === q.rot && prev.sit === q.sit && prev.phase === q.phase && prev.id === q.id) continue;
    return q;
  }
  return null;
}

export const isServer = (q: Question) => q.sit === 'sert' && zoneOf(zonesOnCourt(q.rot, q.sit), q.id) === 1;

/** Where the player should be once the question is answered. */
export const modelSpot = (q: Question): Vec2 => F[q.rot][q.sit][q.phase][q.id]!;

export function evaluate(q: Question, at: Vec2): Answer {
  const [x, d] = at;
  const code = PLAYERS[q.id].code;
  if (q.phase === 'jeu') {
    const t = modelSpot(q), dist = Math.hypot(x - t[0], d - t[1]);
    const level: Level = dist <= PERFECT ? 'parfait' : dist <= GOOD ? 'bien' : 'loin';
    const title = { parfait: 'Parfait', bien: 'Bien vu', loin: 'Pas tout à fait', faute: '' }[level];
    return { at, level, title, scored: true, lines: [`${code} : ${destText(q.rot, q.sit, q.id)}`, `Tu es à ${metres(dist)} m de la position type.`] };
  }
  if (isServer(q)) {
    const ok = d >= 9 && Math.abs(x) <= 4.5;
    return {
      at, scored: true, level: ok ? 'parfait' : 'faute', title: ok ? 'Bien vu, tu sers' : "C'est toi qui sers",
      lines: [ok
        ? "Le serveur se place derrière la ligne de fond, entre les prolongements des lignes de côté. Il n'est pas concerné par la faute de position."
        : 'En zone 1 quand ton équipe sert, tu es au service : derrière la ligne de fond, entre les prolongements des lignes de côté.'],
    };
  }
  const base = F[q.rot][q.sit].service, model = base[q.id]!;
  const chk = check(q.rot, q.sit, (id) => (id === q.id ? at : base[id]!));
  const mine = chk.faults.filter((f) => f.ids.includes(q.id));
  const dist = Math.hypot(x - model[0], d - model[1]);
  const tip = placeTip(q.rot, q.sit, q.id);
  if (mine.length) {
    return {
      at, scored: true, level: 'faute', title: 'Faute de position',
      lines: [...mine.map((f) => f.msg), 'Sur le terrain, la ligne rouge montre la règle cassée et la zone verte ta place autorisée.', `Placement type : ${tip}`],
    };
  }
  if (dist <= PERFECT) return { at, scored: true, level: 'parfait', title: 'Parfait', lines: [`Réglementaire, à ${metres(dist)} m du placement type.`] };
  if (dist <= GOOD) return { at, scored: true, level: 'bien', title: 'Bien placé', lines: [`Réglementaire, à ${metres(dist)} m du placement type : ${tip}`] };
  return { at, scored: true, level: 'loin', title: 'Réglementaire, mais loin', lines: [`Pas de faute, mais tu es à ${metres(dist)} m du placement type. Vise plutôt ${tip}`] };
}

export function reveal(q: Question): Answer {
  const line = q.phase === 'jeu'
    ? `${PLAYERS[q.id].code} : ${destText(q.rot, q.sit, q.id)}`
    : isServer(q) ? 'Tu sers : derrière la ligne de fond.' : `${zoneHint(q.rot, q.sit, q.id)} Place-toi ${placeTip(q.rot, q.sit, q.id)}`;
  return { at: null, level: 'loin', title: 'Réponse', lines: [line], scored: false };
}

export const succeeded = (a: Answer) => a.scored && (a.level === 'parfait' || a.level === 'bien');

export const questionTitle = (q: Question) => `${q.rot} · ${SIT_LABEL[q.sit]}`;

export function questionText(q: Question): string {
  const p = PLAYERS[q.id];
  if (q.phase === 'service') return `Tu es ${p.code} (#${p.num}). Clique sur le terrain là où tu te places au moment du service.`;
  return `Tu es ${p.code} (#${p.num}), en zone ${zoneOf(zonesOnCourt(q.rot, q.sit), q.id)}. Le service part : clique là où tu vas.`;
}

export const questionHint = (q: Question) => (q.phase === 'service' ? zoneHint(q.rot, q.sit, q.id) : `Indice : ${roleHint(q.sit, q.id)}`);
