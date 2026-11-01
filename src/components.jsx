import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring,
} from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { anticipate, dur, ease as easings, spring } from "./motion";

const ease = easings.expo;

export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.slow, ease } },
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
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

// The <html> attribute is the single source of truth for the theme — the
// pre-paint script sets it before React exists, so state is derived from the
// DOM rather than kept alongside it.
export function useThemeName() {
  const [theme, setTheme] = useState(() =>
    typeof document === "undefined"
      ? "dark"
      : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    return () => observer.disconnect();
  }, []);

  return theme;
}

export const THEME_COLOR = { light: "#ecebe6", dark: "#050507" };

// Dark is the default — the particle field is light emitted on black; the
// choice persists.
export function ThemeToggle() {
  const theme = useThemeName();

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.setAttribute("data-theme", next);
    // Keeps the mobile browser chrome in step with the page.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
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
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={spring.pop}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </motion.span>
    </button>
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
    x.set((event.clientX - rect.left - rect.width / 2) * 0.2);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.24);
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

// Splits a string into per-character spans for the scrubbed type, grouped by
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

// Scrubs every `.char` inside it with scroll position: each letter rises out
// of its word's mask, rotated off its baseline, and settles as the heading
// crosses the screen. Scrubbed rather than triggered, so scrolling back runs
// it in reverse.
//
// One subscription writes straight to the nodes. A motion value per letter
// would be a few hundred subscriptions for the page.
export function ScrubReveal({ as: Tag = "div", className = "", children, start = "start 95%", end = "start 45%" }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: [start, end] });

  useEffect(() => {
    if (reduced || !ref.current) return undefined;
    const chars = [...ref.current.querySelectorAll(".char")];
    const n = Math.max(chars.length - 1, 1);
    const spread = 0.6;
    const paint = (p) => {
      for (let i = 0; i < chars.length; i++) {
        const t = Math.min(1, Math.max(0, p * (1 + spread) - (i / n) * spread));
        const e = 1 - Math.pow(1 - t, 4);
        const inv = 1 - e;
        chars[i].style.transform = `translate3d(0, ${inv * 105}%, 0) rotate(${inv * 12}deg)`;
      }
    };
    paint(scrollYProgress.get());
    return scrollYProgress.on("change", paint);
  }, [reduced, scrollYProgress]);

  return <Tag className={["scrub", className].filter(Boolean).join(" ")} ref={ref}>{children}</Tag>;
}

// A panel that leans toward the pointer and carries a light that follows it.
// Written to CSS variables: it changes on every pointer move, and re-rendering
// to move a gradient is work for nothing.
export function TiltCard({ children, className = "" }) {
  const track = (event) => {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
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

// A disc that inverts whatever it passes over, trailing the pointer with a
// little inertia and opening wide over anything clickable. Mouse only.
export function Cursor() {
  const reduced = useReducedMotion();
  const disc = useRef(null);

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
      disc.current?.classList.toggle("hot", Boolean(hot));
    };
    const down = () => disc.current?.classList.add("press");
    const up = () => disc.current?.classList.remove("press");
    // `pointerleave` never fires on document; a mouseout with no destination
    // is the pointer leaving the window.
    const leave = (event) => {
      if (event.relatedTarget) return;
      shown = false;
      document.documentElement.classList.remove("has-cursor");
    };

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.22;
      pos.y += (target.y - pos.y) * 0.22;
      if (disc.current) disc.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
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
      <div className="cursor-disc" ref={disc}><i /></div>
    </div>
  );
}
