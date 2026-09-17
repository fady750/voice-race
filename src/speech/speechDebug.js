import { SPEECH_DEBUG } from "../config.js";

export function logSpeechDebug(assessment) {
  if (!SPEECH_DEBUG || !assessment) return;
  const debug = assessment.debug || {};
  const lines = [
    "Expected:",
    debug.expected || assessment.fullyVocalizedText || assessment.expectedText || "",
    "",
    "Plain:",
    debug.plain || assessment.plainText || "",
    "",
    "Target phonemes:",
    debug.targetPhonemes || (assessment.targetPhonemes || []).join(" "),
    "",
    "Recognized:",
    debug.recognized || assessment.recognizedText || "",
    "",
    "Actual phonemes:",
    debug.actualPhonemes || (assessment.actualPhonemes || []).join(" "),
    "",
    "Word match:",
    String(assessment.wordMatchScore ?? ""),
    "",
    "Phoneme score:",
    assessment.phonemeScore == null ? "n/a" : String(assessment.phonemeScore),
    "",
    "Vowel score:",
    assessment.vowelScore == null ? "n/a" : String(assessment.vowelScore),
    "",
    "Pronunciation score:",
    assessment.pronunciationScore == null ? "n/a" : String(assessment.pronunciationScore),
    "",
    "Overall:",
    String(assessment.overallScore ?? ""),
    "",
    "Phoneme source:",
    assessment.phonemeSource || "",
    "",
    "Provider phonemes:",
    assessment.phonemeScoresFromProvider ? "yes" : "no",
    "",
    "Final:",
    assessment.status || String(assessment.result || "").toUpperCase(),
  ];
  console.info(`[SpeechDebug]\n${lines.join("\n")}`);
  window.dispatchEvent(new CustomEvent("speech-debug", { detail: lines.join("\n") }));
}

export class SpeechDebugPanel {
  constructor(root) {
    this.el = document.createElement("pre");
    this.el.className = "speech-debug-panel";
    this.el.hidden = true;
    root.appendChild(this.el);
    this.onUpdate = (event) => {
      this.el.textContent = event.detail;
      this.el.hidden = false;
    };
    if (SPEECH_DEBUG) {
      window.addEventListener("speech-debug", this.onUpdate);
    }
  }

  show(assessment) {
    if (!SPEECH_DEBUG || !assessment) return;
    logSpeechDebug(assessment);
  }
}
