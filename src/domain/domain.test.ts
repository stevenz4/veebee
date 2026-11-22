import { describe, expect, it } from 'vitest';
import { ballAt, buildAction } from './action';
import { F, LINEUP, ORDER, PLAYERS } from './data';
import { evaluate, newQuestion, reveal, succeeded, type Question, type QuizType } from './quiz';
import {
  allFaultScenarios, check, fixText, legalBox, nearestLegal, offCourt, onCourt, zonesOnCourt,
} from './rules';
import { fr, zoneHint } from './texts';
import type { Role, RotationId, Situation, Vec2 } from './types';

const SITS: Situation[] = ['recoit', 'sert'];
const CASES = ORDER.flatMap((rot) => SITS.map((sit) => [rot, sit] as [RotationId, Situation]));
const model = (rot: RotationId, sit: Situation) => (id: string) => F[rot][sit].service[id as keyof typeof PLAYERS]!;

describe('formations at the serve', () => {
  it.each(CASES)('%s %s is legal', (rot, sit) => {
    expect(check(rot, sit, model(rot, sit)).faults).toEqual([]);
  });

  it.each(CASES)('%s %s: every player stands inside his own legal box', (rot, sit) => {
    for (const id of onCourt(zonesOnCourt(rot, sit))) {
      const box = legalBox(rot, sit, id, model(rot, sit))!;
      expect(box.empty).toBe(false);
      expect(box.ok).toBe(true);
    }
  });

  it.each(CASES)('%s %s: the formation lists exactly the six players on court', (rot, sit) => {
    const on = onCourt(zonesOnCourt(rot, sit)).sort();
    expect(Object.keys(F[rot][sit].service).sort()).toEqual(on);
    expect(Object.keys(F[rot][sit].jeu).sort()).toEqual(on);
  });
});

describe('rotations', () => {
  it('turn clockwise: 2 → 1 → 6 → 5 → 4 → 3 → 2', () => {
    const next = { 1: 2, 6: 1, 5: 6, 4: 5, 3: 4, 2: 3 } as const;
    ORDER.forEach((rot, i) => {
      const after = LINEUP[ORDER[(i + 1) % 6]];
      for (const [z, from] of Object.entries(next)) expect(after[Number(z) as 1]).toBe(LINEUP[rot][from]);
    });
  });

  it('the libero replaces the back-row central, except when that central serves', () => {
    for (const [rot, sit] of CASES) {
      const zm = zonesOnCourt(rot, sit);
      const back = [zm[1], zm[5], zm[6]];
      const centralServes = sit === 'sert' && (LINEUP[rot][1] === 'C1' || LINEUP[rot][1] === 'C2');
      expect(back.includes('L')).toBe(!centralServes);
      if (centralServes) expect(offCourt(rot, sit)).toBe('L');
      else expect(PLAYERS[offCourt(rot, sit)].role).toBe('central');
    }
  });
});

describe('position faults', () => {
  const scenarios = allFaultScenarios();

  it('finds a scenario for most relations', () => {
    expect(scenarios.length).toBeGreaterThan(40);
    expect(new Set(scenarios.map((s) => s.key)).size).toBe(scenarios.length);
  });

  it.each(scenarios.map((s) => [s.key, s] as const))('%s: one fault, fixed by the nearest legal spot', (_, s) => {
    const posOf = (id: string) => s.pos[id as keyof typeof PLAYERS]!;
    const chk = check(s.rot, s.sit, posOf);
    expect(chk.faults).toHaveLength(1);
    expect(chk.faults[0].ids).toContain(s.moved);
    const box = legalBox(s.rot, s.sit, s.moved, posOf)!;
    expect(box.ok).toBe(false);
    const fix = nearestLegal(box, posOf(s.moved), 0.25)!;
    const fixed = check(s.rot, s.sit, (id) => (id === s.moved ? fix : posOf(id)));
    expect(fixed.faults).toEqual([]);
    expect(fixText(posOf(s.moved), fix)).toMatch(/^(Recule|Avance|Décale-toi) de \d+,\d m/);
  });

  it('explains a depth fault in plain words', () => {
    const pos = { ...F.P1.recoit.service, L: [2.5, 0.5] as Vec2 };
    const chk = check('P1', 'recoit', (id) => pos[id]!);
    expect(chk.faults.map((f) => f.msg)).toEqual(['C1 (zone 3) doit être devant L (zone 6), plus près du filet.']);
  });

  it('exempts the server from the neighbour rules', () => {
    const pos = { ...F.P1.sert.service, P: [-4, 11] as Vec2 };
    expect(check('P1', 'sert', (id) => pos[id]!).faults).toEqual([]);
    const out = { ...F.P1.sert.service, P: [2, 8] as Vec2 };
    expect(check('P1', 'sert', (id) => out[id]!).faults.map((f) => f.kind)).toEqual(['server']);
  });
});

describe('texts', () => {
  it('names the neighbours of a player', () => {
    expect(zoneHint('P1', 'recoit', 'L')).toBe('Tu es en zone 6 : derrière C1 (zone 3), à droite de R4·2 (zone 5) et à gauche de P (zone 1).');
    expect(zoneHint('P1', 'sert', 'P')).toBe("Tu es en zone 1 et ton équipe sert : c'est toi qui sers.");
  });

  it('applies French typography', () => {
    expect(fr('Attaque !')).toBe('Attaque !');
  });
});

describe('rally animation', () => {
  it.each(CASES)('%s %s: the ball path is continuous and every player has a track', (rot, sit) => {
    const plan = buildAction(rot, sit);
    for (const id of onCourt(zonesOnCourt(rot, sit))) {
      expect(plan.T[id]!.at(0)).toEqual(F[rot][sit].service[id]);
    }
    plan.ball.slice(1).forEach((s, i) => {
      expect(s.t0).toBeCloseTo(plan.ball[i].t1);
      expect(s.p0).toEqual(plan.ball[i].p1);
    });
    for (let t = 0; t <= plan.dur; t += 0.05) expect(ballAt(plan, t).every(Number.isFinite)).toBe(true);
    expect(plan.caps.at(-1)![0]).toBeLessThan(plan.dur);
  });
});

describe('quiz', () => {
  const ROLES: Role[] = ['passeur', 'r4', 'central', 'pointu', 'libero'];
  const TYPES: QuizType[] = ['service', 'jeu', 'mix'];

  it('asks about the chosen role and never repeats the same question twice in a row', () => {
    for (const role of ROLES) for (const type of TYPES) {
      let prev: Question | null = null;
      for (let i = 0; i < 30; i++) {
        const q: Question = newQuestion(role, type, prev)!;
        expect(PLAYERS[q.id].role).toBe(role);
        if (type !== 'mix') expect(q.phase).toBe(type);
        if (prev) expect(q).not.toEqual(prev);
        prev = q;
      }
    }
  });

  it('rates a click on the model spot as perfect, and a crossed line as a fault', () => {
    const q = { rot: 'P1', sit: 'recoit', phase: 'service', id: 'L' } as const;
    expect(evaluate(q, F.P1.recoit.service.L!).level).toBe('parfait');
    const bad = evaluate(q, [2.5, 0.5]);
    expect(bad.level).toBe('faute');
    expect(succeeded(bad)).toBe(false);
    expect(bad.lines[0]).toMatch(/doit être/);
  });

  it('grades the distance after the serve', () => {
    const q = { rot: 'P1', sit: 'recoit', phase: 'jeu', id: 'P' } as const;
    expect(evaluate(q, [1.3, 0.6]).level).toBe('parfait');
    expect(evaluate(q, [1.3, 2.5]).level).toBe('bien');
    expect(evaluate(q, [-3, 7]).level).toBe('loin');
  });

  it('knows the server stands behind the end line', () => {
    const q = { rot: 'P1', sit: 'sert', phase: 'service', id: 'P' } as const;
    expect(evaluate(q, [2.4, 10.2]).level).toBe('parfait');
    expect(evaluate(q, [2.4, 7]).level).toBe('faute');
    expect(reveal(q).scored).toBe(false);
  });
});
