import { ROAD_SPEED } from "../config.js";

const BASE_SEGMENT_COUNT = 4;
const SEGMENT_COUNT = 6;
const SEAM_OVERLAP = 14;

export class InfiniteRoad {
  constructor(root, src) {
    this.src = src;
    this.wrap = document.createElement("div");
    this.wrap.className = "road-wrap";
    this.track = document.createElement("div");
    this.track.className = "road-track";
    this.wrap.appendChild(this.track);
    root.appendChild(this.wrap);

    this.segments = [];
    this.positions = [];
    this.segmentHeight = 0;
    this.speed = ROAD_SPEED;
    this.naturalWidth = 1024;
    this.naturalHeight = 1446;
    this.viewportHeight = window.innerHeight;

    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
      const img = document.createElement("img");
      img.className = "road-segment";
      img.src = src;
      img.alt = "";
      img.draggable = false;
      img.decoding = "sync";
      this.track.appendChild(img);
      this.segments.push(img);
      this.positions.push(0);
    }
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.viewportHeight = vh;
    const width = Math.max(220, vw * 0.56);
    const height = width * (this.naturalHeight / this.naturalWidth);
    this.segmentHeight = height;
    this.wrap.style.width = `${width}px`;
    this.track.style.width = `${width}px`;
    this.segments.forEach((img) => {
      img.style.width = `${width}px`;
      img.style.height = `${height + SEAM_OVERLAP}px`;
    });
    this.#resetStack();
    return { width, height };
  }

  onImageReady() {
    const first = this.segments[0];
    if (first.naturalWidth) {
      this.naturalWidth = first.naturalWidth;
      this.naturalHeight = first.naturalHeight;
    }
    return this.layout();
  }

  showFinishLine() {
    if (!this.finishLine) {
      this.finishLine = document.createElement("div");
      this.finishLine.className = "finish-line";
      this.track.appendChild(this.finishLine);
    }
    this.finishLineY = -100;
    this.finishLineActive = true;
    this.finishLineComplete = false;
    this.finishLine.style.display = "block";
  }

  completeFinishLine() {
    this.finishLineComplete = true;
  }

  #resetStack() {
    const height = this.segmentHeight;
    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
      const positionIndex = i < BASE_SEGMENT_COUNT
        ? i - 2
        : i === BASE_SEGMENT_COUNT
          ? -3
          : 2;
      this.positions[i] = positionIndex * height;
    }
    this.#paint();
  }

  update(deltaTime) {
    const height = this.segmentHeight;
    if (!height) return;
    const delta = this.speed * deltaTime;
    const cycle = height * SEGMENT_COUNT;
    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
      this.positions[i] += delta;
      while (this.positions[i] >= this.viewportHeight) {
        this.positions[i] -= cycle;
      }
    }
    if (this.finishLineActive && this.finishLine) {
      if (!this.finishLineComplete && this.finishLineY >= 80) {
        this.finishLineY = 80;
      } else {
        this.finishLineY += delta;
      }
      this.finishLine.style.transform = `translate3d(0, ${this.finishLineY}px, 0)`;
    }
    this.#paint();
  }

  #paint() {
    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
      this.segments[i].style.transform = `translate3d(0, ${this.positions[i]}px, 0)`;
    }
  }

  get width() {
    return this.wrap.getBoundingClientRect().width;
  }
}
