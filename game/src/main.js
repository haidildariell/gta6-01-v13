// Boot: size the canvas, build the Game, and either stage a screenshot
// scene (?shot=cover|market|race|map&seed=N) or run the live loop.

import { Game } from './game.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');

function fit() {
  canvas.width = Math.max(320, window.innerWidth);
  canvas.height = Math.max(240, window.innerHeight);
}

fit();
window.addEventListener('resize', () => {
  fit();
  if (game) { game.w = canvas.width; game.h = canvas.height; game.renderer.w = canvas.width; game.renderer.h = canvas.height; if (shotName) renderShot(); }
});

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shotName = params.get('shot');
const game = new Game(ctx, canvas.width, canvas.height, seed);
game.bind(canvas);

function renderShot() {
  game.w = canvas.width;
  game.h = canvas.height;
  game.renderer.w = canvas.width;
  game.renderer.h = canvas.height;
  stageShot(shotName, game);
  game.render();
  window.__shotReady = shotName;
  if (status) status.textContent = `ISLA BRASA — staged scene: ${shotName}`;
}

if (shotName) {
  renderShot();
} else {
  if (status) status.textContent = 'ISLA BRASA — open-world crime in Los Brasa. WASD to drive, F to step out, Esc for map and menus.';
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.w = canvas.width;
    game.h = canvas.height;
    game.renderer.w = canvas.width;
    game.renderer.h = canvas.height;
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
