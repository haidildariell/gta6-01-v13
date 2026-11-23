// game.js — ISLA BRASA itself: the state machine and every system wired
// together. On foot you cross Los Brasa in the angled top-down city; in a car
// the camera drops behind the rear quarter for the chase view; the FALCON
// hunts you at four stars; Vera's ten jobs pay the rent; the garage, the
// shops, the races and the boat are all real, reachable places.

import { Rng, clamp, dist2 } from './rng.js';
import { WORLD, WEAPONS, CREW, RESPECT_RANKS, RADIO_STATIONS, CAR_MODELS, SHOPS, GARAGE_UPGRADES, RACES, DIALOG_LINES, PALETTES } from './config.js';
import { City, districtAt, isSea, isRoad, formatCash } from './world.js';
import { drawWorld2D, drawCarTop, drawPerson, drawTracer } from './render2d.js';
import { drawRoadScene, drawHelicopter, drawSpotlightCone } from './render3d.js';
import { drawHUD, drawPauseScreen, drawStartScreen } from './hud.js';
import { TrafficCar, Pedestrian, PoliceUnit, Falcon, RivalCar, dispatchFeed } from './entities.js';
import { JobRunner } from './missions.js';

export const PORTRAITS = {
  dario: { skin: '#c98d64', hair: '#1c1410', shirt: '#ff7b00', bg: '#31435f', ring: '#ffd23f' },
  lio: { skin: '#f2c29b', hair: '#3a2a18', shirt: '#ffd23f', bg: '#3d3416', ring: '#ffd23f' },
  tomas: { skin: '#8a5a3b', hair: '#0f0c0a', shirt: '#06d6a0', bg: '#123c31', ring: '#06d6a0' },
  vera: { skin: '#a06a42', hair: '#14100c', shirt: '#ef476f', bg: '#47222f', ring: '#ef476f' },
};

const WEAPON_SHORT = { fists: 'FISTS', bat: 'BAT', p9: 'P9', mako: 'MAKO', breaker: '12G', carbine: 'AR' };

export class Game {
  constructor(seed) {
    this.rng = new Rng(seed * 31 + 7);
    this.city = new City(seed);
    this.seed = seed;
    this.time = 0;
    this.started = false;
    this.paused = false;
    this.mode = 'foot'; // foot | drive | boat | race
    this.palette = PALETTES.golden;
    // player
    this.player = { x: 2620, y: 1560, angle: -Math.PI / 2, hp: 100, armour: 35, walkPhase: 0, speed: 0 };
    this.car = null; // the car the player sits in
    this.ownedCars = [CAR_MODELS[1]];
    this.garageCars = [CAR_MODELS[0]];
    this.upgrades = new Set();
    // economy + progression
    this.cash = 24580;
    this.cashEarned = 96400;
    this.respect = 940;
    // weapons
    this.weaponIdx = 3;
    this.ammo = {};
    for (const w of WEAPONS) this.ammo[w.id] = w.ammo;
    this.ownedWeapons = new Set(['fists', 'bat', 'p9', 'mako']);
    this.fireCooldown = 0;
    this.tracers = [];
    // crew cooldowns (seconds left)
    this.crewCd = { lio: 0, tomas: 12, vera: 0 };
    this.eyesOutUntil = 0;
    // wanted + police
    this.wanted = 4;
    this.heat = 0.62; // line-of-sight heat 0..1; decays when unseen
    this.police = [];
    this.falcon = new Falcon();
    this.falcon.active = true;
    this.spawnPolice(9);
    // world population
    this.traffic = [];
    for (let i = 0; i < 26; i++) this.traffic.push(new TrafficCar(this.rng, this.city));
    this.peds = [];
    for (let i = 0; i < 46; i++) this.peds.push(new Pedestrian(this.rng, this.player));
    // missions
    this.jobs = new JobRunner();
    this.dialog = null;
    this.dialogUntil = 0;
    this.setDialog('vera', DIALOG_LINES.veraChase, 9);
    // radio
    this.radioIdx = 0;
    this.trackIdx = 0;
    // race state
    this.race = null;
    // stats
    this.stats = { topSpeed: 287, bustsEscaped: 6, carsJacked: 13, racesWon: 1, playSec: 7540 };
    this.toast = null;
    this.toastUntil = 0;
    this.menu = null; // shop/garage overlay
    this.mouse = { x: 0, y: 0, down: false };
    this.keys = {};
    this.shirtColor = '#ff7b00';
    this.loadSaves();
  }

  // ------------------------------------------------------------ saves
  loadSaves() {
    this.saves = [null, null, null];
    try {
      for (let i = 0; i < 3; i++) {
        const raw = localStorage.getItem(`islabrasa-save-${i + 1}`);
        if (raw) this.saves[i] = JSON.parse(raw);
      }
    } catch (e) { /* private mode: saves simply stay empty */ }
    if (!this.saves[0]) this.saves[0] = { title: 'JOB 6 — REGENT RUN', detail: 'Los Brasa · Respect 5 · $24,580' };
    if (!this.saves[1]) this.saves[1] = { title: 'JOB 3 — MARKET DAY', detail: 'Old Town · Respect 3 · $9,140' };
  }

  quickSave() {
    const rank = this.respectRank();
    const data = { title: `JOB ${this.jobs.job.n} — ${this.jobs.job.title}`, detail: `Los Brasa · Respect ${rank.rank} · ${formatCash(this.cash)}` };
    this.saves[0] = data;
    try { localStorage.setItem('islabrasa-save-1', JSON.stringify(data)); } catch (e) { /* ignore */ }
    this.showToast('SAVED — SLOT 1');
  }

  // ------------------------------------------------------------ helpers
  respectRank() {
    let cur = RESPECT_RANKS[0];
    let next = null;
    for (let i = 0; i < RESPECT_RANKS.length; i++) {
      if (this.respect >= RESPECT_RANKS[i].need) cur = RESPECT_RANKS[i];
      else { next = RESPECT_RANKS[i]; break; }
    }
    const span = next ? next.need - cur.need : 1;
    const frac = next ? (this.respect - cur.need) / span : 1;
    return { rank: cur.rank, name: cur.name, frac, nextUnlock: next ? next.unlock : 'Everything unlocked' };
  }

  setDialog(who, line, secs) {
    const people = { vera: ['Vera Quintana', 'Fixer'], lio: ['Lio Park', 'Wheelman'], tomas: ['Tomas Rey', 'Wrench'], dario: ['Dario Venn', 'You'] };
    const [name, role] = people[who];
    this.dialog = { name, role, line, ...PORTRAITS[who] };
    this.dialogUntil = this.time + secs;
  }

  showToast(text, secs = 3) {
    this.toast = text;
    this.toastUntil = this.time + secs;
  }

  addWanted(stars) {
    const before = this.wanted;
    this.wanted = clamp(this.wanted + stars, 0, 5);
    this.heat = 1;
    if (this.wanted > before) this.syncPolice();
  }

  syncPolice() {
    const want = [0, 2, 4, 6, 8, 9][this.wanted] || 0;
    const roles = ['PURSUIT', 'RAMMING', 'FLANKING', 'PURSUIT', 'ROADBLOCK', 'FLANKING', 'SPIKE STRIP', 'PURSUIT', 'RAMMING'];
    while (this.police.length < want) {
      const i = this.police.length;
      this.police.push(new PoliceUnit(this.rng, this.playerPos(), roles[i % roles.length], i));
    }
    if (this.police.length > want) this.police.length = want;
    this.falcon.active = this.wanted >= 4;
  }

  spawnPolice(n) {
    const roles = ['PURSUIT', 'RAMMING', 'FLANKING', 'PURSUIT', 'ROADBLOCK', 'FLANKING', 'SPIKE STRIP', 'PURSUIT', 'RAMMING'];
    for (let i = 0; i < n; i++) this.police.push(new PoliceUnit(this.rng, this.player, roles[i % roles.length], i));
  }

  playerPos() {
    return this.car && (this.mode === 'drive' || this.mode === 'race') ? this.car : this.player;
  }

  // ------------------------------------------------------------ input
  keyDown(code) {
    this.keys[code] = true;
    if (!this.started) {
      if (code === 'Enter' || code === 'Space') this.started = true;
      return;
    }
    if (code === 'Escape') { this.paused = !this.paused; this.menu = null; return; }
    if (this.paused) return;
    if (code === 'KeyF') this.toggleVehicle();
    if (code === 'KeyN') { this.radioIdx = (this.radioIdx + 1) % RADIO_STATIONS.length; this.showToast(RADIO_STATIONS[this.radioIdx].name.toUpperCase()); }
    if (code === 'F5') { this.quickSave(); return; }
    if (code === 'KeyB') this.tryShopOrRace();
    if (code === 'KeyQ') this.useCrew('lio');
    if (code === 'KeyE') this.useCrew('tomas');
    if (code === 'KeyR') this.useCrew('vera');
    if (code.startsWith('Digit')) {
      const n = parseInt(code.slice(5), 10);
      if (n >= 1 && n <= WEAPONS.length && this.ownedWeapons.has(WEAPONS[n - 1].id)) this.weaponIdx = n - 1;
    }
    if (code === 'Tab') {
      let n = this.weaponIdx;
      do { n = (n + 1) % WEAPONS.length; } while (!this.ownedWeapons.has(WEAPONS[n].id));
      this.weaponIdx = n;
    }
    if (this.menu) this.menuKey(code);
  }

  keyUp(code) {
    this.keys[code] = false;
  }

  toggleVehicle() {
    if (this.mode === 'drive' || this.mode === 'race') {
      // step out, leaving the car where it stands
      this.player.x = this.car.x + 44;
      this.player.y = this.car.y + 10;
      this.player.hp = this.player.hp;
      this.mode = 'foot';
      this.car.parkedByPlayer = true;
      return;
    }
    if (this.mode === 'boat') {
      this.mode = 'foot';
      this.player.x = WORLD.seaX - 90;
      this.showToast('Back on the boardwalk');
      return;
    }
    // near a dock? take the boat
    if (this.player.x > WORLD.seaX - 190 && this.player.y > 120 && this.player.y < 1080) {
      this.mode = 'boat';
      this.boat = { x: WORLD.seaX + 130, y: this.player.y, angle: 0, speed: 0 };
      this.showToast('Night Ferry skiff — WASD to run the bay');
      return;
    }
    // find a car to jack or re-enter
    let best = null;
    let bestD = 90 * 90;
    const candidates = [...this.traffic, ...this.city.parked.map((p) => ({ ...p, isParked: true }))];
    if (this.car) candidates.push(this.car);
    for (const c of candidates) {
      const d = dist2(this.player.x, this.player.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      if (!best.isParked && !best.parkedByPlayer) {
        this.stats.carsJacked++;
        this.addWanted(1);
        this.showToast(`JACKED — ${best.model.name.toUpperCase()}`);
      }
      this.car = {
        x: best.x, y: best.y, angle: best.angle || 0, speed: 0,
        model: best.model || CAR_MODELS[1], color: best.color || (best.model || CAR_MODELS[1]).color,
        cond: best.cond !== undefined ? best.cond : 88, nitro: 0.7,
      };
      this.mode = this.race ? 'race' : 'drive';
    }
  }

  tryShopOrRace() {
    for (const shop of SHOPS) {
      if (dist2(this.player.x, this.player.y, shop.x, shop.y) < 130 * 130) {
        this.menu = { kind: shop.kind, shop };
        return;
      }
    }
    for (const race of RACES) {
      if (dist2(this.player.x, this.player.y, race.startX, race.startY) < 170 * 170) {
        this.startRace(race);
        return;
      }
    }
  }

  menuKey(code) {
    if (code === 'KeyB' || code === 'Escape') { this.menu = null; return; }
    const n = parseInt((code || '').slice(5), 10);
    if (!n) return;
    const m = this.menu;
    if (m.kind === 'weapons') {
      const list = WEAPONS.filter((w) => w.id !== 'fists');
      const w = list[n - 1];
      if (w && !this.ownedWeapons.has(w.id) && this.cash >= 1500) {
        this.cash -= 1500;
        this.ownedWeapons.add(w.id);
        this.ammo[w.id] = w.ammo;
        this.showToast(`${w.name.toUpperCase()} — YOURS`);
      } else if (w && this.ownedWeapons.has(w.id)) {
        this.ammo[w.id] = w.ammo;
        this.cash = Math.max(0, this.cash - 250);
        this.showToast(`${w.name.toUpperCase()} — RESTOCKED`);
      }
    } else if (m.kind === 'garage') {
      const up = GARAGE_UPGRADES[n - 1];
      if (up && !this.upgrades.has(up.id) && this.cash >= up.price) {
        this.cash -= up.price;
        this.upgrades.add(up.id);
        this.showToast(`${up.name.toUpperCase()} FITTED`);
      } else if (n === 4 && this.garageCars.length) {
        const model = this.garageCars[0];
        this.car = { x: this.player.x + 60, y: this.player.y, angle: 0, speed: 0, model, color: model.color, cond: 100, nitro: 1 };
        this.mode = 'drive';
        this.menu = null;
        this.showToast(`${model.name.toUpperCase()} — ROLLED OUT`);
      }
    } else if (m.kind === 'clothes') {
      const colors = ['#ff7b00', '#3fa7d6', '#ef476f', '#06d6a0'];
      if (colors[n - 1] && this.cash >= 300) {
        this.cash -= 300;
        this.shirtColor = colors[n - 1];
        this.showToast('NEW THREADS');
      }
    }
  }

  useCrew(id) {
    if (this.crewCd[id] > 0) return;
    const crew = CREW.find((c) => c.id === id);
    this.crewCd[id] = crew.cooldown;
    if (id === 'lio') {
      if (this.wanted > 0) {
        this.wanted--;
        this.heat = 0.2;
        this.syncPolice();
      }
      this.setDialog('lio', DIALOG_LINES.lioPlates, 4);
    } else if (id === 'tomas') {
      if (this.car) this.car.cond = Math.min(100, this.car.cond + 45);
      this.setDialog('tomas', DIALOG_LINES.tomasFix, 4);
    } else if (id === 'vera') {
      this.eyesOutUntil = this.time + 14;
      this.setDialog('vera', DIALOG_LINES.veraEyes, 4);
    }
  }

  startRace(race) {
    const route = buildRaceRoute(race);
    this.race = {
      def: race, route, cp: 1, pos: 2, startTime: this.time, timeSec: 0, bestSec: 187,
      rivals: [0, 1, 2].map((i) => new RivalCar(this.rng, CAR_MODELS[[1, 3, 5][i]], route, { x: (i - 1) * 66, y: 70 + i * 8 })),
    };
    if (!this.car) {
      this.car = { x: race.startX, y: race.startY + 60, angle: -Math.PI / 2, speed: 0, model: CAR_MODELS[0], color: CAR_MODELS[0].color, cond: 96, nitro: 0.85 };
    }
    this.mode = 'race';
    this.showToast(`${race.name.toUpperCase()} — GO WHEN IT GOES`, 2);
  }

  // ------------------------------------------------------------ combat
  shoot() {
    const w = WEAPONS[this.weaponIdx];
    if (this.fireCooldown > 0) return;
    if (this.ammo[w.id] <= 0) { this.showToast('CLICK — EMPTY. BRASA ARMS RESTOCKS.'); this.fireCooldown = 0.3; return; }
    this.fireCooldown = w.rate;
    if (w.ammo !== Infinity) this.ammo[w.id]--;
    const from = this.mode === 'foot' ? this.player : this.playerPos();
    const aim = this.aimAngle(from);
    const pellets = w.id === 'breaker' ? 5 : 1;
    for (let p = 0; p < pellets; p++) {
      const a = aim + (Math.random() - 0.5) * 2 * w.spread * 3;
      const tx = from.x + Math.cos(a) * w.range;
      const ty = from.y + Math.sin(a) * w.range;
      this.tracers.push({ x0: from.x, y0: from.y - 6, x1: tx, y1: ty, life: 0.09, enemy: false });
      // hits: peds panic, officers fall
      for (const ped of this.peds) {
        if (!ped.down && pointNearLine(ped.x, ped.y, from.x, from.y, tx, ty, 16)) {
          ped.fleeFrom(from.x, from.y);
          if (Math.random() < 0.4) ped.down = true;
          this.addWanted(1);
        }
      }
      for (const u of this.police) {
        if (pointNearLine(u.x, u.y, from.x, from.y, tx, ty, 30)) {
          u.hp = (u.hp || 100) - w.damage;
          if (u.hp <= 0) {
            u.disabled = true;
            this.addWanted(1);
            this.showToast('BBPD UNIT DOWN');
          }
        }
      }
    }
    if (this.mode === 'foot') this.addWanted(0); // noise draws heat
    this.heat = Math.min(1, this.heat + 0.25);
  }

  aimAngle(from) {
    const cam = this.camera();
    const wx = cam.x + (this.mouse.x - 640);
    const wy = cam.y + (this.mouse.y - 360);
    return Math.atan2(wy - from.y, wx - from.x);
  }

  camera() {
    const p = this.playerPos();
    return { x: clamp(p.x, 640, WORLD.width - 640), y: clamp(p.y, 360, WORLD.height - 360) };
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (!this.started || this.paused || this.menu) return;
    this.time += dt;
    this.stats.playSec += dt;
    for (const id in this.crewCd) this.crewCd[id] = Math.max(0, this.crewCd[id] - dt);
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.dialog && this.time > this.dialogUntil) this.dialog = null;
    if (this.toast && this.time > this.toastUntil) this.toast = null;
    for (const t of this.tracers) t.life -= dt;
    this.tracers = this.tracers.filter((t) => t.life > 0);

    const pos = this.playerPos();
    if (this.mode === 'foot') this.updateFoot(dt);
    else if (this.mode === 'drive') this.updateDrive(dt, false);
    else if (this.mode === 'race') this.updateDrive(dt, true);
    else if (this.mode === 'boat') this.updateBoat(dt);

    // population
    for (const c of this.traffic) c.update(dt, this.city, this.traffic);
    for (const p of this.peds) p.update(dt, this.city);
    this.police = this.police.filter((u) => !u.disabled);
    for (const u of this.police) u.update(dt, pos, this.city);
    if (this.falcon.active) this.falcon.update(dt, pos);

    // heat decay: unseen for a while, the net cools
    const nearestCop = this.police.length ? Math.min(...this.police.map((u) => dist2(u.x, u.y, pos.x, pos.y))) : Infinity;
    if (nearestCop > 620 * 620) {
      this.heat = Math.max(0, this.heat - dt * 0.05);
      if (this.heat === 0 && this.wanted > 0) {
        this.wanted--;
        this.heat = 0.55;
        if (this.wanted >= 2) this.stats.bustsEscaped++;
        this.syncPolice();
        this.showToast('HEAT LOST — THE NET COOLS');
      }
    } else {
      this.heat = Math.min(1, this.heat + dt * 0.1);
    }
    // contact damage
    if ((this.mode === 'drive' || this.mode === 'race') && nearestCop < 46 * 46) {
      this.car.cond = Math.max(0, this.car.cond - dt * 4);
    }
    if (this.mode === 'foot' && nearestCop < 30 * 30) {
      this.player.hp = Math.max(0, this.player.hp - dt * 3);
    }
    // mission target
    if (this.jobs.active) {
      const t = this.jobs.target;
      const d = Math.sqrt(dist2(pos.x, pos.y, t.x, t.y));
      this.jobs.stageFrac = clamp(1 - d / 1600, 0, 1);
      if (d < 80) {
        const payout = this.jobs.reachTarget(this);
        if (payout) {
          this.cash += payout.cash;
          this.cashEarned += payout.cash;
          this.respect += payout.respect;
          this.showToast(`JOB DONE — ${payout.title} · ${formatCash(payout.cash)}`);
          this.setDialog('vera', 'Banked. Next one is already warm.', 5);
        } else {
          this.showToast('OBJECTIVE UPDATED');
        }
      }
    }
    // race progress
    if (this.race) this.updateRace(dt);
  }

  updateFoot(dt) {
    const p = this.player;
    let mx = 0;
    let my = 0;
    if (this.keys.KeyW) my -= 1;
    if (this.keys.KeyS) my += 1;
    if (this.keys.KeyA) mx -= 1;
    if (this.keys.KeyD) mx += 1;
    const sprint = this.keys.ShiftLeft || this.keys.ShiftRight;
    const sp = sprint ? 265 : 165;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const nx = p.x + (mx / len) * sp * dt;
      const ny = p.y + (my / len) * sp * dt;
      if (!this.city.collide(nx, p.y, 12)) p.x = nx;
      if (!this.city.collide(p.x, ny, 12)) p.y = ny;
      p.walkPhase += dt * (sp / 16);
      p.angle = Math.atan2(my, mx);
    }
    if (this.mouse.down) this.shoot();
  }

  updateDrive(dt, racing) {
    const c = this.car;
    const model = c.model;
    const engineBoost = this.upgrades.has('engine') ? 1.12 : 1;
    const top = (model.topSpeed / 3.6) * 2.6 * engineBoost;
    if (this.keys.KeyW) c.speed += model.accel * 3.4 * dt;
    if (this.keys.KeyS) c.speed -= model.accel * 2.4 * dt;
    const nitroOn = (this.keys.ShiftLeft || this.keys.ShiftRight) && c.nitro > 0 && this.upgrades.has('nitro') || ((this.keys.ShiftLeft || this.keys.ShiftRight) && c.nitro > 0 && racing);
    if (nitroOn && this.keys.KeyW) {
      c.speed += 130 * dt;
      c.nitro = Math.max(0, c.nitro - dt * 0.3);
    }
    c.speed *= Math.pow(0.55, dt); // drag
    c.speed = clamp(c.speed, -60, top);
    const steer = (this.keys.KeyA ? -1 : 0) + (this.keys.KeyD ? 1 : 0);
    if (Math.abs(c.speed) > 4) c.angle += steer * 1.7 * dt * Math.sign(c.speed) * model.grip;
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (!this.city.buildingAt(nx, ny) && !isSea(nx, ny)) {
      c.x = clamp(nx, 30, WORLD.width - 30);
      c.y = clamp(ny, 30, WORLD.height - 30);
    } else {
      c.speed *= -0.3;
      c.cond = Math.max(0, c.cond - 4);
    }
    const kmh = Math.abs(c.speed) * 1.24;
    if (kmh > this.stats.topSpeed) this.stats.topSpeed = Math.round(kmh);
    // running a light or a ped draws heat
    if (this.mouse.down) this.shoot();
  }

  updateBoat(dt) {
    const b = this.boat;
    if (!b) return;
    if (this.keys.KeyW) b.speed += 90 * dt;
    if (this.keys.KeyS) b.speed -= 60 * dt;
    b.speed *= Math.pow(0.7, dt);
    b.speed = clamp(b.speed, -40, 150);
    const steer = (this.keys.KeyA ? -1 : 0) + (this.keys.KeyD ? 1 : 0);
    b.angle += steer * 1.4 * dt;
    b.x = clamp(b.x + Math.cos(b.angle) * b.speed * dt, WORLD.seaX + 40, WORLD.width - 30);
    b.y = clamp(b.y + Math.sin(b.angle) * b.speed * dt, 30, WORLD.height - 30);
  }

  updateRace(dt) {
    const r = this.race;
    r.timeSec += dt;
    for (const rv of r.rivals) rv.update(dt);
    const target = r.route[r.cp];
    if (target && dist2(this.car.x, this.car.y, target.x, target.y) < 150 * 150) {
      r.cp++;
      if (r.cp >= r.route.length) {
        const won = r.pos === 1;
        if (won) {
          this.cash += r.def.prize;
          this.cashEarned += r.def.prize;
          this.stats.racesWon++;
          this.respect += 120;
        }
        this.showToast(won ? `${r.def.name.toUpperCase()} — WON ${formatCash(r.def.prize)}` : `${r.def.name.toUpperCase()} — P${r.pos}`, 5);
        this.race = null;
        this.mode = 'drive';
        return;
      }
    }
    // position: compare route progress
    const myProg = r.cp * 10000 - Math.sqrt(dist2(this.car.x, this.car.y, r.route[Math.min(r.cp, r.route.length - 1)].x, r.route[Math.min(r.cp, r.route.length - 1)].y));
    let pos = 1;
    for (const rv of r.rivals) {
      const rp = rv.wp * 10000 - (rv.route[rv.wp] ? Math.sqrt(dist2(rv.x, rv.y, rv.route[rv.wp].x, rv.route[rv.wp].y)) : 0);
      if (rp > myProg) pos++;
    }
    r.pos = pos;
  }

  // ------------------------------------------------------------ HUD state
  hudState() {
    const pos = this.playerPos();
    const rank = this.respectRank();
    const mission = this.jobs.hudMission();
    const route = this.jobs.active ? this.jobs.routeTo({ x: pos.x, y: pos.y }) : [];
    const blips = [];
    if (this.jobs.active) blips.push({ x: this.jobs.target.x, y: this.jobs.target.y, color: '#ffd23f', r: 4 });
    for (const s of SHOPS) blips.push({ x: s.x, y: s.y, color: '#06d6a0', r: 3 });
    for (const r of RACES) blips.push({ x: r.startX, y: r.startY, color: '#ef476f', r: 3 });
    return {
      mode: this.mode,
      time: this.time,
      city: this.city,
      playerPos: { x: pos.x, y: pos.y },
      districtName: districtAt(pos.x, pos.y).name,
      route,
      blips,
      showPolice: this.time < this.eyesOutUntil,
      policeUnits: this.police,
      cash: this.cash,
      cashText: formatCash(this.cash),
      hp: this.player.hp,
      armour: this.player.armour,
      wanted: this.wanted,
      respectRank: { rank: rank.rank, name: rank.name },
      rpFrac: rank.frac,
      nextUnlock: rank.nextUnlock,
      weapons: WEAPONS.filter((w) => this.ownedWeapons.has(w.id)).map((w) => ({
        ...w,
        short: WEAPON_SHORT[w.id],
        ammoText: w.ammo === Infinity ? '∞' : `${this.ammo[w.id]}`,
      })),
      weaponIdx: Math.max(0, WEAPONS.filter((w) => this.ownedWeapons.has(w.id)).findIndex((w) => w.id === WEAPONS[this.weaponIdx].id)),
      crew: CREW.map((c) => ({
        ...c,
        ...PORTRAITS[c.id],
        ready: this.crewCd[c.id] <= 0,
        cdFrac: 1 - this.crewCd[c.id] / c.cooldown,
        cdLeft: this.crewCd[c.id],
      })),
      mission,
      dispatch: dispatchFeed(this.police, pos),
      dialog: this.dialog,
      radio: { name: RADIO_STATIONS[this.radioIdx].name, track: RADIO_STATIONS[this.radioIdx].tracks[this.trackIdx] },
      speedKmh: this.car && (this.mode === 'drive' || this.mode === 'race') ? Math.abs(this.car.speed) * 1.24 : 0,
      carName: this.car ? this.car.model.name : '',
      carCond: this.car ? this.car.cond : 100,
      nitroFrac: this.car ? this.car.nitro : 0,
      airUnit: this.falcon.active && this.wanted >= 4,
      race: this.race ? {
        name: this.race.def.name, pos: this.race.pos, total: 4,
        cp: this.race.cp, cpTotal: this.race.route.length - 1,
        timeSec: this.race.timeSec, bestSec: this.race.bestSec,
      } : null,
      toast: this.toast,
      stats: {
        completion: Math.round((this.jobs.done.size / 10) * 100),
        jobsDone: this.jobs.done.size,
        cashEarnedText: formatCash(this.cashEarned),
        cashText: formatCash(this.cash),
        topSpeed: this.stats.topSpeed,
        bustsEscaped: this.stats.bustsEscaped,
        carsJacked: this.stats.carsJacked,
        racesWon: this.stats.racesWon,
        playTimeText: `${Math.floor(this.stats.playSec / 3600)}h ${Math.floor((this.stats.playSec % 3600) / 60)}m`,
      },
      saves: this.saves,
    };
  }

  // ------------------------------------------------------------ render
  render(ctx, w, h) {
    if (!this.started) {
      drawStartScreen(ctx, this.hudState(), w, h, this.palette);
      return;
    }
    if (this.mode === 'drive' || this.mode === 'race') this.renderDrive(ctx, w, h);
    else this.renderFoot(ctx, w, h);
    drawHUD(ctx, this.hudState(), w, h);
    if (this.menu) this.renderMenu(ctx, w, h);
    if (this.paused) drawPauseScreen(ctx, this.hudState(), w, h);
  }

  renderFoot(ctx, w, h) {
    const cam = this.camera();
    const night = this.mode === 'boat' ? 0.4 : 0;
    drawWorld2D(ctx, this.city, cam, w, h, { night, time: this.time });
    const sx = (wx) => wx - cam.x + w / 2;
    const sy = (wy) => wy - cam.y + h / 2;
    // traffic + police cars
    for (const c of this.traffic) drawCarTop(ctx, sx(c.x), sy(c.y), c.angle, c.color, {});
    for (const u of this.police) drawCarTop(ctx, sx(u.x), sy(u.y), u.angle, '#24507e', { police: true, flashPhase: u.flashPhase });
    if (this.car && this.mode === 'foot') drawCarTop(ctx, sx(this.car.x), sy(this.car.y), this.car.angle, this.car.color, {});
    // mission marker pillar
    if (this.jobs.active) {
      const t = this.jobs.target;
      const pulse = 1 + Math.sin(this.time * 3) * 0.12;
      ctx.fillStyle = 'rgba(255,210,63,0.3)';
      ctx.beginPath();
      ctx.ellipse(sx(t.x), sy(t.y), 34 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼', sx(t.x), sy(t.y) - 26 - Math.sin(this.time * 3) * 5);
    }
    // race rivals/checkpoints when racing on foot view (not used in race mode)
    // peds + player
    for (const p of this.peds) {
      if (p.down) {
        ctx.fillStyle = p.colors.shirt;
        ctx.fillRect(sx(p.x) - 9, sy(p.y) - 3, 18, 6);
        continue;
      }
      drawPerson(ctx, sx(p.x), sy(p.y), { ...p.colors, walkPhase: p.walkPhase, aim: p.angle, scale: 0.92 });
    }
    if (this.mode === 'boat' && this.boat) {
      drawCarTop(ctx, sx(this.boat.x), sy(this.boat.y), this.boat.angle, '#e63946', { boat: true });
    } else if (this.mode === 'foot') {
      const aim = this.aimAngle(this.player);
      drawPerson(ctx, sx(this.player.x), sy(this.player.y), {
        skin: PORTRAITS.dario.skin, shirt: this.shirtColor, pants: '#22304a',
        walkPhase: this.player.walkPhase, aim, weapon: this.weaponIdx >= 2, scale: 1.05,
      });
    }
    // FALCON shadow + spotlight from above
    if (this.falcon.active) {
      const fx = sx(this.falcon.x);
      const fy = sy(this.falcon.y);
      ctx.fillStyle = 'rgba(255,244,200,0.13)';
      ctx.beginPath();
      ctx.ellipse(sx(this.playerPos().x), sy(this.playerPos().y), 120, 52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(10,10,16,0.5)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,16,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx - 44, fy);
      ctx.lineTo(fx + 44, fy);
      ctx.stroke();
    }
    for (const t of this.tracers) drawTracer(ctx, sx(t.x0), sy(t.y0), sx(t.x1), sy(t.y1), t.enemy ? 'rgba(255,90,77,0.9)' : undefined);
  }

  renderDrive(ctx, w, h) {
    const c = this.car;
    const pos = this.playerPos();
    // Build the road scene from live world state: everything ahead of the
    // car becomes an actor in road space (z = forward, lane = lateral).
    const actors = [];
    const fwdX = Math.cos(c.angle);
    const fwdY = Math.sin(c.angle);
    const latX = -fwdY;
    const latY = fwdX;
    const place = (wx, wy, item) => {
      const dx = wx - pos.x;
      const dy = wy - pos.y;
      const z = dx * fwdX + dy * fwdY;
      const lat = dx * latX + dy * latY;
      if (z < -60 || z > 8800) return;
      actors.push({ ...item, z: Math.max(30, z * 9), lane: clamp(lat / 300, -2.6, 2.6) });
    };
    for (const t of this.traffic) place(t.x, t.y, { kind: 'car', model: t.model, brake: t.speed < 40 });
    for (const u of this.police) place(u.x, u.y, { kind: 'police', model: u.model, flashPhase: u.flashPhase, brake: true });
    for (const p of this.city.parked) place(p.x, p.y, { kind: 'car', model: p.model });
    for (const p of this.city.palms) place(p.x, p.y, { kind: 'palm', green: p.green, s: p.s });
    for (const p of this.peds) place(p.x, p.y, { kind: 'ped', shirt: p.colors.shirt, pants: p.colors.pants, skin: p.colors.skin });
    if (this.race) {
      const target = this.race.route[this.race.cp];
      if (target) place(target.x, target.y, { kind: 'ring' });
      for (const rv of this.race.rivals) place(rv.x, rv.y, { kind: 'car', model: rv.model, brake: false });
    }
    // hero car, big and low in frame
    actors.push({ kind: 'car', z: 30, lane: 0.06, model: c.model, spoiler: true, nitro: Math.abs(c.speed) > 200 && c.nitro > 0, brake: this.keys.KeyS, widthF: 0.28 });
    drawRoadScene(ctx, w, h, this.palette, {
      actors,
      camX: 0,
      camZ: this.time * 60 % 400,
      curveAt: (z) => Math.sin(z * 0.00016 + this.seed) * 0.6,
      time: this.time,
      seedShift: 11,
    });
    // FALCON + spotlight over the hero
    if (this.falcon.active) {
      drawSpotlightCone(ctx, w * 0.56, h * 0.16, w * 0.52, h * 0.86, 300);
      drawHelicopter(ctx, w * 0.56, h * 0.15, 120, { tilt: -0.06 });
    }
  }

  renderMenu(ctx, w, h) {
    const m = this.menu;
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    ctx.fillRect(0, 0, w, h);
    const x = w / 2 - 250;
    const y = h / 2 - 150;
    drawMenuPanel(ctx, x, y, 500, 300, m, this);
  }
}

function drawMenuPanel(ctx, x, y, w, h, m, game) {
  ctx.fillStyle = 'rgba(10,12,22,0.94)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,63,0.5)';
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.font = '800 19px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(m.shop.name.toUpperCase(), x + 22, y + 36);
  ctx.fillStyle = 'rgba(244,239,228,0.7)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(m.shop.blurb + ' · press number to buy · B to leave', x + 22, y + 56);
  ctx.font = '700 13.5px system-ui, sans-serif';
  let ly = y + 92;
  const line = (txt, color) => {
    ctx.fillStyle = color || '#f4efe4';
    ctx.fillText(txt, x + 22, ly);
    ly += 30;
  };
  if (m.kind === 'weapons') {
    WEAPONS.filter((wp) => wp.id !== 'fists').forEach((wp, i) => {
      const owned = game.ownedWeapons.has(wp.id);
      line(`[${i + 1}] ${wp.name} — ${owned ? 'owned · restock $250' : '$1,500'}`, owned ? '#06d6a0' : '#f4efe4');
    });
    line('Armour refill — walk-ins only, ask at the counter', 'rgba(244,239,228,0.6)');
  } else if (m.kind === 'garage') {
    GARAGE_UPGRADES.forEach((up, i) => {
      line(`[${i + 1}] ${up.name} — ${game.upgrades.has(up.id) ? 'FITTED' : formatCash(up.price)} · ${up.blurb}`, game.upgrades.has(up.id) ? '#06d6a0' : '#f4efe4');
    });
    line('[4] Roll out the Regent GT (garage car)', '#ffd23f');
    line(`Stored: ${game.garageCars.map((c) => c.name).join(', ') || 'nothing'} · Owned: ${game.ownedCars.map((c) => c.name).join(', ')}`, 'rgba(244,239,228,0.6)');
  } else {
    ['Sunset orange tee — $300', 'Marina blue shirt — $300', 'Fixer pink blouse — $300', 'Crew green hoodie — $300'].forEach((t, i) => line(`[${i + 1}] ${t}`));
  }
  ctx.fillStyle = '#06d6a0';
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.fillText(formatCash(game.cash), x + w - 130, y + 36);
}

export function buildRaceRoute(race) {
  const pts = [{ x: race.startX, y: race.startY }];
  const rng = new Rng(race.id.length * 977 + race.checkpoints);
  let x = race.startX;
  let y = race.startY;
  for (let i = 0; i < race.checkpoints; i++) {
    x = clamp(x + rng.range(-900, 900), 200, WORLD.seaX - 260);
    y = clamp(y + rng.range(-700, 700), 200, WORLD.height - 200);
    pts.push({ x, y });
  }
  return pts;
}

function pointNearLine(px, py, x0, y0, x1, y1, tol) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (!len2) return false;
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x0 + t * dx;
  const cy = y0 + t * dy;
  return dist2(px, py, cx, cy) < tol * tol;
}
