// Los Brasa, generated: one long island boulevard loop of road segments that
// runs Las Palmas (coastal boardwalk) -> Old Town (colonial grid) -> Marina
// (docks) -> Alto Verde (hill climb) and back down to the sand. The renderer
// and the game logic share this segment list; the pause map uses the abstract
// layout at the bottom.

import { Rng } from './rng.js';

export const SEG_LEN = 200;
export const RUMBLE = 3;

const SIGNS = ['CAFE SOL', 'HOTEL BRASA', 'CENIZA CLUB', 'FARMACIA', 'TABACOS', 'MAR AZUL', 'TALLER REY', 'PIZZA VOLCAN', 'BANCO ISLA', 'CINE PALMAS', 'JOYERIA', 'BAR TIBURON'];
const PALETTES = [
  ['#f7e8c9', '#e8b04b'], ['#fdf3e3', '#c96f2e'], ['#f4d8a8', '#8a5a2b'], ['#ffe9d2', '#d94f30'],
  ['#e8f0f2', '#3a6ea5'], ['#f9e2ae', '#b83a32'], ['#f3e5cf', '#5b8c5a'], ['#fce8cd', '#7a4a8c'],
];

function addSprite(seg, type, offset, data) {
  seg.sprites.push({ type, offset, data });
}

function buildStretch(segments, rng, count, opts) {
  for (let i = 0; i < count; i += 1) {
    const n = segments.length;
    const t = i / Math.max(1, count - 1);
    const seg = {
      index: n,
      curve: opts.curve ? opts.curve(t, i) : 0,
      y: opts.y ? opts.y(t, i) : 0,
      zone: opts.zone,
      coastal: !!opts.coastal,
      sprites: [],
      alt: n % RUMBLE < RUMBLE / 2,
    };
    // Buildings crowd both sides in town; palms line the sand and the climb.
    if (opts.buildings) {
      if (rng.chance(0.92)) {
        const p = rng.pick(PALETTES);
        addSprite(seg, 'building', -2.6 - rng.range(0, 0.9), { w: rng.range(900, 1500), h: rng.range(1400, 3400), c1: p[0], c2: p[1], sign: rng.chance(0.55) ? rng.pick(SIGNS) : null, floors: rng.int(3, 7) });
      }
      if (rng.chance(0.92)) {
        const p = rng.pick(PALETTES);
        addSprite(seg, 'building', 2.6 + rng.range(0, 0.9), { w: rng.range(900, 1500), h: rng.range(1400, 3400), c1: p[0], c2: p[1], sign: rng.chance(0.5) ? rng.pick(SIGNS) : null, floors: rng.int(3, 7) });
      }
    }
    if (opts.palms) {
      if (rng.chance(0.8)) addSprite(seg, 'palm', -1.9 - rng.range(0, 0.4), { h: rng.range(1500, 2300), lean: rng.range(-0.14, 0.14) });
      if (rng.chance(0.8)) addSprite(seg, 'palm', 1.9 + rng.range(0, 0.4), { h: rng.range(1500, 2300), lean: rng.range(-0.14, 0.14) });
    }
    if (opts.lamps && n % 2 === 0) {
      addSprite(seg, 'lamp', -1.75, {});
      addSprite(seg, 'lamp', 1.75, {});
    }
    if (opts.parked && rng.chance(0.4)) {
      addSprite(seg, 'parked', rng.chance(0.5) ? -1.45 : 1.45, { color: rng.pick(CAR_COLORS), kind: 'car' });
    }
    if (opts.stalls && rng.chance(0.66)) {
      addSprite(seg, 'stall', rng.chance(0.5) ? -2.1 : 2.1, { color: rng.pick(['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5']) });
    }
    // Sidewalk pedestrians, denser where the city lives.
    const peds = opts.peds ? rng.int(opts.peds[0], opts.peds[1]) : 0;
    for (let p = 0; p < peds; p += 1) {
      addSprite(seg, 'ped', (rng.chance(0.5) ? -1 : 1) * rng.range(1.25, 1.7), {
        shirt: rng.pick(PED_COLORS), skin: rng.pick(SKIN_TONES), phase: rng.range(0, 6.28),
      });
    }
    segments.push(seg);
  }
}

export const CAR_COLORS = ['#d64541', '#3a86ff', '#ffd23f', '#8ac926', '#ff7b00', '#6a4c93', '#e8e8e8', '#1982c4', '#f15bb5', '#00b4d8'];
export const PED_COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#e0aaff', '#90be6d', '#f9f7f7'];
export const SKIN_TONES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

export function buildRoad(seed) {
  const rng = new Rng(seed * 7919 + 13);
  const segments = [];
  const ease = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  // Las Palmas: dead straight coastal boulevard, sea on the right, market stalls.
  buildStretch(segments, rng, 130, { zone: 'palmas', coastal: true, buildings: true, palms: true, lamps: true, parked: true, stalls: true, peds: [1, 3] });
  // Boardwalk sweeper into Old Town.
  buildStretch(segments, rng, 40, { zone: 'palmas', coastal: true, buildings: true, palms: true, lamps: true, parked: true, peds: [0, 2], curve: (t) => ease(0, 2.2, t) });
  buildStretch(segments, rng, 30, { zone: 'oldtown', buildings: true, lamps: true, parked: true, peds: [0, 2], curve: (t) => ease(2.2, 0, t) });
  // Old Town grid: two hard corners through the colonial blocks.
  buildStretch(segments, rng, 45, { zone: 'oldtown', buildings: true, lamps: true, parked: true, peds: [0, 2], curve: (t) => Math.sin(t * Math.PI) * -3.4 });
  buildStretch(segments, rng, 45, { zone: 'oldtown', buildings: true, lamps: true, parked: true, peds: [0, 1], curve: (t) => Math.sin(t * Math.PI) * 3.0 });
  // Marina flats: cranes and warehouses, sea back on the right.
  buildStretch(segments, rng, 90, { zone: 'marina', coastal: true, buildings: true, palms: false, lamps: true, parked: true, peds: [0, 1], curve: (t) => Math.sin(t * Math.PI * 2) * 0.7 });
  // Alto Verde climb: elevation, hairpins, palms and villas.
  buildStretch(segments, rng, 60, { zone: 'alto', buildings: false, palms: true, lamps: true, parked: false, peds: [0, 1], y: (t, i) => i * 55, curve: (t) => Math.sin(t * Math.PI) * -4.2 });
  buildStretch(segments, rng, 60, { zone: 'alto', buildings: true, palms: true, lamps: true, parked: true, peds: [0, 1], y: (t, i) => 3300 - i * 55, curve: (t) => Math.sin(t * Math.PI) * 4.2 });
  // Descent home to the sand.
  buildStretch(segments, rng, 50, { zone: 'palmas', coastal: true, buildings: true, palms: true, lamps: true, parked: true, stalls: true, peds: [1, 2], curve: (t) => Math.sin(t * Math.PI * 2) * 0.5 });
  for (let i = 0; i < segments.length; i += 1) segments[i].index = i;
  return { segments, length: segments.length, totalLength: segments.length * SEG_LEN };
}

export function districtAt(road, z) {
  const seg = road.segments[Math.floor(z / SEG_LEN) % road.length];
  return seg ? seg.zone : 'palmas';
}

// Abstract island layout for the minimap and the full-screen pause map.
// Coordinates are 0..100 on both axes; the sea is the east (right) edge.
export const MAP_LAYOUT = {
  water: { x: 84, y: 0, w: 16, h: 100, name: 'BAHIA BRASA' },
  districts: [
    { id: 'palmas', name: 'LAS PALMAS', x: 52, y: 58, w: 32, h: 34 },
    { id: 'oldtown', name: 'OLD TOWN', x: 16, y: 52, w: 34, h: 40 },
    { id: 'marina', name: 'MARINA', x: 50, y: 14, w: 34, h: 40 },
    { id: 'alto', name: 'ALTO VERDE', x: 8, y: 8, w: 38, h: 40 },
  ],
  roadLoop: [
    [58, 88], [70, 80], [76, 68], [74, 58], [60, 54], [46, 56], [34, 60], [26, 68], [24, 78],
    [30, 86], [44, 90], [58, 88],
  ],
  roadNorth: [
    [60, 54], [62, 44], [66, 34], [70, 24], [66, 16], [54, 12], [40, 14], [28, 20], [20, 30],
    [22, 42], [34, 52], [46, 56],
  ],
  pois: [
    { id: 'garage', name: 'Brasa Auto Works', x: 64, y: 74, icon: 'G' },
    { id: 'arms', name: 'Marina Arms', x: 68, y: 30, icon: 'A' },
    { id: 'tailor', name: 'Hilo & Co.', x: 32, y: 66, icon: 'T' },
    { id: 'boat', name: 'Skiff — Marina dock', x: 82, y: 22, icon: 'B' },
    { id: 'race1', name: 'Boardwalk Blitz start', x: 58, y: 86, icon: 'R' },
    { id: 'safehouse', name: 'Safehouse', x: 26, y: 24, icon: 'S' },
  ],
};
