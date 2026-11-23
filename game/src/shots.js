// shots.js — the four hand-in scenes, staged deterministically from the seed
// and rendered by the game's own renderers (the same drawRoadScene, world
// renderer, HUD and pause screen the player sees). ?shot=cover|market|race|map
// picks the scene; the kit's shots.json names the files in order.

import { PALETTES, CAR_MODELS, WEAPONS, DIALOG_LINES } from './config.js';
import { drawRoadScene, drawHelicopter, drawSpotlightCone } from './render3d.js';
import { drawWorld2D, drawPerson, drawTracer } from './render2d.js';
import { drawHUD, drawPauseScreen } from './hud.js';
import { PORTRAITS } from './game.js';
import { WORLD } from './config.js';

const SHORT = { fists: 'FISTS', bat: 'BAT', p9: 'P9', mako: 'MAKO', breaker: '12G', carbine: 'AR' };
const AMMO = { fists: '∞', bat: '∞', p9: '84', mako: '171', breaker: '24', carbine: '126' };

function fullLocker(idx) {
  return {
    weapons: WEAPONS.map((w) => ({ ...w, short: SHORT[w.id], ammoText: AMMO[w.id] })),
    weaponIdx: idx,
  };
}

function palmRow(actors, zFrom, zTo, step, seedShift) {
  const greens = ['#2e7d4f', '#35945e', '#27703f'];
  let i = 0;
  for (let z = zFrom; z <= zTo; z += step) {
    actors.push({ kind: 'palm', z, lane: -1.2 - (i % 3) * 0.07, s: 0.9 + ((i * 37 + seedShift) % 40) / 100, green: greens[i % 3] });
    actors.push({ kind: 'palm', z: z + step * 0.5, lane: 1.19 + (i % 2) * 0.08, s: 0.85 + ((i * 53 + seedShift) % 35) / 100, green: greens[(i + 1) % 3] });
    i++;
  }
}

function sidewalkCrowd(actors, seedShift) {
  const shirts = ['#ef476f', '#ffd23f', '#06d6a0', '#3fa7d6', '#ff9f1c', '#e8e4da'];
  const spots = [
    [430, -1.1], [620, 1.12], [760, -1.16], [980, 1.09], [1240, -1.12], [1490, 1.15],
    [1730, -1.09], [1980, 1.12], [2260, -1.14], [2540, 1.1], [2900, -1.11], [3300, 1.13],
  ];
  spots.forEach(([z, lane], i) => {
    actors.push({ kind: 'ped', z, lane, shirt: shirts[(i + seedShift) % shirts.length], pants: '#22304a', skin: '#c98d64' });
  });
}

export function stageShot(ctx, game, name, w, h) {
  if (name === 'cover') return shotCover(ctx, game, w, h);
  if (name === 'market') return shotMarket(ctx, game, w, h);
  if (name === 'race') return shotRace(ctx, game, w, h);
  return shotMap(ctx, game, w, h);
}

function shotCover(ctx, game, w, h) {
  const pal = PALETTES.golden;
  const regent = CAR_MODELS[0];
  const police = CAR_MODELS.find((m) => m.id === 'police');
  const police2 = CAR_MODELS.find((m) => m.id === 'police2');
  const actors = [
    { kind: 'car', z: 40, lane: 0.05, model: regent, spoiler: true, widthF: 0.3 },
    { kind: 'police', z: 215, lane: -0.55, model: police, flashPhase: true, widthF: 0.26 },
    { kind: 'police', z: 290, lane: 0.6, model: police2, flashPhase: false, widthF: 0.26 },
    { kind: 'police', z: 430, lane: -0.28, model: police, flashPhase: false, widthF: 0.25 },
    { kind: 'police', z: 540, lane: 0.3, model: police2, flashPhase: true, widthF: 0.25 },
    { kind: 'car', z: 760, lane: -0.38, model: CAR_MODELS[2], brake: true },
    { kind: 'car', z: 1010, lane: 0.42, model: CAR_MODELS[3] },
    { kind: 'car', z: 1560, lane: -0.08, model: CAR_MODELS[1], brake: true },
    { kind: 'car', z: 2150, lane: 0.3, model: CAR_MODELS[4] },
    { kind: 'car', z: 2900, lane: -0.44, model: CAR_MODELS[5] },
    { kind: 'car', z: 3700, lane: 0.12, model: CAR_MODELS[2] },
    { kind: 'building', z: 950, lane: -1.55, w: 1.1, h: 0.85, wall: '#e8cfa3', roof: '#7a4a35', sign: 'HOTEL FARO', seed: 5 },
    { kind: 'building', z: 1750, lane: -1.6, w: 1.15, h: 1.0, wall: '#d9b48a', roof: '#6e4a35', sign: 'CAFE SOL', seed: 9 },
    { kind: 'building', z: 2700, lane: -1.55, w: 1.05, h: 0.8, wall: '#b8c4c9', roof: '#4a6e8a', sign: 'CINE BRASA', seed: 3 },
    { kind: 'building', z: 2500, lane: 1.6, w: 1.1, h: 0.85, wall: '#e0b090', roof: '#97503a', sign: 'CLUB ONDA', seed: 7 },
    { kind: 'sign', z: 1350, lane: 1.3, text: 'LAS PALMAS' },
    { kind: 'sign', z: 3150, lane: -1.3, text: 'OLD TOWN →' },
  ];
  palmRow(actors, 260, 5200, 360, 3);
  sidewalkCrowd(actors, 1);
  drawRoadScene(ctx, w, h, pal, {
    actors,
    camX: 0,
    camZ: 0,
    curveAt: (z) => Math.sin(z * 0.00032) * 0.55,
    time: 1.2,
    seedShift: 11,
  });
  // FALCON, large and close, spotlight cone landing on the hero
  drawSpotlightCone(ctx, w * 0.565, h * 0.17, w * 0.525, h * 0.865, 330);
  drawHelicopter(ctx, w * 0.565, h * 0.155, 132, { tilt: -0.05 });

  game.jobs.stage = 3;
  game.jobs.stageFrac = 0.55;
  const S = game.hudState();
  Object.assign(S, fullLocker(3));
  S.mode = 'drive';
  S.wanted = 4;
  S.airUnit = true;
  S.speedKmh = 176;
  S.carName = 'Regent GT';
  S.carCond = 82;
  S.nitroFrac = 0.65;
  S.hp = 88;
  S.armour = 57;
  S.dispatch = [
    { unit: 'Unit 1', role: 'PURSUIT', dist: 42 },
    { unit: 'Unit 2', role: 'RAMMING', dist: 18 },
    { unit: 'Unit 3', role: 'FLANKING', dist: 27 },
    { unit: 'Unit 4', role: 'PURSUIT', dist: 63 },
    { unit: 'Unit 5', role: 'ROADBLOCK', dist: 210 },
    { unit: 'Unit 6', role: 'FLANKING', dist: 35 },
    { unit: 'Unit 7', role: 'SPIKE STRIP', dist: 148 },
    { unit: 'Unit 8', role: 'SPOTLIGHT', dist: 12 },
    { unit: 'Unit 9', role: 'INTERCEPT', dist: 88 },
  ];
  S.dialog = { name: 'Vera Quintana', role: 'Fixer', line: DIALOG_LINES.veraChase, ...PORTRAITS.vera };
  S.showPolice = true;
  drawHUD(ctx, S, w, h);
}

function shotMarket(ctx, game, w, h) {
  const camX = WORLD.seaX - 330;
  const camY = 1560;
  // zoom into the firefight so the figures read at contact-sheet size
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1.45, 1.45);
  ctx.translate(-w / 2, -h / 2);
  drawWorld2D(ctx, game.city, { x: camX, y: camY }, w, h, { night: 1, time: 2.4 });
  const sx = (wx) => wx - camX + w / 2;
  const sy = (wy) => wy - camY + h / 2;
  // the firefight: Dario + Lio against the stall crew, Tomas at the flank
  const dario = { x: camX - 120, y: camY + 90 };
  const lio = { x: camX - 190, y: camY + 150 };
  const tomas = { x: camX - 60, y: camY + 190 };
  const foes = [
    { x: camX + 130, y: camY - 30, aim: Math.PI * 0.82, muzzle: true },
    { x: camX + 210, y: camY + 70, aim: Math.PI * 0.95, muzzle: false },
    { x: camX + 90, y: camY + 160, aim: Math.PI * 1.05, muzzle: true },
  ];
  // crowd fleeing between the stalls
  const crowdSpots = [
    [-260, -140], [-40, -190], [60, -120], [260, -60], [300, 130], [-300, 40],
    [-220, -40], [170, 210], [40, 250], [-140, 260], [330, -160], [-330, -200],
  ];
  const shirts = ['#ef476f', '#ffd23f', '#06d6a0', '#3fa7d6', '#ff9f1c', '#e8e4da', '#c77dff'];
  crowdSpots.forEach(([dx, dy], i) => {
    drawPerson(ctx, sx(camX + dx), sy(camY + dy), { skin: '#c98d64', shirt: shirts[i % shirts.length], pants: '#22304a', walkPhase: i * 1.3, scale: 0.95 });
  });
  // one stall guard already down
  ctx.fillStyle = '#5a1f24';
  ctx.fillRect(sx(camX + 150) - 12, sy(camY + 30) - 4, 24, 8);
  drawPerson(ctx, sx(camX + 150), sy(camY + 30), { skin: '#8a5a3b', shirt: '#7a1f24', pants: '#1c1a26', scale: 0.95 });
  ctx.fillStyle = 'rgba(200,40,40,0.5)';
  ctx.beginPath();
  ctx.ellipse(sx(camX + 168), sy(camY + 40), 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // tracers both ways
  drawTracer(ctx, sx(dario.x) + 14, sy(dario.y) - 4, sx(foes[0].x), sy(foes[0].y));
  drawTracer(ctx, sx(lio.x) + 14, sy(lio.y) - 4, sx(foes[1].x), sy(foes[1].y));
  drawTracer(ctx, sx(foes[0].x) - 14, sy(foes[0].y) - 4, sx(dario.x), sy(dario.y), 'rgba(255,90,77,0.9)');
  drawTracer(ctx, sx(foes[2].x) - 14, sy(foes[2].y) - 4, sx(tomas.x), sy(tomas.y), 'rgba(255,90,77,0.9)');
  drawPerson(ctx, sx(dario.x), sy(dario.y), { skin: PORTRAITS.dario.skin, shirt: '#ff7b00', pants: '#22304a', aim: -0.1, weapon: true, muzzle: true, scale: 1.08 });
  drawPerson(ctx, sx(lio.x), sy(lio.y), { skin: PORTRAITS.lio.skin, shirt: '#ffd23f', pants: '#3a2e28', aim: 0.15, weapon: true, scale: 1.0 });
  drawPerson(ctx, sx(tomas.x), sy(tomas.y), { skin: PORTRAITS.tomas.skin, shirt: '#06d6a0', pants: '#22304a', aim: -0.4, weapon: true, muzzle: true, scale: 1.0 });
  for (const f of foes) {
    drawPerson(ctx, sx(f.x), sy(f.y), { skin: '#8a5a3b', shirt: '#31435f', pants: '#1c1a26', aim: f.aim, weapon: true, muzzle: f.muzzle, scale: 1.0 });
  }
  // two BBPD officers arriving at the market edge
  drawPerson(ctx, sx(camX - 330), sy(camY - 210), { skin: '#f2c29b', shirt: '#22304a', pants: '#14213d', vest: true, aim: 0.5, weapon: true, scale: 1.0 });
  drawPerson(ctx, sx(camX - 290), sy(camY - 250), { skin: '#c98d64', shirt: '#22304a', pants: '#14213d', vest: true, aim: 0.7, weapon: true, scale: 1.0 });
  ctx.restore();

  const S = game.hudState();
  Object.assign(S, fullLocker(3));
  S.mode = 'foot';
  S.wanted = 3;
  S.airUnit = false;
  S.hp = 76;
  S.armour = 41;
  S.mission = { n: 3, title: 'MARKET DAY', stage: 2, stageCount: 3, stageFrac: 0.5, next: 'Shake off the stall crew', giver: 'Vera Quintana', pay: '$1,600', timerSec: null };
  S.dispatch = [
    { unit: 'Unit 1', role: 'PURSUIT', dist: 96 },
    { unit: 'Unit 2', role: 'FLANKING', dist: 121 },
    { unit: 'Unit 3', role: 'PURSUIT', dist: 154 },
    { unit: 'Unit 4', role: 'BACKUP', dist: 203 },
  ];
  S.dialog = { name: 'Lio Park', role: 'Wheelman', line: 'Market\u2019s hot, Dario — I\u2019ve got the coupe running at the kerb!', ...PORTRAITS.lio };
  S.playerPos = { x: dario.x, y: dario.y };
  S.districtName = 'Las Palmas';
  drawHUD(ctx, S, w, h);
}

function shotRace(ctx, game, w, h) {
  const pal = PALETTES.sunset;
  const regent = CAR_MODELS[0];
  const actors = [
    { kind: 'car', z: 40, lane: -0.08, model: regent, spoiler: true, widthF: 0.3, nitro: true },
    { kind: 'car', z: 300, lane: -0.48, model: CAR_MODELS[1], widthF: 0.27 },
    { kind: 'car', z: 390, lane: 0.38, model: CAR_MODELS[2], widthF: 0.27, brake: true },
    { kind: 'car', z: 720, lane: 0.02, model: CAR_MODELS[5], widthF: 0.27 },
    { kind: 'ring', z: 2050, lane: 0 },
    { kind: 'car', z: 2400, lane: -0.3, model: CAR_MODELS[3] },
    { kind: 'building', z: 1100, lane: -1.55, w: 1.1, h: 0.85, wall: '#e8cfa3', roof: '#7a4a35', sign: 'HOTEL FARO', seed: 4 },
    { kind: 'building', z: 2100, lane: -1.6, w: 1.15, h: 0.95, wall: '#d9b48a', roof: '#6e4a35', sign: 'MARINA BAR', seed: 8 },
    { kind: 'sign', z: 2400, lane: 1.3, text: 'BOARDWALK' },
  ];
  palmRow(actors, 240, 4600, 340, 5);
  sidewalkCrowd(actors, 2);
  drawRoadScene(ctx, w, h, pal, {
    actors,
    camX: 0,
    camZ: 0,
    curveAt: (z) => Math.sin(z * 0.0004 + 1.2) * 0.5,
    time: 0.7,
    seedShift: 23,
  });
  const S = game.hudState();
  Object.assign(S, fullLocker(2));
  S.mode = 'race';
  S.wanted = 0;
  S.dispatch = [];
  S.dialog = null;
  S.mission = null;
  S.airUnit = false;
  S.speedKmh = 214;
  S.carName = 'Regent GT';
  S.carCond = 91;
  S.nitroFrac = 0.42;
  S.race = { name: 'Boardwalk Blitz', pos: 2, total: 4, cp: 5, cpTotal: 8, timeSec: 96, bestSec: 187 };
  drawHUD(ctx, S, w, h);
}

function shotMap(ctx, game, w, h) {
  const S = game.hudState();
  S.blips = [
    { x: game.jobs.target.x, y: game.jobs.target.y, color: '#ffd23f', r: 4.4, label: 'OBJECTIVE' },
    { x: 2760, y: 620, color: '#06d6a0', r: 4, label: 'VERA\u2019S GARAGE' },
    { x: 1180, y: 1620, color: '#06d6a0', r: 4, label: 'BRASA ARMS' },
    { x: 2620, y: 1480, color: '#06d6a0', r: 4, label: 'HILO FINO' },
    { x: 3050, y: 1900, color: '#ef476f', r: 4, label: 'RACE — BOARDWALK BLITZ' },
    { x: 3560, y: 340, color: '#3fa7d6', r: 4, label: 'BOAT — MARINA' },
  ];
  S.stats = {
    completion: 50, jobsDone: 5, cashEarnedText: '$96,400', cashText: '$24,580',
    topSpeed: 287, bustsEscaped: 6, carsJacked: 13, racesWon: 1, playTimeText: '2h 5m',
  };
  drawPauseScreen(ctx, S, w, h);
}
