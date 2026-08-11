import {
  animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const ease = [0.22, 1, 0.36, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 44, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.85, ease } },
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
      {...props}
    >
      {children}
    </motion.a>
  );
}

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
    <motion.div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{ rotateX, rotateY, "--glow": glow, "--gx": gx, "--gy": gy }}
      onMouseMove={move}
      onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
    >
      {children}
    </motion.div>
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
      <span className="project-open"><ArrowUpRight size={20} /></span>
    </div>
  );
}

export function ProjectCard({ project, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <TiltCard className="project-card" glow={project.color}>
        <a href={project.href} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
          <ParallaxImage src={project.image} />
          <div className="project-meta">
            <div>
              <span className="eyebrow">{project.type}</span>
              <h3>{project.title}</h3>
            </div>
            <span className="project-index">{project.index}</span>
          </div>
        </a>
      </TiltCard>
    </Reveal>
  );
}
