// The hall: lights, floor with FIVB markings, zone numbers and the net. Nothing here moves.
import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { Color, DirectionalLight, DoubleSide, LinearSRGBColorSpace, RepeatWrapping } from 'three';
import { useStore } from '../state/store';
import { canvasTexture, drawAntenna, drawFloor, drawNetTile, drawZones, makeCanvas } from './draw';
import { useFonts, useSceneTheme } from './env';

const NET_TOP = 2.43;
const NET_W = 9.8;
// The prototype ran on three r128, which read light colours as linear values: keep that ground tint.
const GROUND = new Color().setRGB(0x3a / 255, 0x46 / 255, 0x52 / 255, LinearSRGBColorSpace);

export function Arena() {
  const theme = useSceneTheme();
  return (
    <>
      <color attach="background" args={[theme.stage]} />
      <fog attach="fog" args={[theme.stage, 34, 78]} />
      <Lights dark={theme.dark} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={theme.hall} roughness={1} />
      </mesh>
      <Floor />
      <ZoneNumbers />
      <Net />
    </>
  );
}

// Intensities are multiplied by π: three now uses physical light units, r128 did not.
function Lights({ dark }: { dark: boolean }) {
  const sun = useMemo(() => {
    const l = new DirectionalLight('#ffffff');
    l.position.set(5, 18, 9);
    l.target.position.set(0, 0, 1);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, { left: -13, right: 13, top: 15, bottom: -15, near: 2, far: 50 });
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    return l;
  }, []);
  useEffect(() => () => sun.dispose(), [sun]);
  return (
    <>
      <hemisphereLight args={['#ffffff', GROUND]} intensity={(dark ? 0.3 : 0.45) * Math.PI} />
      <primitive object={sun} intensity={(dark ? 0.72 : 0.6) * Math.PI} />
      <primitive object={sun.target} />
    </>
  );
}

function Floor() {
  const gl = useThree((s) => s.gl);
  const map = useMemo(() => canvasTexture(drawFloor(), gl), [gl]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[19, 32]} />
      <meshStandardMaterial map={map} roughness={0.85} />
    </mesh>
  );
}

function ZoneNumbers() {
  const gl = useThree((s) => s.gl);
  const visible = useStore((s) => s.zones);
  const fonts = useFonts((s) => s.epoch);
  const [canvas, map] = useMemo(() => {
    const c = makeCanvas(900, 900);
    return [c, canvasTexture(c, gl)] as const;
  }, [gl]);
  useLayoutEffect(() => {
    drawZones(canvas);
    map.needsUpdate = true;
  }, [canvas, map, fonts]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 4.5]} visible={visible}>
      <planeGeometry args={[9, 9]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} />
    </mesh>
  );
}

function Net() {
  const gl = useThree((s) => s.gl);
  const [mesh, antenna] = useMemo(() => {
    const m = canvasTexture(drawNetTile(), gl);
    m.wrapS = m.wrapT = RepeatWrapping;
    m.repeat.set(NET_W / 0.1, 10);
    return [m, canvasTexture(drawAntenna(), gl)] as const;
  }, [gl]);
  useEffect(() => () => { mesh.dispose(); antenna.dispose(); }, [mesh, antenna]);
  return (
    <group>
      <mesh position={[0, NET_TOP - 0.5, 0]}>
        <planeGeometry args={[NET_W, 1]} />
        <meshBasicMaterial map={mesh} transparent opacity={0.85} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, NET_TOP - 0.035, 0]} castShadow>
        <boxGeometry args={[NET_W, 0.07, 0.025]} />
        <meshStandardMaterial color="#F4F4F0" roughness={0.6} />
      </mesh>
      <mesh position={[0, NET_TOP - 0.975, 0]}>
        <boxGeometry args={[NET_W, 0.05, 0.02]} />
        <meshStandardMaterial color="#F4F4F0" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 4.475, NET_TOP - 0.5, 0]}>
            <boxGeometry args={[0.05, 1, 0.022]} />
            <meshStandardMaterial color="#F4F4F0" roughness={0.6} />
          </mesh>
          {/* antenna: 1.8 m, 80 cm above the net */}
          <mesh position={[s * 4.525, NET_TOP + 0.8 - 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.013, 0.013, 1.8, 10]} />
            <meshStandardMaterial map={antenna} roughness={0.5} />
          </mesh>
          <mesh position={[s * 5.45, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 2.6, 16]} />
            <meshStandardMaterial color="#7F8A95" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh rotation-z={Math.PI / 2} position={[0, NET_TOP + 0.01, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 10.9, 6]} />
        <meshStandardMaterial color="#2A2F35" />
      </mesh>
    </group>
  );
}
