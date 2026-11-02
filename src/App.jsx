import {
  AnimatePresence, motion, useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Github, Mail, Menu, X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Intro from "./Intro";
import {
  Cursor, MagneticLink, Reveal, ScrubReveal, Split, ThemeToggle, TiltCard,
} from "./components";
import { services, skillGroups } from "./data";
import { emitWave, fx, startGyro } from "./fx";
import { dur, ease } from "./motion";
import { scrollState, startSmoothScroll } from "./smooth";

// True where there is room to pin a section and drive it sideways or in
// depth. Below that, sections stack and animate as they pass.
function useStageMode(query) {
  const reduced = useReducedMotion();
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return match && !reduced;
}

const Scene = lazy(() => import("./Scene"));

const nav = [
  ["About", "#about"],
  ["Skills", "#skills"],
  ["Contact", "#contact"],
];

// Once the page moves, the header lifts off the edge into a floating slab of
// glass that tips back and forth with the speed of the scroll.
function Header() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    let tilt = 0;
    const loop = () => {
      const to = Math.max(-7, Math.min(7, -scrollState.velocity * 0.22));
      tilt += (to - tilt) * 0.12;
      ref.current?.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <header ref={ref} className={["nav-shell", scrolled && "scrolled", open && "open"].filter(Boolean).join(" ")}>
      <a className="brand" href="#top" aria-label="Roshan Vijay, home">
        <span>R</span><i />
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {/* The label is drawn twice and rolled on hover; the copy is hidden
            from assistive tech so it is still read once. */}
        {nav.map(([label, href]) => (
          <a href={href} key={href}>
            <span className="roll"><span>{label}</span><span aria-hidden="true">{label}</span></span>
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        <ThemeToggle />
        <a className="nav-cta" href="mailto:roshanshetty010100@gmail.com">
          Let&apos;s talk <ArrowUpRight size={15} />
        </a>
      </div>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
        {open ? <X /> : <Menu />}
      </button>
      <AnimatePresence>
        {open && (
          // The panel swings down from its top edge like a hatch, and each
          // link swings in after it on its own hinge, like a door.
          <motion.nav
            className="mobile-nav"
            style={{ transformOrigin: "50% 0%", transformPerspective: 1200 }}
            initial={{ rotateX: -95, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1, transition: { duration: 0.7, ease: ease.expo } }}
            exit={{ rotateX: -95, opacity: 0, transition: { duration: 0.4, ease: ease.inOut } }}
          >
            {nav.map(([label, href], index) => (
              <motion.a
                href={href}
                key={href}
                onClick={() => setOpen(false)}
                style={{ transformOrigin: "0% 50%", transformPerspective: 800 }}
                initial={{ rotateY: -85, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.16 + index * 0.08, duration: 0.8, ease: ease.expo }}
              >
                <span>0{index + 1}</span>{label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero({ revealed }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);

  // The headline itself is particles and leaves on its own; the rest of the
  // hero lifts and fades as the page scrolls away.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const enter = (delay) => ({
    hidden: { opacity: 0, y: reduced ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.expo, delay } },
  });

  return (
    <section className="hero" id="top" ref={ref}>
      <motion.div
        className="hero-inner section-pad"
        initial="hidden"
        // Held until the curtain lifts so the type sets itself in view rather
        // than already being in place behind it.
        animate={revealed ? "visible" : "hidden"}
      >
        <motion.div className="hero-meta" style={reduced ? undefined : { opacity: fade }}>
          <motion.div className="hero-identity" variants={enter(0.05)}>
            <strong>Roshan Vijay</strong>
            <i>Software Engineer</i>
          </motion.div>
          <motion.div className="availability" variants={enter(0.15)}>
            <i /> Available for ambitious projects
          </motion.div>
          <motion.div className="hero-side-note" variants={enter(0.25)}>
            <span>Based in India</span>
          </motion.div>
        </motion.div>

        {/* The particle cloud samples each .hword box and draws the headline
            in their place; these stay as the layout, the fallback without
            WebGL, and the copy for screen readers. */}
        <h1>
          <span className="sr-only">I engineer ideas into impact.</span>
          <span className="hline" aria-hidden="true">
            <span className="hword">I</span> <span className="hword">engineer</span> <span className="hword">ideas</span>
          </span>
          <span className="hline hline-b" aria-hidden="true">
            <span className="hword">into</span> <span className="hword accent">impact.</span>
          </span>
        </h1>

        <motion.div className="hero-foot" style={reduced ? undefined : { y: lift, opacity: fade }}>
          <motion.p variants={enter(0.85)}>
            I design and build web products for founders and small teams — from fast marketing sites to full applications with real users behind them.
          </motion.p>
          <motion.div className="hero-actions" variants={enter(0.95)}>
            <MagneticLink className="button primary" href="#contact">Start a conversation <ArrowRight size={18} /></MagneticLink>
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.a
        href="#about"
        className="scroll-cue"
        aria-label="Scroll to about"
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0, transition: { delay: 1.2 } }}
        style={reduced ? undefined : { opacity: fade }}
      >
        <span>Scroll to discover</span><i><ArrowDown size={14} /></i>
      </motion.a>
    </section>
  );
}

function ServiceCard({ service }) {
  return (
    <TiltCard>
      <div className="service-card">
        <span className="service-num" aria-hidden="true">{service.num}</span>
        <div className="service-body">
          <h3>{service.title}</h3>
          <p>{service.body}</p>
        </div>
      </div>
    </TiltCard>
  );
}

function AboutHeading() {
  return (
    <div className="section-heading">
      <span className="section-number">01 / ABOUT</span>
      <ScrubReveal as="h2">
        <Split text="What I build," /><br /><em><Split text="and how I work." /></em>
      </ScrubReveal>
    </div>
  );
}

// The rail: About pins, and the page turns sideways. The heading and the three
// cards slide past on one track, and each card swings on its vertical axis by
// how far it is from the centre of the screen — a carousel in depth driven by
// the wheel.
function AboutRail() {
  const ref = useRef(null);
  const track = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const cards = [...el.querySelectorAll(".rail-card")];
    let shift = 0;
    const measure = () => { shift = Math.max(0, el.scrollWidth - window.innerWidth); };
    const paint = (p) => {
      const x = -shift * p;
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      const vw = window.innerWidth;
      for (const card of cards) {
        const centre = card.offsetLeft + card.offsetWidth / 2 + x;
        const d = Math.max(-1.2, Math.min(1.2, (centre - vw / 2) / vw));
        card.style.transform = `translateZ(${-Math.abs(d) * 320}px) rotateY(${d * -42}deg)`;
        card.style.opacity = String(Math.max(0.15, 1 - Math.max(0, Math.abs(d) - 0.35) * 1.4));
        // 1 when the card sits dead centre: it lights up as it arrives.
        card.style.setProperty("--focus", Math.max(0, 1 - Math.abs(d) / 0.32).toFixed(3));
      }
    };
    measure();
    paint(scrollYProgress.get());
    const off = scrollYProgress.on("change", paint);
    const resize = () => { measure(); paint(scrollYProgress.get()); };
    window.addEventListener("resize", resize);
    return () => { off(); window.removeEventListener("resize", resize); };
  }, [scrollYProgress]);

  return (
    <section className="about rail" id="about" ref={ref} data-pin>
      <div className="rail-sticky">
        <div className="rail-track" ref={track}>
          <div className="rail-head"><AboutHeading /></div>
          {services.map((service) => (
            <div className="rail-card" key={service.num}>
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stacked: each card unfolds from its top edge as it rises into view, and
// lights up while it crosses the middle of the screen.
function Unfold({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 55%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [-70, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const focus = useTransform(pass, [0.3, 0.5, 0.7], [0, 1, 0]);
  return (
    <motion.div className="unfold" ref={ref} style={{ "--focus": focus }}>
      <motion.div style={{ rotateX, opacity }}>{children}</motion.div>
    </motion.div>
  );
}

function About() {
  const rail = useStageMode("(min-width: 981px) and (min-height: 620px)");
  const reduced = useReducedMotion();
  if (rail) return <AboutRail />;
  return (
    <section className="section-pad about stacked" id="about">
      <AboutHeading />
      <div className="service-grid">
        {services.map((service, index) => (
          reduced
            ? <Reveal key={service.num} delay={index * 0.08}><ServiceCard service={service} /></Reveal>
            : <Unfold key={service.num}><ServiceCard service={service} /></Unfold>
        ))}
      </div>
    </section>
  );
}

function SkillPlane({ group, index }) {
  return (
    <div className="plane" data-group={group.key}>
      <span className="plane-label"><b>0{index + 1}</b>{group.name}</span>
      <ul>
        {group.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

// Depth: the capabilities pin and the camera pushes through them. Each
// discipline is a sheet of type hanging in the dark; it comes forward out of
// the distance, holds sharp at the centre, then flies past the viewer as the
// next one arrives behind it.
function Skills() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const stage = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    if (reduced || !stage.current) return undefined;
    const planes = [...stage.current.querySelectorAll(".plane")];
    const n = planes.length;
    const paint = (p) => {
      for (let i = 0; i < n; i++) {
        // t is 0 when plane i is in focus; negative while it waits behind.
        const t = p * (n + 0.4) - i - 0.7;
        const z = t < 0 ? t * 1500 : t * 2200;
        const a = t < 0 ? Math.max(0, 1 + t * 0.85) : Math.max(0, 1 - t * 2.6);
        const el = planes[i];
        el.style.transform = `translate3d(-50%, -50%, ${z}px) rotateX(${t * -10}deg)`;
        el.style.opacity = String(a);
        el.style.visibility = a < 0.01 ? "hidden" : "visible";
        // 1 while the plane holds focus: the particle cloud spells it out,
        // and the type itself firms up only once the particles have landed.
        el.style.setProperty("--form", Math.max(0, Math.min(1, 1 - (Math.abs(t) - 0.12) * 3)).toFixed(3));
      }
    };
    paint(scrollYProgress.get());
    return scrollYProgress.on("change", paint);
  }, [reduced, scrollYProgress]);

  return (
    <section className={reduced ? "skills-section flat" : "skills-section"} id="skills" ref={ref} data-pin={reduced ? undefined : ""}>
      <div className="skills-sticky">
        <div className="section-heading compact section-pad">
          <span className="section-number">02 / CAPABILITIES</span>
          <ScrubReveal as="h2" start="start 98%" end="start 50%">
            <Split text="What I build with." /><br /><em><Split text="One way of working." /></em>
          </ScrubReveal>
        </div>
        <div className="depth" ref={stage}>
          {skillGroups.map((group, index) => <SkillPlane group={group} index={index} key={group.key} />)}
        </div>
      </div>
    </section>
  );
}

// WhatsApp has no icon in lucide, and it is the one mark worth drawing exactly:
// a generic chat bubble does not read as WhatsApp, and recognition is the whole
// point of the button.
function WhatsAppGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24z" />
    </svg>
  );
}

const TOKENS = [
  { label: "Email", href: "mailto:roshanshetty010100@gmail.com", Icon: Mail },
  { label: "GitHub", href: "https://github.com/roshanvijay37", Icon: Github, external: true },
];

// Email and GitHub are coins in orbit round the WhatsApp button, on a ring
// tipped toward you: they pass behind it, swing out to the sides and come
// round in front. Hovering or focusing one stops the orbit (so it is easy to
// hit) and feeds the black hole behind the section. On a phone, or with
// reduced motion, they sit in a row and only the coins turn.
function OrbitTokens() {
  const ring = useRef(null);
  const orbit = useStageMode("(min-width: 721px)");

  useEffect(() => {
    const el = ring.current;
    if (!el) return undefined;
    const tokens = [...el.querySelectorAll(".token")];
    let held = false;
    const holdOn = () => { held = true; fx.feed = 1; };
    const holdOff = () => { held = false; fx.feed = 0; };
    for (const t of tokens) {
      t.addEventListener("pointerenter", holdOn);
      t.addEventListener("pointerleave", holdOff);
      t.addEventListener("focus", holdOn);
      t.addEventListener("blur", holdOff);
    }

    let raf = 0;
    let io = null;
    if (orbit) {
      let a = 0.4;
      let last = 0;
      const loop = (now) => {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        if (!held) a += dt * 0.32;
        const rx = el.offsetWidth / 2;
        const ry = rx * 0.27;
        tokens.forEach((t, i) => {
          const th = a + i * Math.PI;
          const depth = Math.sin(th); // +1 nearest you
          const near = (depth + 1) / 2;
          t.style.transform = `translate3d(${Math.cos(th) * rx}px, ${depth * ry}px, 0) scale(${0.7 + 0.3 * near})`;
          t.style.zIndex = depth > 0 ? "3" : "1";
          t.style.opacity = String(0.5 + 0.5 * near);
          t.style.setProperty("--spin", `${Math.cos(th) * -48}deg`);
        });
        raf = requestAnimationFrame(loop);
      };
      // Only turns while the section is on screen.
      io = new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        if (entry.isIntersecting) raf = requestAnimationFrame(loop);
      });
      io.observe(el);
    } else {
      for (const t of tokens) { t.style.transform = ""; t.style.zIndex = ""; t.style.opacity = ""; }
    }

    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      for (const t of tokens) {
        t.removeEventListener("pointerenter", holdOn);
        t.removeEventListener("pointerleave", holdOff);
        t.removeEventListener("focus", holdOn);
        t.removeEventListener("blur", holdOff);
      }
      fx.feed = 0;
    };
  }, [orbit]);

  return (
    <div className={orbit ? "orbit" : "orbit still"} ref={ring}>
      {TOKENS.map(({ label, href, Icon, external }) => (
        <a
          className="token"
          href={href}
          key={label}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          <span className="coin"><Icon size={19} /></span>
          <b>{label}</b>
        </a>
      ))}
    </div>
  );
}

function Contact() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  // The closing line grows out of the horizon toward you as the page ends.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 25%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.72, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [120, 0]);

  // The black hole behind this section can be grabbed: drag sideways to bank
  // the disk, up and down to tip it toward you. It keeps turning with the
  // throw and settles back. On touch only sideways drags reach it
  // (touch-action: pan-y), so the page still scrolls.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    let last = null;
    const hole = fx.hole;
    const down = (e) => {
      if (e.button !== 0 || e.target.closest("a, button")) return;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      hole.dragging = true;
      hole.vr = 0;
      hole.vp = 0;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add("grabbing");
    };
    const move = (e) => {
      if (!last) return;
      const now = performance.now();
      const dt = Math.max(8, now - last.t) / 1000;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      hole.roll = Math.max(-1.2, Math.min(1.2, hole.roll - dx * 0.004));
      hole.pitch = Math.max(-1.25, Math.min(1.25, hole.pitch + dy * 0.005));
      hole.vr = (-dx * 0.004) / dt;
      hole.vp = (dy * 0.005) / dt;
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = () => {
      if (!last) return;
      last = null;
      hole.dragging = false;
      el.classList.remove("grabbing");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      hole.dragging = false;
    };
  }, [reduced]);

  return (
    <section className="section-pad contact" id="contact" ref={ref}>
      <motion.div className="contact-intro" style={reduced ? undefined : { scale, y }}>
        <span className="section-number">03 / CONTACT</span>
        {/* The page ends soon after this heading, so on a tall screen its top
            never reaches the default end line; settle it lower. */}
        <ScrubReveal as="h2" start="start 100%" end="start 60%">
          <Split text="Have an ambitious idea?" /><br /><em><Split text="Let's give it gravity." /></em>
        </ScrubReveal>
      </motion.div>
      <Reveal className="contact-body">
        <p>I&apos;m always interested in thoughtful products, difficult engineering problems, and collaborations with a little spark to them.</p>
        <div className="contact-actions">
          {/* wa.me needs the number in full international form, no plus or spaces. */}
          <MagneticLink
            className="button primary big"
            href="https://wa.me/917349495469"
            target="_blank"
            rel="noreferrer"
            onPointerEnter={() => { fx.feed = 1; }}
            onPointerLeave={() => { fx.feed = 0; }}
          >
            <WhatsAppGlyph size={20} /> Message me on WhatsApp
          </MagneticLink>
          <OrbitTokens />
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <a className="brand" href="#top"><span>R</span><i /></a>
      <p>Designed & engineered with curiosity. <a href="/company/">Sumathi Enterprises</a></p>
      <a href="#top">Back to orbit <ArrowUpRight size={15} /></a>
    </footer>
  );
}

// A ring of particles on the right edge, tipped in 3D, that lights dot by dot
// as the page is read and rocks with the speed of the scroll.
const DOTS = 40;
function ProgressRing() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const dots = [...el.querySelectorAll("circle")];
    let lit = -1;
    let raf = 0;
    let rock = 0;
    let spin = 0;
    const loop = () => {
      const n = Math.round(Math.min(1, Math.max(0, scrollState.progress)) * DOTS);
      if (n !== lit) {
        dots.forEach((d, i) => d.classList.toggle("on", i < n));
        lit = n;
      }
      if (!reduced) {
        rock += (Math.max(-50, Math.min(50, scrollState.velocity * 2.2)) - rock) * 0.1;
        spin += scrollState.velocity * 0.15;
        el.style.transform = `perspective(300px) rotateY(${(28 + rock).toFixed(2)}deg) rotateX(12deg) rotateZ(${spin.toFixed(1)}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div className="progress-ring" aria-hidden="true">
      <svg viewBox="-24 -24 48 48" ref={ref}>
        {Array.from({ length: DOTS }, (_, i) => {
          const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={(Math.cos(a) * 19).toFixed(2)} cy={(Math.sin(a) * 19).toFixed(2)} r="1.25" />;
        })}
      </svg>
    </div>
  );
}

// "Back to orbit" from far down the page: everything falls into the black
// hole, the page lands at the top, and the cloud is reborn from a point (the
// intro's burst again) before the hero fades back up around it.
function useWarpHome(reduced) {
  useEffect(() => {
    if (reduced) return undefined;
    let busy = false;
    const onClick = (event) => {
      const link = event.target.closest?.('a[href="#top"]');
      if (!link || busy || event.button !== 0 || window.scrollY < window.innerHeight * 1.5) return;
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");
      if (!main || !footer || !main.animate) return;
      event.preventDefault();
      busy = true;
      const els = [main, footer];
      // The hole sits a little below the middle of the screen.
      const cy = window.innerHeight * 0.56;
      for (const el of els) el.style.transformOrigin = `50% ${cy - el.getBoundingClientRect().top}px`;
      fx.warp = 1;
      const falls = els.map((el) => el.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: "scale(0.02) rotate(-38deg)", opacity: 0 },
        ],
        { duration: 950, easing: "cubic-bezier(.7,0,.84,0)", fill: "forwards" },
      ));
      falls[0].finished.then(() => {
        if (scrollState.lenis) scrollState.lenis.scrollTo(0, { immediate: true, force: true });
        else window.scrollTo(0, 0);
        window.dispatchEvent(new Event("rv:rebirth"));
        fx.warp = 0;
        for (const el of els) {
          el.style.transformOrigin = "";
          el.animate(
            [{ opacity: 0 }, { opacity: 0, offset: 0.62 }, { opacity: 1 }],
            { duration: 2800, easing: "ease-out" },
          );
        }
        falls.forEach((f) => f.cancel());
        busy = false;
      }).catch(() => { busy = false; fx.warp = 0; });
    };
    // Capture phase, ahead of the smooth-scroll anchor handler, which leaves
    // a click alone once it has been handled.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [reduced]);
}

export default function App() {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const reveal = useCallback(() => setRevealed(true), []);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => startSmoothScroll({ smooth: !reduced }), [reduced]);
  useEffect(() => (reduced ? undefined : startGyro()), [reduced]);
  useWarpHome(reduced);

  // Every click on something clickable sends a shockwave through the cloud.
  // The theme toggle sends its own, larger one.
  useEffect(() => {
    if (reduced) return undefined;
    const onClick = (event) => {
      const hit = event.target.closest?.("a, button");
      if (!hit || hit.closest(".theme-toggle")) return;
      emitWave(event.clientX, event.clientY, 0.75, 9);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [reduced]);

  useEffect(() => {
    const move = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = -(event.clientY / window.innerHeight - 0.5) * 2;
      pointer.current.active = event.pointerType === "mouse";
    };
    const leave = (event) => { if (!event.relatedTarget) pointer.current.active = false; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mouseout", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseout", leave);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      <ProgressRing />
      <div className="noise" />
      <Cursor />
      <AnimatePresence>{!revealed && <Intro key="intro" onDone={reveal} />}</AnimatePresence>
      {/* The scene mounts with the intro: the intro waits for it, the cloud
          samples the intro's R, and the hand-over is the particle burst. */}
      <Suspense fallback={null}>
        <Scene pointer={pointer} scroll={scrollState} />
      </Suspense>
      <Header />
      <main>
        <Hero revealed={revealed} />
        <About />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
