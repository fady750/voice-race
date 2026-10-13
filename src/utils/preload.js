export function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = (err) => {
      console.warn(`[Preload] Warning: image failed to load: ${src}`, err);
      resolve(null);
    };
    image.src = src;
  });
}

export function preloadAudio(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    try {
      const audio = new Audio();
      audio.preload = "auto";
      const onDone = () => {
        audio.removeEventListener("canplaythrough", onDone);
        audio.removeEventListener("error", onDone);
        resolve(audio);
      };
      audio.addEventListener("canplaythrough", onDone, { once: true });
      audio.addEventListener("error", onDone, { once: true });
      audio.src = src;
      audio.load();
      // Timeout after 3.5s to avoid stalling game boot on slow audio connections
      setTimeout(() => resolve(audio), 3500);
    } catch (_) {
      resolve(null);
    }
  });
}

export async function preloadImages(sources) {
  const entries = Object.entries(sources || {});
  const images = await Promise.all(entries.map(([, src]) => preloadImage(src)));
  return Object.fromEntries(entries.map(([key], index) => [key, images[index]]));
}

export async function preloadAudioMap(sources) {
  const entries = Object.entries(sources || {});
  const audioElements = await Promise.all(entries.map(([, src]) => preloadAudio(src)));
  return Object.fromEntries(entries.map(([key], index) => [key, audioElements[index]]));
}

export async function preloadGameAssets({ images = {}, audio = {} } = {}) {
  const [loadedImages, loadedAudio] = await Promise.all([
    preloadImages(images),
    preloadAudioMap(audio),
  ]);
  return { images: loadedImages, audio: loadedAudio };
}
