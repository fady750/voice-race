import { RACE } from "../config.js";
import { clamp, smoothDamp } from "../utils/easing.js";
import { AIController } from "./AIController.js";

export class RaceManager {
  constructor(options = {}) {
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
    this.totalQuestions = Math.max(1, Number(options.totalQuestions) || 1);
    this.completedQuestions = 0;
    this.robotSteps = 0;
    this.robotTargetProgress = 0;
    this.robotCorrectStreak = 0;
    const configuredChance = Number(options.robotCorrectChance);
    this.robotCorrectChance = Number.isFinite(configuredChance) ? Math.max(0, Math.min(1, configuredChance)) : 0.55;
    this.random = options.random || Math.random;
    this.playerTargetProgress = 0;
    this.ai = options.ai || new AIController({ difficulty: RACE.aiDifficulty, random: options.random });
    this.ai.reset();
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
    this.completedQuestions = 0;
    this.robotSteps = 0;
    this.robotCorrectStreak = 0;
    this.robotTargetProgress = 0;
    this.playerTargetProgress = 0;
    this.ai.reset();
  }

  setTotalQuestions(totalQuestions) {
    this.totalQuestions = Math.max(1, Number(totalQuestions) || 1);
  }

  resolveQuestion({ playerCorrect = false } = {}) {
    if (playerCorrect) {
      this.completedQuestions = Math.min(this.totalQuestions, this.completedQuestions + 1);
      this.playerTargetProgress = (this.completedQuestions / this.totalQuestions) * 100;
    }

    const robotCorrect = this.random() < this.robotCorrectChance;
    if (robotCorrect) {
      this.robotSteps = Math.min(this.totalQuestions, this.robotSteps + 1);
      this.robotCorrectStreak += 1;
    } else {
      this.robotCorrectStreak = 0;
    }
    this.robotTargetProgress = (this.robotSteps / this.totalQuestions) * 100;
  }

  completeQuestion() {
    this.resolveQuestion({ playerCorrect: true });
  }

  getRaceState() {
    return {
      playerProgress: this.playerProgress,
      botProgress: this.botProgress,
    };
  }

  applyCorrect() {
    this.playerSurge = 0;
    this.botSurge = 0;
  }

  applyClose() {
    this.playerSurge = 0;
    this.botSurge = 0;
  }

  applyWrong() {
    this.playerSurge = 0;
    this.botSurge = 0;
  }

  applyPassiveBot() {
    // Disabled passive progression
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

  tick(deltaTime) {
    this.playerProgress += (this.playerTargetProgress - this.playerProgress)
      * Math.min(1, Math.max(0, deltaTime) / 0.42);
    this.botProgress += (this.robotTargetProgress - this.botProgress)
      * Math.min(1, Math.max(0, deltaTime) / 0.42);
    this.playerProgress = Math.min(100, this.playerProgress);
    
    const surgeDecay = Math.exp(-RACE.surgeDecay * deltaTime);
    this.playerSurge *= surgeDecay;
    this.botSurge *= surgeDecay;
    if (Math.abs(this.playerSurge) < 0.15) this.playerSurge = 0;
    if (Math.abs(this.botSurge) < 0.15) this.botSurge = 0;

    // Use progress directly as Y (0 to 100), Game.js will map it to pixels
    this.playerY = this.playerProgress;
    this.botY = this.botProgress;

    // Pseudo-velocity for tilt
    this.playerVel = (this.playerTargetProgress - this.playerProgress) * 5; 
    this.botVel = (this.robotTargetProgress - this.botProgress) * 5;

    const playerTiltTarget = clamp(-this.playerVel * 0.035, -5.5, 5.5);
    const botTiltTarget = clamp(-this.botVel * 0.035, -5.5, 5.5);
    const tilt = 1 - Math.exp(-10 * deltaTime);
    this.playerTilt += (playerTiltTarget - this.playerTilt) * tilt;
    this.botTilt += (botTiltTarget - this.botTilt) * tilt;

    const lead = this.playerProgress - this.botProgress;
    if (Math.abs(lead) > 0.1) {
      this.displayedPlayerPlace = lead > 0 ? 1 : 2;
      this.displayedBotPlace = this.displayedPlayerPlace === 1 ? 2 : 1;
    }
  }

  visualOffsets() {
    return {
      player: this.playerY,
      bot: this.botY,
      playerSurge: this.playerSurge,
      botSurge: this.botSurge,
      playerTilt: this.playerTilt,
      botTilt: this.botTilt,
      playerVel: this.playerVel,
      botVel: this.botVel,
    };
  }
}
