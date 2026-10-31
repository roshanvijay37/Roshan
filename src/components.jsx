import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { anticipate, dur, ease as easings, spring } from "./motion";

const ease = easings.out;

export const fadeUp = {
  hidden: { opacity: 0, y: 44, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: dur.slow, ease } },
};

const fadeOnly = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export function Reveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduced ? fadeOnly : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

// True once the element comes within `margin` of the viewport, and stays true.
// Used to hold back WebGL canvases that live below the fold: mounting them at
// page load costs a context and a chunk parse before anything has been seen.
export function useNearViewport(ref, margin = "400px") {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setNear(true); observer.disconnect(); } },
      { rootMargin: margin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, near, margin]);

  return near;
}

// Tilts its subtree in 3D according to where it sits in the viewport: pitched
// away on the way in, flat when centred, pitched away again on the way out.
//
// `intensity` is deliberately per-element-type. Rotating body copy the way you
// rotate a card makes it harder to read and reads as effect for its own sake,
// so text gets a fraction of what panels get.
export function Scroll3D({ children, className = "", intensity = 1, lift = 1 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Deliberately no spring here. Scroll position is already smooth, and a
  // spring per element means one animation loop per element — with seventeen of
  // these the page ran at 6fps and the tilts lagged so far behind the scroll
  // that they never reached their targets. Reading the progress directly is
  // both cheaper and more accurate.
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [9 * intensity, 0, -9 * intensity]);
  const z = useTransform(scrollYProgress, [0, 0.5, 1], [-90 * lift, 0, -90 * lift]);

  if (reduced) return <div className={className} ref={ref}>{children}</div>;

  return (
    <div className={`scroll3d ${className}`} ref={ref}>
      <motion.div className="scroll3d-inner" style={{ rotateX, z }}>
        {children}
      </motion.div>
    </div>
  );
}

// Holds back a lazy subtree until it is approached. The gate has to sit at the
// call site, not inside the component: rendering a lazy() element is what
// requests its chunk, so skipping only the <Canvas> inside still pays the
// download and parse cost up front.
export function LazyVisual({ className, children, fallback = null }) {
  const ref = useRef(null);
  const near = useNearViewport(ref);
  return <div className={className} ref={ref}>{near ? children : fallback}</div>;
}

// The <html> attribute is the single source of truth for the theme — the
// pre-paint script sets it before React exists, so state is derived from the
// DOM rather than kept alongside it.
export function useThemeName() {
  const [theme, setTheme] = useState(() =>
    typeof document === "undefined"
      ? "light"
      : document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    return () => observer.disconnect();
  }, []);

  return theme;
}

// Light is the default; the choice persists.
export function ThemeToggle() {
  const theme = useThemeName();

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    if (next === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    // Keeps the mobile browser chrome in step with the page.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#0b0906" : "#fcfaf4");
    try { localStorage.setItem("theme", next); } catch { /* private mode */ }
  };

  const dark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      onClick={flip}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -70, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={spring.pop}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </motion.span>
    </button>
  );
}

// A marquee that drifts on its own but takes its cue from the page: scrolling
// adds speed, and scrolling up reverses it. The track holds two copies of the
// content, so wrapping at -50% puts the seam exactly where it started.
//
// Driven by a plain rAF loop writing transform straight to the node. Framer's
// useAnimationFrame silently stopped ticking here after the first scroll, and a
// loop we own is both easier to reason about and one less thing between the
// value and the pixel.
export function Marquee({
  children,
  baseSpeed = 1.6,
  maxBoost = 26,
  reverse = false,
  // Stacked rows want fixed opposing directions — if scroll could flip them
  // they would all swing the same way at once and the counter-motion, which is
  // the entire effect, would collapse.
  lockDirection = false,
  className = "",
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const offset = useRef(0);
  const direction = useRef(reverse ? -1 : 1);

  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    let lastTime = 0;
    let lastScroll = window.scrollY;

    const loop = (now) => {
      // Clamp dt so a backgrounded tab doesn't resume with one enormous jump.
      const dt = lastTime ? Math.min(now - lastTime, 64) : 16;
      lastTime = now;

      const scrollY = window.scrollY;
      const moved = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!lockDirection && Math.abs(moved) > 0.5) direction.current = moved > 0 ? 1 : -1;

      const speed = baseSpeed + Math.min(Math.abs(moved) * 0.9, maxBoost);
      let next = offset.current - direction.current * speed * (dt / 1000);
      if (next <= -50) next += 50;
      if (next > 0) next -= 50;
      offset.current = next;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${next}%, 0, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, baseSpeed, maxBoost, lockDirection]);

  return (
    <div className={["skill-marquee", className].filter(Boolean).join(" ")} aria-hidden="true">
      <div ref={trackRef}>{children}</div>
    </div>
  );
}

export function MagneticLink({ children, className = "", ...props }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });

  const move = (event) => {
    if (reduced) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  return (
    <motion.a
      ref={ref}
      className={className}
      style={reduced ? undefined : { x, y }}
      onMouseMove={move}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      variants={reduced ? undefined : anticipate}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
    </motion.a>
  );
}

// A full-width row per project instead of a card in a grid. A card can only
// carry a title; a row has room for what the thing is, what was hard about it,
// and what it was built with — which is the difference between a gallery and a
// portfolio someone can judge.
export function ProjectRow({ project }) {
  // The glow is written straight to CSS custom properties rather than held in
  // state: it changes on every pointer move, and re-rendering five cards at
  // that rate to move a gradient is work for nothing.
  const track = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <a
      className="project-card"
      href={project.href}
      target="_blank"
      rel="noreferrer"
      style={{ "--accent": `var(${project.accent})` }}
      onPointerMove={track}
      aria-label={`${project.title} — ${project.type}, opens in a new tab`}
    >
      <div className="project-topline">
        <span>{project.index} — {project.type}</span>
        <span className="project-go">Visit <ArrowUpRight size={13} /></span>
      </div>
      <h3>{project.title}</h3>
      <p className="project-summary">{project.summary}</p>
      <ul className="stack-list">
        {project.stack.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <span className="project-bar" />
    </a>
  );
}

// Splits a string into per-character spans for the 3D type effects, grouped by
// word so a line can still only break between words. Screen readers get the
// plain string; the pieces are hidden from them.
export function Split({ text, className = "" }) {
  const words = text.split(" ");
  return (
    <span className={["split", className].filter(Boolean).join(" ")}>
      <span className="sr-only">{text}</span>
      <span className="split-vis" aria-hidden="true">
        {/* The space sits between the word boxes, not inside them: trailing
            white space in an inline-block collapses and the words run together. */}
        {words.map((word, w) => (
          <Fragment key={`${word}-${w}`}>
            <span className="word">
              {[...word].map((ch, i) => <span className="char" key={i}>{ch}</span>)}
            </span>
            {w < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}

// Scrubs every `.char` inside it with scroll position: each letter swings up
// out of the page on its own hinge and settles as the heading crosses the
// screen, then holds. Scrubbed rather than triggered, so scrolling back runs
// it in reverse — the type is part of the camera move, not a one-off effect.
//
// One subscription writes straight to the nodes. A motion value per letter
// would be a few hundred subscriptions for the page.
export function ScrubReveal({ as: Tag = "div", className = "", children, start = "start 92%", end = "start 38%" }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: [start, end] });

  useEffect(() => {
    if (reduced || !ref.current) return undefined;
    const chars = [...ref.current.querySelectorAll(".char")];
    const n = Math.max(chars.length - 1, 1);
    const spread = 0.55;
    const paint = (p) => {
      for (let i = 0; i < chars.length; i++) {
        const t = Math.min(1, Math.max(0, (p * (1 + spread) - (i / n) * spread) / 1));
        const e = 1 - Math.pow(1 - t, 3);
        const inv = 1 - e;
        chars[i].style.transform =
          `translate3d(0, ${inv * 0.55}em, ${inv * -140}px) rotateX(${inv * -88}deg) rotateY(${inv * (i % 2 ? 14 : -14)}deg)`;
        chars[i].style.opacity = String(Math.min(1, e * 1.35));
      }
    };
    paint(scrollYProgress.get());
    return scrollYProgress.on("change", paint);
  }, [reduced, scrollYProgress]);

  return <Tag className={["scrub", className].filter(Boolean).join(" ")} ref={ref}>{children}</Tag>;
}

// A panel that leans toward the pointer and carries a moving highlight, so it
// reads as a physical sheet of glass rather than a flat box. Written to CSS
// variables for the same reason as ProjectRow's glow.
export function TiltCard({ children, className = "" }) {
  const track = (event) => {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = (event) => {
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  };
  return (
    <div className={["tilt-card", className].filter(Boolean).join(" ")} onPointerMove={track} onPointerLeave={reset}>
      {children}
    </div>
  );
}

// A ring that trails the pointer with a little inertia and swells over
// anything clickable. Mouse only: on touch there is no pointer to follow.
export function Cursor() {
  const reduced = useReducedMotion();
  const ring = useRef(null);
  const dot = useRef(null);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return undefined;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let raf = 0;
    let shown = false;

    const move = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!shown) {
        shown = true;
        pos.x = target.x; pos.y = target.y;
        document.documentElement.classList.add("has-cursor");
      }
      const hot = event.target.closest?.("a, button");
      ring.current?.classList.toggle("hot", Boolean(hot));
    };
    const down = () => ring.current?.classList.add("press");
    const up = () => ring.current?.classList.remove("press");
    // `pointerleave` never fires on document; a mouseout with no destination
    // is the pointer leaving the window.
    const leave = (event) => {
      if (event.relatedTarget) return;
      shown = false;
      document.documentElement.classList.remove("has-cursor");
    };

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("mouseout", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [reduced]);

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor-ring" ref={ring}><i /></div>
      <div className="cursor-dot" ref={dot} />
    </div>
  );
}
