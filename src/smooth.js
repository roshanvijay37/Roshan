import Lenis from "lenis";

// One shared, mutable record of where the page is. The 3D scene and the DOM
// effects both read it every frame, so it is a plain object rather than React
// state: re-rendering anything at scroll rate would be work for nothing.
//
// `chapter` is the page position measured in sections rather than pixels —
// 0 at the hero, 1 when About reaches mid-screen, 2 for Skills, 3 at the very
// bottom. The scene keys its camera journey to it, so the choreography stays
// locked to the content whatever the viewport height does to the layout.
export const scrollState = {
  y: 0,
  progress: 0,
  velocity: 0,
  chapter: 0,
  lenis: null,
};

const CHAPTER_IDS = ["about", "skills"];

let anchors = [0, 1, 2, 3];

function measure() {
  const vh = window.innerHeight;
  const max = Math.max(document.documentElement.scrollHeight - vh, 1);
  const tops = CHAPTER_IDS.map((id) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + window.scrollY - vh * 0.5 : max;
  });
  // Monotonic even if a section is missing or the page is shorter than the
  // viewport, so the piecewise map below never divides by zero or runs back.
  const a1 = Math.min(Math.max(tops[0], 1), max - 2);
  const a2 = Math.min(Math.max(tops[1], a1 + 1), max - 1);
  anchors = [0, a1, a2, max];
}

function toChapter(y) {
  for (let i = 0; i < 3; i++) {
    if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
  }
  return 3;
}

// Lenis gives the page its weight: wheel input is eased rather than stepped,
// which is what lets scroll-linked 3D read as a camera move instead of a
// slideshow. Touch keeps native scrolling — fighting a phone's own momentum
// feels worse than any easing gains.
export function startSmoothScroll({ smooth }) {
  let lenis = null;
  if (smooth) {
    lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      autoRaf: true,
    });
    scrollState.lenis = lenis;
  }

  // In-page links go through Lenis so they glide like the wheel does. A
  // section marked data-anchor-end (the pinned About deck) is entered at the
  // end of its pin, where its cards have landed — its top would show them
  // still in flight.
  const jump = (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!lenis || !link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const id = link.getAttribute("href").slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    event.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY;
    // Header is fixed at 20 + 62px; same breathing room scroll-padding gave.
    // A pinned section (data-pin) is entered exactly at its top, where its
    // sticky stage begins; anything else leaves room for the fixed header.
    const y = el.hasAttribute("data-anchor-end")
      ? top + el.offsetHeight - window.innerHeight
      : el.hasAttribute("data-pin") ? top : top - 96;
    lenis.scrollTo(Math.max(0, y), { duration: 1.4 });
  };
  document.addEventListener("click", jump);

  measure();
  const resize = new ResizeObserver(measure);
  resize.observe(document.body);
  window.addEventListener("resize", measure);

  // Velocity from our own loop, not Lenis events: Lenis stops emitting when it
  // settles, which would freeze the last non-zero speed in place.
  let raf = 0;
  let last = window.scrollY;
  const tick = () => {
    const y = window.scrollY;
    const raw = y - last;
    last = y;
    scrollState.velocity += (raw - scrollState.velocity) * 0.18;
    scrollState.y = y;
    scrollState.progress = y / anchors[3];
    scrollState.chapter = toChapter(y);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    window.removeEventListener("resize", measure);
    document.removeEventListener("click", jump);
    lenis?.destroy();
    scrollState.lenis = null;
  };
}
