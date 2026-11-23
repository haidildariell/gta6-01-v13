// config.js — every named thing in ISLA BRASA lives here: the city of
// Los Brasa, its four districts, the crew, the BBPD order of battle, the
// weapon locker, the respect ladder, the radio dial and the ten story jobs.
// Pure data; the systems that use it live in their own files.

export const GAME_TITLE = 'ISLA BRASA';
export const CITY_NAME = 'Los Brasa';
export const PLAYER_NAME = 'Dario Venn';
export const POLICE_NAME = 'BBPD';
export const AIR_UNIT_NAME = 'FALCON';

export const WORLD = {
  width: 4200,
  height: 3000,
  seaX: 3360, // east of this line is open water
  tile: 60,
};

export const DISTRICTS = [
  { id: 'palmas', name: 'Las Palmas', x: 2260, y: 1050, w: 1100, h: 1950, tint: '#f7b733', blurb: 'Boardwalk, night market, neon' },
  { id: 'oldtown', name: 'Old Town', x: 700, y: 1150, w: 1560, h: 1850, tint: '#e2603f', blurb: 'Colonial blocks, the plaza, tight alleys' },
  { id: 'marina', name: 'Marina', x: 2260, y: 0, w: 1100, h: 1050, tint: '#3fa7d6', blurb: 'Docks, the boathouse, Vera\u2019s garage' },
  { id: 'alto', name: 'Alto Verde', x: 0, y: 0, w: 2260, h: 1150, tint: '#7fb069', blurb: 'Hills, villas, the hilltop race start' },
];

export const WEAPONS = [
  { id: 'fists', name: 'Fists', slot: 1, damage: 8, rate: 0.42, range: 46, ammo: Infinity, spread: 0, speed: 0, color: '#d9d9d9' },
  { id: 'bat', name: 'Harbor Bat', slot: 2, damage: 16, rate: 0.5, range: 58, ammo: Infinity, spread: 0, speed: 0, color: '#c98f4e' },
  { id: 'p9', name: 'P9 Pistol', slot: 3, damage: 14, rate: 0.28, range: 460, ammo: 96, spread: 0.02, speed: 900, color: '#ffd23f' },
  { id: 'mako', name: 'Mako SMG', slot: 4, damage: 11, rate: 0.09, range: 420, ammo: 240, spread: 0.06, speed: 950, color: '#ff9f1c' },
  { id: 'breaker', name: '12G Breaker', slot: 5, damage: 34, rate: 0.85, range: 240, ammo: 32, spread: 0.16, speed: 800, color: '#ef476f' },
  { id: 'carbine', name: 'AR Carbine', slot: 6, damage: 19, rate: 0.13, range: 620, ammo: 180, spread: 0.03, speed: 1150, color: '#06d6a0' },
];

export const CREW = [
  { id: 'lio', name: 'Lio Park', role: 'Wheelman', ability: 'Swap Plates', key: 'Q', cooldown: 45, color: '#ffd23f', blurb: 'New plates, cold trail: drops one wanted star and breaks line of sight.' },
  { id: 'tomas', name: 'Tomas Rey', role: 'Wrench', ability: 'Quick Fix', key: 'E', cooldown: 40, color: '#06d6a0', blurb: 'Roadside miracles: restores 45% vehicle condition on the move.' },
  { id: 'vera', name: 'Vera Quintana', role: 'Fixer', ability: 'Eyes Out', key: 'R', cooldown: 35, color: '#ef476f', blurb: 'She sees the net: reveals every BBPD unit and roadblock on the minimap.' },
];

export const RESPECT_RANKS = [
  { rank: 1, name: 'Nobody', need: 0, unlock: 'Fists and a borrowed coupe' },
  { rank: 2, name: 'Runner', need: 120, unlock: 'Harbor Bat at Brasa Arms' },
  { rank: 3, name: 'Wheelman', need: 300, unlock: 'Nitro at Vera\u2019s Garage' },
  { rank: 4, name: 'Shooter', need: 560, unlock: 'Mako SMG at Brasa Arms' },
  { rank: 5, name: 'Big Fish', need: 900, unlock: 'Regent GT in the garage' },
  { rank: 6, name: 'Shot Caller', need: 1350, unlock: 'AR Carbine at Brasa Arms' },
  { rank: 7, name: 'Kingpin', need: 1950, unlock: 'Armoured Regent GT' },
  { rank: 8, name: 'Legend of Brasa', need: 2700, unlock: 'The FALCON flies for you now (it doesn\u2019t)' },
];

export const RADIO_STATIONS = [
  { id: 'sol', name: 'Radio Sol 98.1', tracks: ['Costa del Crimen — Marisol Vega', 'Neon Palms — The Brasa Club', 'Marea Alta — DJ Faro'] },
  { id: 'onda', name: 'Onda Verde 103.7', tracks: ['Verde Que Te Quiero — Los Altos', 'Sirena — Paloma Rey', 'Barrio Fino — El Faro Boys'] },
  { id: 'night', name: 'Night Ferry FM', tracks: ['Midnight Marina — K. Ostrander', 'Glasshouse — Vera Lume', 'Low Tide — The Night Ferries'] },
];

export const CAR_MODELS = [
  { id: 'regent', name: 'Regent GT', color: '#ff7b00', topSpeed: 342, accel: 62, grip: 0.92, price: 48000, hero: true },
  { id: 'coupe', name: 'Alba Coupe', color: '#e63946', topSpeed: 268, accel: 48, grip: 0.88, price: 14500 },
  { id: 'sedan', name: 'Meridian Sedan', color: '#457b9d', topSpeed: 232, accel: 40, grip: 0.84, price: 8200 },
  { id: 'taxi', name: 'Brasa Cab', color: '#ffd23f', topSpeed: 224, accel: 38, grip: 0.82, price: 0 },
  { id: 'van', name: 'Cargo Mule Van', color: '#8d99ae', topSpeed: 198, accel: 33, grip: 0.78, price: 6100 },
  { id: 'pickup', name: 'Duna Pickup', color: '#2a9d8f', topSpeed: 214, accel: 36, grip: 0.8, price: 7400 },
  { id: 'police', name: 'BBPD Interceptor', color: '#24507e', topSpeed: 306, accel: 56, grip: 0.9, price: 0 },
  { id: 'police2', name: 'BBPD Pursuit SUV', color: '#2a6db0', topSpeed: 288, accel: 52, grip: 0.88, price: 0 },
];

export const DISPATCH_ROLES = ['PURSUIT', 'RAMMING', 'FLANKING', 'ROADBLOCK', 'SPIKE STRIP', 'SPOTLIGHT', 'INTERCEPT', 'BACKUP', 'TAIL'];

export const SHOPS = [
  { id: 'arms', name: 'Brasa Arms', kind: 'weapons', x: 1180, y: 1620, blurb: 'Weapons and armour, no questions' },
  { id: 'threads', name: 'Hilo Fino Threads', kind: 'clothes', x: 2620, y: 1480, blurb: 'Look like money you haven\u2019t stolen yet' },
  { id: 'garage', name: 'Vera\u2019s Garage', kind: 'garage', x: 2760, y: 620, blurb: 'Storage, armour, engine, nitro' },
];

export const GARAGE_UPGRADES = [
  { id: 'armour', name: 'Plated Armour', price: 6000, blurb: '+40% vehicle condition' },
  { id: 'engine', name: 'Turbo Engine', price: 8500, blurb: '+12% top speed' },
  { id: 'nitro', name: 'Nitro Kit', price: 5000, blurb: 'SHIFT burns nitro for boost' },
];

export const RACES = [
  { id: 'boardwalk', name: 'Boardwalk Blitz', laps: 1, checkpoints: 8, rivals: 3, prize: 2500, startX: 3050, startY: 1900 },
  { id: 'hilltop', name: 'Alto Verde Climb', laps: 1, checkpoints: 10, rivals: 3, prize: 4000, startX: 420, startY: 420 },
  { id: 'regent', name: 'Regent Run', laps: 1, checkpoints: 12, rivals: 3, prize: 6500, startX: 1500, startY: 2500 },
];

export const STORY_JOBS = [
  { n: 1, title: 'FIRST LIGHT', giver: 'Vera Quintana', pay: 800, respect: 60, stages: ['Meet Vera at the marina', 'Drive her to Las Palmas', 'Lose the tail'], line: 'Simple drive, Dario. Nothing in the trunk. Do not open the trunk.' },
  { n: 2, title: 'COLD PLATES', giver: 'Lio Park', pay: 1200, respect: 90, stages: ['Steal a clean Alba Coupe', 'Reach Lio\u2019s lockup', 'Swap the plates'], line: 'A car is just a rumour with wheels. Make it a lie.' },
  { n: 3, title: 'MARKET DAY', giver: 'Vera Quintana', pay: 1600, respect: 110, stages: ['Collect the market dues', 'Shake off the stall crew', 'Deliver to Old Town'], line: 'Everyone pays on market day. Even the ones holding bats.' },
  { n: 4, title: 'NIGHT FERRY', giver: 'Tomas Rey', pay: 2200, respect: 140, stages: ['Take the boat at the marina', 'Meet the ferry mid-bay', 'Bring the crate home'], line: 'The bay is dark and the BBPD is darker. Keep the light off.' },
  { n: 5, title: 'HILLTOP LEDGER', giver: 'Vera Quintana', pay: 3000, respect: 180, stages: ['Climb to Alto Verde', 'Lift the ledger from the villa', 'Outrun the hill patrol'], line: 'Rich people write everything down. That is their mistake.' },
  { n: 6, title: 'REGENT RUN', giver: 'Vera Quintana', pay: 4200, respect: 240, stages: ['Collect the Regent GT', 'Cross the city — do not scratch it', 'Beat the FALCON to the garage'], line: 'That car is worth more than this conversation. Drive it like it.' },
  { n: 7, title: 'SPIKE SEASON', giver: 'Lio Park', pay: 5200, respect: 280, stages: ['Bait the Interceptors', 'Cross the spike line on the boulevard', 'Vanish in Old Town'], line: 'Spikes only stop cars that slow down. So: don\u2019t.' },
  { n: 8, title: 'THE LONG TABLE', giver: 'Vera Quintana', pay: 6800, respect: 340, stages: ['Crash the Alto Verde dinner', 'Take the strongbox', 'Fight out through the kitchen'], line: 'Twelve courses, one strongbox. Eat fast.' },
  { n: 9, title: 'HARBOUR LIGHTS', giver: 'Tomas Rey', pay: 8500, respect: 420, stages: ['Cut the harbour lights', 'Load the Mule in the dark', 'Run the marina blockade'], line: 'Dark dock, heavy van, one road out. Classic Tomas problem.' },
  { n: 10, title: 'ISLA BRASA', giver: 'Vera Quintana', pay: 14000, respect: 600, stages: ['Assemble the crew', 'Run the whole island end to end', 'Bank the take at the marina'], line: 'One last run, Dario. The whole island is watching.' },
];

export const DIALOG_LINES = {
  veraChase: 'FALCON has your light, Dario — break the boulevard, use the market cut-through!',
  lioPlates: 'Plates swapped. You are a rumour again.',
  tomasFix: 'She\u2019ll hold. Probably. Drive gentle-ish.',
  veraEyes: 'Net is lit up on your map. Every unit, every block. Move.',
  dispatchChatter: 'All units, orange Regent GT, Las Palmas boulevard, intercept and contain.',
};

export const PALETTES = {
  golden: {
    skyTop: '#2e1a5e', skyMid: '#b83a5e', skyLow: '#ff7b3d', skyGlow: '#ffb25e',
    sun: '#ffd98a', sea: '#274b73', seaGlow: '#e2603f', ground: '#5a4632',
    road: '#3a3f4a', roadEdge: '#ffb25e', lane: '#ffe8b0',
  },
  night: {
    skyTop: '#0b1035', skyMid: '#2c1e5c', skyLow: '#5e2a6e', skyGlow: '#b83a5e',
    sun: '#e8e4ff', sea: '#101d38', seaGlow: '#3fa7d6', ground: '#1c1a26',
    road: '#23232e', roadEdge: '#8f7ff5', lane: '#cfc8ff',
  },
  sunset: {
    skyTop: '#3b2a6e', skyMid: '#d6495b', skyLow: '#ff8c42', skyGlow: '#ffc25e',
    sun: '#ffe3a3', sea: '#2c4a73', seaGlow: '#ff8c42', ground: '#4a3628',
    road: '#373b45', roadEdge: '#ffc25e', lane: '#ffedb0',
  },
};
