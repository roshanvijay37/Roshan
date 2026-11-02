import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ease } from "./motion";

// The page spends a second or so booting React, the fonts and the particle
// scene. A sheet in the page colour holds the screen with the R mark on it.
// When the cloud is ready it samples that R, and the hand-over is the show:
// the DOM R implodes to a point, the sheet drops away, and the particles —
// all of them sitting in that point — burst out, condense into the same R,
// and stream into the headline (Scene.jsx, "the boot").
//
// It never blocks: if the scene fails or is slow, a timer lifts the sheet
// anyway and the cloud skips straight to the headline when it does arrive.
// Reduced motion skips it entirely.
export default function Intro({ onDone }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState("wait");

  useEffect(() => {
    if (reduced) { window.__rvIntroDone = true; onDone(); return undefined; }
    let settled = false;
    let done = 0;
    const finish = (after) => {
      done = setTimeout(() => { window.__rvIntroDone = true; onDone(); }, after);
    };
    const go = () => {
      if (settled) return;
      settled = true;
      setPhase("lit");
      // The R has formed and starts streaming into the headline at 1.9 s;
      // the rest of the hero comes in with it.
      finish(1900);
    };
    const giveUp = () => {
      if (settled) return;
      settled = true;
      setPhase("fallback");
      finish(450);
    };
    window.addEventListener("rv:scene-ready", go);
    window.addEventListener("rv:scene-failed", giveUp);
    if (window.__rvSceneReady) go();
    const timeout = setTimeout(giveUp, 3200);
    return () => {
      clearTimeout(timeout);
      clearTimeout(done);
      window.removeEventListener("rv:scene-ready", go);
      window.removeEventListener("rv:scene-failed", giveUp);
    };
  }, [reduced, onDone]);

  if (reduced) return null;

  const lit = phase === "lit";
  return (
    <motion.div className="intro" aria-hidden="true" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <motion.div
        className="intro-sheet"
        animate={phase === "wait" ? { opacity: 1 } : { opacity: 0, transition: { duration: lit ? 0.35 : 0.45, ease: ease.inOut } }}
      />
      <motion.div
        className="intro-mark"
        // No entrance: the scene may sample the R at any moment, and must
        // find it at its true size.
        initial={false}
        animate={phase === "wait"
          ? { opacity: 1, scale: 1 }
          : lit
            // Collapses to the point the particles start from.
            ? { opacity: 0, scale: 0.02, transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }
            : { opacity: 0, y: -30, transition: { duration: 0.4, ease: ease.inOut } }}
      >
        <span>R</span>
      </motion.div>
    </motion.div>
  );
}
