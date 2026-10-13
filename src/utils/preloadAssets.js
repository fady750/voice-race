import { ASSETS } from "../config.js";

// Welcome Screen Assets
import statsBgImage from "../assets/QuestionNumber.png";
import questionCoinImg from "../assets/QuestionCoin.png";
import daddcoinImg from "../assets/daddcoin.webp";
import descriptionImg from "../assets/description.png";
import exitButtonImg from "../assets/Exit1.png";
import startButtonImg from "../assets/start_transparent.png";

export const WELCOME_ASSETS = {
  statsBg: statsBgImage,
  questionCoin: questionCoinImg,
  daddcoin: daddcoinImg,
  description: descriptionImg,
  exitBtn: exitButtonImg,
  startBtn: startButtonImg,
};

// Celebration Assets
import celebrationRobots from "../Celebration/assets/celbr.png";
import fireworksSoundUrl from "../Celebration/fireworks.mp3";

export const CELEBRATION_ASSETS = {
  robots: celebrationRobots,
  fireworksSound: fireworksSoundUrl,
};

// Results Panel Assets
import panelArt from "../assets/results-panel-empty.png";
import celebrationTitle from "../ResultsPanel/assets/good.png";
import retryButtonImage from "../assets/Retry.png";

export const RESULTS_ASSETS = {
  panelArt: panelArt,
  celebrationTitle: celebrationTitle,
  exitBtn: exitButtonImg,
  retryBtn: retryButtonImage,
};

// Audio Assets
import carsSound from "../assets/cars.mp3";

export const AUDIO_ASSETS = {
  cars: carsSound,
  fireworks: fireworksSoundUrl,
};

// Consolidated image registry for complete game preloading
export const ALL_PRELOAD_ASSETS = {
  ...ASSETS,
  ...WELCOME_ASSETS,
  celebrationRobots,
  resultsPanelArt: panelArt,
  resultsCelebrationTitle: celebrationTitle,
  resultsRetryBtn: retryButtonImage,
};
