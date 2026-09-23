import assert from "node:assert/strict";
import { phonemizeArabic, removeFirst, replaceFirst } from "./arabic-phonemes.mjs";
import { evaluatePronunciation } from "./compare.mjs";

function alterHaraka(tokens, expectedId, detectedId) {
  return replaceFirst(tokens, expectedId, detectedId);
}

const tests = [
  { id: 1, word: "غُرُوبٌ", cases: [
    ["correct", (t) => t, null], ["ع بدل غ", (t) => replaceFirst(t, "gh", "ayn"), "phoneme"], ["tanween مفقود", (t) => alterHaraka(t, "un", "u"), "tanween"],
  ] },
  { id: 2, word: "الظَّلَامُ", cases: [
    ["correct", (t) => t, null], ["ض بدل ظ", (t) => replaceFirst(t, "Z", "D"), "phoneme"], ["shadda مفقودة", (t) => removeFirst(t, (x) => x.id === "Z" && x.features.shadda), "missing_shadda"], ["damma خاطئة", (t) => alterHaraka(t, "u", "a"), "haraka"],
  ] },
  { id: 3, word: "الطَّائِرَةُ", cases: [
    ["correct", (t) => t, null], ["ت بدل ط", (t) => replaceFirst(t, "T", "t"), "phoneme"], ["madd مفقود", (t) => alterHaraka(t, "aa", "a"), "madd"], ["kasra خاطئة", (t) => alterHaraka(t, "i", "u"), "haraka"],
  ] },
  { id: 4, word: "صَبْرٌ", cases: [
    ["correct", (t) => t, null], ["س بدل ص", (t) => replaceFirst(t, "S", "s"), "phoneme"], ["sukun مفقود", (t) => { const x = t.map((v) => ({ ...v, features: { ...v.features } })); x.find((v) => v.id === "b").features.sukun = false; return x; }, "sukun"], ["tanween مفقود", (t) => alterHaraka(t, "un", "u"), "tanween"],
  ] },
  { id: 5, word: "حَافِظٌ", cases: [
    ["correct", (t) => t, null], ["ه بدل ح", (t) => replaceFirst(t, "H", "h"), "phoneme"], ["خ بدل ح", (t) => replaceFirst(t, "H", "x"), "phoneme"], ["madd مفقود", (t) => alterHaraka(t, "aa", "a"), "madd"],
  ] },
  { id: 6, word: "قُرْآنٌ", cases: [
    ["correct", (t) => t, null], ["ك بدل ق", (t) => replaceFirst(t, "q", "k"), "phoneme"], ["madd مفقود", (t) => alterHaraka(t, "aa", "a"), "madd"], ["tanween مفقود", (t) => alterHaraka(t, "un", "u"), "tanween"],
  ] },
  { id: 7, word: "مُدَرِّسٌ", cases: [
    ["correct", (t) => t, null], ["shadda مفقودة", (t) => removeFirst(t, (x) => x.id === "r" && x.features.shadda), "missing_shadda"], ["kasra خاطئة", (t) => alterHaraka(t, "i", "a"), "haraka"], ["tanween مفقود", (t) => alterHaraka(t, "un", "u"), "tanween"],
  ] },
  { id: 8, word: "قَالَ", cases: [
    ["correct", (t) => t, null], ["madd مفقود", (t) => alterHaraka(t, "aa", "a"), "madd"], ["fatha خاطئة", (t) => alterHaraka(t, "a", "u"), "haraka"],
  ] },
  { id: 9, word: "مُسْلِمٌ", cases: [
    ["correct", (t) => t, null], ["sukun مفقود", (t) => { const x = t.map((v) => ({ ...v, features: { ...v.features } })); x.find((v) => v.id === "s").features.sukun = false; return x; }, "sukun"], ["kasra خاطئة", (t) => alterHaraka(t, "i", "a"), "haraka"], ["tanween مفقود", (t) => alterHaraka(t, "un", "u"), "tanween"],
  ] },
  { id: 10, word: "ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ مُبَكِّرًا", cases: [
    ["correct", (t) => t, null], ["ز بدل ذ", (t) => replaceFirst(t, "dh", "z"), "phoneme"], ["ت بدل ط", (t) => replaceFirst(t, "T", "t"), "phoneme"], ["shadda مفقودة", (t) => removeFirst(t, (x) => x.id === "k" && x.features.shadda), "missing_shadda"], ["tanween مفقود", (t) => alterHaraka(t, "an", "a"), "tanween"],
  ] },
];

const results = [];
for (const test of tests) {
  const target = phonemizeArabic(test.word);
  for (const [label, mutate, expectedType] of test.cases) {
    const result = evaluatePronunciation({ word: test.word, expectedText: test.word, detectedPhonemes: mutate(target), confidence: 0.9 });
    if (expectedType === null) assert.equal(result.correct, true, `Test ${test.id}: ${label} should be correct`);
    else assert.ok(result.errors.some((error) => error.type === expectedType), `Test ${test.id}: ${label} should detect ${expectedType}`);
    results.push({ test: test.id, word: test.word, case: label, pass: true, detectedTypes: result.errors.map((error) => error.type) });
  }
}

console.log(JSON.stringify({
  kind: "deterministic-phoneme-comparison-benchmark",
  tests: tests.length,
  evaluationCases: results.length,
  passed: results.length,
  results,
}, null, 2));
