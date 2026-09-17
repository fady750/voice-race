import { ASSETS, COINS, FEEDBACK_MS, QUESTION_TRANSITION_MS, RACE, RECORDING_MAX_MS, ROAD_SPEED, SPEECH_DEBUG } from "../config.js";
import { AudioManager } from "../audio/AudioManager.js";
import { Background } from "../components/Background.js";
import { BotCar, PlayerCar } from "../components/Cars.js";
import { Feedback } from "../components/Feedback.js";
import { ExitModal, FinishScreen } from "../components/FinishScreen.js";
import { GameHUD } from "../components/GameHUD.js";
import { InfiniteRoad } from "../components/InfiniteRoad.js";
import { RacePositionBar } from "../components/Indicators.js";
import { MicrophoneButton } from "../components/MicrophoneButton.js";
import { QuestionPanel } from "../components/QuestionPanel.js";
import { GameStateManager } from "./GameStateManager.js";
import { QuestionManager } from "./QuestionManager.js";
import { RaceManager } from "./RaceManager.js";
import { createSpeechService } from "../speech/createSpeechService.js";
import { logSpeechDebug, SpeechDebugPanel } from "../speech/speechDebug.js";
import { SpeechError } from "../speech/SpeechService.js";
import { smoothDamp } from "../utils/easing.js";

export class Game {
  constructor(root) {
    this.root = root;
    this.time = 0;
    this.lastFrame = 0;
    this.raf = 0;
    this.busy = false;
    this.roadBurst = 0;
    this.playerBurst = 0;
    this.botBurst = 0;
    this.recordTimer = null;
    this.feedbackTimer = null;
    this.audioReady = false;
    this.assessing = false;
    this.pendingQuestion = null;

    this.state = new GameStateManager();
    this.questions = new QuestionManager();
    this.race = new RaceManager();
    this.audio = new AudioManager();
    this.speech = createSpeechService();

    this.#build();
    this.#bind();
    this.resetRound(false);
  }

  #build() {
    this.root.innerHTML = "";
    this.root.className = "game-root";

    this.world = document.createElement("div");
    this.world.className = "game-world";
    this.ui = document.createElement("div");
    this.ui.className = "game-ui";
    this.root.append(this.world, this.ui);

    this.background = new Background(this.world, ASSETS.background);
    this.road = new InfiniteRoad(this.world, ASSETS.road);
    this.carLayer = document.createElement("div");
    this.carLayer.className = "car-layer";
    this.world.appendChild(this.carLayer);
    this.playerCar = new PlayerCar(this.carLayer, ASSETS.car1);
    this.botCar = new BotCar(this.carLayer, ASSETS.car2);

    this.hud = new GameHUD(this.ui);
    this.questionPanel = new QuestionPanel(this.ui);
    this.microphone = new MicrophoneButton(this.ui);
    this.raceBar = new RacePositionBar(this.ui, {
      playerSrc: ASSETS.user,
      botSrc: ASSETS.hakim,
    });
    this.feedback = new Feedback(this.ui);
    this.finish = new FinishScreen(this.ui);
    this.exitModal = new ExitModal(this.ui);

    this.particles = document.createElement("div");
    this.particles.className = "spark-layer";
    this.ui.appendChild(this.particles);
    if (SPEECH_DEBUG) this.speechDebug = new SpeechDebugPanel(this.ui);
  }

  #bind() {
    this.microphone.button.addEventListener("click", () => this.onMicPressed());
    this.questionPanel.speakerBtn.addEventListener("click", () => this.playWord());
    this.hud.closeBtn.addEventListener("click", () => this.exitModal.show());
    this.exitModal.stayBtn.addEventListener("click", () => this.exitModal.hide());
    this.exitModal.leaveBtn.addEventListener("click", () => {
      this.exitModal.hide();
      this.showFinish(true);
    });
    this.finish.replayBtn.addEventListener("click", () => this.resetRound(true));
    this.finish.exitBtn.addEventListener("click", () => this.exitModal.show());
    window.addEventListener("resize", () => this.#resize());
    window.addEventListener("pointerdown", () => this.#unlockAudio(), { once: true });

    const first = this.road.segments[0];
    if (first.complete) this.#resize();
    else first.addEventListener("load", () => this.#resize(), { once: true });
  }

  #unlockAudio() {
    this.audio.unlock();
    this.audioReady = true;
  }

  #resize() {
    this.background.resize();
    const road = this.road.onImageReady();
    this.carLayer.style.width = `${road.width}px`;
  }

  resetRound(fromFinish) {
    this.busy = false;
    this.assessing = false;
    this.pendingQuestion = null;
    this.clearTimers();
    this.questions.reset();
    this.race.reset();
    this.state.reset({ coins: COINS.start });
    this.roadBurst = 0;
    this.playerBurst = 0;
    this.botBurst = 0;
    this.feedback.hide();
    this.finish.hide();
    this.exitModal.hide();
    this.particles.replaceChildren();
    this.raceBar.reset();
    this.#syncQuestion();
    this.#syncHud();
    this.microphone.setState("idle");
    if (fromFinish) this.audio.playMicStart();
  }

  #syncQuestion() {
    const q = this.questions.current;
    if (!q) return;
    this.questionPanel.setWord(q.word);
    this.hud.setProgress(this.questions.number, this.questions.total);
    this.questionPanel.setDisabled(false);
  }

  #syncHud() {
    this.hud.setCoins(this.state.coins);
  }

  playWord() {
    const q = this.questions.current;
    if (!q || this.state.gameState === "finished") return;
    if (this.state.microphoneState === "recording" || this.state.microphoneState === "processing") {
      return;
    }
    this.#unlockAudio();
    this.audio.stopSpeech();
    this.audio.speakWord(q.fullyVocalizedText || q.word, q.language, q.audio);
  }

  async onMicPressed() {
    this.#unlockAudio();
    if (this.state.gameState === "finished" || this.busy || this.assessing) return;
    if (this.state.microphoneState === "processing") return;

    if (this.state.microphoneState === "recording") {
      await this.stopAndAssess();
      return;
    }

    if (!this.state.canRecord()) return;
    await this.startRecording();
  }

  async startRecording() {
    const q = this.questions.current;
    if (!q) return;
    try {
      this.busy = true;
      this.audio.stopSpeech();
      this.audio.muted = true;
      await this.#withTimeout(
        this.speech.startRecording({ language: q.language || "ar-EG" }),
        8000,
        "mic_timeout",
      );
      this.pendingQuestion = q;
      this.state.toRecording();
      this.microphone.setState("recording");
      this.busy = false;
      this.recordTimer = window.setTimeout(() => {
        if (this.state.microphoneState === "recording") {
          this.stopAndAssess();
        }
      }, RECORDING_MAX_MS);
    } catch (error) {
      this.busy = false;
      this.audio.muted = false;
      this.handleSpeechFailure(error);
    }
  }

  async stopAndAssess() {
    if (this.assessing) return;
    if (this.state.microphoneState !== "recording") return;
    this.assessing = true;
    this.clearTimers();
    const q = this.pendingQuestion || this.questions.current;
    const expectedText = q?.fullyVocalizedText || q?.expectedText;
    const language = q?.language || "ar-EG";
    const questionId = q?.id;
    try {
      this.busy = true;
      this.state.toProcessing();
      this.microphone.setState("processing");
      const audio = await this.#withTimeout(this.speech.stopRecording(), 5000, "stop_timeout");
      this.audio.muted = false;
      if (!expectedText) {
        throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "missing_expected");
      }
      if (this.questions.current?.id !== questionId) {
        throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "question_changed");
      }
      const assessment = await this.#withTimeout(
        this.speech.assessPronunciation(audio, expectedText, language, q),
        10000,
        "assess_timeout",
      );
      logSpeechDebug(assessment);
      this.applyResult(assessment);
    } catch (error) {
      this.audio.muted = false;
      this.handleSpeechFailure(error);
    } finally {
      this.busy = false;
      this.assessing = false;
      this.pendingQuestion = null;
    }
  }

  handleSpeechFailure(error) {
    this.clearTimers();
    this.audio.muted = false;
    this.speech.cancelRecording().catch(() => {});
    const message =
      error instanceof SpeechError
        ? error.message
        : "لم نتمكن من سماعك، حاول مرة أخرى.";
    this.state.failToIdle(message);
    this.microphone.setState("idle");
    this.feedback.show("error", message);
    this.feedbackTimer = window.setTimeout(() => this.feedback.hide(), 1800);
  }

  #withTimeout(promise, ms, code) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", code));
      }, ms);
      promise.then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          window.clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  applyResult(assessment) {
    const result = assessment?.result || String(assessment?.status || "").toLowerCase();
    if (result !== "correct" && result !== "close" && result !== "wrong") {
      this.handleSpeechFailure(new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "bad_result"));
      return;
    }
    this.state.toFeedback(result);
    this.microphone.setState(result);
    this.feedback.show(result, assessment.childFeedback);

    if (result === "correct") {
      this.race.applyCorrect();
      this.state.coins += COINS.correct;
      this.roadSpeedTarget = ROAD_SPEED + RACE.roadBurstCorrect;
      this.playerBurst = 0.08;
      this.playerCar.setGlow(true);
      this.audio.playCorrect();
      this.audio.playBoost();
      this.spawnSparks("correct");
    } else if (result === "close") {
      this.race.applyClose();
      this.state.coins += COINS.close;
      this.roadSpeedTarget = ROAD_SPEED + RACE.roadBurstClose;
      this.playerBurst = 0.04;
      this.playerCar.setGlow(true);
      this.audio.playClose();
      this.spawnSparks("close");
    } else {
      this.race.applyWrong();
      this.state.coins += COINS.wrong;
      this.botBurst = 0.05;
      this.botCar.setGlow(true);
      this.audio.playWrong();
    }

    this.#syncHud();
    this.feedbackTimer = window.setTimeout(() => this.advanceAfterFeedback(), FEEDBACK_MS);
  }

  advanceAfterFeedback() {
    this.feedback.hide();
    this.roadSpeedTarget = ROAD_SPEED;
    this.playerCar.setGlow(false);
    this.botCar.setGlow(false);
    this.questionPanel.setDisabled(true);

    if (this.questions.isLast) {
      this.showFinish(false);
      return;
    }

    this.state.microphoneState = "next_question";
    window.setTimeout(() => {
      this.questions.next();
      this.#syncQuestion();
      this.state.toIdle();
      this.microphone.setState("idle");
    }, QUESTION_TRANSITION_MS);
  }

  showFinish(fromExit) {
    this.clearTimers();
    this.state.toFinished();
    this.microphone.setState("idle");
    this.questionPanel.setDisabled(true);
    if (!fromExit) this.audio.playFinish();
    this.finish.show({
      playerWon: this.race.playerWon,
      playerProgress: this.race.playerProgress,
      botProgress: this.race.botProgress,
      coins: this.state.coins,
      totalQuestions: this.questions.total,
    });
  }

  spawnSparks(type) {
    const burst = document.createElement("div");
    burst.className = `spark-burst spark-${type}`;
    for (let i = 0; i < 8; i += 1) {
      const spark = document.createElement("span");
      spark.style.setProperty("--i", String(i));
      burst.appendChild(spark);
    }
    this.particles.appendChild(burst);
    window.setTimeout(() => burst.remove(), 900);
  }

  clearTimers() {
    if (this.recordTimer) {
      window.clearTimeout(this.recordTimer);
      this.recordTimer = null;
    }
    if (this.feedbackTimer) {
      window.clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  start() {
    this.lastFrame = performance.now();
    const loop = (stamp) => {
      const delta = Math.min(0.05, (stamp - this.lastFrame) / 1000);
      this.lastFrame = stamp;
      this.time = stamp / 1000;
      this.update(delta);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  update(deltaTime) {
    this.race.tick(deltaTime);
    this.raceBar.update(deltaTime, this.race.getRaceState());
    this.roadBurst *= 1 - Math.min(1, deltaTime * 2.4);
    this.road.setSpeed(ROAD_SPEED + this.roadBurst);
    this.road.update(deltaTime);
    this.background.update(deltaTime);

    const offsets = this.race.visualOffsets();
    this.playerCar.update({
      xPercent: 34,
      y: offsets.player,
      time: this.time,
      burst: this.playerBurst,
    });
    this.botCar.update({
      xPercent: 66,
      y: offsets.bot,
      time: this.time,
      burst: this.botBurst,
    });
  }
}
