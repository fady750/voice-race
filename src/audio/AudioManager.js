export class AudioManager {
  constructor() {
    this.context = null;
    this.muted = false;
    this.unlocked = false;
    this.wordAudio = null;
  }

  unlock() {
    if (this.unlocked) return;
    const context = this.#getContext();
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  #getContext() {
    if (!this.context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      this.context = new Ctor();
    }
    return this.context;
  }

  #tone({ frequency, duration, type = "sine", gain = 0.08, slideTo }) {
    if (this.muted) return;
    const ctx = this.#getContext();
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
    this.#tone({ frequency: 220, duration: 0.28, type: "sawtooth", gain: 0.03, slideTo: 440 });
  }

  playFinish() {
    this.#tone({ frequency: 392, duration: 0.16, type: "triangle", gain: 0.07 });
    window.setTimeout(() => this.#tone({ frequency: 523, duration: 0.16, type: "triangle", gain: 0.07 }), 120);
    window.setTimeout(() => this.#tone({ frequency: 659, duration: 0.28, type: "triangle", gain: 0.08 }), 240);
  }

  stopSpeech() {
    if (this.wordAudio) {
      this.wordAudio.pause();
      this.wordAudio.currentTime = 0;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  speakWord(word, language = "ar-EG", audioSrc) {
    this.stopSpeech();
    if (audioSrc) {
      this.wordAudio = new Audio(audioSrc);
      this.wordAudio.play().catch(() => {
        if (word) this.#speakFallback(word, language);
      });
      return;
    }
    if (word) this.#speakFallback(word, language);
  }

  #speakFallback(word, language) {
    if (!window.speechSynthesis || !word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language;
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;
    window.speechSynthesis.speak(utterance);
  }
}
