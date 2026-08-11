import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { dur, ease } from "./motion";

// The page already spends well over a second booting React, the fonts and three
// WebGL contexts. Rather than leave that time blank, the curtain occupies it and
// hands over to the hero on a beat — the wait becomes the arrival.
//
// It never blocks: a hard timer resolves it regardless of what is still loading,
// and reduced-motion skips it entirely.
export default function Intro({ onDone }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reduced) { onDone(); return undefined; }
    // React's own mount costs ~350ms before this effect runs, so these are
    // deliberately shorter than they read — measured end to end it lands at
    // roughly 1.8s from navigation to a live hero.
    const toOpen = setTimeout(() => setOpen(true), 620);
    const toDone = setTimeout(onDone, 1420);
    return () => { clearTimeout(toOpen); clearTimeout(toDone); };
  }, [reduced, onDone]);

  if (reduced) return null;

  const panel = {
    closed: { y: "0%" },
    openTop: { y: "-101%", transition: { duration: 0.9, ease: ease.expo } },
    openBottom: { y: "101%", transition: { duration: 0.9, ease: ease.expo } },
  };

  return (
    <motion.div className="intro" aria-hidden="true" exit={{ opacity: 0 }}>
      <motion.div
        className="intro-panel intro-panel-top"
        variants={panel}
        initial="closed"
        animate={open ? "openTop" : "closed"}
      />
      <motion.div
        className="intro-panel intro-panel-bottom"
        variants={panel}
        initial="closed"
        animate={open ? "openBottom" : "closed"}
      />

      <motion.div
        className="intro-mark"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={open
          ? { opacity: 0, scale: 1.15, transition: { duration: 0.4, ease: ease.out } }
          : { opacity: 1, scale: 1, transition: { duration: dur.base, ease: ease.out } }}
      >
        <span>R</span>
        <motion.i
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.82, ease: ease.inOut }}
        />
      </motion.div>
    </motion.div>
  );
}
