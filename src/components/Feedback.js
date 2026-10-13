const SVGS = {
  correct: `<svg class="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`,
  wrong: `<svg class="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>`,
  retry: `<svg class="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`
};

const COPY = {
  correct: "أحسنت",
  wrong: "خطأ",
  close: "خطأ",
  error: "خطأ",
  retry: "حاول ثانية"
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
    const isRetry = type === "retry";
    const textStr = message || COPY[type] || (isSuccess ? "أحسنت" : isRetry ? "حاول ثانية" : "خطأ");
    const svgStr = isSuccess ? SVGS.correct : (isRetry ? SVGS.retry : SVGS.wrong);

    this.el.dataset.type = type;
    this.card.className = `answer-feedback-card answer-feedback-card--inline feedback-card ${
      isSuccess
        ? "answer-feedback-card--success"
        : isRetry
        ? "answer-feedback-card--retry"
        : "answer-feedback-card--wrong"
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
