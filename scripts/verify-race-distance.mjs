import assert from "node:assert/strict";
import { RaceManager } from "../src/game/RaceManager.js";

for (const totalQuestions of [5, 10, 15]) {
  const race = new RaceManager({ totalQuestions, random: () => 0.5 });
  for (let completed = 1; completed <= totalQuestions; completed += 1) {
    race.completeQuestion();
    assert.equal(race.completedQuestions, completed);
    assert.equal(race.playerTargetProgress, (completed / totalQuestions) * 100);
    for (let frame = 0; frame < 20; frame += 1) race.tick(0.05);
    assert(race.playerProgress <= 100);
    assert(race.botProgress >= 0 && race.botProgress <= 100);
  }
  assert.equal(race.playerTargetProgress, 100);
}

console.log(JSON.stringify({ testedQuestionCounts: [5, 10, 15], progressModel: "completedQuestions / totalQuestions", finishProgress: 100 }, null, 2));
