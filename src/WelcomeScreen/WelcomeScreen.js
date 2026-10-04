import './WelcomeScreen.css';
import statsBgImage from '../assets/QuestionNumber.png';
import questionCoinImg from '../assets/QuestionCoin.png';
import daddcoinImg from '../assets/daddcoin.webp';
import descriptionImg from '../assets/description.png';
import exitButtonImg from '../assets/Exit1.png';
import startButtonImg from '../assets/start_transparent.png';
import { handleExitSite } from '../utils/navigation.js';

export class WelcomeScreen {
  constructor(root, options = {}) {
    this.root = root;
    this.onStart = options.onStart;
    this.onExit = options.onExit || handleExitSite;
    this.#build();
  }

  #build() {
    this.el = document.createElement('div');
    this.el.className = 'gws-screen';
    this.el.dir = 'rtl';

    // ── Header (Stats) ──
    const header = document.createElement('header');
    header.className = 'gws-header';
    header.setAttribute('aria-label', 'إحصاءات اللعبة');

    const statsBg = document.createElement('div');
    statsBg.className = 'gws-stats-bg';
    statsBg.style.backgroundImage = `url(${statsBgImage})`;

    const qCoin = document.createElement('img');
    qCoin.src = questionCoinImg;
    qCoin.alt = 'عدد الأسئلة';
    qCoin.className = 'gws-stat-icon';

    this.qCount = document.createElement('span');
    this.qCount.className = 'gws-stat-text';
    this.qCount.textContent = '10';

    const separator = document.createElement('span');
    separator.className = 'gws-stat-equals';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '=';

    this.daddPoints = document.createElement('span');
    this.daddPoints.className = 'gws-stat-text gws-stat-text--yellow';
    this.daddPoints.textContent = '10';

    const dCoin = document.createElement('img');
    dCoin.src = daddcoinImg;
    dCoin.alt = 'النقاط';
    dCoin.className = 'gws-stat-icon';

    statsBg.append(qCoin, this.qCount, separator, this.daddPoints, dCoin);
    header.append(statsBg);

    // ── Main Content ──
    const main = document.createElement('main');
    main.className = 'gws-main';

    const stage = document.createElement('div');
    stage.className = 'gws-stage';

    const body = document.createElement('div');
    body.className = 'gws-body';

    const description = document.createElement('img');
    description.className = 'gws-description-art';
    description.src = descriptionImg;
    description.alt = "شرح طريقة اللعب";
    description.onload = () => {
      if (description.naturalWidth && description.naturalHeight) {
        stage.style.setProperty('--gws-art-ratio', String(description.naturalWidth / description.naturalHeight));
      }
    };

    body.append(description);

    // ── Footer (Buttons) ──
    const footer = document.createElement('footer');
    footer.className = 'gws-footer';

    const footerButtons = document.createElement('div');
    footerButtons.className = 'gws-footer-buttons';

    const exitBtn = document.createElement('button');
    exitBtn.className = 'gws-img-btn';
    exitBtn.type = 'button';
    exitBtn.setAttribute('aria-label', 'خروج');
    exitBtn.onclick = () => {
      if (this.onExit) this.onExit();
    };
    const exitImg = document.createElement('img');
    exitImg.src = exitButtonImg;
    exitImg.alt = "";
    exitBtn.append(exitImg);

    this.startBtn = document.createElement('button');
    this.startBtn.className = 'gws-start-btn';
    this.startBtn.type = 'button';
    this.startBtn.style.backgroundImage = `url(${startButtonImg})`;
    this.startBtn.setAttribute('aria-label', 'ابدأ اللعبة');
    this.startBtn.onclick = () => {
      if (this.onStart) this.onStart();
    };

    footerButtons.append(exitBtn, this.startBtn);
    footer.append(footerButtons);

    stage.append(body, footer);
    main.append(stage);

    this.el.append(header, main);
  }

  show(questionCount) {
    this.qCount.textContent = questionCount || 10;
    this.daddPoints.textContent = questionCount || 10;
    this.root.appendChild(this.el);
  }

  hide() {
    this.el.remove();
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.startBtn.setAttribute('aria-label', 'جارٍ التحميل');
      this.startBtn.disabled = true;
    } else {
      this.startBtn.setAttribute('aria-label', 'ابدأ اللعبة');
      this.startBtn.disabled = false;
    }
  }
}
