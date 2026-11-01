import {
  AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Github, Mail, Menu, X,
} from "lucide-react";
import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Intro from "./Intro";
import {
  Cursor, MagneticLink, Reveal, ScrubReveal, Split, ThemeToggle, TiltCard,
} from "./components";
import { services, skillGroups } from "./data";
import { dur, ease } from "./motion";
import { scrollState, startSmoothScroll } from "./smooth";

// Reduced-motion stand-in for the letter animations: same timing, no travel.
const fadeLine = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.quick } },
};

// Each letter rises out of its word's mask, rolled a few degrees off the
// baseline, a beat behind its neighbour — the headline is typeset in front of
// you rather than faded in.
const charIn = {
  hidden: { y: "112%", rotate: 14 },
  visible: (i) => ({
    y: "0%", rotate: 0,
    transition: { duration: dur.epic, ease: ease.expo, delay: 0.12 + i * 0.026 },
  }),
};

// Words stay unbroken: letters are inline-blocks, which a line may otherwise
// wrap between. The word is the mask.
function HeroChars({ text, offset = 0, reduced }) {
  let index = offset;
  const words = text.split(" ");
  return words.map((word, w) => (
    <Fragment key={`${word}-${w}`}>
      <span className="hword">
        {[...word].map((ch, i) => (
          <motion.span className="hchar" key={i} custom={index++} variants={reduced ? fadeLine : charIn}>
            {ch}
          </motion.span>
        ))}
      </span>
      {w < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

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

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={scrolled ? "nav-shell scrolled" : "nav-shell"}>
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
          <motion.nav
            className="mobile-nav"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)", transition: { duration: 0.55, ease: ease.expo } }}
            exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.35, ease: ease.inOut } }}
          >
            {nav.map(([label, href], index) => (
              <motion.a
                href={href}
                key={href}
                onClick={() => setOpen(false)}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 + index * 0.06, duration: 0.6, ease: ease.expo }}
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

  // Scrolling away shears the headline apart — the first line slides off one
  // side, the second off the other — while the camera dives past it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const lineA = useTransform(scrollYProgress, [0, 1], ["0vw", "-22vw"]);
  const lineB = useTransform(scrollYProgress, [0, 1], ["0vw", "22vw"]);
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

        <h1>
          <span className="sr-only">I engineer ideas into impact.</span>
          <motion.span className="hline" aria-hidden="true" style={reduced ? undefined : { x: lineA, opacity: fade }}>
            <HeroChars text="I engineer ideas" reduced={reduced} />
          </motion.span>
          <motion.span className="hline hline-b" aria-hidden="true" style={reduced ? undefined : { x: lineB, opacity: fade }}>
            <HeroChars text="into" offset={14} reduced={reduced} />{" "}
            <span className="hword">
              <motion.span
                className="accent"
                variants={reduced ? fadeLine : {
                  hidden: { y: "112%", rotate: 8 },
                  visible: { y: "0%", rotate: 0, transition: { duration: 1.4, ease: ease.expo, delay: 0.62 } },
                }}
              >
                impact.
              </motion.span>
            </span>
          </motion.span>
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

// Stacked: each card unfolds from its top edge as it rises into view.
function Unfold({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 55%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [-70, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  return (
    <div className="unfold" ref={ref}>
      <motion.div style={{ rotateX, opacity }}>{children}</motion.div>
    </div>
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

function Contact() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  // The closing line grows out of the horizon toward you as the page ends.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 25%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.72, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [120, 0]);

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
          >
            <WhatsAppGlyph size={20} /> Message me on WhatsApp
          </MagneticLink>
        </div>
        <div className="social-links">
          <a href="mailto:roshanshetty010100@gmail.com"><Mail size={17} /> Email</a>
          <a href="https://github.com/roshanvijay37" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a>
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

export default function App() {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const reveal = useCallback(() => setRevealed(true), []);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });

  useEffect(() => startSmoothScroll({ smooth: !reduced }), [reduced]);

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
      <div className="progress-rail" aria-hidden="true">
        <motion.i style={{ scaleY: progress }} />
      </div>
      <div className="noise" />
      <Cursor />
      <AnimatePresence>{!revealed && <Intro key="intro" onDone={reveal} />}</AnimatePresence>
      {/* The scene mounts only after the curtain, so the intro has a clear
          main thread instead of competing with a WebGL boot. */}
      {revealed && (
        <Suspense fallback={null}>
          <Scene pointer={pointer} scroll={scrollState} />
        </Suspense>
      )}
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
