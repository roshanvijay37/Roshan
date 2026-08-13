// One source of content for all four directions, so what changes between them
// is purely design — not what is being said.
window.SITE = {
  name: "Roshan Vijay",
  mono: "R",
  role: "Web developer — India",
  hero: ["I engineer", "ideas into", "impact."],
  intro:
    "I design and build web products for founders and small teams — from fast marketing sites to full applications with real users behind them.",
  services: [
    { n: "01", t: "Product builds", b: "Full applications with auth, data and real users behind them." },
    { n: "02", t: "Marketing sites", b: "Fast, motion-led sites for businesses that need to look considered." },
    { n: "03", t: "Systems & integrations", b: "APIs, realtime data and the plumbing that keeps a product honest." },
  ],
  projects: [
    { i: "01", t: "Chatu", type: "Voice-first social", href: "https://chatu.in",
      s: "Voice conversations with one stranger at a time, matched on shared interests, language and a trust score.",
      stack: ["Next.js", "TypeScript", "Supabase", "Realtime audio"], c: "#c2610c" },
    { i: "02", t: "Kateel Construction", type: "Site management platform", href: "https://kateel.in",
      s: "Mobile-first site management — drawings, progress photos and records, in the hands of people on the site.",
      stack: ["Next.js", "TypeScript", "Supabase", "Vercel"], c: "#2563eb" },
    { i: "03", t: "Adhishtam Digital", type: "Agency website", href: "https://adhishtam.com",
      s: "A dark, motion-led marketing site built around a full-screen preloader and scroll choreography.",
      stack: ["HTML", "CSS", "JavaScript", "GSAP"], c: "#2f9e6e" },
    { i: "04", t: "Shobha Digital Studio", type: "Photography studio", href: "https://shobhadigitalstudio.in",
      s: "A bilingual site for a photography studio in Belvai — weddings, temple festivals and Yakshagana.",
      stack: ["Astro", "Tailwind", "Lenis", "OGL"], c: "#c9a227" },
    { i: "05", t: "Belvai Temple", type: "Heritage site", href: "https://belvaitemple.in",
      s: "A heritage site for an 830-year-old Shiva temple, written entirely in Kannada for its community.",
      stack: ["HTML", "CSS", "JavaScript"], c: "#d97706" },
  ],
  skills: ["TypeScript","React","Next.js","Astro","Tailwind","Three.js","React Three Fiber",
           "Framer Motion","GLSL","Lenis","Node.js","Supabase","PostgreSQL",".NET Core","Vercel"],
  wa: "https://wa.me/917349495469",
};

// Shared scroll-reveal, so every direction animates in consistently.
window.reveal = (sel = "[data-r]") => {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.dataset.r = "in"; io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(sel).forEach((el) => io.observe(el));
};

// A back-link so you can hop between directions on a phone.
window.switcher = (current) => {
  const bar = document.createElement("div");
  bar.innerHTML =
    '<a href="/designs/">← all</a>' +
    ["1","2","3","4","5","6","7","8","9","10","11","12","13"].map((n) =>
      `<a href="/designs/d${n}.html"${n === current ? ' class="on"' : ""}>${n}</a>`).join("");
  // Thirteen entries no longer fit a phone, so the bar scrolls inside itself
  // rather than running off the screen and taking the last few with it.
  bar.style.cssText =
    "position:fixed;z-index:9999;left:50%;transform:translateX(-50%);bottom:14px;display:flex;gap:4px;" +
    "background:rgba(12,10,7,.92);backdrop-filter:blur(14px);padding:6px;border-radius:999px;" +
    "font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;" +
    "max-width:calc(100vw - 20px);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch";
  bar.querySelectorAll("a").forEach((a) => {
    // nowrap or "← all" breaks onto two lines and the pill grows a second row.
    a.style.cssText = "color:#c9bda3;text-decoration:none;padding:8px 11px;border-radius:999px;white-space:nowrap";
    if (a.classList.contains("on")) a.style.cssText += ";background:#e6c374;color:#171208";
  });
  document.body.appendChild(bar);
  const active = bar.querySelector("a.on");
  if (active) active.scrollIntoView({ block: "nearest", inline: "center" });
};
