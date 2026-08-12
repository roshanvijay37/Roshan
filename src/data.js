// Every summary here is drawn from the project's own README or the running
// site — not invented. A client cannot judge a screenshot; they can judge a
// sentence that says what the thing does and what was hard about it.
export const projects = [
  {
    title: "TradingOS",
    type: "Autonomous trading system",
    year: "2026",
    summary:
      "An autonomous futures bot running a trend-gated 5-EMA strategy on Bank Nifty, with a manual options terminal and a backtest lab beside it.",
    detail:
      "Live trading and backtesting share one signal engine, so a rule can never quietly mean two different things in two places.",
    stack: ["React", "TypeScript", "Node", "Express", "WebSockets", "AWS"],
    image: "/img/tradingos.jpg",
    href: "https://trading-os-sable.vercel.app",
    color: "#22c55e",
    index: "01",
  },
  {
    title: "Finance OS",
    type: "Personal finance platform",
    year: "2026",
    summary:
      "A financial operating system built on an append-only ledger, answering one question every time you open it: where do I actually stand today?",
    detail:
      "No balance is ever stored. Net worth, debt and safe-to-spend are all derived from events, so the numbers cannot drift out of sync with each other.",
    stack: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "TanStack Query"],
    image: "/img/financeos.jpg",
    href: "https://kadambamoodbidri.in",
    color: "#a855f7",
    index: "02",
  },
  {
    title: "Chatu",
    type: "Voice-first social",
    year: "2026",
    summary:
      "Voice conversations with one stranger at a time, matched on shared interests, language and a trust score rather than a roulette of anonymous rooms.",
    detail:
      "Video only turns on if both people agree, and every action is attached to an account that can be reported — the moderation model is the product.",
    stack: ["Next.js", "TypeScript", "Supabase", "Zustand", "Realtime audio"],
    image: "/img/chatu.jpg",
    href: "https://chatu.in",
    color: "#c2610c",
    index: "03",
  },
  {
    title: "Kateel Construction",
    type: "Site management platform",
    year: "2026",
    summary:
      "Mobile-first site management for a construction firm — drawings, progress photos and project records, in the hands of people standing on the site.",
    detail:
      "Role-based access across admin, chief engineer and site engineer, with image compression on the client so uploads survive a patchy site connection.",
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind", "Vercel"],
    image: "/img/kateel.jpg",
    href: "https://kateel.in",
    color: "#2563eb",
    index: "04",
  },
  {
    title: "Adhishtam Digital",
    type: "Agency website",
    year: "2026",
    summary:
      "A dark, motion-led marketing site for a creative agency in Moodbidri, built around a full-screen preloader and scroll choreography.",
    detail: "Live on its own domain, adhishtam.com.",
    stack: ["HTML", "CSS", "JavaScript", "GSAP-style motion"],
    image: "/img/adhishtam.jpg",
    href: "https://adhishtam.com",
    color: "#2f9e6e",
    index: "05",
  },
  {
    title: "Shobha Digital Studio",
    type: "Photography studio",
    year: "2026",
    summary:
      "A bilingual marketing site for a photography and cinematography studio in Belvai, serving weddings, temple festivals and Yakshagana.",
    detail:
      "Astro with smooth scrolling and WebGL accents, hosted free on GitHub Pages — the only running cost is the domain.",
    stack: ["Astro", "Tailwind", "Lenis", "OGL"],
    image: "/img/shobhadigital.jpg",
    href: "https://shobhadigitalstudio.in",
    color: "#c9a227",
    index: "06",
  },
  {
    title: "Belvai Temple",
    type: "Heritage site",
    year: "2026",
    summary:
      "A heritage site for an 830-year-old Shiva temple in Dakshina Kannada, written entirely in Kannada for the community that visits it.",
    detail: "History, rituals, gallery and contact, on its own domain.",
    stack: ["HTML", "CSS", "JavaScript"],
    image: "/img/belvaitemple.jpg",
    href: "https://belvaitemple.in",
    color: "#d97706",
    index: "07",
  },
  {
    title: "Shivam Digital",
    type: "Photography experience",
    year: "2025",
    summary:
      "A portfolio site for a photography studio, built around full-bleed imagery and a quiet, image-first layout.",
    detail: "",
    stack: ["HTML", "CSS", "JavaScript"],
    image: "/img/img_1.jpg",
    href: "https://shivamdigital.vercel.app",
    color: "#8b5cf6",
    index: "08",
  },
  {
    title: "Ocean Pearl",
    type: "Hospitality website",
    year: "2025",
    summary:
      "A hotel site for Ocean Pearl in Ujire — rooms, dining and amenities, with booking enquiries routed straight to WhatsApp.",
    detail: "",
    stack: ["HTML", "CSS", "JavaScript"],
    image: "/img/oceanpearl.jpg",
    href: "https://oceanpearlujire.vercel.app",
    color: "#38bdf8",
    index: "09",
  },
];

// Drawn from what these repos actually use — package manifests across
// trading-os, finance-os, attendance, kateel, chatu, the Astro site and this
// one — plus the enterprise stack from day-job work. Grouped so the sphere can
// colour by discipline rather than showing forty undifferentiated words.
export const skillGroups = [
  {
    key: "lang",
    name: "Languages",
    items: ["TypeScript", "JavaScript", "C#", "Python", "Java", "SQL", "HTML", "CSS", "GLSL"],
  },
  {
    key: "front",
    name: "Frontend",
    items: ["React", "Next.js", "Angular", "Astro", "Tailwind CSS", "Radix UI", "SCSS", "Vite"],
  },
  {
    key: "motion",
    name: "3D & Motion",
    items: ["Three.js", "React Three Fiber", "Drei", "Framer Motion", "Shaders", "OGL", "Lenis"],
  },
  {
    key: "back",
    name: "Backend & Data",
    items: ["Node.js", "Express", ".NET Core", "Supabase", "PostgreSQL", "SQL Server", "REST APIs", "GraphQL", "WebSockets", "RabbitMQ"],
  },
  {
    key: "ops",
    name: "Tooling & Delivery",
    items: ["Git", "Vercel", "AWS Lightsail", "Nginx", "PM2", "Vitest", "Zod", "TanStack Query", "Zustand"],
  },
];

// What a client is actually buying. The site previously described capabilities
// in the abstract; these are engagements someone can point at and say "that one".
export const services = [
  {
    num: "01",
    title: "Product builds",
    body: "Full applications with auth, data and real users behind them — the kind of thing Finance OS and Kateel are.",
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

// Flat list for the marquee.
export const skills = skillGroups.flatMap((g) => g.items);
