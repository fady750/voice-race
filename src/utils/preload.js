export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

export async function preloadImages(sources) {
  const entries = Object.entries(sources);
  const images = await Promise.all(entries.map(([, src]) => preloadImage(src)));
  return Object.fromEntries(entries.map(([key], index) => [key, images[index]]));
}
