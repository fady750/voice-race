import { USE_MOCK_SPEECH } from "../config.js";
import { LocalSpeechService } from "./LocalSpeechService.js";
import { MockSpeechService } from "./MockSpeechService.js";
import { RealSpeechService } from "./RealSpeechService.js";

export function createSpeechService() {
  if (USE_MOCK_SPEECH) {
    return new MockSpeechService();
  }
  // Browser speech recognition support is inconsistent on Android and Windows.
  // Use the server-backed recognizer in deployed builds; keep local recognition
  // available for development without requiring cloud credentials.
  return import.meta.env.PROD ? new RealSpeechService() : new LocalSpeechService();
}
