const SVGS = {
  correct: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`,
  wrong: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>`,
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
      <div class="feedback-card">
        <div class="feedback-icon"></div>
        <p class="feedback-ar"></p>
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
