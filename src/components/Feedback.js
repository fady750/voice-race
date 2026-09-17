const COPY = {
  correct: { title: "ممتاز! نطقك رائع!", en: "" },
  close: { title: "قريب جدًا! جرّب مرة أخرى.", en: "" },
  wrong: { title: "حاول مرة أخرى.", en: "" },
  error: { title: "لم نتمكن من سماعك، حاول مرة أخرى.", en: "" },
};

export class Feedback {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "feedback";
    this.el.innerHTML = `
      <div class="feedback-card">
        <p class="feedback-en"></p>
        <p class="feedback-ar"></p>
      </div>
    `;
    root.appendChild(this.el);
    this.en = this.el.querySelector(".feedback-en");
    this.ar = this.el.querySelector(".feedback-ar");
  }

  show(type, message) {
    const copy = COPY[type] || COPY.error;
    this.el.dataset.type = type;
    this.en.textContent = copy.en;
    this.ar.textContent = message || copy.title;
    this.el.classList.add("is-visible");
  }

  hide() {
    this.el.classList.remove("is-visible");
  }
}
