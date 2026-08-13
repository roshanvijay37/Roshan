import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Github, Mail, Menu, X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Intro from "./Intro";
import { MagneticLink, Marquee, ProjectRow, Reveal, Scroll3D, ThemeToggle } from "./components";
import { projects, services, skillGroups } from "./data";
import { dur, maskLine } from "./motion";

// Reduced-motion stand-in for maskLine: same timing, no travel.
const fadeLine = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.quick } },
};

const Scene = lazy(() => import("./Scene"));

const nav = [
  ["About", "#about"],
  ["Skills", "#skills"],
  ["Work", "#work"],
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
  return (
    <section className="hero section-pad" id="top">
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
          {/* Each line rides up from behind its own mask, the second trailing the
              first — overlapping action rather than one block fading in. */}
          <motion.span className="line-mask" variants={{ hidden: {}, visible: {} }}>
            <motion.span className="line" variants={reduced ? fadeLine : maskLine}>
              I engineer ideas
            </motion.span>
          </motion.span>
          <motion.span className="line-mask" variants={{ hidden: {}, visible: {} }}>
            <motion.span className="line" variants={reduced ? fadeLine : maskLine}>
              into <span className="accent">impact.</span>
            </motion.span>
          </motion.span>
        </h1>
        <motion.p variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}>
          I design and build web products for founders and small teams — from fast marketing sites to full applications with real users behind them.
        </motion.p>
        <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <MagneticLink className="button primary" href="#work">Explore my work <ArrowRight size={18} /></MagneticLink>
          <MagneticLink className="button ghost" href="#contact">Start a conversation</MagneticLink>
        </motion.div>
      </motion.div>
      <motion.div className="hero-side-note" initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={{ delay: 0.9 }}>
        <span>Based in India</span>
      </motion.div>
      <a href="#about" className="scroll-cue" aria-label="Scroll to about">
        <span>Scroll to discover</span><ArrowDown size={16} />
      </a>
    </section>
  );
}

function About() {
  return (
    <section className="section-pad about" id="about">
      <Reveal className="section-heading">
        <span className="section-number">01 / ABOUT</span>
        <h2>What I build,<br /><em>and how I work.</em></h2>
      </Reveal>
      {/* The lead line here said "complicated problems into systems that feel
          simple, fast and dependable" — true, but every developer site says it,
          so it carried no information. The three cards say what there is to buy. */}
      <div className="service-grid">
        {services.map((service, index) => (
          <Reveal key={service.num} delay={index * 0.08}>
            <Scroll3D intensity={0.7} lift={0.6}>
              <div className="service-card">
                <span className="service-num">{service.num}</span>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
              </div>
            </Scroll3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className="section-pad skills-section" id="skills">
      <Reveal className="section-heading compact">
        <span className="section-number">02 / CAPABILITIES</span>
        <h2>What I build with.<br /><em>One way of working.</em></h2>
      </Reveal>
      {/* One full-bleed row per discipline, counter-moving at different speeds.
          A rotating sphere of words could not be read while it moved; type this
          large is legible even in motion, which is the whole point. */}
      <div className="kinetic-wall">
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
      </div>
    </section>
  );
}

function Work() {
  return (
    <section className="section-pad work" id="work">
      <Reveal className="section-heading horizontal">
        <div><span className="section-number">03 / SELECTED WORK</span><h2>Some of my work.<br /><em>All of it live.</em></h2></div>
        <p>A voice-first social product, a site-management platform for a construction firm, and sites for businesses across Dakshina Kannada. Every link goes to the running thing, not a case study.</p>
      </Reveal>
      <div className="project-list">
        {projects.map((project, index) => (
          <Reveal key={project.title}>
            <Scroll3D intensity={0.55} lift={0.7}>
              <ProjectRow project={project} />
            </Scroll3D>
          </Reveal>
        ))}
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
        <span className="section-number">04 / CONTACT</span>
        <h2>Have an ambitious idea?<br /><em>Let&apos;s give it gravity.</em></h2>
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
      <p>Designed & engineered with curiosity.</p>
      <a href="#top">Back to orbit <ArrowUpRight size={15} /></a>
    </footer>
  );
}

export default function App() {
  const [revealed, setRevealed] = useState(false);
  const reveal = useCallback(() => setRevealed(true), []);
  const pointer = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });

  useEffect(() => {
    const move = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = -(event.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
    };
    const scroll = () => { scrollRef.current = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1); };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      <motion.div className="progress-bar" style={{ scaleX: progress }} />
      <div className="noise" />
      <div className="cursor-glow" />
      <AnimatePresence>{!revealed && <Intro key="intro" onDone={reveal} />}</AnimatePresence>
      {/* The scene mounts only after the curtain. Booting three WebGL contexts
          while the intro plays saturates the main thread — the timers fire late
          and the panels slide at ~13fps. Deferring the mount buys the intro a
          clear thread, and the sculpture then assembles into an empty stage. */}
      {revealed && (
        <Suspense fallback={null}>
          <Scene pointer={pointer} scrollRef={scrollRef} revealed={revealed} />
        </Suspense>
      )}
      <Header />
      <main>
        <Hero revealed={revealed} />
        <About />
        <Skills />
        <Work />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
