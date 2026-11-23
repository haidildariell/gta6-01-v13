// missions.js — the ten story jobs of ISLA BRASA as a small stage machine.
// Each job is a list of staged objectives with a world target; completing a
// stage advances the NEXT line on the HUD, finishing a job pays cash and
// respect and unlocks the next job from Vera's list.

import { STORY_JOBS } from './config.js';
import { districtAt } from './world.js';

export const JOB_TARGETS = [
  [{ x: 2760, y: 620 }, { x: 3050, y: 1500 }, { x: 1200, y: 2000 }],
  [{ x: 1500, y: 900 }, { x: 900, y: 700 }, { x: 2760, y: 620 }],
  [{ x: 3050, y: 1700 }, { x: 2900, y: 2100 }, { x: 1180, y: 1620 }],
  [{ x: 3200, y: 500 }, { x: 3650, y: 900 }, { x: 2760, y: 620 }],
  [{ x: 600, y: 400 }, { x: 480, y: 330 }, { x: 1500, y: 1400 }],
  [{ x: 2400, y: 2400 }, { x: 1500, y: 1500 }, { x: 2760, y: 620 }],
  [{ x: 2000, y: 1200 }, { x: 3050, y: 1500 }, { x: 1000, y: 2200 }],
  [{ x: 700, y: 500 }, { x: 640, y: 430 }, { x: 900, y: 900 }],
  [{ x: 3050, y: 300 }, { x: 2900, y: 480 }, { x: 2400, y: 900 }],
  [{ x: 1500, y: 1500 }, { x: 3050, y: 1500 }, { x: 2760, y: 620 }],
];

export class JobRunner {
  constructor() {
    this.jobIndex = 5; // the run opens mid-story: JOB 6/10, REGENT RUN
    this.stage = 2;
    this.stageFrac = 0.4;
    this.done = new Set([0, 1, 2, 3, 4]);
    this.active = true;
  }

  get job() {
    return STORY_JOBS[this.jobIndex];
  }

  get target() {
    const list = JOB_TARGETS[this.jobIndex];
    return list[Math.min(this.stage - 1, list.length - 1)];
  }

  hudMission() {
    const j = this.job;
    if (!this.active || !j) return null;
    return {
      n: j.n,
      title: j.title,
      stage: this.stage,
      stageCount: j.stages.length,
      stageFrac: this.stageFrac,
      next: j.stages[this.stage - 1],
      giver: j.giver,
      pay: '$' + j.pay.toLocaleString('en-US'),
      timerSec: j.n === 6 && this.stage === 3 ? 96 : null,
    };
  }

  dialogLine() {
    const j = this.job;
    return j ? { name: j.giver, line: j.line } : null;
  }

  // Called when the player reaches the current target. Returns a payout
  // record when a job finishes, else null.
  reachTarget(state) {
    const j = this.job;
    if (!j) return null;
    if (this.stage < j.stages.length) {
      this.stage++;
      this.stageFrac = 0;
      return null;
    }
    this.done.add(this.jobIndex);
    const payout = { cash: j.pay, respect: j.respect, title: j.title };
    this.jobIndex = Math.min(this.jobIndex + 1, STORY_JOBS.length - 1);
    this.stage = 1;
    this.stageFrac = 0;
    if (this.done.size >= STORY_JOBS.length) this.active = false;
    return payout;
  }

  routeTo(player) {
    const t = this.target;
    if (!t) return [player];
    // an L-shaped street route: across, then along
    const midX = { x: t.x, y: player.y };
    return [player, midX, t];
  }

  districtOfTarget() {
    const t = this.target;
    return t ? districtAt(t.x, t.y).name : '';
  }
}
