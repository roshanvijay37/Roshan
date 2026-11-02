// Shared, mutable state for the effects that cross between the DOM and the
// particle scene: a click sends a shockwave through the cloud, hovering the
// contact links feeds the black hole, dragging it tilts the disk, a phone's
// tilt steers the camera. Like scrollState, a plain object both sides read
// every frame rather than React state.
export const fx = {
  // Last shockwave, in client pixels; the scene converts it to world units.
  wave: { x: 0, y: 0, amp: 0, speed: 9, at: -1e9 },
  // 0..1: something is feeding the black hole (a contact link is hovered).
  feed: 0,
  // 1 while the page is falling into the hole on its way back to the top.
  warp: 0,
  // Disk orientation from a drag, with its inertia.
  hole: { pitch: 0, roll: 0, vp: 0, vr: 0, dragging: false },
  // Phone tilt, -1..1 on each axis, relative to how it was first held.
  gyro: { x: 0, y: 0, active: false },
};

export function emitWave(clientX, clientY, amp = 0.7, speed = 9) {
  Object.assign(fx.wave, { x: clientX, y: clientY, amp, speed, at: performance.now() });
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The device's tilt, smoothed, written to fx.gyro for the camera and to every
// .tilt-card as --gx/--gy so the About cards lean and their layers part.
// Touch screens only; iOS asks permission, and only after a tap, so the request
// rides on the first one.
export function startGyro() {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return () => {};
  if (!window.matchMedia("(pointer: coarse)").matches) return () => {};

  let base = null;
  const target = { x: 0, y: 0 };
  const onOrient = (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    // The rest angle follows slowly, so a phone held differently re-centres.
    base.b += (e.beta - base.b) * 0.004;
    base.g += (e.gamma - base.g) * 0.004;
    target.x = clamp((e.gamma - base.g) / 22, -1, 1);
    target.y = clamp(-(e.beta - base.b) / 22, -1, 1);
    fx.gyro.active = true;
  };
  window.addEventListener("deviceorientation", onOrient);

  // One ask covers the tilt and the shake (startShake).
  const ask = () => {
    for (const Api of [window.DeviceOrientationEvent, window.DeviceMotionEvent]) {
      if (typeof Api?.requestPermission === "function") Api.requestPermission().catch(() => {});
    }
  };
  window.addEventListener("touchend", ask, { once: true });

  let raf = 0;
  let cards = [];
  let frame = 0;
  let lx = 0;
  let ly = 0;
  const loop = () => {
    const g = fx.gyro;
    g.x += (target.x - g.x) * 0.08;
    g.y += (target.y - g.y) * 0.08;
    if (g.active && (Math.abs(g.x - lx) > 0.002 || Math.abs(g.y - ly) > 0.002)) {
      if (frame++ % 60 === 0) cards = [...document.querySelectorAll(".tilt-card")];
      lx = g.x; ly = g.y;
      for (const c of cards) {
        c.style.setProperty("--gx", g.x.toFixed(3));
        c.style.setProperty("--gy", g.y.toFixed(3));
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("deviceorientation", onOrient);
    window.removeEventListener("touchend", ask);
  };
}

// A supernova: the cloud blows apart (Scene listens for rv:nova) with a big
// shockwave from where it started. Never more than one every four seconds.
let lastNova = -1e9;
export function supernova(clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) {
  const now = performance.now();
  if (now - lastNova < 4000) return;
  lastNova = now;
  emitWave(clientX, clientY, 2.2, 13);
  window.dispatchEvent(new Event("rv:nova"));
}

// Shaking the phone sets one off: two hard jolts within 700 ms.
export function startShake() {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return () => {};
  if (!window.matchMedia("(pointer: coarse)").matches) return () => {};
  let jolts = [];
  const onMotion = (e) => {
    const a = e.acceleration;
    if (!a || a.x == null) return;
    if (Math.hypot(a.x, a.y, a.z) < 17) return;
    const now = performance.now();
    jolts = jolts.filter((t) => now - t < 700);
    // Readings come in bursts; one jolt is one jolt, however many arrive.
    if (jolts.length && now - jolts[jolts.length - 1] < 120) return;
    jolts.push(now);
    if (jolts.length >= 2) {
      jolts = [];
      supernova();
    }
  };
  window.addEventListener("devicemotion", onMotion);
  return () => window.removeEventListener("devicemotion", onMotion);
}
