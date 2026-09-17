import { RACE } from "../config.js";
import { clamp, smoothDamp } from "../utils/easing.js";

export class RaceManager {
  constructor() {
    this.playerProgress = 0;
    this.botProgress = 0;
    this.playerSurge = 0;
    this.botSurge = 0;
    this.playerY = 0;
    this.botY = 0;
    this.playerVel = 0;
    this.botVel = 0;
    this.playerTilt = 0;
    this.botTilt = 0;
    this.displayedPlayerPlace = 1;
    this.displayedBotPlace = 2;
  }

  reset() {
    this.playerProgress = 0;
    this.botProgress = 0;
    this.playerSurge = 0;
    this.botSurge = 0;
    this.playerY = 0;
    this.botY = 0;
    this.playerVel = 0;
    this.botVel = 0;
    this.playerTilt = 0;
    this.botTilt = 0;
    this.displayedPlayerPlace = 1;
    this.displayedBotPlace = 2;
  }

  getRaceState() {
    return {
      playerProgress: this.playerProgress,
      botProgress: this.botProgress,
    };
  }

  applyCorrect() {
    this.playerProgress += RACE.correctGain;
    this.playerSurge = -RACE.surgeCorrect;
    this.botSurge = RACE.surgeCorrect * 0.12;
  }

  applyClose() {
    this.playerProgress += RACE.closeGain;
    this.playerSurge = -RACE.surgeClose;
    this.botSurge = RACE.surgeClose * 0.08;
  }

  applyWrong() {
    this.botProgress += RACE.wrongBotGain;
    this.playerSurge = RACE.surgeWrong * 0.28;
    this.botSurge = -RACE.surgeWrong;
  }

  applyPassiveBot() {
    this.botProgress += RACE.botPassiveGain;
  }

  get playerPlace() {
    if (this.playerProgress === this.botProgress) return 1;
    return this.playerProgress > this.botProgress ? 1 : 2;
  }

  get botPlace() {
    return this.playerPlace === 1 ? 2 : 1;
  }

  get playerWon() {
    return this.playerProgress >= this.botProgress;
  }

  targetOffsets() {
    const lead = (this.playerProgress - this.botProgress) * RACE.pixelsPerPoint;
    const player = clamp(
      -lead + this.playerSurge,
      -RACE.maxVisualLead,
      RACE.maxVisualLead * 0.7,
    );
    const bot = clamp(
      lead * 0.55 + this.botSurge,
      -RACE.maxVisualLead * 0.7,
      RACE.maxVisualLead,
    );
    return { player, bot };
  }

  tick(deltaTime) {
    const surgeDecay = Math.exp(-RACE.surgeDecay * deltaTime);
    this.playerSurge *= surgeDecay;
    this.botSurge *= surgeDecay;
    if (Math.abs(this.playerSurge) < 0.15) this.playerSurge = 0;
    if (Math.abs(this.botSurge) < 0.15) this.botSurge = 0;

    const targets = this.targetOffsets();
    const player = smoothDamp(this.playerY, targets.player, this.playerVel, RACE.carSmoothTime, deltaTime, 420);
    const bot = smoothDamp(this.botY, targets.bot, this.botVel, RACE.carSmoothTime, deltaTime, 420);
    this.playerY = player.value;
    this.playerVel = player.velocity;
    this.botY = bot.value;
    this.botVel = bot.velocity;

    const playerTiltTarget = clamp(-this.playerVel * 0.035, -5.5, 5.5);
    const botTiltTarget = clamp(-this.botVel * 0.035, -5.5, 5.5);
    const tilt = 1 - Math.exp(-10 * deltaTime);
    this.playerTilt += (playerTiltTarget - this.playerTilt) * tilt;
    this.botTilt += (botTiltTarget - this.botTilt) * tilt;

    const visualLead = this.botY - this.playerY;
    if (Math.abs(visualLead) > 10) {
      this.displayedPlayerPlace = visualLead > 0 ? 1 : 2;
      this.displayedBotPlace = this.displayedPlayerPlace === 1 ? 2 : 1;
    }
  }

  visualOffsets() {
    return {
      player: this.playerY,
      bot: this.botY,
      playerTilt: this.playerTilt,
      botTilt: this.botTilt,
      playerVel: this.playerVel,
      botVel: this.botVel,
    };
  }
}
