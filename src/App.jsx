import {
  AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Github, Mail, Menu, X,
} from "lucide-react";
import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Intro from "./Intro";
import {
  Cursor, MagneticLink, Marquee, Reveal, Scroll3D, ScrubReveal, Split, ThemeToggle, TiltCard,
} from "./components";
import { services, skillGroups } from "./data";
import { dur, ease } from "./motion";
import { scrollState, startSmoothScroll } from "./smooth";

// Reduced-motion stand-in for the letter animations: same timing, no travel.
const fadeLine = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.quick } },
};

// Each letter of the headline swings up on its own hinge out of the page, a
// beat behind its neighbour, so the line assembles in depth rather than sliding.
const charIn = {
  hidden: { y: "0.55em", rotateX: -96, z: -90, opacity: 0 },
  visible: (i) => ({
    y: "0em", rotateX: 0, z: 0, opacity: 1,
    transition: { duration: dur.epic, ease: ease.expo, delay: 0.18 + i * 0.03 },
  }),
};

// Words stay unbroken: letters are inline-blocks, which a line may otherwise
// wrap between.
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

// True on screens big enough to pin the service cards and fly them in. Below
// that the pinned stage cannot fit the heading and three cards at once.
const DECK_QUERY = "(min-width: 981px) and (min-height: 700px)";
function useDeckMode() {
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(DECK_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DECK_QUERY);
    const sync = () => setWide(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide && !reduced;
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
        {nav.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
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
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {nav.map(([label, href], index) => (
              <motion.a
                href={href}
                key={href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
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

  // Scrolling away tips the whole hero back into the page and lets it fall
  // into depth, so the scene behind seems to come forward to meet you.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const exitRotate = useTransform(scrollYProgress, [0, 1], [0, 26]);
  const exitZ = useTransform(scrollYProgress, [0, 1], [0, -460]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const exitFade = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  // The headline leans a few degrees toward the pointer: enough to feel the
  // depth in the letters, never enough to make them hard to read.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tiltY = useSpring(useTransform(px, [-1, 1], [-5, 5]), { stiffness: 60, damping: 18 });
  const tiltX = useSpring(useTransform(py, [-1, 1], [-3.5, 3.5]), { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (reduced) return undefined;
    const move = (event) => {
      if (event.pointerType !== "mouse") return;
      px.set((event.clientX / window.innerWidth - 0.5) * 2);
      py.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced, px, py]);

  return (
    <section className="hero section-pad" id="top" ref={ref}>
      <motion.div
        className="hero-stage"
        style={reduced ? undefined : { rotateX: exitRotate, z: exitZ, y: exitY, opacity: exitFade }}
      >
        <motion.div className="hero-tilt" style={reduced ? undefined : { rotateX: tiltX, rotateY: tiltY }}>
          <motion.div
            className="hero-copy"
            initial="hidden"
            // Held until the curtain opens so the headline rises into view rather
            // than being already settled behind it.
            animate={revealed ? "visible" : "hidden"}
            variants={{ visible: { transition: { staggerChildren: 0.11, delayChildren: 0.12 } } }}
          >
            {/* The first screen previously carried no name at all — only the "R"
                logo — so anyone arriving from a shared link had to scroll to find
                out whose site this is. */}
            <motion.div className="hero-identity" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <span>
                <strong>Roshan Vijay</strong>
                <i>Software Engineer</i>
              </span>
            </motion.div>
            <motion.div className="availability" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
              <i /> Available for ambitious projects
            </motion.div>
            <h1>
              <span className="sr-only">I engineer ideas into impact.</span>
              {/* Letter by letter in depth; the accent word arrives last and
                  whole, so its gold gradient stays one sweep instead of
                  restarting on every letter. */}
              <motion.span className="line-3d" aria-hidden="true" variants={{ hidden: {}, visible: {} }}>
                <HeroChars text="I engineer ideas" reduced={reduced} />
              </motion.span>
              <motion.span className="line-3d" aria-hidden="true" variants={{ hidden: {}, visible: {} }}>
                <HeroChars text="into" offset={14} reduced={reduced} />{" "}
                <motion.span
                  className="accent"
                  variants={reduced ? fadeLine : {
                    hidden: { opacity: 0, rotateX: -80, z: -160, y: "0.4em", filter: "blur(12px)" },
                    visible: {
                      opacity: 1, rotateX: 0, z: 0, y: "0em", filter: "blur(0px)",
                      transition: { duration: 1.3, ease: ease.expo, delay: 0.8 },
                    },
                  }}
                >
                  impact.
                </motion.span>
              </motion.span>
            </h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}>
              I design and build web products for founders and small teams — from fast marketing sites to full applications with real users behind them.
            </motion.p>
            <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <MagneticLink className="button primary" href="#contact">Start a conversation <ArrowRight size={18} /></MagneticLink>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.div className="hero-side-note" initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={{ delay: 0.9 }}>
        <motion.span style={reduced ? undefined : { opacity: exitFade }}>Based in India</motion.span>
      </motion.div>
      <motion.a href="#about" className="scroll-cue" aria-label="Scroll to about" style={reduced ? undefined : { opacity: exitFade }}>
        <span>Scroll to discover</span><ArrowDown size={16} />
      </motion.a>
    </section>
  );
}

// Card `index` of three, flown in from a single point deep in the scene and
// fanned out to its place in the row. The ranges overlap, so the second card
// is already in flight while the first is landing.
function DeckCard({ progress, index, children }) {
  const from = index * 0.15;
  const range = [from, from + 0.5];
  const side = index - 1;
  const z = useTransform(progress, range, [-1500, 0]);
  const x = useTransform(progress, range, [`${side * -108}%`, "0%"]);
  const y = useTransform(progress, range, [140, 0]);
  const rotateY = useTransform(progress, range, [side * -62, 0]);
  const rotateX = useTransform(progress, range, [42, 0]);
  const rotateZ = useTransform(progress, range, [side * 9, 0]);
  const opacity = useTransform(progress, [from, from + 0.2], [0, 1]);
  return (
    <motion.div className="deck-card" style={{ z, x, y, rotateX, rotateY, rotateZ, opacity }}>
      {children}
    </motion.div>
  );
}

function ServiceCard({ service }) {
  return (
    <TiltCard>
      <div className="service-card">
        <span className="service-num">{service.num}</span>
        <h3>{service.title}</h3>
        <p>{service.body}</p>
      </div>
    </TiltCard>
  );
}

function AboutHeading() {
  return (
    <Reveal className="section-heading">
      <span className="section-number">01 / ABOUT</span>
      <ScrubReveal as="h2">
        <Split text="What I build," /><br /><em><Split text="and how I work." /></em>
      </ScrubReveal>
    </Reveal>
  );
}

function About() {
  const deck = useDeckMode();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end end"] });

  // On a large screen the section pins and the cards fly in while it holds.
  if (deck) {
    return (
      <section className="section-pad about deck" id="about" ref={ref} data-anchor-end>
        <div className="deck-sticky">
          <AboutHeading />
          <div className="service-grid">
            {services.map((service, index) => (
              <DeckCard progress={scrollYProgress} index={index} key={service.num}>
                <ServiceCard service={service} />
              </DeckCard>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-pad about" id="about" ref={ref}>
      <AboutHeading />
      {/* The lead line here said "complicated problems into systems that feel
          simple, fast and dependable" — true, but every developer site says it,
          so it carried no information. The three cards say what there is to buy. */}
      <div className="service-grid">
        {services.map((service, index) => (
          <Reveal key={service.num} delay={index * 0.08}>
            <Scroll3D intensity={1.6} lift={1.4}>
              <ServiceCard service={service} />
            </Scroll3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Skills() {
  const reduced = useReducedMotion();
  const wall = useRef(null);
  // The wall is a floor of type that the page tips up to face you and lays
  // back down as it leaves, sheared sideways by how fast you scroll.
  const { scrollYProgress } = useScroll({ target: wall, offset: ["start end", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [48, 0, -34]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.82, 1, 0.9]);
  const z = useTransform(scrollYProgress, [0, 0.5, 1], [-260, 0, -200]);
  // Read from the shared scroll state, which decays to zero when the page
  // stops; framer's velocity could leave the wall sheared at rest.
  const skewX = useMotionValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    const loop = () => {
      const target = Math.max(-9, Math.min(9, scrollState.velocity * -0.22));
      const next = skewX.get() + (target - skewX.get()) * 0.12;
      skewX.set(Math.abs(next) < 0.01 ? 0 : next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, skewX]);

  return (
    <section className="section-pad skills-section" id="skills">
      <Reveal className="section-heading compact">
        <span className="section-number">02 / CAPABILITIES</span>
        <ScrubReveal as="h2">
          <Split text="What I build with." /><br /><em><Split text="One way of working." /></em>
        </ScrubReveal>
      </Reveal>
      {/* One full-bleed row per discipline, counter-moving at different speeds.
          A rotating sphere of words could not be read while it moved; type this
          large is legible even in motion, which is the whole point. */}
      <div className="kinetic-stage" ref={wall}>
        <motion.div className="kinetic-wall" style={reduced ? undefined : { rotateX, scale, z, skewX }}>
          {skillGroups.map((group, index) => (
            <div className="kinetic-row" data-group={group.key} key={group.key}>
              <span className="kinetic-label">{group.name}</span>
              <Marquee
                className="kinetic-track"
                reverse={index % 2 === 1}
                lockDirection
                baseSpeed={2.4 + index * 0.55}
                maxBoost={34}
              >
                {/* Tripled, not doubled: the groups are five items now instead of
                    nine, and a row needs enough width to loop without a gap. */}
                {[...group.items, ...group.items, ...group.items].map((item, i) => (
                  <span key={`${item}-${i}`}>{item}<i>✦</i></span>
                ))}
              </Marquee>
            </div>
          ))}
        </motion.div>
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
  return (
    <section className="section-pad contact" id="contact">
      {/* The glow clips against this, not against the section. The section is
          48px narrower than the screen, so clipping there cut the wash off in a
          hard vertical line 80px from the edge. */}
      <div className="contact-fx" aria-hidden="true">
        <div className="contact-glow" />
      </div>
      <Reveal className="contact-intro">
        <span className="section-number">03 / CONTACT</span>
        {/* The page ends soon after this heading, so on a tall screen its top
            never reaches the default end line; settle it lower. */}
        <ScrubReveal as="h2" start="start 98%" end="start 62%">
          <Split text="Have an ambitious idea?" /><br /><em><Split text="Let's give it gravity." /></em>
        </ScrubReveal>
        <p>I&apos;m always interested in thoughtful products, difficult engineering problems, and collaborations with a little spark to them.</p>
        <div className="contact-actions">
          {/* wa.me needs the number in full international form, no plus or spaces. */}
          <MagneticLink
            className="button primary"
            href="https://wa.me/917349495469"
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppGlyph size={19} /> Message me on WhatsApp
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
  const pointer = useRef({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });

  useEffect(() => startSmoothScroll({ smooth: !reduced }), [reduced]);

  useEffect(() => {
    const move = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = -(event.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      <motion.div className="progress-bar" style={{ scaleX: progress }} />
      <div className="noise" />
      <div className="cursor-glow" />
      <Cursor />
      <AnimatePresence>{!revealed && <Intro key="intro" onDone={reveal} />}</AnimatePresence>
      {/* The scene mounts only after the curtain. Booting three WebGL contexts
          while the intro plays saturates the main thread — the timers fire late
          and the panels slide at ~13fps. Deferring the mount buys the intro a
          clear thread, and the sculpture then assembles into an empty stage. */}
      {revealed && (
        <Suspense fallback={null}>
          <Scene pointer={pointer} scroll={scrollState} revealed={revealed} />
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
