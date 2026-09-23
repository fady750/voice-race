import { USE_MOCK_SPEECH } from "../config.js";
import { LocalSpeechService } from "./LocalSpeechService.js";
import { MockSpeechService } from "./MockSpeechService.js";

export function createSpeechService() {
  if (USE_MOCK_SPEECH) {
    return new MockSpeechService();
  }
  return new LocalSpeechService();
}
