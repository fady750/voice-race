import {
  BACKGROUND_BOTTOM,
  BACKGROUND_SPEED,
  BACKGROUND_TOP,
} from "../config.js";

export class Background {
  constructor(root, src) {
    this.el = document.createElement("div");
    this.el.className = "game-bg";
    this.img = document.createElement("img");
    this.img.src = src;
    this.img.alt = "";
    this.img.draggable = false;
    this.el.appendChild(this.img);
    root.appendChild(this.el);
    this.phase = 0;
    this.y = 0;
  }

  resize() {}

  update(deltaTime) {
    const span = (BACKGROUND_BOTTOM - BACKGROUND_TOP) / 2;
    const mid = (BACKGROUND_BOTTOM + BACKGROUND_TOP) / 2;
    const omega = span === 0 ? 0 : BACKGROUND_SPEED / Math.max(1, span * Math.PI);
    this.phase += deltaTime * omega * Math.PI;
    this.y = mid + span * Math.sin(this.phase);
    this.img.style.transform = `translate3d(-50%, calc(-50% + ${this.y}px), 0) scale(1.18)`;
  }
}
