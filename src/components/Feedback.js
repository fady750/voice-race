const SVGS = {
  correct: `<svg class="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`,
  wrong: `<svg class="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>`
};

const COPY = {
  correct: "أحسنت",
  wrong: "خطأ",
  close: "خطأ",
  error: "خطأ"
};

export class Feedback {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "feedback";
    this.el.innerHTML = `
      <div class="answer-feedback-card answer-feedback-card--inline feedback-card" dir="rtl">
        <span class="answer-feedback__icon-wrap feedback-icon"></span>
        <span class="answer-feedback__text feedback-ar"></span>
      </div>
    `;
    root.appendChild(this.el);
    this.card = this.el.querySelector(".answer-feedback-card");
    this.iconWrap = this.el.querySelector(".answer-feedback__icon-wrap");
    this.text = this.el.querySelector(".answer-feedback__text");
    this.icon = this.iconWrap;
    this.ar = this.text;
  }

  show(type, message) {
    const isSuccess = type === "correct";
    const textStr = message || COPY[type] || (isSuccess ? "أحسنت" : "خطأ");
    const svgStr = isSuccess ? SVGS.correct : SVGS.wrong;

    this.el.dataset.type = type;
    this.card.className = `answer-feedback-card answer-feedback-card--inline feedback-card ${
      isSuccess ? "answer-feedback-card--success" : "answer-feedback-card--wrong"
    }`;

    this.iconWrap.innerHTML = svgStr;
    this.text.textContent = textStr;

    // Reset and trigger pop animation
    this.card.style.animation = "none";
    void this.card.offsetHeight;
    this.card.style.animation = "";

    this.el.classList.add("is-visible");
  }

  hide() {
    this.el.classList.remove("is-visible");
  }
}
