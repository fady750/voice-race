import { ASSETS, COINS, FEEDBACK_MS, QUESTION_TRANSITION_MS, RACE, RECORDING_MAX_MS, SPEECH_DEBUG } from "../config.js";
import { AudioManager } from "../audio/AudioManager.js";
import { Background } from "../components/Background.js";
import { BotCar, PlayerCar } from "../components/Cars.js";
import { Feedback } from "../components/Feedback.js";
import { ExitModal } from "../components/FinishScreen.js";
import { Celebration } from "../Celebration/Celebration.js";
import { ResultsPanel } from "../ResultsPanel/ResultsPanel.js";
import { WelcomeScreen } from "../WelcomeScreen/WelcomeScreen.js";
import { GameHUD } from "../components/GameHUD.js";
import { InfiniteRoad } from "../components/InfiniteRoad.js";
import { RacePositionBar } from "../components/Indicators.js";
import { MicrophoneButton } from "../components/MicrophoneButton.js";
import { QuestionPanel } from "../components/QuestionPanel.js";
import { GameStateManager } from "./GameStateManager.js";
import { QuestionManager } from "./QuestionManager.js";
import { createQuestions } from "../data/questions.js";
import { RaceManager } from "./RaceManager.js";
import { createSpeechService } from "../speech/createSpeechService.js";
import { logSpeechDebug, SpeechDebugPanel } from "../speech/speechDebug.js";
import { SpeechError } from "../speech/SpeechService.js";
import { smoothDamp } from "../utils/easing.js";
import { api } from "../utils/api.js";

export class Game {
  constructor(root, questionProvider = createQuestions) {
    this.root = root;
    this.time = 0;
    this.lastFrame = 0;
    this.raf = 0;
    this.busy = false;
    this.playerBurst = 0;
    this.botBurst = 0;
    this.recordTimer = null;
    this.feedbackTimer = null;
    this.audioReady = false;
    this.assessing = false;
    this.pendingQuestion = null;
    this.questionProvider = questionProvider;

    this.state = new GameStateManager();
    this.questions = new QuestionManager(this.questionProvider());
    this.race = new RaceManager({ totalQuestions: this.questions.total });
    this.audio = new AudioManager();
    this.speech = createSpeechService();

    this.sessionStats = {
      totalQuestions: 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      retries: 0,
    };

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
    this.celebration = new Celebration(this.ui);
    this.resultsPanel = new ResultsPanel(this.ui, {
      onRetry: () => this.resetRound(true),
      onBack: () => window.location.reload()
    });
    this.exitModal = new ExitModal(this.ui);
    this.welcomeScreen = new WelcomeScreen(this.ui, {
      onStart: () => this.beginGame()
    });

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

    const finishRect = this.road.finishLine.getBoundingClientRect();
    const carHeight = this.playerCar.el.clientHeight || 126;
    const carDefaultTopY = this.world.getBoundingClientRect().bottom - (this.world.clientHeight * 0.16) - carHeight;
    const finishBottomY = finishRect.bottom;
    
    // Y translation required to move the car's top edge to the finish line's bottom edge
    this.maxTravel = finishBottomY - carDefaultTopY;
  }

  resetRound(fromFinish) {
    this.busy = false;
    this.assessing = false;
    this.pendingQuestion = null;
    this.isExiting = false;
    this.exitDistance = 0;
    this.clearTimers();
    // Do not reuse a previous session's array or progress. The dataset factory
    // supplies a fresh validated set of the intended ten pronunciation prompts.
    this.questions.reset(this.questionProvider());
    this.race.setTotalQuestions(this.questions.total);
    this.sessionStats = {
      totalQuestions: this.questions.total,
      answeredQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      retries: 0,
    };
    this.race.reset();
    this.road.setQuestionCount(this.questions.total);
    this.state.reset({ coins: COINS.start });
    this.playerBurst = 0;
    this.botBurst = 0;
    this.feedback.hide();
    this.celebration.hide();
    this.resultsPanel.hide();
    this.exitModal.hide();
    this.particles.replaceChildren();
    this.raceBar.reset();
    this.#syncHud();
    this.microphone.setState("idle");

    if (fromFinish) {
      if (api.hasToken) {
        api.startGameSession().catch(e => console.error(e));
      }
      this.#syncQuestion();
      this.audio.playMicStart();
    } else {
      this.welcomeScreen.show(this.questions.total);
    }
  }

  beginGame() {
    this.welcomeScreen.hide();
    if (api.hasToken) {
      api.startGameSession().catch(e => console.error(e));
    }
    this.#syncQuestion();
    this.audio.playMicStart();
  }

  #syncQuestion() {
    const q = this.questions.current;
    if (!q) return;
    this.questionStartTime = Date.now();
    this.questionPanel.setWord(q.word);
    this.hud.setProgress(this.questions.number, this.questions.total);
    this.questionPanel.setDisabled(false);
    this.playWord();
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
    this.audio.speakWord(q.fullyVocalizedText || q.word, q.language, q.audio || q.referenceAudioUrl);
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
      this.#logPronunciation("Recording started");
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
      this.#logPronunciation("Audio received");
      this.#logPronunciation(`Expected: ${expectedText}`);
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
      this.#logPronunciation(`Detected: ${assessment.recognizedText || "(none)"}`);
      this.#logPronunciation(`Phoneme result: ${assessment.phonemeScore ?? "unavailable"}`);
      this.#logPronunciation(`Harakat result: ${assessment.vowelScore ?? "unavailable"}`);
      this.#logPronunciation(`Shadda result: ${assessment.shadda?.correct ?? "unavailable"}`);
      this.#logPronunciation(`Madd result: ${assessment.madd?.correct ?? "unavailable"}`);
      this.#logPronunciation(`Final score: ${assessment.overallScore ?? "unavailable"}`);
      this.#logPronunciation(`Correct: ${assessment.result === "correct"}`);
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
    this.sessionStats.retries += 1;
    this.clearTimers();
    this.audio.muted = false;
    this.speech.cancelRecording().catch(() => {});
    if (import.meta.env.DEV) {
      console.error(`[Pronunciation] Failed (${error?.code || "unknown"}):`, error);
    }
    const message =
      error instanceof SpeechError
        ? error.message
        : "لم نتمكن من سماعك، حاول مرة أخرى.";
    this.state.failToIdle(message);
    this.microphone.setState("idle");
    this.feedback.show("error", null);
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

  #logPronunciation(message) {
    if (import.meta.env.DEV) console.info(`[Pronunciation] ${message}`);
  }

  applyResult(assessment) {
    const q = this.questions.current;
    const result = assessment?.result || String(assessment?.status || "").toLowerCase();
    if (result !== "correct" && result !== "close" && result !== "wrong") {
      this.handleSpeechFailure(new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "bad_result"));
      return;
    }
    
    if (api.hasToken && q) {
      const timeTaken = Math.round((Date.now() - (this.questionStartTime || Date.now())) / 1000);
      const selectedAnswer = result === "correct" ? q.word : q.word + q.word;
      api.submitAnswer(q.id, selectedAnswer, timeTaken).catch(e => console.error(e));
    }

    this.state.toFeedback(result);
    this.race.resolveQuestion({ playerCorrect: result === "correct" });
    this.microphone.setState(result);
    this.feedback.show(result, null);
    
    this.sessionStats.answeredQuestions += 1;
    this.state.coins += 1; // +1 coin for completing the question

    if (result === "correct") {
      this.sessionStats.correctAnswers += 1;
      this.race.applyCorrect();
      this.playerBurst = 0.08;
      this.playerCar.setGlow(true);
      this.audio.playCorrect();
      this.audio.playBoost();
      this.spawnSparks("correct");
    } else if (result === "close") {
      this.race.applyClose();
      this.playerBurst = 0.04;
      this.playerCar.setGlow(true);
      this.audio.playClose();
      this.spawnSparks("close");
    } else {
      this.sessionStats.wrongAnswers += 1;
      this.race.applyWrong();
      this.botBurst = 0.05;
      this.botCar.setGlow(true);
      this.audio.playWrong();
    }

    this.#syncHud();
    this.feedbackTimer = window.setTimeout(() => this.advanceAfterFeedback(), FEEDBACK_MS);
  }

  advanceAfterFeedback() {
    this.feedback.hide();
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

    const finalize = async () => {
      let apiStats = null;
      if (api.hasToken) {
        try {
          apiStats = await api.completeGame();
        } catch (e) {
          console.error(e);
        }
      }

      const data = {
        score: apiStats?.score ?? this.sessionStats.correctAnswers,
        totalScore: this.sessionStats.totalQuestions,
        correctAnswers: this.sessionStats.correctAnswers,
        wrongAnswers: this.sessionStats.wrongAnswers,
        coins: apiStats?.coins ?? this.state.coins,
        playerProgress: this.race.playerProgress,
        botProgress: this.race.botProgress
      };
      
      if (this.sessionStats.correctAnswers > 0) {
        this.celebration.show(() => {
          this.resultsPanel.show(data);
        });
      } else {
        this.resultsPanel.show(data);
      }
    };

    if (fromExit) {
      finalize();
    } else {
      this.audio.playFinish();
      window.setTimeout(() => {
        this.isExiting = true;
        this.onExitComplete = finalize;
      }, 800);
    }
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
    
    // The road is static now.
    this.road.setProgress(0);
    this.background.update(deltaTime);

    const offsets = this.race.visualOffsets();
    
    const isFinished = this.state.current === "finished";
    const playerProgress = isFinished ? Math.min(100, offsets.player) : offsets.player;
    const botProgress = isFinished ? Math.min(100, offsets.bot) : offsets.bot;
    
    const playerSurge = isFinished ? 0 : offsets.playerSurge;
    const botSurge = isFinished ? 0 : offsets.botSurge;
    const hoverTime = isFinished ? 0 : this.time; // freeze hover if finished

    const maxTravel = this.maxTravel || -(this.world.clientHeight * 0.72);
    
    let playerY = (playerProgress / 100) * maxTravel + playerSurge;
    let botY = (botProgress / 100) * maxTravel + botSurge;
    
    // Strict visual safety clamp: Y must not go further negative (higher) than maxTravel
    if (!this.isExiting) {
      playerY = Math.max(playerY, maxTravel);
      botY = Math.max(botY, maxTravel);
    } else {
      this.exitDistance = (this.exitDistance || 0) + (1200 * deltaTime);
      playerY -= this.exitDistance;
      botY -= this.exitDistance;
      
      if (playerY < -this.world.clientHeight * 1.5 && botY < -this.world.clientHeight * 1.5) {
        if (this.onExitComplete) {
          const cb = this.onExitComplete;
          this.onExitComplete = null;
          cb();
        }
      }
    }

    this.playerCar.update({
      xPercent: 34,
      y: playerY,
      time: hoverTime,
      burst: isFinished ? 0 : this.playerBurst,
      tilt: isFinished ? 0 : offsets.playerTilt,
    });
    this.botCar.update({
      xPercent: 66,
      y: botY,
      time: hoverTime,
      burst: isFinished ? 0 : this.botBurst,
      tilt: isFinished ? 0 : offsets.botTilt,
    });
  }
}
