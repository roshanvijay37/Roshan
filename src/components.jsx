import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
export function ProjectRow({ project, flip }) {
  return (
    <article className={flip ? "project-row flip" : "project-row"}>
      <div className="project-body">
        <div className="project-topline">
          <span className="project-idx">{project.index}</span>
          <span className="eyebrow">{project.type}</span>
        </div>
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <ul className="stack-list">
          {project.stack.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <a className="project-link" href={project.href} target="_blank" rel="noreferrer">
          Visit live site <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}
