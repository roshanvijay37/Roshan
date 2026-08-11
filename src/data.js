export const projects = [
  {
    title: "TradingOS",
    type: "Autonomous trading system",
    image: "/img/tradingos.jpg",
    href: "https://trading-os-sable.vercel.app",
    color: "#22c55e",
    index: "01",
  },
  {
    title: "Finance OS",
    type: "Personal finance platform",
    image: "/img/financeos.jpg",
    href: "https://kadambamoodbidri.in",
    color: "#a855f7",
    index: "02",
  },
  {
    title: "Chatu",
    type: "Voice-first social",
    image: "/img/chatu.jpg",
    href: "https://chatu.in",
    color: "#c2610c",
    index: "03",
  },
  {
    title: "Kateel Construction",
    type: "Site management platform",
    image: "/img/kateel.jpg",
    href: "https://kateel.in",
    color: "#2563eb",
    index: "04",
  },
  {
    title: "Adhishtam Digital",
    type: "Agency website",
    image: "/img/adhishtam.jpg",
    href: "https://adhishtam.com",
    color: "#2f9e6e",
    index: "05",
  },
  {
    title: "Shobha Digital Studio",
    type: "Photography studio",
    image: "/img/shobhadigital.jpg",
    href: "https://shobhadigitalstudio.in",
    color: "#c9a227",
    index: "06",
  },
  {
    title: "Belvai Temple",
    type: "Heritage temple site",
    image: "/img/belvaitemple.jpg",
    href: "https://belvaitemple.in",
    color: "#d97706",
    index: "07",
  },
  {
    title: "Shivam Digital",
    type: "Photography experience",
    image: "/img/img_1.jpg",
    href: "https://shivamdigital.vercel.app",
    color: "#8b5cf6",
    index: "08",
  },
  {
    title: "Ocean Pearl",
    type: "Hospitality website",
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
    key: 'lang',
    name: 'Languages',
    items: ['TypeScript', 'JavaScript', 'C#', 'Python', 'Java', 'SQL', 'HTML', 'CSS', 'GLSL'],
  },
  {
    key: 'front',
    name: 'Frontend',
    items: ['React', 'Next.js', 'Angular', 'Astro', 'Tailwind CSS', 'Radix UI', 'SCSS', 'Vite'],
  },
  {
    key: 'motion',
    name: '3D & Motion',
    items: ['Three.js', 'React Three Fiber', 'Drei', 'Framer Motion', 'Shaders', 'OGL', 'Lenis'],
  },
  {
    key: 'back',
    name: 'Backend & Data',
    items: ['Node.js', 'Express', '.NET Core', 'Supabase', 'PostgreSQL', 'SQL Server', 'REST APIs', 'GraphQL', 'WebSockets', 'RabbitMQ'],
  },
  {
    key: 'ops',
    name: 'Tooling & Delivery',
    items: ['Git', 'Vercel', 'AWS Lightsail', 'Nginx', 'PM2', 'Vitest', 'Zod', 'TanStack Query', 'Zustand'],
  },
];

// Flat list for the marquee.
export const skills = skillGroups.flatMap((g) => g.items);



