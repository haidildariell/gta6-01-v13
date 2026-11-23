// render3d.js — the low chase-camera road renderer. A segmented boulevard is
// projected from a camera that sits just behind the hero car's rear quarter;
// traffic, police, palms, signage, the FALCON air unit and its spotlight cone
// are all drawn as scaled vector sprites in road space. Used by the driving
// mode, the street races and the staged cover/race scenes.

import { clamp, lerp } from './rng.js';

export const CAM = { height: 1050, depth: 0.84, back: 900, roadHalf: 1150, segLen: 200, drawSegs: 46 };

// The camera sits CAM.back units behind the z=0 plane, so the nearest drawn
// segment is already at a sane depth and the hero car lands at ~350px wide.
export function project(wx, wy, wz, cam) {
  const dz = Math.max(1, wz - cam.z + CAM.back);
  const scale = CAM.depth / dz;
  return {
    x: cam.cx + scale * (wx - cam.x) * cam.w2,
    y: cam.cy - scale * (wy - cam.y) * cam.h2,
    w: scale * cam.w2, // screen pixels per world unit at this depth
    scale,
  };
}

export function skyGradient(ctx, w, h, pal, horizonY) {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY * 1.15);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(0.85, pal.skyLow);
  g.addColorStop(1, pal.skyGlow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizonY * 1.15 + 2);
  // sun disc with halo
  const sx = w * 0.68;
  const sy = horizonY * 0.62;
  const halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, horizonY * 0.75);
  halo.addColorStop(0, 'rgba(255,230,160,0.85)');
  halo.addColorStop(0.25, 'rgba(255,180,110,0.35)');
  halo.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, horizonY * 1.3);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, horizonY * 0.13, 0, Math.PI * 2);
  ctx.fill();
  // cloud bands
  ctx.fillStyle = 'rgba(255,190,170,0.5)';
  for (let i = 0; i < 5; i++) {
    const cy = horizonY * (0.16 + i * 0.13);
    const cw = w * (0.16 + (i % 3) * 0.05);
    const cx = ((i * 317) % Math.max(1, w - cw));
    ctx.beginPath();
    ctx.ellipse(cx + cw / 2, cy, cw / 2, horizonY * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function skyline(ctx, w, horizonY, pal, seedShift) {
  ctx.fillStyle = 'rgba(40,22,64,0.55)';
  let x = -20;
  let i = 0;
  while (x < w + 20) {
    const bw = 40 + ((i * 53 + seedShift) % 70);
    const bh = horizonY * (0.18 + ((i * 37 + seedShift) % 40) / 100);
    ctx.fillRect(x, horizonY - bh, bw, bh);
    x += bw + 6 + ((i * 29) % 22);
    i++;
  }
  // lit windows on the skyline
  ctx.fillStyle = 'rgba(255,205,120,0.8)';
  for (let k = 0; k < 90; k++) {
    const wx = (k * 89 + seedShift * 3) % w;
    const wy = horizonY - ((k * 41) % Math.max(2, Math.floor(horizonY * 0.34)));
    ctx.fillRect(wx, wy, 2.4, 3.2);
  }
}

export function drawCarRear(ctx, x, yBase, w, car, opts = {}) {
  const h = w * 0.52;
  const y = yBase - h;
  // ground shadow
  ctx.fillStyle = 'rgba(10,6,16,0.42)';
  ctx.beginPath();
  ctx.ellipse(x, yBase + h * 0.04, w * 0.56, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // wheels
  ctx.fillStyle = '#101014';
  const ww = w * 0.13;
  ctx.fillRect(x - w * 0.5, y + h * 0.62, ww, h * 0.36);
  ctx.fillRect(x + w * 0.5 - ww, y + h * 0.62, ww, h * 0.36);
  // body
  const bodyGrad = ctx.createLinearGradient(0, y, 0, y + h);
  bodyGrad.addColorStop(0, shade(car.color, 28));
  bodyGrad.addColorStop(0.45, car.color);
  bodyGrad.addColorStop(1, shade(car.color, -34));
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, x - w * 0.48, y + h * 0.3, w * 0.96, h * 0.62, w * 0.06);
  ctx.fill();
  // cabin / rear glass
  ctx.fillStyle = 'rgba(16,24,38,0.92)';
  roundRect(ctx, x - w * 0.36, y + h * 0.02, w * 0.72, h * 0.34, w * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,205,255,0.35)';
  roundRect(ctx, x - w * 0.32, y + h * 0.05, w * 0.3, h * 0.26, w * 0.04);
  ctx.fill();
  // spoiler on sporty cars
  if (opts.spoiler) {
    ctx.fillStyle = shade(car.color, -48);
    ctx.fillRect(x - w * 0.46, y + h * 0.2, w * 0.92, h * 0.07);
    ctx.fillRect(x - w * 0.4, y + h * 0.24, w * 0.07, h * 0.12);
    ctx.fillRect(x + w * 0.33, y + h * 0.24, w * 0.07, h * 0.12);
  }
  // tail lights
  const tl = opts.brake ? '#ff5a4d' : '#c22e2e';
  ctx.fillStyle = tl;
  roundRect(ctx, x - w * 0.44, y + h * 0.52, w * 0.24, h * 0.1, 3);
  ctx.fill();
  roundRect(ctx, x + w * 0.2, y + h * 0.52, w * 0.24, h * 0.1, 3);
  ctx.fill();
  if (opts.brake) {
    ctx.fillStyle = 'rgba(255,80,60,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.57, w * 0.55, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // plate + exhausts
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(x - w * 0.09, y + h * 0.68, w * 0.18, h * 0.12);
  ctx.fillStyle = '#20242c';
  ctx.fillRect(x - w * 0.3, y + h * 0.84, w * 0.07, h * 0.07);
  ctx.fillRect(x + w * 0.23, y + h * 0.84, w * 0.07, h * 0.07);
  if (opts.nitro) {
    const fg = ctx.createRadialGradient(x, y + h * 0.9, 1, x, y + h * 0.9, w * 0.2);
    fg.addColorStop(0, 'rgba(160,225,255,0.95)');
    fg.addColorStop(0.5, 'rgba(70,150,255,0.55)');
    fg.addColorStop(1, 'rgba(50,100,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(x - w * 0.265, y + h * 0.92, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.265, y + h * 0.92, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // police light bar
  if (opts.police) {
    const flash = opts.flashPhase ? 1 : 0;
    ctx.fillStyle = '#14161c';
    ctx.fillRect(x - w * 0.3, y - h * 0.04, w * 0.6, h * 0.09);
    ctx.fillStyle = flash ? '#ff3b30' : '#7a1610';
    ctx.fillRect(x - w * 0.29, y - h * 0.035, w * 0.27, h * 0.07);
    ctx.fillStyle = flash ? '#2e6bff' : '#7db4ff';
    ctx.fillRect(x + w * 0.02, y - h * 0.035, w * 0.27, h * 0.07);
    ctx.fillStyle = flash ? 'rgba(255,60,50,0.3)' : 'rgba(70,140,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.62, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2f4f8';
    ctx.font = `700 ${Math.max(6, h * 0.13)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BBPD', x, y + h * 0.47);
  }
  if (opts.label) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `600 ${Math.max(7, h * 0.11)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(opts.label, x, y - h * 0.1);
  }
}

export function drawHelicopter(ctx, x, y, s, opts = {}) {
  const body = opts.color || '#1b2a4a';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opts.tilt || 0);
  // tail boom
  ctx.fillStyle = shade(body, -12);
  ctx.beginPath();
  ctx.moveTo(s * 0.18, -s * 0.05);
  ctx.lineTo(s * 0.95, -s * 0.16);
  ctx.lineTo(s * 0.98, -s * 0.05);
  ctx.lineTo(s * 0.2, s * 0.05);
  ctx.closePath();
  ctx.fill();
  // tail fin + tail rotor
  ctx.fillStyle = shade(body, 8);
  ctx.fillRect(s * 0.9, -s * 0.3, s * 0.09, s * 0.3);
  ctx.strokeStyle = 'rgba(220,230,240,0.75)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(s * 0.945, -s * 0.34);
  ctx.lineTo(s * 0.945, s * 0.02);
  ctx.stroke();
  // fuselage
  const fg = ctx.createLinearGradient(0, -s * 0.22, 0, s * 0.22);
  fg.addColorStop(0, shade(body, 34));
  fg.addColorStop(0.55, body);
  fg.addColorStop(1, shade(body, -30));
  ctx.fillStyle = fg;
  roundRect(ctx, -s * 0.42, -s * 0.2, s * 0.72, s * 0.42, s * 0.16);
  ctx.fill();
  // BBPD stripe
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-s * 0.42, s * 0.02, s * 0.72, s * 0.05);
  // glass cockpit
  ctx.fillStyle = 'rgba(165,215,255,0.9)';
  roundRect(ctx, -s * 0.42, -s * 0.15, s * 0.3, s * 0.26, s * 0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  roundRect(ctx, -s * 0.4, -s * 0.13, s * 0.12, s * 0.2, s * 0.05);
  ctx.fill();
  // lettering
  ctx.fillStyle = '#f2f4f8';
  ctx.font = `800 ${s * 0.13}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('BBPD · FALCON', s * 0.08, -s * 0.02);
  // skids
  ctx.strokeStyle = '#0d1117';
  ctx.lineWidth = Math.max(1.4, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, s * 0.34);
  ctx.lineTo(s * 0.26, s * 0.34);
  ctx.moveTo(-s * 0.24, s * 0.2);
  ctx.lineTo(-s * 0.28, s * 0.34);
  ctx.moveTo(s * 0.14, s * 0.2);
  ctx.lineTo(s * 0.18, s * 0.34);
  ctx.stroke();
  // main rotor (motion-blurred disc + blade sweep)
  ctx.fillStyle = 'rgba(200,215,230,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.3, s * 0.78, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,238,248,0.8)';
  ctx.lineWidth = Math.max(1.4, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(-s * 0.78, -s * 0.3);
  ctx.lineTo(s * 0.78, -s * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(-s * 0.03, -s * 0.33, s * 0.06, s * 0.08);
  // searchlight pod
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(-s * 0.3, s * 0.2, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSpotlightCone(ctx, fromX, fromY, toX, toY, groundW) {
  const grad = ctx.createLinearGradient(fromX, fromY, toX, toY);
  grad.addColorStop(0, 'rgba(255,240,190,0.5)');
  grad.addColorStop(1, 'rgba(255,240,190,0.13)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(fromX - 6, fromY);
  ctx.lineTo(fromX + 6, fromY);
  ctx.lineTo(toX + groundW / 2, toY);
  ctx.lineTo(toX - groundW / 2, toY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,200,0.28)';
  ctx.beginPath();
  ctx.ellipse(toX, toY, groundW / 2, groundW * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPalm3D(ctx, x, yBase, s, green) {
  ctx.strokeStyle = '#6e4a2f';
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(x, yBase);
  ctx.quadraticCurveTo(x + s * 0.12, yBase - s * 0.7, x + s * 0.3, yBase - s * 1.25);
  ctx.stroke();
  const tx = x + s * 0.3;
  const ty = yBase - s * 1.25;
  ctx.strokeStyle = green;
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.17);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * s * 0.5, ty + Math.sin(a) * s * 0.4 - s * 0.12, tx + Math.cos(a) * s * 0.78, ty + Math.sin(a) * s * 0.55 + s * 0.22);
    ctx.stroke();
  }
}

export function drawCheckpointRing(ctx, x, y, r, t) {
  const pulse = 1 + Math.sin(t * 4) * 0.05;
  ctx.strokeStyle = 'rgba(255,210,63,0.95)';
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath();
  ctx.ellipse(x, y, r * pulse, r * 1.28 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,63,0.35)';
  ctx.lineWidth = Math.max(4, r * 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.12 * pulse, r * 1.42 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  const fg = ctx.createLinearGradient(0, y + r * 1.2, 0, y + r * 1.6);
  fg.addColorStop(0, 'rgba(255,210,63,0.4)');
  fg.addColorStop(1, 'rgba(255,210,63,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(x - r, y + r * 1.2, r * 2, r * 0.5);
}

// Renders one full road scene. `scene` describes everything in road space:
// segments carry the curve, actors sit at (lane, z) with z in world units
// ahead of the camera car, roadside rows are palms/signs/buildings.
export function drawRoadScene(ctx, w, h, pal, scene) {
  const horizonY = Math.floor(h * 0.42);
  skyGradient(ctx, w, h, pal, horizonY);
  skyline(ctx, w, horizonY, pal, scene.seedShift || 7);
  // sea on the right shoulder, sand strip, then land on the left
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  const seaGrad = ctx.createLinearGradient(w * 0.8, 0, w, 0);
  seaGrad.addColorStop(0, pal.seaGlow);
  seaGrad.addColorStop(0.25, pal.sea);
  seaGrad.addColorStop(1, pal.sea);
  ctx.fillStyle = seaGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.86, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.lineTo(w, h);
  ctx.lineTo(w * 0.985, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8cf9f';
  ctx.beginPath();
  ctx.moveTo(w * 0.845, horizonY);
  ctx.lineTo(w * 0.86, horizonY);
  ctx.lineTo(w * 0.985, h);
  ctx.lineTo(w * 0.955, h);
  ctx.closePath();
  ctx.fill();

  const cam = {
    x: scene.camX || 0,
    y: CAM.height,
    z: scene.camZ || 0,
    cx: w / 2,
    cy: horizonY,
    w2: w / 2,
    h2: h / 2,
    fov: 300,
  };
  const segCount = CAM.drawSegs;
  // build segment screen geometry far-to-near data
  const segs = [];
  let curveAcc = 0;
  let xOff = 0;
  for (let i = 0; i < segCount; i++) {
    const z0 = i * CAM.segLen;
    const z1 = z0 + CAM.segLen;
    const curve = scene.curveAt ? scene.curveAt(z0 + (scene.camZ || 0)) : 0;
    curveAcc += curve;
    xOff += curveAcc;
    const p0 = project(xOff * 40, 0, z0, cam);
    const p1 = project(xOff * 40 + curve * 40, 0, z1, cam);
    segs.push({ i, z0, z1, p0, p1, curve });
  }
  // draw road far to near
  for (let i = segCount - 1; i >= 0; i--) {
    const s = segs[i];
    const { p0, p1 } = s;
    if (p1.y < horizonY - 2) continue;
    const rw0 = p0.w * CAM.roadHalf;
    const rw1 = p1.w * CAM.roadHalf;
    // shoulders / sidewalk
    ctx.fillStyle = i % 2 ? '#c9b18c' : '#bfa87f';
    poly(ctx, p0.x - rw0 * 1.5, p0.y, p0.x + rw0 * 1.5, p0.y, p1.x + rw1 * 1.5, p1.y, p1.x - rw1 * 1.5, p1.y);
    // asphalt
    ctx.fillStyle = i % 2 ? pal.road : shade(pal.road, 7);
    poly(ctx, p0.x - rw0, p0.y, p0.x + rw0, p0.y, p1.x + rw1, p1.y, p1.x - rw1, p1.y);
    // glowing edges
    ctx.fillStyle = pal.roadEdge;
    poly(ctx, p0.x - rw0, p0.y, p0.x - rw0 * 0.94, p0.y, p1.x - rw1 * 0.94, p1.y, p1.x - rw1, p1.y);
    poly(ctx, p0.x + rw0 * 0.94, p0.y, p0.x + rw0, p0.y, p1.x + rw1, p1.y, p1.x + rw1 * 0.94, p1.y);
    // lane dashes
    if (i % 2 === 0) {
      ctx.fillStyle = pal.lane;
      for (const laneF of [-0.34, 0.34]) {
        const lx0 = p0.x + rw0 * laneF;
        const lx1 = p1.x + rw1 * laneF;
        poly(ctx, lx0 - rw0 * 0.016, p0.y, lx0 + rw0 * 0.016, p0.y, lx1 + rw1 * 0.016, p1.y, lx1 - rw1 * 0.016, p1.y);
      }
    }
  }
  // roadside + actors, far to near
  const items = [];
  for (const a of scene.actors || []) items.push(a);
  items.sort((a, b) => b.z - a.z);
  for (const a of items) {
    const seg = segs[Math.min(segCount - 1, Math.floor(a.z / CAM.segLen))];
    if (!seg) continue;
    const t = (a.z - seg.z0) / CAM.segLen;
    const baseX = lerp(seg.p0.x, seg.p1.x, t);
    const baseY = lerp(seg.p0.y, seg.p1.y, t);
    const rw = lerp(seg.p0.w, seg.p1.w, t) * CAM.roadHalf;
    const x = baseX + (a.lane || 0) * rw;
    if (a.kind === 'palm') {
      drawPalm3D(ctx, x, baseY, rw * 0.27 * (a.s || 1), a.green || '#2e7d4f');
    } else if (a.kind === 'sign') {
      drawRoadSign(ctx, x, baseY, rw * 0.42, a.text, a.color);
    } else if (a.kind === 'building') {
      drawRoadBuilding(ctx, x, baseY, rw * (a.w || 1.6), pal, a);
    } else if (a.kind === 'car' || a.kind === 'police') {
      const cw = rw * 2 * (a.widthF || 0.27);
      drawCarRear(ctx, x, baseY, cw, a.model, { police: a.kind === 'police', brake: a.brake, nitro: a.nitro, spoiler: a.spoiler, flashPhase: a.flashPhase, label: a.label });
    } else if (a.kind === 'ring') {
      drawCheckpointRing(ctx, x, baseY - rw * 0.62, rw * 0.5, scene.time || 0);
    } else if (a.kind === 'ped') {
      drawPedSilhouette(ctx, x, baseY, rw * 0.2, a);
    }
  }
  return { cam, horizonY, segs };
}

export function drawPedSilhouette(ctx, x, yBase, s, a) {
  ctx.fillStyle = 'rgba(10,6,16,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, yBase, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = a.shirt || '#e2603f';
  ctx.fillRect(x - s * 0.11, yBase - s * 0.62, s * 0.22, s * 0.36);
  ctx.fillStyle = a.pants || '#22304a';
  ctx.fillRect(x - s * 0.11, yBase - s * 0.28, s * 0.09, s * 0.28);
  ctx.fillRect(x + s * 0.03, yBase - s * 0.28, s * 0.09, s * 0.28);
  ctx.fillStyle = a.skin || '#c98d64';
  ctx.beginPath();
  ctx.arc(x, yBase - s * 0.72, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoadSign(ctx, x, yBase, s, text, color) {
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(x - s * 0.04, yBase - s * 1.5, s * 0.08, s * 1.5);
  ctx.fillStyle = color || '#14213d';
  roundRect(ctx, x - s * 0.85, yBase - s * 2.05, s * 1.7, s * 0.55, s * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.font = `800 ${s * 0.3}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text || 'LAS PALMAS', x, yBase - s * 1.68);
}

function drawRoadBuilding(ctx, x, yBase, w, pal, a) {
  const hgt = w * (a.h || 1.5);
  ctx.fillStyle = a.wall || '#caa27a';
  ctx.fillRect(x - w / 2, yBase - hgt, w, hgt);
  ctx.fillStyle = a.roof || '#7a4a35';
  ctx.fillRect(x - w / 2 - w * 0.03, yBase - hgt, w * 1.06, hgt * 0.05);
  ctx.fillStyle = 'rgba(255,214,130,0.9)';
  const cols = 4;
  const rows = Math.max(2, Math.floor(hgt / (w * 0.22)));
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      if (((cx * 7 + cy * 13 + (a.seed || 0)) % 5) < 2) continue;
      ctx.fillRect(x - w / 2 + w * (0.12 + cx * 0.2), yBase - hgt + hgt * (0.12 + cy * 0.16), w * 0.1, hgt * 0.08);
    }
  }
  if (a.sign) {
    ctx.fillStyle = '#14213d';
    ctx.fillRect(x - w * 0.42, yBase - hgt * 0.24, w * 0.84, hgt * 0.13);
    ctx.fillStyle = '#ffd23f';
    ctx.font = `800 ${hgt * 0.085}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(a.sign, x, yBase - hgt * 0.145);
  }
}

export function poly(ctx, x0, y0, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

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

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 0xff) + amt;
  let b = (n & 0xff) + amt;
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}
