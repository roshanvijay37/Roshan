import {
  animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
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
      ?.setAttribute("content", next === "dark" ? "#07070b" : "#fbfbfd");
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
export function Marquee({ children, baseSpeed = 1.6, maxBoost = 26 }) {
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const offset = useRef(0);
  const direction = useRef(1);

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
      if (Math.abs(moved) > 0.5) direction.current = moved > 0 ? 1 : -1;

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
  }, [reduced, baseSpeed, maxBoost]);

  return (
    <div className="skill-marquee" aria-hidden="true">
      <div ref={trackRef}>{children}</div>
    </div>
  );
}

// Counts up to the number embedded in `value` ("04+" -> 0…4, keeping the pad and suffix).
export function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const match = /^(\d+)(.*)$/.exec(value);
  // Primitives only — `match` is a fresh array each render, and depending on it
  // would restart the animation on every tick it schedules.
  const numeric = match ? match[1] : "";
  const suffix = match ? match[2] : "";
  const target = numeric ? Number(numeric) : 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!numeric || reduced || !inView) return;
    const controls = animate(0, target, {
      duration: 1.15,
      ease,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, numeric, reduced]);

  if (!numeric) return <strong ref={ref}>{value}</strong>;
  const display = reduced ? target : shown;
  return <strong ref={ref}>{String(display).padStart(numeric.length, "0")}{suffix}</strong>;
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

// Lets descendants react to the card's tilt without prop-drilling motion values.
const TiltContext = createContext(null);

export function TiltCard({ children, className = "", glow = "#8b5cf6" }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const gx = useMotionValue("50%");
  const gy = useMotionValue("50%");

  const move = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    if (!reduced) {
      rotateX.set((0.5 - py) * 7);
      rotateY.set((px - 0.5) * 7);
    }
    gx.set(`${px * 100}%`);
    gy.set(`${py * 100}%`);
  };

  return (
    <TiltContext.Provider value={rotateY}>
      <motion.div
        ref={ref}
        className={`tilt-card ${className}`}
        style={{ rotateX, rotateY, "--glow": glow, "--gx": gx, "--gy": gy }}
        onMouseMove={move}
        onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
      >
        {children}
      </motion.div>
    </TiltContext.Provider>
  );
}

// Secondary action: the badge counter-rotates against the card's tilt, so it
// reads as a separate object sitting on the surface rather than painted on it.
function OpenBadge() {
  const rotateY = useContext(TiltContext);
  const reduced = useReducedMotion();
  const fallback = useMotionValue(0);
  const counter = useTransform(rotateY ?? fallback, (v) => -v * 1.6);
  return (
    <motion.span className="project-open" style={reduced ? undefined : { rotate: counter }}>
      <ArrowUpRight size={20} />
    </motion.span>
  );
}

// Drifts the artwork against the page as the card crosses the viewport. The layer is
// taller than its frame so the travel never exposes an edge.
function ParallaxImage({ src }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div className="project-image" ref={ref}>
      <motion.div className="parallax-layer" style={reduced ? undefined : { y }}>
        <img src={src} alt="" loading="lazy" />
      </motion.div>
      <OpenBadge />
    </div>
  );
}

// The image leads, the caption follows a beat later — overlapping action, so
// the card assembles instead of appearing whole.
//
// The caption's delay has to exceed the *difference* in durations, not just be
// positive: it runs a shorter animation, so too small a delay lets it settle
// before the image does and the sequence reads backwards.
const cardImage = {
  hidden: { opacity: 0, y: 48, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: dur.base, ease } },
};
const cardMeta = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.quick, ease, delay: 0.3 } },
};

export function ProjectCard({ project, delay = 0 }) {
  const reduced = useReducedMotion();
  const variants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: dur.quick } } }
    : null;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delayChildren: reduced ? 0 : delay }}
    >
      <TiltCard className="project-card" glow={project.color}>
        <a href={project.href} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
          <motion.div variants={variants ?? cardImage}>
            <ParallaxImage src={project.image} />
          </motion.div>
          <motion.div className="project-meta" variants={variants ?? cardMeta}>
            <div>
              <span className="eyebrow">{project.type}</span>
              <h3>{project.title}</h3>
            </div>
            <span className="project-index">{project.index}</span>
          </motion.div>
        </a>
      </TiltCard>
    </motion.div>
  );
}
