export class QuestionPanel {
  constructor(root) {
    this.el = document.createElement("section");
    this.el.className = "question-panel";
    this.el.innerHTML = `
      <div class="question-glass">
        <p class="question-instruction">انطق الكلمة التالية</p>
        <div class="question-row">
          <button class="speaker-btn" type="button" aria-label="استمع للكلمة">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M5 10v4h3l4 3V7l-4 3H5zm11.5 2a3.5 3.5 0 0 0-1.8-3.05v6.1A3.5 3.5 0 0 0 16.5 12z"/>
              <path fill="currentColor" d="M14 6.2v1.55a5.5 5.5 0 0 1 0 8.5V17.8a7.05 7.05 0 0 0 0-11.6z"/>
            </svg>
          </button>
          <h2 class="question-word"></h2>
        </div>
      </div>
    `;
    root.appendChild(this.el);
    this.wordEl = this.el.querySelector(".question-word");
    this.speakerBtn = this.el.querySelector(".speaker-btn");
  }

  setWord(word) {
    this.wordEl.textContent = word;
  }

  setDisabled(disabled) {
    this.speakerBtn.disabled = disabled;
  }
}
