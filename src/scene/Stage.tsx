import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode } from 'react';
import { expose } from '../debug';
import { useStore } from '../state/store';
import { Arena } from './Arena';
import { CameraRig, PointerControls, SimDriver } from './Controls';
import { Figures } from './Figures';
import { Arrows, Guides, Marker, RuleLines } from './Overlays';

/** WebGL can be missing or blocked: say so instead of leaving a blank stage. */
class NoWebGL extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <div className="stage-msg">WebGL n’est pas disponible sur cet appareil. Les placements restent lisibles dans le panneau.</div>;
    return this.props.children;
  }
}

export function Stage() {
  const ready = useStore((s) => s.ready);
  const setReady = useStore((s) => s.setReady);
  const dragging = useStore((s) => s.dragging !== null);
  const picking = useStore((s) => s.mode === 'quiz' && !s.quiz.answered);
  return (
    <>
      <div id="stage" className={`stage${dragging ? ' dragging' : ''}${picking ? ' picking' : ''}`}>
        <NoWebGL>
          <Canvas
            flat
            shadows="percentage"
            dpr={[1, 2]}
            gl={{ antialias: true }}
            camera={{ fov: 42, near: 0.1, far: 200, position: [6.8, 12.2, 18.5] }}
            onCreated={(three) => {
              expose('three', three);
              setReady();
            }}
          >
            <SimDriver />
            <CameraRig />
            <PointerControls />
            <Arena />
            <Figures />
            <RuleLines />
            <Guides />
            <Arrows />
            <Marker />
          </Canvas>
        </NoWebGL>
      </div>
      {!ready && <div className="stage-msg">Chargement du terrain…</div>}
    </>
  );
}
