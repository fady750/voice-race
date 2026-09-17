import { buildQuestion } from "../speech/arabicG2P.js";
import { TOTAL_QUESTIONS } from "../config.js";

export const QUESTIONS = [
  buildQuestion({ id: 1, word: "قَمَر", language: "ar-EG" }),
  buildQuestion({ id: 2, word: "قَلَم", language: "ar-EG" }),
  buildQuestion({ id: 3, word: "شَمْس", language: "ar-EG" }),
  buildQuestion({ id: 4, word: "كِتاب", fullyVocalizedText: "كِتَاب", language: "ar-EG" }),
  buildQuestion({ id: 5, word: "عمرو", language: "ar-EG" }),
].slice(0, TOTAL_QUESTIONS);
