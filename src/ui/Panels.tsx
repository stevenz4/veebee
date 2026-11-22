// The sidebar: rotation controls, the two fault exercises, the quiz, rotation notes and display options.
import { INFO, ORDER, PLAYERS } from '../domain/data';
import { questionHint, questionText, questionTitle, type QuizType } from '../domain/quiz';
import { boundText, legalBox, offCourt, zoneOf, zonesOnCourt } from '../domain/rules';
import { ROLE_LABEL, SIT_LABEL, destText, fr } from '../domain/texts';
import type { Phase, PlayerId, Role, Situation, Zone } from '../domain/types';
import { displayPositions, formationCheck, guideFocus, hideFaults } from '../state/derive';
import { useStore, type AppState, type Mode, type Sub } from '../state/store';
import { Feedback, Score, Seg, toneOf, type Tone } from './common';

const ROLES: Role[] = ['passeur', 'r4', 'central', 'pointu', 'libero'];
const MODES: [Mode, string][] = [['rotations', 'Rotations'], ['libre', 'Fautes'], ['quiz', 'Quiz']];

export function TopBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <h1>Rotations Volley 3D</h1>
          <p>Système 5-1 avec libéro · règles FIVB</p>
        </div>
      </div>
      <nav className="modes" role="tablist" aria-label="Mode">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" role="tab" id={`tab-${m}`} aria-selected={mode === m} onClick={() => setMode(m)}>{label}</button>
        ))}
      </nav>
    </header>
  );
}

export function RotationPanel() {
  const s = useStore();
  if (s.mode === 'quiz' || (s.mode === 'libre' && s.sub === 'find')) return null;
  return (
    <section className="panel" id="panel-rot">
      <div className="field">
        <div className="field-head">
          <span className="lbl">Rotation</span>
          <button type="button" className="btn small" id="btn-turn" title="Passer à la rotation suivante (flèche droite)" onClick={() => s.turn(1)}>Tourner ↻</button>
        </div>
        <div className="rotstrip" id="rotstrip">
          {ORDER.map((rot, i) => (
            <button key={rot} type="button" id={`rot-${rot}`} aria-pressed={s.rot === rot} aria-label={`Rotation ${i + 1}, passeur en zone ${rot.slice(1)}`} onClick={() => s.setRot(rot)}>
              <b>{rot}</b>
              <small>rot. {i + 1}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lbl">Situation</span>
        <Seg<Situation> id="seg-sit" label="Situation" value={s.sit} onChange={s.setSit} options={[
          { value: 'recoit', label: 'On reçoit', id: 'sit-recoit' },
          { value: 'sert', label: 'On sert', id: 'sit-sert' },
        ]} />
      </div>
      {s.mode === 'rotations' && (
        <div className="field" id="field-phase">
          <span className="lbl">Moment</span>
          <Seg<Phase> id="seg-phase" label="Moment" value={s.phase} onChange={s.setPhase} options={[
            { value: 'service', label: 'Au service', id: 'ph-service' },
            { value: 'jeu', label: 'En jeu', id: 'ph-jeu' },
          ]} />
          <div className="btnrow">
            <button type="button" className="btn primary grow" id="btn-play" disabled={!s.ready} onClick={() => (s.playing ? s.stopAction() : s.playAction())}>
              {s.playing ? '■ Arrêter' : s.phase === 'jeu' ? "↺ Rejouer l'action" : "▶ Jouer l'action"}
            </button>
            <button type="button" className="btn" id="btn-speed" title="Vitesse de l'animation" onClick={s.toggleSpeed}>
              Vitesse {s.speed === 1 ? '1×' : '0,5×'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function findFeedback(s: AppState): { tone: Tone; title: string; lines: string[] } | null {
  const { fq } = s, sc = fq.sc;
  if (!sc) return null;
  if (fq.fixed) return { tone: 'ok', title: 'Corrigé', lines: ['Placement réglementaire : chaque joueur respecte ses voisins.'] };
  if (fq.found) {
    return {
      tone: 'ok', title: fq.tries === 1 ? 'Trouvé du premier coup' : 'Trouvé',
      lines: [sc.msg, `${PLAYERS[sc.moved].code} a franchi la ligne. Glisse-le dans sa zone verte pour corriger.`],
    };
  }
  if (fq.probe) {
    return {
      tone: 'warn', title: 'Pas lui',
      lines: [`${PLAYERS[fq.probe].code} respecte ses voisins : il est bien dans sa zone verte.`, 'Cherche encore : une seule paire de joueurs est en faute.'],
    };
  }
  return null;
}

export function FaultsPanel() {
  const s = useStore();
  if (s.mode !== 'libre') return null;
  const { fq } = s, find = s.sub === 'find';
  const fb = find ? findFeedback(s) : null;
  const faults = find ? [] : formationCheck(s).faults;
  return (
    <section className="panel" id="panel-libre">
      <Seg<Sub> id="seg-sub" label="Exercice" value={s.sub} onChange={s.setSub} options={[
        { value: 'find', label: 'Trouve la faute', id: 'sub-find' },
        { value: 'sandbox', label: 'Bac à sable', id: 'sub-sandbox' },
      ]} />
      {find ? (
        <div className="field" id="find-box">
          <div className="qcard">
            <span className="lbl" id="f-eyebrow">Situation {fq.n}</span>
            <h3 id="f-title">{fq.sc ? fr(`${fq.sc.rot} · ${SIT_LABEL[fq.sc.sit]}`) : ''}</h3>
            <p>Une faute de position s'est glissée au moment du service. Clique sur un des deux joueurs en faute.</p>
          </div>
          {fb && <Feedback id="f-feedback" {...fb} />}
          <Score items={[['Série', fq.streak], ['Record', fq.best], ['Du 1er coup', `${fq.ok}/${fq.total}`]]} />
        </div>
      ) : (
        <div className="field" id="sandbox-box">
          <p className="muted">Glisse les joueurs. Gauche et droite se lisent face au filet, depuis ton camp.</p>
          <ul className="faults" id="fault-list">
            {faults.length
              ? faults.map((f) => <li key={f.msg}>{fr(f.msg)}</li>)
              : <li className="ok">{fr('Aucune faute : ce placement est réglementaire.')}</li>}
          </ul>
        </div>
      )}
      <div className="btnrow">
        {(!find || fq.found) && <button type="button" className="btn" id="btn-reset" onClick={s.resetLibre}>Remettre le placement type</button>}
        {find && <button type="button" className={`btn grow${fq.found ? ' primary' : ''}`} id="btn-fnext" onClick={s.newFault}>Nouvelle situation</button>}
      </div>
    </section>
  );
}

export function QuizPanel() {
  const s = useStore();
  if (s.mode !== 'quiz') return null;
  const qz = s.quiz, q = qz.q;
  return (
    <section className="panel" id="panel-quiz">
      <div className="field">
        <span className="lbl">Ton poste</span>
        <div className="chips" id="quiz-roles">
          {ROLES.map((r) => (
            <button key={r} type="button" id={`role-${r}`} aria-pressed={qz.role === r} onClick={() => s.setRole(r)}>{ROLE_LABEL[r]}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lbl">Questions</span>
        <Seg<QuizType> id="seg-qtype" label="Type de questions" value={qz.type} onChange={s.setQuizType} options={[
          { value: 'service', label: 'Au service', id: 'qt-service' },
          { value: 'jeu', label: 'En jeu', id: 'qt-jeu' },
          { value: 'mix', label: 'Mélange', id: 'qt-mix' },
        ]} />
      </div>
      {q && (
        <div className="qcard">
          <span className="lbl" id="q-eyebrow">Question {qz.n}</span>
          <h3 id="q-title">{fr(questionTitle(q))}</h3>
          <p id="q-text">{fr(questionText(q))}</p>
          {qz.hint && <p className="hint" id="q-hint">{fr(questionHint(q))}</p>}
        </div>
      )}
      {qz.answered && qz.res && <Feedback id="q-feedback" tone={toneOf(qz.res.level)} title={qz.res.title} lines={qz.res.lines} />}
      <div className="btnrow">
        <button type="button" className="btn" id="btn-hint" disabled={qz.answered || qz.hint} onClick={s.showHint}>Indice</button>
        <button type="button" className="btn" id="btn-reveal" disabled={qz.answered} onClick={s.reveal}>Voir la réponse</button>
        <button type="button" className={`btn grow${qz.answered ? ' primary' : ''}`} id="btn-next" onClick={s.newQuestion}>Question suivante</button>
      </div>
      <Score items={[['Série', qz.streak], ['Record', qz.best], ['Réussite', `${qz.ok}/${qz.total}`]]} />
    </section>
  );
}

/** The lines that frame the focused player: one per neighbour, plus the court itself. */
function Neighbors({ s }: { s: AppState }) {
  const id = guideFocus(s, true);
  if (!id || s.mode === 'quiz') return null;
  const pos = displayPositions(s);
  const box = legalBox(s.rot, s.sit, id, (k) => pos[k]);
  if (!box) return null;
  const { code } = PLAYERS[id];
  const rows = box.server
    ? [{ t: 'Derrière la ligne de fond, entre les lignes de côté', ok: box.inCourt }]
    : [...box.bounds.map((b) => ({ t: boundText(b, true), ok: b.ok })), { t: 'Les pieds dans le terrain', ok: box.inCourt }];
  return (
    <div className="field nb" id="nb-field">
      <span className="lbl" id="nb-title">{fr(box.server ? `${code} sert` : `Les lignes de ${code} · zone ${box.zone}`)}</span>
      <ul className="faults" id="nb-list">
        {rows.map((r) => <li key={r.t} className={r.ok ? 'ok' : ''}>{fr(r.t + (r.ok ? '' : ' : faute'))}</li>)}
      </ul>
      <p className="kbd">{fr("Chaque voisin trace une ligne au sol, à hauteur de ses pieds. La zone verte est ce qui reste : c'est là que le joueur a le droit d'être.")}</p>
    </div>
  );
}

export function InfoPanel() {
  const s = useStore();
  if (s.mode === 'quiz') return null;
  const { rot, sit } = s, info = INFO[rot], zm = zonesOnCourt(rot, sit);
  const codes = (zs: Zone[]) => zs.map((z) => PLAYERS[zm[z]].code).join(', ');
  const bad = new Set<PlayerId>();
  if (s.mode === 'libre' && !hideFaults(s)) for (const f of formationCheck(s).faults) f.ids.forEach((id) => bad.add(id));
  const order: PlayerId[] = [...([4, 3, 2, 5, 6, 1] as Zone[]).map((z) => zm[z]), offCourt(rot, sit)];
  return (
    <section className="panel" id="panel-info">
      <div className="info-head">
        <span className="lbl" id="rot-eyebrow">{fr(`Rotation ${ORDER.indexOf(rot) + 1} sur 6 · ${SIT_LABEL[sit]}`)}</span>
        <h2 id="rot-title">{rot} · {info.titre}</h2>
        <p className="meta" id="rot-front">{fr(`Avants : ${codes([4, 3, 2])} · Arrières : ${codes([5, 6, 1])}`)}</p>
      </div>
      <p className="rot-text" id="rot-text">{fr(info[sit])}</p>
      <Neighbors s={s} />
      <ul className="plist" id="plist">
        {order.map((id) => {
          const z = zoneOf(zm, id), p = PLAYERS[id];
          return (
            <li key={id}>
              <button type="button" className={`prow${z ? '' : ' off'}${bad.has(id) ? ' bad' : ''}`} aria-pressed={s.sel === id} onClick={() => s.select(id)}>
                <span className={`jersey${id === 'L' ? ' libero' : ''}`}>{p.num}</span>
                <span className="pmain">
                  <span className="pname">{p.code}<small>{p.nom}</small></span>
                  <span className="pdest">{fr(destText(rot, sit, id))}</span>
                </span>
                <span className="zbadge">{z ? `Z${z}` : 'Banc'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="toggle" htmlFor={id}>
      <span>{label}</span>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function DisplayPanel() {
  const rules = useStore((s) => s.rules), zones = useStore((s) => s.zones), arrows = useStore((s) => s.arrows);
  const setToggle = useStore((s) => s.setToggle);
  return (
    <section className="panel" id="panel-display">
      <span className="lbl">Affichage</span>
      <Toggle id="tg-rules" label="Règles de position (7 voisinages)" checked={rules} onChange={(on) => setToggle('rules', on)} />
      <Toggle id="tg-zones" label="Numéros de zone" checked={zones} onChange={(on) => setToggle('zones', on)} />
      <Toggle id="tg-arrows" label="Trajets après le service" checked={arrows} onChange={(on) => setToggle('arrows', on)} />
      <div className="legend">
        <span><i className="sw sw-team" />Ton équipe</span>
        <span><i className="sw sw-libero" />Libéro</span>
        <span><i className="sw sw-opp" />Adversaires</span>
        <span><i className="sw sw-ok" />Règle respectée</span>
        <span><i className="sw sw-fault" />Faute</span>
        <span><i className="sw sw-box" />Zone autorisée</span>
      </div>
      <p className="kbd">{fr("Clavier : ← → rotations · Espace jouer l'action · 1 2 3 caméras")}</p>
    </section>
  );
}
