import { pronunciationEvaluator } from "./PronunciationEvaluator.js";
import { SpeechError, SpeechService } from "./SpeechService.js";

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export class LocalSpeechService extends SpeechService {
  constructor() {
    super();
    this.session = null;
  }

  isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia && getRecognitionCtor());
  }

  async startRecording({ language = "ar-EG" } = {}) {
    if (this.session?.recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new SpeechError("هذا المتصفح لا يدعم تسجيل الصوت.", "mic_unavailable");
    }
    if (!getRecognitionCtor()) {
      throw new SpeechError("هذا المتصفح لا يدعم التعرف العربي المحلي.", "local_recognizer_unavailable");
    }

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
      throw new SpeechError(
        "لم نتمكن من سماعك، حاول مرة أخرى.",
        denied ? "permission_denied" : "mic_unavailable",
      );
    }

    const track = mediaStream.getAudioTracks()[0];
    if (track && track.readyState !== "live") {
      await new Promise((resolve) => {
        const done = () => resolve();
        track.addEventListener("unmute", done, { once: true });
        window.setTimeout(done, 250);
      });
    }

    const Ctor = getRecognitionCtor();
    this.session = {
      language: language || "ar-EG",
      mediaStream,
      mediaRecorder: null,
      chunks: [],
      recognizedText: "",
      alternatives: [],
      confidence: 0,
      recognition: null,
      recognitionEnded: Promise.resolve(),
      recognitionError: "",
      recording: true,
      stopped: false,
    };

    if (typeof MediaRecorder === "undefined") {
      this.#releaseSession(true);
      throw new SpeechError("هذا المتصفح لا يدعم تسجيل الصوت.", "recorder_unavailable");
    }

    const mimeType = pickRecorderMime();
    const recorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);
    recorder.ondataavailable = (event) => {
      if (event.data?.size) this.session?.chunks.push(event.data);
    };
    this.session.mediaRecorder = recorder;
    recorder.start(120);

    const recognition = new Ctor();
    recognition.lang = language || "ar-EG";
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const session = this.session;
      if (!session) return;
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
      if (this.session) this.session.recognitionError = event?.error || "";
    };
    this.session.recognitionEnded = new Promise((resolve) => {
      recognition.onend = resolve;
    });
    try {
      recognition.start();
      this.session.recognition = recognition;
    } catch (error) {
      this.#releaseSession(true);
      throw new SpeechError("تعذر تشغيل التعرف العربي المحلي.", "local_recognizer_failed");
    }
  }

  async stopRecording() {
    const session = this.session;
    if (!session?.recording) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "not_recording");
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
    const blob = audio instanceof Blob ? audio : session?.audioBlob;
    if (!blob || blob.size < 1) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "empty_audio");
    }
    if (!session?.recognizedText && !session?.alternatives?.length) {
      throw new SpeechError("لم نتعرف على النطق العربي. حاول مرة أخرى بوضوح.", "local_recognizer_empty");
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
