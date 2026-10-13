// Celebration sound module: preloads external fireworks effect and falls back to Web Audio
import fireworksSoundUrl from './fireworks.mp3';

export function createCelebrationSound({ muted = false, soundUrl } = {}) {
  let context;
  let externalAudio;
  const activeNodes = new Set();

  try {
    externalAudio = new Audio(soundUrl || fireworksSoundUrl);
    externalAudio.preload = 'auto';
    externalAudio.volume = 0.35;
    externalAudio.load();
  } catch (_) {}

  const unlock = () => {
    if (!externalAudio) {
      try {
        externalAudio = new Audio(soundUrl || fireworksSoundUrl);
        externalAudio.preload = 'auto';
        externalAudio.volume = 0.35;
      } catch (_) {}
    }
    if (externalAudio) {
      try {
        externalAudio.load();
      } catch (_) {}
    }
  };

  const playSynthesizedFanfare = () => {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!context) context = new Ctor();
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }
      const now = context.currentTime;
      // Celebratory arpeggio: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.08, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.38);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
        activeNodes.add({ oscillator: osc, gain });
      });
    } catch (_) {}
  };

  const stop = () => {
    activeNodes.forEach(({ oscillator, gain }) => {
      try { oscillator.stop(); } catch (_) {}
      try { oscillator.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
    });
    activeNodes.clear();

    if (externalAudio) {
      try {
        externalAudio.pause();
        externalAudio.currentTime = 0;
      } catch (_) {}
    }

    if (context) {
      context.close().catch(() => {});
      context = null;
    }
  };

  const start = () => {
    if (muted) return;

    let played = false;
    if (externalAudio) {
      try {
        externalAudio.currentTime = 0;
        const playPromise = externalAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            played = true;
          }).catch((err) => {
            console.warn('[CelebrationSound] HTML audio blocked, using Web Audio fanfare:', err);
            playSynthesizedFanfare();
          });
        } else {
          played = true;
        }
      } catch (_) {
        playSynthesizedFanfare();
      }
    } else {
      playSynthesizedFanfare();
    }
  };

  return { start, burst: () => {}, stop, unlock };
}

