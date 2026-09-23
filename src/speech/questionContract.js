import { buildQuestion } from "./arabicG2P.js";

export function normalizePronunciationQuestion(input = {}) {
  const fullyVocalizedText = input.fullyVocalizedText || input.text || input.word || "";
  if (!input.id) throw new Error("Pronunciation questions require an id.");
  if (!fullyVocalizedText) throw new Error("Pronunciation questions require fullyVocalizedText.");

  return buildQuestion({
    ...input,
    id: input.id,
    word: input.text || input.word || fullyVocalizedText,
    fullyVocalizedText,
    referenceAudioUrl: input.referenceAudioUrl || input.referenceAudio || null,
    pronunciationMode: input.pronunciationMode || "fus7a",
    dialect: input.dialect || "msa",
    expectedPhonemes: input.expectedPhonemes || null,
    expectedTashkeel: input.expectedTashkeel || null,
    metadata: input.metadata || {},
  });
}
