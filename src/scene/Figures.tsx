// Our seven players (six on court, one on the bench), the six opponents and the ball.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { MeshBasicMaterial, MeshStandardMaterial, type Group, type Material, type Mesh } from 'three';
import { IDS, OPP } from '../domain/data';
import { zoneOf, zonesOnCourt } from '../domain/rules';
import type { PlayerId } from '../domain/types';
import { hiddenId, highlighted } from '../state/derive';
import { sim, type Body } from '../state/sim';
import { useStore } from '../state/store';
import { canvasTexture, drawBall, drawLabel, makeCanvas } from './draw';
import { useFonts } from './env';
import { COLORS, GEO } from './objects';

function bodyMaterial(color: string, ghost = false) {
  return new MeshStandardMaterial({ color, roughness: 0.62, transparent: ghost, opacity: ghost ? 0.5 : 1, depthWrite: !ghost });
}
const MAT = {
  jersey: bodyMaterial('#2457A6'),
  libero: bodyMaterial('#F2C230'),
  shorts: bodyMaterial('#EEF1F4'),
  skin: bodyMaterial('#C9AE92'),
  oppJersey: bodyMaterial('#7C2D3B', true),
  oppShorts: bodyMaterial('#2A2F36', true),
  oppSkin: bodyMaterial('#C9AE92', true),
  disc: new MeshBasicMaterial({ color: '#09121C', opacity: 0.18, transparent: true, depthWrite: false }),
};

interface BodyProps {
  jersey: Material;
  shorts: Material;
  skin: Material;
  shadows: boolean;
  armL: RefObject<Group | null>;
  armR: RefObject<Group | null>;
  /** Player id stored on each mesh, so a click can tell who was hit. */
  pick?: PlayerId;
}

function FigureBody({ jersey, shorts, skin, shadows, armL, armR, pick }: BodyProps) {
  const ud = pick ? { pick } : {};
  return (
    <>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} geometry={GEO.leg} material={skin} position={[x, 0.43, 0]} castShadow={shadows} userData={ud} />
      ))}
      <mesh geometry={GEO.shorts} material={shorts} position-y={0.86} castShadow={shadows} userData={ud} />
      <mesh geometry={GEO.torso} material={jersey} position-y={1.25} castShadow={shadows} userData={ud} />
      <mesh geometry={GEO.head} material={skin} position-y={1.7} castShadow={shadows} userData={ud} />
      {([[armL, -1], [armR, 1]] as const).map(([ref, s]) => (
        <group key={s} ref={ref} position={[s * 0.275, 1.5, 0]} rotation-z={s * 0.1}>
          <mesh geometry={GEO.arm} material={skin} position-y={-0.31} castShadow={shadows} userData={ud} />
        </group>
      ))}
    </>
  );
}

/** Move a figure to its body's position; arms go up as it jumps. */
function pose(g: Group, armL: Group, armR: Group, b: Body) {
  g.position.set(b.x, b.y, b.z);
  const k = Math.min(1, Math.max(0, b.y / 0.32));
  armL.rotation.z = -0.1 + (-(Math.PI - 0.3) + 0.1) * k;
  armR.rotation.z = 0.1 + (Math.PI - 0.3 - 0.1) * k;
}

function useLabel(id: PlayerId) {
  const gl = useThree((s) => s.gl);
  const [canvas, map] = useMemo(() => {
    const c = makeCanvas(256, 128);
    return [c, canvasTexture(c, gl)] as const;
  }, [gl]);
  const selected = useStore((s) => s.sel === id);
  const zone = useStore((s) => zoneOf(zonesOnCourt(s.rot, s.sit), id));
  const fonts = useFonts((s) => s.epoch);
  useLayoutEffect(() => {
    drawLabel(canvas, id, selected, zone);
    map.needsUpdate = true;
  }, [canvas, map, id, selected, zone, fonts]);
  useEffect(() => () => map.dispose(), [map]);
  return map;
}

function Player({ id }: { id: PlayerId }) {
  const group = useRef<Group>(null), armL = useRef<Group>(null), armR = useRef<Group>(null), ring = useRef<Mesh>(null);
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.4, depthWrite: false }), []);
  useEffect(() => () => ringMat.dispose(), [ringMat]);
  const label = useLabel(id);
  const hidden = useStore((s) => hiddenId(s) === id);
  const showLabel = useStore((s) => s.cam !== 'joueur');

  useFrame(() => {
    if (!group.current || !armL.current || !armR.current || !ring.current) return;
    pose(group.current, armL.current, armR.current, sim.players[id]);
    const on = highlighted(useStore.getState()) === id, bad = sim.badIds.has(id);
    ringMat.color.copy(bad ? COLORS.bad : COLORS.white);
    ringMat.opacity = on || bad ? 0.95 : 0.38;
    ring.current.scale.setScalar(on ? (1 + Math.sin(performance.now() / 260) * 0.06) * 1.12 : 1);
  });

  return (
    <group ref={group} visible={!hidden}>
      <FigureBody jersey={id === 'L' ? MAT.libero : MAT.jersey} shorts={MAT.shorts} skin={MAT.skin} shadows armL={armL} armR={armR} pick={id} />
      <mesh geometry={GEO.disc} material={MAT.disc} position-y={0.006} />
      <mesh ref={ring} geometry={GEO.ring} material={ringMat} position-y={0.012} />
      <sprite scale={[1.5, 0.75, 1]} position-y={2.55} renderOrder={999} visible={showLabel} userData={{ pick: id }}>
        <spriteMaterial map={label} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

function Opponent({ index }: { index: number }) {
  const group = useRef<Group>(null), armL = useRef<Group>(null), armR = useRef<Group>(null);
  useFrame(() => {
    if (group.current && armL.current && armR.current) pose(group.current, armL.current, armR.current, sim.opps[index]);
  });
  return (
    <group ref={group}>
      <FigureBody jersey={MAT.oppJersey} shorts={MAT.oppShorts} skin={MAT.oppSkin} shadows={false} armL={armL} armR={armR} />
    </group>
  );
}

function Ball() {
  const gl = useThree((s) => s.gl);
  const map = useMemo(() => canvasTexture(drawBall(), gl), [gl]);
  useEffect(() => () => map.dispose(), [map]);
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.visible = sim.ball.visible;
    m.position.set(sim.ball.x, sim.ball.y, sim.ball.z);
    if (sim.action) {
      m.rotation.x += 0.12;
      m.rotation.z += 0.05;
    }
  });
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.11, 28, 20]} />
      <meshStandardMaterial map={map} roughness={0.45} />
    </mesh>
  );
}

export function Figures() {
  return (
    <>
      {IDS.map((id) => <Player key={id} id={id} />)}
      {OPP.recoit.map((_, i) => <Opponent key={i} index={i} />)}
      <Ball />
    </>
  );
}
