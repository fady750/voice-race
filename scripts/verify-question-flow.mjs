import assert from "node:assert/strict";
import { createQuestions } from "../src/data/questions.js";
import { QuestionManager } from "../src/game/QuestionManager.js";

const firstSession = createQuestions();
assert.equal(firstSession.length, 10, "The dataset must contain ten questions.");
assert.equal(new Set(firstSession.map((question) => question.id)).size, 10, "Question identifiers must be unique.");
assert.ok(firstSession.every((question) => question.fullyVocalizedText), "Every question needs fully vocalized reference text.");

const manager = new QuestionManager(firstSession);
const reached = [];
while (manager.current) {
  reached.push(manager.current.id);
  if (manager.isLast) break;
  manager.next();
}
assert.equal(reached.length, 10, "All ten questions must be reachable.");
assert.deepEqual(reached, firstSession.map((question) => question.id), "Question order must match the lesson dataset.");

const secondSession = createQuestions();
manager.reset(secondSession);
assert.equal(manager.number, 1, "A replay starts at question one.");
assert.equal(manager.total, 10, "A replay keeps the ten-question dataset.");
assert.notEqual(manager.questions, firstSession, "A replay must receive a fresh session array.");

console.log(JSON.stringify({
  datasetQuestions: firstSession.length,
  reachedQuestions: reached.length,
  firstQuestion: manager.current.id,
  freshSessionArray: manager.questions !== firstSession,
}, null, 2));
