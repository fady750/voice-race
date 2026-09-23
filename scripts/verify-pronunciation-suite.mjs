import assert from "node:assert/strict";
import { cloneTokens, phonemizeArabic, replaceFirst, removeFirst } from "../pronunciation-engine/arabic-phonemes.mjs";
import { evaluatePronunciation } from "../pronunciation-engine/compare.mjs";
import { normalizePronunciationQuestion } from "../src/speech/questionContract.js";
import { pronunciationEvaluator } from "../src/speech/PronunciationEvaluator.js";

const cases = [
  ["correct ض", "ضَابِطٌ", (tokens) => tokens],
  ["ض -> ظ", "ضَابِطٌ", (tokens) => replaceFirst(tokens, "D", "Z")],
  ["ض -> د", "ضَابِطٌ", (tokens) => replaceFirst(tokens, "D", "d")],
  ["correct ظ", "الظَّلَامُ", (tokens) => tokens],
  ["ظ -> ز", "الظَّلَامُ", (tokens) => replaceFirst(tokens, "Z", "z")],
  ["correct ط", "الطَّالِبُ", (tokens) => tokens],
  ["ط -> ت", "الطَّالِبُ", (tokens) => replaceFirst(tokens, "T", "t")],
  ["correct د", "دَرَسَ", (tokens) => tokens],
  ["correct ع", "عَلِمَ", (tokens) => tokens],
  ["ع -> غ", "عَلِمَ", (tokens) => replaceFirst(tokens, "ayn", "gh")],
  ["correct غ", "غُرُوبٌ", (tokens) => tokens],
  ["غ -> خ", "غُرُوبٌ", (tokens) => replaceFirst(tokens, "gh", "x")],
  ["correct ح", "حَافِظٌ", (tokens) => tokens],
  ["ح -> ه", "حَافِظٌ", (tokens) => replaceFirst(tokens, "H", "h")],
  ["correct ص", "صَبْرٌ", (tokens) => tokens],
  ["ص -> س", "صَبْرٌ", (tokens) => replaceFirst(tokens, "S", "s")],
  ["correct ق", "قَالَ", (tokens) => tokens],
  ["ق -> ك", "قَالَ", (tokens) => replaceFirst(tokens, "q", "k")],
  ["correct shadda", "عَلَّمَ", (tokens) => tokens],
  ["missing shadda", "عَلَّمَ", (tokens) => removeFirst(tokens, (token) => token.features?.shadda)],
  ["correct sukun", "مُسْلِمٌ", (tokens) => tokens],
  ["incorrect vowel", "عَلِمَ", (tokens) => replaceFirst(tokens, "i", "u")],
  ["correct fatha", "دَرَسَ", (tokens) => tokens],
  ["correct damma", "غُرُوبٌ", (tokens) => tokens],
  ["correct kasra", "عَلِمَ", (tokens) => tokens],
  ["correct tanween", "غُرُوبٌ", (tokens) => tokens],
  ["correct madd", "قَالَ", (tokens) => tokens],
  ["incorrect madd duration", "قَالَ", (tokens) => removeFirst(tokens, (token) => token.id === "aa")],
  ["lam shamsiyya", "الطَّالِبُ", (tokens) => tokens],
  ["lam qamariyya", "الْقَمَرُ", (tokens) => tokens],
];

for (const [name, word, mutate] of cases) {
  const target = phonemizeArabic(word);
  const detected = mutate(cloneTokens(target));
  const result = evaluatePronunciation({ word, expectedText: word, detectedPhonemes: detected, confidence: 0.95 });
  const shouldBeCorrect = name.startsWith("correct") || name.startsWith("lam ");
  assert.equal(result.correct, shouldBeCorrect, `${name} should classify correctly`);
}

const uncertain = evaluatePronunciation({
  word: "عَلِمَ",
  expectedText: "عَلِمَ",
  detectedPhonemes: phonemizeArabic("عَلِمَ"),
  confidence: 0.2,
});
assert.equal(uncertain.needsRetry, true, "Low-confidence audio should request a retry.");

const dynamicQuestion = normalizePronunciationQuestion({
  id: "admin-student",
  text: "الطَّالِبُ",
  fullyVocalizedText: "الطَّالِبُ",
  referenceAudioUrl: "https://example.test/reference.wav",
  language: "ar-SA",
  dialect: "msa",
  pronunciationMode: "fus7a",
  metadata: { lessonId: "lesson-1" },
});
assert.equal(dynamicQuestion.id, "admin-student");
assert.equal(dynamicQuestion.fullyVocalizedText, "الطَّالِبُ");
assert.equal(dynamicQuestion.referenceAudioUrl, "https://example.test/reference.wav");
assert.equal(dynamicQuestion.pronunciationTarget.sourceText, "الطَّالِبُ");

const structured = pronunciationEvaluator.evaluate({
  question: dynamicQuestion,
  learnerSignals: {
    detectedPhonemes: phonemizeArabic(dynamicQuestion.fullyVocalizedText),
    confidence: 0.95,
  },
});
assert.equal(structured.questionId, "admin-student");
assert.equal(structured.isCorrect, true);
assert.equal(structured.phonemeSource, "local-phoneme-provider");

console.log(JSON.stringify({
  cases: cases.length,
  passed: cases.length,
  uncertainty: uncertain.needsRetry,
  dynamicQuestion: dynamicQuestion.id,
}, null, 2));
