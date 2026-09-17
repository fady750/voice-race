export class PlayerCar {
  constructor(root, src) {
    this.el = document.createElement("div");
    this.el.className = "car car-player";
    this.img = document.createElement("img");
    this.img.src = src;
    this.img.alt = "سيارة الطفل";
    this.img.draggable = false;
    this.el.appendChild(this.img);
    root.appendChild(this.el);
    this.glow = false;
  }

  setGlow(on) {
    this.el.classList.toggle("is-boost", on);
  }

  update({ xPercent, y, time, tilt = 0, burst = 0 }) {
    const hover = Math.sin(time * 1.55) * 2.1;
    const breathe = 1 + Math.sin(time * 1.8) * 0.006;
    this.el.style.left = `${xPercent}%`;
    this.el.style.transform = `translate(-50%, ${y + hover}px) rotate(${tilt}deg) scale(${breathe + burst})`;
  }
}

export class BotCar {
  constructor(root, src) {
    this.el = document.createElement("div");
    this.el.className = "car car-bot";
    this.img = document.createElement("img");
    this.img.src = src;
    this.img.alt = "سيارة حكيم";
    this.img.draggable = false;
    this.el.appendChild(this.img);
    root.appendChild(this.el);
  }

  setGlow(on) {
    this.el.classList.toggle("is-boost", on);
  }

  update({ xPercent, y, time, tilt = 0, burst = 0 }) {
    const hover = Math.sin(time * 1.55 + 1.15) * 2.1;
    const breathe = 1 + Math.sin(time * 1.7 + 0.7) * 0.006;
    this.el.style.left = `${xPercent}%`;
    this.el.style.transform = `translate(-50%, ${y + hover}px) rotate(${tilt}deg) scale(${breathe + burst})`;
  }
}
