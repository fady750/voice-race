import { blobToWav } from "./wav.js";
import { SpeechError, SpeechService, normalizePronunciationResult } from "./SpeechService.js";

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export class RealSpeechService extends SpeechService {
  constructor() {
    super();
    this.session = null;
  }

  isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  async startRecording({ language = "ar-EG" } = {}) {
    if (this.session?.recording) return;
    const locale = language || "ar-EG";

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

    this.session = {
      language: locale,
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
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "recorder_unavailable");
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
    this.#startRecognition(locale);
  }

  #startRecognition(language) {
    const Ctor = getRecognitionCtor();
    const session = this.session;
    if (!Ctor || !session) return;

    const recognition = new Ctor();
    recognition.lang = language || "ar-EG";
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.continuous = true;

    const collect = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j += 1) {
          const alt = result[j];
          const text = alt?.transcript?.trim();
          if (!text) continue;
          if (!session.alternatives.includes(text)) session.alternatives.push(text);
          if (result.isFinal || j === 0) {
            session.recognizedText = text;
            session.confidence = Number(alt.confidence) || session.confidence;
          }
        }
      }
    };

    recognition.onresult = collect;
    recognition.onerror = (event) => {
      session.recognitionError = event?.error || "";
    };
    session.recognitionEnded = new Promise((resolve) => {
      recognition.onend = () => resolve();
    });

    try {
      recognition.start();
      session.recognition = recognition;
    } catch {
      session.recognition = null;
      session.recognitionEnded = Promise.resolve();
    }
  }

  async stopRecording() {
    const session = this.session;
    if (!session || (!session.recording && !session.mediaRecorder)) {
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
      recorder.onerror = () => reject(new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "recorder_error"));
      recorder.onstop = () => {
        resolve(new Blob(session.chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      try {
        if (recorder.state === "recording") recorder.requestData?.();
        recorder.stop();
      } catch (error) {
        reject(error);
      }
    });

    try {
      session.recognition?.stop();
    } catch {
      /* already stopped */
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
      /* ignore */
    }
    if (session.mediaRecorder && session.mediaRecorder.state !== "inactive") {
      try {
        session.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.#releaseSession(true);
  }

  #releaseMicOnly(session) {
    session.mediaStream?.getTracks().forEach((track) => track.stop());
    session.mediaStream = null;
    session.mediaRecorder = null;
    try {
      session.recognition?.abort();
    } catch {
      /* ignore */
    }
    session.recognition = null;
  }

  #releaseSession(clearTranscript) {
    if (!this.session) return;
    this.#releaseMicOnly(this.session);
    if (clearTranscript) this.session = null;
  }

  async assessPronunciation(audio, expectedText, language = "ar-EG", question = null) {
    const session = this.session;
    this.session = null;

    const blob = audio instanceof Blob ? audio : session?.audioBlob;
    if (!blob || blob.size < 200) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "empty_audio");
    }

    const locale = language || question?.language || session?.language || "ar-EG";
    const referenceText = question?.fullyVocalizedText || expectedText;
    const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const azureRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const hasRecognizer = Boolean(getRecognitionCtor());
    const hasAzure = Boolean(azureKey && azureRegion);

    if (!hasRecognizer && !hasAzure) {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "no_engine");
    }

    let azureSignals = null;
    if (hasAzure) {
      try {
        azureSignals = await this.#assessWithAzure(blob, referenceText, locale, azureKey, azureRegion);
      } catch (error) {
        if (!session?.recognizedText && !session?.alternatives?.length) throw error;
      }
    }

    const recognizedText = azureSignals?.recognizedText || session?.recognizedText || "";
    const alternatives = [
      ...(session?.alternatives || []),
      azureSignals?.recognizedText,
    ].filter(Boolean);

    if (!recognizedText && !hasAzure && session?.recognitionError === "network") {
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "api_failed");
    }

    return normalizePronunciationResult({
      expectedText: referenceText,
      recognizedText,
      alternatives,
      pronunciationScore: azureSignals?.pronunciationScore,
      wordAccuracy: azureSignals?.wordAccuracy,
      confidence: azureSignals?.confidence || session?.confidence || 0,
      providerPhonemes: azureSignals?.providerPhonemes || null,
      question,
    });
  }

  async #assessWithAzure(audio, expectedText, language, key, region) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const assessment = {
      ReferenceText: expectedText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    };
    const assessmentHeader = btoa(unescape(encodeURIComponent(JSON.stringify(assessment))));
    try {
      let body = audio;
      let contentType = audio.type || "audio/wav";
      try {
        body = await blobToWav(audio);
        contentType = "audio/wav; codecs=audio/pcm";
      } catch {
        body = audio;
        contentType = audio.type || "audio/webm";
      }

      const response = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(language)}&format=detailed`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": contentType,
            Accept: "application/json",
            "Pronunciation-Assessment": assessmentHeader,
          },
          body,
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "api_failed");
      }
      const data = await response.json();
      const best = data.NBest?.[0] || {};
      const recognizedText = best.Display || best.Lexical || data.DisplayText || data.Text || "";
      const assessmentResult = best.PronunciationAssessment || data.NBest?.[0]?.PronunciationAssessment || {};
      const words = best.Words || [];
      const wordAccuracy = words.length
        ? words.reduce((sum, word) => sum + Number(word.PronunciationAssessment?.AccuracyScore || 0), 0) / words.length
        : Number(assessmentResult.AccuracyScore);
      const pronunciationScore = Number(
        assessmentResult.PronScore ?? assessmentResult.AccuracyScore ?? wordAccuracy,
      );
      const providerPhonemes = [];
      for (const word of words) {
        for (const phoneme of word.Phonemes || []) {
          const accuracy = Number(phoneme.PronunciationAssessment?.AccuracyScore);
          providerPhonemes.push({
            symbol: phoneme.Phoneme || "",
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
          });
        }
      }
      const scoredPhonemes = providerPhonemes.filter((item) => item.accuracy != null);
      return {
        recognizedText,
        pronunciationScore: Number.isFinite(pronunciationScore) ? pronunciationScore : null,
        wordAccuracy: Number.isFinite(wordAccuracy) ? wordAccuracy : null,
        confidence: Number(best.Confidence) || 0,
        providerPhonemes: scoredPhonemes.length ? scoredPhonemes : null,
      };
    } catch (error) {
      if (error instanceof SpeechError) throw error;
      throw new SpeechError("لم نتمكن من سماعك، حاول مرة أخرى.", "api_failed");
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
