import './ResultsPanel.css';
import panelArt from '../assets/results-panel-empty.png';
import celebrationTitle from './assets/good.png';
import exitButtonImage from '../assets/Exit1.png';
import retryButtonImage from '../assets/Retry.png';

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

    this.screen = document.createElement("section");
    this.screen.className = "results-screen";
    this.screen.setAttribute("aria-label", "نتائج اللعبة");
    this.screen.dir = "rtl";

    const panel = document.createElement("div");
    panel.className = "results-panel";

    const panelArtImg = document.createElement("img");
    panelArtImg.className = "results-panel__art";
    panelArtImg.src = panelArt;
    panelArtImg.alt = "";
    panelArtImg.onload = () => {
      if (panelArtImg.naturalWidth && panelArtImg.naturalHeight) {
        this.screen.style.setProperty('--rp-ratio', String(panelArtImg.naturalWidth / panelArtImg.naturalHeight));
      }
    };

    this.successImg = document.createElement("img");
    this.successImg.className = "results-title";
    this.successImg.src = celebrationTitle;
    this.successImg.alt = "أحسنت";

    this.failDiv = document.createElement("div");
    this.failDiv.className = "results-title results-title--fail";
    this.failDiv.textContent = "حاول مرة أخرى!";

    this.gradeNum = document.createElement("strong");
    this.gradeNum.className = "results-num results-num--grade";
    this.gradeNum.setAttribute("aria-hidden", "true");

    this.correctNum = document.createElement("strong");
    this.correctNum.className = "results-num results-num--correct";
    this.correctNum.setAttribute("aria-hidden", "true");

    this.coinsNum = document.createElement("strong");
    this.coinsNum.className = "results-num results-num--coins";
    this.coinsNum.setAttribute("aria-hidden", "true");

    this.wrongNum = document.createElement("strong");
    this.wrongNum.className = "results-num results-num--wrong";
    this.wrongNum.setAttribute("aria-hidden", "true");

    this.srText = document.createElement("p");
    this.srText.className = "results-sr";

    panel.append(
      panelArtImg,
      this.successImg,
      this.failDiv,
      this.gradeNum,
      this.correctNum,
      this.coinsNum,
      this.wrongNum,
      this.srText
    );

    const actions = document.createElement("div");
    actions.className = "results-actions";

    const backBtn = document.createElement("button");
    backBtn.className = "results-action results-action--back";
    backBtn.type = "button";
    backBtn.onclick = () => { if (this.onBack) this.onBack(); };
    const backBtnImg = document.createElement("img");
    backBtnImg.className = "results-action__bg";
    backBtnImg.src = exitButtonImage;
    backBtnImg.alt = "خروج";
    backBtn.append(backBtnImg);

    const retryBtn = document.createElement("button");
    retryBtn.className = "results-action results-action--retry";
    retryBtn.type = "button";
    retryBtn.onclick = () => { if (this.onRetry) this.onRetry(); };
    const retryBtnImg = document.createElement("img");
    retryBtnImg.className = "results-action__bg";
    retryBtnImg.src = retryButtonImage;
    retryBtnImg.alt = "إعادة المحاولة";
    retryBtn.append(retryBtnImg);

    actions.append(backBtn, retryBtn);
    this.screen.append(panel, actions);
    this.el.append(this.screen);
  }

  show(data = {}) {
    const correct = numberValue(data.correctAnswers);
    const wrong = numberValue(data.wrongAnswers);
    const earnedCoins = numberValue(data.coins);
    
    // Fallback: in original code, totalQuestions wasn't provided, so we derive it
    const questionCount = numberValue(data.totalQuestions) || (correct + wrong);
    const correctPercent = questionCount ? Math.round((correct / questionCount) * 100) : 0;
    const isSuccess = questionCount > 0 && correctPercent >= 50;

    if (isSuccess) {
      this.successImg.style.display = "block";
      this.failDiv.style.display = "none";
    } else {
      this.successImg.style.display = "none";
      this.failDiv.style.display = "flex"; // matching the CSS
    }

    this.gradeNum.textContent = `${correctPercent}/100`;
    this.correctNum.textContent = String(correct);
    this.coinsNum.textContent = `+${earnedCoins}`;
    this.wrongNum.textContent = String(wrong);
    
    this.srText.textContent = `الدرجة ${correctPercent} من 100. إجابات صحيحة ${correct}. إجابات خاطئة ${wrong}. فلوس مكتسبة ${earnedCoins}.`;

    this.root.appendChild(this.el);
  }

  hide() {
    this.el.remove();
  }
}
