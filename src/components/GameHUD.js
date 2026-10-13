import { ASSETS } from "../config.js";
import exitButtonImg from '../assets/ExitButton.svg';

export class GameHUD {
  constructor(root) {
    this.root = root;

    // 1. Top Header Bar
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
          <span class="q-label">السؤال</span>
          <span class="q-progress">1/5</span>
        </div>
      </div>

      <div class="hud-right">
        <div class="hud-pill">
          <span class="score-val user-score">0</span>
          <img class="coin-icon" src="${ASSETS.daddcoin}" alt="Coins" />
        </div>
        <div class="hud-avatar-wrapper user-avatar-wrapper">
          <div class="hud-avatar user-avatar">
            <img class="user-avatar-img" src="${ASSETS.user}" alt="User" />
          </div>
          <img class="hud-avatar-frame" alt="Frame" style="display: none;" />
        </div>
        <button class="hud-close-btn" type="button" aria-label="إغلاق" title="خروج">
          <img src="${exitButtonImg}" alt="Exit" />
        </button>
      </div>

      <div class="hud-progress-bar-container">
        <div class="hud-progress-bar-fill"></div>
      </div>
    `;
    root.appendChild(this.el);

    // 2. Center Question Prompt Panel (large typography, image if present, audio speaker)
    this.questionPanel = document.createElement("section");
    this.questionPanel.className = "question-prompt-panel";
    this.questionPanel.setAttribute("aria-label", "السؤال الحالي");
    this.questionPanel.dir = "rtl";
    this.questionPanel.innerHTML = `
      <div class="question-prompt-main">
        <div class="question-prompt-top-row">
          <button class="speaker-btn" type="button" aria-label="استمع للكلمة" title="استمع للكلمة">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M5 10v4h3l4 3V7l-4 3H5zm11.5 2a3.5 3.5 0 0 0-1.8-3.05v6.1A3.5 3.5 0 0 0 16.5 12z"/>
              <path fill="currentColor" d="M14 6.2v1.55a5.5 5.5 0 0 1 0 8.5V17.8a7.05 7.05 0 0 0 0-11.6z"/>
            </svg>
          </button>
          <div class="question-prompt-image-wrap is-hidden" hidden style="display: none;">
            <img class="question-media-image" alt="" style="display: none;" />
          </div>
        </div>
        <div class="question-prompt-text-group">
          <h2 class="question-word"></h2>
          <div class="question-media-text" hidden></div>
        </div>
      </div>
    `;
    root.appendChild(this.questionPanel);

    // Header references
    this.botScoreEl = this.el.querySelector(".bot-score");
    this.userScoreEl = this.el.querySelector(".user-score");
    this.userAvatarWrapper = this.el.querySelector(".user-avatar-wrapper");
    this.userAvatar = this.el.querySelector(".user-avatar");
    this.userAvatarImg = this.el.querySelector(".user-avatar-img");
    this.userAvatarFrame = this.el.querySelector(".hud-avatar-frame");
    this.progressValue = this.el.querySelector(".q-progress");
    this.progressBar = this.el.querySelector(".hud-progress-bar-fill");
    this.closeBtn = this.el.querySelector(".hud-close-btn");

    // Question Panel references
    this.wordEl = this.questionPanel.querySelector(".question-word");
    this.speakerBtn = this.questionPanel.querySelector(".speaker-btn");
    this.questionTextEl = this.questionPanel.querySelector(".question-media-text");
    this.questionImageWrap = this.questionPanel.querySelector(".question-prompt-image-wrap");
    this.questionImageEl = this.questionPanel.querySelector(".question-media-image");

    this.syncPanelMetrics = this.syncPanelMetrics.bind(this);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncPanelMetrics();
      });
      this.resizeObserver.observe(this.el);
      this.resizeObserver.observe(this.questionPanel);
    }
    window.addEventListener("resize", this.syncPanelMetrics);
    requestAnimationFrame(() => this.syncPanelMetrics());
  }

  syncPanelMetrics() {
    if (this.el) {
      const rect = this.el.getBoundingClientRect();
      if (rect.height > 0) {
        document.documentElement.style.setProperty("--hud-header-bottom", `${Math.round(rect.bottom)}px`);
      }
    }
    if (this.questionPanel) {
      const qRect = this.questionPanel.getBoundingClientRect();
      if (qRect.width > 0 && qRect.height > 0) {
        document.documentElement.style.setProperty("--question-panel-bottom", `${Math.round(qRect.bottom)}px`);
        document.documentElement.style.setProperty("--question-panel-top", `${Math.round(qRect.top)}px`);
        document.documentElement.style.setProperty("--question-panel-center-x", `${Math.round(qRect.left + qRect.width / 2)}px`);
      }
    }
  }

  setUserAvatar(avatarUrl, accessoryUrl) {
    if (avatarUrl) {
      this.userAvatarImg.src = avatarUrl;
      this.userAvatarImg.onerror = () => {
        this.userAvatarImg.src = ASSETS.user;
      };
    } else {
      this.userAvatarImg.src = ASSETS.user;
    }

    if (accessoryUrl) {
      this.userAvatarFrame.src = accessoryUrl;
      this.userAvatarFrame.style.display = "block";
      this.userAvatar.style.borderColor = "transparent";
      this.userAvatarFrame.onerror = () => {
        this.userAvatarFrame.style.display = "none";
        this.userAvatar.style.borderColor = "#ffaa00";
      };
    } else {
      this.userAvatarFrame.style.display = "none";
      this.userAvatar.style.borderColor = "#ffaa00";
    }
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
    this.wordEl.textContent = word === '.' ? '' : word;
    this.syncPanelMetrics();
  }

  setQuestionMedia(question = {}) {
    const text = question.questionText === '.' ? '' : (question.questionText || '');
    const rawImage = question.imageUrl || question.image || '';
    const image = (typeof rawImage === 'string' && rawImage.trim() && rawImage !== 'null' && rawImage !== 'undefined') ? rawImage.trim() : '';

    if (text && text !== question.word && text.trim().length > 0) {
      this.questionTextEl.textContent = text;
      this.questionTextEl.hidden = false;
      this.questionTextEl.style.display = 'block';
    } else {
      this.questionTextEl.textContent = '';
      this.questionTextEl.hidden = true;
      this.questionTextEl.style.display = 'none';
    }

    if (image) {
      this.questionImageEl.onerror = () => {
        this.questionImageEl.removeAttribute('src');
        this.questionImageEl.style.display = 'none';
        this.questionImageWrap.hidden = true;
        this.questionImageWrap.classList.add('is-hidden');
        this.questionImageWrap.style.display = 'none';
        this.questionPanel.classList.remove('has-image');
        this.syncPanelMetrics();
      };
      this.questionImageEl.onload = () => {
        this.questionImageEl.style.display = 'block';
        this.questionImageWrap.style.display = 'flex';
        this.syncPanelMetrics();
      };
      this.questionImageEl.alt = '';
      this.questionImageEl.src = image;
      this.questionImageWrap.hidden = false;
      this.questionImageWrap.classList.remove('is-hidden');
      this.questionPanel.classList.add('has-image');
    } else {
      this.questionImageEl.onerror = null;
      this.questionImageEl.onload = null;
      this.questionImageEl.removeAttribute('src');
      this.questionImageEl.alt = '';
      this.questionImageEl.style.display = 'none';
      this.questionImageWrap.hidden = true;
      this.questionImageWrap.classList.add('is-hidden');
      this.questionImageWrap.style.display = 'none';
      this.questionPanel.classList.remove('has-image');
    }

    this.questionImageEl.onclick = () => {
      const currentSrc = this.questionImageEl.getAttribute('src');
      if (!currentSrc) return;
      const overlay = document.createElement('div');
      overlay.className = 'question-image-lightbox';
      overlay.innerHTML = `<button type="button" aria-label="إغلاق الصورة">×</button><img src="${currentSrc}" alt="" />`;
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    };

    this.syncPanelMetrics();
  }

  setDisabled(disabled) {
    this.speakerBtn.disabled = disabled;
  }
}
