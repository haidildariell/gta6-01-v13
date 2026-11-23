// render2d.js — the on-foot city renderer: a warm angled top-down view of Los
// Brasa with roads, lit buildings, palm canopies, market stalls, parked cars,
// the beach and the bay. Also draws the little people of the city — player,
// crew, pedestrians, BBPD officers — and combat dressing (tracers, flashes).

import { WORLD } from './config.js';
import { isSea, ROAD_W, BLOCK } from './world.js';
import { roundRect, shade } from './render3d.js';

export function drawWorld2D(ctx, city, cam, w, h, opts = {}) {
  const night = opts.night || 0;
  const x0 = cam.x - w / 2;
  const y0 = cam.y - h / 2;
  // base ground: city blocks are warm pavement, east edge is sand then sea
  const groundGrad = ctx.createLinearGradient(0, 0, 0, h);
  groundGrad.addColorStop(0, night ? '#262033' : '#9a7d55');
  groundGrad.addColorStop(1, night ? '#1d1828' : '#8a6f4c');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 0, w, h);
  // sea
  const seaSX = WORLD.seaX - x0;
  if (seaSX < w) {
    const sg = ctx.createLinearGradient(seaSX, 0, w, 0);
    sg.addColorStop(0, night ? '#12283f' : '#2c6e9e');
    sg.addColorStop(1, night ? '#0b1a2e' : '#1d4e73');
    ctx.fillStyle = sg;
    ctx.fillRect(Math.max(0, seaSX), 0, w - Math.max(0, seaSX), h);
    // sand strip
    ctx.fillStyle = night ? '#4a3f30' : '#e8cf9f';
    ctx.fillRect(seaSX - 46, 0, 46, h);
    // wave foam
    ctx.strokeStyle = night ? 'rgba(160,200,240,0.35)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const wy = ((i * 211 + (opts.time || 0) * 12) % (h + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(seaSX + 8, wy);
      ctx.quadraticCurveTo(seaSX + 42, wy + 8, seaSX + 84, wy);
      ctx.stroke();
    }
    // docks
    for (const d of city.docks) {
      ctx.fillStyle = '#6e5136';
      ctx.fillRect(d.x - x0, d.y - y0, d.w, d.h);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let px = 0; px < d.w; px += 24) ctx.fillRect(d.x - x0 + px, d.y - y0, 2, d.h);
    }
  }
  // roads: verticals then horizontals with centre dashes
  ctx.fillStyle = night ? '#23232e' : '#3c414d';
  const bx0 = Math.floor(x0 / BLOCK) * BLOCK;
  const by0 = Math.floor(y0 / BLOCK) * BLOCK;
  for (let bx = bx0 - BLOCK; bx < x0 + w + BLOCK; bx += BLOCK) {
    ctx.fillRect(bx - x0, -4, ROAD_W, h + 8);
  }
  for (let by = by0 - BLOCK; by < y0 + h + BLOCK; by += BLOCK) {
    ctx.fillRect(-4, by - y0, w + 8, ROAD_W);
  }
  ctx.strokeStyle = night ? 'rgba(230,225,255,0.5)' : 'rgba(255,232,176,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (let bx = bx0 - BLOCK; bx < x0 + w + BLOCK; bx += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(bx - x0 + ROAD_W / 2, 0);
    ctx.lineTo(bx - x0 + ROAD_W / 2, h);
    ctx.stroke();
  }
  for (let by = by0 - BLOCK; by < y0 + h + BLOCK; by += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(0, by - y0 + ROAD_W / 2);
    ctx.lineTo(w, by - y0 + ROAD_W / 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // kerb glow at golden hour / neon at night
  ctx.strokeStyle = night ? 'rgba(143,127,245,0.35)' : 'rgba(255,178,94,0.4)';
  ctx.lineWidth = 5;
  for (let bx = bx0 - BLOCK; bx < x0 + w + BLOCK; bx += BLOCK) {
    ctx.beginPath();
    ctx.moveTo(bx - x0 + 2, 0);
    ctx.lineTo(bx - x0 + 2, h);
    ctx.moveTo(bx - x0 + ROAD_W - 2, 0);
    ctx.lineTo(bx - x0 + ROAD_W - 2, h);
    ctx.stroke();
  }
  // buildings
  for (const b of city.buildings) {
    const sx = b.x - x0;
    const sy = b.y - y0;
    if (sx + b.w < -30 || sy + b.h < -30 || sx > w + 30 || sy > h + 30) continue;
    ctx.fillStyle = 'rgba(12,8,18,0.3)';
    ctx.fillRect(sx + 7, sy + 9, b.w, b.h);
    ctx.fillStyle = night ? shade(b.roof, -28) : b.roof;
    ctx.fillRect(sx, sy, b.w, b.h);
    ctx.fillStyle = night ? shade(b.wall, -40) : b.wall;
    ctx.fillRect(sx + 5, sy + 5, b.w - 10, b.h - 10);
    // window grid, lit at night
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const lit = ((cx * 31 + cy * 17 + b.seed) % 10) / 10 < b.litRatio;
        ctx.fillStyle = lit ? (night ? 'rgba(255,205,110,0.95)' : 'rgba(70,90,120,0.6)') : 'rgba(30,36,52,0.5)';
        ctx.fillRect(sx + 10 + cx * 24, sy + 10 + cy * 24, 11, 13);
      }
    }
    if (b.sign) {
      ctx.fillStyle = night ? '#ffd23f' : '#14213d';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.sign, sx + b.w / 2, sy + b.h / 2 + 4);
    }
  }
  // market stalls
  for (const s of city.stalls) {
    const sx = s.x - x0;
    const sy = s.y - y0;
    if (sx + s.w < -20 || sy + s.h < -20 || sx > w + 20 || sy > h + 20) continue;
    ctx.fillStyle = 'rgba(12,8,18,0.3)';
    ctx.fillRect(sx + 4, sy + 5, s.w, s.h);
    ctx.fillStyle = s.awning;
    ctx.fillRect(sx, sy, s.w, s.h * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let stripe = 0; stripe < 4; stripe++) ctx.fillRect(sx + stripe * (s.w / 4) + 3, sy, s.w / 8, s.h * 0.45);
    ctx.fillStyle = '#5a4230';
    ctx.fillRect(sx, sy + s.h * 0.45, s.w, s.h * 0.55);
    for (let gi = 0; gi < 3; gi++) {
      ctx.fillStyle = s.goods[gi];
      ctx.beginPath();
      ctx.arc(sx + 14 + gi * 22, sy + s.h * 0.72, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (night) {
      ctx.fillStyle = 'rgba(255,190,90,0.26)';
      ctx.beginPath();
      ctx.ellipse(sx + s.w / 2, sy + s.h / 2, s.w * 0.95, s.h * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // parked cars
  for (const p of city.parked) {
    drawCarTop(ctx, p.x - x0, p.y - y0, p.angle, p.color, {});
  }
  // palms (canopy from above)
  for (const p of city.palms) {
    const sx = p.x - x0;
    const sy = p.y - y0;
    if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue;
    ctx.fillStyle = 'rgba(12,8,18,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx + 5, sy + 7, 15 * p.s, 12 * p.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = night ? shade(p.green, -20) : p.green;
    ctx.lineWidth = 3.4 * p.s;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + p.x * 0.01;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(a) * 13 * p.s, sy + Math.sin(a) * 13 * p.s, sx + Math.cos(a) * 21 * p.s, sy + Math.sin(a) * 21 * p.s);
      ctx.stroke();
    }
    ctx.fillStyle = '#7a5230';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.4 * p.s, 0, Math.PI * 2);
    ctx.fill();
  }
  // lamps glow at night
  if (night) {
    for (const p of city.props) {
      if (p.kind !== 'lamp') continue;
      const sx = p.x - x0;
      const sy = p.y - y0;
      if (sx < -30 || sy < -30 || sx > w + 30 || sy > h + 30) continue;
      const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 42);
      g.addColorStop(0, 'rgba(255,205,110,0.5)');
      g.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 42, sy - 42, 84, 84);
    }
  }
}

export function drawCarTop(ctx, x, y, angle, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(10,6,16,0.35)';
  ctx.fillRect(-27, -11, 58, 26);
  const g = ctx.createLinearGradient(0, -13, 0, 13);
  g.addColorStop(0, shade(color, 26));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -30));
  ctx.fillStyle = g;
  roundRect(ctx, -28, -13, 56, 26, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(14,22,36,0.92)';
  roundRect(ctx, -8, -10, 22, 20, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,205,255,0.4)';
  ctx.fillRect(8, -10, 5, 20);
  ctx.fillStyle = '#101014';
  ctx.fillRect(-24, -15, 11, 4);
  ctx.fillRect(13, -15, 11, 4);
  ctx.fillRect(-24, 11, 11, 4);
  ctx.fillRect(13, 11, 11, 4);
  if (opts.police) {
    ctx.fillStyle = '#f2f4f8';
    ctx.fillRect(-14, -3, 26, 6);
    ctx.fillStyle = opts.flashPhase ? '#ff3b30' : '#2e6bff';
    ctx.fillRect(-4, -8, 8, 16);
  }
  if (opts.boat) {
    ctx.fillStyle = '#e8e4da';
    roundRect(ctx, -30, -10, 60, 20, 9);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, -18, -7, 30, 14, 5);
    ctx.fill();
  }
  ctx.restore();
}

const SKIN_TONES = ['#f2c29b', '#c98d64', '#8a5a3b', '#e8b48c'];
const SHIRT_TONES = ['#ef476f', '#ffd23f', '#06d6a0', '#3fa7d6', '#ff9f1c', '#e8e4da', '#c77dff', '#e2603f'];

export function pedColors(rng) {
  return { skin: rng.pick(SKIN_TONES), shirt: rng.pick(SHIRT_TONES), pants: rng.pick(['#22304a', '#3a2e28', '#e8e4da', '#5a4632']) };
}

// A little person seen from the game's angled top-down camera: shadow, legs,
// torso, head, and a held weapon when armed. `aim` rotates the gun arm.
export function drawPerson(ctx, x, y, o) {
  const s = o.scale || 1;
  ctx.fillStyle = 'rgba(10,6,16,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 13 * s, 9 * s, 3.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const walk = o.walkPhase || 0;
  const legSwing = Math.sin(walk) * 5 * s;
  ctx.strokeStyle = o.pants || '#22304a';
  ctx.lineWidth = 4.4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y + 2 * s);
  ctx.lineTo(x - 3 * s + legSwing * 0.4, y + 12 * s);
  ctx.moveTo(x, y + 2 * s);
  ctx.lineTo(x + 3 * s - legSwing * 0.4, y + 12 * s);
  ctx.stroke();
  ctx.fillStyle = o.shirt || '#e2603f';
  roundRect(ctx, x - 6.4 * s, y - 8 * s, 12.8 * s, 12 * s, 4 * s);
  ctx.fill();
  if (o.vest) {
    ctx.fillStyle = '#14213d';
    roundRect(ctx, x - 6.4 * s, y - 8 * s, 12.8 * s, 7 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = `800 ${6.4 * s}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BBPD', x, y - 2.4 * s);
  }
  ctx.fillStyle = o.skin || '#c98d64';
  ctx.beginPath();
  ctx.arc(x, y - 12.4 * s, 4.6 * s, 0, Math.PI * 2);
  ctx.fill();
  if (o.cap) {
    ctx.fillStyle = o.cap;
    ctx.beginPath();
    ctx.arc(x, y - 13.4 * s, 4.8 * s, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (o.weapon) {
    const a = o.aim || 0;
    ctx.strokeStyle = '#15181f';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 4 * s);
    ctx.lineTo(x + Math.cos(a) * 17 * s, y - 4 * s + Math.sin(a) * 17 * s);
    ctx.stroke();
    if (o.muzzle) {
      const mx = x + Math.cos(a) * 20 * s;
      const my = y - 4 * s + Math.sin(a) * 20 * s;
      ctx.fillStyle = 'rgba(255,220,120,0.95)';
      ctx.beginPath();
      ctx.arc(mx, my, 4.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,160,60,0.4)';
      ctx.beginPath();
      ctx.arc(mx, my, 8.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTracer(ctx, x0, y0, x1, y1, color) {
  ctx.strokeStyle = color || 'rgba(255,214,110,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function drawBoat(ctx, x, y, angle, color) {
  drawCarTop(ctx, x, y, angle, color, { boat: true });
}

export function seaSparkle(ctx, w, h, camX, time) {
  ctx.fillStyle = 'rgba(255,220,160,0.5)';
  for (let i = 0; i < 26; i++) {
    const x = WORLD.seaX - camX + 30 + ((i * 173) % 700);
    const y = ((i * 269 + time * 20) % (h + 40)) - 20;
    if (x > w) continue;
    ctx.fillRect(x, y, 16, 2);
  }
}
