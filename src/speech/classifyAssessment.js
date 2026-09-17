import { PRONUNCIATION_THRESHOLDS } from "../config.js";
import { arabicPronunciationAnalyzer } from "./ArabicPronunciationAnalyzer.js";

export function classifyAssessment(input = {}) {
  return arabicPronunciationAnalyzer.analyze({
    ...input,
    thresholds: PRONUNCIATION_THRESHOLDS,
  });
}
