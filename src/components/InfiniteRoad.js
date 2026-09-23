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
    this.segmentHeight = 0;
    // We use 4 segments to ensure the road extends fully behind the top UI
    this.totalSegments = 4;
    this.progress = 0;
    this.naturalWidth = 1024;
    this.naturalHeight = 1446;
    this.viewportHeight = 1000;

    this.finishLine = document.createElement("div");
    this.finishLine.className = "road-finish-line";
    this.finishLine.innerHTML = `<span>FINISH</span>`;
    this.track.appendChild(this.finishLine);
    
    // We no longer rely on totalQuestions for road length
    this.initStaticRoad();
  }

  // Still present for backwards compatibility if called from Game.js, but does nothing to length
  setQuestionCount(totalQuestions) {
    // The road is static, so we don't change segments based on questions.
    // The total race distance is logical, not physical road length.
  }

  initStaticRoad() {
    this.track.querySelectorAll(".road-segment").forEach((segment) => segment.remove());
    this.segments = [];
    for (let i = 0; i < this.totalSegments; i += 1) {
      const img = document.createElement("img");
      img.className = "road-segment";
      img.src = this.src;
      img.alt = "";
      img.draggable = false;
      img.decoding = "sync";
      this.track.insertBefore(img, this.finishLine);
      this.segments.push(img);
    }
    this.layout();
  }

  layout() {
    const root = this.wrap.parentElement || document.body;
    const rect = root.getBoundingClientRect();
    const vw = rect.width || window.innerWidth;
    const vh = rect.height || window.innerHeight;
    this.viewportHeight = vh;
    const width = Math.max(220, vw * 0.56);
    const height = width * (this.naturalHeight / this.naturalWidth);
    this.segmentHeight = height;
    
    this.wrap.style.width = `${width}px`;
    this.track.style.width = `${width}px`;
    this.track.style.height = `${vh}px`;
    
    this.segments.forEach((img) => {
      img.style.width = `${width}px`;
      img.style.height = `${height + SEAM_OVERLAP}px`;
    });
    
    this.#paint();
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

  setProgress(progress) {
    // The road doesn't move. Do nothing.
  }

  #paint() {
    for (let i = 0; i < this.segments.length; i += 1) {
      this.segments[i].style.top = `${(i - 1) * this.segmentHeight}px`;
    }
    
    // Position the finish line fixed near the horizon of the track.
    // E.g. top: 12% of the track.
    this.finishLine.style.top = `12%`;
    this.track.style.top = "0px";
  }

  get width() {
    return this.wrap.getBoundingClientRect().width;
  }
}
