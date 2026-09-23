const MARKS = {
  "َ": "fatha",
  "ُ": "damma",
  "ِ": "kasra",
  "ً": "fathatan",
  "ٌ": "dammatan",
  "ٍ": "kasratan",
  "ْ": "sukun",
  "ّ": "shadda",
};

const LETTERS = {
  "ء": "hamza", "أ": "hamza", "إ": "hamza", "ؤ": "hamza", "ئ": "hamza",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "H", "خ": "x",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "S", "ض": "D", "ط": "T", "ظ": "Z", "ع": "ayn", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "ة": "h", "و": "w", "ي": "y", "ى": "y",
};

const VOWELS = {
  fatha: "a", damma: "u", kasra: "i",
  fathatan: "an", dammatan: "un", kasratan: "in",
};

const LONG_FOR = { fatha: "aa", damma: "uu", kasra: "ii" };

export const DISPLAY = {
  hamza: "ء", b: "ب", t: "ت", th: "ث", j: "ج", H: "ح", x: "خ", d: "د", dh: "ذ",
  r: "ر", z: "ز", s: "س", sh: "ش", S: "ص", D: "ض", T: "ط", Z: "ظ", ayn: "ع",
  gh: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه", w: "و", y: "ي",
  a: "َ", i: "ِ", u: "ُ", an: "ً", in: "ٍ", un: "ٌ", aa: "ا", ii: "ي", uu: "و",
};

export const CONFUSABLE_PAIRS = new Set([
  "ayn:gh", "H:h", "H:x", "x:gh", "D:Z", "D:d", "T:t", "Z:dh", "S:s", "q:k", "th:s", "dh:z",
].flatMap((pair) => {
  const [left, right] = pair.split(":");
  return [pair, `${right}:${left}`];
}));

function isArabicLetter(char) {
  return Boolean(LETTERS[char]) || char === "ا" || char === "آ" || char === "ٱ";
}

function units(text) {
  const result = [];
  const normalized = String(text || "").normalize("NFC");
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (/\s/.test(char)) {
      result.push({ kind: "boundary" });
      continue;
    }
    if (!isArabicLetter(char)) continue;
    const marks = new Set();
    let end = index + 1;
    while (end < normalized.length && MARKS[normalized[end]]) {
      marks.add(MARKS[normalized[end]]);
      end += 1;
    }
    result.push({ letter: char, marks, sourceIndex: index });
    index = end - 1;
  }
  return result;
}

function vowelToken(id, unit, options = {}) {
  return {
    id,
    kind: "vowel",
    display: DISPLAY[id],
    sourceIndex: unit.sourceIndex,
    features: {
      haraka: options.haraka || id,
      tanween: ["an", "in", "un"].includes(id),
      long: ["aa", "ii", "uu"].includes(id),
    },
  };
}

function consonantToken(id, unit, options = {}) {
  return {
    id,
    kind: "consonant",
    display: DISPLAY[id] || unit.letter,
    sourceIndex: unit.sourceIndex,
    features: {
      sukun: Boolean(options.sukun),
      shadda: Boolean(options.shadda),
      geminatePart: options.geminatePart || 0,
    },
  };
}

function previousVowel(tokens) {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i].kind === "boundary") return null;
    if (tokens[i].kind === "vowel") return tokens[i];
  }
  return null;
}

function isLongCarrier(unit, previous) {
  if (!previous || previous.kind !== "vowel") return false;
  if (unit.letter === "ا" || unit.letter === "ى") return previous.id === "a";
  if (unit.letter === "و") return previous.id === "u";
  if (unit.letter === "ي") return previous.id === "i";
  return false;
}

/**
 * Convert fully vocalized Arabic into a deliberately compact phoneme schema.
 * It is deterministic reference generation, not acoustic recognition.
 */
export function phonemizeArabic(fullyVocalizedText) {
  const tokens = [];
  for (const unit of units(fullyVocalizedText)) {
    if (unit.kind === "boundary") {
      if (tokens.at(-1)?.kind !== "boundary") tokens.push({ id: "|", kind: "boundary", display: " " });
      continue;
    }

    if (unit.letter === "آ") {
      const hamza = consonantToken("hamza", unit);
      tokens.push(hamza, vowelToken("aa", unit, { haraka: "madda" }));
      continue;
    }
    if (unit.letter === "ٱ") continue; // hamzat-wasl is omitted in connected reference speech.

    const previous = previousVowel(tokens);
    if (isLongCarrier(unit, previous)) {
      previous.id = LONG_FOR[previous.features.haraka];
      previous.display = DISPLAY[previous.id];
      previous.features.long = true;
      continue;
    }
    if (unit.letter === "ا") continue; // silent alif carrier after an initial hamza or in orthography.

    const id = LETTERS[unit.letter];
    if (!id) continue;
    const isShadda = unit.marks.has("shadda");
    if (isShadda) tokens.push(consonantToken(id, unit, { sukun: true, shadda: true, geminatePart: 1 }));
    tokens.push(consonantToken(id, unit, {
      sukun: unit.marks.has("sukun"),
      shadda: isShadda,
      geminatePart: isShadda ? 2 : 0,
    }));
    const haraka = [...unit.marks].find((mark) => VOWELS[mark]);
    if (haraka) tokens.push(vowelToken(VOWELS[haraka], unit, { haraka }));
  }
  while (tokens.at(-1)?.kind === "boundary") tokens.pop();
  return tokens;
}

export function formatPhonemes(tokens) {
  return (tokens || []).filter((token) => token.kind !== "boundary").map((token) => token.id);
}

export function cloneTokens(tokens) {
  return (tokens || []).map((token) => ({ ...token, features: { ...(token.features || {}) } }));
}

export function replaceFirst(tokens, expectedId, detectedId) {
  const copy = cloneTokens(tokens);
  const item = copy.find((token) => token.id === expectedId);
  if (!item) throw new Error(`Could not find ${expectedId} in test sequence.`);
  item.id = detectedId;
  item.display = DISPLAY[detectedId] || detectedId;
  return copy;
}

export function removeFirst(tokens, predicate) {
  const index = tokens.findIndex(predicate);
  if (index < 0) throw new Error("Could not find requested test token.");
  return [...cloneTokens(tokens.slice(0, index)), ...cloneTokens(tokens.slice(index + 1))];
}
