import { arabicPronunciationAnalyzer } from "./ArabicPronunciationAnalyzer.js";
import { normalizePronunciationQuestion } from "./questionContract.js";
import { evaluatePronunciation as comparePhonemes } from "../../pronunciation-engine/compare.mjs";

const MIN_CONFIDENCE = 0.55;

function uncertaintyState(result, confidence) {
  const numericConfidence = Number(confidence);
  if (Number.isFinite(numericConfidence) && numericConfidence > 0 && numericConfidence < MIN_CONFIDENCE) {
    return "UNCERTAIN";
  }
  return result.result === "correct" ? "CORRECT" : result.result === "wrong" ? "INCORRECT" : "UNCERTAIN";
}

function feedbackFor(result) {
  const feedback = [];
  for (const weak of result.weakPhonemes || []) {
    feedback.push({
      type: "MAKHRAJ",
      expected: weak.display || weak.expected,
      detected: weak.actual || null,
      message: weak.display ? `انتبه إلى مخرج حرف ${weak.display}.` : "انتبه إلى مخرج الحرف.",
    });
  }
  if (result.vowelScore != null && result.vowelScore < 100) {
    feedback.push({ type: "TASHKEEL", message: "انتبه إلى حركة الحرف." });
  }
  return feedback.length ? feedback : [{ type: "GENERAL", message: result.childFeedback }];
}

export class PronunciationEvaluator {
  constructor({ analyzer = arabicPronunciationAnalyzer } = {}) {
    this.analyzer = analyzer;
  }

  evaluate({ question, learnerSignals = {}, learnerAudio = null } = {}) {
    const normalizedQuestion = normalizePronunciationQuestion(question);
    if (Array.isArray(learnerSignals.detectedPhonemes)) {
      return this.#evaluateDetectedPhonemes(normalizedQuestion, learnerSignals, learnerAudio);
    }
    const result = this.analyzer.analyze({
      ...learnerSignals,
      question: normalizedQuestion,
      expectedText: normalizedQuestion.fullyVocalizedText,
      learnerAudio,
    });
    const confidence = Number(learnerSignals.confidence) || 0;
    const state = uncertaintyState(result, confidence);

    return {
      questionId: normalizedQuestion.id,
      overallScore: result.overallScore,
      isCorrect: state === "CORRECT",
      state,
      transcription: result.recognizedText,
      phonemeScore: result.phonemeScore,
      tashkeelScore: result.vowelScore,
      makhrajScore: result.phonemeScore,
      durationScore: null,
      phonemes: result.actualPhonemes.map((detected, position) => ({
        expected: result.targetPhonemes[position] || null,
        detected,
        correct: result.targetPhonemes[position] === detected,
        confidence: confidence || null,
        position,
        errorType: result.targetPhonemes[position] === detected ? null : "PHONEME",
      })),
      tashkeelErrors: result.vowelScore != null && result.vowelScore < 100
        ? [{ type: "TASHKEEL", message: "حركة غير مطابقة للمرجع." }]
        : [],
      durationErrors: [],
      feedback: feedbackFor(result),
      result: state === "CORRECT" ? "correct" : state === "INCORRECT" ? "wrong" : "close",
      status: state === "CORRECT" ? "CORRECT" : state === "INCORRECT" ? "WRONG" : "CLOSE",
      childFeedback: result.childFeedback,
      debug: result.debug,
      expectedText: normalizedQuestion.fullyVocalizedText,
      referenceAudioUrl: normalizedQuestion.referenceAudioUrl,
      phonemeSource: result.phonemeSource,
      raw: result,
    };
  }

  #evaluateDetectedPhonemes(question, learnerSignals, learnerAudio) {
    const comparison = comparePhonemes({
      word: question.word,
      expectedText: question.fullyVocalizedText,
      detectedPhonemes: learnerSignals.detectedPhonemes,
      confidence: learnerSignals.confidence ?? 1,
    });
    const state = comparison.needsRetry ? "UNCERTAIN" : comparison.correct ? "CORRECT" : "INCORRECT";
    const result = state === "CORRECT" ? "correct" : state === "INCORRECT" ? "wrong" : "close";
    return {
      questionId: question.id,
      overallScore: comparison.score,
      isCorrect: comparison.correct,
      state,
      result,
      status: result.toUpperCase(),
      transcription: learnerSignals.transcription || "",
      phonemeScore: comparison.score,
      tashkeelScore: comparison.harakat.correct ? 100 : 0,
      makhrajScore: comparison.errors.some((error) => error.type === "phoneme") ? 0 : 100,
      durationScore: comparison.madd.correct && comparison.shadda.correct ? 100 : 0,
      phonemes: comparison.alignment.map((pair, position) => ({
        expected: pair.expected,
        detected: pair.detected,
        correct: pair.kind === "match",
        confidence: learnerSignals.confidence ?? null,
        position,
        errorType: pair.kind === "match" ? null : "PHONEME",
      })),
      tashkeelErrors: comparison.harakat.errors,
      durationErrors: [...comparison.madd.errors, ...comparison.shadda.errors],
      feedback: comparison.errors.map((error) => ({
        type: error.type === "phoneme" ? "MAKHRAJ" : "TASHKEEL",
        expected: error.expected?.display || null,
        detected: error.detected?.display || null,
        message: `انتبه إلى نطق ${error.expected?.display || "الحرف"}.`,
      })),
      childFeedback: state === "CORRECT" ? "ممتاز! نطقك رائع!" : "حاول مرة أخرى.",
      expectedText: question.fullyVocalizedText,
      referenceAudioUrl: question.referenceAudioUrl,
      phonemeSource: "local-phoneme-provider",
      learnerAudio,
      raw: comparison,
    };
  }
}

export const pronunciationEvaluator = new PronunciationEvaluator();
