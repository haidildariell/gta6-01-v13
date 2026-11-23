// ISLA BRASA — hand-in program for the make.fun "Make GTA 6" bounty.
//
// What this program does, in order:
//   1. Finds the repository it lives in (the directory holding this file).
//   2. Clears the output directory (MAKEFUN_OUTPUT_DIR, or /output on the
//      grader) so a re-run can never leave stale files behind — the grader
//      runs this program twice and both runs must write the same bytes.
//   3. Copies game/ and screenshots/ across with a sorted, deterministic
//      walk, counting files and bytes as it goes and refusing early if the
//      entry would break the competition's size caps.
//   4. Writes dossier.json with the kit's own buildDossier, so the dossier
//      is byte for byte the one the sealed scorer rebuilds and compares.
//   5. Prints a short manifest of what was handed in.
//
// Node 22, standard library only. Authored for ISLA BRASA (Los Brasa).

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

interface CopiedTree {
  files: number;
  bytes: number;
  largest: { path: string; bytes: number };
}

function measureTree(root: string): CopiedTree {
  const result: CopiedTree = { files: 0, bytes: 0, largest: { path: '', bytes: 0 } };
  const walk = (dir: string, rel: string): void => {
    const names = readdirSync(dir).sort();
    for (const name of names) {
      const full = join(dir, name);
      const relPath = rel === '' ? name : `${rel}/${name}`;
      const info = statSync(full);
      if (info.isDirectory()) {
        walk(full, relPath);
      } else if (info.isFile()) {
        result.files += 1;
        result.bytes += info.size;
        if (info.size > result.largest.bytes) {
          result.largest = { path: relPath, bytes: info.size };
        }
      }
    }
  };
  walk(root, '');
  return result;
}

function fail(message: string): never {
  console.error(`islabrasa hand-in: ${message}`);
  process.exit(1);
}

function main(): void {
  const gameSrc = join(repoRoot, 'game');
  const shotsSrc = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameSrc, 'index.html'))) {
    fail('game/index.html is missing — there is no game to hand in');
  }
  if (!existsSync(shotsSrc)) {
    fail('screenshots/ is missing — the judge reads the game through its screens');
  }

  // Measure first, copy second: a cap breach should stop the hand-in before
  // a single byte lands in the output directory.
  const gameTree = measureTree(gameSrc);
  const shotTree = measureTree(shotsSrc);
  if (gameTree.files > CAPS.game_max_files) {
    fail(`game/ holds ${gameTree.files} files, over the ${CAPS.game_max_files} cap`);
  }
  if (gameTree.bytes > CAPS.game_max_bytes) {
    fail(`game/ weighs ${gameTree.bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
  }
  if (shotTree.files < 3 || shotTree.files > CAPS.screenshots.max) {
    fail(`screenshots/ holds ${shotTree.files} images; the bounty takes 3 or 4`);
  }
  if (shotTree.largest.bytes > CAPS.screenshots.max_bytes) {
    fail(
      `screenshot ${shotTree.largest.path} weighs ${shotTree.largest.bytes} bytes, ` +
        `over the ${CAPS.screenshots.max_bytes} cap`,
    );
  }

  // A clean output directory makes the two grader runs byte-identical.
  if (outputDir !== repoRoot) {
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });

  cpSync(gameSrc, join(outputDir, 'game'), { recursive: true });
  cpSync(shotsSrc, join(outputDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outputDir, {
    text_max_bytes: CAPS.text_max_bytes,
    screenshots: { max: CAPS.screenshots.max, max_bytes: CAPS.screenshots.max_bytes },
    game_max_files: CAPS.game_max_files,
    game_max_bytes: CAPS.game_max_bytes,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  console.log('ISLA BRASA — handed in');
  console.log(`  game/        ${gameTree.files} files, ${gameTree.bytes} bytes`);
  console.log(`  screenshots/ ${shotTree.files} images, ${shotTree.bytes} bytes`);
  console.log(`  dossier.json ${dossier.byteLength} bytes`);
  console.log(`  output       ${outputDir}`);
}

main();
