import emailjs from "@emailjs/browser";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, Github, Linkedin, Mail,
  Menu, Send, Sparkles, X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MagneticLink, ProjectCard, Reveal, TiltCard } from "./components";
import { education, experience, projects, skills } from "./data";

const Scene = lazy(() => import("./Scene"));

const nav = [
  ["About", "#about"],
  ["Skills", "#skills"],
  ["Work", "#work"],
  ["Experience", "#experience"],
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
      <a className="nav-cta" href="mailto:roshanshetty010100@gmail.com">
        Let&apos;s talk <ArrowUpRight size={15} />
      </a>
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

function Hero() {
  return (
    <section className="hero section-pad" id="top">
      <motion.div
        className="hero-copy"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.11, delayChildren: 0.2 } } }}
      >
        <motion.div className="availability" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
          <i /> Available for ambitious projects
        </motion.div>
        <motion.h1 variants={{ hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } } }}>
          I engineer ideas<br />
          into <span>impact.</span>
        </motion.h1>
        <motion.p variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}>
          Software engineer building scalable products, intelligent tools, and digital experiences with equal parts precision and imagination.
        </motion.p>
        <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <MagneticLink className="button primary" href="#work">Explore my work <ArrowRight size={18} /></MagneticLink>
          <MagneticLink className="button ghost" href="#contact">Start a conversation</MagneticLink>
        </motion.div>
      </motion.div>
      <motion.div className="hero-side-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <span>Based in India</span>
        <span>04+ years building products</span>
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
        <h2>Clarity in the code.<br /><em>Curiosity in the process.</em></h2>
      </Reveal>
      <div className="about-grid">
        <Reveal className="about-portrait">
          <div className="portrait-frame">
            <img src="/img/profile_big.jpg" alt="Roshan Vijay" />
            <div className="portrait-shine" />
          </div>
          <span className="portrait-caption">Roshan Vijay · Software Engineer</span>
        </Reveal>
        <div className="about-copy">
          <Reveal>
            <p className="lead-copy">I turn complicated product problems into systems that feel simple, fast, and dependable.</p>
            <p>My route into software engineering involved a little luck. Staying in it was a deliberate choice. I found a field where disciplined thinking and creative experimentation reinforce each other—and I have been happily building ever since.</p>
          </Reveal>
          <div className="stats">
            {[
              ["04+", "Years in product engineering"],
              ["02", "Enterprise platforms"],
              ["06+", "Independent web experiences"],
            ].map(([number, label], index) => (
              <Reveal key={label} delay={index * 0.08}>
                <TiltCard className="stat-card">
                  <strong>{number}</strong><span>{label}</span>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className="section-pad skills-section" id="skills">
      <Reveal className="section-heading compact">
        <span className="section-number">02 / CAPABILITIES</span>
        <h2>Built across the stack.<br /><em>Focused on outcomes.</em></h2>
      </Reveal>
      <div className="skills-layout">
        <Reveal className="skill-orbit">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="orbit-core"><Sparkles size={30} /><span>BUILD</span></div>
          {skills.slice(0, 8).map((skill, index) => (
            <motion.span
              className={`orbit-skill orbit-skill-${index + 1}`}
              key={skill}
              whileHover={{ scale: 1.15, zIndex: 10 }}
            >
              {skill}
            </motion.span>
          ))}
        </Reveal>
        <div className="capability-list">
          {[
            ["01", "Product engineering", ".NET, C#, Angular, TypeScript and robust API design."],
            ["02", "Distributed systems", "Microservices, queues, bulk processing and resilient integrations."],
            ["03", "Intelligent workflows", "AI-assisted features that move from prototype to production."],
            ["04", "Technical leadership", "Architecture, security, code quality and collaborative delivery."],
          ].map(([num, title, text], index) => (
            <Reveal key={title} delay={index * 0.06}>
              <motion.div className="capability-row" whileHover={{ x: 8 }}>
                <span>{num}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight size={18} />
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="skill-marquee" aria-hidden="true">
        <div>{[...skills, ...skills].map((skill, index) => <span key={`${skill}-${index}`}>{skill}<i>✦</i></span>)}</div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section className="section-pad work" id="work">
      <Reveal className="section-heading horizontal">
        <div><span className="section-number">03 / SELECTED WORK</span><h2>Experiments with<br /><em>real-world edges.</em></h2></div>
        <p>A collection of websites and utilities built to solve specific problems, learn in public, and make useful things feel considered.</p>
      </Reveal>
      <div className="projects-grid">
        {projects.map((project) => <ProjectCard project={project} key={project.title} />)}
      </div>
    </section>
  );
}

function Experience() {
  return (
    <section className="section-pad experience" id="experience">
      <Reveal className="section-heading compact">
        <span className="section-number">04 / EXPERIENCE</span>
        <h2>Systems, teams,<br /><em>and momentum.</em></h2>
      </Reveal>
      <div className="timeline">
        {experience.map((item, index) => (
          <Reveal className="timeline-item" key={item.company}>
            <div className="timeline-marker"><span>{index + 1}</span></div>
            <div className="timeline-period">{item.period}</div>
            <div className="timeline-content">
              <span className="company">{item.company}</span>
              <h3>{item.role}</h3>
              <p className="timeline-summary">{item.summary}</p>
              <ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
              <div className="tag-list">{item.stack.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="education-block">
        <span className="section-number">EDUCATION</span>
        <div>
          {education.map((item) => (
            <div className="education-row" key={item.title}>
              <span>{item.year}</span><h3>{item.title}</h3><p>{item.place}</p><strong>{item.score}</strong>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Contact() {
  const [status, setStatus] = useState("idle");
  const submit = async (event) => {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    try {
      await emailjs.sendForm("service_7ft8ctb", "template_9vdseo7", form, { publicKey: "Xd_uhEKp8W8k0_gE7" });
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="section-pad contact" id="contact">
      <div className="contact-glow" />
      <Reveal className="contact-intro">
        <span className="section-number">05 / CONTACT</span>
        <h2>Have an ambitious idea?<br /><em>Let&apos;s give it gravity.</em></h2>
        <p>I&apos;m always interested in thoughtful products, difficult engineering problems, and collaborations with a little spark to them.</p>
        <div className="social-links">
          <a href="mailto:roshanshetty010100@gmail.com"><Mail size={17} /> Email</a>
          <a href="https://github.com/roshanvijay37" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a>
          <a href="https://www.linkedin.com/in/roshan-shetty-046161191/" target="_blank" rel="noreferrer"><Linkedin size={17} /> LinkedIn</a>
        </div>
      </Reveal>
      <Reveal>
        <form className="contact-form glass" onSubmit={submit}>
          <div className="form-row">
            <label><span>Your name</span><input required name="from_name" placeholder="Jane Smith" autoComplete="name" /></label>
            <label><span>Email address</span><input required type="email" name="email_id" placeholder="jane@company.com" autoComplete="email" /></label>
          </div>
          <label><span>Phone <i>optional</i></span><input name="phone" placeholder="+91 00000 00000" autoComplete="tel" /></label>
          <label><span>Tell me about the idea</span><textarea required name="message" rows="5" placeholder="A little context, the challenge, and what success looks like…" /></label>
          <button className="button primary submit-button" disabled={status === "sending" || status === "sent"}>
            {status === "sending" ? "Sending…" : status === "sent" ? <><Check size={18} /> Message sent</> : <>Send message <Send size={17} /></>}
          </button>
          {status === "error" && <p className="form-error">The signal got lost. Please email me directly instead.</p>}
        </form>
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
      <Suspense fallback={null}><Scene pointer={pointer} scrollRef={scrollRef} /></Suspense>
      <Header />
      <main>
        <Hero />
        <About />
        <Skills />
        <Work />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
