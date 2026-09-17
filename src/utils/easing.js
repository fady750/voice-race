export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function now() {
  return performance.now();
}

export function expSmoothing(deltaTime, speed) {
  return 1 - Math.exp(-Math.max(0, speed) * Math.max(0, deltaTime));
}

export function smoothDamp(current, target, velocity, smoothTime, deltaTime, maxSpeed = Infinity) {
  const dt = Math.max(0.00001, deltaTime);
  const time = Math.max(0.0001, smoothTime);
  const omega = 2 / time;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;
  const maxChange = maxSpeed * time;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;
  const temp = (velocity + omega * change) * dt;
  let newVelocity = (velocity - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    newVelocity = (output - originalTo) / dt;
  }
  return { value: output, velocity: newVelocity };
}
