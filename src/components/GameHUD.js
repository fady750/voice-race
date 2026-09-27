import { ASSETS } from "../config.js";
import exitButtonImg from '../assets/ExitButton.svg';

export class GameHUD {
  constructor(root) {
    this.el = document.createElement("header");
    this.el.className = "game-hud-new";
    this.el.innerHTML = `
      <div class="hud-left">
        <div class="hud-avatar bot-avatar">
          <img src="${ASSETS.hakim}" alt="Bot" />
        </div>
        <div class="hud-pill">
          <span class="score-val bot-score">0</span>
          <img class="coin-icon" src="${ASSETS.daddcoin}" alt="Coins" />
        </div>
      </div>

      <div class="hud-center">
        <div class="question-info">
          <div class="q-label">السؤال</div>
          <div class="q-progress">1/5</div>
        </div>
        <div class="question-row">
          <h2 class="question-word"></h2>
          <button class="speaker-btn" type="button" aria-label="استمع للكلمة">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M5 10v4h3l4 3V7l-4 3H5zm11.5 2a3.5 3.5 0 0 0-1.8-3.05v6.1A3.5 3.5 0 0 0 16.5 12z"/>
              <path fill="currentColor" d="M14 6.2v1.55a5.5 5.5 0 0 1 0 8.5V17.8a7.05 7.05 0 0 0 0-11.6z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="hud-right">
        <div class="hud-pill">
          <span class="score-val user-score">0</span>
          <img class="coin-icon" src="${ASSETS.daddcoin}" alt="Coins" />
        </div>
        <div class="hud-avatar user-avatar">
          <img src="${ASSETS.user}" alt="User" />
        </div>
        <button class="hud-close-btn" type="button" aria-label="إغلاق">
          <img src="${exitButtonImg}" alt="Exit" />
        </button>
      </div>
      <div class="hud-progress-bar-container">
        <div class="hud-progress-bar-fill"></div>
      </div>
    `;
    root.appendChild(this.el);
    
    this.botScoreEl = this.el.querySelector(".bot-score");
    this.userScoreEl = this.el.querySelector(".user-score");
    this.progressValue = this.el.querySelector(".q-progress");
    this.progressBar = this.el.querySelector(".hud-progress-bar-fill");
    this.closeBtn = this.el.querySelector(".hud-close-btn");
    
    this.wordEl = this.el.querySelector(".question-word");
    this.speakerBtn = this.el.querySelector(".speaker-btn");
  }

  setBotScore(value) {
    this.botScoreEl.textContent = String(value);
  }

  setUserScore(value) {
    this.userScoreEl.textContent = String(value);
  }

  setProgress(current, total) {
    this.progressValue.textContent = `${current}/${total}`;
    if (total > 0) {
      this.progressBar.style.width = `${(current / total) * 100}%`;
    }
  }
  
  setWord(word) {
    this.wordEl.textContent = word;
  }

  setDisabled(disabled) {
    this.speakerBtn.disabled = disabled;
  }
}
