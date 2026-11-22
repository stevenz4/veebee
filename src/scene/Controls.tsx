// Frame driver, camera and pointer input: the parts of the scene that react to time and to the user.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ballAt, captionAt, ease, jumpHeight } from '../domain/action';
import { check, zoneOf, zonesOnCourt } from '../domain/rules';
import type { PlayerId } from '../domain/types';
import { focusId, formationCheck, hideFaults, rulesVisible } from '../state/derive';
import { livePos, reducedMotion, sim, stepTweens } from '../state/sim';
import { useStore, type AppState, type Cam, type Store } from '../state/store';

/** The orbit controls, shared with the pointer handler so a drag can switch them off at once. */
const rig = { controls: null as OrbitControls | null };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Runs first every frame: advances tweens or the scripted rally, then works out which links to draw. */
export function SimDriver() {
  useFrame(() => {
    const now = performance.now(), s = useStore.getState();
    if (sim.action) stepAction(now, s);
    else stepTweens(now);
    updateLinks(s);
  }, -3);
  return null;
}

function stepAction(now: number, s: Store) {
  const { plan, t0 } = sim.action!;
  const t = reducedMotion ? plan.dur : ((now - t0) / 1000) * s.speed;
  for (const [id, track] of Object.entries(plan.T)) {
    const [x, z] = track.at(t);
    Object.assign(sim.players[id as PlayerId], { x, z, y: 0 });
  }
  plan.OT.forEach((track, i) => {
    const [x, z] = track.at(t);
    Object.assign(sim.opps[i], { x, z, y: 0 });
  });
  for (const j of plan.jumps) {
    if (t < j.t0 || t > j.t1) continue;
    if (j.id) sim.players[j.id].y = jumpHeight(j, t);
    else if (j.opp != null) sim.opps[j.opp].y = jumpHeight(j, t);
  }
  const [x, y, z] = ballAt(plan, t);
  Object.assign(sim.ball, { x, y, z });
  s.setActionCaption(captionAt(plan, t));
  if (t >= plan.dur) s.finishAction();
}

function updateLinks(s: AppState) {
  sim.badIds.clear();
  if (!rulesVisible(s)) {
    sim.links = [];
    return;
  }
  // Rotations mode judges the formation itself, so lines stay honest while players are still moving.
  const chk = s.mode === 'rotations' ? formationCheck(s) : check(s.rot, s.sit, livePos);
  const focus = focusId(s);
  sim.links = chk.rels.map((rel) => {
    if (rel.exempt || (s.mode === 'quiz' && rel.ida !== focus && rel.idb !== focus)) return null;
    if (!rel.ok) sim.badIds.add(rel.ida).add(rel.idb);
    return rel;
  });
}

const CAMS = {
  tribune: { pos: [5.8, 10.8, 16.2], tgt: [0, 0.2, 3.4] },
  dessus: { pos: [0, 22.5, 4.66], tgt: [0, 0, 4.6] },
} as const;

/** Camera presets pull back on narrow screens so the whole half court stays in view. */
function camPreset(name: Exclude<Cam, 'joueur'>, aspect: number) {
  const c = CAMS[name], f = aspect < 0.8 ? 1.22 : aspect < 1.25 ? 1.08 : 1;
  const sx = aspect < 0.8 && name === 'tribune' ? -0.6 : 0;
  const t = new Vector3(c.tgt[0] + sx, c.tgt[1], c.tgt[2]);
  const p = new Vector3(t.x + (c.pos[0] - c.tgt[0]) * f, t.y + (c.pos[1] - t.y) * f, t.z + (c.pos[2] - t.z) * f);
  return { pos: p, tgt: t };
}

interface CamTween { t0: number; fp: Vector3; ft: Vector3; tp: Vector3; tt: Vector3 }

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const cam = useStore((s) => s.cam);
  const dragging = useStore((s) => s.dragging !== null);
  const tween = useRef<CamTween | null>(null);
  const placed = useRef(false);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    Object.assign(c, { enableDamping: true, dampingFactor: 0.09, minDistance: 4, maxDistance: 48, maxPolarAngle: 1.48 });
    c.target.set(0, 0.4, 2.6);
    c.addEventListener('start', () => { tween.current = null; });
    rig.controls = c;
    return () => {
      c.dispose();
      rig.controls = null;
      placed.current = false;
    };
  }, [camera, gl]);

  useLayoutEffect(() => {
    camera.fov = size.width / size.height < 0.9 ? 52 : 42;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useEffect(() => {
    if (rig.controls) rig.controls.enabled = cam !== 'joueur' && !dragging;
  }, [cam, dragging]);

  // Glide to the chosen preset; the very first placement is instant.
  useEffect(() => {
    const c = rig.controls;
    if (!c || cam === 'joueur') { tween.current = null; return; }
    const pr = camPreset(cam, size.width / size.height);
    if (!placed.current || reducedMotion) {
      camera.position.copy(pr.pos);
      c.target.copy(pr.tgt);
      c.update();
      tween.current = null;
      placed.current = true;
      return;
    }
    tween.current = { t0: performance.now(), fp: camera.position.clone(), ft: c.target.clone(), tp: pr.pos, tt: pr.tgt };
    // Presets apply when the camera changes, not on every resize.
  }, [cam]);

  useFrame(() => {
    const c = rig.controls, s = useStore.getState();
    if (!c) return;
    if (s.cam === 'joueur') {
      // over the shoulder: just behind and above the player, looking across the net
      const id = s.mode === 'quiz' ? s.quiz.q?.id : s.sel;
      const p = id ? sim.players[id] : null;
      if (p) {
        camera.position.set(p.x * 0.92, 2.75 + p.y * 0.5, p.z + 3.6);
        camera.lookAt(p.x * 0.55, 1.05, p.z - 7);
      }
      return;
    }
    const tw = tween.current;
    if (tw) {
      const t = Math.min(1, (performance.now() - tw.t0) / 850), k = ease(t);
      camera.position.lerpVectors(tw.fp, tw.tp, k);
      c.target.lerpVectors(tw.ft, tw.tt, k);
      if (t >= 1) tween.current = null;
    }
    c.update();
  }, -2);

  return null;
}

const shown = (o: Object3D | null): boolean => {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
};

/**
 * Click a player to select him, drag him in the Fautes mode, click the floor to answer the quiz.
 * A press that moves more than 6 px is a camera orbit, not a click.
 */
export function PointerControls() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster(), ndc = new Vector2(), floor = new Plane(new Vector3(0, 1, 0), 0);
    let down: { x: number; y: number; id: PlayerId | null } | null = null;

    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const floorPoint = () => ray.ray.intersectPlane(floor, new Vector3());
    const hitPlayer = (): PlayerId | null => {
      for (const h of ray.intersectObjects(scene.children, true)) {
        const id = h.object.userData.pick as PlayerId | undefined;
        if (id && shown(h.object)) return id;
      }
      return null;
    };
    const endDrag = () => {
      const s = useStore.getState();
      s.dragEnd();
      if (rig.controls) rig.controls.enabled = s.cam !== 'joueur';
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      aim(e);
      down = { x: e.clientX, y: e.clientY, id: hitPlayer() };
      const s = useStore.getState();
      if (s.mode === 'libre' && !hideFaults(s) && down.id && zoneOf(zonesOnCourt(s.rot, s.sit), down.id) && s.cam !== 'joueur') {
        if (rig.controls) rig.controls.enabled = false;
        s.dragStart(down.id);
        try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      }
    };
    const onMove = (e: PointerEvent) => {
      const s = useStore.getState();
      if (!s.dragging) return;
      aim(e);
      const v = floorPoint();
      if (v) s.dragMove(clamp(v.x, -8.5, 8.5), clamp(v.z, 0.25, 14.5));
    };
    const onUp = (e: PointerEvent) => {
      const s = useStore.getState();
      if (s.dragging) { endDrag(); down = null; return; }
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6, id = down.id;
      down = null;
      if (moved) return;
      aim(e);
      if (s.mode === 'quiz') {
        if (s.quiz.answered || !s.quiz.q) return;
        const v = floorPoint();
        if (!v) return;
        if (v.z < -0.2) { s.flashCaption('Clique dans ton camp, côté caméra', true); return; }
        s.answer(clamp(v.x, -9, 9), clamp(v.z, -0.2, 15));
        return;
      }
      if (id) s.select(id);
    };
    const onCancel = () => {
      if (useStore.getState().dragging) endDrag();
      down = null;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [gl, camera, scene]);

  return null;
}
