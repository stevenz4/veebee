// Everything drawn on the floor to explain the rules: neighbour links, the legal zone of the
// focused player, the way back to it, run arrows after the serve, and the quiz answer marker.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { F, PLAYERS, RELATIONS } from '../domain/data';
import { boundText, fixText, legalBox, nearestLegal } from '../domain/rules';
import type { PlayerId, Vec2 } from '../domain/types';
import { displayPositions, focusId, guideFocus } from '../state/derive';
import { livePos, sim } from '../state/sim';
import { useStore } from '../state/store';
import { COLORS, GEO, TAG_BAD, TAG_INK, TAG_OK, Tag, disposeMeshes, segMesh, setSeg } from './objects';

const mat = (m: Mesh) => m.material as MeshBasicMaterial;

/** The seven neighbour links (FIVB 7.4): green when respected, thick red with a tag when broken. */
export function RuleLines() {
  const gl = useThree((s) => s.gl);
  const links = useMemo(
    () => RELATIONS.map(() => ({ o: segMesh('#06101A', 0.5, 0.009), c: segMesh('#2FD07A', 1, 0.011), tag: new Tag(2.7, gl) })),
    [gl],
  );
  useEffect(() => () => links.forEach((l) => { disposeMeshes(l.o, l.c); l.tag.dispose(); }), [links]);

  useFrame(() => {
    const focus = focusId(useStore.getState());
    links.forEach((l, i) => {
      const rel = sim.links[i];
      l.o.visible = l.c.visible = !!rel;
      l.tag.sprite.visible = !!rel && !rel.ok;
      if (!rel) return;
      const a = sim.players[rel.ida], b = sim.players[rel.idb], bad = !rel.ok;
      const strong = bad || !focus || rel.ida === focus || rel.idb === focus;
      setSeg(l.o, a.x, a.z, b.x, b.z, bad ? 0.26 : strong ? 0.17 : 0.11);
      setSeg(l.c, a.x, a.z, b.x, b.z, bad ? 0.13 : strong ? 0.08 : 0.045);
      mat(l.c).color.copy(bad ? COLORS.bad : COLORS.ok);
      mat(l.c).opacity = strong ? 1 : 0.45;
      mat(l.o).opacity = strong ? 0.5 : 0.25;
      if (!bad) return;
      // the broken rule, written on the red link: "L devant R4·2"
      l.tag.sprite.position.set((a.x + b.x) / 2, 1.55, (a.z + b.z) / 2);
      l.tag.set(`${PLAYERS[rel.idb].code}${rel.type === 'depth' ? ' devant ' : ' à gauche de '}${PLAYERS[rel.ida].code}`, TAG_BAD);
    });
  });

  return (
    <>
      {links.map((l, i) => (
        <group key={i}>
          <primitive object={l.o} />
          <primitive object={l.c} />
          <primitive object={l.tag.sprite} />
        </group>
      ))}
    </>
  );
}

/**
 * The focused player's legal zone (green box), the position lines that bound it, each tagged with
 * the neighbour who draws it, and when he is outside, the shortest way back in.
 */
export function Guides() {
  const gl = useThree((s) => s.gl);
  const g = useMemo(() => ({
    box: segMesh('#36E88A', 0.36, 0.006),
    edges: [0, 1, 2, 3].map(() => segMesh('#2FD07A', 0.95, 0.007)),
    lines: [0, 1, 2].map(() => ({ m: segMesh('#2FD07A', 0.9, 0.0085), tag: new Tag(2.3, gl) })),
    fixLine: segMesh('#FFFFFF', 0.9, 0.0095),
    fixRing: new Mesh(GEO.smallRing, new MeshBasicMaterial({ color: COLORS.ok, transparent: true, depthWrite: false })),
    fixTag: new Tag(2.5, gl),
  }), [gl]);
  useEffect(() => () => {
    disposeMeshes(g.box, ...g.edges, ...g.lines.map((l) => l.m), g.fixLine, g.fixRing);
    g.lines.forEach((l) => l.tag.dispose());
    g.fixTag.dispose();
  }, [g]);

  useFrame(() => {
    const s = useStore.getState(), id = guideFocus(s);
    // Rotations mode judges the formation itself, so the guides don't flicker while players move.
    const pos = s.mode === 'rotations' ? displayPositions(s) : null;
    const posOf = (k: PlayerId): Vec2 => (pos ? pos[k] : livePos(k));
    const box = id ? legalBox(s.rot, s.sit, id, posOf) : null;
    const show = !!box && !box.empty;
    g.box.visible = show;
    g.edges.forEach((e) => { e.visible = show; });
    if (box && show) {
      g.box.position.set((box.xmin + box.xmax) / 2, 0.006, (box.zmin + box.zmax) / 2);
      g.box.scale.set(box.xmax - box.xmin, 1, box.zmax - box.zmin);
      const c: Vec2[] = [[box.xmin, box.zmin], [box.xmax, box.zmin], [box.xmax, box.zmax], [box.xmin, box.zmax]];
      g.edges.forEach((e, i) => { const a = c[i], b = c[(i + 1) % 4]; setSeg(e, a[0], a[1], b[0], b[1], 0.035); });
    }
    g.lines.forEach((l, i) => {
      const b = box?.bounds[i];
      l.m.visible = l.tag.sprite.visible = !!b;
      if (!b) return;
      // tags sit in the free zone: right side for depth lines (the bench is on the left), behind the end line for side lines
      if (b.axis === 'z') {
        setSeg(l.m, -4.5, b.value, 4.5, b.value, 0.06);
        l.tag.sprite.position.set(5.7, 0.3, b.value);
      } else {
        setSeg(l.m, b.value, 0, b.value, 9, 0.06);
        l.tag.sprite.position.set(b.value, 0.3, 9.45);
      }
      mat(l.m).color.copy(b.ok ? COLORS.ok : COLORS.bad);
      l.tag.set(boundText(b), b.ok ? TAG_OK : TAG_BAD);
    });
    const p = id ? posOf(id) : null;
    const to = box && show && !box.ok && p ? nearestLegal(box, p, 0.3) : null;
    g.fixLine.visible = g.fixRing.visible = g.fixTag.sprite.visible = !!to;
    if (p && to) {
      setSeg(g.fixLine, p[0], p[1], to[0], to[1], 0.045);
      g.fixRing.position.set(to[0], 0.013, to[1]);
      g.fixTag.sprite.position.set(to[0], 0.2, to[1] + 0.45);
      g.fixTag.set(fixText(p, to), TAG_INK);
    }
  });

  return (
    <>
      <primitive object={g.box} />
      {g.edges.map((e, i) => <primitive key={`e${i}`} object={e} />)}
      {g.lines.map((l, i) => (
        <group key={`l${i}`}>
          <primitive object={l.m} />
          <primitive object={l.tag.sprite} />
        </group>
      ))}
      <primitive object={g.fixLine} />
      <primitive object={g.fixRing} />
      <primitive object={g.fixTag.sprite} />
    </>
  );
}

/** A flat segment on the floor, declared once and never animated. */
function FloorSeg({ a, b, w, y, material }: { a: Vec2; b: Vec2; w: number; y: number; material: MeshBasicMaterial }) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  return (
    <mesh
      geometry={GEO.seg}
      material={material}
      position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]}
      rotation-y={-Math.atan2(dz, dx)}
      scale={[Math.max(Math.hypot(dx, dz), 0.001), 1, w]}
    />
  );
}

/** Dashed arrows from each player's serve stance to where he plays once the ball is struck. */
export function Arrows() {
  const show = useStore((s) => s.arrows && s.mode === 'rotations' && s.phase === 'service' && !s.playing);
  const rot = useStore((s) => s.rot), sit = useStore((s) => s.sit), sel = useStore((s) => s.sel);
  const mats = useMemo(() => ({
    strong: new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.95, depthWrite: false, side: DoubleSide }),
    soft: new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.42, depthWrite: false, side: DoubleSide }),
  }), []);
  useEffect(() => () => { mats.strong.dispose(); mats.soft.dispose(); }, [mats]);

  const arrows = useMemo(() => {
    const f = F[rot][sit];
    return (Object.keys(f.service) as PlayerId[]).flatMap((id) => {
      const a = f.service[id]!, b = f.jeu[id]!;
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.6) return [];
      const ux = dx / len, uz = dz / len, s0 = 0.5, s1 = len - 0.42;
      const at = (t: number): Vec2 => [a[0] + ux * t, a[1] + uz * t];
      const dashes: [Vec2, Vec2][] = [];
      for (let t = s0; t < s1 - 0.12; t += 0.32) dashes.push([at(t), at(Math.min(t + 0.18, s1 - 0.1))]);
      return [{ id, dashes, head: at(s1 + 0.05), angle: -Math.atan2(uz, ux) }];
    });
  }, [rot, sit]);

  if (!show) return null;
  return (
    <group>
      {arrows.map(({ id, dashes, head, angle }) => {
        const on = id === sel, material = on ? mats.strong : mats.soft;
        return (
          <group key={id}>
            {dashes.map(([p, q], i) => <FloorSeg key={i} a={p} b={q} w={on ? 0.075 : 0.05} y={0.008} material={material} />)}
            <mesh geometry={GEO.arrowHead} material={material} position={[head[0], 0.008, head[1]]} rotation-y={angle} />
          </group>
        );
      })}
    </group>
  );
}

/** Where the quiz answer was clicked, coloured by how good it was. */
export function Marker() {
  const at = useStore((s) => (s.mode === 'quiz' && s.quiz.answered ? s.quiz.res?.at ?? null : null));
  const level = useStore((s) => s.quiz.res?.level);
  const material = useMemo(() => new MeshBasicMaterial({ transparent: true, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  if (!at) return null;
  material.color.set(level === 'faute' ? '#FF3B5C' : level === 'loin' ? '#FFC24B' : '#2FD07A');
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh geometry={GEO.markerRing} material={material} position-y={0.015} />
      <FloorSeg a={[-0.2, -0.2]} b={[0.2, 0.2]} w={0.05} y={0.016} material={material} />
      <FloorSeg a={[-0.2, 0.2]} b={[0.2, -0.2]} w={0.05} y={0.016} material={material} />
    </group>
  );
}
