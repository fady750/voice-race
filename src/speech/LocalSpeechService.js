import { pronunciationEvaluator } from "./PronunciationEvaluator.js";
import { SpeechError, SpeechService } from "./SpeechService.js";

const GENERIC_HEARD_MESSAGE = "لم نتمكن من سماعك، حاول مرة أخرى.";
const MAX_RECOGNITION_RESTARTS = 3;
// Errors that restarting the recognizer cannot fix.
const FATAL_RECOGNITION_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "network", "language-not-supported"]);

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isMobileDevice() {
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac but has a touch screen.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function recognitionErrorToSpeechError(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return new SpeechError("اسمح باستخدام الميكروفون من إعدادات المتصفح.", "permission_denied");
    case "audio-capture":
      return new SpeechError("لم نجد ميكروفون يعمل على جهازك.", "mic_unavailable");
    case "network":
      return new SpeechError("تحقق من اتصال الإنترنت وحاول مرة أخرى.", "network");
    default:
      return new SpeechError("لم نتعرف على النطق العربي. حاول مرة أخرى بوضوح.", "local_recognizer_empty");
  }
}

export class LocalSpeechService extends SpeechService {
  constructor() {
    super();
    this.session = null;
  }

  isSupported() {
    return Boolean(getRecognitionCtor() && (isMobileDevice() || navigator.mediaDevices?.getUserMedia));
  }

  async startRecording({ language = "ar-EG" } = {}) {
    if (this.session?.recording) return;
    // Browsers only expose the microphone / speech recognition on HTTPS (or localhost).
    if (window.isSecureContext === false) {
      throw new SpeechError("الميكروفون يعمل فقط عبر رابط آمن (HTTPS).", "insecure_context");
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      throw new SpeechError("هذا المتصفح لا يدعم التعرف العربي المحلي.", "local_recognizer_unavailable");
    }

    this.session = {
      language: language || "ar-EG",
      mediaStream: null,
      mediaRecorder: null,
      chunks: [],
      recognizedText: "",
      alternatives: [],
      confidence: 0,
      recognition: null,
      recognitionEnded: Promise.resolve(),
      resolveEnded: () => {},
      recognitionError: "",
      restarts: 0,
      recording: true,
      stopped: false,
    };

    // Phones allow only one consumer of the microphone. Opening getUserMedia next to
    // SpeechRecognition makes the recognizer return nothing, so on mobile the recognizer
    // is used on its own (scoring relies on the recognized text, not the recorded audio).
    // The recognizer must also be started synchronously inside the tap (user gesture).
    if (!isMobileDevice()) {
      await this.#startRecorder();
    }
    if (!this.session) return;

    this.session.recognitionEnded = new Promise((resolve) => {
      this.session.resolveEnded = resolve;
    });
    try {
      this.#startRecognition(Ctor);
    } catch (error) {
      this.#releaseSession(true);
      throw new SpeechError("تعذر تشغيل التعرف العربي المحلي.", "local_recognizer_failed");
    }
  }

  async #startRecorder() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;

    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
    } catch (error) {
      const denied = error?.name === "NotAllowedError";
      if (denied) {
        this.#releaseSession(true);
        throw new SpeechError("اسمح باستخدام الميكروفون من إعدادات المتصفح.", "permission_denied");
      }
      // The recorder is optional; the recognizer can still work without it.
      return;
    }

    const track = mediaStream.getAudioTracks()[0];
    if (track && track.readyState !== "live") {
      await new Promise((resolve) => {
        const done = () => resolve();
        track.addEventListener("unmute", done, { once: true });
        window.setTimeout(done, 250);
      });
    }

    if (!this.session) {
      mediaStream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.session.mediaStream = mediaStream;

    try {
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) this.session?.chunks.push(event.data);
      };
      this.session.mediaRecorder = recorder;
      recorder.start(120);
    } catch {
      // Recording is optional; keep going with recognition only.
      this.session.mediaRecorder = null;
    }
  }

  #startRecognition(Ctor) {
    const session = this.session;
    const recognition = new Ctor();
    recognition.lang = session.language;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.continuous = false; // Better compatibility on mobile (iOS/Safari)
    recognition.onresult = (event) => {
      if (this.session !== session) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
          const text = result[alternativeIndex]?.transcript?.trim();
          if (!text) continue;
          if (!session.alternatives.includes(text)) session.alternatives.push(text);
          if (result.isFinal || alternativeIndex === 0) {
            session.recognizedText = text;
            session.confidence = Number(result[alternativeIndex]?.confidence) || session.confidence;
          }
        }
      }
    };
    recognition.onerror = (event) => {
      session.recognitionError = event?.error || "";
    };
    recognition.onend = () => {
      // Mobile recognizers often end on their own after a short pause, before the user
      // taps stop. If nothing was heard yet, listen again instead of failing.
      const canRestart =
        session.recording &&
        !session.stopped &&
        !session.recognizedText &&
        !FATAL_RECOGNITION_ERRORS.has(session.recognitionError) &&
        session.restarts < MAX_RECOGNITION_RESTARTS &&
        this.session === session;
      if (canRestart) {
        session.restarts += 1;
        session.recognitionError = "";
        try {
          this.#startRecognition(Ctor);
          return;
        } catch {
          // Fall through and let the session end.
        }
      }
      session.resolveEnded();
    };
    session.recognition = recognition;
    recognition.start();
  }

  async stopRecording() {
    const session = this.session;
    if (!session?.recording) {
      throw new SpeechError(GENERIC_HEARD_MESSAGE, "not_recording");
    }
    session.recording = false;
    session.stopped = true;

    const blob = await new Promise((resolve, reject) => {
      const recorder = session.mediaRecorder;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(session.chunks, { type: recorder?.mimeType || "audio/webm" }));
        return;
      }
      recorder.onerror = () => reject(new SpeechError("تعذر حفظ التسجيل الصوتي.", "recorder_error"));
      recorder.onstop = () => resolve(new Blob(session.chunks, { type: recorder.mimeType || "audio/webm" }));
      try {
        recorder.requestData?.();
        recorder.stop();
      } catch {
        reject(new SpeechError("تعذر حفظ التسجيل الصوتي.", "recorder_error"));
      }
    });

    try {
      session.recognition?.stop();
    } catch {
      // Recognition may already have ended.
    }
    await Promise.race([
      session.recognitionEnded,
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);

    this.#releaseMicOnly(session);
    session.audioBlob = blob;
    return blob;
  }

  async cancelRecording() {
    const session = this.session;
    if (!session) return;
    session.recording = false;
    session.stopped = true;
    try {
      session.recognition?.abort();
    } catch {
      // Ignore an already-ended recognizer.
    }
    if (session.mediaRecorder && session.mediaRecorder.state !== "inactive") {
      try {
        session.mediaRecorder.stop();
      } catch {
        // Ignore an already-stopped recorder.
      }
    }
    this.#releaseSession(true);
  }

  async assessPronunciation(audio, expectedText, language = "ar-EG", question = null) {
    const session = this.session;
    this.session = null;
    // Scoring is based on the recognized text; the audio blob may be empty on mobile
    // where only the recognizer holds the microphone.
    const blob = audio instanceof Blob ? audio : session?.audioBlob || new Blob([], { type: "audio/webm" });
    if (!session?.recognizedText && !session?.alternatives?.length) {
      throw recognitionErrorToSpeechError(session?.recognitionError);
    }

    const recognizedText = session.recognizedText || session.alternatives[0] || "";
    return pronunciationEvaluator.evaluate({
      question: question || {
        id: "runtime-question",
        fullyVocalizedText: expectedText,
        language,
      },
      learnerSignals: {
        recognizedText,
        alternatives: session.alternatives,
        confidence: session.confidence,
      },
      learnerAudio: blob,
    });
  }

  #releaseMicOnly(session) {
    session.mediaStream?.getTracks().forEach((track) => track.stop());
    session.mediaStream = null;
    session.mediaRecorder = null;
    session.recognition = null;
  }

  #releaseSession(clearSession) {
    if (!this.session) return;
    this.#releaseMicOnly(this.session);
    if (clearSession) this.session = null;
  }
}
