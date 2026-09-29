const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export const config = {
  api: { bodyParser: false },
};

async function readAudio(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_AUDIO_BYTES) throw new Error("audio_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function pronunciationAssessment(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed." } });
  }

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return response.status(503).json({
      error: {
        code: "pronunciation_model_missing",
        message: "خدمة التعرف على الصوت غير مُهيأة على الخادم.",
      },
    });
  }

  const language = request.headers["x-pronunciation-language"] || "ar-EG";
  const assessment = request.headers["x-pronunciation-assessment"];
  if (typeof language !== "string" || typeof assessment !== "string") {
    return response.status(400).json({ error: { code: "bad_pronunciation_request", message: "طلب تقييم النطق غير مكتمل." } });
  }

  try {
    const audio = await readAudio(request);
    const azureResponse = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(language)}&format=detailed`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": request.headers["content-type"] || "audio/wav",
          Accept: "application/json",
          "Pronunciation-Assessment": assessment,
        },
        body: audio,
        signal: AbortSignal.timeout(12000),
      },
    );
    const payload = await azureResponse.text();
    response.status(azureResponse.status);
    response.setHeader("Content-Type", azureResponse.headers.get("content-type") || "application/json; charset=utf-8");
    return response.send(payload);
  } catch (error) {
    if (error?.message === "audio_too_large") {
      return response.status(413).json({ error: { code: "audio_too_large", message: "التسجيل أطول من الحد المسموح به." } });
    }
    return response.status(502).json({ error: { code: "pronunciation_proxy_failed", message: "تعذر الاتصال بخدمة تقييم النطق." } });
  }
}
