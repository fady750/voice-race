import { RACE } from "../config.js";
import { clamp } from "../utils/easing.js";

export const AI_STATES = {
  NORMAL: "NORMAL",
  FAST: "FAST",
  SLOW: "SLOW",
  CATCHING_UP: "CATCHING_UP",
  FALLING_BEHIND: "FALLING_BEHIND",
  MISTAKE: "MISTAKE",
};

const STATE_MODIFIERS = {
  [AI_STATES.NORMAL]: 0,
  [AI_STATES.FAST]: 0.22,
  [AI_STATES.SLOW]: -0.2,
  [AI_STATES.CATCHING_UP]: 0.16,
  [AI_STATES.FALLING_BEHIND]: -0.14,
  [AI_STATES.MISTAKE]: -0.34,
};

const STATE_WEIGHTS = [
  [AI_STATES.NORMAL, 48],
  [AI_STATES.FAST, 13],
  [AI_STATES.SLOW, 13],
  [AI_STATES.MISTAKE, 7],
];

function chooseWeighted(random) {
  const total = STATE_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let value = random() * total;
  for (const [state, weight] of STATE_WEIGHTS) {
    value -= weight;
    if (value <= 0) return state;
  }
  return AI_STATES.NORMAL;
}

export class AIController {
  constructor({ difficulty = 0.5, random = Math.random } = {}) {
    this.difficulty = clamp(Number(difficulty) || 0.5, 0, 1);
    this.random = random;
    this.state = AI_STATES.NORMAL;
    this.stateTime = 0;
    this.stateDuration = 0;
    this.targetSpeed = 0;
    this.speed = 0;
  }

  reset() {
    this.state = AI_STATES.NORMAL;
    this.stateTime = 0;
    this.stateDuration = 0;
    this.targetSpeed = this.#baseSpeed();
    this.speed = this.targetSpeed;
  }

  update(deltaTime, playerProgress, botProgress) {
    const delta = Math.max(0, Math.min(0.05, Number(deltaTime) || 0));
    if (!delta) return 0;
    if (!this.stateDuration) this.#chooseState(playerProgress, botProgress);

    this.stateTime += delta;
    if (this.stateTime >= this.stateDuration) {
      this.#chooseState(playerProgress, botProgress);
    }

    const gap = playerProgress - botProgress;
    const catchUp = clamp(gap / RACE.aiCatchUpRange, -1, 1);
    const rubberBand = catchUp * RACE.aiCatchUpStrength * this.difficulty;
    const advantageLimit = RACE.aiMaxAdvantage * (0.75 + this.difficulty * 0.5);
    const deficitLimit = RACE.aiMaxDeficit * (1.1 - this.difficulty * 0.25);
    const limitCorrection = gap < -advantageLimit
      ? -Math.min(0.35, (Math.abs(gap) - advantageLimit) / 20)
      : gap > deficitLimit
        ? Math.min(0.7, (gap - deficitLimit) / 12)
        : 0;
    const stateModifier = STATE_MODIFIERS[this.state] * (0.65 + this.difficulty * 0.35);
    const variation = (this.random() - 0.5) * RACE.aiSpeedVariation;
    this.targetSpeed = Math.max(
      0,
      this.#baseSpeed() * (1 + stateModifier + rubberBand + limitCorrection + variation),
    );
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, delta / RACE.aiAccelerationTime);

    const progress = Math.min(this.speed * delta, RACE.aiMaxStep);
    return Math.max(0, progress);
  }

  getState() {
    return { state: this.state, speed: this.speed, stateTime: this.stateTime, stateDuration: this.stateDuration };
  }

  #baseSpeed() {
    return RACE.aiBaseSpeed * (0.91 + this.difficulty * 0.18);
  }

  #chooseState(playerProgress, botProgress) {
    const gap = playerProgress - botProgress;
    if (gap > RACE.aiCatchUpRange * 0.7) {
      this.state = AI_STATES.CATCHING_UP;
    } else if (gap < -RACE.aiCatchUpRange * 0.7) {
      this.state = AI_STATES.FALLING_BEHIND;
    } else {
      this.state = chooseWeighted(this.random);
    }
    this.stateTime = 0;
    this.stateDuration = 1.8 + this.random() * 3.2;
  }
}
