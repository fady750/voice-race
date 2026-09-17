const LABELS = {
  idle: "اضغط للتسجيل",
  recording: "جاري التسجيل...",
  processing: "جاري التحقق...",
  correct: "رائع!",
  close: "قريب جداً!",
  wrong: "حاول مرة أخرى!",
};

export class MicrophoneButton {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "mic-wrap";
    this.el.innerHTML = `
      <div class="mic-waves" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <button class="mic-btn" type="button" aria-label="تسجيل النطق">
        <span class="mic-ring"></span>
        <svg class="mic-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
        </svg>
      </button>
      <p class="mic-label">اضغط للتسجيل</p>
    `;
    root.appendChild(this.el);
    this.button = this.el.querySelector(".mic-btn");
    this.label = this.el.querySelector(".mic-label");
  }

  setState(state) {
    this.el.dataset.state = state;
    this.button.classList.toggle("is-recording", state === "recording");
    this.button.classList.toggle("is-processing", state === "processing");
    this.label.textContent = LABELS[state] || LABELS.idle;
    const busy = state === "processing" || state === "correct" || state === "close" || state === "wrong";
    this.button.disabled = busy;
  }
}
