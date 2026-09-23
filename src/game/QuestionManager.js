import { createQuestions } from "../data/questions.js";

export class QuestionManager {
  constructor(questions = createQuestions()) {
    this.questions = questions;
    this.index = 0;
  }

  get total() {
    return this.questions.length;
  }

  get current() {
    return this.questions[this.index] || null;
  }

  get number() {
    return this.index + 1;
  }

  get isLast() {
    return this.index >= this.questions.length - 1;
  }

  reset(questions = this.questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("A pronunciation session requires at least one question.");
    }
    this.questions = questions;
    this.index = 0;
  }

  next() {
    if (this.isLast) return null;
    this.index += 1;
    return this.current;
  }
}
