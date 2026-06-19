import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";

export const fadeUp = {
  hidden: { opacity: 0, y: 44, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
};

export function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function MagneticLink({ children, className = "", ...props }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });

  const move = (event) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  return (
    <motion.a
      ref={ref}
      className={className}
      style={{ x, y }}
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
  const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const gx = useMotionValue("50%");
  const gy = useMotionValue("50%");

  const move = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateX.set((0.5 - py) * 7);
    rotateY.set((px - 0.5) * 7);
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

export function ProjectCard({ project }) {
  return (
    <Reveal>
      <TiltCard className="project-card" glow={project.color}>
        <a href={project.href} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
          <div className="project-image">
            <img src={project.image} alt="" loading="lazy" />
            <span className="project-open"><ArrowUpRight size={20} /></span>
          </div>
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
