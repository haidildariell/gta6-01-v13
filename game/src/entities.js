// entities.js — the living city: traffic that drives the grid, pedestrians
// who use the sidewalks, the BBPD order of battle (pursuit, ramming and
// flanking units, roadblocks, spike strips) and the FALCON air unit whose
// spotlight hunts the player. All steering is simple, stable and seeded.

import { Rng, clamp, dist2 } from './rng.js';
import { WORLD, CAR_MODELS } from './config.js';
import { isRoad, isSea, BLOCK, ROAD_W } from './world.js';
import { pedColors } from './render2d.js';

const TRAFFIC_MODELS = CAR_MODELS.filter((m) => !m.id.startsWith('police'));

export class TrafficCar {
  constructor(rng, city) {
    const p = randomRoadPoint(rng);
    this.x = p.x;
    this.y = p.y;
    this.dir = rng.pick([0, 1, 2, 3]); // 0 E, 1 S, 2 W, 3 N
    this.angle = (this.dir * Math.PI) / 2;
    this.model = rng.pick(TRAFFIC_MODELS);
    this.color = rng.chance(0.55) ? this.model.color : rng.pick(['#ced4da', '#e8e4da', '#90be6d', '#f4a261', '#a8dadc', '#577590']);
    this.speed = 0;
    this.cruise = rng.range(120, 210);
    this.laneOff = 24;
  }
  update(dt, city, others) {
    const target = this.cruise;
    // slow for a car ahead
    let blocked = false;
    const fx = this.x + Math.cos(this.angle) * 70;
    const fy = this.y + Math.sin(this.angle) * 70;
    for (const o of others) {
      if (o === this) continue;
      if (dist2(fx, fy, o.x, o.y) < 55 * 55) { blocked = true; break; }
    }
    this.speed += ((blocked ? 0 : target) - this.speed) * Math.min(1, dt * 2.2);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    // at an intersection, maybe turn; always stay on the grid
    const mx = ((this.x % BLOCK) + BLOCK) % BLOCK;
    const my = ((this.y % BLOCK) + BLOCK) % BLOCK;
    if (mx < ROAD_W && my < ROAD_W && !this.turnCooldown) {
      if (Math.random() < 0.35) {
        this.dir = (this.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
        this.angle = (this.dir * Math.PI) / 2;
      }
      this.turnCooldown = 1.2;
    }
    if (this.turnCooldown) this.turnCooldown -= dt;
    // lane discipline: hug the right side of the current road
    if (this.dir === 0 || this.dir === 2) {
      const roadY = Math.floor(this.y / BLOCK) * BLOCK + ROAD_W / 2;
      const want = roadY + (this.dir === 0 ? this.laneOff : -this.laneOff);
      this.y += clamp(want - this.y, -60 * dt, 60 * dt);
    } else {
      const roadX = Math.floor(this.x / BLOCK) * BLOCK + ROAD_W / 2;
      const want = roadX + (this.dir === 1 ? -this.laneOff : this.laneOff);
      this.x += clamp(want - this.x, -60 * dt, 60 * dt);
    }
    if (this.x < 40 || this.x > WORLD.seaX - 60 || this.y < 40 || this.y > WORLD.height - 40) {
      const p = randomRoadPoint(new Rng((this.x * 7 + this.y) | 0));
      this.x = p.x;
      this.y = p.y;
    }
  }
}

export function randomRoadPoint(rng) {
  for (let tries = 0; tries < 40; tries++) {
    const x = rng.range(80, WORLD.seaX - 120);
    const y = rng.range(80, WORLD.height - 80);
    if (isRoad(x, y)) return { x, y };
  }
  return { x: 400, y: 400 };
}

export class Pedestrian {
  constructor(rng, near) {
    const p = near ? { x: near.x + rng.range(-420, 420), y: near.y + rng.range(-420, 420) } : randomRoadPoint(rng);
    this.x = clamp(p.x, 30, WORLD.width - 30);
    this.y = clamp(p.y, 30, WORLD.height - 30);
    this.angle = rng.range(0, Math.PI * 2);
    this.speed = rng.range(34, 62);
    this.colors = pedColors(rng);
    this.walkPhase = rng.range(0, 6);
    this.state = 'walk';
    this.panic = 0;
    this.down = false;
  }
  update(dt, city) {
    if (this.down) return;
    this.walkPhase += dt * (this.speed / 9);
    let sp = this.speed;
    if (this.panic > 0) {
      this.panic -= dt;
      sp = 150;
    }
    const nx = this.x + Math.cos(this.angle) * sp * dt;
    const ny = this.y + Math.sin(this.angle) * sp * dt;
    if (city.collide(nx, ny, 10) || isSea(nx, ny)) {
      this.angle += Math.PI * (0.6 + Math.random() * 0.5);
    } else {
      this.x = nx;
      this.y = ny;
    }
    if (Math.random() < dt * 0.14) this.angle += (Math.random() - 0.5) * 1.4;
  }
  fleeFrom(x, y) {
    this.angle = Math.atan2(this.y - y, this.x - x);
    this.panic = 2.4;
  }
}

export class PoliceUnit {
  constructor(rng, player, role, i) {
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const d = rng.range(520, 780);
    this.x = clamp(player.x + Math.cos(a) * d, 60, WORLD.width - 60);
    this.y = clamp(player.y + Math.sin(a) * d, 60, WORLD.height - 60);
    if (!isRoad(this.x, this.y)) {
      const p = randomRoadPoint(rng);
      this.x = p.x;
      this.y = p.y;
    }
    this.angle = 0;
    this.speed = 0;
    this.role = role;
    this.unit = `Unit ${i + 1}`;
    this.model = CAR_MODELS.find((m) => m.id === (i % 3 === 2 ? 'police2' : 'police'));
    this.flashPhase = i % 2 === 0;
    this.stuck = 0;
  }
  update(dt, player, city) {
    let tx = player.x;
    let ty = player.y;
    if (this.role === 'FLANKING') {
      tx += Math.cos(player.angle + Math.PI / 2) * 130;
      ty += Math.sin(player.angle + Math.PI / 2) * 130;
    } else if (this.role === 'RAMMING') {
      tx = player.x - Math.cos(player.angle) * 30;
      ty = player.y - Math.sin(player.angle) * 30;
    } else if (this.role === 'ROADBLOCK') {
      tx = player.x + Math.cos(player.angle) * 420;
      ty = player.y + Math.sin(player.angle) * 420;
    }
    const want = Math.atan2(ty - this.y, tx - this.x);
    let da = want - this.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.angle += clamp(da, -2.4 * dt, 2.4 * dt);
    const d = Math.sqrt(dist2(this.x, this.y, player.x, player.y));
    const top = this.role === 'ROADBLOCK' ? 240 : 330;
    const wantSpeed = d > 90 ? top : this.role === 'RAMMING' ? 260 : 120;
    this.speed += (wantSpeed - this.speed) * Math.min(1, dt * 1.6);
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    if (!city.buildingAt(nx, ny)) {
      this.x = clamp(nx, 30, WORLD.width - 30);
      this.y = clamp(ny, 30, WORLD.height - 30);
    } else {
      this.angle += dt * 2.2;
    }
    this.flashPhase = Math.floor(performance.now() / 280 + this.x) % 2 === 0;
  }
}

export class Falcon {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.orbit = 0;
    this.active = false;
  }
  update(dt, player) {
    this.orbit += dt * 0.55;
    const tx = player.x + Math.cos(this.orbit) * 150;
    const ty = player.y + Math.sin(this.orbit) * 150 - 60;
    this.x += (tx - this.x) * Math.min(1, dt * 2.4);
    this.y += (ty - this.y) * Math.min(1, dt * 2.4);
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
  }
}

export class RivalCar {
  constructor(rng, model, route, offset) {
    this.route = route;
    this.wp = 1;
    this.x = route[0].x + offset.x;
    this.y = route[0].y + offset.y;
    this.angle = Math.atan2(route[1].y - this.y, route[1].x - this.x);
    this.speed = 0;
    this.model = model;
    this.skill = rng.range(0.86, 0.97);
    this.done = false;
  }
  update(dt) {
    if (this.done) return;
    const target = this.route[this.wp];
    if (!target) { this.done = true; return; }
    const want = Math.atan2(target.y - this.y, target.x - this.x);
    let da = want - this.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.angle += clamp(da, -2.6 * dt, 2.6 * dt);
    const top = 300 * this.skill;
    this.speed += (top - this.speed) * Math.min(1, dt * 1.4);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    if (dist2(this.x, this.y, target.x, target.y) < 130 * 130) this.wp++;
  }
}

export function dispatchFeed(units, player) {
  return units.slice(0, 9).map((u) => ({
    unit: u.unit,
    role: u.role,
    dist: Math.round(Math.sqrt(dist2(u.x, u.y, player.x, player.y)) / 3.2),
  }));
}
