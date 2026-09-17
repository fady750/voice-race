const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g;

export const HARAKA = {
  "\u064E": "fatha",
  "\u064B": "fathatan",
  "\u064F": "damma",
  "\u064C": "dammatan",
  "\u0650": "kasra",
  "\u064D": "kasratan",
  "\u0652": "sukun",
  "\u0651": "shadda",
};

export const CONFUSABLE_GROUPS = [
  ["s", "S"],
  ["z", "dh", "Z"],
  ["t", "T"],
  ["d", "D"],
  ["k", "q"],
  ["h", "H"],
  ["ayn", "hamza"],
  ["x", "gh"],
  ["th", "s"],
];

const LETTER_TO_PHONEME = {
  "ء": "hamza",
  "أ": "hamza",
  "إ": "hamza",
  "ؤ": "hamza",
  "ئ": "hamza",
  "ا": "alif",
  "آ": "alif",
  "ٱ": "alif",
  "ب": "b",
  "ت": "t",
  "ث": "th",
  "ج": "j",
  "ح": "H",
  "خ": "x",
  "د": "d",
  "ذ": "dh",
  "ر": "r",
  "ز": "z",
  "س": "s",
  "ش": "sh",
  "ص": "S",
  "ض": "D",
  "ط": "T",
  "ظ": "Z",
  "ع": "ayn",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ك": "k",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ه": "h",
  "ة": "h",
  "و": "w",
  "ي": "y",
  "ى": "y",
};

const CONFUSABLE_LOOKUP = new Map();
for (const group of CONFUSABLE_GROUPS) {
  for (const id of group) {
    CONFUSABLE_LOOKUP.set(id, new Set(group.filter((other) => other !== id)));
  }
}

export function isConfusablePhoneme(a, b) {
  if (!a || !b || a === b) return false;
  return CONFUSABLE_LOOKUP.get(a)?.has(b) || false;
}

export function letterPhonemeId(letter = "") {
  return LETTER_TO_PHONEME[letter] || "";
}

export function stripTashkeel(text = "") {
  return String(text).replace(TASHKEEL, "").replace(TATWEEL, "");
}

export function keepVocalization(text = "") {
  return String(text)
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(TATWEEL, "")
    .replace(/[^\u0621-\u063A\u0641-\u0652\u0670]/g, "")
    .trim();
}

export function normalizeArabicLetters(text = "") {
  return String(text)
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\u0621-\u063A\u0641-\u064A]/g, "")
    .trim();
}

export function normalizeArabic(text = "") {
  return normalizeArabicLetters(text);
}

export function normalizeArabicLoose(text = "") {
  return normalizeArabicLetters(text).replace(/ة/g, "ه");
}

export function extractLetterUnits(text = "") {
  const raw = keepVocalization(text);
  const units = [];
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (HARAKA[char]) continue;
    if (!letterPhonemeId(char) && char !== "ا" && char !== "آ" && char !== "ٱ") {
      if (!/[\u0621-\u064A]/.test(char)) continue;
    }
    let shadda = false;
    let haraka = "";
    let j = i + 1;
    while (j < raw.length && HARAKA[raw[j]]) {
      const mark = HARAKA[raw[j]];
      if (mark === "shadda") shadda = true;
      else haraka = mark;
      j += 1;
    }
    units.push({
      letter: char,
      phonemeId: letterPhonemeId(char) || char,
      haraka: haraka || "",
      shadda,
    });
    i = j - 1;
  }
  return units;
}

export function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost,
      );
    }
  }
  return grid[a.length][b.length];
}

export function alignSequences(expected = [], actual = []) {
  const rows = expected.length + 1;
  const cols = actual.length + 1;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = expected[i - 1] === actual[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost,
      );
    }
  }

  const pairs = [];
  let i = expected.length;
  let j = actual.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expected[i - 1] === actual[j - 1]) {
      pairs.push({ expected: expected[i - 1], actual: actual[j - 1], kind: "match" });
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && grid[i][j] === grid[i - 1][j - 1] + 1) {
      pairs.push({ expected: expected[i - 1], actual: actual[j - 1], kind: "substitute" });
      i -= 1;
      j -= 1;
    } else if (i > 0 && grid[i][j] === grid[i - 1][j] + 1) {
      pairs.push({ expected: expected[i - 1], actual: null, kind: "delete" });
      i -= 1;
    } else {
      pairs.push({ expected: null, actual: actual[j - 1], kind: "insert" });
      j -= 1;
    }
  }
  pairs.reverse();
  return { distance: grid[expected.length][actual.length], pairs };
}

export function similarityScore(expected, actual) {
  const a = normalizeArabicLetters(expected);
  const b = normalizeArabicLetters(actual);
  if (!a) return 0;
  if (a === b || normalizeArabicLoose(a) === normalizeArabicLoose(b)) return 100;
  if (!b) return 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round((1 - distance / maxLen) * 100);
}

export function analyzeArabicMatch(expectedText, recognizedText) {
  const expected = normalizeArabicLetters(expectedText);
  const recognized = normalizeArabicLetters(recognizedText);
  const expectedLoose = normalizeArabicLoose(expected);
  const recognizedLoose = normalizeArabicLoose(recognized);

  if (!expected) {
    return { kind: "empty", similarity: 0, expected, recognized, rank: 0 };
  }
  if (!recognized) {
    return { kind: "empty", similarity: 0, expected, recognized, rank: 0 };
  }
  if (expected === recognized || expectedLoose === recognizedLoose) {
    return { kind: "exact", similarity: 100, expected, recognized, rank: 100 };
  }
  if (recognized.includes(expected) && expected.length >= 2) {
    return { kind: "contains", similarity: 94, expected, recognized, rank: 90 };
  }

  const distance = levenshtein(expected, recognized);
  const maxLen = Math.max(expected.length, recognized.length);
  const similarity = Math.round((1 - distance / maxLen) * 100);
  const lengthDelta = recognized.length - expected.length;

  if (distance > 0 && distance === Math.abs(lengthDelta) && lengthDelta > 0 && lengthDelta <= 2) {
    return { kind: "insertion", similarity: Math.max(similarity, 86), expected, recognized, rank: 80 };
  }

  if (distance === 1 && recognized.length === expected.length) {
    return { kind: "substitution", similarity, expected, recognized, rank: 20 };
  }

  return {
    kind: similarity >= 50 ? "near" : "distant",
    similarity,
    expected,
    recognized,
    rank: similarity,
  };
}
