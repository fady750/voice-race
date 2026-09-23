import { buildQuestion } from "../speech/arabicG2P.js";

const QUESTION_BLUEPRINTS = [
  {
    id: "ayn-hamza",
    text: "عَلِمَ",
    focus: ["ع / ء", "فتحة", "كسرة"],
    expectedConfusions: ["ءَلِمَ"],
  },
  {
    id: "ayn-ghayn",
    text: "غُرُوبٌ",
    focus: ["ع / غ", "ضمة", "واو المد", "تنوين الضم"],
    expectedConfusions: ["عُرُوبٌ"],
  },
  {
    id: "dad-zha",
    text: "ضَابِطٌ",
    focus: ["ض / ظ", "فتحة", "كسرة", "ألف المد", "تنوين الضم"],
    expectedConfusions: ["ظَابِطٌ"],
  },
  {
    id: "taa-ta",
    text: "الطَّائِرَةُ",
    focus: ["ط / ت", "شدة", "ألف المد", "همزة", "كسرة", "ضمة"],
    expectedConfusions: ["التَّائِرَةُ"],
  },
  {
    id: "dhal-dal",
    text: "ذَهَبَ",
    focus: ["ذ / د", "فتحة"],
    expectedConfusions: ["دَهَبَ"],
  },
  {
    id: "sad-seen",
    text: "صَبْرٌ",
    focus: ["ص / س", "فتحة", "سكون", "تنوين الضم"],
    expectedConfusions: ["سَبْرٌ"],
  },
  {
    id: "haa-haa",
    text: "حَافِظٌ",
    focus: ["ح / ه", "فتحة", "ألف المد", "كسرة", "تنوين الضم"],
    expectedConfusions: ["هَافِظٌ"],
  },
  {
    id: "qaf-kaf",
    text: "قُرْآنٌ",
    focus: ["ق / ك", "ضمة", "سكون", "همزة", "ألف المد", "تنوين الضم"],
    expectedConfusions: ["كُرْآنٌ"],
  },
  {
    id: "khaa-ghayn",
    text: "خَبِيرٌ",
    focus: ["خ / غ", "فتحة", "كسرة", "ياء المد", "تنوين الضم"],
    expectedConfusions: ["غَبِيرٌ"],
  },
  {
    id: "connected-sentence",
    text: "ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ مُبَكِّرًا",
    focus: ["ر في سياق مفخم ومرقق", "ذ / د", "ط / ت", "شدة", "فتحة", "كسرة", "ضمة", "تنوين الفتح", "سكون", "ألف المد", "حدود الكلمات"],
    expectedConfusions: ["دَهَبَ التَّالِبُ إِلَى الْمَدْرَسَةِ مُبَكِرًا"],
  },
];

function buildDatasetQuestion({ id, text, focus, expectedConfusions }) {
  return {
    ...buildQuestion({ id, word: text, fullyVocalizedText: text, language: "ar-EG" }),
    pronunciationFocus: focus,
    expectedConfusions,
  };
}

/**
 * A fresh, validated dataset for every game session. There is intentionally no
 * silent five-question fallback: a broken lesson dataset must be fixed at its source.
 */
export function createQuestions() {
  const questions = QUESTION_BLUEPRINTS.map(buildDatasetQuestion);
  if (questions.length !== 10 || new Set(questions.map((question) => question.id)).size !== 10) {
    throw new Error("Arabic pronunciation dataset must contain exactly 10 unique questions.");
  }
  return questions;
}

// Retained for modules that need a read-only default; sessions use createQuestions().
export const QUESTIONS = createQuestions();
