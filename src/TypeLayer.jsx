import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import * as THREE from "three";
import { fx } from "./fx";

// Every word on the page is particles. The headline and the About heading
// are already drawn by the big cloud (Scene.jsx); this layer draws all the
// rest — labels, paragraphs, buttons, the nav, the cards, the constellation,
// the footer — as dots of their own colour, sitting exactly where the
// browser laid the words out.
//
// The real text stays in the page, transparent (html.gl-type), so links,
// focus, selection, screen readers and the layout itself all keep working.
// Each run of text is a block: it is rasterised once, in its own font,
// relative to its element's untransformed box, and the lit pixels become
// particles. Every frame each block's element is measured and its box (and
// clip, opacity, focus) written to a small float texture, which the vertex
// shader reads by block index — so the particles ride along with whatever
// scrolls, slides, tilts, scales or fades the element.
//
// It is its own transparent canvas above the page, because the text sits on
// glass, cards and buttons that would hide or blur anything drawn beneath
// them. The header slab and an open project card mask what passes under them.

const PER_ROW = 64;
const TEXELS = 4;
const SKIP = ".intro, .sr-only, .skip-link, script, style, noscript, svg, .progress-ring";

const VERT = /* glsl */ `
  precision highp float;
  precision highp sampler2D;
  attribute vec2 aLocal;   // px inside the block's untransformed box
  attribute float aBlock;
  attribute vec3 aColor;
  attribute vec4 aSeed;    // x stagger, y size jitter, z phase, w spare
  attribute float aSize;   // css px
  uniform sampler2D uBlocks;
  uniform vec2 uView;
  uniform float uDpr;
  uniform float uTime;
  uniform float uShow;
  uniform vec2 uTilt;
  uniform vec3 uMouse;     // px, amount
  uniform vec4 uWave;      // x, y px, age s, amp
  uniform float uWaveSpeed;
  uniform float uNovaAge;
  uniform float uCalm;     // reduced motion: 1
  uniform vec3 uAccent;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vScreen;
  varying vec4 vClip;
  varying float vMask;
  varying float vPt;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    int b = int(aBlock + 0.5);
    ivec2 base = ivec2((b - (b / ${PER_ROW}) * ${PER_ROW}) * ${TEXELS}, b / ${PER_ROW});
    vec4 t0 = texelFetch(uBlocks, base, 0);                 // left, top, sx, sy
    vec4 t1 = texelFetch(uBlocks, base + ivec2(1, 0), 0);   // alpha, clip l, t, r
    vec4 t2 = texelFetch(uBlocks, base + ivec2(2, 0), 0);   // clip b, reveal, mask, focus
    vec4 t3 = texelFetch(uBlocks, base + ivec2(3, 0), 0);   // w0, h0
    float seed = aSeed.z;

    vec2 sp = t0.xy + aLocal * t0.zw;
    vec2 c = t0.xy + t3.xy * 0.5 * t0.zw;

    // Assembles as it comes into view, a sweep from the left of each block,
    // out of a cloud hanging in front of the page.
    float sweep = clamp(t3.x > 0.0 ? aLocal.x / t3.x : 0.0, 0.0, 1.0);
    float r = min(t2.y, uShow);
    r = clamp(r * 1.7 - sweep * 0.45 - aSeed.x * 0.25, 0.0, 1.0);
    r = 1.0 - pow(1.0 - r, 3.0);
    vec3 scatter = vec3((hash(seed * 13.1) - 0.5) * 220.0, (hash(seed * 7.3 + 1.0) - 0.5) * 160.0 + 50.0, 260.0 + hash(seed * 3.9) * 520.0);

    // Leans toward the pointer: depth across the block, so it reads as a
    // sheet turning in space. A breath of movement in every dot.
    float z = ((sp.x - c.x) * uTilt.x - (sp.y - c.y) * uTilt.y) * 0.09;
    vec3 P = vec3(sp, z);
    P.xy += vec2(sin(uTime * 1.3 + seed * 40.0), cos(uTime * 1.1 + seed * 31.0)) * 0.22 * (1.0 - uCalm);
    P += scatter * (1.0 - r);

    // The pointer parts the dots and lifts them toward you.
    vec2 dm = P.xy - uMouse.xy;
    float f = exp(-dot(dm, dm) / 3600.0) * uMouse.z;
    P.xy += normalize(dm + 1e-4) * f * 9.0;
    P.z += f * 50.0;

    // Click shockwave and supernova, as in the cloud.
    float glow = 0.0;
    if (uWave.z < 3.0) {
      vec2 dw = P.xy - uWave.xy;
      float dd = length(dw);
      glow = exp(-pow((dd - uWave.z * uWaveSpeed) / 60.0, 2.0)) * uWave.w * (1.0 - uWave.z / 3.0);
      P.xy += dw / (dd + 1e-3) * glow * 14.0;
      P.z += glow * 90.0;
    }
    if (uNovaAge < 5.0) {
      float back = 1.0 - smoothstep(1.0, 3.8, uNovaAge - aSeed.x * 0.7);
      float nova = (1.0 - exp(-uNovaAge * 8.0)) * back;
      vec3 nd = normalize(vec3(hash(seed * 71.3) - 0.5, hash(seed * 19.7 + 2.0) - 0.5, hash(seed * 43.1 + 6.0) - 0.2));
      P += nd * nova * (160.0 + hash(seed * 8.3) * 900.0);
    }

    // A camera 1100 px in front of the page.
    float k = 1100.0 / max(1100.0 - P.z, 60.0);
    vec2 proj = uView * 0.5 + (P.xy - uView * 0.5) * k;
    gl_Position = vec4(proj.x / uView.x * 2.0 - 1.0, 1.0 - proj.y / uView.y * 2.0, 0.0, 1.0);
    gl_PointSize = aSize * (0.85 + aSeed.y * 0.3) * uDpr * min(k, 6.0);
    vPt = gl_PointSize;

    vColor = mix(aColor, uAccent, t2.w);
    vAlpha = t1.x * mix(0.0, 1.0, r) * (1.0 + glow * 0.5) * mix(1.0, 1.35, t2.w);
    vScreen = proj;
    vClip = vec4(t1.yzw, t2.x);
    vMask = t2.z;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec4 uOcc0;   // header slab
  uniform vec4 uOcc1;   // open project card
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vScreen;
  varying vec4 vClip;
  varying float vMask;
  varying float vPt;
  bool inside(vec2 p, vec4 r) { return p.x > r.x && p.y > r.y && p.x < r.z && p.y < r.w; }
  void main() {
    if (vAlpha < 0.004) discard;
    if (!inside(vScreen, vClip)) discard;
    int m = int(vMask + 0.5);
    if ((m & 1) == 1 && inside(vScreen, uOcc0)) discard;
    if ((m & 2) == 2 && inside(vScreen, uOcc1)) discard;
    // Dots of a pixel or two are drawn solid, so small type stays crisp;
    // bigger ones are soft discs.
    float a = 1.0;
    if (vPt > 2.5) {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      a = smoothstep(0.5, 0.5 - min(0.32, 1.2 / vPt), d);
    }
    gl_FragColor = vec4(vColor, a * min(vAlpha, 1.0));
    #include <colorspace_fragment>
  }
`;

// --- sampling -------------------------------------------------------------

// Distance from the top of a run of text's box (as Range rects report it) to
// its baseline, for one font: read from the layout, because canvas font
// metrics disagree with CSS for some faces.
const baselines = new Map();
let probe = null;
function baselineOffset(font) {
  if (baselines.has(font)) return baselines.get(font);
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap";
    document.body.appendChild(probe);
  }
  probe.innerHTML = "";
  const span = document.createElement("span");
  span.style.font = font;
  span.textContent = "Hg";
  const marker = document.createElement("span");
  marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  span.appendChild(marker);
  probe.appendChild(span);
  const range = document.createRange();
  range.selectNodeContents(span.firstChild);
  const off = marker.getBoundingClientRect().top - range.getBoundingClientRect().top;
  baselines.set(font, off);
  return off;
}

function textRoots() {
  const html = document.documentElement;
  const roots = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      // Already drawn by the cloud.
      if (html.classList.contains("gl-text") && p.closest(".hero h1")) return NodeFilter.FILTER_REJECT;
      if (html.classList.contains("gl-about") && p.closest("#about .section-heading h2")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const p = node.parentElement;
    // A scrubbed heading is one block, not a block per letter.
    const root = p.closest(".scrub") || p;
    if (!roots.has(root)) roots.set(root, []);
    roots.get(root).push(node);
  }
  return roots;
}

function clipperOf(el) {
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") return a;
  }
  return null;
}

const S = 2; // raster scale

// Rasterises one block: every word drawn at its place inside the element's
// untransformed box, in its own font and colour. Returns the lit pixels.
function rasterise(root, nodes) {
  const rect = root.getBoundingClientRect();
  const w0 = root.offsetWidth;
  const h0 = root.offsetHeight;
  if (!w0 || !h0 || !rect.width || !rect.height) return null;
  const sx = rect.width / w0;
  const sy = rect.height / h0;
  const pad = 40;
  const cw = Math.ceil((w0 + pad * 2) * S);
  const ch = Math.ceil((h0 + pad * 2) * S);
  if (cw * ch > 16e6) return null;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const range = document.createRange();
  let fontPx = 0;
  let words = 0;
  for (const node of nodes) {
    const el = node.parentElement;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    fontPx = Math.max(fontPx, size);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const base = baselineOffset(font);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size * S}px ${cs.fontFamily}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * S}px`;
    // Outlined type (the big card numbers) is filled in its outline colour;
    // the shader lights it with the card's focus.
    const clear = /rgba\(.*,\s*0\)$|transparent/.test(cs.color);
    ctx.fillStyle = clear ? cs.webkitTextStrokeColor || cs.color : cs.color;
    const upper = cs.textTransform === "uppercase";
    const text = node.nodeValue;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || !r.width) continue;
      const word = upper ? m[0].toUpperCase() : m[0];
      const x = (r.left - rect.left) / sx;
      const y = (r.top - rect.top) / sy + base;
      const mw = ctx.measureText(word).width / S;
      const target = r.width / sx;
      ctx.save();
      ctx.translate((x + pad) * S, (y + pad) * S);
      ctx.scale(mw > 0 ? Math.min(1.2, Math.max(0.8, target / mw)) : 1, 1);
      ctx.fillText(word, 0, 0);
      ctx.restore();
      words++;
    }
  }
  if (!words) return null;
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const lit = [];
  for (let i = 0, k = 0; i < data.length; i += 4, k++) {
    const a = data[i + 3];
    if (a > 110) {
      lit.push(
        (k % cw) / S - pad, Math.floor(k / cw) / S - pad,
        data[i] / a, data[i + 1] / a, data[i + 2] / a,
      );
    }
  }
  if (!lit.length) return null;
  return { lit: new Float32Array(lit), w0, h0, fontPx };
}

// Dot size and density by type size: small type wants small, dense dots to
// stay legible; large type reads as particles with bigger, sparser ones.
function dotFor(fontPx) {
  const size = Math.min(3, Math.max(1.15, fontPx * 0.05));
  const coverage = fontPx < 24 ? 2.2 : 2.4;
  return { size, density: coverage / (size * size) };
}

// --- the layer --------------------------------------------------------------

function Layer({ revealed, lite, reduced }) {
  const { gl, size } = useThree();
  const budget = lite ? 170000 : 300000;
  const cache = useRef(new Map());
  const blocks = useRef([]);
  // The geometry is swapped whole on a rebuild; the old one is disposed.
  const [geometry, setGeometryState] = useState(null);
  const geomRef = useRef(null);
  const setGeometry = useCallback((g) => {
    geomRef.current?.dispose();
    geomRef.current = g;
    setGeometryState(g);
  }, []);
  useEffect(() => () => geomRef.current?.dispose(), []);
  const tex = useRef(null);

  const uniforms = useMemo(() => ({
    uBlocks: { value: null },
    uView: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uTime: { value: 0 },
    uShow: { value: 0 },
    uTilt: { value: new THREE.Vector2() },
    uMouse: { value: new THREE.Vector3(-999, -999, 0) },
    uWave: { value: new THREE.Vector4(0, 0, 99, 0) },
    uWaveSpeed: { value: 900 },
    uNovaAge: { value: 99 },
    uCalm: { value: reduced ? 1 : 0 },
    uAccent: { value: new THREE.Color("#ff6a2b") },
    uOcc0: { value: new THREE.Vector4(0, 0, 0, 0) },
    uOcc1: { value: new THREE.Vector4(0, 0, 0, 0) },
  }), [reduced]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms,
    transparent: true, depthWrite: false, depthTest: false,
  }), [uniforms]);
  useEffect(() => () => material.dispose(), [material]);

  // Build (or rebuild) the particles from the page's text. Blocks whose text,
  // font, colour and size are unchanged reuse their raster.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const build = async () => {
      try { await document.fonts.ready; } catch { /* draw with what loaded */ }
      if (cancelled) return;
      // Letters are sampled at rest, not mid-animation.
      document.documentElement.classList.add("pt-rest");
      const roots = textRoots();
      const seen = new Map();
      const list = [];
      for (const [root, nodes] of roots) {
        const cs = getComputedStyle(root);
        // Sampled mid-animation (a card flipping open) the words come out
        // squeezed, so the scale it was sampled at is part of the key.
        const box = root.getBoundingClientRect();
        const squeeze = root.offsetWidth ? `${Math.round((box.width / root.offsetWidth) * 10)}:${Math.round((box.height / (root.offsetHeight || 1)) * 10)}` : "";
        const key = [nodes.map((n) => n.nodeValue).join("|"), root.offsetWidth, root.offsetHeight, cs.font, cs.color, cs.letterSpacing, squeeze].join("~");
        let entry = cache.current.get(root);
        if (!entry || entry.key !== key) {
          const r = rasterise(root, nodes);
          entry = { key, r };
        }
        seen.set(root, entry);
        if (entry.r) list.push({ root, r: entry.r });
      }
      cache.current = seen;
      document.documentElement.classList.remove("pt-rest");

      // Particle counts, scaled down together if the page asks for more than
      // the budget.
      let want = 0;
      for (const b of list) {
        const d = dotFor(b.r.fontPx);
        b.dot = d;
        b.n = Math.round((b.r.lit.length / 5 / (S * S)) * d.density);
        want += b.n;
      }
      const scale = want > budget ? budget / want : 1;
      let total = 0;
      for (const b of list) { b.n = Math.max(1, Math.round(b.n * scale)); total += b.n; }

      const local = new Float32Array(total * 2);
      const block = new Float32Array(total);
      const color = new Float32Array(total * 3);
      const seed = new Float32Array(total * 4);
      const sizeA = new Float32Array(total);
      let o = 0;
      const html = document.documentElement;
      list.forEach((b, bi) => {
        const lit = b.r.lit;
        const count = lit.length / 5;
        const dotSize = b.dot.size / Math.sqrt(scale);
        for (let i = 0; i < b.n; i++, o++) {
          const j = Math.floor(Math.random() * count) * 5;
          local[o * 2] = lit[j] + Math.random() / S;
          local[o * 2 + 1] = lit[j + 1] + Math.random() / S;
          block[o] = bi;
          color[o * 3] = lit[j + 2];
          color[o * 3 + 1] = lit[j + 3];
          color[o * 3 + 2] = lit[j + 4];
          seed.set([Math.random(), Math.random(), Math.random(), 0], o * 4);
          sizeA[o] = dotSize;
        }
        b.root.setAttribute("data-pt", "");
        b.header = !!b.root.closest(".nav-shell");
        b.card = !!b.root.closest(".star-card");
        b.clip = clipperOf(b.root);
        b.focus = b.root.closest(".rail-card, .unfold") && b.root.classList.contains("service-num") ? b.root.closest(".rail-card, .unfold") : null;
        // Opacity comes from the element and every ancestor up to the body.
        const chain = [];
        for (let a = b.root; a && a !== document.body; a = a.parentElement) chain.push(a);
        b.chain = chain;
      });
      if (cancelled) return;
      // Text already on screen stays formed across a rebuild.
      const before = new Map(blocks.current.map((b) => [b.root, b.seenAt]));
      for (const b of list) b.seenAt = before.get(b.root) ?? null;
      blocks.current = list;

      const rows = Math.max(1, Math.ceil(list.length / PER_ROW));
      const data = new Float32Array(PER_ROW * TEXELS * rows * 4);
      const t = new THREE.DataTexture(data, PER_ROW * TEXELS, rows, THREE.RGBAFormat, THREE.FloatType);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.needsUpdate = true;
      tex.current?.dispose();
      tex.current = t;
      uniforms.uBlocks.value = t;

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
      g.setAttribute("aLocal", new THREE.BufferAttribute(local, 2));
      g.setAttribute("aBlock", new THREE.BufferAttribute(block, 1));
      g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      g.setAttribute("aSize", new THREE.BufferAttribute(sizeA, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
      setGeometry(g);
      html.classList.add("gl-type");
      window.__rvType = { blocks: list.length, particles: total };
    };
    // After a change, build now and once more when entrance animations have
    // settled.
    let settle = 0;
    const soon = (ms = 160) => {
      clearTimeout(timer);
      clearTimeout(settle);
      timer = setTimeout(build, ms);
      settle = setTimeout(build, ms + 1700);
    };
    soon(0);
    // New text (a card opening, the phone menu), a theme switch, a resize.
    // (The baseline probe's own churn is ignored.)
    const mo = new MutationObserver((records) => {
      if (records.some((r) => !(probe && (r.target === probe || probe.contains(r.target))))) soon();
    });
    mo.observe(document.body, { childList: true, characterData: true, subtree: true });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // The cloud takes over the headline once it has sampled it.
    const ready = () => soon(0);
    window.addEventListener("rv:scene-ready", ready);
    window.addEventListener("resize", soon);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(settle);
      mo.disconnect();
      window.removeEventListener("rv:scene-ready", ready);
      window.removeEventListener("resize", soon);
      document.documentElement.classList.remove("gl-type");
    };
  }, [budget, uniforms, setGeometry]);

  // Pointer, supernova.
  const st = useRef({ mx: -999, my: -999, mouse: 0, active: false, tx: 0, ty: 0, novaAt: -1e9, show: 0 });
  useEffect(() => {
    const move = (e) => {
      const s = st.current;
      s.mx = e.clientX;
      s.my = e.clientY;
      s.active = e.pointerType === "mouse";
    };
    const out = (e) => { if (!e.relatedTarget) st.current.active = false; };
    const nova = () => { st.current.novaAt = performance.now(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mouseout", out);
    window.addEventListener("rv:nova", nova);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseout", out);
      window.removeEventListener("rv:nova", nova);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = st.current;
    const vw = size.width;
    const vh = size.height;
    const now = performance.now();
    uniforms.uView.value.set(vw, vh);
    uniforms.uDpr.value = gl.getPixelRatio();
    if (!reduced) uniforms.uTime.value += dt;
    s.show += ((revealed ? 1 : 0) - s.show) * Math.min(1, dt * (reduced ? 99 : 1.4));
    uniforms.uShow.value = s.show;

    s.mouse += ((s.active && !reduced ? 1 : 0) - s.mouse) * Math.min(1, dt * 3);
    uniforms.uMouse.value.set(s.mx, s.my, s.mouse);
    // Lean toward the pointer, or the phone's tilt.
    const g = fx.gyro;
    const lx = s.active ? (s.mx / vw - 0.5) * 2 : g.active ? g.x : 0;
    const ly = s.active ? -(s.my / vh - 0.5) * 2 : g.active ? g.y : 0;
    s.tx += ((reduced ? 0 : lx) - s.tx) * Math.min(1, dt * 2.5);
    s.ty += ((reduced ? 0 : ly) - s.ty) * Math.min(1, dt * 2.5);
    uniforms.uTilt.value.set(s.tx, s.ty);

    const w = fx.wave;
    uniforms.uWave.value.set(w.x, w.y, reduced ? 99 : (now - w.at) / 1000, w.amp);
    uniforms.uWaveSpeed.value = w.speed * 100;
    uniforms.uNovaAge.value = reduced ? 99 : (now - s.novaAt) / 1000;

    // The header slab, and a project card, hide what passes beneath them.
    const header = document.querySelector(".nav-shell");
    const o0 = uniforms.uOcc0.value;
    if (header?.classList.contains("open")) o0.set(-1, -1, vw + 1, vh + 1);
    else if (header?.classList.contains("scrolled")) {
      const r = header.getBoundingClientRect();
      o0.set(r.left, r.top, r.right, r.bottom);
    } else o0.set(0, 0, 0, 0);
    const card = document.querySelector(".star-card");
    const o1 = uniforms.uOcc1.value;
    if (card) { const r = card.getBoundingClientRect(); o1.set(r.left, r.top, r.right, r.bottom); } else o1.set(0, 0, 0, 0);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (accent && accent !== s.accent) { s.accent = accent; uniforms.uAccent.value.set(accent); }

    const t = tex.current;
    const list = blocks.current;
    if (!t || !list.length) return;
    const data = t.image.data;
    const opacity = new Map();
    const opOf = (el) => {
      let v = opacity.get(el);
      if (v === undefined) {
        const cs = getComputedStyle(el);
        v = cs.visibility === "hidden" ? 0 : parseFloat(cs.opacity);
        opacity.set(el, v);
      }
      return v;
    };
    const clips = new Map();
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const o = ((Math.floor(i / PER_ROW) * PER_ROW * TEXELS) + (i % PER_ROW) * TEXELS) * 4;
      const el = b.root;
      if (!el.isConnected) { data[o + 4] = 0; continue; }
      const r = el.getBoundingClientRect();
      const visible = r.bottom > -200 && r.top < vh + 200 && r.right > -200 && r.left < vw + 200 && r.width > 0;
      let alpha = 0;
      if (visible) {
        alpha = 1;
        for (const a of b.chain) { alpha *= opOf(a); if (alpha < 0.003) break; }
      }
      data[o] = r.left;
      data[o + 1] = r.top;
      data[o + 2] = r.width / b.r.w0;
      data[o + 3] = r.height / b.r.h0;
      data[o + 4] = alpha;
      let cr = null;
      if (b.clip) {
        cr = clips.get(b.clip);
        if (!cr) { cr = b.clip.getBoundingClientRect(); clips.set(b.clip, cr); }
      }
      data[o + 5] = cr ? cr.left : -1e5;
      data[o + 6] = cr ? cr.top : -1e5;
      data[o + 7] = cr ? cr.right : 1e5;
      data[o + 8] = cr ? cr.bottom : 1e5;
      // Gathers over a second from the moment it is first seen, and lets go
      // again once it is well off screen, to gather afresh next time.
      const inView = r.top < vh * 0.94 && r.bottom > vh * 0.04 && alpha > 0.02;
      if (inView && b.seenAt == null) b.seenAt = now;
      else if (!visible) b.seenAt = null;
      data[o + 9] = reduced ? 1 : b.seenAt == null ? 0 : Math.min(1, (now - b.seenAt) / 1100);
      data[o + 10] = (b.header ? 0 : 1) + (b.card ? 0 : 2);
      data[o + 11] = b.focus ? Math.min(1, parseFloat(b.focus.style.getPropertyValue("--focus")) || 0) : 0;
      data[o + 12] = b.r.w0;
      data[o + 13] = b.r.h0;
    }
    t.needsUpdate = true;
  });

  return geometry ? <points geometry={geometry} material={material} frustumCulled={false} /> : null;
}

class Guard extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.classList.remove("gl-type"); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function TypeLayer({ revealed }) {
  const lite = useMemo(
    () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720),
    [],
  );
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  return (
    <div className="type-layer" aria-hidden="true">
      <Guard>
        <Canvas
          orthographic
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Layer revealed={revealed} lite={lite} reduced={reduced} />
        </Canvas>
      </Guard>
    </div>
  );
}
