import assert from "node:assert/strict";
import { RaceManager } from "../src/game/RaceManager.js";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const outcomes = [
  [true, true, true, true, true, true, true, true, true, true],
  [true, false, false, true, false, true, true, false, true, false],
  [false, false, true, false, false, true, false, false, true, false],
  [true, false, true, false, true, false, true, false, true, false],
];

const races = [];
for (let raceIndex = 0; raceIndex < 48; raceIndex += 1) {
  const race = new RaceManager({ totalQuestions: 10, random: seededRandom(raceIndex + 1) });
  let maxStep = 0;
  let minGap = Infinity;
  let maxGap = -Infinity;
  let previousBot = 0;

  for (const playerCorrect of outcomes[raceIndex % outcomes.length]) {
    race.resolveQuestion({ playerCorrect });
    for (let frame = 0; frame < 20; frame += 1) {
      race.tick(0.05);
      maxStep = Math.max(maxStep, race.botProgress - previousBot);
      previousBot = race.botProgress;
      const gap = race.playerProgress - race.botProgress;
      minGap = Math.min(minGap, gap);
      maxGap = Math.max(maxGap, gap);
    }
  }

  races.push({
    playerWon: race.playerWon,
    playerProgress: race.playerProgress,
    botProgress: race.botProgress,
    playerSteps: race.completedQuestions,
    robotSteps: race.robotSteps,
    minGap,
    maxGap,
    maxStep,
  });
}

assert(races.some((race) => race.playerWon), "The player should win some simulated races.");
assert(races.some((race) => !race.playerWon), "The AI should win some simulated races.");
assert(races.some((race) => race.minGap < 0 && race.maxGap > 0), "The lead should change during at least one race.");
assert(races.every((race) => race.maxStep < 10), "The robot must move smoothly between steps.");
assert(races.some((race) => race.robotSteps < 10), "The robot should make mistakes.");
assert(races.some((race) => race.robotSteps > 0), "The robot should advance in some races.");
assert(races.every((race) => race.playerProgress >= 0 && race.playerProgress <= 100), "Player progress must stay bounded.");
assert(races.every((race) => race.botProgress >= 0 && race.botProgress <= 100), "Robot progress must stay bounded.");

console.log(JSON.stringify({
  races: races.length,
  playerWins: races.filter((race) => race.playerWon).length,
  aiWins: races.filter((race) => !race.playerWon).length,
  maxStep: Math.max(...races.map((race) => race.maxStep)),
  robotStepRange: [Math.min(...races.map((race) => race.robotSteps)), Math.max(...races.map((race) => race.robotSteps))],
}, null, 2));
