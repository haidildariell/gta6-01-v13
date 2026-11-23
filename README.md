# ISLA BRASA — open-world crime in Los Brasa

[![ISLA BRASA on make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/haidildariell/gta6-01-v13/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/haidildariell/gta6-01-v13/reward.svg)](https://make.fun/bounty/gta6-01)

ISLA BRASA is an original open-world crime game built for the make.fun "Make GTA 6" bounty — [play the bounty page](https://make.fun/bounty/gta6-01) · https://make.fun/bounty/gta6-01

You are Dario Venn, a wheelman in Los Brasa, a sun-drenched island city of four named districts — Las Palmas boardwalk, Old Town, the Marina and Alto Verde — with a beach and open bay to the east. Run ten story jobs for fixer Vera Quintana with a three-person crew, outrun the BBPD dispatch net and its FALCON air unit, build Respect across eight ranks, and bank the take at the marina. Everything is playable in the browser from static files: no build step, no network, just open `game/index.html`.

## What's in the game

- ISLA BRASA — open-world crime in Los Brasa: 4 districts, beachfront boulevards, a living traffic + pedestrian city
- 10 story jobs with staged objectives and voiced-style dialog
- BBPD dispatch: pursuit, ramming and flanking units, roadblocks, spike strips — live unit feed with roles and distances
- FALCON air unit with tracking spotlight; 5-star wanted system with line-of-sight heat loss
- 6 weapons + weapon wheel; 3 crew abilities (Swap Plates, Quick Fix, Eyes Out)
- Respect progression across 8 ranks; garage with stored cars and paid upgrades; 3 shops
- 3 street races, a drivable boat, 3 radio stations, 3-slot saves, full-screen map + career stats pause screen

## Controls

WASD walk & drive · F enter/exit car (or the boat at the marina) · mouse aim, click to fire · SHIFT sprint / nitro · SPACE handbrake · TAB weapon wheel · 1–6 weapons · Q/E/R crew abilities · B shops & races · N radio · F5 quick-save · ESC pause map/stats

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`
- `game/` — the playable game (static files, ES modules under `game/src/`, one job per file)
- `screenshots/` — four scenes rendered by the game itself (`?shot=` staging, see `shots.json`)
- `serve.ts` — a tiny local server for play-testing (`node serve.ts`, then open http://localhost:8080)

## License

MIT — see `LICENSE`.
