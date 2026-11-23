// The pseudo-3D boulevard renderer: a low chase camera over a segmented
// road, with drawn sprites for buildings, palms, traffic, BBPD units and the
// FALCON. Everything is procedural canvas work — no image assets — so the
// same seed always renders the same frame.

import { SEG_LEN } from './city.js';

export const PALETTES = {
  golden: {
    sky: ['#2b1a4d', '#7b2d5e', '#e85d3d', '#ffb35c'], sun: [0.72, 0.52], sunColor: '#ffd9a0',
    haze: 'rgba(255,150,80,0.20)', silhouette: '#4a2358', verge: '#8d7f70', sand: '#e6bd76', sea: '#2a7f9e',
    ambient: 'rgba(255,140,60,0.10)',
  },
  sunset: {
    sky: ['#1d2456', '#6a3d9a', '#e5638c', '#ffc46b'], sun: [0.30, 0.55], sunColor: '#ffe3b3',
    haze: 'rgba(255,120,120,0.16)', silhouette: '#38204f', verge: '#7d6f63', sand: '#d9a860', sea: '#256b8a',
    ambient: 'rgba(255,110,110,0.08)',
  },
  night: {
    sky: ['#05081f', '#10173d', '#2c2560', '#4a2d6e'], sun: [0.82, 0.16], sunColor: '#f4f1de',
    haze: 'rgba(90,80,180,0.12)', silhouette: '#0a0d26', verge: '#4c463f', sand: '#6b5a41', sea: '#0d2f4a',
    ambient: 'rgba(40,50,140,0.14)',
  },
};

const ROAD_W = 2100;
const CAM_H = 1080;
const CAM_DEPTH = 0.84;
const DRAW = 110;
const SPRITE_K = 0.62;

function lerp(a, b, t) { return a + (b - a) * t; }

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function project(p, cameraX, cameraY, cameraZ, w, h) {
  const relZ = p.worldZ - cameraZ;
  p.scale = CAM_DEPTH / Math.max(1, relZ);
  p.screenX = Math.round(w / 2 + p.scale * (p.worldX - cameraX) * (w / 2));
  p.screenY = Math.round(h / 2 - p.scale * (p.worldY - cameraY) * (h / 2));
  p.screenW = Math.round(p.scale * p.worldW * (w / 2));
}

function quad(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- sprites

function drawBuilding(ctx, x, y, w, h, d, time) {
  // y is the ground line; the box rises h above it.
  const top = y - h;
  const grad = ctx.createLinearGradient(0, top, 0, y);
  grad.addColorStop(0, d.c1);
  grad.addColorStop(1, d.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + w / 2 - w * 0.08, top, w * 0.08, h);
  // Window grid: lit windows warm, dark ones blue-grey.
  const cols = Math.max(2, Math.floor(w / 46));
  const rows = Math.max(2, d.floors || 4);
  const cw = w / (cols + 1);
  const ch = h / (rows + 1);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = ((r * 7 + c * 13 + d.floors) % 5) < 2;
      ctx.fillStyle = lit ? 'rgba(255,196,110,0.92)' : 'rgba(38,48,74,0.85)';
      ctx.fillRect(x - w / 2 + cw * (c + 0.55), top + ch * (r + 0.6), cw * 0.5, ch * 0.52);
    }
  }
  if (d.sign && w > 120) {
    const sh = Math.min(44, h * 0.12);
    ctx.fillStyle = '#1b1030';
    ctx.fillRect(x - w / 2, top, w, sh);
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold ${Math.floor(sh * 0.58)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.sign, x, top + sh / 2 + 1, w * 0.94);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - w / 2, y - 4, w, 4);
}

function drawPalm(ctx, x, y, w, h, d) {
  const lean = (d.lean || 0) * h;
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = Math.max(2, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
  ctx.stroke();
  const tx = x + lean;
  const ty = y - h;
  ctx.strokeStyle = '#2e8b3a';
  ctx.lineWidth = Math.max(2, w * 0.035);
  for (let i = 0; i < 7; i += 1) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = w * (0.75 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty - Math.sin(a) * len * 0.5 - h * 0.04, tx + Math.cos(a) * len, ty - Math.sin(a) * len * 0.22 + h * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.arc(tx - w * 0.05, ty + 3, Math.max(2, w * 0.045), 0, 7);
  ctx.arc(tx + w * 0.06, ty + 4, Math.max(2, w * 0.04), 0, 7);
  ctx.fill();
}

function drawLamp(ctx, x, y, w, h, d, night) {
  ctx.strokeStyle = '#23232a';
  ctx.lineWidth = Math.max(1.5, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();
  if (night) {
    const g = ctx.createRadialGradient(x, y - h, 2, x, y - h, w * 0.9);
    g.addColorStop(0, 'rgba(255,205,120,0.85)');
    g.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.9, y - h - w * 0.9, w * 1.8, w * 1.8);
  }
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(x, y - h, Math.max(1.5, w * 0.07), 0, 7);
  ctx.fill();
}

function drawStall(ctx, x, y, w, h, d) {
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(x - w * 0.42, y - h * 0.52, w * 0.84, h * 0.52);
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, y - h * 0.52);
  ctx.lineTo(x + w * 0.55, y - h * 0.52);
  ctx.lineTo(x + w * 0.38, y - h * 0.86);
  ctx.lineTo(x - w * 0.38, y - h * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 4; i += 1) ctx.fillRect(x - w * 0.55 + (i * w * 0.28), y - h * 0.845, w * 0.12, h * 0.3);
  ctx.fillStyle = '#ffb703';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(x - w * 0.32 + i * (w * 0.16), y - h * 0.4, Math.max(1.5, w * 0.045), 0, 7);
    ctx.fill();
  }
}

function drawPed(ctx, x, y, w, h, d, time) {
  const sw = Math.sin(time * 7 + (d.phase || 0)) * 0.16;
  const legY = y - h * 0.42;
  ctx.strokeStyle = '#26232b';
  ctx.lineWidth = Math.max(1.4, w * 0.11);
  ctx.beginPath();
  ctx.moveTo(x, legY);
  ctx.lineTo(x - w * (0.16 + sw * 0.2), y);
  ctx.moveTo(x, legY);
  ctx.lineTo(x + w * (0.16 - sw * 0.2), y);
  ctx.stroke();
  ctx.fillStyle = d.shirt;
  roundRect(ctx, x - w * 0.21, y - h * 0.78, w * 0.42, h * 0.38, w * 0.08);
  ctx.fill();
  ctx.fillStyle = d.skin;
  ctx.beginPath();
  ctx.arc(x, y - h * 0.88, w * 0.155, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,24,0.9)';
  ctx.beginPath();
  ctx.arc(x, y - h * 0.93, w * 0.155, Math.PI, 0);
  ctx.fill();
}

// Rear view of a car. kind: 'car' | 'police' | 'hero' | 'rival'.
export function drawCarRear(ctx, cx, groundY, w, color, kind, time, plateText) {
  const h = w * 0.52;
  const top = groundY - h;
  // Shadow + tyres.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + h * 0.02, w * 0.52, h * 0.09, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#0c0c0e';
  roundRect(ctx, cx - w * 0.47, groundY - h * 0.3, w * 0.13, h * 0.3, w * 0.03); ctx.fill();
  roundRect(ctx, cx + w * 0.34, groundY - h * 0.3, w * 0.13, h * 0.3, w * 0.03); ctx.fill();
  // Body.
  const grad = ctx.createLinearGradient(0, top, 0, groundY);
  grad.addColorStop(0, color);
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = kind === 'police' ? '#e8e9eb' : grad;
  roundRect(ctx, cx - w * 0.5, top + h * 0.22, w, h * 0.72, w * 0.07);
  ctx.fill();
  if (kind === 'police') {
    ctx.fillStyle = '#14161c';
    roundRect(ctx, cx - w * 0.5, top + h * 0.52, w, h * 0.2, w * 0.03);
    ctx.fill();
    ctx.fillStyle = '#e8e9eb';
    ctx.font = `bold ${Math.max(6, w * 0.085)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BBPD', cx, top + h * 0.665);
  }
  // Cabin / rear glass.
  ctx.fillStyle = kind === 'police' ? '#10141f' : '#141a26';
  roundRect(ctx, cx - w * 0.36, top, w * 0.72, h * 0.34, w * 0.06);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,200,255,0.35)';
  roundRect(ctx, cx - w * 0.32, top + h * 0.04, w * 0.3, h * 0.12, w * 0.03);
  ctx.fill();
  if (kind === 'hero') {
    // Spoiler.
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(cx - w * 0.46, top - h * 0.05, w * 0.92, h * 0.07);
    ctx.fillRect(cx - w * 0.4, top, w * 0.05, h * 0.08);
    ctx.fillRect(cx + w * 0.35, top, w * 0.05, h * 0.08);
  }
  // Tail lights.
  const tl = kind === 'police' ? '#ff3b30' : '#ff2d40';
  ctx.fillStyle = tl;
  roundRect(ctx, cx - w * 0.46, top + h * 0.42, w * 0.2, h * 0.09, w * 0.02); ctx.fill();
  roundRect(ctx, cx + w * 0.26, top + h * 0.42, w * 0.2, h * 0.09, w * 0.02); ctx.fill();
  const glow = ctx.createRadialGradient(cx, top + h * 0.46, 2, cx, top + h * 0.46, w * 0.55);
  glow.addColorStop(0, 'rgba(255,45,64,0.20)');
  glow.addColorStop(1, 'rgba(255,45,64,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - w * 0.6, top - h * 0.1, w * 1.2, h * 1.1);
  // Plate.
  if (w > 60) {
    ctx.fillStyle = '#f5f2e8';
    roundRect(ctx, cx - w * 0.13, top + h * 0.6, w * 0.26, h * 0.15, 2);
    ctx.fill();
    ctx.fillStyle = '#20304a';
    ctx.font = `bold ${Math.max(5, w * 0.085)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plateText || 'BRASA', cx, top + h * 0.68);
    ctx.textBaseline = 'alphabetic';
  }
  if (kind === 'police') {
    // Light bar with alternating strobes.
    const phase = Math.floor(time * 6) % 2;
    ctx.fillStyle = '#14161c';
    roundRect(ctx, cx - w * 0.3, top - h * 0.1, w * 0.6, h * 0.1, w * 0.03);
    ctx.fill();
    ctx.fillStyle = phase ? '#ff3b30' : '#ff8080';
    roundRect(ctx, cx - w * 0.29, top - h * 0.095, w * 0.27, h * 0.08, w * 0.02); ctx.fill();
    ctx.fillStyle = phase ? '#7ab8ff' : '#2f7bff';
    roundRect(ctx, cx + w * 0.02, top - h * 0.095, w * 0.27, h * 0.08, w * 0.02); ctx.fill();
    const lg = ctx.createRadialGradient(cx, top - h * 0.05, 2, cx, top - h * 0.05, w * 0.8);
    lg.addColorStop(0, phase ? 'rgba(255,60,60,0.30)' : 'rgba(60,120,255,0.30)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(cx - w * 0.85, top - h * 0.7, w * 1.7, h * 1.4);
  }
}

// World sizes are in road units (road half-width = 2100). Screen size comes
// from the same projection as the road: width scales with canvas W/2,
// height with canvas H/2.
function drawSprite(ctx, s, sx, sy, scale, time, night, pxW, pxH) {
  const d = s.data || {};
  if (s.type === 'building') {
    const w = scale * (d.w || 1100) * pxW;
    const h = scale * (d.h || 2200) * pxH;
    if (w < 6 || h < 6) return;
    drawBuilding(ctx, sx, sy, w, h, d, time);
  } else if (s.type === 'palm') {
    const w = scale * 520 * pxW;
    const h = scale * (d.h || 1900) * pxH;
    if (h < 8) return;
    drawPalm(ctx, sx, sy, w, h, d);
  } else if (s.type === 'lamp') {
    const w = scale * 90 * pxW;
    const h = scale * 1150 * pxH;
    if (h < 6) return;
    drawLamp(ctx, sx, sy, w, h, d, night);
  } else if (s.type === 'stall') {
    const w = scale * 1000 * pxW;
    const h = scale * 760 * pxH;
    if (w < 8) return;
    drawStall(ctx, sx, sy, w, h, d);
  } else if (s.type === 'parked') {
    const w = scale * 500 * pxW;
    if (w < 10) return;
    drawCarRear(ctx, sx, sy, w, d.color || '#888', 'car', time, null);
  } else if (s.type === 'ped') {
    const w = scale * 185 * pxW;
    const h = scale * 505 * pxH;
    if (h < 7) return;
    drawPed(ctx, sx, sy, w, h, d, time);
  }
}

// The FALCON's searchlight cone, drawn on its own BEFORE the hero car so
// the beam lights the road without washing over the car it is hunting.
export function drawHeliCone(ctx, x, y, s, spotTo) {
  if (!spotTo) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const grad = ctx.createLinearGradient(0, 26, spotTo.x - x, spotTo.y - y);
  grad.addColorStop(0, 'rgba(255,240,190,0.34)');
  grad.addColorStop(1, 'rgba(255,240,190,0.05)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-14, 24);
  ctx.lineTo(16, 24);
  ctx.lineTo(spotTo.x - x + 95, spotTo.y - y);
  ctx.lineTo(spotTo.x - x - 95, spotTo.y - y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// The FALCON: drawn in screen space, big and detailed, spotlight on the hero.
export function drawHelicopter(ctx, x, y, s, time, spotTo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Light pool where the beam lands (the cone itself is drawn earlier).
  if (spotTo) {
    ctx.fillStyle = 'rgba(255,244,200,0.16)';
    ctx.beginPath();
    ctx.ellipse(spotTo.x - x, spotTo.y - y, 100, 20, 0, 0, 7);
    ctx.fill();
  }
  // Tail boom + fin.
  ctx.fillStyle = '#173f4d';
  ctx.beginPath();
  ctx.moveTo(28, -2);
  ctx.lineTo(118, -12);
  ctx.lineTo(122, -2);
  ctx.lineTo(30, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f2c38';
  ctx.fillRect(116, -26, 9, 30);
  ctx.strokeStyle = 'rgba(220,240,255,0.75)';
  ctx.lineWidth = 2.4;
  const tr = Math.sin(time * 40) * 10;
  ctx.beginPath();
  ctx.moveTo(120, -12 - 12 + tr * 0.2);
  ctx.lineTo(120, -12 + 12 - tr * 0.2);
  ctx.stroke();
  // Body.
  const bodyGrad = ctx.createLinearGradient(0, -26, 0, 26);
  bodyGrad.addColorStop(0, '#2a7d8c');
  bodyGrad.addColorStop(0.6, '#175263');
  bodyGrad.addColorStop(1, '#0e3542');
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, -58, -24, 104, 48, 22);
  ctx.fill();
  ctx.fillStyle = '#f2f4f4';
  ctx.fillRect(-58, 2, 104, 8);
  // Cockpit glass.
  ctx.fillStyle = '#bfe6f5';
  roundRect(ctx, -56, -18, 34, 26, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  roundRect(ctx, -52, -15, 12, 20, 5);
  ctx.fill();
  // Markings.
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BBPD', 8, 0);
  ctx.fillStyle = '#e8e9eb';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.fillText('FALCON-1', 8, 20);
  // Skids.
  ctx.strokeStyle = '#0b222b';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-42, 34);
  ctx.lineTo(38, 34);
  ctx.moveTo(-30, 24);
  ctx.lineTo(-34, 34);
  ctx.moveTo(26, 24);
  ctx.lineTo(30, 34);
  ctx.stroke();
  // Main rotor (blurred disc + blades).
  ctx.fillStyle = 'rgba(200,225,240,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, -30, 96, 7, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,255,0.8)';
  ctx.lineWidth = 3;
  const ra = time * 31;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ra) * -94, -30 + Math.sin(ra) * 3);
  ctx.lineTo(Math.cos(ra) * 94, -30 - Math.sin(ra) * 3);
  ctx.stroke();
  ctx.fillStyle = '#0e3542';
  ctx.fillRect(-7, -34, 14, 7);
  ctx.restore();
}

// ------------------------------------------------------------------- sky

function drawSky(ctx, w, h, horizon, pal, time, night) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  for (let i = 0; i < pal.sky.length; i += 1) grad.addColorStop(i / (pal.sky.length - 1), pal.sky[i]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizon + 2);
  if (night) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i += 1) {
      const sx = ((i * 197.3) % 1) * w + Math.floor(i * 197.3) * 0;
      const px = ((i * 269) % w);
      const py = ((i * 131) % Math.max(10, horizon * 0.7));
      ctx.globalAlpha = 0.25 + ((i * 37) % 10) / 14;
      ctx.fillRect(px, py, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  // Sun / moon.
  const [sfx, sfy] = pal.sun;
  const sx = sfx * w;
  const sy = sfy * horizon;
  const sr = night ? 26 : 44;
  const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, sr * 3.4);
  sg.addColorStop(0, pal.sunColor);
  sg.addColorStop(0.25, pal.sunColor + 'cc');
  sg.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - sr * 3.4, sy - sr * 3.4, sr * 6.8, sr * 6.8);
  ctx.fillStyle = pal.sunColor;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, 7);
  ctx.fill();
  // Clouds.
  ctx.fillStyle = night ? 'rgba(30,34,80,0.55)' : 'rgba(255,235,220,0.5)';
  for (let i = 0; i < 6; i += 1) {
    const cx = ((i * 0.19 + 0.06) * w + time * (2 + i)) % (w + 240) - 120;
    const cy = horizon * (0.12 + (i % 3) * 0.13);
    const cw = 90 + (i % 3) * 46;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.2, 0, 0, 7);
    ctx.ellipse(cx + cw * 0.4, cy + 4, cw * 0.6, cw * 0.15, 0, 0, 7);
    ctx.fill();
  }
  // Distant skyline + hills silhouette.
  ctx.fillStyle = pal.silhouette;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  let bx = 0;
  let i = 0;
  while (bx < w) {
    const bw = 40 + ((i * 53) % 70);
    const bh = 26 + ((i * 91) % 74);
    ctx.lineTo(bx, horizon - bh);
    ctx.lineTo(bx + bw, horizon - bh);
    ctx.lineTo(bx + bw, horizon);
    bx += bw + 6;
    i += 1;
  }
  ctx.lineTo(w, horizon);
  ctx.closePath();
  ctx.fill();
}

// ----------------------------------------------------------------- render

export class RoadRenderer {
  constructor(ctx, w, h) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
  }

  render(scene) {
    const { ctx, w, h } = this;
    const road = scene.road;
    const pal = PALETTES[scene.palette] || PALETTES.golden;
    const night = scene.palette === 'night';
    const horizon = Math.round(h * 0.485);
    drawSky(ctx, w, h, horizon, pal, scene.time, night);
    ctx.fillStyle = pal.haze;
    ctx.fillRect(0, horizon - 2, w, 4);

    const totalLen = road.totalLength;
    const position = ((scene.position % totalLen) + totalLen) % totalLen;
    const baseIndex = Math.floor(position / SEG_LEN) % road.length;
    const basePercent = (position % SEG_LEN) / SEG_LEN;
    const playerSeg = road.segments[baseIndex];
    const nextSeg = road.segments[(baseIndex + 1) % road.length];
    const playerY = lerp(playerSeg.y, nextSeg.y, basePercent);
    const cameraY = playerY + CAM_H;
    const cameraX = scene.playerX * ROAD_W;

    // Project the strip. Curve accumulation: each segment bends the road by
    // seg.curve; x is the accumulated lateral world offset of the road centre.
    const projected = [];
    let x = 0;
    let dx = -(playerSeg.curve * basePercent);
    let maxY = h;
    const camZ = position;
    for (let n = 0; n < DRAW; n += 1) {
      const seg = road.segments[(baseIndex + n) % road.length];
      const segNext = road.segments[(baseIndex + n + 1) % road.length];
      const p1 = { worldX: x, worldY: seg.y, worldZ: camZ + n * SEG_LEN, worldW: ROAD_W, screenX: 0, screenY: 0, screenW: 0, scale: 0 };
      const p2 = { worldX: x + dx, worldY: segNext.y, worldZ: camZ + (n + 1) * SEG_LEN, worldW: ROAD_W, screenX: 0, screenY: 0, screenW: 0, scale: 0 };
      project(p1, cameraX, cameraY, camZ, w, h);
      project(p2, cameraX, cameraY, camZ, w, h);
      const clip = maxY;
      projected.push({ seg, p1, p2, clip, fog: n / DRAW });
      if (p2.screenY < maxY) maxY = p2.screenY;
      x += dx;
      dx += seg.curve;
    }

    // Cars grouped by segment for the far-to-near pass.
    const carsBySeg = new Map();
    for (const car of scene.cars || []) {
      let rel = Math.floor((((car.z - position) % totalLen) + totalLen) % totalLen / SEG_LEN);
      if (rel < DRAW) {
        if (!carsBySeg.has(rel)) carsBySeg.set(rel, []);
        carsBySeg.get(rel).push(car);
      }
    }

    // Far to near: road quads, then that segment's sprites and cars.
    for (let n = DRAW - 1; n >= 0; n -= 1) {
      const { seg, p1, p2, clip } = projected[n];
      if (p2.screenY >= clip || p1.screenY >= h + 40) {
        // Still may need sprites if the road is hidden by a crest? Skip both.
        if (p1.screenY >= h + 40) continue;
      }
      const y1 = p1.screenY;
      const y2 = p2.screenY;
      if (y2 < y1) {
        const asphalt = seg.alt ? '#34353d' : '#3a3b44';
        const verge = pal.verge;
        // Verge / sidewalk full width.
        quad(ctx, 0, y2, w, y2, w, y1, 0, y1, seg.coastal ? pal.sand : verge);
        if (seg.coastal) {
          // Sea band on the right beyond the sand.
          quad(ctx, p2.screenX + p2.screenW * 2.4, y2, w, y2, w, y1, p1.screenX + p1.screenW * 2.4, y1, pal.sea);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          const fy1 = y1 - 1;
          ctx.fillRect(p1.screenX + p1.screenW * 2.4, fy1, w, 1.4);
        }
        // Sidewalks.
        quad(ctx, p2.screenX - p2.screenW * 1.28, y2, p2.screenX - p2.screenW, y2, p1.screenX - p1.screenW, y1, p1.screenX - p1.screenW * 1.28, y1, '#a99c88');
        quad(ctx, p2.screenX + p2.screenW, y2, p2.screenX + p2.screenW * 1.28, y2, p1.screenX + p1.screenW * 1.28, y1, p1.screenX + p1.screenW, y1, '#a99c88');
        // Asphalt.
        quad(ctx, p2.screenX - p2.screenW, y2, p2.screenX + p2.screenW, y2, p1.screenX + p1.screenW, y1, p1.screenX - p1.screenW, y1, asphalt);
        // Edge lines + lane dashes.
        ctx.fillStyle = 'rgba(240,240,235,0.75)';
        const ew = Math.max(1, p1.screenW * 0.012);
        ctx.fillRect(p1.screenX - p1.screenW - ew / 2, y2, ew, Math.max(1, y1 - y2));
        ctx.fillRect(p1.screenX + p1.screenW - ew / 2, y2, ew, Math.max(1, y1 - y2));
        if (seg.index % 2 === 0) {
          ctx.fillStyle = 'rgba(255,209,102,0.9)';
          for (const lane of [-0.34, 0.34]) {
            const lx1 = p1.screenX + lane * p1.screenW;
            const lx2 = p2.screenX + lane * p2.screenW;
            quad(ctx, lx2 - ew / 2, y2, lx2 + ew / 2, y2, lx1 + ew / 2, y1, lx1 - ew / 2, y1, 'rgba(255,209,102,0.85)');
          }
        }
        // Haze toward the horizon.
        if (projected[n].fog > 0.55) {
          ctx.fillStyle = `rgba(255,170,110,${(projected[n].fog - 0.55) * 0.24})`;
          if (night) ctx.fillStyle = `rgba(20,24,70,${(projected[n].fog - 0.55) * 0.3})`;
          ctx.fillRect(0, y2, w, Math.max(1, y1 - y2));
        }
      }
      // Sprites of this segment, then its cars (drawn last = on top).
      for (const s of seg.sprites) {
        const sx = p1.screenX + s.offset * p1.screenW;
        drawSprite(ctx, s, sx, y1, p1.scale, scene.time, night, w / 2, h / 2);
      }
      const segCars = carsBySeg.get(n) || [];
      for (const car of segCars) {
        const relZ = (((car.z - position) % totalLen) + totalLen) % totalLen;
        const scale = CAM_DEPTH / Math.max(60, relZ);
        const carX = p1.screenX + car.offset * p1.screenW;
        const ww = Math.max(6, scale * 500 * (w / 2));
        drawCarRear(ctx, carX, y1, ww, car.color, car.kind, scene.time, car.plate);
      }
    }

    // Race checkpoint ring on the road, if a marker was staged.
    if (scene.marker) {
      const rel = (((scene.marker.z - position) % totalLen) + totalLen) % totalLen;
      const n = Math.floor(rel / SEG_LEN);
      if (n >= 0 && n < DRAW) {
        const p = projected[n].p1;
        const cxm = p.screenX + (scene.marker.offset || 0) * p.screenW;
        const rx = Math.max(8, p.screenW * 0.24);
        const ry = rx * 0.66;
        // Posts plant the hoop on the asphalt.
        ctx.strokeStyle = 'rgba(46,196,182,0.55)';
        ctx.lineWidth = Math.max(2, rx * 0.07);
        ctx.beginPath();
        ctx.moveTo(cxm - rx, p.screenY);
        ctx.lineTo(cxm - rx, p.screenY - ry);
        ctx.moveTo(cxm + rx, p.screenY);
        ctx.lineTo(cxm + rx, p.screenY - ry);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(46,196,182,0.35)';
        ctx.lineWidth = Math.max(4, rx * 0.22);
        ctx.beginPath();
        ctx.ellipse(cxm, p.screenY - ry, rx, ry, 0, 0, 7);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(46,196,182,0.95)';
        ctx.lineWidth = Math.max(2, rx * 0.09);
        ctx.beginPath();
        ctx.ellipse(cxm, p.screenY - ry, rx, ry, 0, 0, 7);
        ctx.stroke();
      }
    }

    // Hero car, screen space, big and low. Geometry first: the FALCON's
    // cone is laid down before the car so the beam stays off its paint.
    if (scene.hero) {
      const heroW = w * 0.235 * (scene.hero.scaleMul || 1);
      const heroX = w / 2 + scene.playerX * w * 0.16 + Math.sin(scene.time * 23) * (scene.speed > 4 ? 1.1 : 0);
      const heroY = h * 0.995 + Math.sin(scene.time * 31) * (scene.speed > 4 ? 1.4 : 0);
      scene._heroScreen = { x: heroX, y: heroY - heroW * 0.52, w: heroW };
      if (scene.heli) {
        drawHeliCone(ctx, w * scene.heli.x, h * scene.heli.y, scene.heli.scale, { x: heroX, y: heroY - heroW * 0.52 + 30 });
      }
      drawCarRear(ctx, heroX, heroY, heroW, '#ff7b00', 'hero', scene.time, 'BRASA-1');
    }

    // FALCON overhead.
    if (scene.heli) {
      const hx = w * scene.heli.x;
      const hy = h * scene.heli.y;
      const spot = scene.hero ? { x: scene._heroScreen.x, y: scene._heroScreen.y + 30 } : null;
      drawHelicopter(ctx, hx, hy, scene.heli.scale, scene.time, spot);
    }

    // Warm ambient wash for golden/sunset.
    if (pal.ambient) {
      ctx.fillStyle = pal.ambient;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
