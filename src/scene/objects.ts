// Small reusable 3D pieces: flat segments drawn on the floor, and text tags that face the camera.
import {
  CircleGeometry, Color, CylinderGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, Shape, ShapeGeometry,
  SphereGeometry, Sprite, SpriteMaterial, type CanvasTexture, type Object3D, type WebGLRenderer,
} from 'three';
import { canvasTexture, drawTag, makeCanvas } from './draw';
import { useFonts } from './env';

export const COLORS = {
  ok: new Color('#2FD07A'),
  bad: new Color('#FF3B5C'),
  white: new Color('#FFFFFF'),
};
export const TAG_OK = 'rgba(16,96,58,0.94)';
export const TAG_BAD = 'rgba(190,24,52,0.96)';
export const TAG_INK = 'rgba(9,18,28,0.9)';

/** Shared geometries: one copy for all players. */
export const GEO = {
  leg: new CylinderGeometry(0.08, 0.068, 0.86, 12),
  shorts: new CylinderGeometry(0.205, 0.218, 0.24, 18),
  torso: new CylinderGeometry(0.245, 0.2, 0.6, 18),
  arm: new CylinderGeometry(0.052, 0.044, 0.62, 10),
  head: new SphereGeometry(0.125, 20, 14),
  ring: new RingGeometry(0.36, 0.45, 48).rotateX(-Math.PI / 2),
  disc: new CircleGeometry(0.34, 40).rotateX(-Math.PI / 2),
  /** Unit square lying on the floor, scaled into a segment by setSeg. */
  seg: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  smallRing: new RingGeometry(0.2, 0.29, 36).rotateX(-Math.PI / 2),
  markerRing: new RingGeometry(0.22, 0.3, 40).rotateX(-Math.PI / 2),
  arrowHead: (() => {
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(-0.3, 0.16);
    s.lineTo(-0.3, -0.16);
    s.closePath();
    return new ShapeGeometry(s).rotateX(-Math.PI / 2);
  })(),
};

export function segMesh(color: string, opacity: number, y: number) {
  const m = new Mesh(GEO.seg, new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.position.y = y;
  return m;
}

/** Stretch a floor segment from (ax, az) to (bx, bz), w metres wide. */
export function setSeg(m: Object3D, ax: number, az: number, bx: number, bz: number, w: number) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  m.position.x = (ax + bx) / 2;
  m.position.z = (az + bz) / 2;
  m.scale.set(Math.max(len, 0.001), 1, w);
  m.rotation.y = -Math.atan2(dz, dx);
}

/** A text pill floating over the court; redrawn only when its text or colour changes. */
export class Tag {
  readonly sprite: Sprite;
  private readonly canvas = makeCanvas(512, 112);
  private readonly texture: CanvasTexture;
  private key = '';

  constructor(width: number, gl: WebGLRenderer) {
    this.texture = canvasTexture(this.canvas, gl);
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, depthTest: false, transparent: true }));
    this.sprite.scale.set(width, (width * 112) / 512, 1);
    this.sprite.renderOrder = 998;
    this.sprite.visible = false;
  }

  set(text: string, bg: string) {
    const key = `${text}|${bg}|${useFonts.getState().epoch}`;
    if (key === this.key) return;
    this.key = key;
    drawTag(this.canvas, text, bg);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}

export function disposeMeshes(...meshes: Mesh[]) {
  for (const m of meshes) (m.material as MeshBasicMaterial).dispose();
}
