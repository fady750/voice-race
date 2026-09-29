import './WelcomeScreen.css';
import questionCoinImg from '../assets/QuestionCoin.png';
import daddcoinImg from '../assets/daddcoin.webp';
import descriptionImg from '../assets/description.png';
import exitButtonImg from '../assets/exit_transparent.png';
import startButtonImg from '../assets/start_transparent.png';

export class WelcomeScreen {
  constructor(root, options = {}) {
    this.root = root;
    this.onStart = options.onStart;
    this.onExit = options.onExit || (() => { window.history.back(); });
    this.#build();
  }

  #build() {
    this.el = document.createElement('div');
    this.el.className = 'welcome-screen-new';
    
    const statsBadge = document.createElement('div');
    statsBadge.className = 'welcome-stats-bg';
    
    const qCoin = document.createElement('img');
    qCoin.src = questionCoinImg;
    qCoin.className = 'welcome-qcoin';
    
    this.qCount = document.createElement('span');
    this.qCount.className = 'welcome-count';
    this.qCount.textContent = '10';
    
    const separator = document.createElement('span');
    separator.className = 'welcome-separator';
    separator.textContent = '=';
    
    this.daddPoints = document.createElement('span');
    this.daddPoints.className = 'welcome-points';
    this.daddPoints.textContent = '10';
    
    const dCoin = document.createElement('img');
    dCoin.src = daddcoinImg;
    dCoin.className = 'welcome-dcoin';
    
    statsBadge.append(qCoin, this.qCount, separator, this.daddPoints, dCoin);
    
    const exitBtn = document.createElement('button');
    exitBtn.className = 'welcome-action-btn welcome-exit-btn';
    exitBtn.type = 'button';
    exitBtn.setAttribute('aria-label', 'خروج');
    exitBtn.innerHTML = `<img src="${exitButtonImg}" alt="خروج" />`;
    exitBtn.onclick = () => {
      if (this.onExit) this.onExit();
    };
    
    // Body
    const body = document.createElement('div');
    body.className = 'welcome-body';
    
    const description = document.createElement('img');
    description.className = 'welcome-description';
    description.src = descriptionImg;
    description.alt = "How to play";
    
    body.append(description);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'welcome-footer';

    const startBtnImage = document.createElement('img');
    startBtnImage.src = startButtonImg;
    startBtnImage.alt = '';
    startBtnImage.setAttribute('aria-hidden', 'true');
    
    this.startBtn = document.createElement('button');
    this.startBtn.className = 'welcome-action-btn welcome-start-btn';
    this.startBtn.type = 'button';
    this.startBtn.setAttribute('aria-label', 'ابدأ');
    this.loadingLabel = document.createElement('span');
    this.loadingLabel.className = 'welcome-loading-label';
    this.startBtn.append(startBtnImage, this.loadingLabel);
    this.startBtn.onclick = () => {
      if (this.onStart) this.onStart();
    };
    
    footer.append(exitBtn, this.startBtn);
    
    this.el.append(statsBadge, body, footer);
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
      this.startBtn.textContent = 'تحميل';
      this.startBtn.disabled = true;
    } else {
      this.loadingLabel.textContent = '';
      this.startBtn.classList.remove('is-loading');
      this.startBtn.setAttribute('aria-label', 'ابدأ');
      this.startBtn.disabled = false;
    }
  }
}
