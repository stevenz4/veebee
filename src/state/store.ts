// App state and every user action. Actions that move players also start the matching tweens in `sim`.
import { create } from 'zustand';
import { buildAction, captionAt } from '../domain/action';
import { BENCH, F, IDS, OPP, ORDER, SERVE_SPOT } from '../domain/data';
import {
  QUIZ_TYPES, evaluate, modelSpot, newQuestion as pickQuestion, reveal as revealAnswer, succeeded,
  type Answer, type Question, type QuizType,
} from '../domain/quiz';
import { faultScenario, zoneOf, zonesOnCourt } from '../domain/rules';
import { ROLE_LABEL } from '../domain/texts';
import type { FaultScenario, Formation, Phase, PlayerId, Role, RotationId, Situation } from '../domain/types';
import { displayPositions, formationCheck, hideFaults, type Caption } from './derive';
import { persist } from './persist';
import { moveTo, sim, teleport } from './sim';

export type Mode = 'rotations' | 'libre' | 'quiz';
export type Sub = 'find' | 'sandbox';
export type Cam = 'tribune' | 'dessus' | 'joueur';

export interface FindState {
  sc: FaultScenario | null;
  found: boolean;
  fixed: boolean;
  /** Last player clicked who was not at fault. */
  probe: PlayerId | null;
  tries: number;
  n: number;
  ok: number;
  total: number;
  streak: number;
  best: number;
}

export interface QuizState {
  role: Role;
  type: QuizType;
  q: Question | null;
  answered: boolean;
  res: Answer | null;
  hint: boolean;
  n: number;
  ok: number;
  total: number;
  streak: number;
  best: number;
}

export interface AppState {
  ready: boolean;
  mode: Mode;
  rot: RotationId;
  sit: Situation;
  phase: Phase;
  sel: PlayerId | null;
  rules: boolean;
  zones: boolean;
  arrows: boolean;
  cam: Cam;
  speed: 1 | 0.5;
  /** Positions moved by hand in the Fautes mode. */
  libre: Formation | null;
  dragging: PlayerId | null;
  playing: boolean;
  actionCaption: string;
  /** One-off caption that stays until the next action. */
  flash: Caption | null;
  sub: Sub;
  fq: FindState;
  quiz: QuizState;
}

interface Actions {
  boot(): void;
  setReady(): void;
  setMode(mode: Mode): void;
  setRot(rot: RotationId): void;
  turn(dir?: 1 | -1): void;
  setSit(sit: Situation): void;
  setPhase(phase: Phase): void;
  select(id: PlayerId): void;
  setCam(cam: Cam): void;
  setToggle(key: 'rules' | 'zones' | 'arrows', on: boolean): void;
  playAction(): void;
  stopAction(silent?: boolean): void;
  finishAction(): void;
  setActionCaption(text: string): void;
  toggleSpeed(): void;
  flashCaption(text: string, soft: boolean): void;
  setSub(sub: Sub): void;
  newFault(): void;
  resetLibre(): void;
  dragStart(id: PlayerId): void;
  dragMove(x: number, z: number): void;
  dragEnd(): void;
  newQuestion(): void;
  setRole(role: Role): void;
  setQuizType(type: QuizType): void;
  showHint(): void;
  answer(x: number, d: number): void;
  reveal(): void;
}

export type Store = AppState & Actions;

const savedRole = persist.get<Role>('role', 'r4');
const savedType = persist.get<QuizType>('qtype', 'service');

export const useStore = create<Store>()((set, get) => {
  /** Tween every body to where the current view wants it. */
  function place(dur: number) {
    const s = get(), pos = displayPositions(s);
    for (const id of IDS) {
      const b = sim.players[id], t = pos[id];
      if (Math.hypot(b.x - t[0], b.z - t[1]) > 0.01) moveTo(b, t[0], t[1], dur);
      else b.tw = null;
      b.y = 0;
    }
    const opp = OPP[s.sit];
    sim.opps.forEach((o, i) => { moveTo(o, opp[i][0], opp[i][1], dur); o.y = 0; });
    if (sim.action) return;
    // Before the serve, the ball waits in the server's hand.
    const hold = s.mode === 'rotations' && s.phase === 'service';
    const [x, y, z] = s.sit === 'sert' ? [SERVE_SPOT[0] + 0.34, 1.02, SERVE_SPOT[1] - 0.12] : [opp[0][0] - 0.34, 1.02, opp[0][1] + 0.12];
    Object.assign(sim.ball, { visible: hold, x, y, z });
  }

  function stop() {
    if (!sim.action) return false;
    sim.action = null;
    sim.ball.visible = false;
    set({ playing: false });
    return true;
  }

  function applyQuizScene() {
    const { q } = get().quiz;
    if (!q) return;
    set({ rot: q.rot, sit: q.sit, sel: q.id });
    place(0.7);
  }

  /** Find mode: once found, the situation is solved as soon as no fault is left. */
  function checkFixed() {
    const s = get();
    if (s.mode !== 'libre' || s.sub !== 'find' || !s.fq.found || s.fq.fixed) return;
    if (!formationCheck(s).faults.length) set({ fq: { ...s.fq, fixed: true }, flash: null });
  }

  function finishAnswer(res: Answer) {
    const { quiz: qz } = get(), q = qz.q!;
    const win = succeeded(res);
    const streak = win ? qz.streak + 1 : 0, best = Math.max(qz.best, streak);
    if (best > qz.best) persist.set('best', best);
    set({ quiz: { ...qz, answered: true, res, total: qz.total + 1, ok: qz.ok + (win ? 1 : 0), streak, best }, flash: null });
    if (q.phase === 'jeu') { place(0.9); return; }
    const b = sim.players[q.id], m = modelSpot(q);
    if (!res.at) { moveTo(b, m[0], m[1], 0.8); return; }
    teleport(b, res.at[0], res.at[1]);
    if (res.level !== 'faute') moveTo(b, m[0], m[1], 0.8, 1.1);
  }

  return {
    ready: false,
    mode: 'rotations',
    rot: 'P1',
    sit: 'recoit',
    phase: 'service',
    sel: 'P',
    rules: true,
    zones: true,
    arrows: true,
    cam: 'tribune',
    speed: 1,
    libre: null,
    dragging: null,
    playing: false,
    actionCaption: '',
    flash: null,
    sub: 'find',
    fq: { sc: null, found: false, fixed: false, probe: null, tries: 0, n: 0, ok: 0, total: 0, streak: 0, best: persist.get('fbest', 0) },
    quiz: {
      role: savedRole in ROLE_LABEL ? savedRole : 'r4',
      type: QUIZ_TYPES.includes(savedType) ? savedType : 'service',
      q: null, answered: false, res: null, hint: false, n: 0, ok: 0, total: 0, streak: 0, best: persist.get('best', 0),
    },

    boot: () => place(0.01),
    setReady: () => set({ ready: true }),

    setMode(mode) {
      stop();
      const s = get();
      set({
        mode, flash: null,
        ...(mode === 'libre' && { libre: null, phase: 'service' as Phase }),
        ...(!(mode === 'libre' && s.sub === 'find') && !s.sel && { sel: 'P' as PlayerId }),
        ...(mode === 'quiz' && s.cam === 'joueur' && { cam: 'tribune' as Cam }),
      });
      if (mode === 'quiz') {
        if (!get().quiz.q) get().newQuestion();
        else applyQuizScene();
      } else if (mode === 'libre' && s.sub === 'find') get().newFault();
      else place(0.7);
    },

    setRot(rot) {
      stop();
      const { mode } = get();
      set({ rot, flash: null, ...(mode === 'libre' && { libre: null }), ...(mode === 'rotations' && { phase: 'service' as Phase }) });
      place(0.9);
    },

    turn(dir = 1) {
      const i = ORDER.indexOf(get().rot);
      get().setRot(ORDER[(i + dir + 6) % 6]);
      if (dir > 0) set({ flash: { text: 'On tourne dans le sens des aiguilles d’une montre', soft: false } });
    },

    setSit(sit) {
      stop();
      set({ sit, flash: null, ...(get().mode === 'libre' && { libre: null }) });
      place(0.8);
    },

    setPhase(phase) {
      stop();
      set({ phase, flash: null });
      place(0.9);
    },

    select(id) {
      if (hideFaults(get())) { findClick(id); return; }
      set({ sel: id });
    },

    setCam: (cam) => set({ cam }),
    setToggle: (key, on) => set({ [key]: on }),

    playAction() {
      const s = get();
      if (!s.ready || s.mode !== 'rotations') return;
      stop();
      set({ phase: 'service' });
      const plan = buildAction(s.rot, s.sit);
      for (const id of IDS) {
        const p = F[s.rot][s.sit].service[id] ?? BENCH, b = sim.players[id];
        teleport(b, p[0], p[1]);
        b.y = 0;
      }
      OPP[s.sit].forEach((p, i) => { teleport(sim.opps[i], p[0], p[1]); sim.opps[i].y = 0; });
      sim.action = { plan, t0: performance.now() };
      sim.ball.visible = true;
      set({ playing: true, actionCaption: captionAt(plan, 0), flash: null });
    },

    stopAction(silent = false) {
      if (stop() && !silent) place(0.5);
    },

    finishAction() {
      sim.action = null;
      sim.ball.visible = false;
      set({ playing: false, phase: 'jeu' });
      place(0.6);
    },

    setActionCaption: (text) => { if (get().actionCaption !== text) set({ actionCaption: text }); },
    toggleSpeed: () => set({ speed: get().speed === 1 ? 0.5 : 1 }),
    flashCaption: (text, soft) => set({ flash: { text, soft } }),

    setSub(sub) {
      stop();
      set({ sub, flash: null });
      if (sub === 'find') { get().newFault(); return; }
      set({ libre: null, sel: get().sel ?? 'P' });
      place(0.6);
    },

    newFault() {
      const { fq, cam } = get();
      let sc = faultScenario(), k = 1;
      while (fq.sc && sc.key === fq.sc.key && k < 8) { sc = faultScenario(); k++; }
      const libre: Formation = {};
      for (const id of Object.keys(sc.pos) as PlayerId[]) libre[id] = [...sc.pos[id]!];
      set({
        fq: { ...fq, sc, found: false, fixed: false, probe: null, tries: 0, n: fq.n + 1, streak: fq.sc && !fq.found ? 0 : fq.streak },
        rot: sc.rot, sit: sc.sit, phase: 'service', sel: null, libre, flash: null,
        cam: cam === 'joueur' ? 'tribune' : cam,
      });
      place(0.8);
    },

    resetLibre() {
      set({ libre: null, flash: null });
      place(0.6);
      checkFixed();
    },

    dragStart(id) {
      set({ dragging: id });
      get().select(id);
    },

    dragMove(x, z) {
      const { dragging, libre } = get();
      if (!dragging) return;
      teleport(sim.players[dragging], x, z);
      set({ libre: { ...libre, [dragging]: [x, z] } });
      checkFixed();
    },

    dragEnd() {
      set({ dragging: null });
      checkFixed();
    },

    newQuestion() {
      const { quiz: qz, cam } = get();
      const q = pickQuestion(qz.role, qz.type, qz.q);
      set({
        quiz: { ...qz, q, answered: false, res: null, hint: false, n: qz.n + 1 }, flash: null,
        ...(cam === 'joueur' && q?.phase === 'service' && { cam: 'tribune' as Cam }),
      });
      applyQuizScene();
    },

    setRole(role) {
      persist.set('role', role);
      set({ quiz: { ...get().quiz, role, q: null } });
      get().newQuestion();
    },

    setQuizType(type) {
      persist.set('qtype', type);
      set({ quiz: { ...get().quiz, type } });
      get().newQuestion();
    },

    showHint: () => set({ quiz: { ...get().quiz, hint: true } }),

    answer(x, d) {
      const { q, answered } = get().quiz;
      if (q && !answered) finishAnswer(evaluate(q, [x, d]));
    },

    reveal() {
      const { q, answered } = get().quiz;
      if (q && !answered) finishAnswer(revealAnswer(q));
    },
  };

  function findClick(id: PlayerId) {
    const s = get(), fq = s.fq, sc = fq.sc;
    if (!sc || !zoneOf(zonesOnCourt(s.rot, s.sit), id)) return;
    const tries = fq.tries + 1;
    if (id !== sc.ida && id !== sc.idb) {
      set({ fq: { ...fq, tries, probe: id }, sel: id });
      return;
    }
    const first = tries === 1, streak = first ? fq.streak + 1 : 0, best = Math.max(fq.best, streak);
    if (best > fq.best) persist.set('fbest', best);
    set({
      fq: { ...fq, tries, found: true, probe: null, total: fq.total + 1, ok: fq.ok + (first ? 1 : 0), streak, best },
      sel: sc.moved, flash: null,
    });
  }
});
