import {
  alignSequences,
  analyzeArabicMatch,
  extractLetterUnits,
  isConfusablePhoneme,
  normalizeArabic,
  similarityScore,
} from "../utils/arabic.js";
import { LETTER_DISPLAY, buildPronunciationTarget, graphemesToPhonemes } from "./arabicG2P.js";

const DEFAULT_THRESHOLDS = {
  correct: 80,
  close: 55,
};

function candidateTexts({ recognizedText = "", alternatives = [] }) {
  const texts = [];
  const push = (value) => {
    const text = typeof value === "string" ? value : value?.text;
    if (text && !texts.includes(text)) texts.push(text);
  };
  push(recognizedText);
  alternatives.forEach(push);
  return texts;
}

function round(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value));
}

function weightedMean(parts) {
  const usable = parts.filter((part) => part.value != null && Number.isFinite(part.value));
  const weight = usable.reduce((sum, part) => sum + part.weight, 0);
  if (!usable.length || !weight) return 0;
  return usable.reduce((sum, part) => sum + part.value * part.weight, 0) / weight;
}

function averageFinite(values) {
  const nums = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

/**
 * Pluggable Arabic phoneme alignment.
 * A later engine can implement { id, align(signals) } and return
 * { phonemes, phonemeScore, vowelScore } from real audio analysis.
 * Do not invent per-phoneme scores when the provider did not return them.
 */
export class ArabicPhonemeAlignmentProvider {
  constructor(id = "none") {
    this.id = id;
  }

  align() {
    return {
      phonemes: null,
      phonemeScore: null,
      vowelScore: null,
      available: false,
    };
  }
}

export class GraphemePhonemeFallbackProvider extends ArabicPhonemeAlignmentProvider {
  constructor() {
    super("arabic-g2p-stt");
  }

  align({ target, recognizedText }) {
    const expected = target || buildPronunciationTarget("");
    const actual = graphemesToPhonemes(recognizedText || "");
    if (!expected.consonantSequence?.length || !actual.consonantSequence.length) {
      return { phonemes: actual.phonemes, phonemeScore: null, vowelScore: null, available: false, pairs: [] };
    }

    const aligned = alignSequences(expected.consonantSequence, actual.consonantSequence);
    let matches = 0;
    let confusable = 0;
    let other = 0;
    const weak = [];
    for (const pair of aligned.pairs) {
      if (pair.kind === "match") {
        matches += 1;
        continue;
      }
      if (pair.kind === "substitute" && isConfusablePhoneme(pair.expected, pair.actual)) {
        confusable += 1;
        weak.push({
          expected: pair.expected,
          actual: pair.actual,
          display: LETTER_DISPLAY[pair.expected] || pair.expected,
        });
      } else if (pair.kind !== "insert") {
        other += 1;
        if (pair.expected) {
          weak.push({
            expected: pair.expected,
            actual: pair.actual,
            display: LETTER_DISPLAY[pair.expected] || pair.expected,
          });
        }
      }
    }

    const total = Math.max(1, expected.consonantSequence.length);
    const phonemeScore = Math.round(((matches + confusable * 0.25) / total) * 100);

    let vowelScore = null;
    const expectedUnits = extractLetterUnits(expected.sourceText || "");
    const actualUnits = extractLetterUnits(recognizedText || "");
    const actualHasHarakat = actualUnits.some((unit) => unit.haraka);
    const expectedHasHarakat = expectedUnits.some((unit) => unit.haraka);
    if (actualHasHarakat && expectedHasHarakat) {
      const letterAlign = alignSequences(
        expectedUnits.map((unit) => unit.phonemeId),
        actualUnits.map((unit) => unit.phonemeId),
      );
      let vowelMatches = 0;
      let vowelCount = 0;
      let ei = 0;
      let ai = 0;
      for (const pair of letterAlign.pairs) {
        if (pair.kind === "insert") {
          ai += 1;
          continue;
        }
        if (pair.kind === "delete") {
          if (expectedUnits[ei]?.haraka && expectedUnits[ei].haraka !== "sukun") vowelCount += 1;
          ei += 1;
          continue;
        }
        const exp = expectedUnits[ei];
        const act = actualUnits[ai];
        if (exp?.haraka) {
          vowelCount += 1;
          if (exp.haraka === act?.haraka) vowelMatches += 1;
        }
        ei += 1;
        ai += 1;
      }
      if (vowelCount) vowelScore = Math.round((vowelMatches / vowelCount) * 100);
    }

    return {
      phonemes: actual.phonemes,
      phonemeScore,
      vowelScore,
      available: true,
      source: "grapheme-g2p",
      pairs: aligned.pairs,
      weakPhonemes: weak,
      confusableCount: confusable,
      otherMismatchCount: other,
    };
  }
}

export class ProviderPhonemeAssessmentProvider extends ArabicPhonemeAlignmentProvider {
  constructor() {
    super("provider-pronunciation-assessment");
  }

  align({ providerPhonemes }) {
    const list = Array.isArray(providerPhonemes) ? providerPhonemes : [];
    const scored = list.filter((item) => item && item.accuracy != null && Number.isFinite(Number(item.accuracy)));
    if (!scored.length) {
      return { phonemes: list.length ? list : null, phonemeScore: null, vowelScore: null, available: false };
    }
    return {
      phonemes: scored,
      phonemeScore: round(averageFinite(scored.map((item) => item.accuracy))),
      vowelScore: null,
      available: true,
      source: "provider",
    };
  }
}

export class ArabicPronunciationAnalyzer {
  constructor({
    thresholds = DEFAULT_THRESHOLDS,
    phonemeProvider = new GraphemePhonemeFallbackProvider(),
    assessmentProvider = new ProviderPhonemeAssessmentProvider(),
  } = {}) {
    this.thresholds = thresholds;
    this.phonemeProvider = phonemeProvider;
    this.assessmentProvider = assessmentProvider;
  }

  setPhonemeProvider(provider) {
    this.phonemeProvider = provider;
  }

  analyze(input = {}) {
    const thresholds = { ...this.thresholds, ...(input.thresholds || {}) };
    const question = input.question || {};
    const expectedText = question.fullyVocalizedText || input.expectedText || question.word || "";
    const plainText = question.plainText || normalizeArabic(expectedText);
    const target = question.pronunciationTarget
      || buildPronunciationTarget(expectedText);
    if (!target.sourceText) target.sourceText = expectedText;

    const candidates = candidateTexts(input);
    let best = {
      kind: "empty",
      similarity: 0,
      text: input.recognizedText || "",
      recognized: "",
      rank: -1,
    };
    if (!candidates.length) {
      best = { ...analyzeArabicMatch(plainText, ""), text: "" };
    }
    for (const text of candidates) {
      const analysis = analyzeArabicMatch(plainText || expectedText, text);
      if (analysis.rank > best.rank) best = { ...analysis, text };
    }

    const recognizedText = best.text || input.recognizedText || "";
    const wordMatchScore = best.kind === "empty" ? 0 : (best.similarity ?? similarityScore(expectedText, recognizedText));

    const providerLayer = this.assessmentProvider.align({
      providerPhonemes: input.providerPhonemes,
    });
    const fallbackLayer = this.phonemeProvider.align({
      target,
      recognizedText,
      expectedText,
    });

    const pronunciationScore = round(input.pronunciationScore);
    const wordAccuracy = round(input.wordAccuracy);
    const phonemeScore = providerLayer.available ? providerLayer.phonemeScore : fallbackLayer.phonemeScore;
    const vowelScore = fallbackLayer.vowelScore;
    const phonemeSource = providerLayer.available ? providerLayer.source : fallbackLayer.source || "unavailable";
    const weakPhonemes = providerLayer.available ? [] : (fallbackLayer.weakPhonemes || []);
    const confusableCount = fallbackLayer.confusableCount || 0;
    const otherMismatchCount = fallbackLayer.otherMismatchCount || 0;

    let overallScore = weightedMean([
      { weight: 0.34, value: wordMatchScore },
      { weight: 0.28, value: phonemeScore },
      { weight: 0.16, value: vowelScore },
      { weight: 0.22, value: pronunciationScore ?? wordAccuracy },
    ]);

    if (pronunciationScore != null && wordMatchScore >= 90 && pronunciationScore < 50) {
      overallScore = Math.min(overallScore, 58);
    }
    if (pronunciationScore != null && wordMatchScore >= 90 && pronunciationScore < 80) {
      overallScore = Math.min(overallScore, Math.max(overallScore, pronunciationScore + 8));
      if (pronunciationScore < 80) overallScore = Math.min(overallScore, 78);
    }
    if (confusableCount > 0) {
      overallScore = Math.min(overallScore, 48);
    }
    if (otherMismatchCount > 0 && best.kind !== "exact" && best.kind !== "contains" && best.kind !== "insertion") {
      overallScore = Math.min(overallScore, 52);
    }
    if (best.kind === "substitution") {
      overallScore = Math.min(overallScore, 45);
    }
    if (best.kind === "distant") {
      overallScore = Math.min(overallScore, 35);
    }
    if (best.kind === "empty") {
      overallScore = pronunciationScore != null && wordAccuracy != null
        ? Math.min(overallScore, 30)
        : 0;
    }

    overallScore = Math.round(Math.max(0, Math.min(100, overallScore)));

    const { status, childFeedback } = this.#decideStatus({
      thresholds,
      overallScore,
      wordMatchScore,
      phonemeScore,
      vowelScore,
      pronunciationScore,
      best,
      weakPhonemes,
      confusableCount,
      assessHarakat: question.assessHarakat !== false,
    });

    return {
      status,
      result: status.toLowerCase(),
      confidence: Number(input.confidence) || 0,
      recognizedText,
      expectedText,
      plainText,
      fullyVocalizedText: expectedText,
      pronunciationScore: pronunciationScore ?? phonemeScore ?? wordMatchScore,
      wordAccuracy,
      wordMatchScore,
      phonemeScore,
      vowelScore,
      overallScore,
      similarity: wordMatchScore,
      expectedNormalized: normalizeArabic(expectedText),
      recognizedNormalized: best.recognized || normalizeArabic(recognizedText),
      matchKind: best.kind,
      targetPhonemes: target.sequence || [],
      actualPhonemes: (fallbackLayer.phonemes || []).map((item) => item.id || item.symbol || ""),
      providerPhonemes: providerLayer.phonemes,
      phonemeSource,
      phonemeScoresFromProvider: Boolean(providerLayer.available),
      weakPhonemes,
      childFeedback,
      debug: {
        expected: expectedText,
        plain: plainText,
        targetPhonemes: (target.sequence || []).join(" "),
        recognized: recognizedText,
        actualPhonemes: (fallbackLayer.phonemes || []).map((item) => item.id || item.symbol || "").join(" "),
        wordMatch: wordMatchScore,
        phonemeScore,
        vowelScore,
        pronunciationScore,
        overall: overallScore,
        final: status,
        phonemeSource,
      },
    };
  }

  #decideStatus({
    thresholds,
    overallScore,
    wordMatchScore,
    phonemeScore,
    pronunciationScore,
    best,
    weakPhonemes,
    confusableCount,
  }) {
    const correctAt = thresholds.correct;
    const closeAt = thresholds.close;
    let status = "WRONG";

    const wordOk = best.kind === "exact" || best.kind === "contains" || best.kind === "insertion";
    const pronunciationOk = pronunciationScore == null || pronunciationScore >= correctAt;
    const pronunciationClose = pronunciationScore != null && pronunciationScore >= closeAt && pronunciationScore < correctAt;
    const pronunciationPoor = pronunciationScore != null && pronunciationScore < closeAt;
    const phonemesOk = phonemeScore == null || phonemeScore >= 78;
    const phonemesClose = phonemeScore != null && phonemeScore >= 55 && phonemeScore < 78;

    if (best.kind === "empty") {
      status = "WRONG";
    } else if (confusableCount > 0 || best.kind === "substitution") {
      status = wordMatchScore >= 70 ? "CLOSE" : "WRONG";
      if (confusableCount > 0 && phonemeScore != null && phonemeScore < 60) status = "WRONG";
      if (best.kind === "substitution") status = "WRONG";
    } else if (best.kind === "distant") {
      status = "WRONG";
    } else if (wordOk && pronunciationOk && phonemesOk && overallScore >= correctAt) {
      status = "CORRECT";
    } else if (wordOk && pronunciationPoor) {
      status = pronunciationScore < 40 ? "WRONG" : "CLOSE";
    } else if (wordOk && (pronunciationClose || phonemesClose || overallScore >= closeAt)) {
      status = "CLOSE";
    } else if (best.kind === "near" && overallScore >= closeAt) {
      status = "CLOSE";
    } else {
      status = overallScore >= correctAt && wordOk ? "CORRECT" : overallScore >= closeAt && wordMatchScore >= 70 ? "CLOSE" : "WRONG";
    }

    let childFeedback = {
      CORRECT: "ممتاز! نطقك رائع!",
      CLOSE: "قريب جدًا! جرّب مرة أخرى.",
      WRONG: "حاول مرة أخرى.",
    }[status];

    if ((status === "CLOSE" || status === "WRONG") && weakPhonemes.length === 1 && weakPhonemes[0].display) {
      childFeedback = status === "CLOSE"
        ? `ركز على صوت ${weakPhonemes[0].display}`
        : `جرب صوت ${weakPhonemes[0].display} مرة أخرى`;
    }

    return { status, childFeedback };
  }
}

export const arabicPronunciationAnalyzer = new ArabicPronunciationAnalyzer();
