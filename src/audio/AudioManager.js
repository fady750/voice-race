import carsSound from "../assets/cars.mp3";

export class AudioManager {
  constructor() {
    this.context = null;
    this.muted = false;
    this.unlocked = false;
    this.wordAudio = null;
    this.boostAudio = new Audio(carsSound);
    this.boostAudio.preload = "auto";
    try {
      this.boostAudio.load();
    } catch (_) {}

    // Pre-warm SpeechSynthesis voices so they are ready when needed
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          try { window.speechSynthesis.getVoices(); } catch (_) {}
        };
      } catch (_) {}
    }

    // Auto-resume audio context when returning to the tab
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.context && this.context.state === "suspended") {
          this.context.resume().catch(() => {});
        }
      });
    }
  }

  unlock() {
    const context = this.#getContext();
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }

    // Play a tiny silent buffer to warm up Web Audio on iOS/Safari
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch (_) {}

    // Pre-warm HTML5 audio element
    if (this.boostAudio) {
      try {
        this.boostAudio.load();
      } catch (_) {}
    }

    this.unlocked = true;
  }

  #getContext() {
    if (!this.context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        this.context = new Ctor();
      }
    }
    if (this.context && this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  #tone({ frequency, duration, type = "sine", gain = 0.08, slideTo }) {
    if (this.muted) return;
    const ctx = this.#getContext();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const amp = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      }
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(amp);
      amp.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('[Audio] Failed to synthesize tone:', e);
    }
  }

  playMicStart() {
    this.#tone({ frequency: 740, duration: 0.12, type: "triangle", gain: 0.06 });
  }

  playRecording() {
    this.#tone({ frequency: 520, duration: 0.08, type: "sine", gain: 0.04 });
  }

  playCorrect() {
    this.#tone({ frequency: 523, duration: 0.12, type: "triangle", gain: 0.07 });
    window.setTimeout(() => {
      this.#tone({ frequency: 659, duration: 0.12, type: "triangle", gain: 0.07 });
    }, 90);
    window.setTimeout(() => {
      this.#tone({ frequency: 784, duration: 0.18, type: "triangle", gain: 0.08 });
    }, 180);
  }

  playClose() {
    this.#tone({ frequency: 494, duration: 0.16, type: "sine", gain: 0.06, slideTo: 587 });
  }

  playWrong() {
    this.#tone({ frequency: 330, duration: 0.22, type: "sine", gain: 0.05, slideTo: 247 });
  }

  playBoost() {
    if (this.muted) return;
    try {
      this.boostAudio.currentTime = 0;
      const playPromise = this.boostAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[Audio] Boost play was prevented:', err);
        });
      }
    } catch (_) {}
  }

  playFinish() {
    this.#tone({ frequency: 392, duration: 0.16, type: "triangle", gain: 0.07 });
    window.setTimeout(() => this.#tone({ frequency: 523, duration: 0.16, type: "triangle", gain: 0.07 }), 120);
    window.setTimeout(() => this.#tone({ frequency: 659, duration: 0.28, type: "triangle", gain: 0.08 }), 240);
  }

  stopSpeech() {
    if (this.wordAudio) {
      try {
        this.wordAudio.pause();
        this.wordAudio.currentTime = 0;
      } catch (_) {}
      this.wordAudio = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  speakWord(word, language = "ar-EG", audioSrc) {
    this.stopSpeech();
    if (audioSrc) {
      try {
        this.wordAudio = new Audio(audioSrc);
        this.wordAudio.preload = "auto";
        this.wordAudio.volume = 1.0;
        const playPromise = this.wordAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[Audio] Audio file failed, falling back to speech synthesis:', err);
            if (word) this.#speakFallback(word, language);
          });
        }
      } catch (_) {
        if (word) this.#speakFallback(word, language);
      }
      return;
    }
    if (word) this.#speakFallback(word, language);
  }

  #speakFallback(word, language) {
    if (!window.speechSynthesis || !word) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = language;
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ar"));
      if (arabicVoice) utterance.voice = arabicVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Audio] Speech synthesis fallback failed:', e);
    }
  }
}
