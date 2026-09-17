import { MOCK_PROCESSING_MS, MOCK_RECORDING_MS } from "../config.js";
import { SpeechError, SpeechService, normalizePronunciationResult } from "./SpeechService.js";

const MOCK_SEQUENCE = ["correct", "close", "correct", "wrong", "correct"];

const SCORE_BY_RESULT = {
  correct: 92,
  close: 68,
  wrong: 22,
};

export class MockSpeechService extends SpeechService {
  constructor() {
    super();
    this.recording = false;
    this.index = 0;
    this.startedAt = 0;
    this.forcedResult = null;
    this.stopped = false;
  }

  isSupported() {
    return true;
  }

  setForcedResult(result) {
    this.forcedResult = result;
  }

  async startRecording() {
    if (this.recording) return;
    this.recording = true;
    this.stopped = false;
    this.startedAt = performance.now();
  }

  async stopRecording() {
    if (!this.recording && !this.stopped) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "not_recording");
    }
    this.recording = false;
    this.stopped = true;
    const elapsed = performance.now() - this.startedAt;
    const remaining = Math.max(0, MOCK_RECORDING_MS - elapsed);
    if (remaining) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
    return { type: "mock-audio", durationMs: elapsed, complete: true };
  }

  async cancelRecording() {
    this.recording = false;
    this.stopped = false;
  }

  async assessPronunciation(audio, expectedText, language = "ar-EG", question = null) {
    if (!this.stopped && audio?.complete !== true) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "not_stopped");
    }
    this.stopped = false;
    await new Promise((resolve) => window.setTimeout(resolve, MOCK_PROCESSING_MS));
    const mapped = this.forcedResult || MOCK_SEQUENCE[this.index % MOCK_SEQUENCE.length];
    this.forcedResult = null;
    this.index += 1;
    const pronunciationScore = SCORE_BY_RESULT[mapped] ?? 20;
    const recognizedText = mapped === "wrong" ? "سيارة" : expectedText;
    return normalizePronunciationResult({
      expectedText,
      recognizedText,
      alternatives: recognizedText ? [recognizedText] : [],
      pronunciationScore,
      wordAccuracy: pronunciationScore,
      confidence: pronunciationScore / 100,
      question,
    });
  }
}
