import { QUESTIONS } from "../data/questions.js";

export class QuestionManager {
  constructor(questions = QUESTIONS) {
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

  reset() {
    this.index = 0;
  }

  next() {
    if (this.isLast) return null;
    this.index += 1;
    return this.current;
  }
}
