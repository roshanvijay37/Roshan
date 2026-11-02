import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring,
} from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { emitWave } from "./fx";
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
// choice persists. Switching is an event: a shockwave leaves the button through
// the cloud and the new theme opens out behind it in a widening circle.
export function ThemeToggle() {
  const theme = useThemeName();
  const reduced = useReducedMotion();

  const flip = (event) => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const apply = () => {
      root.setAttribute("data-theme", next);
      // Keeps the mobile browser chrome in step with the page.
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
    };
    try { localStorage.setItem("theme", next); } catch { /* private mode */ }

    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    emitWave(x, y, 1.6, 11);
    if (reduced || !document.startViewTransition) { apply(); return; }
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
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

// A button with real thickness: it is pulled toward the pointer, tips on two
// axes to face it, and a highlight slides across its bevel with the pointer.
// The edge underneath is CSS (.button box-shadow); pressing sinks it.
export function MagneticLink({ children, className = "", ...props }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const move = (event) => {
    if (reduced) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    x.set(dx * 0.2);
    y.set(dy * 0.24);
    rotateY.set((dx / rect.width) * 22);
    rotateX.set((-dy / rect.height) * 26);
    ref.current.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    ref.current.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  const reset = () => { x.set(0); y.set(0); rotateX.set(0); rotateY.set(0); };

  return (
    <motion.a
      ref={ref}
      className={className}
      style={reduced ? undefined : { x, y, rotateX, rotateY, transformPerspective: 520 }}
      onMouseMove={move}
      onMouseLeave={reset}
      variants={reduced ? undefined : anticipate}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
      <span className="sheen" aria-hidden="true" />
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
// Its layers (number, title, text) sit at different depths and part as it
// leans: --px/--py drive them, from the mouse here or from the phone's tilt
// (--gx/--gy, written by startGyro) when there is no mouse.
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
    el.style.setProperty("--px", ((x - 0.5) * 2).toFixed(3));
    el.style.setProperty("--py", ((y - 0.5) * 2).toFixed(3));
  };
  const reset = (event) => {
    const s = event.currentTarget.style;
    s.setProperty("--rx", "0deg");
    s.setProperty("--ry", "0deg");
    s.removeProperty("--px");
    s.removeProperty("--py");
  };
  return (
    <div className={["tilt-card", className].filter(Boolean).join(" ")} onPointerMove={track} onPointerLeave={reset}>
      {children}
    </div>
  );
}

// The cursor is a small knot of the same particles: three tilted rings of
// points turning in 3D around the pointer, trailing it with a little inertia,
// opening wide over anything clickable and clenching on press. It inverts what
// it passes over. On touch there is no cursor; a finger leaves a short trail
// of sparks instead. One 2D canvas, cleared each frame, and asleep when idle.
const RINGS = [
  { tilt: 1.15, turn: 0.0, speed: 1.4, count: 12 },
  { tilt: 1.15, turn: 2.09, speed: -1.1, count: 12 },
  { tilt: 1.15, turn: 4.19, speed: 0.9, count: 12 },
];

export function Cursor() {
  const reduced = useReducedMotion();
  const canvas = useRef(null);

  useEffect(() => {
    const cv = canvas.current;
    if (reduced || !cv) return undefined;
    const ctx = cv.getContext("2d");
    const fine = window.matchMedia("(pointer: fine)").matches;
    const root = document.documentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    const st = { shown: false, hot: 0, hotTo: 0, press: 0, pressTo: 0, t: 0 };
    const sparks = [];
    let raf = 0;
    let last = performance.now();

    const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

    const move = (event) => {
      if (event.pointerType !== "mouse") return;
      target.x = event.clientX;
      target.y = event.clientY;
      if (!st.shown) {
        st.shown = true;
        pos.x = target.x; pos.y = target.y;
        root.classList.add("has-cursor");
      }
      st.hotTo = event.target.closest?.("a, button") ? 1 : 0;
      wake();
    };
    const down = (event) => { if (event.pointerType === "mouse") st.pressTo = 1; };
    const up = () => { st.pressTo = 0; };
    // `pointerleave` never fires on document; a mouseout with no destination
    // is the pointer leaving the window.
    const leave = (event) => {
      if (event.relatedTarget) return;
      st.shown = false;
      root.classList.remove("has-cursor");
    };
    // Touch: sparks at the finger. touchmove keeps firing while the page
    // scrolls under it, where pointer events are cancelled.
    const touch = (event) => {
      const t0 = event.touches[0];
      if (!t0) return;
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 20 + Math.random() * 60;
        sparks.push({ x: t0.clientX, y: t0.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
      }
      if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
      wake();
    };

    const accent = () => getComputedStyle(root).getPropertyValue("--accent").trim() || "#ff6a2b";
    let ember = accent();
    const themeWatch = new MutationObserver(() => { ember = accent(); });
    themeWatch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      st.t += dt;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (st.shown) {
        pos.x += (target.x - pos.x) * 0.22;
        pos.y += (target.y - pos.y) * 0.22;
        st.hot += (st.hotTo - st.hot) * Math.min(1, dt * 9);
        st.press += (st.pressTo - st.press) * Math.min(1, dt * 14);
        const R = (7 + st.hot * 19) * (1 - st.press * 0.35);
        ctx.fillStyle = "#fff";
        for (const ring of RINGS) {
          const spin = st.t * ring.speed * (1 - st.hot * 0.6);
          const ct = Math.cos(ring.tilt), stl = Math.sin(ring.tilt);
          const cy = Math.cos(ring.turn + st.t * 0.5), sy = Math.sin(ring.turn + st.t * 0.5);
          for (let i = 0; i < ring.count; i++) {
            const a = spin + (i / ring.count) * Math.PI * 2;
            // A circle, tipped about x, then turned about y.
            let x = Math.cos(a) * R;
            let y = Math.sin(a) * R * ct;
            let z = Math.sin(a) * R * stl;
            const xr = x * cy + z * sy;
            z = -x * sy + z * cy;
            x = xr;
            const k = 60 / (60 + z);
            ctx.globalAlpha = 0.45 + 0.55 * (k - 0.75) * 2;
            ctx.beginPath();
            ctx.arc(pos.x + x * k, pos.y + y * k, Math.max(0.6, 1.5 * k), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.2 * (1 - st.hot * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      if (sparks.length) {
        ctx.fillStyle = ember;
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.life -= dt / 0.6;
          if (p.life <= 0) { sparks.splice(i, 1); continue; }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94; p.vy *= 0.94;
          ctx.globalAlpha = p.life * 0.9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1 + p.life * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      raf = st.shown || sparks.length ? requestAnimationFrame(loop) : 0;
    }

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("mouseout", leave);
    if (!fine) {
      window.addEventListener("touchstart", touch, { passive: true });
      window.addEventListener("touchmove", touch, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      themeWatch.disconnect();
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", leave);
      window.removeEventListener("touchstart", touch);
      window.removeEventListener("touchmove", touch);
      root.classList.remove("has-cursor");
    };
  }, [reduced]);

  return (
    <div className="cursor" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
