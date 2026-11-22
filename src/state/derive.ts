// Read-only views of the app state, shared by the 3D scene and the panels.
import { BENCH, F, IDS, PLAYERS } from '../domain/data';
import { check } from '../domain/rules';
import { PHASE_LABEL, ROLE_LABEL, SIT_LABEL } from '../domain/texts';
import type { CheckResult, PlayerId, Vec2 } from '../domain/types';
import type { AppState } from './store';

export type Positions = Record<PlayerId, Vec2>;

/** True while a "Trouve la faute" situation is unsolved: nothing may give the answer away. */
export const hideFaults = (s: AppState) => s.mode === 'libre' && s.sub === 'find' && !s.fq.found;

/** Where every player should stand for the current view (bench players wait at the bench). */
export function displayPositions(s: AppState): Positions {
  const out = {} as Positions;
  const q = s.quiz.q;
  if (s.mode === 'quiz' && q) {
    const ph = s.quiz.answered && q.phase === 'jeu' ? 'jeu' : 'service';
    for (const id of IDS) out[id] = F[q.rot][q.sit][ph][id] ?? BENCH;
    // A wrong answer stays where it was clicked, so the red line can show why.
    const res = s.quiz.res;
    if (s.quiz.answered && res?.at && res.level === 'faute') out[q.id] = res.at;
    return out;
  }
  const phase = s.mode === 'libre' ? 'service' : s.phase;
  for (const id of IDS) {
    out[id] = (s.mode === 'libre' && s.libre?.[id]) || F[s.rot][s.sit][phase][id] || BENCH;
  }
  return out;
}

export function formationCheck(s: AppState): CheckResult {
  const pos = displayPositions(s);
  return check(s.rot, s.sit, (id) => pos[id]);
}

/** Whose legal zone is drawn: the selected player, the one being dragged, or the quiz answer. */
export function guideFocus(s: AppState, panel = false): PlayerId | null {
  if (s.playing || (!panel && s.cam === 'joueur')) return null;
  if (s.mode === 'quiz') {
    const q = s.quiz.q;
    return s.quiz.answered && q && q.phase === 'service' ? q.id : null;
  }
  if (!s.rules) return null;
  if (s.mode === 'rotations') return s.phase === 'service' ? s.sel : null;
  if (hideFaults(s)) return s.fq.probe;
  return s.dragging ?? s.sel;
}

export function rulesVisible(s: AppState): boolean {
  if (s.playing) return false;
  if (s.mode === 'quiz') return !!(s.quiz.answered && s.quiz.q?.phase === 'service');
  if (hideFaults(s) || !s.rules) return false;
  return s.mode === 'libre' || s.phase === 'service';
}

export const focusId = (s: AppState): PlayerId | null => (s.mode === 'quiz' ? s.quiz.q?.id ?? null : s.sel);

/** The player whose ring pulses. */
export function highlighted(s: AppState): PlayerId | null {
  if (s.mode !== 'quiz') return s.sel;
  return s.quiz.answered ? s.quiz.q?.id ?? null : null;
}

/** In the quiz the player you play is hidden until you answer, so the court doesn't give it away. */
export function hiddenId(s: AppState): PlayerId | null {
  const q = s.quiz.q;
  return s.mode === 'quiz' && q && !s.quiz.answered && q.phase === 'service' ? q.id : null;
}

export const playerCamAllowed = (s: AppState) =>
  !(s.mode === 'quiz' && !(s.quiz.answered || s.quiz.q?.phase === 'jeu'));

export interface Caption { text: string; soft: boolean }

function idleCaption(s: AppState): Caption {
  if (s.mode === 'libre') {
    const fq = s.fq;
    if (s.sub !== 'find') return { text: 'Glisse un joueur : ses lignes et sa zone verte le suivent', soft: true };
    if (fq.fixed) return { text: 'Corrigé : placement réglementaire', soft: false };
    if (fq.found && fq.sc) return { text: `Glisse ${PLAYERS[fq.sc.moved].code} dans sa zone verte`, soft: false };
    return { text: 'Clique sur un joueur en faute', soft: true };
  }
  if (s.mode === 'quiz') {
    const text = s.quiz.answered ? 'Question suivante quand tu veux'
      : s.quiz.q?.phase === 'jeu' ? 'Clique là où tu vas après le service' : 'Clique là où tu te places';
    return { text, soft: true };
  }
  return { text: s.phase === 'service' ? 'Glisser pour tourner · molette ou pincer pour zoomer' : 'Positions après la frappe du service', soft: true };
}

export function caption(s: AppState): Caption {
  if (s.playing) return { text: s.actionCaption, soft: false };
  return s.flash ?? idleCaption(s);
}

export function statusText(s: AppState): string {
  if (s.mode === 'quiz') return `Quiz · ${ROLE_LABEL[s.quiz.role]}`;
  const phase = s.playing ? 'Action en cours'
    : s.mode === 'libre' ? (s.sub === 'find' ? 'Trouve la faute' : 'Bac à sable') : PHASE_LABEL[s.phase];
  return `${s.rot} · ${SIT_LABEL[s.sit]} · ${phase}`;
}
