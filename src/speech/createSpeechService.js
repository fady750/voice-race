import { USE_MOCK_SPEECH } from "../config.js";
import { LocalSpeechService } from "./LocalSpeechService.js";
import { MockSpeechService } from "./MockSpeechService.js";
import { RealSpeechService } from "./RealSpeechService.js";

export function createSpeechService() {
  if (USE_MOCK_SPEECH) {
    return new MockSpeechService();
  }
  // Forced to use local recognition to avoid requiring Azure backend keys
  return new LocalSpeechService();
}
