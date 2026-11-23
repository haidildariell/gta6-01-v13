// ISLA BRASA — hand-in entrypoint for the make.fun "Make GTA 6" bounty.
//
// What this program does, in order:
//   1. Reads shots.json and proves the screenshot set is legal (names in
//      shots.json match the files on disk, at most four shots, none over
//      the per-file byte cap).
//   2. Walks game/ and proves the tree fits the published size caps
//      (file count, total bytes, per-path byte length).
//   3. Copies game/ and screenshots/ into the output directory in sorted
//      order, so two runs over the same tree produce identical output.
//   4. Writes dossier.json with the kit's buildDossier() and prints a
//      short manifest of what was shipped.
//
// Node 22 standard library only; the one import beyond node: builtins is
// the kit harness in vendor/makefun-game.ts.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The caps the kit grades against (competition.yaml / starter layout).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

type ShotEntry = { name: string; query: string };

function fail(message: string): never {
  throw new Error(`isla-brasa hand-in: ${message}`);
}

// Every file under dir, as forward-slash relative paths, sorted so the
// copy order (and therefore the output tree) is deterministic.
function treeFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) found.push(relative(dir, full).split(sep).join("/"));
    }
  };
  walk(dir);
  return found.sort();
}

function treeBytes(dir: string, files: string[]): number {
  let total = 0;
  for (const rel of files) total += statSync(join(dir, rel)).size;
  return total;
}

// --- step 1: the screenshot set -------------------------------------------

function checkShots(root: string): ShotEntry[] {
  const shotsPath = join(root, "shots.json");
  if (!existsSync(shotsPath)) fail("shots.json is missing");
  const shots = JSON.parse(readFileSync(shotsPath, "utf8")) as ShotEntry[];
  if (!Array.isArray(shots) || shots.length === 0) fail("shots.json lists no screenshots");
  if (shots.length > CAPS.screenshots.max) {
    fail(`shots.json lists ${shots.length} screenshots; the cap is ${CAPS.screenshots.max}`);
  }
  const shotDir = join(root, "screenshots");
  const onDisk = new Set(treeFiles(shotDir));
  for (const shot of shots) {
    if (!shot.name || !shot.query || !shot.query.startsWith("?shot=")) {
      fail(`shot entry is malformed: ${JSON.stringify(shot)}`);
    }
    if (!onDisk.has(shot.name)) fail(`shots.json names ${shot.name} but screenshots/ does not contain it`);
    const size = statSync(join(shotDir, shot.name)).size;
    if (size > CAPS.screenshots.max_bytes) {
      fail(`${shot.name} is ${size} bytes; the per-screenshot cap is ${CAPS.screenshots.max_bytes}`);
    }
    onDisk.delete(shot.name);
  }
  if (onDisk.size > 0) fail(`screenshots/ holds files shots.json never mentions: ${[...onDisk].join(", ")}`);
  return shots;
}

// --- step 2: the game tree -------------------------------------------------

function checkGameTree(root: string): { files: string[]; bytes: number } {
  const gameDir = join(root, "game");
  if (!existsSync(join(gameDir, "index.html"))) fail("game/index.html is missing");
  const files = treeFiles(gameDir);
  if (files.length > CAPS.game_max_files) {
    fail(`game/ holds ${files.length} files; the cap is ${CAPS.game_max_files}`);
  }
  for (const rel of files) {
    const pathBytes = Buffer.byteLength(rel, "utf8");
    if (pathBytes > CAPS.game_path_max_bytes) {
      fail(`game path ${rel} is ${pathBytes} bytes; the cap is ${CAPS.game_path_max_bytes}`);
    }
  }
  const bytes = treeBytes(gameDir, files);
  if (bytes > CAPS.game_max_bytes) {
    fail(`game/ totals ${bytes} bytes; the cap is ${CAPS.game_max_bytes}`);
  }
  return { files, bytes };
}

// --- step 3: the copy -------------------------------------------------------

function copyTree(fromDir: string, toDir: string, files: string[]): void {
  for (const rel of files) {
    const target = join(toDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(fromDir, rel), target);
  }
}

// --- the run ----------------------------------------------------------------

function main(): void {
  const shots = checkShots(HERE);
  const game = checkGameTree(HERE);
  const shotFiles = treeFiles(join(HERE, "screenshots"));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(join(HERE, "game"), join(OUTPUT_DIR, "game"), game.files);
  copyTree(join(HERE, "screenshots"), join(OUTPUT_DIR, "screenshots"), shotFiles);

  // buildDossier returns the dossier as canonical JSON bytes; the scorer
  // re-runs this same function on the shipped tree and demands equality,
  // so the bytes go to disk untouched.
  const dossierBytes = buildDossier(OUTPUT_DIR, CAPS);
  writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossierBytes);

  const lines = [
    `ISLA BRASA hand-in written to ${OUTPUT_DIR}`,
    `  game/        ${game.files.length} files, ${game.bytes} bytes`,
    `  screenshots/ ${shotFiles.length} files: ${shotFiles.map((f) => basename(f)).join(", ")}`,
    `  shots        ${shots.map((s) => s.query).join("  ")}`,
    `  dossier.json ${statSync(join(OUTPUT_DIR, "dossier.json")).size} bytes`,
  ];
  console.log(lines.join("\n"));
}

main();
