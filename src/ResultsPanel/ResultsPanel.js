import './ResultsPanel.css';
import panelFrame from './assets/banal.png';
import celebrationTitle from './assets/good.png';
import coinsImage from './assets/money.png';
import correctImage from './assets/right.png';
import wrongImage from './assets/wrong.png';
import exitButtonUrl from '../assets/Exit.png';
import retryButtonUrl from '../assets/retry.png';

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export class ResultsPanel {
  constructor(root, options = {}) {
    this.root = root;
    this.onRetry = options.onRetry;
    this.onBack = options.onBack;
    this.#build();
  }

  #build() {
    this.el = document.createElement("div");
    this.el.className = "results-overlay";

    const screen = document.createElement("section");
    screen.className = "results-screen";
    screen.setAttribute("aria-label", "نتائج اللعبة");
    screen.dir = "rtl";

    const panel = document.createElement("div");
    panel.className = "results-panel";
    panel.style.setProperty("--results-panel-image", `url(${panelFrame})`);
    const panelFrameImg = document.createElement("img");
    panelFrameImg.className = "results-panel__frame";
    panelFrameImg.src = panelFrame;
    panelFrameImg.alt = "";
    panelFrameImg.setAttribute("aria-hidden", "true");
    panel.append(panelFrameImg);

    const content = document.createElement("div");
    content.className = "results-panel__content";

    this.titleImg = document.createElement("img");
    this.titleImg.className = "results-panel__title";
    this.titleImg.src = celebrationTitle;
    this.titleImg.alt = "أحسنت";
    this.titleImg.style.display = "none";
    this.titleImg.style.paddingTop = "clamp(24px, 4vh, 40px)";

    this.titleText = document.createElement("h2");
    this.titleText.className = "results-panel__fail-title";
    this.titleText.style.fontSize = "clamp(32px, 8vw, 64px)";
    this.titleText.style.fontWeight = "900";
    this.titleText.style.color = "#fff";
    this.titleText.style.margin = "0 0 16px 0";
    this.titleText.style.paddingTop = "clamp(32px, 6vh, 60px)";
    this.titleText.style.textShadow = "0 4px 12px rgba(0,0,0,0.5)";
    this.titleText.style.display = "none";

    const stats = document.createElement("div");
    stats.className = "results-stats";
    stats.setAttribute("aria-label", "إحصاءات الأداء");

    const correctCard = document.createElement("div");
    correctCard.className = "results-stat-card results-stat-card--correct";
    const correctImg = document.createElement("img");
    correctImg.src = correctImage;
    correctImg.alt = "إجابات صحيحة";
    this.correctText = document.createElement("strong");
    correctCard.append(correctImg, this.correctText);

    const coinsCard = document.createElement("div");
    coinsCard.className = "results-stat-card results-stat-card--coins";
    const coinsImg = document.createElement("img");
    coinsImg.src = coinsImage;
    coinsImg.alt = "عملات مكتسبة";
    this.coinsText = document.createElement("strong");
    const coinsLabel = document.createElement("span");
    coinsLabel.textContent = "فِلُوس";
    coinsCard.append(coinsImg, this.coinsText, coinsLabel);

    const wrongCard = document.createElement("div");
    wrongCard.className = "results-stat-card results-stat-card--wrong";
    const wrongImg = document.createElement("img");
    wrongImg.src = wrongImage;
    wrongImg.alt = "إجابات خاطئة";
    this.wrongText = document.createElement("strong");
    wrongCard.append(wrongImg, this.wrongText);

    stats.append(correctCard, coinsCard, wrongCard);
    content.append(this.titleImg, this.titleText, stats);
    panel.append(content);

    const actions = document.createElement("div");
    actions.className = "results-actions";

    const backBtn = document.createElement("button");
    backBtn.className = "results-action results-action--back";
    backBtn.type = "button";
    backBtn.onclick = () => { if (this.onBack) this.onBack(); };
    const backBtnImg = document.createElement("img");
    backBtnImg.className = "results-action__bg";
    backBtnImg.src = exitButtonUrl;
    backBtnImg.alt = "";
    backBtnImg.setAttribute("aria-hidden", "true");
    backBtn.append(backBtnImg);

    const retryBtn = document.createElement("button");
    retryBtn.className = "results-action results-action--retry";
    retryBtn.type = "button";
    retryBtn.onclick = () => { if (this.onRetry) this.onRetry(); };
    const retryBtnImg = document.createElement("img");
    retryBtnImg.className = "results-action__bg";
    retryBtnImg.src = retryButtonUrl;
    retryBtnImg.alt = "";
    retryBtnImg.setAttribute("aria-hidden", "true");
    
    retryBtn.append(retryBtnImg);

    actions.append(backBtn, retryBtn);
    screen.append(panel, actions);
    this.el.append(screen);
  }

  show(data = {}) {
    const correct = numberValue(data.correctAnswers);
    const wrong = numberValue(data.wrongAnswers);
    const earnedCoins = numberValue(data.coins);

    const totalAnswers = correct + wrong;
    if (totalAnswers > 0 && correct / totalAnswers >= 0.5) {
      this.titleImg.style.display = "block";
      this.titleText.style.display = "none";
    } else {
      this.titleImg.style.display = "none";
      this.titleText.style.display = "block";
      this.titleText.textContent = "حاول مرة أخرى!";
    }

    this.correctText.textContent = correct;
    this.wrongText.textContent = wrong;
    this.coinsText.textContent = `+${earnedCoins}`;

    this.root.appendChild(this.el);
  }

  hide() {
    this.el.remove();
  }
}
