import celebrationRobots from './assets/celbr.png';
import { createCelebrationSound } from './celebrationSound.js';
import './Celebration.css';

const CELEBRATION_LENGTH = 6800;
const FADE_LENGTH = 760;
const FIREWORK_COLORS = ['#00D9FF', '#168CFF', '#63FF5D', '#F9FCFC', '#F9D00F'];
const MAX_PARTICLES = 980;
const MAX_CONFETTI = 300;
const INITIAL_CONFETTI = 165;

function makeBurst(width, height, elapsed) {
  const x = width * (0.04 + Math.random() * 0.92);
  const y = height * (0.08 + Math.random() * 0.62);
  const pattern = Math.floor(Math.random() * 4);
  const size = Math.random();
  const particles = [];
  const count = size > 0.78 ? 52 + Math.floor(Math.random() * 18) : 30 + Math.floor(Math.random() * 22);
  const speedBase = Math.min(width, height) * (size > 0.78 ? 0.0012 : 0.0009 + Math.random() * 0.0005);

  for (let i = 0; i < count; i += 1) {
    const angle = pattern === 1
      ? (Math.PI * 2 * i) / count + (i % 2 ? 0.08 : -0.08)
      : (Math.PI * 2 * i) / count + (Math.random() - 0.5) * (pattern === 2 ? 0.36 : pattern === 3 ? 0.58 : 0.16);
    const speed = (0.7 + Math.random() * 0.7) * speedBase * (pattern === 2 ? 0.82 : pattern === 3 ? 1.18 : 1);
    particles.push({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      size: size > 0.78 ? 2.2 + Math.random() * 2.4 : 1.4 + Math.random() * 2.2,
      life: pattern === 2 ? 1050 + Math.random() * 700 : 820 + Math.random() * 650,
      gravity: pattern === 2 ? 0.014 : pattern === 3 ? 0.006 : 0.009,
      born: elapsed,
    });
  }
  return particles;
}

function makeConfetti(width, height, count, fromTop = false) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: fromTop ? -10 - Math.random() * 100 : Math.random() * height,
    width: 2.5 + Math.random() * 4.5,
    height: 4 + Math.random() * 8,
    speed: 0.38 + Math.random() * 0.95,
    drift: (Math.random() - 0.5) * 0.62,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - 0.5) * 0.045,
    color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
    shape: Math.floor(Math.random() * 3),
  }));
}

export class Celebration {
  constructor(root, options = {}) {
    this.root = root;
    this.imageSrc = options.imageSrc || celebrationRobots;
    this.soundUrl = options.soundUrl;
    this.muted = Boolean(options.muted);
    this.onComplete = null;
    this.isVisible = false;
    this.isLeaving = false;

    this.fadeTimer = null;
    this.completeTimer = null;
    this.animationFrame = null;
    
    this.#build();
  }

  #build() {
    this.el = document.createElement("section");
    this.el.className = "celebration";
    this.el.setAttribute("role", "status");
    this.el.setAttribute("aria-live", "polite");
    this.el.setAttribute("aria-label", "احتفال بالفوز");

    this.canvas = document.createElement("canvas");
    this.canvas.className = "celebration-fireworks";
    this.canvas.setAttribute("aria-hidden", "true");

    this.aurora = document.createElement("div");
    this.aurora.className = "celebration-aurora";
    this.aurora.setAttribute("aria-hidden", "true");

    this.content = document.createElement("div");
    this.content.className = "celebration-content";

    this.img = document.createElement("img");
    this.img.className = "celebration-robots";
    this.img.src = this.imageSrc;
    this.img.alt = "روبوتان يحتفلان";

    this.word = document.createElement("div");
    this.word.className = "celebration-word";
    this.word.dir = "rtl";
    this.word.textContent = "مبارك";

    this.content.append(this.img, this.word);
    this.el.append(this.canvas, this.aurora, this.content);

    this.context = this.canvas.getContext("2d");
    this.resizeHandler = () => this.#resize();
  }

  show(onComplete) {
    if (this.isVisible) return;
    this.isVisible = true;
    this.isLeaving = false;
    this.onComplete = onComplete;
    this.el.classList.remove("celebration--leaving");
    this.root.appendChild(this.el);

    this.sound = createCelebrationSound({ muted: this.muted, soundUrl: this.soundUrl });
    this.sound.start();

    this.particles = [];
    this.confetti = [];
    this.nextBurst = 140 + Math.random() * 180;
    this.nextConfetti = 100;
    this.startedAt = performance.now();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.#resize();
    window.addEventListener("resize", this.resizeHandler);
    if (!this.reducedMotion) {
      this.animationFrame = requestAnimationFrame((now) => this.#animate(now));
    }

    this.fadeTimer = window.setTimeout(() => {
      this.isLeaving = true;
      this.el.classList.add("celebration--leaving");
    }, CELEBRATION_LENGTH);

    this.completeTimer = window.setTimeout(() => {
      this.hide();
      if (this.onComplete) this.onComplete();
    }, CELEBRATION_LENGTH + FADE_LENGTH);
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.el.remove();
    window.clearTimeout(this.fadeTimer);
    window.clearTimeout(this.completeTimer);
    window.removeEventListener("resize", this.resizeHandler);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.sound) this.sound.stop();
    this.context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.particles = [];
    this.confetti = [];
  }

  #resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.canvas.width = Math.ceil(this.viewportWidth * ratio);
    this.canvas.height = Math.ceil(this.viewportHeight * ratio);
    this.canvas.style.width = `${this.viewportWidth}px`;
    this.canvas.style.height = `${this.viewportHeight}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.confetti = makeConfetti(this.viewportWidth, this.viewportHeight, INITIAL_CONFETTI);
  }

  #animate(now) {
    const elapsed = now - this.startedAt;
    const { context, viewportWidth, viewportHeight, reducedMotion } = this;
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    if (!reducedMotion && elapsed >= this.nextBurst && elapsed < CELEBRATION_LENGTH - 650) {
      this.particles.push(...makeBurst(viewportWidth, viewportHeight, elapsed));
      if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
      this.sound.burst(elapsed > 1200 ? 1 : 0.7);
      this.nextBurst = elapsed + 150 + Math.random() * 270;
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      const age = elapsed - particle.born;
      if (age >= particle.life) {
        this.particles.splice(index, 1);
        continue;
      }
      const opacity = Math.pow(1 - age / particle.life, 1.45);
      particle.px = particle.x;
      particle.py = particle.y;
      particle.x += particle.vx * 16;
      particle.y += particle.vy * 16;
      particle.vx *= 0.982;
      particle.vy = particle.vy * 0.982 + particle.gravity;

      context.globalAlpha = opacity;
      context.strokeStyle = particle.color;
      context.lineWidth = particle.size;
      context.shadowColor = particle.color;
      context.shadowBlur = 12;
      context.beginPath();
      context.moveTo(particle.px, particle.py);
      context.lineTo(particle.x, particle.y);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * 0.7, 0, Math.PI * 2);
      context.fill();
    }

    if (!reducedMotion) {
      if (elapsed >= this.nextConfetti) {
        this.confetti.push(...makeConfetti(viewportWidth, viewportHeight, 6 + Math.floor(Math.random() * 7), true));
        if (this.confetti.length > MAX_CONFETTI) this.confetti.splice(0, this.confetti.length - MAX_CONFETTI);
        this.nextConfetti = elapsed + 100 + Math.random() * 150;
      }

      for (let index = this.confetti.length - 1; index >= 0; index -= 1) {
        const piece = this.confetti[index];
        piece.y += piece.speed * 2.2;
        piece.x += piece.drift + Math.sin(elapsed * 0.0014 + piece.phase) * 0.22;
        piece.rotation += piece.rotationSpeed;
        if (piece.y > viewportHeight + 16) {
          this.confetti.splice(index, 1);
          continue;
        }
        context.save();
        context.globalAlpha = 0.72;
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.shadowColor = piece.color;
        context.shadowBlur = 5;
        if (piece.shape === 1) {
          context.rotate(Math.PI / 4);
          context.fillRect(-piece.width / 2, -piece.width / 2, piece.width, piece.width);
        } else if (piece.shape === 2) {
          context.beginPath();
          context.moveTo(0, -piece.height / 2);
          context.lineTo(piece.width / 2, piece.height / 2);
          context.lineTo(-piece.width / 2, piece.height / 2);
          context.closePath();
          context.fill();
        } else {
          context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        }
        context.restore();
      }
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    if (!reducedMotion && this.isVisible && !this.isLeaving) {
      this.animationFrame = requestAnimationFrame((now) => this.#animate(now));
    } else if (this.isLeaving && !reducedMotion) {
       this.animationFrame = requestAnimationFrame((now) => this.#animate(now));
    }
  }
}
