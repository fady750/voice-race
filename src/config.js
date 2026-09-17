export const ASSETS = {
  background: "/assets/bg_cars.png",
  road: "/assets/road.png",
  car1: "/assets/car1.png",
  car2: "/assets/car2.png",
  hakim: "/assets/hakim.png",
  user: "/assets/user.png",
};

export const ROAD_SPEED = 1200;
export const BACKGROUND_SPEED = 22;
export const BACKGROUND_TOP = -36;
export const BACKGROUND_BOTTOM = 36;
export const BACKGROUND_EASE_ZONE = 14;

export const RECORDING_MAX_MS = 4000;
export const MOCK_RECORDING_MS = 1600;
export const MOCK_PROCESSING_MS = 700;
export const FEEDBACK_MS = 1600;
export const QUESTION_TRANSITION_MS = 420;

export const USE_MOCK_SPEECH =
  String(import.meta.env.VITE_USE_MOCK_SPEECH ?? "false").toLowerCase() === "true";

export const SPEECH_DEBUG =
  Boolean(import.meta.env.DEV) &&
  String(import.meta.env.VITE_SPEECH_DEBUG ?? "true").toLowerCase() !== "false";

export const SPEECH_LANGUAGE = import.meta.env.VITE_SPEECH_LANGUAGE || "ar-EG";

export const PRONUNCIATION_THRESHOLDS = {
  correct: 80,
  close: 55,
};

export const RACE = {
  correctGain: 10,
  closeGain: 5,
  wrongBotGain: 5,
  botPassiveGain: 1,
  pixelsPerPoint: 8,
  surgeCorrect: 34,
  surgeClose: 16,
  surgeWrong: 22,
  maxVisualLead: 150,
  carSmoothTime: 0.58,
  markerSmoothTime: 0.72,
  surgeDecay: 2.4,
  roadBurstCorrect: 260,
  roadBurstClose: 110,
  roadSmoothTime: 0.5,
};

export const COINS = {
  start: 10,
  correct: 8,
  close: 3,
  wrong: 0,
};

export const TOTAL_QUESTIONS = 5;
