import { ASSETS } from "./config.js";
import { Game } from "./game/Game.js";
import { preloadImages } from "./utils/preload.js";
import "./styles.css";

const app = document.getElementById("app");

async function boot() {
  app.innerHTML = `<div class="boot-screen">جاري التحميل...</div>`;
  try {
    await preloadImages(ASSETS);
    const game = new Game(app);
    game.start();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="boot-screen">تعذر تحميل اللعبة. أعد المحاولة.</div>`;
  }
}

boot();
