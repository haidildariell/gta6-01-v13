// Staged screenshot scenes behind ?shot=cover|market|race|map. Each one
// poses the real game state — the same units, traffic, job and HUD the
// player sees — at a deterministic moment, so the contact sheet is honest
// gameplay, framed the way the spec demands.

import { SEG_LEN } from './city.js';
import { RACES, UNIT_ROLES } from './config.js';

function stagedTraffic(game, list) {
  game.cars = list.map(([ahead, offset, color]) => ({
    z: game.position + ahead, offset, speed: 4200, color, kind: 'car', plate: 'BRASA',
  }));
}

function stagedUnits(game, list) {
  game.units = list.map(([ahead, offset, role], i) => ({
    id: `BBPD-${i + 1}`, role: role || UNIT_ROLES[i % UNIT_ROLES.length],
    z: game.position + ahead, offset, speed: 0, roleT: 3,
  }));
}

function stageCover(game) {
  game.mode = 'drive';
  game.position = SEG_LEN * 34;
  game.playerX = 0.06;
  game.speed = 9796; // 176 km/h on the dash
  game.condition = 92;
  game.nitro = 0.7;
  game.heat = 400; // 4 stars: dispatch + FALCON
  game.time = 2.3;
  game.heroScale = 1.45; // the Regent GT towers over the lower centre frame
  stagedUnits(game, [
    [1700, -0.34, 'RAMMING'], [1750, 0.36, 'FLANKING'], [2700, -0.05, 'PURSUIT'],
    [3900, 0.28, 'PURSUIT'], [5600, -0.38, 'INTERCEPT'], [7900, 0.14, 'ROADBLOCK'],
    [10000, -0.18, 'SPIKES'], [12600, 0.42, 'BACKUP'], [15800, 0, 'SPOTLIGHT'],
  ]);
  stagedTraffic(game, [
    [4200, 0.52, '#3a86ff'], [5600, -0.5, '#ffd23f'], [8100, 0.18, '#e8e8e8'],
    [10800, -0.24, '#d64541'], [13900, 0.55, '#8ac926'], [17500, -0.52, '#00b4d8'],
    [21400, 0.3, '#f15bb5'],
  ]);
  game.say('vera', 999);
}

function stageMarket(game) {
  game.jobIndex = 2; // JOB 3/10 — MARKET STATIC
  game.stage = 1;
  game.setObjective();
  game.stageKind = 'foot';
  game.enterFoot();
  const f = game.foot;
  f.x = 7600;
  f.camX = f.x - 430; // Dario sits left-of-centre; the fight opens to the right
  f.hp = 0.82;
  game.hp = 0.82;
  game.armour = 0.55;
  game.heat = 200;
  game.weaponSel = 3; // Mako SMG in hand
  game.time = 3.1;
  // Stalls staged INTO the frame (the live street spaces them 1750 apart).
  f.stalls = [-520, -60, 430, 920].map((off, i) => ({
    x: f.x + off, color: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a'][i],
    sign: ['FRUTA', 'MARISCOS', 'CAFE SOL', 'TEXTILES'][i], variant: i + 2,
  }));
  f.enemies = [
    { x: 7600 + 360, lane: 0, shirt: '#23262e', skin: '#c68642', pants: '#101014', aim: Math.PI, hp: 30, flash: 0.05, down: false, fireT: 1 },
    { x: 7600 + 520, lane: 1, shirt: '#3a2323', skin: '#8d5524', pants: '#101014', aim: Math.PI, hp: 0, flash: 0, down: true, fireT: 1 },
    { x: 7600 + 600, lane: 0, shirt: '#1f2733', skin: '#f1c27d', pants: '#101014', aim: Math.PI, hp: 44, flash: 0, down: false, fireT: 1 },
  ];
  // A full market crowd packed around the fight: stallholders, shoppers
  // fleeing both ways, two kids behind a counter.
  f.crowd = [-400, -320, -245, -165, -85, 90, 170, 250, 320, 560, 640, 700].map((off, i) => ({
    x: 7600 + off, lane: i % 2, shirt: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#e0aaff'][i % 6],
    skin: ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'][i % 4], pants: '#26232b', aim: null, run: i * 1.3, vx: i % 2 ? 26 : -22,
  }));
  f.targetX = 7600 + 1600; // marker waits past the last gunman
  const gy = game.h * 0.94 - 168 * 0.72;
  const px = f.x - f.camX;
  f.tracers = [
    { x1: px + 34, y1: gy, x2: px + 360 - 30, y2: gy - 8, ttl: 99 },
    { x1: px + 34, y1: gy + 5, x2: px + 520, y2: gy + 30, ttl: 99 },
    { x1: px + 360 - 30, y1: gy, x2: px + 60, y2: gy - 30, ttl: 99 },
    { x1: px + 600 - 30, y1: gy - 4, x2: px + 300, y2: gy + 12, ttl: 99 },
  ];
  f.flash = 0.05;
  game.message = null; // the enterFoot toast has no place in the staged frame
  game.messageT = 0;
  stagedUnits(game, [
    [0, 0, 'PURSUIT'], [0, 0, 'RAMMING'], [0, 0, 'FLANKING'], [0, 0, 'BACKUP'], [0, 0, 'TAIL'],
  ]);
  // Dispatch distances read from z-gaps; park the units near the market.
  game.units.forEach((u, i) => { u.z = game.position + 900 + i * 700; });
  game.dialog = { name: 'Lio Park', role: 'Wheelman', line: 'Market is hot — stay on the stalls, I have the right side!', color: '#ffb703', initials: 'LP' };
  game.dialogT = 999;
}

function stageRace(game) {
  game.mode = 'drive';
  game.position = SEG_LEN * 398; // Alto Verde descent: a real corner, sunset palette
  game.playerX = -0.05;
  game.speed = 10900; // ~196 km/h
  game.condition = 88;
  game.nitro = 0.45;
  game.heat = 0;
  game.units = [];
  game.time = 1.4;
  const def = RACES[0];
  game.race = {
    def, cp: 4, cpTotal: def.checkpoints, t: 754,
    nextZ: game.position + 1750,
    rivals: [
      { progress: 415000, speed: 9200, color: '#3a86ff', offset: -0.44, z: game.position + 1500 },
      { progress: 388000, speed: 8900, color: '#ffd23f', offset: 0.42, z: game.position + 1750 },
      { progress: 372000, speed: 8600, color: '#f15bb5', offset: 0.05, z: game.position + 2600 },
    ],
    finished: false,
  };
  stagedTraffic(game, [
    [5200, -0.52, '#e8e8e8'], [8600, 0.5, '#d64541'], [12300, -0.2, '#00b4d8'],
  ]);
  game.dialog = null;
}

function stageMap(game) {
  game.mode = 'map';
  game.prevMode = 'drive';
  game.position = SEG_LEN * 34;
  game.heat = 200;
  stagedUnits(game, [
    [2600, 0.2, 'PURSUIT'], [5400, -0.3, 'RAMMING'], [9100, 0.1, 'FLANKING'], [13800, 0, 'BACKUP'],
  ]);
  game.saves = [
    { label: 'Job 6/10 — Regent Run', detail: '$12,480 · Respect 5' },
    { label: 'Job 3/10 — Market Static', detail: '$6,215 · Respect 4' },
    null,
  ];
  game.dialog = null;
}

export function stageShot(name, game) {
  if (name === 'market') stageMarket(game);
  else if (name === 'race') stageRace(game);
  else if (name === 'map') stageMap(game);
  else stageCover(game);
}
