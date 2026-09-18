export class GameHUD {
  constructor(root) {
    this.el = document.createElement("header");
    this.el.className = "game-hud";
    this.el.innerHTML = `
      <div class="hud-coin">
        <img class="coin-icon" src="/assets/daddcoin.webp" alt="Coin" style="width: 24px; height: 24px; object-fit: contain; margin-left: 6px;" />
        <span class="coin-value">0</span>
      </div>
      <div class="hud-right">
        <div class="hud-progress">
          <span class="flag" aria-hidden="true">⚑</span>
          <span class="progress-value">1/5</span>
        </div>
        <button class="hud-close" type="button" aria-label="إغلاق">×</button>
      </div>
    `;
    root.appendChild(this.el);
    this.coinValue = this.el.querySelector(".coin-value");
    this.progressValue = this.el.querySelector(".progress-value");
    this.closeBtn = this.el.querySelector(".hud-close");
  }

  setCoins(value) {
    this.coinValue.textContent = String(value);
  }

  setProgress(current, total) {
    this.progressValue.textContent = `${current}/${total}`;
  }
}
