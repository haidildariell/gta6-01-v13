// main.js — boot for ISLA BRASA. Normal visit: the start screen and the game
// loop. A ?shot=<scene> visit (the kit's shots.json) stages one deterministic
// scene, renders a single frame and flags completion for the screenshot rig.

import { Game } from './game.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const game = new Game(seed);

const shot = params.get('shot');
if (shot) {
  game.started = true;
  stageShot(ctx, game, shot, W, H);
  window.__shotDone = true;
  document.title = 'islabrasa-shot-done';
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render(ctx, W, H);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  addEventListener('keydown', (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    game.keyDown(e.code);
  });
  addEventListener('keyup', (e) => game.keyUp(e.code));
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    game.mouse.x = ((e.clientX - r.left) / r.width) * W;
    game.mouse.y = ((e.clientY - r.top) / r.height) * H;
  });
  canvas.addEventListener('mousedown', () => {
    if (!game.started) {
      game.started = true;
      return;
    }
    game.mouse.down = true;
  });
  addEventListener('mouseup', () => {
    game.mouse.down = false;
  });
  canvas.addEventListener('click', () => {
    if (!game.started) game.started = true;
  });
}
