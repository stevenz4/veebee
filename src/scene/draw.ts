// 2D canvas drawings used as textures: floor markings, zone numbers, labels, ball, net, antennas.
import { CanvasTexture, SRGBColorSpace, type WebGLRenderer } from 'three';
import { PLAYERS } from '../domain/data';
import type { PlayerId, Zone } from '../domain/types';

export const FONT_DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
export const FONT_LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(c: HTMLCanvasElement, gl?: WebGLRenderer) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (gl) t.anisotropy = gl.capabilities.getMaxAnisotropy();
  return t;
}

const ctx = (c: HTMLCanvasElement) => c.getContext('2d')!;

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Court 9 × 18 m on a 19 × 32 m floor, FIVB markings, 64 px per metre. */
export function drawFloor() {
  const PPM = 64, W = 19, H = 32;
  const c = makeCanvas(W * PPM, H * PPM), g = ctx(c);
  const X = (x: number) => (x + W / 2) * PPM, Z = (z: number) => (z + H / 2) * PPM;
  g.fillStyle = '#1F5F8B';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#D9783A';
  g.fillRect(X(-4.5), Z(-9), 9 * PPM, 18 * PPM);
  // faint sports-floor grain
  g.globalAlpha = 0.05;
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = i % 2 ? '#000000' : '#ffffff';
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2 + Math.random() * 40, 1);
  }
  g.globalAlpha = 1;
  const lw = 0.05 * PPM;
  g.fillStyle = '#F7F7F2';
  g.fillRect(X(-4.5), Z(-9), 9 * PPM, lw); // far end line
  g.fillRect(X(-4.5), Z(9) - lw, 9 * PPM, lw); // our end line
  g.fillRect(X(-4.5), Z(-9), lw, 18 * PPM); // left side line
  g.fillRect(X(4.5) - lw, Z(-9), lw, 18 * PPM); // right side line
  g.fillRect(X(-4.5), Z(0) - lw / 2, 9 * PPM, lw); // centre line
  g.fillRect(X(-4.5), Z(3) - lw, 9 * PPM, lw); // our attack line (3 m)
  g.fillRect(X(-4.5), Z(-3), 9 * PPM, lw); // their attack line
  // attack-line extensions: five 15 cm dashes, 20 cm apart, beyond each side line
  for (const side of [-1, 1]) {
    for (const zz of [3, -3]) {
      for (let k = 0; k < 5; k++) {
        const a = 4.5 + 0.2 + k * 0.35;
        g.fillRect(side > 0 ? X(a) : X(-a - 0.15), zz > 0 ? Z(3) - lw : Z(-3), 0.15 * PPM, lw);
      }
    }
  }
  // service-zone marks: 15 cm, 20 cm behind each end line, in line with the side lines
  for (const sx of [-4.5, 4.5]) {
    const x0 = sx < 0 ? X(-4.5) : X(4.5) - lw;
    g.fillRect(x0, Z(9.2), lw, 0.15 * PPM);
    g.fillRect(x0, Z(-9.35), lw, 0.15 * PPM);
  }
  return c;
}

/** Zone numbers and dashed zone limits on our half (a separate layer, so it can be toggled). */
export function drawZones(c: HTMLCanvasElement) {
  const g = ctx(c), S = 100;
  g.clearRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 4;
  g.setLineDash([22, 18]);
  for (const x of [-1.5, 1.5]) {
    g.beginPath();
    g.moveTo((x + 4.5) * S, 0);
    g.lineTo((x + 4.5) * S, 900);
    g.stroke();
  }
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 210px ${FONT_DISPLAY}`;
  const spots: [Zone, number, number][] = [[4, -3, 1.5], [3, 0, 1.5], [2, 3, 1.5], [5, -3, 6], [6, 0, 6], [1, 3, 6]];
  for (const [z, x, d] of spots) g.fillText(String(z), (x + 4.5) * S, d * S + 10);
}

/** Name tag above a player: code, number and zone, orange when selected. */
export function drawLabel(c: HTMLCanvasElement, id: PlayerId, selected: boolean, zone: Zone | 0) {
  const g = ctx(c), W = 256, H = 128;
  g.clearRect(0, 0, W, H);
  const { code, num } = PLAYERS[id];
  const sub = `#${num} · ${zone ? `Z${zone}` : 'banc'}`;
  g.font = `800 58px ${FONT_DISPLAY}`;
  const cw = g.measureText(code).width;
  g.font = `600 34px ${FONT_LABEL}`;
  const sw = g.measureText(sub).width;
  const bw = Math.min(W - 8, cw + sw + 46), bx = (W - bw) / 2;
  g.fillStyle = selected ? '#F08A45' : 'rgba(9,18,28,0.86)';
  roundRect(g, bx, 12, bw, 84, 20);
  g.fill();
  g.beginPath();
  g.moveTo(W / 2 - 13, 95);
  g.lineTo(W / 2 + 13, 95);
  g.lineTo(W / 2, 112);
  g.closePath();
  g.fill();
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = `800 58px ${FONT_DISPLAY}`;
  g.fillStyle = selected ? '#1E1006' : id === 'L' ? '#F2C230' : '#FFFFFF';
  g.fillText(code, bx + 18, 57);
  g.font = `600 34px ${FONT_LABEL}`;
  g.fillStyle = selected ? '#3A1E0A' : 'rgba(214,226,238,0.92)';
  g.fillText(sub, bx + 18 + cw + 10, 60);
}

/** Rounded pill with white text, used for rule tags floating over the court. */
export function drawTag(c: HTMLCanvasElement, text: string, bg: string) {
  const g = ctx(c);
  g.clearRect(0, 0, 512, 112);
  g.font = `700 50px ${FONT_LABEL}`;
  const w = Math.min(500, g.measureText(text).width + 48);
  g.fillStyle = bg;
  roundRect(g, (512 - w) / 2, 12, w, 88, 44);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 58);
}

/** Wavy yellow and blue panels, the look of a match ball. */
export function drawBall() {
  const c = makeCanvas(512, 256), g = ctx(c);
  g.fillStyle = '#F5F2EA';
  g.fillRect(0, 0, 512, 256);
  for (const [color, y0] of [['#F2C230', 30], ['#2457A6', 104], ['#F2C230', 178]] as const) {
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i <= 512; i += 8) {
      const y = y0 + Math.sin((i / 512) * Math.PI * 4) * 16;
      if (i) g.lineTo(i, y);
      else g.moveTo(i, y);
    }
    for (let j = 512; j >= 0; j -= 8) g.lineTo(j, y0 + 40 + Math.sin((j / 512) * Math.PI * 4) * 16);
    g.closePath();
    g.fill();
  }
  return c;
}

/** One 10 cm net mesh square, repeated across the net. */
export function drawNetTile() {
  const c = makeCanvas(32, 32), g = ctx(c);
  g.strokeStyle = 'rgba(18,20,24,0.9)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 32, 32);
  return c;
}

/** Antenna: red and white 10 cm bands. */
export function drawAntenna() {
  const c = makeCanvas(8, 180), g = ctx(c);
  for (let k = 0; k < 18; k++) {
    g.fillStyle = k % 2 ? '#F4F4F0' : '#D7263D';
    g.fillRect(0, k * 10, 8, 10);
  }
  return c;
}
