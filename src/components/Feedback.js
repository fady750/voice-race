const SVGS = {
  correct: `<svg viewBox="0 0 24 24" style="width:40px;height:40px;color:#4caf50;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  wrong: `<svg viewBox="0 0 24 24" style="width:40px;height:40px;color:#f44336;"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
  error: `<svg viewBox="0 0 24 24" style="width:40px;height:40px;color:#ff9800;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
};

const COPY = {
  correct: { title: "أحسنت", en: "" },
  wrong: { title: "خطأ", en: "" },
  error: { title: "ثانِيَةً", en: "" },
};

export class Feedback {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "feedback";
    this.el.innerHTML = `
      <div class="feedback-card" style="display:flex; flex-direction:row; align-items:center; justify-content:center; gap:12px;">
        <p class="feedback-ar" style="margin:0; font-size: 32px;"></p>
        <div class="feedback-icon" style="display:flex; align-items:center;"></div>
      </div>
    `;
    root.appendChild(this.el);
    this.icon = this.el.querySelector(".feedback-icon");
    this.ar = this.el.querySelector(".feedback-ar");
  }

  show(type, message) {
    const copy = COPY[type] || COPY.error;
    const svg = SVGS[type] || SVGS.error;
    this.el.dataset.type = type;
    this.icon.innerHTML = svg;
    this.ar.textContent = message || copy.title;
    this.el.classList.add("is-visible");
  }

  hide() {
    this.el.classList.remove("is-visible");
  }
}
