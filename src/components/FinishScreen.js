export class FinishScreen {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "finish-screen";
    this.el.innerHTML = `
      <div class="finish-card">
        <p class="finish-kicker"></p>
        <h2 class="finish-title"></h2>
        <div class="finish-stats">
          <div><span>نتيجتك</span><strong class="stat-player"></strong></div>
          <div><span>نتيجة حكيم</span><strong class="stat-bot"></strong></div>
          <div><span>العملات</span><strong class="stat-coins"></strong></div>
          <div><span>الأسئلة</span><strong class="stat-questions"></strong></div>
        </div>
        <div class="finish-actions">
          <button class="btn-primary replay" type="button">العب مرة أخرى</button>
          <button class="btn-ghost exit" type="button">خروج</button>
        </div>
      </div>
    `;
    root.appendChild(this.el);
    this.kicker = this.el.querySelector(".finish-kicker");
    this.title = this.el.querySelector(".finish-title");
    this.player = this.el.querySelector(".stat-player");
    this.bot = this.el.querySelector(".stat-bot");
    this.coins = this.el.querySelector(".stat-coins");
    this.questions = this.el.querySelector(".stat-questions");
    this.replayBtn = this.el.querySelector(".replay");
    this.exitBtn = this.el.querySelector(".exit");
  }

  show({ playerWon, playerProgress, botProgress, coins, totalQuestions }) {
    this.kicker.textContent = "Great Job!";
    this.title.textContent = playerWon ? "YOU WIN!" : "TRY AGAIN!";
    this.player.textContent = String(playerProgress);
    this.bot.textContent = String(botProgress);
    this.coins.textContent = String(coins);
    this.questions.textContent = String(totalQuestions);
    this.el.classList.add("is-visible");
  }

  hide() {
    this.el.classList.remove("is-visible");
  }
}

export class ExitModal {
  constructor(root) {
    this.el = document.createElement("div");
    this.el.className = "exit-modal";
    this.el.innerHTML = `
      <div class="exit-card">
        <p>هل تريد الخروج من السباق؟</p>
        <div class="finish-actions">
          <button class="btn-primary stay" type="button">متابعة اللعب</button>
          <button class="btn-ghost leave" type="button">خروج</button>
        </div>
      </div>
    `;
    root.appendChild(this.el);
    this.stayBtn = this.el.querySelector(".stay");
    this.leaveBtn = this.el.querySelector(".leave");
  }

  show() {
    this.el.classList.add("is-visible");
  }

  hide() {
    this.el.classList.remove("is-visible");
  }
}
