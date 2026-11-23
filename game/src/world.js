// world.js — builds the island city of Los Brasa from a seed: the road grid,
// four named districts, buildings with lit windows, palm rows, the Las Palmas
// night-market stalls, parked cars, the marina docks and the beach. One build,
// shared by the on-foot renderer, the minimap, collisions and the AI.

import { Rng, clamp } from './rng.js';
import { WORLD, DISTRICTS, CAR_MODELS } from './config.js';

export const ROAD_W = 92; // road width in world units
export const BLOCK = 300; // city block pitch

const PALM_GREENS = ['#2e7d4f', '#35945e', '#27703f'];
const ROOF_TONES = ['#8a5a3b', '#97503a', '#6e4a35', '#7d5a8a', '#4a6e8a', '#8a7a3b'];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[1];
}

export function isSea(x, y) {
  return x >= WORLD.seaX;
}

export function isRoad(x, y) {
  if (isSea(x, y)) return false;
  const mx = ((x % BLOCK) + BLOCK) % BLOCK;
  const my = ((y % BLOCK) + BLOCK) % BLOCK;
  return mx < ROAD_W || my < ROAD_W;
}

export function roadAxis(x, y) {
  const mx = ((x % BLOCK) + BLOCK) % BLOCK;
  const my = ((y % BLOCK) + BLOCK) % BLOCK;
  const onV = mx < ROAD_W;
  const onH = my < ROAD_W;
  if (onV && onH) return 'cross';
  if (onV) return 'v';
  if (onH) return 'h';
  return null;
}

export function snapToRoad(rng, x, y) {
  const bx = Math.round(x / BLOCK) * BLOCK + ROAD_W / 2;
  const by = Math.round(y / BLOCK) * BLOCK + ROAD_W / 2;
  return rng.chance(0.5) ? { x: bx, y } : { x, y: by };
}

export class City {
  constructor(seed) {
    const rng = new Rng(seed * 7919 + 13);
    this.seed = seed;
    this.buildings = [];
    this.palms = [];
    this.stalls = [];
    this.parked = [];
    this.props = [];
    this.docks = [];
    this.buildCity(rng);
  }

  buildCity(rng) {
    // Buildings fill each block's interior, one or two per block face.
    for (let bx = 0; bx < WORLD.width / BLOCK; bx++) {
      for (let by = 0; by < WORLD.height / BLOCK; by++) {
        const ox = bx * BLOCK + ROAD_W;
        const oy = by * BLOCK + ROAD_W;
        const inner = BLOCK - ROAD_W;
        if (ox > WORLD.seaX - 140) continue;
        const district = districtAt(ox + inner / 2, oy + inner / 2);
        const count = rng.chance(0.72) ? 1 : 2;
        for (let i = 0; i < count; i++) {
          const w = rng.range(inner * 0.42, inner * 0.86) / (count > 1 ? 1.9 : 1);
          const h = rng.range(inner * 0.42, inner * 0.86) / (count > 1 ? 1.9 : 1);
          const x = ox + rng.range(4, Math.max(6, inner - w - 4)) + (count > 1 ? i * (inner / 2) : 0);
          const y = oy + rng.range(4, Math.max(6, inner - h - 4));
          const floors = district.id === 'alto' ? rng.int(1, 3) : rng.int(2, 7);
          this.buildings.push({
            x, y, w, h, floors,
            wall: rng.pick(['#d9b48a', '#e8cfa3', '#e0b090', '#b8c4c9', '#e5d3b3', '#cbb59a']),
            roof: rng.pick(ROOF_TONES),
            district: district.id,
            sign: rng.chance(0.3) ? rng.pick(SHOP_SIGNS) : null,
            litRatio: rng.range(0.35, 0.8),
            seed: rng.int(1, 99999),
          });
        }
      }
    }
    // Palm rows along the boardwalk and scattered through the districts.
    for (let y = 140; y < WORLD.height; y += 118) {
      this.palms.push({ x: WORLD.seaX - 150 + rng.range(-16, 16), y: y + rng.range(-20, 20), s: rng.range(0.85, 1.25), green: rng.pick(PALM_GREENS) });
      this.palms.push({ x: WORLD.seaX - 320 + rng.range(-16, 16), y: y + 58 + rng.range(-20, 20), s: rng.range(0.8, 1.15), green: rng.pick(PALM_GREENS) });
    }
    for (let i = 0; i < 210; i++) {
      const x = rng.range(60, WORLD.seaX - 120);
      const y = rng.range(60, WORLD.height - 60);
      if (isRoad(x, y)) continue;
      this.palms.push({ x, y, s: rng.range(0.7, 1.2), green: rng.pick(PALM_GREENS) });
    }
    // Night-market stalls: two dense rows on the Las Palmas boardwalk.
    const stallGoods = ['#ef476f', '#ffd23f', '#06d6a0', '#3fa7d6', '#ff9f1c', '#c77dff'];
    for (let i = 0; i < 14; i++) {
      const y = 1220 + i * 118;
      this.stalls.push({ x: WORLD.seaX - 420, y, w: 74, h: 46, awning: stallGoods[i % stallGoods.length], goods: rng.shuffle(stallGoods).slice(0, 3), seed: rng.int(1, 9999) });
      this.stalls.push({ x: WORLD.seaX - 235, y: y + 54, w: 74, h: 46, awning: stallGoods[(i + 3) % stallGoods.length], goods: rng.shuffle(stallGoods).slice(0, 3), seed: rng.int(1, 9999) });
    }
    // Parked cars hug the kerbs.
    for (let i = 0; i < 130; i++) {
      const onV = rng.chance(0.5);
      const bx = rng.int(0, Math.floor(WORLD.seaX / BLOCK) - 1) * BLOCK;
      const by = rng.int(0, Math.floor(WORLD.height / BLOCK) - 1) * BLOCK;
      const model = rng.pick(CAR_MODELS.filter((m) => !m.id.startsWith('police')));
      const x = onV ? bx + ROAD_W / 2 + (rng.chance(0.5) ? -30 : 30) : bx + rng.range(30, BLOCK - 30);
      const y = onV ? by + rng.range(30, BLOCK - 30) : by + ROAD_W / 2 + (rng.chance(0.5) ? -30 : 30);
      this.parked.push({ x, y, angle: onV ? Math.PI / 2 : 0, model, color: rng.chance(0.6) ? model.color : rng.pick(['#ced4da', '#495057', '#a8dadc', '#f4a261', '#90be6d']) });
    }
    // Marina docks reaching into the bay.
    for (let i = 0; i < 5; i++) {
      this.docks.push({ x: WORLD.seaX + 30, y: 180 + i * 170, w: 300, h: 26 });
    }
    // Street props: lamps, crates, cafe tables near the market.
    for (let i = 0; i < 240; i++) {
      const x = rng.range(40, WORLD.seaX - 60);
      const y = rng.range(40, WORLD.height - 40);
      if (!isRoad(x, y)) continue;
      const mx = ((x % BLOCK) + BLOCK) % BLOCK;
      const my = ((y % BLOCK) + BLOCK) % BLOCK;
      if (mx > 14 && mx < ROAD_W - 14 && my > 14 && my < ROAD_W - 14) continue;
      this.props.push({ x, y, kind: rng.pick(['lamp', 'lamp', 'crate', 'planter']), seed: rng.int(1, 999) });
    }
  }

  buildingAt(x, y) {
    for (const b of this.buildings) {
      if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) return b;
    }
    return null;
  }

  collide(x, y, r) {
    if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
    if (isSea(x, y) && x > WORLD.seaX + 60) return true;
    const b = this.buildingAt(x, y);
    if (b && x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return true;
    return false;
  }
}

export const SHOP_SIGNS = ['CAFE SOL', 'BRASA ARMS', 'HILO FINO', 'HOTEL FARO', 'MARINA BAR', 'PANADERIA', 'CLUB ONDA', 'TALLER REY', 'FARMACIA', 'JOYERIA', 'BAR LA VELA', 'CINE BRASA'];

export function formatCash(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function clampWorld(p) {
  p.x = clamp(p.x, 20, WORLD.width - 20);
  p.y = clamp(p.y, 20, WORLD.height - 20);
}
