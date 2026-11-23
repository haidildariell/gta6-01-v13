# ISLA BRASA — an open-world crime epic in Los Brasa

ISLA BRASA is a playable open-world crime game built for the make.fun "Make GTA 6" bounty: you are Dario Vale, back on the island city of Los Brasa with an orange Regent GT, a three-person crew, and a fixer named Vera Quintana feeding you work while the Brasa Bay Police Department — nine dispatch roles, roadblocks, spike strips and the FALCON-1 air unit — tries to end your run. Drive it, walk it, boat it: the city is one seamless coastal loop of four districts, and everything on the HUD is a real, working system.

Bounty: [Make GTA 6 on make.fun](https://make.fun/bounty/gta6-01)

[![Competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/haidildariell/gta6-01-v13/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/haidildariell/gta6-01-v13/reward.svg)](https://make.fun/bounty/gta6-01)

## What is in the game

- Los Brasa, one island city in four districts: Las Palmas (golden-hour coastal boulevard), Old Town (tight corners and market streets), the Marina (boardwalk and the boat dock), Alto Verde (the mountain climb) — one seamless drivable loop with traffic, parked cars, stalls and pedestrians.
- 10 story jobs with 3 stages each, dealt by fixer Vera Quintana, with on-screen stage tracking, timers on the hard stages, cash payouts and Respect on completion.
- BBPD dispatch with 9 unit roles — pursuit, ramming, flanking, roadblock, spike strips, spotlight, intercept, backup and tail — shown on a live dispatch feed with per-unit roles and distances.
- FALCON-1, a marked BBPD helicopter air unit with a working searchlight at 3+ stars, inside a 5-star wanted system with line-of-sight heat loss: break contact, stay hidden, and the heat bleeds off.
- 6 weapons with individual ammo counts — fists, Harbor Bat, P9 pistol, Mako SMG, 12G Breaker, AR carbine — on keys 1–6 and a Tab weapon wheel.
- 3 crew members with cooldown abilities: Lio Park (Swap Plates, Q), Tomas Rey (Quick Fix, E), Vera Quintana (Eyes Out, R), with portrait cards and spoken dialog lines.
- A Respect ladder of 8 ranks, Street Name to Kingpin, with the next rank's unlock always on screen.
- A garage with 4 cars and an upgrade shelf (engine, tyres, armour, nitro), 3 shops (Marina Arms, Brasa Auto Works, Hilo & Co. Tailors), and 3 street races with checkpoints, rivals and live position.
- A drivable boat at the Marina dock, 3 radio stations with named tracks, and a 3-slot save system on a full-screen map-and-stats pause screen.

## Controls

WASD / arrows drive · Shift nitro · F step out / get in (B boards the boat at the Marina) · Q / E / R crew abilities · 1–6 weapons, Tab wheel · M radio · Esc map, stats, garage, shops and saves.

## Layout

- `main.ts` — the hand-in entrypoint: validates shots and caps, ships `game/` + `screenshots/`, writes `dossier.json`.
- `game/` — the game itself (canvas, no build step): `index.html` plus `src/` modules for the city, the road renderer, on-foot scenes, the HUD, the simulation, the staged screenshot scenes and the boot code.
- `screenshots/` — four scenes rendered by the game itself via its `?shot=` modes: the boulevard chase at golden hour, the night-market shootout on foot, a sunset street race, and the pause map.
