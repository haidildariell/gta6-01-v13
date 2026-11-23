// On-foot renderer: a street-level boardwalk scene — stalls, string lights,
// lit colonial facades, and drawn characters with walk/aim/down poses. The
// live game walks Dario along this street; the market screenshot stages a
// firefight on the same boards.

import { roundRect } from './road.js';

export const FOOT_WORLD = 26000; // boardwalk length in world units

function drawFigure(ctx, x, groundY, hgt, o) {
  // o: {shirt, skin, pants, aim (radians|null), down, run (phase), flash}
  const wdt = hgt * 0.36;
  if (o.down) {
    ctx.save();
    ctx.translate(x, groundY - hgt * 0.08);
    ctx.rotate(-0.22);
    ctx.fillStyle = o.shirt;
    roundRect(ctx, -hgt * 0.42, -hgt * 0.1, hgt * 0.52, hgt * 0.17, 4);
    ctx.fill();
    ctx.fillStyle = o.pants;
    roundRect(ctx, hgt * 0.08, -hgt * 0.09, hgt * 0.4, hgt * 0.13, 4);
    ctx.fill();
    ctx.fillStyle = o.skin;
    ctx.beginPath();
    ctx.arc(-hgt * 0.5, -hgt * 0.02, hgt * 0.085, 0, 7);
    ctx.fill();
    ctx.restore();
    return;
  }
  const ph = o.run || 0;
  const legSwing = Math.sin(ph) * hgt * 0.09;
  ctx.strokeStyle = o.pants;
  ctx.lineWidth = hgt * 0.075;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, groundY - hgt * 0.46);
  ctx.lineTo(x - wdt * 0.22 + legSwing, groundY);
  ctx.moveTo(x, groundY - hgt * 0.46);
  ctx.lineTo(x + wdt * 0.22 - legSwing, groundY);
  ctx.stroke();
  // Torso.
  ctx.fillStyle = o.shirt;
  roundRect(ctx, x - wdt * 0.26, groundY - hgt * 0.82, wdt * 0.52, hgt * 0.4, hgt * 0.05);
  ctx.fill();
  // Head + cap/hair.
  ctx.fillStyle = o.skin;
  ctx.beginPath();
  ctx.arc(x, groundY - hgt * 0.9, hgt * 0.085, 0, 7);
  ctx.fill();
  ctx.fillStyle = o.hair || '#191922';
  ctx.beginPath();
  ctx.arc(x, groundY - hgt * 0.935, hgt * 0.085, Math.PI, 0);
  ctx.fill();
  // Arms: aiming arm points along o.aim; the other hangs or runs.
  ctx.strokeStyle = o.shirt;
  ctx.lineWidth = hgt * 0.06;
  ctx.beginPath();
  if (o.aim !== null && o.aim !== undefined) {
    const ax = x + Math.cos(o.aim) * wdt * 0.62;
    const ay = groundY - hgt * 0.72 + Math.sin(o.aim) * wdt * 0.62;
    ctx.moveTo(x, groundY - hgt * 0.74);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    // Gun.
    ctx.strokeStyle = '#101014';
    ctx.lineWidth = hgt * 0.035;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(o.aim) * hgt * 0.16, ay + Math.sin(o.aim) * hgt * 0.16);
    ctx.stroke();
    if (o.flash) {
      const fx = ax + Math.cos(o.aim) * hgt * 0.2;
      const fy = ay + Math.sin(o.aim) * hgt * 0.2;
      ctx.fillStyle = 'rgba(255,190,60,0.95)';
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + o.aim;
        const r = i % 2 ? hgt * 0.05 : hgt * 0.13;
        ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.moveTo(x, groundY - hgt * 0.74);
    ctx.lineTo(x - wdt * 0.3, groundY - hgt * 0.5 + Math.sin(ph) * hgt * 0.04);
    ctx.moveTo(x, groundY - hgt * 0.74);
    ctx.lineTo(x + wdt * 0.3, groundY - hgt * 0.5 - Math.sin(ph) * hgt * 0.04);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawStallRow(ctx, w, horizon, groundY, camX, time, stalls) {
  for (const st of stalls) {
    const sx = st.x - camX;
    if (sx < -320 || sx > w + 320) continue;
    const sw = 250;
    const sh = 190;
    const top = groundY - sh - 130;
    // Posts + counter.
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(sx - sw / 2, top + 60, 8, sh + 70);
    ctx.fillRect(sx + sw / 2 - 8, top + 60, 8, sh + 70);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(sx - sw / 2, groundY - 128, sw, 46);
    // Goods: fruit / bottles / cloth dots.
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = ['#ffb703', '#fb8500', '#90be6d', '#ef476f', '#e0aaff'][(i + st.variant) % 5];
      ctx.beginPath();
      ctx.arc(sx - sw / 2 + 22 + i * (sw - 44) / 8, groundY - 132 - (i % 3) * 7, 7, 0, 7);
      ctx.fill();
    }
    // Striped awning.
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2 - 16, top + 64);
    ctx.lineTo(sx + sw / 2 + 16, top + 64);
    ctx.lineTo(sx + sw / 2 - 8, top + 6);
    ctx.lineTo(sx - sw / 2 + 8, top + 6);
    ctx.closePath();
    ctx.fillStyle = st.color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(sx - sw / 2 - 16 + i * (sw / 4) + 8, top + 64);
      ctx.lineTo(sx - sw / 2 - 16 + (i + 0.5) * (sw / 4) + 8, top + 64);
      ctx.lineTo(sx - sw / 2 + 8 + (i + 0.5) * (sw / 4), top + 6);
      ctx.lineTo(sx - sw / 2 + 8 + i * (sw / 4), top + 6);
      ctx.closePath();
      ctx.fill();
    }
    // Sign.
    ctx.fillStyle = '#160f24';
    ctx.fillRect(sx - 62, top - 26, 124, 24);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.sign, sx, top - 13);
    ctx.textBaseline = 'alphabetic';
  }
}

export function drawFootScene(ctx, w, h, scene) {
  const horizon = h * 0.52;
  const groundY = h * 0.94;
  // Dusk-night sky.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#12082e');
  sky.addColorStop(0.6, '#33164f');
  sky.addColorStop(1, '#6e2a5e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 44; i += 1) {
    ctx.globalAlpha = 0.2 + ((i * 29) % 10) / 16;
    ctx.fillRect((i * 173) % w, (i * 97) % (horizon * 0.62), 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  // Facades with warm windows behind the stalls.
  const camX = scene.camX || 0;
  for (let i = -1; i < 8; i += 1) {
    const bx = i * 210 - (camX * 0.35 % 210);
    const bh = 190 + ((i * 67) % 90);
    ctx.fillStyle = ['#241536', '#2b1838', '#1f1230'][(i + 8) % 3];
    ctx.fillRect(bx, horizon - bh, 196, bh);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const lit = ((r * 5 + c + i * 3) % 4) !== 0;
        ctx.fillStyle = lit ? 'rgba(255,186,92,0.9)' : 'rgba(30,26,54,0.9)';
        ctx.fillRect(bx + 16 + c * 36, horizon - bh + 18 + r * 42, 18, 24);
      }
    }
  }
  // Boardwalk ground: planks + warm light pools.
  const g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#3a2340');
  g.addColorStop(0.25, '#4a2c3c');
  g.addColorStop(1, '#241423');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const py = horizon + 14 + i * ((h - horizon) / 8);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }
  // String lights across the top of the market.
  ctx.strokeStyle = 'rgba(255,205,120,0.35)';
  ctx.lineWidth = 1.4;
  for (let row = 0; row < 2; row += 1) {
    const baseY = horizon - 130 + row * 44;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 90) ctx.lineTo(x, baseY + Math.sin(x / 90 * Math.PI) * 12 + 10);
    ctx.stroke();
    for (let x = 45; x < w; x += 90) {
      const by = baseY + Math.sin((x - 45) / 90 * Math.PI + 0.5) * 12 + 12;
      const bulb = ctx.createRadialGradient(x, by, 1, x, by, 13);
      bulb.addColorStop(0, 'rgba(255,214,130,0.95)');
      bulb.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = bulb;
      ctx.fillRect(x - 13, by - 13, 26, 26);
    }
  }
  drawStallRow(ctx, w, horizon, groundY, camX, scene.time, scene.stalls || []);
  // Tracers under the figures (they read as crossing the whole frame).
  for (const t of scene.tracers || []) {
    const grad = ctx.createLinearGradient(t.x1, t.y1, t.x2, t.y2);
    grad.addColorStop(0, 'rgba(255,220,130,0.95)');
    grad.addColorStop(1, 'rgba(255,120,60,0.15)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
  }
  // Figures sorted by depth lane.
  const figs = [...(scene.figures || [])].sort((a, b) => a.lane - b.lane);
  for (const f of figs) {
    const fx = f.x - camX * (f.lane === 0 ? 1 : 0.92);
    if (fx < -80 || fx > w + 80) continue;
    const scale = 1 - f.lane * 0.13;
    drawFigure(ctx, fx, groundY - f.lane * 26, 168 * scale, f);
  }
  // Warm vignette.
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,4,18,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}
