// Every summary here is drawn from the project's own README or the running
// site — not invented. A client cannot judge a screenshot; they can judge a
// sentence that says what the thing does and what was hard about it.
export const projects = [
  {
    title: "Chatu",
    type: "Voice-first social",
    summary:
      "Voice conversations with one stranger at a time, matched on shared interests, language and a trust score rather than a roulette of anonymous rooms.",
    stack: ["Next.js", "TypeScript", "Supabase", "Zustand", "Realtime audio"],
    href: "https://chatu.in",
    index: "01",
  },
  {
    title: "Kateel Construction",
    type: "Site management platform",
    summary:
      "Mobile-first site management for a construction firm — drawings, progress photos and project records, in the hands of people standing on the site.",
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind", "Vercel"],
    href: "https://kateel.in",
    index: "02",
  },
  {
    title: "Adhishtam Digital",
    type: "Agency website",
    summary:
      "A dark, motion-led marketing site for a creative agency in Moodbidri, built around a full-screen preloader and scroll choreography.",
    stack: ["HTML", "CSS", "JavaScript", "GSAP-style motion"],
    href: "https://adhishtam.com",
    index: "03",
  },
  {
    title: "Shobha Digital Studio",
    type: "Photography studio",
    summary:
      "A bilingual marketing site for a photography and cinematography studio in Belvai, serving weddings, temple festivals and Yakshagana.",
    stack: ["Astro", "Tailwind", "Lenis", "OGL"],
    href: "https://shobhadigitalstudio.in",
    index: "04",
  },
  {
    title: "Belvai Temple",
    type: "Heritage site",
    summary:
      "A heritage site for an 830-year-old Shiva temple in Dakshina Kannada, written entirely in Kannada for the community that visits it.",
    stack: ["HTML", "CSS", "JavaScript"],
    href: "https://belvaitemple.in",
    index: "05",
  },
];

// Fifteen, not forty-three. A long list reads as junior, and it is the least
// verifiable thing on the page — a client cannot check it and a technical
// evaluator will probe the weakest item on it. Everything here is evidenced by
// a project above or by this site itself, and is worth being interviewed on.
// The per-project `stack` does the detailed work; this is the shape of it.
//
// Keys stay `front`/`motion`/`back` because styles.css colours the rows by them.
export const skillGroups = [
  {
    key: "front",
    name: "Frontend",
    items: ["TypeScript", "React", "Next.js", "Astro", "Tailwind CSS"],
  },
  {
    key: "motion",
    name: "3D & Motion",
    items: ["Three.js", "React Three Fiber", "Framer Motion", "GLSL", "Lenis"],
  },
  {
    key: "back",
    name: "Backend & Delivery",
    items: ["Node.js", "Supabase", "PostgreSQL", ".NET Core", "Vercel"],
  },
];

// What a client is actually buying. The site previously described capabilities
// in the abstract; these are engagements someone can point at and say "that one".
export const services = [
  {
    num: "01",
    title: "Product builds",
    body: "Full applications with auth, data and real users behind them — the kind of thing Chatu and Kateel are.",
  },
  {
    num: "02",
    title: "Marketing sites",
    body: "Fast, motion-led sites for businesses that need to look considered. Astro or Next, hosted cheaply, yours to keep.",
  },
  {
    num: "03",
    title: "Systems & integrations",
    body: "APIs, realtime data, third-party integrations and the unglamorous plumbing that keeps a product honest.",
  },
];
