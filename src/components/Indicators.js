import { RACE } from "../config.js";
import { clamp, smoothDamp } from "../utils/easing.js";

export class RacePositionBar {
  constructor(root, { playerSrc, botSrc }) {
    this.defaultPlayerSrc = playerSrc;
    this.el = document.createElement("div");
    this.el.className = "race-bar";
    this.el.innerHTML = `
      <div class="race-bar-track">
        <span class="race-bar-finish" aria-hidden="true">⚑</span>
        <span class="race-bar-line"></span>
        <div class="race-marker player-marker">
          <span class="race-rank">1st</span>
          <span class="race-avatar player-avatar-wrapper">
            <img class="player-avatar-img" alt="اللاعب" draggable="false" />
            <img class="race-avatar-frame" alt="Frame" style="display: none;" />
          </span>
        </div>
        <div class="race-marker bot-marker">
          <span class="race-rank">2nd</span>
          <span class="race-avatar">
            <img alt="حكيم" draggable="false" />
          </span>
        </div>
      </div>
    `;
    const playerImg = this.el.querySelector(".player-marker .player-avatar-img");
    playerImg.src = playerSrc;
    playerImg.onerror = () => { playerImg.src = this.defaultPlayerSrc; };
    this.el.querySelector(".bot-marker img").src = botSrc;
    root.appendChild(this.el);

    this.track = this.el.querySelector(".race-bar-track");
    this.playerMarker = this.el.querySelector(".player-marker");
    this.botMarker = this.el.querySelector(".bot-marker");
    this.playerRank = this.playerMarker.querySelector(".race-rank");
    this.botRank = this.botMarker.querySelector(".race-rank");

    this.playerY = 0.9;
    this.botY = 0.9;
    this.playerVel = 0;
    this.botVel = 0;
    this.playerPlace = 1;
    this.botPlace = 2;
    this.#paint();
  }

  setPlayerAvatar(avatarUrl, accessoryUrl) {
    const playerImg = this.playerMarker.querySelector(".player-avatar-img");
    const playerFrame = this.playerMarker.querySelector(".race-avatar-frame");
    const raceAvatar = this.playerMarker.querySelector(".race-avatar");

    if (playerImg) {
      if (avatarUrl) {
        playerImg.src = avatarUrl;
        playerImg.onerror = () => { playerImg.src = this.defaultPlayerSrc; };
      } else {
        playerImg.src = this.defaultPlayerSrc;
      }
    }

    if (playerFrame) {
      if (accessoryUrl) {
        playerFrame.src = accessoryUrl;
        playerFrame.style.display = "block";
        if (raceAvatar) {
          raceAvatar.style.borderColor = "transparent";
          raceAvatar.style.boxShadow = "none";
        }
        playerFrame.onerror = () => {
          playerFrame.style.display = "none";
          if (raceAvatar) {
            raceAvatar.style.borderColor = "rgba(255,255,255,0.92)";
            raceAvatar.style.boxShadow = "";
          }
        };
      } else {
        playerFrame.style.display = "none";
        if (raceAvatar) {
          raceAvatar.style.borderColor = "rgba(255,255,255,0.92)";
          raceAvatar.style.boxShadow = "";
        }
      }
    }
  }

  reset() {
    this.playerY = 0.9;
    this.botY = 0.9;
    this.playerVel = 0;
    this.botVel = 0;
    this.playerPlace = 1;
    this.botPlace = 2;
    this.#setPlaces();
    this.#paint();
  }

  update(deltaTime, raceState) {
    const playerProgress = Number(raceState?.playerProgress) || 0;
    const botProgress = Number(raceState?.botProgress) || 0;
    const playerTarget = 0.9 - (playerProgress / 100) * 0.82;
    const botTarget = 0.9 - (botProgress / 100) * 0.82;

    const player = smoothDamp(this.playerY, playerTarget, this.playerVel, RACE.markerSmoothTime, deltaTime, 3.2);
    const bot = smoothDamp(this.botY, botTarget, this.botVel, RACE.markerSmoothTime, deltaTime, 3.2);
    this.playerY = player.value;
    this.playerVel = player.velocity;
    this.botY = bot.value;
    this.botVel = bot.velocity;

    if (Math.abs(this.botY - this.playerY) > 0.035) {
      this.playerPlace = this.playerY < this.botY ? 1 : 2;
      this.botPlace = this.playerPlace === 1 ? 2 : 1;
      this.#setPlaces();
    }

    this.#paint();
  }

  #setPlaces() {
    this.playerRank.textContent = this.playerPlace === 1 ? "1st" : "2nd";
    this.botRank.textContent = this.botPlace === 1 ? "1st" : "2nd";
    this.playerMarker.dataset.place = String(this.playerPlace);
    this.botMarker.dataset.place = String(this.botPlace);
  }

  #paint() {
    this.playerMarker.style.top = `${this.playerY * 100}%`;
    this.botMarker.style.top = `${this.botY * 100}%`;
  }
}

export class PlayerIndicator {
  constructor(root, src) {
    this.bar = new RacePositionBar(root, { playerSrc: src, botSrc: src });
  }

  setPlace() {}
}

export class BotIndicator {
  constructor() {}
  setPlace() {}
}
