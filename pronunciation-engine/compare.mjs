import { CONFUSABLE_PAIRS, DISPLAY, cloneTokens, formatPhonemes, phonemizeArabic } from "./arabic-phonemes.mjs";

const DEFAULT_TOLERANCE = {
  // Ratios to the child's own median short-vowel / consonant duration, not fixed milliseconds.
  longVowelRatio: [1.45, 4.2],
  geminateRatio: [1.3, 4.5],
  minConfidence: 0.55,
};

function align(expected, detected) {
  const rows = expected.length + 1;
  const cols = detected.length + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const equal = expected[i - 1].id === detected[j - 1].id && expected[i - 1].kind === detected[j - 1].kind;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + (equal ? 0 : 1));
    }
  }
  const pairs = [];
  let i = expected.length;
  let j = detected.length;
  while (i || j) {
    if (i && j && expected[i - 1].id === detected[j - 1].id && expected[i - 1].kind === detected[j - 1].kind) {
      pairs.push({ kind: "match", expected: expected[i - 1], detected: detected[j - 1] }); i -= 1; j -= 1;
    } else if (i && j && grid[i][j] === grid[i - 1][j - 1] + 1) {
      pairs.push({ kind: "substitution", expected: expected[i - 1], detected: detected[j - 1] }); i -= 1; j -= 1;
    } else if (i && grid[i][j] === grid[i - 1][j] + 1) {
      pairs.push({ kind: "deletion", expected: expected[i - 1], detected: null }); i -= 1;
    } else {
      pairs.push({ kind: "insertion", expected: null, detected: detected[j - 1] }); j -= 1;
    }
  }
  return pairs.reverse();
}

function errorType(pair) {
  const expected = pair.expected;
  const detected = pair.detected;
  if (pair.kind === "substitution" && expected?.kind === "consonant" && detected?.kind === "consonant") return "phoneme";
  if (pair.kind === "deletion" && expected?.kind === "consonant" && expected.features?.shadda) return "missing_shadda";
  if (pair.kind === "insertion" && detected?.kind === "consonant" && detected.features?.shadda) return "extra_shadda";
  if (expected?.kind === "vowel") {
    if (expected.features?.tanween) return "tanween";
    if (expected.features?.long || ["aa", "ii", "uu"].includes(expected.id)) return "madd";
    return "haraka";
  }
  if (detected?.kind === "vowel" && ["aa", "ii", "uu"].includes(detected.id)) return "madd";
  if (expected?.kind === "consonant" && expected.features?.sukun) return "sukun";
  return "phoneme";
}

function featureErrors(pairs) {
  return pairs.flatMap((pair, index) => {
    if (pair.kind !== "match" || pair.expected?.kind !== "consonant" || pair.detected?.kind !== "consonant") return [];
    const position = pair.expected.sourceIndex ?? index;
    const common = {
      position,
      expected: { id: pair.expected.id, display: pair.expected.display || DISPLAY[pair.expected.id] || pair.expected.id },
      detected: { id: pair.detected.id, display: pair.detected.display || DISPLAY[pair.detected.id] || pair.detected.id },
      relation: "feature_mismatch",
    };
    if (Boolean(pair.expected.features?.sukun) !== Boolean(pair.detected.features?.sukun)) {
      return [{ ...common, type: "sukun" }];
    }
    if (Boolean(pair.expected.features?.shadda) && !Boolean(pair.detected.features?.shadda)) {
      return [{ ...common, type: "missing_shadda" }];
    }
    return [];
  });
}

function readableError(pair, position) {
  const expected = pair.expected || null;
  const detected = pair.detected || null;
  const type = errorType(pair);
  return {
    position,
    expected: expected ? { id: expected.id, display: expected.display || DISPLAY[expected.id] || expected.id } : null,
    detected: detected ? { id: detected.id, display: detected.display || DISPLAY[detected.id] || detected.id } : null,
    type,
    relation: expected && detected && CONFUSABLE_PAIRS.has(`${expected.id}:${detected.id}`) ? "similar_letter" : pair.kind,
  };
}

function timingErrors(pairs, tolerance) {
  const matched = pairs.filter((pair) => pair.kind === "match" && pair.expected.kind !== "boundary" && pair.detected?.durationMs > 0);
  const shortVowels = matched.filter((pair) => pair.expected.kind === "vowel" && !pair.expected.features?.long).map((pair) => pair.detected.durationMs);
  const consonants = matched.filter((pair) => pair.expected.kind === "consonant" && !pair.expected.features?.shadda).map((pair) => pair.detected.durationMs);
  const median = (items) => {
    const sorted = [...items].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  };
  const shortBase = median(shortVowels);
  const consonantBase = median(consonants);
  const errors = [];
  for (const pair of matched) {
    const isLong = pair.expected.kind === "vowel" && pair.expected.features?.long;
    const isGeminate = pair.expected.kind === "consonant" && pair.expected.features?.shadda;
    const base = isLong ? shortBase : isGeminate ? consonantBase : null;
    if (!base) continue;
    const ratio = pair.detected.durationMs / base;
    const range = isLong ? tolerance.longVowelRatio : tolerance.geminateRatio;
    if (ratio < range[0] || ratio > range[1]) {
      errors.push({
        position: pair.expected.sourceIndex,
        expected: { id: pair.expected.id, display: pair.expected.display },
        detected: { id: pair.detected.id, display: pair.detected.display },
        type: isLong ? "madd_duration" : "shadda_duration",
        observedRatio: Number(ratio.toFixed(2)),
        acceptableRatio: range,
      });
    }
  }
  return errors;
}

function section(errors, types) {
  const relevant = errors.filter((item) => types.includes(item.type));
  return { correct: relevant.length === 0, errors: relevant };
}

/**
 * Compares a fully vocalized reference with phonemes emitted by a LOCAL model/alignment layer.
 * The caller supplies detected phonemes; this function deliberately has no STT fallback.
 */
export function evaluatePronunciation({ word, expectedText, detectedPhonemes, confidence = 1, tolerance = {} } = {}) {
  if (!expectedText) throw new Error("expectedText must be fully vocalized Arabic.");
  if (!Array.isArray(detectedPhonemes)) throw new Error("detectedPhonemes must come from an acoustic phoneme model/alignment layer.");
  const expected = phonemizeArabic(expectedText);
  const detected = cloneTokens(detectedPhonemes);
  const pairs = align(expected, detected);
  const discreteErrors = pairs
    .filter((pair) => pair.kind !== "match" && pair.expected?.kind !== "boundary" && pair.detected?.kind !== "boundary")
    .map((pair, index) => readableError(pair, pair.expected?.sourceIndex ?? pair.detected?.sourceIndex ?? index));
  const errors = [
    ...discreteErrors,
    ...featureErrors(pairs),
    ...timingErrors(pairs, { ...DEFAULT_TOLERANCE, ...tolerance }),
  ];
  const expectedCount = expected.filter((token) => token.kind !== "boundary").length || 1;
  const score = Math.max(0, Math.round(100 * (1 - errors.length / expectedCount)));
  const confidenceTooLow = Number(confidence) < (tolerance.minConfidence ?? DEFAULT_TOLERANCE.minConfidence);
  return {
    word: word || expectedText,
    expected: formatPhonemes(expected),
    detected: formatPhonemes(detected),
    score,
    correct: errors.length === 0 && !confidenceTooLow,
    needsRetry: confidenceTooLow,
    errors,
    harakat: section(errors, ["haraka", "tanween", "sukun"]),
    shadda: section(errors, ["missing_shadda", "extra_shadda", "shadda_duration"]),
    madd: section(errors, ["madd", "madd_duration"]),
    alignment: pairs.map((pair) => ({ kind: pair.kind, expected: pair.expected?.id || null, detected: pair.detected?.id || null })),
  };
}
