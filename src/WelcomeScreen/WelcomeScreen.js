import './WelcomeScreen.css';
import questionCoinImg from '../assets/QuestionCoin.png';
import daddcoinImg from '../assets/daddcoin.webp';
import descriptionImg from '../assets/description.png';

export class WelcomeScreen {
  constructor(root, options = {}) {
    this.root = root;
    this.onStart = options.onStart;
    this.#build();
  }

  #build() {
    this.el = document.createElement('div');
    this.el.className = 'welcome-screen-new';
    
    // Header
    const header = document.createElement('div');
    header.className = 'welcome-header';
    
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
    separator.textContent = '>';
    
    this.daddPoints = document.createElement('span');
    this.daddPoints.className = 'welcome-points';
    this.daddPoints.textContent = '10';
    
    const dCoin = document.createElement('img');
    dCoin.src = daddcoinImg;
    dCoin.className = 'welcome-dcoin';
    
    statsBadge.append(qCoin, this.qCount, separator, this.daddPoints, dCoin);
    header.append(statsBadge);
    
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
    
    this.startBtn = document.createElement('button');
    this.startBtn.className = 'welcome-start-btn';
    this.startBtn.textContent = 'ابدَأ!';
    this.startBtn.type = 'button';
    this.startBtn.onclick = () => {
      if (this.onStart) this.onStart();
    };
    
    footer.append(this.startBtn);
    
    this.el.append(header, body, footer);
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
      this.startBtn.textContent = 'جاري تحميل الأسئلة...';
      this.startBtn.disabled = true;
    } else {
      this.startBtn.textContent = 'ابدَأ!';
      this.startBtn.disabled = false;
    }
  }
}
