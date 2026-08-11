// Shared motion vocabulary. Durations and easings live here so the whole page
// reads as one system instead of a pile of one-off numbers.

export const ease = {
  // Decelerating curves — the default for anything entering the page.
  out: [0.22, 1, 0.36, 1],
  expo: [0.16, 1, 0.3, 1],
  // Symmetric, for things that travel and settle.
  inOut: [0.65, 0, 0.35, 1],
  // Slight overshoot, for accents only.
  back: [0.34, 1.56, 0.64, 1],
};

export const dur = {
  snap: 0.18,
  quick: 0.32,
  base: 0.55,
  slow: 0.85,
  epic: 1.15,
};

export const spring = {
  // Settles without visible bounce — layout and scroll-linked values.
  calm: { type: "spring", stiffness: 90, damping: 26, restDelta: 0.001 },
  // Responds to pointer input.
  quick: { type: "spring", stiffness: 220, damping: 22 },
  // Deliberate overshoot for accents.
  pop: { type: "spring", stiffness: 380, damping: 14 },
};

// A line of type sliding up from behind its own mask. The mask element needs
// `overflow: hidden`; the padding/margin pair in CSS keeps descenders intact.
export const maskLine = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: dur.epic, ease: ease.expo } },
};

// Anticipation: dip fractionally before rising. Reads as the element gathering
// itself rather than teleporting to the hover state.
export const anticipate = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: [1, 0.982, 1.024],
    y: [0, 1.5, -2],
    transition: { duration: dur.quick, times: [0, 0.3, 1], ease: ease.out },
  },
  tap: { scale: 0.97, y: 0, transition: { duration: dur.snap } },
};
