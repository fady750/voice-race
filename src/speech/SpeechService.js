import { classifyAssessment } from "./classifyAssessment.js";

export class SpeechError extends Error {
  constructor(message, code = "speech_error") {
    super(message);
    this.name = "SpeechError";
    this.code = code;
  }
}

export function normalizePronunciationResult(input = {}) {
  return classifyAssessment(input);
}

export class SpeechService {
  isSupported() {
    return false;
  }

  async startRecording() {
    throw new SpeechError("Not implemented", "not_implemented");
  }

  async stopRecording() {
    throw new SpeechError("Not implemented", "not_implemented");
  }

  async cancelRecording() {}

  async assessPronunciation() {
    throw new SpeechError("Not implemented", "not_implemented");
  }
}
