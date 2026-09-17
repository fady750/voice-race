import { USE_MOCK_SPEECH } from "../config.js";
import { MockSpeechService } from "./MockSpeechService.js";
import { RealSpeechService } from "./RealSpeechService.js";

export function createSpeechService() {
  if (USE_MOCK_SPEECH) {
    return new MockSpeechService();
  }
  return new RealSpeechService();
}
