import {
  extractLetterUnits,
  letterPhonemeId,
  normalizeArabicLetters,
  stripTashkeel,
} from "../utils/arabic.js";

export const CONSONANT_IDS = new Set([
  "hamza", "b", "t", "th", "j", "H", "x", "d", "dh", "r", "z", "s", "sh",
  "S", "D", "T", "Z", "ayn", "gh", "f", "q", "k", "l", "m", "n", "h", "w", "y",
]);

export const VOWEL_IDS = new Set(["a", "i", "u", "an", "in", "un", "aa", "ii", "uu"]);

export const LETTER_DISPLAY = {
  hamza: "ء",
  b: "ب",
  t: "ت",
  th: "ث",
  j: "ج",
  H: "ح",
  x: "خ",
  d: "د",
  dh: "ذ",
  r: "ر",
  z: "ز",
  s: "س",
  sh: "ش",
  S: "ص",
  D: "ض",
  T: "ط",
  Z: "ظ",
  ayn: "ع",
  gh: "غ",
  f: "ف",
  q: "ق",
  k: "ك",
  l: "ل",
  m: "م",
  n: "ن",
  h: "ه",
  w: "و",
  y: "ي",
};

const HARAKA_TO_VOWEL = {
  fatha: "a",
  kasra: "i",
  damma: "u",
  fathatan: "an",
  kasratan: "in",
  dammatan: "un",
};

export function graphemesToPhonemes(text = "") {
  const units = extractLetterUnits(text);
  const phonemes = [];
  const vowels = [];
  const consonants = [];

  for (const unit of units) {
    const consonantId = letterPhonemeId(unit.letter);
    if (!consonantId) continue;

    if (consonantId === "alif") {
      const vowel = { id: "aa", kind: "vowel", haraka: "alif", letter: unit.letter };
      phonemes.push(vowel);
      vowels.push(vowel);
      continue;
    }

    const geminate = unit.shadda ? 2 : 1;
    for (let i = 0; i < geminate; i += 1) {
      const item = {
        id: consonantId,
        kind: "consonant",
        letter: unit.letter,
        display: LETTER_DISPLAY[consonantId] || unit.letter,
        haraka: unit.haraka,
      };
      phonemes.push(item);
      consonants.push(item);
    }

    if (unit.haraka && unit.haraka !== "sukun") {
      const vowelId = HARAKA_TO_VOWEL[unit.haraka];
      if (vowelId) {
        const vowel = {
          id: vowelId,
          kind: "vowel",
          haraka: unit.haraka,
          letter: unit.letter,
        };
        phonemes.push(vowel);
        vowels.push(vowel);
      }
    }
  }

  return {
    phonemes,
    vowels,
    consonants,
    sequence: phonemes.map((item) => item.id),
    consonantSequence: consonants.map((item) => item.id),
    vowelSequence: vowels.map((item) => item.id),
    sourceText: String(text || ""),
  };
}

export function buildPronunciationTarget(fullyVocalizedText = "") {
  const g2p = graphemesToPhonemes(fullyVocalizedText);
  return {
    phonemes: g2p.phonemes,
    vowels: g2p.vowels,
    consonants: g2p.consonants,
    sequence: g2p.sequence,
    consonantSequence: g2p.consonantSequence,
    vowelSequence: g2p.vowelSequence,
    sourceText: fullyVocalizedText,
  };
}

export function buildQuestion({
  id,
  word,
  fullyVocalizedText,
  plainText,
  language = "ar-EG",
  audio = null,
  referenceAudioUrl = null,
  dialect = "msa",
  pronunciationMode = "fus7a",
  expectedPhonemes = null,
  expectedTashkeel = null,
  metadata = {},
  assessHarakat = true,
} = {}) {
  const displayText = word || fullyVocalizedText || "";
  const vocalized = fullyVocalizedText || displayText;
  const plain = plainText || stripTashkeel(vocalized);
  return {
    id,
    word: displayText,
    displayText,
    plainText: normalizeArabicLetters(plain),
    fullyVocalizedText: vocalized,
    expectedText: vocalized,
    pronunciationText: graphemesToPhonemes(vocalized).sequence.join(" "),
    language,
    audio,
    referenceAudioUrl,
    dialect,
    pronunciationMode,
    expectedPhonemes,
    expectedTashkeel,
    metadata,
    assessHarakat,
    pronunciationTarget: buildPronunciationTarget(vocalized),
  };
}
