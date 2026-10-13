import { ASSETS } from "./config.js";
import { ALL_PRELOAD_ASSETS, AUDIO_ASSETS } from "./utils/preloadAssets.js";
import { Game } from "./game/Game.js";
import { preloadGameAssets, preloadAudio, preloadImage } from "./utils/preload.js";
import { api } from "./utils/api.js";
import { buildQuestion } from "./speech/arabicG2P.js";
import { createQuestions } from "./data/questions.js";
import { ErrorScreen } from "./components/ErrorScreen/ErrorScreen.js";
import { handleExitSite } from "./utils/navigation.js";
import "./styles.css";

const app = document.getElementById("app");

async function boot() {
  app.innerHTML = `<div class="boot-screen">تحميل</div>`;

  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('lessonId') || urlParams.get('lessonid') || urlParams.get('lesson_id');
  const isDemo = urlParams.get('demo') === 'true';

  // 1. Check for Lesson ID
  if (!lessonId && !isDemo) {
    console.warn('[Boot] Missing lessonId parameter in URL.');
    new ErrorScreen(app, {
      description: 'لا يمكننا العثور على الدرس المطلوب. يرجى التأكد من الرابط أو العودة للرئيسية.',
      onExit: handleExitSite
    });
    return;
  }

  // 2. Check for Token / Refresh Endpoint Error
  if (!isDemo) {
    const token = await api.ensureToken();
    if (!token) {
      console.warn('[Boot] Failed to obtain authentication token via URL or refresh endpoint.');
      new ErrorScreen(app, {
        description: 'تعذر الحصول على رمز الدخول. يرجى المحاولة مرة أخرى أو العودة للرئيسية.',
        onExit: handleExitSite
      });
      return;
    }
  }

  try {
    // Preload all assets for game world, welcome screen, celebration, results panel, and sound effects
    await preloadGameAssets({
      images: ALL_PRELOAD_ASSETS,
      audio: AUDIO_ASSETS,
    });

    let questionProvider = null;

    if (isDemo && !lessonId) {
      questionProvider = createQuestions;
    } else {
      // 3. Check Question Endpoint / No Questions
      const [apiQuestions] = await Promise.all([
        api.fetchQuestions(),
        api.startGameSession().catch(e => console.error('[API] Failed to start session during boot:', e))
      ]);

      if (!apiQuestions || apiQuestions.length === 0) {
        console.warn('[Boot] No questions returned from question endpoint.');
        new ErrorScreen(app, {
          description: 'لا توجد أسئلة متاحة في هذا التقييم. يرجى المحاولة مرة أخرى أو العودة للرئيسية.',
          onExit: handleExitSite
        });
        return;
      }

      // Background preload question-specific media (audio and images)
      if (Array.isArray(apiQuestions)) {
        apiQuestions.forEach((q) => {
          if (q.audioUrl) preloadAudio(q.audioUrl);
          if (q.imageUrl) preloadImage(q.imageUrl);
          if (q.options?.[0]?.imageUrl) preloadImage(q.options[0].imageUrl);
        });
      }

      questionProvider = () => apiQuestions.map(q => {
        const text = q.correctAnswer || q.question;
        const question = buildQuestion({
          id: q.id,
          word: text,
          fullyVocalizedText: text,
          language: "ar-EG",
          audio: q.audioUrl
        });
        question.questionText = q.question || null;
        question.imageUrl = q.imageUrl || q.options?.[0]?.imageUrl || null;
        return question;
      });
    }

    const game = new Game(app, questionProvider);
    game.start();
  } catch (error) {
    console.error('[Boot] Unexpected error during boot:', error);
    new ErrorScreen(app, {
      description: 'حدث خطأ أثناء جلب الأسئلة. يرجى المحاولة مرة أخرى.',
      onExit: handleExitSite
    });
  }
}

boot();
