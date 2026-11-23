// HUD and menu screens for ISLA BRASA. The cover lives or dies on HUD
// density, so every panel the spec names is drawn here from live game state:
// mission, dispatch, weapons, crew, dialog, minimap, respect, radio, and the
// full-screen MAP / STATS / GARAGE / SHOP menus behind Esc.

import { MAP_LAYOUT } from './city.js';
import { CITY, GARAGE_CARS, UPGRADES, SHOPS } from './config.js';
import { roundRect } from './road.js';

const INK = 'rgba(10,10,20,0.78)';
const INK2 = 'rgba(10,10,20,0.62)';
const LINE = 'rgba(255,255,255,0.16)';
const TXT = '#f5f1e8';
const DIM = '#b9b3a4';
const ACC = '#ffb703';

export function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || INK;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,0.14)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0.01) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

function portrait(ctx, x, y, s, color, initials) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, s, s, 7);
  ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.42, s * 0.17, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(18,14,20,0.92)';
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.36, s * 0.17, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(18,14,20,0.85)';
  roundRect(ctx, x + s * 0.24, y + s * 0.66, s * 0.52, s * 0.3, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `bold ${Math.floor(s * 0.24)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(initials, x + s / 2, y + s * 0.9);
  ctx.textAlign = 'left';
}

function stars(ctx, x, y, n, size) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < n ? '#ffd23f' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', x + i * (size + 1), y);
  }
}

// Combined island path for map markers: south loop, then the north road back.
function islandPath() {
  const pts = [];
  for (const p of MAP_LAYOUT.roadLoop.slice(0, -1)) pts.push(p);
  const north = [...MAP_LAYOUT.roadNorth].reverse();
  for (const p of north.slice(0, -1)) pts.push(p);
  return pts;
}
const PATH = islandPath();
const PATH_LEN = (() => {
  let L = 0;
  for (let i = 1; i <= PATH.length; i += 1) {
    const a = PATH[i - 1];
    const b = PATH[i % PATH.length];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
})();

export function pathPoint(frac) {
  let d = (((frac % 1) + 1) % 1) * PATH_LEN;
  for (let i = 1; i <= PATH.length; i += 1) {
    const a = PATH[i - 1];
    const b = PATH[i % PATH.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    d -= seg;
  }
  return PATH[0];
}

function drawMapCanvas(ctx, x, y, w, h, ui, detailed) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.clip();
  // Sea, then landmass.
  ctx.fillStyle = '#14425e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1d5c40';
  roundRect(ctx, x + w * 0.03, y + h * 0.03, w * 0.8, h * 0.94, 18);
  ctx.fill();
  const px = (mx) => x + (mx / 100) * w;
  const py = (my) => y + (my / 100) * h;
  // District blocks.
  for (const d of MAP_LAYOUT.districts) {
    const city = CITY.districts.find((c) => c.id === d.id);
    ctx.fillStyle = (city ? city.color : '#888') + '55';
    ctx.fillRect(px(d.x), py(d.y), (d.w / 100) * w, (d.h / 100) * h);
    if (detailed) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold ${Math.floor(h * 0.032)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(d.name, px(d.x + d.w / 2), py(d.y + d.h * 0.18));
      ctx.textAlign = 'left';
    }
  }
  // Street grid hints.
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  for (let gx = 1; gx < 9; gx += 1) {
    ctx.beginPath(); ctx.moveTo(px(gx * 10), y); ctx.lineTo(px(gx * 10), y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, py(gx * 10)); ctx.lineTo(x + w, py(gx * 10)); ctx.stroke();
  }
  // Roads.
  ctx.strokeStyle = '#f5f1e8';
  ctx.lineWidth = Math.max(1.6, h * 0.006);
  for (const loop of [MAP_LAYOUT.roadLoop, MAP_LAYOUT.roadNorth]) {
    ctx.beginPath();
    loop.forEach(([mx, my], i) => (i ? ctx.lineTo(px(mx), py(my)) : ctx.moveTo(px(mx), py(my))));
    ctx.stroke();
  }
  // Objective route.
  if (ui.map && ui.map.objectiveFrac !== undefined) {
    const [ox, oy] = pathPoint(ui.map.objectiveFrac);
    const [ux, uy] = pathPoint(ui.map.frac);
    ctx.strokeStyle = ACC;
    ctx.lineWidth = Math.max(2, h * 0.008);
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(px(ux), py(uy));
    ctx.lineTo(px(ox), py(oy));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(px(ox), py(oy), Math.max(3, h * 0.014), 0, 7);
    ctx.fill();
  }
  // POI blips.
  if (detailed || (ui.map && ui.map.pois)) {
    for (const poi of MAP_LAYOUT.pois) {
      ctx.fillStyle = '#10131c';
      ctx.beginPath();
      ctx.arc(px(poi.x), py(poi.y), Math.max(4, h * 0.016), 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.font = `bold ${Math.floor(h * 0.024)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(poi.icon, px(poi.x), py(poi.y) + 0.5);
      ctx.textBaseline = 'alphabetic';
      if (detailed) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `${Math.floor(h * 0.02)}px system-ui, sans-serif`;
        ctx.fillText(poi.name, px(poi.x), py(poi.y) - h * 0.026);
      }
    }
  }
  // Police blips.
  if (ui.map) {
    for (const b of ui.map.blips || []) {
      const [bx, by] = pathPoint(b.frac);
      ctx.fillStyle = b.color || '#3a86ff';
      ctx.beginPath();
      ctx.arc(px(bx), py(by), Math.max(2.6, h * 0.011), 0, 7);
      ctx.fill();
    }
  }
  // Player arrow.
  if (ui.map) {
    const [ux, uy] = pathPoint(ui.map.frac);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#10131c';
    ctx.beginPath();
    ctx.arc(px(ux), py(uy), Math.max(3.4, h * 0.015), 0, 7);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // North marker.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.floor(h * 0.03)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('N ▲', x + w - 8, y + h * 0.045);
  ctx.textAlign = 'left';
}

export function drawMinimap(ctx, x, y, size, ui) {
  panel(ctx, x, y, size, size, INK2);
  drawMapCanvas(ctx, x + 5, y + 5, size - 10, size - 10, ui, false);
}

// ------------------------------------------------------------- main HUD

export function drawHUD(ctx, w, h, ui) {
  const S = w / 1280; // scale unit
  ctx.save();
  ctx.scale(S, S);
  const W = 1280;
  const H = 720;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Mission panel, top-left.
  if (ui.job) {
    panel(ctx, 18, 16, 348, 104);
    ctx.fillStyle = ACC;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`JOB ${ui.job.n}/${ui.job.total} — ${ui.job.name.toUpperCase()}`, 32, 40);
    ctx.fillStyle = DIM;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`STAGE ${ui.job.stage}/${ui.job.stageTotal}`, 32, 60);
    bar(ctx, 118, 50, 150, 8, ui.job.stage / ui.job.stageTotal, ACC);
    if (ui.job.timer) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(ui.job.timer, 352, 60);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = TXT;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`NEXT: ${ui.job.next}`, 32, 84, 320);
    ctx.fillStyle = DIM;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`Fixer: ${ui.job.giver}`, 32, 103);
  }

  // Air-unit banner, top-center.
  if (ui.banner) {
    const bw = 430;
    panel(ctx, (W - bw) / 2, 16, bw, 40, 'rgba(90,10,20,0.82)');
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ui.banner, W / 2, 42);
    ctx.textAlign = 'left';
  }

  // Dispatch panel, top-right.
  if (ui.dispatch && ui.dispatch.length) {
    const dw = 252;
    const dh = 34 + ui.dispatch.length * 21 + 8;
    panel(ctx, W - dw - 16, 16, dw, dh);
    ctx.fillStyle = '#7ab8ff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('BBPD DISPATCH — LIVE', W - dw, 40);
    ctx.font = '11.5px system-ui, sans-serif';
    ui.dispatch.forEach((u, i) => {
      const yy = 62 + i * 21;
      ctx.fillStyle = TXT;
      ctx.fillText(u.id, W - dw, yy);
      ctx.fillStyle = u.roleColor || '#ffb703';
      roundRect(ctx, W - dw + 62, yy - 11, 76, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#14100a';
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.role, W - dw + 100, yy);
      ctx.textAlign = 'left';
      ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText(u.dist, W - dw + 148, yy);
    });
  }

  // Respect, under dispatch (or top-right alone).
  if (ui.respect) {
    const rw = 252;
    const ry = ui.dispatch && ui.dispatch.length ? 34 + ui.dispatch.length * 21 + 34 : 16;
    panel(ctx, W - rw - 16, ry, rw, 58);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 12.5px system-ui, sans-serif';
    ctx.fillText(`RESPECT ${ui.respect.rank} — ${ui.respect.name.toUpperCase()}`, W - rw, ry + 21);
    bar(ctx, W - rw, ry + 29, rw - 32, 8, ui.respect.frac, '#7bc950');
    ctx.fillStyle = DIM;
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillText(`NEXT: ${ui.respect.next}`, W - rw, ry + 51, rw - 28);
  }

  // Race panel.
  if (ui.race) {
    panel(ctx, 18, 132, 190, 84);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(`P${ui.race.pos}/${ui.race.of}`, 32, 162);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(`CHECKPOINT ${ui.race.cp}/${ui.race.cpTotal}`, 32, 184);
    ctx.fillText(ui.race.timeStr, 32, 202);
  }

  // Crew cards, bottom-left.
  if (ui.crew) {
    ui.crew.forEach((c, i) => {
      const cx = 18 + i * 118;
      const cy = H - 118;
      panel(ctx, cx, cy, 108, 100, c.cdFrac > 0 ? INK2 : INK);
      portrait(ctx, cx + 10, cy + 9, 34, c.color, c.initials);
      ctx.fillStyle = TXT;
      ctx.font = 'bold 11.5px system-ui, sans-serif';
      ctx.fillText(c.name.split(' ')[0].toUpperCase(), cx + 50, cy + 24);
      ctx.fillStyle = DIM;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(c.role, cx + 50, cy + 38);
      ctx.fillStyle = c.cdFrac > 0 ? DIM : ACC;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(c.ability.toUpperCase(), cx + 10, cy + 62, 90);
      ctx.fillStyle = DIM;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(`[${c.key}] ${c.cdFrac > 0 ? `ready in ${Math.ceil(c.cdFrac * c.cooldown)}s` : 'READY'}`, cx + 10, cy + 78);
      bar(ctx, cx + 10, cy + 86, 88, 5, 1 - c.cdFrac, c.color);
    });
  }

  // Dialog box, bottom-center-left.
  if (ui.dialog) {
    const dx = 390;
    const dy = H - 118;
    panel(ctx, dx, dy, 400, 100);
    portrait(ctx, dx + 12, dy + 12, 52, ui.dialog.color, ui.dialog.initials);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 13.5px system-ui, sans-serif';
    ctx.fillText(ui.dialog.name, dx + 76, dy + 30);
    const nameW = ctx.measureText(ui.dialog.name).width;
    ctx.fillStyle = ACC;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(ui.dialog.role, dx + 76 + nameW + 22, dy + 30);
    ctx.fillStyle = '#e9e4d8';
    ctx.font = 'italic 13.5px system-ui, sans-serif';
    wrapText(ctx, ui.dialog.line, dx + 76, dy + 54, 308, 17, 2);
  }

  // Right column, lower stack: status panel (HP / armour / cash / stars /
  // speed), then the minimap, then the weapons grid — fixed slots so the
  // panels can never land on each other.
  const mx = W - 218;
  const hasSpeed = ui.speedKmh !== null && ui.speedKmh !== undefined;
  const statusY = ui.respect ? (ui.dispatch && ui.dispatch.length ? 34 + ui.dispatch.length * 21 + 34 : 16) + 66 : 300;
  const statusH = hasSpeed ? 128 : 96;
  panel(ctx, mx - 6, statusY, 212, statusH);
  ctx.fillStyle = '#7bc950';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('HP', mx + 8, statusY + 26);
  bar(ctx, mx + 34, statusY + 16, 160, 9, ui.hp, '#7bc950');
  ctx.fillStyle = '#7ab8ff';
  ctx.fillText('AR', mx + 8, statusY + 48);
  bar(ctx, mx + 34, statusY + 38, 160, 9, ui.armour, '#7ab8ff');
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`$${ui.cash.toLocaleString('en-US')}`, mx + 8, statusY + 80);
  stars(ctx, mx + 108, statusY + 80, ui.wanted, 17);
  if (hasSpeed) {
    ctx.fillStyle = TXT;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`${Math.round(ui.speedKmh)}`, mx + 8, statusY + 116);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    const numW = ctx.measureText(`${Math.round(ui.speedKmh)}`).width;
    void numW;
    ctx.fillText('KM/H', mx + 62, statusY + 116);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${ui.carName} · ${Math.round(ui.condition)}%`, mx + 104, statusY + 104, 100);
    if (ui.nitro !== undefined) bar(ctx, mx + 104, statusY + 110, 96, 5, ui.nitro, '#2ec4b6');
  }
  drawMinimap(ctx, mx, 455, 168, ui);
  // Weapons grid, bottom-right.
  if (ui.weapons) {
    ui.weapons.forEach((wp, i) => {
      const wx = mx + (i % 3) * 61;
      const wy = 631 + Math.floor(i / 3) * 43;
      const sel = i === ui.selWeapon;
      panel(ctx, wx, wy, 56, 38, sel ? 'rgba(255,183,3,0.28)' : INK2);
      ctx.fillStyle = sel ? ACC : DIM;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wp.short, wx + 28, wy + 15);
      ctx.fillStyle = TXT;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(wp.ammo, wx + 28, wy + 31);
      ctx.textAlign = 'left';
    });
  }

  // Radio chip, bottom-center.
  if (ui.radio) {
    const rw2 = 300;
    panel(ctx, (W - rw2) / 2 + 190, H - 44, rw2, 30, INK2);
    ctx.fillStyle = '#2ec4b6';
    ctx.font = 'bold 11.5px system-ui, sans-serif';
    ctx.fillText(`♪ ${ui.radio.name}`, (W - rw2) / 2 + 202, H - 25);
    ctx.fillStyle = DIM;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(ui.radio.track, (W - rw2) / 2 + 202 + ctx.measureText(`♪ ${ui.radio.name}`).width + 26, H - 25, 150);
  }

  // Center toast.
  if (ui.message) {
    ctx.font = 'bold 26px system-ui, sans-serif';
    const tw = ctx.measureText(ui.message).width + 44;
    panel(ctx, (W - tw) / 2, 120, tw, 46, 'rgba(10,10,20,0.85)');
    ctx.fillStyle = ACC;
    ctx.textAlign = 'center';
    ctx.fillText(ui.message, W / 2, 151);
    ctx.textAlign = 'left';
  }

  // Controls hint, very bottom-left above crew? Put at top of crew row.
  if (ui.hint) {
    ctx.fillStyle = 'rgba(245,241,232,0.66)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(ui.hint, 18, H - 128);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lh);
      lines += 1;
      if (lines >= maxLines) return;
      line = word;
    } else line = test;
  }
  if (lines < maxLines) ctx.fillText(line, x, y + lines * lh);
}

// ---------------------------------------------------------- menu screens

function menuShell(ctx, w, h, title, sub) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,123,0,0.10)');
  g.addColorStop(1, 'rgba(46,196,182,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f5f1e8';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 44, 62);
  ctx.fillStyle = '#ffb703';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(sub, 44, 88);
  ctx.fillStyle = 'rgba(245,241,232,0.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('[M] MAP   [G] GARAGE   [T] SHOPS   [ESC] RESUME', w - 44, 62);
  ctx.textAlign = 'left';
}

export function drawMapScreen(ctx, w, h, ui) {
  const S = w / 1280;
  ctx.save();
  ctx.scale(S, S);
  const W = 1280;
  const H = 720;
  menuShell(ctx, W, H, 'LOS BRASA — MAP & STATS', 'Isla Brasa · BBPD jurisdiction · one island, four districts, no exits');
  drawMapCanvas(ctx, 44, 112, 720, 520, ui, true);
  // Career panel.
  panel(ctx, 792, 112, 444, 240);
  ctx.fillStyle = ACC;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('CAREER — DARIO VALE', 816, 144);
  ctx.font = '14.5px system-ui, sans-serif';
  ctx.fillStyle = TXT;
  const rows = [
    ['Story completion', `${ui.stats.completion}%`],
    ['Jobs done', `${ui.stats.jobsDone} / 10`],
    ['Cash earned (lifetime)', `$${ui.stats.earned.toLocaleString('en-US')}`],
    ['Top speed', `${ui.stats.topSpeed} km/h`],
    ['Busts escaped', `${ui.stats.escapes}`],
    ['Races won', `${ui.stats.racesWon} / 3`],
  ];
  rows.forEach((r, i) => {
    ctx.fillStyle = DIM;
    ctx.fillText(r[0], 816, 178 + i * 27);
    ctx.fillStyle = TXT;
    ctx.textAlign = 'right';
    ctx.fillText(r[1], 1212, 178 + i * 27);
    ctx.textAlign = 'left';
  });
  bar(ctx, 816, 178 + rows.length * 27 + 2, 396, 10, ui.stats.completion / 100, ACC);
  // Respect panel.
  panel(ctx, 792, 368, 444, 118);
  ctx.fillStyle = TXT;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`RESPECT ${ui.respect.rank} — ${ui.respect.name.toUpperCase()}`, 816, 400);
  bar(ctx, 816, 412, 396, 11, ui.respect.frac, '#7bc950');
  ctx.fillStyle = DIM;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`NEXT UNLOCK: ${ui.respect.next}`, 816, 448, 400);
  ctx.fillText(`RP ${ui.respect.rp} banked across Los Brasa`, 816, 470);
  // Save slots.
  panel(ctx, 792, 502, 444, 130);
  ctx.fillStyle = ACC;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('SAVE SLOTS', 816, 530);
  ui.saves.forEach((s, i) => {
    const sx = 816 + i * 138;
    panel(ctx, sx, 544, 128, 68, s ? 'rgba(255,183,3,0.16)' : INK2);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 12.5px system-ui, sans-serif';
    ctx.fillText(`SLOT ${i + 1}`, sx + 10, 566);
    ctx.fillStyle = DIM;
    ctx.font = '11px system-ui, sans-serif';
    if (s) {
      ctx.fillText(s.label, sx + 10, 584, 110);
      ctx.fillText(s.detail, sx + 10, 600, 110);
    } else ctx.fillText('EMPTY', sx + 10, 584);
  });
  ctx.fillStyle = 'rgba(245,241,232,0.55)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('S = save to first free slot · L = load latest · progress also autosaves per job', 44, 668);
  ctx.restore();
}

export function drawGarageScreen(ctx, w, h, ui) {
  const S = w / 1280;
  ctx.save();
  ctx.scale(S, S);
  menuShell(ctx, 1280, 720, 'BRASA AUTO WORKS — GARAGE', `Stored cars & upgrades · cash $${ui.cash.toLocaleString('en-US')}`);
  panel(ctx, 44, 112, 700, 520);
  ctx.fillStyle = ACC;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('STORED CARS', 68, 144);
  GARAGE_CARS.forEach((c, i) => {
    const yy = 176 + i * 74;
    panel(ctx, 68, yy, 652, 62, i === ui.garageSel ? 'rgba(255,183,3,0.18)' : INK2);
    ctx.fillStyle = c.owned ? TXT : DIM;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(c.name, 88, yy + 26);
    ctx.font = '12.5px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(c.note, 88, yy + 47);
    ctx.fillStyle = DIM;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('CONDITION', 520, yy + 20);
    bar(ctx, 520, yy + 28, 180, 9, c.condition / 100, c.condition > 50 ? '#7bc950' : '#ff6b6b');
    ctx.fillStyle = TXT;
    ctx.fillText(`${c.condition}%`, 520, yy + 54);
  });
  panel(ctx, 772, 112, 464, 520);
  ctx.fillStyle = ACC;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('UPGRADES', 796, 144);
  UPGRADES.forEach((u, i) => {
    const yy = 172 + i * 66;
    panel(ctx, 796, yy, 416, 54, INK2);
    ctx.fillStyle = TXT;
    ctx.font = 'bold 14.5px system-ui, sans-serif';
    ctx.fillText(u.name, 812, yy + 24);
    ctx.fillStyle = u.owned ? '#7bc950' : ACC;
    ctx.font = '12.5px system-ui, sans-serif';
    ctx.fillText(u.owned ? 'INSTALLED' : `$${u.price.toLocaleString('en-US')}`, 812, yy + 43);
  });
  ctx.fillStyle = 'rgba(245,241,232,0.55)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('↑↓ choose car · ENTER take out · repairs at Brasa Auto Works, Las Palmas', 796, 620, 420);
  ctx.restore();
}

export function drawShopScreen(ctx, w, h, ui) {
  const S = w / 1280;
  ctx.save();
  ctx.scale(S, S);
  menuShell(ctx, 1280, 720, 'SHOPS OF LOS BRASA', `Three storefronts, no questions asked · cash $${ui.cash.toLocaleString('en-US')}`);
  SHOPS.forEach((s, i) => {
    const xx = 44 + i * 408;
    panel(ctx, xx, 130, 384, 300, i === ui.shopSel ? 'rgba(255,183,3,0.14)' : INK);
    ctx.fillStyle = ACC;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(s.name, xx + 24, 176);
    ctx.fillStyle = DIM;
    ctx.font = '13.5px system-ui, sans-serif';
    ctx.fillText(s.district.toUpperCase(), xx + 24, 200);
    ctx.fillStyle = TXT;
    ctx.font = '15px system-ui, sans-serif';
    wrapText(ctx, s.sells, xx + 24, 240, 330, 22, 4);
  });
  panel(ctx, 44, 462, 1192, 170);
  ctx.fillStyle = ACC;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('MARINA ARMS — PRICE LIST', 68, 496);
  ctx.font = '14px system-ui, sans-serif';
  const prices = [['P9 Pistol', '$1,200'], ['Mako SMG', '$3,400'], ['12G Breaker', '$5,100'], ['AR Carbine', '$7,800'], ['Ammo refill (all)', '$300'], ['Body armour', '$900']];
  prices.forEach((p, i) => {
    const xx = 68 + (i % 3) * 396;
    const yy = 530 + Math.floor(i / 3) * 40;
    ctx.fillStyle = DIM;
    ctx.fillText(p[0], xx, yy);
    ctx.fillStyle = TXT;
    ctx.fillText(p[1], xx + 210, yy);
  });
  ctx.restore();
}

export function drawWheel(ctx, w, h, ui) {
  const S = w / 1280;
  ctx.save();
  ctx.scale(S, S);
  const cx = 640;
  const cy = 360;
  ctx.fillStyle = 'rgba(5,5,12,0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 170, 0, 7);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.stroke();
  ui.weapons.forEach((wp, i) => {
    const a = (i / ui.weapons.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * 112;
    const y = cy + Math.sin(a) * 112;
    const sel = i === ui.selWeapon;
    ctx.fillStyle = sel ? 'rgba(255,183,3,0.35)' : INK2;
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, 7);
    ctx.fill();
    ctx.fillStyle = sel ? ACC : TXT;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(wp.short, x, y - 2);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(wp.ammo, x, y + 15);
  });
  ctx.fillStyle = TXT;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ui.weapons[ui.selWeapon].name.toUpperCase(), cx, cy + 5);
  ctx.restore();
}
