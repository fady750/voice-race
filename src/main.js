import { ASSETS } from "./config.js";
import { Game } from "./game/Game.js";
import { preloadImages } from "./utils/preload.js";
import { api } from "./utils/api.js";
import { buildQuestion } from "./speech/arabicG2P.js";
import { createQuestions } from "./data/questions.js";
import "./styles.css";

const app = document.getElementById("app");

async function boot() {
  app.innerHTML = `<div class="boot-screen">جاري التحميل...</div>`;
  try {
    await preloadImages(ASSETS);
    
    let questionProvider = createQuestions;

    if (api.hasToken) {
      const apiQuestions = await api.fetchQuestions();
      if (apiQuestions && apiQuestions.length > 0) {
        questionProvider = () => apiQuestions.map(q => {
          const text = q.correctAnswer || q.question;
          return buildQuestion({
            id: q.id,
            word: text,
            fullyVocalizedText: text,
            language: "ar-EG",
            audio: q.audioUrl
          });
        });
      }
    }

    const game = new Game(app, questionProvider);
    game.start();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="boot-screen">تعذر تحميل اللعبة. أعد المحاولة.</div>`;
  }
}

boot();
