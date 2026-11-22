import { useEffect } from 'react';
import { loadFonts } from './scene/env';
import { Stage } from './scene/Stage';
import { playerCamAllowed } from './state/derive';
import { useStore } from './state/store';
import { Hud } from './ui/Hud';
import { DisplayPanel, FaultsPanel, InfoPanel, QuizPanel, RotationPanel, TopBar } from './ui/Panels';

/** ← → change rotation, Space plays the rally, 1 2 3 switch cameras. */
function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName ?? '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
  const s = useStore.getState();
  const canTurn = s.mode === 'rotations' || (s.mode === 'libre' && s.sub !== 'find');
  if (e.key === 'ArrowRight' && canTurn) { s.turn(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft' && canTurn) { s.turn(-1); e.preventDefault(); }
  else if (e.key === ' ' && s.mode === 'rotations' && tag !== 'BUTTON') {
    if (s.playing) s.stopAction();
    else s.playAction();
    e.preventDefault();
  }
  else if (e.key === '1') s.setCam('tribune');
  else if (e.key === '2') s.setCam('dessus');
  else if (e.key === '3' && playerCamAllowed(s)) s.setCam('joueur');
}

export function App() {
  useEffect(() => {
    useStore.getState().boot();
    loadFonts();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <TopBar />
      <main className="layout">
        <section className="stage-wrap" aria-label="Terrain en 3D">
          <Stage />
          <Hud />
        </section>
        <aside className="side">
          <RotationPanel />
          <FaultsPanel />
          <QuizPanel />
          <InfoPanel />
          <DisplayPanel />
        </aside>
      </main>
    </div>
  );
}
