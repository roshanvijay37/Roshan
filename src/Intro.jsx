import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { dur, ease } from "./motion";

// The page spends over a second booting React and the fonts. Rather than leave
// that time blank, a sheet of ink holds the screen while a trace runs across
// it, then lifts away on a slant and hands over to the hero on a beat.
//
// It never blocks: a hard timer resolves it regardless of what is still loading,
// and reduced-motion skips it entirely.
export default function Intro({ onDone }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reduced) { onDone(); return undefined; }
    // React's own mount costs ~350ms before this effect runs, so these are
    // deliberately shorter than they read.
    const toOpen = setTimeout(() => setOpen(true), 700);
    const toDone = setTimeout(onDone, 1500);
    return () => { clearTimeout(toOpen); clearTimeout(toDone); };
  }, [reduced, onDone]);

  if (reduced) return null;

  return (
    <motion.div className="intro" aria-hidden="true" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <motion.div
        className="intro-sheet"
        initial={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
        animate={open
          ? { clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)", transition: { duration: 0.85, ease: ease.inOut } }
          : undefined}
      />
      <motion.div
        className="intro-mark"
        initial={{ opacity: 0, y: 12 }}
        animate={open
          ? { opacity: 0, y: -40, transition: { duration: 0.45, ease: ease.inOut } }
          : { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
      >
        <span>R</span>
        <svg viewBox="0 0 160 24" preserveAspectRatio="none">
          <motion.path
            d="M0 12 L46 12 L54 3 L62 21 L70 6 L77 16 L84 12 L160 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.75, ease: ease.inOut }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
