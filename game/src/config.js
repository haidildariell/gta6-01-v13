// ISLA BRASA — static game data: the city, the crew, the arsenal, the work.
// Everything the HUD and the dossier quote (counts, names, prices) lives here
// so the numbers on screen are the numbers the systems actually use.

export const CITY = {
  name: 'Los Brasa',
  island: 'Isla Brasa',
  districts: [
    { id: 'palmas', name: 'Las Palmas', tag: 'Boardwalk & night market', color: '#ff9e45' },
    { id: 'oldtown', name: 'Old Town', tag: 'Colonial grid, cathedral square', color: '#e4572e' },
    { id: 'marina', name: 'Marina', tag: 'Docks, boatyard, fish market', color: '#2ec4b6' },
    { id: 'alto', name: 'Alto Verde', tag: 'Hill villas above the bay', color: '#7bc950' },
  ],
};

export const HERO = { name: 'Dario Vale', car: 'Regent GT', plate: 'BRASA-1' };

export const CREW = [
  { id: 'lio', name: 'Lio Park', role: 'Wheelman', ability: 'Swap Plates', key: 'Q', cooldown: 45, color: '#ffb703',
    line: 'Plates are clean. BBPD is chasing a ghost now.' },
  { id: 'tomas', name: 'Tomas Rey', role: 'Wrench', ability: 'Quick Fix', key: 'E', cooldown: 40, color: '#2ec4b6',
    line: 'She will hold together. Mostly. Drive.' },
  { id: 'vera', name: 'Vera Quintana', role: 'Fixer', ability: 'Eyes Out', key: 'R', cooldown: 35, color: '#ef476f',
    line: 'Regent Run is live, Dario. Nine units out — bring her home loud.' },
];

export const WEAPONS = [
  { id: 'fists', name: 'Fists', ammo: '—', mag: Infinity, damage: 8, rate: 0.32 },
  { id: 'bat', name: 'Harbor Bat', ammo: 0, mag: Infinity, damage: 16, rate: 0.42 },
  { id: 'p9', name: 'P9 Pistol', ammo: 84, mag: 12, damage: 22, rate: 0.26 },
  { id: 'mako', name: 'Mako SMG', ammo: 210, mag: 30, damage: 15, rate: 0.09 },
  { id: 'breaker', name: '12G Breaker', ammo: 36, mag: 6, damage: 46, rate: 0.8 },
  { id: 'carbine', name: 'AR Carbine', ammo: 160, mag: 30, damage: 26, rate: 0.13 },
];

export const RANKS = [
  { n: 1, name: 'Nobody', rp: 0, unlock: 'Fists and a borrowed Regent' },
  { n: 2, name: 'Runner', rp: 200, unlock: 'Harbor Bat at the Marina shop' },
  { n: 3, name: 'Wheelman', rp: 450, unlock: 'Nitro at Brasa Auto Works' },
  { n: 4, name: 'Earner', rp: 800, unlock: 'Mako SMG at the Marina shop' },
  { n: 5, name: 'Big Fish', rp: 1250, unlock: 'Harbourmaster — Marina garage & the skiff' },
  { n: 6, name: 'Shot Caller', rp: 1900, unlock: '12G Breaker at the Marina shop' },
  { n: 7, name: 'Kingpin', rp: 2800, unlock: 'AR Carbine at the Marina shop' },
  { n: 8, name: 'Legend of Brasa', rp: 4000, unlock: 'Alto Verde safehouse' },
];

export const JOBS = [
  { id: 1, name: 'First Ash', giver: 'Vera Quintana', pay: 900, rp: 120, stages: ['Meet Vera at the boardwalk', 'Lose the tail on Palms Row', 'Drop the package at the Marina gate'] },
  { id: 2, name: 'Cold Dock', giver: 'Vera Quintana', pay: 1400, rp: 160, stages: ['Lift the sealed crate at Dock 4', 'Cross the Old Town checkpoint', 'Park it in the fish-market yard'] },
  { id: 3, name: 'Market Static', giver: 'Lio Park', pay: 1800, rp: 200, stages: ['Cover the crew in the night market', 'Hold the stall line', 'Walk out the south arcade'] },
  { id: 4, name: 'Two Ferries', giver: 'Tomas Rey', pay: 2200, rp: 240, stages: ['Race the ferry crew to the ramp', 'Swap cars at the boatyard', 'Beat the tide back to Las Palmas'] },
  { id: 5, name: 'Cathedral Run', giver: 'Vera Quintana', pay: 3000, rp: 300, stages: ['Take the relic from the square', 'Thread the colonial grid', 'Vanish into the Alto Verde switchbacks'] },
  { id: 6, name: 'Regent Run', giver: 'Vera Quintana', pay: 4200, rp: 380, stages: ['Boost the Regent GT from the showroom', 'Outrun the first wave on Palms Row', 'Lose the FALCON in the Old Town tunnels'] },
  { id: 7, name: 'Spike Season', giver: 'Lio Park', pay: 5000, rp: 440, stages: ['Bait dispatch down the boulevard', 'Dodge the spike line at the marina fork', 'Bank the footage at the safehouse'] },
  { id: 8, name: 'Glass Harbour', giver: 'Vera Quintana', pay: 6500, rp: 520, stages: ['Cross the bay in the skiff', 'Hit the glass tower service dock', 'Bring the ledger home by road'] },
  { id: 9, name: 'Villa Weather', giver: 'Tomas Rey', pay: 8000, rp: 620, stages: ['Climb to the Alto Verde villas', 'Take the storm car from the garage', 'Descend through the roadblock'] },
  { id: 10, name: 'Isla Brasa', giver: 'Vera Quintana', pay: 12000, rp: 800, stages: ['Assemble the whole crew', 'Run every district in one heat', 'Park on the boardwalk. Own the island.'] },
];

export const RACES = [
  { id: 'blitz', name: 'Boardwalk Blitz', laps: 'Las Palmas sprint', checkpoints: 8, rivals: 3, prize: 2500 },
  { id: 'grid', name: 'Old Town Grid', laps: 'Colonial circuit', checkpoints: 10, rivals: 3, prize: 4000 },
  { id: 'climb', name: 'Alto Climb', laps: 'Hill climb', checkpoints: 9, rivals: 3, prize: 6000 },
];

export const RADIO = [
  { id: 'onda', name: 'ONDA 98.1', tracks: ['Neon Meridian — Palms at Dusk', 'Costa Fuego — Heat Index', 'Velvet Static — Boardwalk Hearts'] },
  { id: 'brasa', name: 'RADIO BRASA', tracks: ['Los Gatos Gordos — Nueve Vidas', 'DJ Ceniza — Ashes on Vinyl', 'Marina Azul — Salt & Static'] },
  { id: 'nocturna', name: 'NOCTURNA FM', tracks: ['Vera Lune — Sirens in Reverb', 'The Night Ferries — Low Water', 'Ceniza Club — 3AM Tapes'] },
];

export const GARAGE_CARS = [
  { name: 'Regent GT', note: 'Hero car — tuned V8', condition: 92, owned: true },
  { name: 'Palma Coupe', note: 'Boardwalk cruiser', condition: 78, owned: true },
  { name: 'Dockmaster Pickup', note: 'Marina workhorse', condition: 64, owned: true },
  { name: 'Alto Spider', note: 'Locked — Respect 8', condition: 100, owned: false },
];

export const UPGRADES = [
  { name: 'Engine Stage 2', price: 3500, owned: true },
  { name: 'Nitro Kit', price: 2200, owned: true },
  { name: 'Body Armour Panels', price: 4800, owned: false },
  { name: 'Run-Flat Tyres', price: 2600, owned: false },
];

export const SHOPS = [
  { name: 'Marina Arms', district: 'Marina', sells: 'P9, Mako, 12G, Carbine + ammo' },
  { name: 'Brasa Auto Works', district: 'Las Palmas', sells: 'Repairs, nitro, armour panels' },
  { name: 'Hilo & Co. Tailors', district: 'Old Town', sells: 'Crew outfits, heat-shedding threads' },
];

export const UNIT_ROLES = ['PURSUIT', 'RAMMING', 'FLANKING', 'ROADBLOCK', 'SPIKES', 'SPOTLIGHT', 'INTERCEPT', 'BACKUP', 'TAIL'];
