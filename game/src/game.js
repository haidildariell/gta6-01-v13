// ISLA BRASA — game state and simulation. One Game object owns the city,
// the Regent GT, the crew, BBPD dispatch, the job list, the races, the boat,
// the saves — and renders every mode (drive / foot / boat / menus).

import { buildRoad, districtAt, SEG_LEN } from './city.js';
import { RoadRenderer, PALETTES } from './road.js';
import { drawFootScene, FOOT_WORLD } from './foot.js';
import { drawHUD, drawMapScreen, drawGarageScreen, drawShopScreen, drawWheel } from './hud.js';
import { CITY, CREW, HERO, JOBS, RACES, RADIO, RANKS, UNIT_ROLES, WEAPONS } from './config.js';
import { Rng } from './rng.js';

const MAX_SPEED = 11800; // world units / s  (~212 km/h on the dash)
const ACCEL = 4600;
const BRAKE = 9800;
const OFFROAD_DECEL = 5200;

function wrap(z, total) { return ((z % total) + total) % total; }
function distAhead(a, b, total) { return wrap(b - a, total); }

export class Game {
  constructor(ctx, w, h, seed) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.seed = seed;
    this.road = buildRoad(seed);
    this.renderer = new RoadRenderer(ctx, w, h);
    this.rng = new Rng(seed * 31 + 7);
    this.time = 0;
    this.mode = 'drive';
    this.prevMode = 'drive';
    // Player / car.
    this.position = SEG_LEN * 12;
    this.playerX = 0;
    this.speed = 0;
    this.condition = 92;
    this.nitro = 0.8;
    this.hp = 1;
    this.armour = 0.65;
    this.cash = 12480;
    this.rp = 1380;
    this.weaponSel = 3;
    this.weapons = WEAPONS.map((wp) => ({ ...wp }));
    // Heat.
    this.heat = 0; // 0..500 points; stars = ceil(heat/100)
    this.losTimer = 0;
    this.confused = 0;
    // Crew cooldowns (seconds remaining).
    this.crewCd = [0, 0, 0];
    this.eyesOut = 0;
    // Job state.
    this.jobIndex = 5; // JOB 6/10 — REGENT RUN, as on the cover
    this.stage = 2;
    this.objectiveZ = 0;
    this.stageKind = 'drive';
    this.jobTimer = null;
    this.setObjective();
    // World traffic + police.
    this.cars = [];
    for (let i = 0; i < 26; i += 1) this.spawnTraffic(true);
    this.units = [];
    // Race state.
    this.race = null;
    this.racePrompt = null;
    // Foot state.
    this.foot = null;
    // Boat.
    this.boat = { z: 0, speed: 0 };
    // Dialog + toast.
    this.dialog = null;
    this.dialogT = 0;
    this.message = null;
    this.messageT = 0;
    // Stats.
    this.stats = { completion: 54, jobsDone: 5, earned: 68400, topSpeed: 214, escapes: 7, racesWon: 1 };
    this.saves = [null, null, null];
    this.loadSavesMeta();
    this.garageSel = 0;
    this.shopSel = 0;
    this.radioIdx = 0;
    this.trackIdx = 0;
    this.radioT = 0;
    this.keys = new Set();
    this.say('vera', 6);
  }

  // ------------------------------------------------------------ helpers

  get stars() { return Math.min(5, Math.ceil(this.heat / 100)); }
  get rank() {
    let r = RANKS[0];
    for (const k of RANKS) if (this.rp >= k.rp) r = k;
    return r;
  }
  get nextRank() { return RANKS[Math.min(RANKS.length - 1, this.rank.n)] || null; }

  say(who, seconds) {
    const c = CREW.find((x) => x.id === who) || CREW[2];
    this.dialog = { name: c.name, role: c.role, line: c.line, color: c.color, initials: c.name.split(' ').map((s) => s[0]).join('') };
    this.dialogT = seconds || 5;
  }
  toast(text, seconds) {
    this.message = text;
    this.messageT = seconds || 3;
  }

  setObjective() {
    const job = JOBS[this.jobIndex];
    const kinds = ['drive', 'drive', 'foot'];
    this.stageKind = kinds[this.stage % kinds.length];
    const ahead = 7000 + this.stage * 5200 + this.jobIndex * 900;
    this.objectiveZ = wrap(this.position + ahead, this.road.totalLength);
    this.jobTimer = this.stage === 2 ? 150 : null;
  }

  spawnTraffic(anywhere) {
    const total = this.road.totalLength;
    const z = anywhere ? this.rng.range(0, total) : wrap(this.position + this.rng.range(9000, 26000), total);
    this.cars.push({
      z, offset: this.rng.pick([-0.55, -0.2, 0.22, 0.55]) + this.rng.range(-0.06, 0.06),
      speed: this.rng.range(3400, 5600), color: this.rng.pick(['#d64541', '#3a86ff', '#ffd23f', '#8ac926', '#e8e8e8', '#1982c4', '#f15bb5', '#00b4d8']),
      kind: 'car', plate: 'BRASA',
    });
  }

  syncUnits() {
    const want = this.stars === 0 ? 0 : Math.min(9, this.stars + 4);
    while (this.units.length < want) {
      const i = this.units.length;
      this.units.push({
        id: `BBPD-${i + 1}`, role: UNIT_ROLES[i % UNIT_ROLES.length],
        z: wrap(this.position - this.rng.range(1500, 4200), this.road.totalLength),
        offset: this.rng.range(-0.6, 0.6), speed: 0, roleT: this.rng.range(2, 6),
      });
    }
    while (this.units.length > want) this.units.pop();
  }

  addHeat(points, why) {
    const before = this.stars;
    this.heat = Math.min(500, this.heat + points);
    if (this.stars > before) {
      this.syncUnits();
      if (this.stars >= 3) this.toast('FALCON-1 IS OVERHEAD', 2.6);
    }
  }

  // ------------------------------------------------------------- input

  bind(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.onKey(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('pointerdown', (e) => {
      if (this.mode === 'foot' && this.foot) this.footShoot(e);
    });
  }

  onKey(code) {
    if (code === 'Escape') {
      if (['map', 'garage', 'shop'].includes(this.mode)) this.mode = this.prevMode === 'foot' ? 'foot' : 'drive';
      else if (this.mode === 'drive' || this.mode === 'foot') { this.prevMode = this.mode; this.mode = 'map'; }
      return;
    }
    if (this.mode === 'map') {
      if (code === 'KeyG') this.mode = 'garage';
      if (code === 'KeyT') this.mode = 'shop';
      if (code === 'KeyS') this.saveGame();
      if (code === 'KeyL') this.loadGame();
      return;
    }
    if (this.mode === 'garage') {
      if (code === 'KeyM') this.mode = 'map';
      if (code === 'ArrowUp') this.garageSel = Math.max(0, this.garageSel - 1);
      if (code === 'ArrowDown') this.garageSel = Math.min(3, this.garageSel + 1);
      if (code === 'Enter') this.toast('CAR READY AT BRASA AUTO WORKS', 2.4);
      return;
    }
    if (this.mode === 'shop') {
      if (code === 'KeyM') this.mode = 'map';
      if (code === 'ArrowLeft') this.shopSel = Math.max(0, this.shopSel - 1);
      if (code === 'ArrowRight') this.shopSel = Math.min(2, this.shopSel + 1);
      return;
    }
    if (code === 'KeyM' && (this.mode === 'drive')) { this.cycleRadio(); return; }
    if (code === 'KeyF') {
      if (this.mode === 'drive') this.enterFoot();
      else if (this.mode === 'foot') this.enterCar();
      else if (this.mode === 'boat') { this.mode = 'drive'; this.toast('BACK IN THE REGENT GT', 2); }
      return;
    }
    if (code === 'KeyB' && this.mode === 'drive' && districtAt(this.road, this.position) === 'marina') {
      this.mode = 'boat';
      this.boat = { z: this.position, speed: 0 };
      this.toast('SKIFF AWAY — F TO RETURN', 2.6);
      return;
    }
    if (this.mode === 'drive') {
      if (code === 'KeyQ') this.useAbility(0);
      if (code === 'KeyE') this.useAbility(1);
      if (code === 'KeyR') this.useAbility(2);
      if (code.startsWith('Digit')) {
        const n = Number(code.slice(5));
        if (n >= 1 && n <= 6) this.weaponSel = n - 1;
      }
      if (code === 'Enter' && this.racePrompt) this.startRace(this.racePrompt);
    }
    if (this.mode === 'foot' && this.foot) {
      if (code === 'Space') this.footShoot(null);
      if (code.startsWith('Digit')) {
        const n = Number(code.slice(5));
        if (n >= 1 && n <= 6) this.weaponSel = n - 1;
      }
    }
  }

  cycleRadio() {
    this.radioIdx = (this.radioIdx + 1) % RADIO.length;
    this.trackIdx = 0;
    this.radioT = 0;
  }

  useAbility(i) {
    if (this.crewCd[i] > 0) return;
    const c = CREW[i];
    this.crewCd[i] = c.cooldown;
    if (i === 0) {
      this.heat = Math.max(0, this.heat - 100);
      this.confused = 5;
      this.syncUnits();
      this.toast('SWAP PLATES — HEAT DROPS', 2.4);
    } else if (i === 1) {
      this.condition = Math.min(100, this.condition + 45);
      this.toast('QUICK FIX — CONDITION UP', 2.4);
    } else {
      this.eyesOut = 10;
      this.toast('EYES OUT — UNITS MARKED', 2.4);
    }
    this.say(c.id, 4);
  }

  // --------------------------------------------------------- mode swaps

  enterFoot() {
    this.mode = 'foot';
    this.speed = 0;
    const stalls = [];
    const rng = new Rng(this.seed * 13 + 5);
    const signs = ['FRUTA', 'MARISCOS', 'CAFE SOL', 'TEXTILES', 'RON BRASA', 'FLORERIA', 'PESCADO', 'DULCES'];
    for (let i = 0; i < 16; i += 1) {
      stalls.push({ x: i * 1750 + rng.range(-160, 160), color: rng.pick(['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5']), sign: signs[i % signs.length], variant: i });
    }
    const crowd = [];
    for (let i = 0; i < 18; i += 1) {
      crowd.push({ x: rng.range(300, FOOT_WORLD - 300), lane: rng.int(0, 1), shirt: rng.pick(['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#e0aaff']), skin: rng.pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524']), pants: '#26232b', aim: null, run: rng.range(0, 6), vx: rng.range(-14, 14) });
    }
    this.foot = {
      x: 2400, camX: 0, stalls, crowd, enemies: [], tracers: [], hp: this.hp,
      targetX: this.stageKind === 'foot' ? 2400 + 5200 : null, walk: 0,
    };
    if (this.stageKind === 'foot') {
      for (let i = 0; i < 3; i += 1) {
        this.foot.enemies.push({ x: 2400 + 4300 + i * 620, lane: 0, shirt: '#3a3f4a', skin: '#c68642', pants: '#191920', aim: Math.PI, hp: 40, flash: 0, down: false, fireT: 1 + i * 0.7 });
      }
      this.toast('ON FOOT — REACH THE MARKER', 2.6);
    }
  }

  enterCar() {
    this.mode = 'drive';
    this.hp = this.foot ? this.foot.hp : this.hp;
    this.foot = null;
  }

  footShoot(e) {
    const wp = this.weapons[this.weaponSel];
    if (wp.mag === Infinity && wp.id === 'fists') return;
    const f = this.foot;
    // Aim right (or left if the nearest enemy is left).
    let dir = 1;
    let best = null;
    for (const en of f.enemies) {
      if (en.down) continue;
      const d = Math.abs(en.x - f.x);
      if (!best || d < best.d) best = { d, en };
    }
    if (best && best.en.x < f.x) dir = -1;
    f.tracers.push({ x1: f.x + 30 * dir - f.camX, y1: this.h * 0.94 - 168 * 0.72, x2: f.x + dir * 620 - f.camX, y2: this.h * 0.94 - 168 * 0.72 + this.rng.range(-16, 16), ttl: 0.07 });
    f.flash = 0.06;
    if (best && best.d < 900) {
      best.en.hp -= wp.damage;
      if (best.en.hp <= 0) { best.en.down = true; this.toast('TARGET DOWN', 1.6); }
    }
    this.addHeat(12);
  }

  // -------------------------------------------------------------- saves

  saveGame() {
    const slot = this.saves.findIndex((s) => !s);
    const idx = slot === -1 ? 0 : slot;
    const data = { cash: this.cash, rp: this.rp, jobIndex: this.jobIndex, stage: this.stage, stats: this.stats, label: `Job ${this.jobIndex + 1}/10`, detail: `$${this.cash.toLocaleString('en-US')} · R${this.rank.n}` };
    this.saves[idx] = { label: data.label, detail: data.detail };
    try { localStorage.setItem(`islabrasa-save-${idx}`, JSON.stringify(data)); } catch { /* offline */ }
    this.toast(`SAVED — SLOT ${idx + 1}`, 2.2);
  }

  loadGame() {
    for (let i = 2; i >= 0; i -= 1) {
      try {
        const raw = localStorage.getItem(`islabrasa-save-${i}`);
        if (!raw) continue;
        const d = JSON.parse(raw);
        this.cash = d.cash; this.rp = d.rp; this.jobIndex = d.jobIndex; this.stage = d.stage; this.stats = d.stats;
        this.setObjective();
        this.toast(`LOADED — SLOT ${i + 1}`, 2.2);
        return;
      } catch { /* next slot */ }
    }
    this.toast('NO SAVE FOUND', 2);
  }

  loadSavesMeta() {
    for (let i = 0; i < 3; i += 1) {
      try {
        const raw = localStorage.getItem(`islabrasa-save-${i}`);
        if (raw) { const d = JSON.parse(raw); this.saves[i] = { label: d.label, detail: d.detail }; }
      } catch { /* fresh profile */ }
    }
  }

  // -------------------------------------------------------------- races

  startRace(def) {
    this.race = {
      def, cp: 0, cpTotal: def.checkpoints, t: 0,
      nextZ: wrap(this.position + 6500, this.road.totalLength),
      rivals: [0, 1, 2].map((i) => ({ progress: -i * 900 - 400, speed: 8900 - i * 420, color: ['#3a86ff', '#ffd23f', '#f15bb5'][i], offset: [-0.4, 0.05, 0.45][i], z: wrap(this.position - 300 - i * 500, this.road.totalLength) })),
      finished: false,
    };
    this.racePrompt = null;
    this.toast(`${def.name.toUpperCase()} — GO!`, 2.6);
  }

  racePosition() {
    if (!this.race) return 1;
    const mine = this.race.cp * 100000 - distAhead(this.position, this.race.nextZ, this.road.totalLength);
    let pos = 1;
    for (const r of this.race.rivals) if (r.progress > mine) pos += 1;
    return pos;
  }

  // ------------------------------------------------------------- update

  update(dt) {
    this.time += dt;
    if (this.dialogT > 0) { this.dialogT -= dt; if (this.dialogT <= 0) this.dialog = null; }
    if (this.messageT > 0) { this.messageT -= dt; if (this.messageT <= 0) this.message = null; }
    for (let i = 0; i < 3; i += 1) this.crewCd[i] = Math.max(0, this.crewCd[i] - dt);
    this.eyesOut = Math.max(0, this.eyesOut - dt);
    this.confused = Math.max(0, this.confused - dt);
    this.radioT += dt;
    if (this.radioT > 24) { this.radioT = 0; this.trackIdx = (this.trackIdx + 1) % RADIO[this.radioIdx].tracks.length; }

    if (this.mode === 'drive') this.updateDrive(dt);
    else if (this.mode === 'foot') this.updateFoot(dt);
    else if (this.mode === 'boat') {
      if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) this.boat.speed = Math.min(5200, this.boat.speed + 2400 * dt);
      else this.boat.speed = Math.max(0, this.boat.speed - 1200 * dt);
      this.boat.z = wrap(this.boat.z + this.boat.speed * dt, this.road.totalLength);
      this.position = this.boat.z;
    }
    this.stats.topSpeed = Math.max(this.stats.topSpeed, Math.round((this.speed / MAX_SPEED) * 212));
  }

  updateDrive(dt) {
    const total = this.road.totalLength;
    const seg = this.road.segments[Math.floor(this.position / SEG_LEN) % this.road.length];
    const up = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const nitroKey = this.keys.has('ShiftLeft') || this.keys.has('Space');
    if (up) this.speed += ACCEL * dt * (nitroKey && this.nitro > 0 ? 1.5 : 1);
    if (down) this.speed -= BRAKE * dt;
    if (!up && !down) this.speed -= 900 * dt;
    if (nitroKey && up && this.nitro > 0) this.nitro = Math.max(0, this.nitro - dt * 0.3);
    else this.nitro = Math.min(1, this.nitro + dt * 0.05);
    if (Math.abs(this.playerX) > 1.15) this.speed -= OFFROAD_DECEL * dt;
    this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed));
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    this.playerX += steer * dt * (0.9 + this.speed / MAX_SPEED) - seg.curve * (this.speed / MAX_SPEED) * dt * 0.55;
    this.playerX = Math.max(-1.7, Math.min(1.7, this.playerX));
    this.position = wrap(this.position + this.speed * dt, total);

    // Traffic flow + collisions.
    for (const car of this.cars) {
      car.z = wrap(car.z + car.speed * dt, total);
      const ahead = distAhead(this.position, car.z, total);
      if (ahead > 0 && ahead < 700 && Math.abs(car.offset - this.playerX) < 0.3 && this.speed > car.speed) {
        this.speed = car.speed * 0.6;
        this.condition = Math.max(5, this.condition - 4);
        this.addHeat(9);
        this.toast('CONTACT — BBPD ALERTED', 1.4);
      }
      if (ahead > total * 0.6 && ahead < total * 0.98 && this.cars.length > 30) car.z = wrap(this.position + this.rng.range(9000, 24000), total);
    }
    if (this.cars.length < 26) this.spawnTraffic(false);

    // Police.
    this.syncUnits();
    let anyNear = false;
    for (const u of this.units) {
      const ahead = distAhead(this.position, u.z, total);
      const behind = distAhead(u.z, this.position, total);
      const gap = Math.min(ahead, behind);
      if (gap < 3200) anyNear = true;
      let targetZ;
      let targetOff = this.playerX;
      if (u.role === 'ROADBLOCK') targetZ = wrap(this.position + 5200, total);
      else if (u.role === 'SPIKES') targetZ = wrap(this.position + 7600, total);
      else if (u.role === 'FLANKING') { targetZ = wrap(this.position + 500, total); targetOff = this.playerX + (u.id.endsWith('2') ? -0.62 : 0.62); }
      else if (u.role === 'SPOTLIGHT' || u.role === 'TAIL') targetZ = wrap(this.position - 1900, total);
      else targetZ = wrap(this.position - 700, total);
      const dz = distAhead(u.z, targetZ, total);
      const spd = this.confused > 0 ? 5200 : 10600;
      if (dz < total / 2) u.z = wrap(u.z + Math.min(dz, spd * dt), total);
      else u.z = wrap(u.z - Math.min(total - dz, spd * dt), total);
      u.offset += (targetOff - u.offset) * Math.min(1, dt * 1.6);
      // Ram / spike contact.
      if (gap < 480 && Math.abs(u.offset - this.playerX) < 0.3) {
        if (u.role === 'SPIKES') { this.condition = Math.max(5, this.condition - 16); this.speed *= 0.55; this.toast('SPIKES — TYRES SHREDDED', 1.8); }
        else if (u.role === 'RAMMING' || u.role === 'PURSUIT') { this.speed *= 0.94; this.condition = Math.max(5, this.condition - 1.2); }
      }
    }
    if (this.stars > 0) {
      if (anyNear) this.losTimer = 0;
      else {
        this.losTimer += dt;
        if (this.losTimer > 6) {
          this.heat = Math.max(0, this.heat - 22 * dt);
          if (this.stars === 0) { this.stats.escapes += 1; this.toast('YOU LOST THEM', 2.4); this.syncUnits(); }
        }
      }
    }

    // Job objective.
    if (!this.race && distAhead(this.position, this.objectiveZ, total) < 500 && this.stageKind === 'drive') this.advanceStage();
    if (this.jobTimer !== null) {
      this.jobTimer -= dt;
      if (this.jobTimer <= 0) { this.toast('JOB FAILED — RESTARTING STAGE', 2.4); this.jobTimer = 150; this.setObjective(); }
    }

    // Race flow.
    const zone = districtAt(this.road, this.position);
    this.racePrompt = null;
    if (!this.race && this.speed < 60) {
      for (const r of RACES) {
        if ((r.id === 'blitz' && zone === 'palmas') || (r.id === 'grid' && zone === 'oldtown') || (r.id === 'climb' && zone === 'alto')) { this.racePrompt = r; break; }
      }
    }
    if (this.race) {
      const rc = this.race;
      rc.t += dt;
      for (const rv of rc.rivals) {
        rv.progress += rv.speed * dt;
        rv.z = wrap(rv.z + rv.speed * dt, total);
      }
      if (distAhead(this.position, rc.nextZ, total) < 600) {
        rc.cp += 1;
        if (rc.cp >= rc.cpTotal) {
          const pos = this.racePosition();
          this.cash += pos === 1 ? rc.def.prize : Math.floor(rc.def.prize / 3);
          if (pos === 1) this.stats.racesWon = Math.min(3, this.stats.racesWon + 1);
          this.toast(`FINISH P${pos} — ${rc.def.name.toUpperCase()}`, 3.4);
          this.race = null;
        } else {
          rc.nextZ = wrap(rc.nextZ + 6500, total);
        }
      }
    }
  }

  advanceStage() {
    const job = JOBS[this.jobIndex];
    if (this.stage >= 2) {
      this.cash += job.pay;
      this.rp += job.rp;
      this.stats.jobsDone = Math.min(10, this.stats.jobsDone + 1);
      this.stats.earned += job.pay;
      this.stats.completion = Math.min(100, Math.round((this.stats.jobsDone / 10) * 100));
      this.toast(`JOB DONE — +$${job.pay.toLocaleString('en-US')}`, 3.4);
      this.jobIndex = Math.min(JOBS.length - 1, this.jobIndex + 1);
      this.stage = 0;
    } else {
      this.stage += 1;
      this.toast(`STAGE ${this.stage + 1}/3 — ${JOBS[this.jobIndex].name.toUpperCase()}`, 2.6);
    }
    this.setObjective();
    this.say('vera', 4);
  }

  updateFoot(dt) {
    const f = this.foot;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const run = this.keys.has('ShiftLeft');
    const v = (run ? 620 : 380) * dt;
    if (left) { f.x -= v; f.walk += dt * 9; }
    if (right) { f.x += v; f.walk += dt * 9; }
    f.x = Math.max(120, Math.min(FOOT_WORLD - 120, f.x));
    f.camX += ((f.x - this.w * 0.38) - f.camX) * Math.min(1, dt * 5);
    f.camX = Math.max(0, Math.min(FOOT_WORLD - this.w, f.camX));
    for (const c of f.crowd) { c.x += (c.vx || 0) * dt; if (c.x < 100 || c.x > FOOT_WORLD - 100) c.vx = -(c.vx || 10); c.run += dt * 4; }
    for (const t of f.tracers) t.ttl -= dt;
    f.tracers = f.tracers.filter((t) => t.ttl > 0);
    f.flash = Math.max(0, (f.flash || 0) - dt);
    let danger = false;
    for (const en of f.enemies) {
      if (en.down) continue;
      en.fireT -= dt;
      const d = Math.abs(en.x - f.x);
      if (en.fireT <= 0 && d < 1500) {
        en.fireT = this.rng.range(0.9, 1.8);
        en.flash = 0.07;
        f.tracers.push({ x1: en.x - 30 - f.camX, y1: this.h * 0.94 - 168 * 0.72, x2: f.x - f.camX + this.rng.range(-24, 24), y2: this.h * 0.94 - 168 * 0.6, ttl: 0.07 });
        if (d < 800) { danger = true; f.hp = Math.max(0.05, f.hp - 0.045); }
      }
      en.flash = Math.max(0, (en.flash || 0) - dt);
    }
    if (danger && f.hp <= 0.1) { this.toast('WOUNDED — FALLING BACK', 2); this.enterCar(); return; }
    if (f.targetX && Math.abs(f.x - f.targetX) < 160) {
      const allDown = f.enemies.every((e) => e.down);
      void allDown;
      this.enterCar();
      this.advanceStage();
    }
  }

  // ------------------------------------------------------------- render

  buildUI() {
    const total = this.road.totalLength;
    const job = JOBS[this.jobIndex];
    const rank = this.rank;
    const next = this.nextRank;
    const rpFrac = next && next.n !== rank.n ? (this.rp - rank.rp) / Math.max(1, next.rp - rank.rp) : 1;
    const dispatch = this.units.map((u) => {
      const gap = Math.min(distAhead(this.position, u.z, total), distAhead(u.z, this.position, total));
      return { id: u.id, role: u.role, dist: `${Math.round(gap / 10)}m`, roleColor: u.role === 'RAMMING' ? '#ff6b6b' : u.role === 'SPOTLIGHT' ? '#ffd166' : '#ffb703' };
    });
    const blips = this.units.map((u) => ({ frac: u.z / total, color: '#3a86ff' }));
    if (this.eyesOut > 0) for (const car of this.cars.slice(0, 8)) blips.push({ frac: car.z / total, color: '#ffd166' });
    const ui = {
      job: { n: this.jobIndex + 1, total: 10, name: job.name, stage: this.stage + 1, stageTotal: 3, next: job.stages[this.stage], giver: job.giver, timer: this.jobTimer !== null ? `${Math.floor(this.jobTimer / 60)}:${String(Math.floor(this.jobTimer % 60)).padStart(2, '0')}` : null },
      banner: this.stars >= 3 ? '⚠ AIR UNIT DEPLOYED — FALCON OVERHEAD ⚠' : null,
      dispatch,
      weapons: this.weapons.map((wp) => ({ name: wp.name, short: wp.id === 'fists' ? 'FIST' : wp.id === 'bat' ? 'BAT' : wp.id === 'p9' ? 'P9' : wp.id === 'mako' ? 'SMG' : wp.id === 'breaker' ? '12G' : 'AR', ammo: wp.mag === Infinity ? '∞' : `${wp.ammo}` })),
      selWeapon: this.weaponSel,
      crew: CREW.map((c, i) => ({ ...c, initials: c.name.split(' ').map((s) => s[0]).join(''), cdFrac: this.crewCd[i] / c.cooldown })),
      dialog: this.dialog,
      cash: this.cash,
      hp: this.mode === 'foot' && this.foot ? this.foot.hp : this.hp,
      armour: this.armour,
      wanted: this.stars,
      speedKmh: this.mode === 'drive' ? (this.speed / MAX_SPEED) * 212 : null,
      carName: HERO.car,
      condition: this.condition,
      nitro: this.nitro,
      radio: { name: RADIO[this.radioIdx].name, track: RADIO[this.radioIdx].tracks[this.trackIdx] },
      respect: { rank: rank.n, name: rank.name, frac: Math.min(1, rpFrac), next: next && next.n !== rank.n ? `${next.name} — ${next.unlock}` : 'MAX RANK', rp: this.rp },
      map: { frac: this.position / total, objectiveFrac: this.objectiveZ / total, blips, pois: true },
      race: this.race ? { pos: this.racePosition(), of: 4, cp: this.race.cp, cpTotal: this.race.cpTotal, timeStr: `${Math.floor(this.race.t / 60)}:${String(Math.floor(this.race.t % 60)).padStart(2, '0')}` } : null,
      message: this.message || (this.racePrompt ? `ENTER — START ${this.racePrompt.name.toUpperCase()}` : null),
      hint: this.mode === 'drive' ? 'WASD drive · SHIFT nitro · F exit · Q/E/R crew · M radio · ESC menu' : this.mode === 'foot' ? 'A/D walk · SPACE shoot · F enter car · ESC menu' : '',
      stats: this.stats,
      saves: this.saves,
      garageSel: this.garageSel,
      shopSel: this.shopSel,
    };
    return ui;
  }

  sceneCars() {
    const out = [];
    for (const car of this.cars) out.push(car);
    for (const u of this.units) out.push({ z: u.z, offset: u.offset, color: '#e8e9eb', kind: 'police', plate: 'BBPD' });
    if (this.race) for (const rv of this.race.rivals) out.push({ z: rv.z, offset: rv.offset, color: rv.color, kind: 'rival', plate: 'RACE' });
    return out;
  }

  render() {
    const { ctx, w, h } = this;
    const ui = this.buildUI();
    if (this.mode === 'map') { drawMapScreen(ctx, w, h, ui); return; }
    if (this.mode === 'garage') { drawGarageScreen(ctx, w, h, ui); return; }
    if (this.mode === 'shop') { drawShopScreen(ctx, w, h, ui); return; }
    if (this.mode === 'foot' && this.foot) {
      const f = this.foot;
      const figures = [];
      figures.push({ x: f.x, lane: 0, shirt: '#ff7b00', skin: '#c68642', pants: '#1d1d24', hair: '#101014', aim: 0, flash: (f.flash || 0) > 0, run: f.walk });
      figures.push({ x: f.x - 210, lane: 1, shirt: '#ffb703', skin: '#8d5524', pants: '#26232b', aim: 0, run: f.walk * 0.9 });
      figures.push({ x: f.x + 250, lane: 1, shirt: '#2ec4b6', skin: '#f1c27d', pants: '#26232b', aim: 0, run: f.walk * 0.9 });
      for (const c of f.crowd) figures.push(c);
      for (const en of f.enemies) figures.push({ ...en, flash: (en.flash || 0) > 0 });
      drawFootScene(ctx, w, h, { camX: f.camX, stalls: f.stalls, figures, tracers: f.tracers, time: this.time });
      // Objective marker.
      if (f.targetX) {
        const mx = f.targetX - f.camX;
        ctx.fillStyle = 'rgba(255,183,3,0.9)';
        ctx.beginPath();
        ctx.moveTo(mx, h * 0.6);
        ctx.lineTo(mx + 13, h * 0.66);
        ctx.lineTo(mx - 13, h * 0.66);
        ctx.closePath();
        ctx.fill();
      }
      drawHUD(ctx, w, h, { ...ui, speedKmh: null });
      return;
    }
    if (this.mode === 'boat') {
      // Water run alongside the marina coast.
      this.renderer.render({ road: this.road, position: this.boat.z, playerX: 0, speed: this.boat.speed, palette: 'sunset', cars: [], hero: null, heli: null, time: this.time });
      // The skiff, screen space.
      const bx = w / 2;
      const by = h * 0.86;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(bx - 90, by + 26);
      ctx.lineTo(bx, by + 66);
      ctx.lineTo(bx + 90, by + 26);
      ctx.lineTo(bx + 30, by + 20);
      ctx.lineTo(bx - 30, by + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath();
      ctx.moveTo(bx - 64, by + 18);
      ctx.lineTo(bx - 40, by - 26);
      ctx.lineTo(bx + 40, by - 26);
      ctx.lineTo(bx + 64, by + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(bx - 40, by - 26, 80, 8);
      ctx.fillStyle = '#c68642';
      ctx.beginPath();
      ctx.arc(bx, by - 40, 11, 0, 7);
      ctx.fill();
      drawHUD(ctx, w, h, { ...ui, speedKmh: Math.round(this.boat.speed / 55), banner: null, dispatch: [] });
      return;
    }
    // Driving.
    const zone = districtAt(this.road, this.position);
    const palette = zone === 'alto' ? 'sunset' : 'golden';
    this.renderer.render({
      road: this.road, position: this.position, playerX: this.playerX, speed: this.speed,
      palette, cars: this.sceneCars(),
      hero: { scaleMul: this.heroScale || 1 },
      marker: this.race ? { z: this.race.nextZ, offset: 0 } : null,
      heli: this.stars >= 3 ? { x: 0.55 + Math.sin(this.time * 0.4) * 0.03, y: 0.155, scale: 1.32 } : null,
      time: this.time,
    });
    drawHUD(ctx, w, h, ui);
    if (this.wheelOpen) drawWheel(ctx, w, h, ui);
  }
}

export { PALETTES };
