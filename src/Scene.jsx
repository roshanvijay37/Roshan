import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThemeName } from "./components";

// One cloud of particles that becomes the page. It assembles into the hero
// headline (sampled from the real DOM type, so it sits exactly where the words
// are), tears apart into a spiral galaxy behind the About cards, collapses
// into a strange attractor through the capabilities, and falls into a black
// hole under "Let's give it gravity." Every form is a position the vertex
// shader can compute; scroll decides how far each particle has travelled
// between them.
const PALETTE = {
  dark: {
    bg: "#050507", base: "#f3eee6", accent: "#ff6a2b", cool: "#7f9cff", hot: "#fff3d6",
    alpha: 0.62, blending: THREE.AdditiveBlending,
  },
  light: {
    bg: "#ecebe6", base: "#121216", accent: "#d43d0f", cool: "#2b3fd1", hot: "#3a1606",
    alpha: 0.7, blending: THREE.NormalBlending,
  },
};

const CAM_Z = 10;
// Fraction of each chapter a form holds before it starts to change.
const HOLD = [0, 0.72, 0.78];
const FOV = 40;

const VERT = /* glsl */ `
  attribute vec3 aText;
  attribute vec3 aGalaxy;
  attribute vec3 aAttr;
  attribute vec3 aAttrDir;
  attribute vec3 aHole;
  attribute vec4 aRand;   // x: stagger, y: size, z: phase, w: text accent flag
  uniform float uTime;
  uniform float uIntro;
  uniform float uMorph;
  uniform float uTextShift;
  uniform float uViewW;
  uniform float uTurb;
  uniform vec3 uMouse;
  uniform float uMouseAmt;
  uniform float uPx;
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uCool;
  uniform vec3 uHot;
  uniform float uAttrSpin;
  uniform float uFormScale;
  varying vec3 vColor;
  varying float vAlpha;

  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }

  vec3 swirl(vec3 p, float seed) {
    return vec3(
      sin(p.y * 0.9 + seed * 12.0 + uTime * 0.9),
      sin(p.z * 0.8 + seed * 7.0 + uTime * 1.1),
      cos(p.x * 0.7 + seed * 9.0 + uTime * 0.7)
    );
  }

  void main() {
    float seed = aRand.z;

    // --- form 0: the headline, drifting up with the page
    vec3 scatter = normalize(vec3(sin(seed * 91.0), cos(seed * 47.0), sin(seed * 23.0) * 0.6)) * (9.0 + seed * 9.0);
    float sweep = clamp(uIntro * 1.7 - (aText.x / uViewW + 0.5) * 0.55 - aRand.x * 0.25, 0.0, 1.0);
    sweep = 1.0 - pow(1.0 - sweep, 3.0);
    vec3 text = aText + vec3(0.0, uTextShift, 0.0);
    text += swirl(aText * 3.0, seed) * 0.012;
    vec3 f0 = mix(scatter, text, sweep);
    vec3 c0 = mix(uBase, uAccent, aRand.w);
    // One particle in nine stays out of the type as dust hanging in depth
    // behind it, drifting up slowly.
    float dust = step(0.89, fract(seed * 57.0));
    vec3 dp = vec3(
      (fract(seed * 13.0) - 0.5) * 30.0,
      fract(fract(seed * 29.0) + uTime * 0.006) * 18.0 - 9.0,
      -2.0 - fract(seed * 7.0) * 16.0
    );
    f0 = mix(f0, mix(scatter, dp, sweep), dust);
    c0 = mix(c0, mix(uCool, uBase, fract(seed * 3.0)), dust);

    // --- form 1: a three-armed galaxy, turning
    float gr = aGalaxy.x;
    float ga = aGalaxy.y + uTime * 0.22 / (0.5 + gr * 0.35);
    vec3 f1 = rotX(-1.08) * vec3(gr * cos(ga), aGalaxy.z, gr * sin(ga)) * uFormScale + vec3(0.4 * uFormScale, -0.2, -3.0);
    vec3 c1 = mix(uHot, uCool, smoothstep(0.0, 5.5, gr));
    c1 = mix(c1, uAccent, step(0.93, fract(seed * 13.0)) * 0.8);

    // --- form 2: the Aizawa attractor, its points shimmering along the flow
    vec3 ap = aAttr + aAttrDir * sin(uTime * 2.0 + seed * 6.283) * 0.07;
    vec3 f2 = rotX(0.45) * rotY(uTime * 0.16 + uAttrSpin) * ap * uFormScale + vec3(0.0, -0.25, -1.0);
    vec3 c2 = mix(uAccent, uCool, smoothstep(-1.4, 1.6, aAttr.y));

    // --- form 3: a black hole. Disk particles spiral in and are replaced at
    // the rim; the rest trace the lensed arc of the far side of the disk.
    vec3 f3;
    vec3 c3;
    float fall = fract(aHole.x - uTime * 0.035);
    float ringAlpha = 1.0;
    if (aHole.z < 0.8) {
      float r = mix(1.35, 7.5, pow(fall, 1.8));
      float a = aHole.y + uTime * 2.6 * pow(r, -1.5);
      vec3 d = vec3(r * cos(a), (fract(seed * 31.0) - 0.5) * 0.03 * r, r * sin(a));
      // Seen almost edge-on, tipped just enough to read as a disk.
      f3 = rotX(0.2) * d;
      float beam = 1.0 + 0.6 * cos(a);    // the side coming toward you is brighter
      c3 = mix(uHot, uAccent, smoothstep(1.4, 4.8, r)) * beam;
    } else {
      // The far side of the disk, bent over and under the shadow by the
      // hole's gravity: a ring standing up behind it.
      float r = mix(1.36, 1.9, pow(fract(seed * 17.0), 3.0));
      float a = aHole.y + uTime * 0.5;
      f3 = vec3(r * cos(a), r * sin(a), -0.4);
      c3 = mix(uHot, uAccent, smoothstep(1.36, 1.9, r));
      ringAlpha = 0.85;
    }
    f3 = f3 * 1.8 * uFormScale + vec3(0.0, -0.35, -1.5);

    // --- travel between forms, each particle on its own schedule, flung
    // outward along a swirl while it is in flight
    float m = clamp(uMorph, 0.0, 3.0);
    float seg = min(floor(m), 2.0);
    float t = clamp((m - seg) * 1.35 - aRand.x * 0.35, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 a0 = seg < 0.5 ? f0 : (seg < 1.5 ? f1 : f2);
    vec3 a1 = seg < 0.5 ? f1 : (seg < 1.5 ? f2 : f3);
    vec3 ca = seg < 0.5 ? c0 : (seg < 1.5 ? c1 : c2);
    vec3 cb = seg < 0.5 ? c1 : (seg < 1.5 ? c2 : c3);
    vec3 p = mix(a0, a1, t);
    float flight = sin(3.14159 * t);
    p += swirl(p, seed) * (flight * 1.5 + uTurb);
    vColor = mix(ca, cb, t);

    // --- the pointer parts the cloud
    vec3 dm = p - uMouse;
    float fall2 = exp(-dot(dm.xy, dm.xy) * 1.1) * uMouseAmt;
    p.xy += normalize(dm.xy + 1e-4) * fall2 * 0.9;
    p.z += fall2 * 1.2;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float formSize = seg < 0.5 ? mix(1.0, 1.25, t) : 1.25;
    gl_PointSize = uPx * (0.55 + aRand.y) * formSize * (${CAM_Z.toFixed(1)} / -mv.z);
    vAlpha = mix(0.35, 1.0, sweep) * (0.7 + 0.3 * aRand.y) + fall2 * 0.5;
    if (seg < 0.5) vAlpha *= mix(1.0, 0.45, dust * (1.0 - t));
    // Disk particles fade in at the rim and out at the horizon.
    vAlpha *= mix(1.0, 0.72, seg < 0.5 ? 0.0 : (seg < 1.5 ? t : 1.0 - t));
    if (seg > 1.5) vAlpha *= mix(1.0, aHole.z < 0.8 ? smoothstep(0.0, 0.06, fall) * smoothstep(1.0, 0.6, fall) : ringAlpha, t);
  }
`;

const FRAG = /* glsl */ `
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, soft * uAlpha * vAlpha);
    #include <colorspace_fragment>
  }
`;

function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
}

// Static forms, computed once per particle count.
function buildForms(n) {
  const galaxy = new Float32Array(n * 3);
  const attr = new Float32Array(n * 3);
  const attrDir = new Float32Array(n * 3);
  const hole = new Float32Array(n * 3);
  const rand = new Float32Array(n * 4);

  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 0.75) * 6.6 + 0.12;
    const arm = Math.floor(Math.random() * 3);
    const spread = gauss() * (0.9 / (r * 0.55 + 1));
    galaxy.set([r, arm * (Math.PI * 2 / 3) + r * 0.95 + spread, gauss() * 0.22 * (1 - r / 7.5)], i * 3);
    hole.set([Math.random(), Math.random() * Math.PI * 2, Math.random()], i * 3);
    rand.set([Math.random(), Math.random(), Math.random(), 0], i * 4);
  }

  // Aizawa: one long trajectory, a point kept every step.
  let x = 0.1, y = 0, z = 0;
  const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1, dt = 0.009;
  const step = () => {
    const dx = (z - b) * x - d * y;
    const dy = d * x + (z - b) * y;
    const dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
    x += dx * dt; y += dy * dt; z += dz * dt;
    return [dx, dy, dz];
  };
  for (let i = 0; i < 2000; i++) step();
  const S = 2.35;
  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = step();
    // The attractor's axis is z; stand it up so it reads as a vortex.
    attr.set([x * S, (z - 0.55) * S, y * S], i * 3);
    const len = Math.hypot(dx, dy, dz) || 1;
    attrDir.set([dx / len, dz / len, dy / len], i * 3);
  }
  return { galaxy, attr, attrDir, hole, rand };
}

// Samples the hero headline exactly as the browser laid it out: every word is
// drawn into a canvas at its own on-screen box, in its own font, and the lit
// pixels become particle targets on the z = 0 plane.
function sampleHeadline(n, view) {
  const h1 = document.querySelector(".hero h1");
  if (!h1) return null;
  const words = [...h1.querySelectorAll(".hword")];
  const box = h1.getBoundingClientRect();
  if (!words.length || box.width < 10) return null;
  const S = 2;
  const cw = Math.ceil(box.width * S);
  const ch = Math.ceil(box.height * S);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  for (const w of words) {
    const cs = getComputedStyle(w);
    const r = w.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const text = w.textContent;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * S}px ${cs.fontFamily}`;
    ctx.fillStyle = w.classList.contains("accent") ? "#00ff00" : "#ff0000";
    ctx.textBaseline = "alphabetic";
    const m = ctx.measureText(text);
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    const x0 = (r.left - box.left + pl) * S;
    const innerH = (r.height - pt - pb) * S;
    const cy = (r.top - box.top + pt) * S + innerH / 2;
    const targetW = (r.width - pl - pr) * S;
    ctx.save();
    ctx.translate(x0, cy + (asc - desc) / 2);
    ctx.scale(m.width > 0 ? Math.min(1.15, targetW / m.width) : 1, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  const data = ctx.getImageData(0, 0, cw, ch).data;
  const lit = [];
  for (let yy = 0; yy < ch; yy++) {
    for (let xx = 0; xx < cw; xx++) {
      const k = (yy * cw + xx) * 4;
      if (data[k] > 120 || data[k + 1] > 120) lit.push(xx, yy, data[k + 1] > 120 ? 1 : 0);
    }
  }
  if (!lit.length) return null;

  const count = lit.length / 3;
  const pos = new Float32Array(n * 3);
  const accent = new Float32Array(n);
  const top = box.top + window.scrollY;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * count) * 3;
    const sx = box.left + (lit[j] + Math.random()) / S;
    const sy = top + (lit[j + 1] + Math.random()) / S;
    pos[i * 3] = (sx / view.w - 0.5) * view.worldW;
    pos[i * 3 + 1] = -(sy / view.h - 0.5) * view.worldH;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    accent[i] = lit[j + 2];
  }
  return { pos, accent };
}

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function key(j, values) {
  const i = Math.min(Math.floor(j), values.length - 2);
  const t = easeIO(Math.min(Math.max(j - i, 0), 1));
  return values[i] + (values[i + 1] - values[i]) * t;
}

function Cloud({ scroll, pointer, lite, reduced }) {
  const theme = useThemeName();
  const { gl, size, camera } = useThree();
  const n = lite ? 50000 : 130000;
  const forms = useMemo(() => buildForms(n), [n]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const text = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) text.set([(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, 0], i * 3);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aText", new THREE.BufferAttribute(text, 3));
    g.setAttribute("aGalaxy", new THREE.BufferAttribute(forms.galaxy, 3));
    g.setAttribute("aAttr", new THREE.BufferAttribute(forms.attr, 3));
    g.setAttribute("aAttrDir", new THREE.BufferAttribute(forms.attrDir, 3));
    g.setAttribute("aHole", new THREE.BufferAttribute(forms.hole, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(forms.rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [n, forms]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uMorph: { value: 0 },
    uTextShift: { value: 0 },
    uViewW: { value: 10 },
    uTurb: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseAmt: { value: 0 },
    uPx: { value: 2 },
    uAlpha: { value: 0.6 },
    uBase: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
    uCool: { value: new THREE.Color() },
    uHot: { value: new THREE.Color() },
    uAttrSpin: { value: 0 },
    uFormScale: { value: 1 },
  }), []);

  // Built here rather than as JSX: R3F copies a `uniforms` prop into a fresh
  // object, after which writes to ours never reach the shader.
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
  }), [uniforms]);
  useEffect(() => () => material.dispose(), [material]);

  const view = useRef({ w: 1, h: 1, worldW: 10, worldH: 6 });
  const ready = useRef(0);

  useEffect(() => {
    const p = PALETTE[theme];
    uniforms.uBase.value.set(p.base);
    uniforms.uAccent.value.set(p.accent);
    uniforms.uCool.value.set(p.cool);
    uniforms.uHot.value.set(p.hot);
    uniforms.uAlpha.value = p.alpha;
    gl.setClearColor(p.bg, 1);
    material.blending = p.blending;
    material.needsUpdate = true;
  }, [theme, uniforms, gl, material]);

  // Re-sample the headline whenever the layout changes size. Fonts first: a
  // sample taken in the fallback face would put the particles beside the type.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const sample = async () => {
      try {
        await Promise.all([
          document.fonts.load('700 100px "Inter Tight"'),
          document.fonts.load('italic 400 100px "Instrument Serif"'),
        ]);
        await document.fonts.ready;
      } catch { /* sample with whatever loaded */ }
      if (cancelled) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const worldH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
      view.current = { w: vw, h: vh, worldH, worldW: worldH * (vw / vh) };
      uniforms.uViewW.value = view.current.worldW;
      // Narrow screens get smaller forms so they sit behind the type, not over it.
      uniforms.uFormScale.value = Math.min(1, Math.max(0.55, (vw / vh) * 1.1));
      const result = sampleHeadline(n, view.current);
      if (!result) return;
      const attrText = geometry.getAttribute("aText");
      attrText.array.set(result.pos);
      attrText.needsUpdate = true;
      const r = geometry.getAttribute("aRand");
      for (let i = 0; i < n; i++) r.array[i * 4 + 3] = result.accent[i];
      r.needsUpdate = true;
      if (!ready.current) ready.current = performance.now();
      document.documentElement.classList.add("gl-text");
    };
    sample();
    const onResize = () => { clearTimeout(timer); timer = setTimeout(sample, 180); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      document.documentElement.classList.remove("gl-text");
    };
  }, [geometry, n, uniforms]);

  const s = useRef({ j: 0, turb: 0, mouse: 0, spin: 0 });
  useFrame((_, rawDt) => {
    // Smoothing tolerates a slow frame; animation time does not jump.
    const dt = Math.min(rawDt, 0.25);
    const st = s.current;
    if (!reduced) uniforms.uTime.value += Math.min(rawDt, 0.05);
    // Wall-clock, so the assembly takes the same time on a slow device
    // instead of crawling at its frame rate.
    if (ready.current) {
      uniforms.uIntro.value = reduced ? 1 : Math.min(1, (performance.now() - ready.current) / 2600);
    }

    st.j += (scroll.chapter - st.j) * Math.min(1, dt * 4);
    // Each form holds for most of its chapter and changes near the end of
    // it; a morph spread over the whole long pinned sections would leave the
    // cloud as a haze the entire time.
    const seg = Math.min(Math.floor(st.j), 2);
    const hold = HOLD[seg];
    uniforms.uMorph.value = seg + Math.min(1, Math.max(0, (st.j - seg - hold) / (1 - hold)));
    const v = view.current;
    uniforms.uTextShift.value = (scroll.y / v.h) * v.worldH;

    const speed = Math.abs(scroll.velocity);
    st.turb += (Math.min(speed * 0.012, 0.6) - st.turb) * Math.min(1, dt * 5);
    uniforms.uTurb.value = reduced ? 0 : st.turb;
    st.spin += scroll.velocity * 0.0009;
    uniforms.uAttrSpin.value = st.spin;

    const pt = pointer.current;
    uniforms.uMouse.value.set(pt.x * v.worldW / 2, pt.y * v.worldH / 2, 0);
    st.mouse += ((pt.active && !reduced ? 1 : 0) - st.mouse) * Math.min(1, dt * 3);
    uniforms.uMouseAmt.value = st.mouse;

    // Point size in device pixels, so density reads the same on any screen.
    uniforms.uPx.value = (lite ? 2.2 : 1.9) * gl.getPixelRatio();

    // A slow drift of the camera with the pointer: the forms are 3D and
    // should feel it. Kept small at the headline so the type stays registered.
    const reach = key(st.j, [0.18, 1.4, 1.6, 0.9]);
    camera.position.x += (pt.x * reach - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (pt.y * reach * 0.6 - camera.position.y) * Math.min(1, dt * 2);
    camera.position.z = CAM_Z;
    camera.lookAt(0, 0, -2 * Math.min(1, st.j));
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

// If WebGL is unavailable the DOM headline simply stays visible.
class Guard extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.classList.remove("gl-text"); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Scene({ pointer, scroll }) {
  const lite = useMemo(
    () => typeof window !== "undefined"
      && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720),
    [],
  );
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  return (
    <div className="scene" aria-hidden="true">
      <Guard>
        <Canvas
          camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 80 }}
          dpr={lite ? [1, 1.5] : [1, 2]}
          gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        >
          <Cloud scroll={scroll} pointer={pointer} lite={lite} reduced={reduced} />
        </Canvas>
      </Guard>
    </div>
  );
}
