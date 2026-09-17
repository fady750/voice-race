export class GameStateManager {
  constructor() {
    this.gameState = "playing";
    this.microphoneState = "idle";
    this.answerState = null;
    this.coins = 0;
    this.errorMessage = "";
  }

  canRecord() {
    return this.gameState === "playing" && this.microphoneState === "idle";
  }

  reset({ coins }) {
    this.gameState = "playing";
    this.microphoneState = "idle";
    this.answerState = null;
    this.coins = coins;
    this.errorMessage = "";
  }

  toRecording() {
    this.gameState = "recording";
    this.microphoneState = "recording";
    this.answerState = null;
    this.errorMessage = "";
  }

  toProcessing() {
    this.gameState = "processing";
    this.microphoneState = "processing";
  }

  toFeedback(result) {
    this.gameState = "feedback";
    this.microphoneState = result;
    this.answerState = result;
  }

  toIdle() {
    this.gameState = "playing";
    this.microphoneState = "idle";
    this.answerState = null;
    this.errorMessage = "";
  }

  toFinished() {
    this.gameState = "finished";
    this.microphoneState = "idle";
  }

  failToIdle(message) {
    this.gameState = "playing";
    this.microphoneState = "idle";
    this.answerState = null;
    this.errorMessage = message;
  }
}
