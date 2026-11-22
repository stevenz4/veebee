// Over the stage: where we are, whether the placement is legal, camera choice, live caption.
import { fr } from '../domain/texts';
import { caption, formationCheck, playerCamAllowed, statusText } from '../state/derive';
import { useStore, type AppState, type Cam } from '../state/store';
import { Seg, toneOf } from './common';

function LegalChip({ s }: { s: AppState }) {
  if (s.mode === 'quiz') {
    const r = s.quiz.res;
    if (!s.quiz.answered || !r) return null;
    return <span className={`chip ${toneOf(r.level)}`} id="legal">{fr(r.title)}</span>;
  }
  if (s.playing) return null;
  if (s.mode === 'rotations' && s.phase === 'jeu') {
    return <span className="chip" id="legal">Après la frappe<span className="hide-sm">{fr(' : déplacements libres')}</span></span>;
  }
  const n = formationCheck(s).faults.length;
  return (
    <span className={`chip ${n ? 'fault' : 'ok'}`} id="legal">
      {n ? <>{n} {n === 1 ? 'faute' : 'fautes'}<span className="hide-sm"> de position</span></> : <><span className="hide-sm">Placement </span>réglementaire</>}
    </span>
  );
}

export function Hud() {
  const s = useStore();
  const cap = caption(s);
  return (
    <>
      <div className="hud hud-top">
        <div className="chips-hud">
          <span className="chip" id="status">{fr(statusText(s))}</span>
          <LegalChip s={s} />
        </div>
        <Seg<Cam>
          className="seg-cam"
          id="seg-cam"
          label="Caméra"
          value={s.cam}
          onChange={s.setCam}
          options={[
            { value: 'tribune', label: 'Tribune', id: 'cam-tribune' },
            { value: 'dessus', label: 'Dessus', id: 'cam-dessus' },
            { value: 'joueur', label: 'Vue joueur', id: 'cam-joueur', disabled: !playerCamAllowed(s) },
          ]}
        />
      </div>
      <div className="hud hud-bottom">
        <span className={`caption${cap.soft ? ' soft' : ''}`} id="caption">{cap.text ? fr(cap.text) : ''}</span>
      </div>
    </>
  );
}
