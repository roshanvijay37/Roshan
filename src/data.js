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
    accent: "--acc-1",
  },
  {
    title: "Kateel Construction",
    type: "Site management platform",
    summary:
      "Mobile-first site management for a construction firm — drawings, progress photos and project records, in the hands of people standing on the site.",
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind", "Vercel"],
    href: "https://kateel.in",
    index: "02",
    accent: "--acc-2",
  },
  {
    title: "Adhishtam Digital",
    type: "Agency website",
    summary:
      "A dark, motion-led marketing site for a creative agency in Moodbidri, built around a full-screen preloader and scroll choreography.",
    stack: ["HTML", "CSS", "JavaScript", "GSAP-style motion"],
    href: "https://adhishtam.com",
    index: "03",
    accent: "--acc-3",
  },
  {
    title: "Shobha Digital Studio",
    type: "Photography studio",
    summary:
      "A bilingual marketing site for a photography and cinematography studio in Belvai, serving weddings, temple festivals and Yakshagana.",
    stack: ["Astro", "Tailwind", "Lenis", "OGL"],
    href: "https://shobhadigitalstudio.in",
    index: "04",
    accent: "--acc-4",
  },
  {
    title: "Belvai Temple",
    type: "Heritage site",
    summary:
      "A heritage site for an 830-year-old Shiva temple in Dakshina Kannada, written entirely in Kannada for the community that visits it.",
    stack: ["HTML", "CSS", "JavaScript"],
    href: "https://belvaitemple.in",
    index: "05",
    accent: "--acc-5",
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

// The constellation in Work: things that are live right now, each line taken
// from the site's own description (checked 2 Nov 2026). `p` is the star's
// place in the sky, x and y across, z toward you, all roughly -1..1; `links`
// are the lines drawn to earlier stars (by index), which make the shape.
export const constellation = [
  { name: "StatusHD", kind: "Product", line: "Keeps WhatsApp Status videos sharp instead of blurry. Works inside WhatsApp, nothing to install.", href: "https://statushd.in", c: "#2fd27a", p: [-0.08, 0.06, 0.35], links: [] },
  { name: "Chukta", kind: "Product · web + Android", line: "Every loan and EMI in one place. EMIs post themselves on their due date, stepping the debt down to zero.", href: "https://chukta.roshanvijay.com", c: "#ff6a2b", p: [0.42, 0.34, -0.1], links: [0] },
  { name: "OurReminder", kind: "Product · web + Android", line: "Reminders and push notifications for business teams.", href: "https://oureminder.com", c: "#7f9cff", p: [0.86, 0.02, 0.28], links: [1] },
  { name: "LawyerDesk", kind: "Product", line: "Cases, hearings, documents, tasks and clients for advocates.", href: "https://law.roshanvijay.com", c: "#6aa0ff", p: [0.58, -0.4, -0.38], links: [2] },
  { name: "EzyLinkIndia", kind: "Product", line: "Find local businesses near you and call or WhatsApp them in one tap.", href: "https://ezylinkindia.com", c: "#ffd166", p: [-0.52, 0.42, -0.3], links: [0] },
  { name: "Tejas Electronics", kind: "Client shop", line: "An online shop with cash on delivery for a furniture and electronics store in Moodbidri.", href: "https://tejas.roshanvijay.com", c: "#4f7cff", p: [0.08, -0.38, 0.12], links: [0, 3] },
  { name: "Yathvik Place", kind: "Client site", line: "A 3D site for a restaurant, rooms, bar and banquet hall in Moodbidri.", href: "https://yathvikplacemoodbidri.com", c: "#e8b04a", p: [-0.92, 0.0, 0.18], links: [4] },
  { name: "Belvai Temple", kind: "Heritage site", line: "A site for an 830-year-old temple in Dakshina Kannada, written in Kannada.", href: "https://belvaitemple.in", c: "#e0603e", p: [-0.62, -0.46, -0.42], links: [6, 5] },
  { name: "Shobha Digital Studio", kind: "Client site", line: "A photography studio in Belvai: weddings, temple festivals and Yakshagana.", href: "https://shobhadigitalstudio.in", c: "#f3eee6", p: [-0.3, -0.12, -0.72], links: [7, 4] },
  { name: "Adhishtam Digital", kind: "Client site", line: "A motion-led site for a creative agency in Moodbidri.", href: "https://adhishtam.com", c: "#9be15d", p: [0.22, 0.5, 0.55], links: [1, 0] },
];
