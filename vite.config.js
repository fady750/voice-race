import { defineConfig, loadEnv } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) {
        reject(new Error("audio_too_large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function azurePronunciationProxy(env) {
  return {
    name: "azure-pronunciation-proxy",
    configureServer(server) {
      server.middlewares.use("/api/pronunciation-assessment", async (request, response, next) => {
        if (request.method !== "POST") return next();

        const key = env.AZURE_SPEECH_KEY;
        const region = env.AZURE_SPEECH_REGION;
        if (!key || !region) {
          sendJson(response, 503, {
            error: {
              code: "pronunciation_model_missing",
              message: "نموذج تقييم النطق غير مُهيأ على الخادم. أضف \u2068AZURE_SPEECH_KEY\u2069 و \u2068AZURE_SPEECH_REGION\u2069 إلى \u2068.env.local\u2069 ثم أعد تشغيل خادم \u2068Vite\u2069.",
            },
          });
          return;
        }

        const language = request.headers["x-pronunciation-language"] || "ar-EG";
        const assessment = request.headers["x-pronunciation-assessment"];
        if (typeof language !== "string" || typeof assessment !== "string") {
          sendJson(response, 400, { error: { code: "bad_pronunciation_request", message: "طلب تقييم النطق غير مكتمل." } });
          return;
        }

        try {
          const audio = await readRequestBody(request);
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
            },
          );
          const body = await azureResponse.text();
          response.statusCode = azureResponse.status;
          response.setHeader("Content-Type", azureResponse.headers.get("content-type") || "application/json; charset=utf-8");
          response.end(body);
        } catch (error) {
          if (error?.message === "audio_too_large") {
            sendJson(response, 413, { error: { code: "audio_too_large", message: "التسجيل أطول من الحد المسموح به." } });
            return;
          }
          sendJson(response, 502, { error: { code: "pronunciation_proxy_failed", message: "تعذر الاتصال بخدمة تقييم النطق." } });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)));
  const env = loadEnv(mode, projectRoot, "");
  const keyConfigured = Boolean(env.AZURE_SPEECH_KEY?.trim());
  const regionConfigured = Boolean(env.AZURE_SPEECH_REGION?.trim());
  console.info(
    `[Azure proxy] root=${projectRoot} keyConfigured=${keyConfigured} regionConfigured=${regionConfigured}`,
  );
  return {
    plugins: [azurePronunciationProxy(env)],
    server: {
      port: 5179,
      host: true,
    },
    preview: {
      port: 4173,
    },
  };
});
