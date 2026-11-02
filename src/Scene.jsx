import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThemeName } from "./components";
import { fx } from "./fx";

// One cloud of particles that becomes the page. It boots as a single point
// that bursts and condenses into the R of the intro, then assembles into the hero
// headline (sampled from the real DOM type, so it sits exactly where the words
// are), flies across to rebuild itself as the About heading and rides the
// rail with it, tears apart into a spiral galaxy behind the cards, collapses
// into a strange attractor through the capabilities (peeling off to spell each
// skill as it arrives), and falls into a black hole under "Let's give it
// gravity." that can be dragged and fed. Every form is a position the vertex
// shader can compute; scroll decides how far each particle has travelled
// between them, and while they are in flight the camera flies through the
// stream with them.
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
const FOV = 40;

const VERT = /* glsl */ `
  attribute vec3 aText;
  attribute vec4 aText2;  // About heading: xyz, w accent flag
  attribute vec3 aGalaxy;
  attribute vec3 aAttr;
  attribute vec3 aAttrDir;
  attribute vec3 aHole;
  attribute vec4 aRand;   // x: stagger, y: size, z: phase, w: text accent flag
  attribute vec3 aMark;   // the intro's R
  attribute vec4 aSk0;    // skill planes: xy offset from the plane's centre,
  attribute vec4 aSk1;    // z depth jitter, w accent flag
  attribute vec4 aSk2;
  uniform float uTime;
  uniform float uBoot;    // seconds since the cloud was born (or reborn)
  uniform float uIntro;
  uniform vec2 uWaveC;    // shockwave centre, world units
  uniform float uWaveAge;
  uniform float uWaveAmp;
  uniform float uWaveSpeed;
  uniform float uHoleT;   // the disk's own clock: runs faster while it feeds
  uniform vec2 uHoleRot;  // pitch, roll from a drag
  uniform float uFeed;
  uniform vec3 uSkAmt;    // how fully each skill plane is spelled out
  uniform vec2 uSkC0;
  uniform vec2 uSkC1;
  uniform vec2 uSkC2;
  uniform vec3 uSkScale;
  uniform float uMorph;
  uniform vec2 uShift0;   // hero headline's travel since it was sampled
  uniform vec2 uShift1;   // About heading's travel since it was sampled
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
  uniform float uFly;     // how far particles in flight stream toward the camera
  uniform float uNovaAge; // seconds since the last supernova
  uniform float uMaxPt;   // largest point, in pixels: fill rate is the cost
  uniform float uHush;    // the cloud steps back behind the Work constellation
  varying vec3 vColor;
  varying float vAlpha;

  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
  mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }

  // Independent pseudo-randoms from one seed. fract(seed * k) for several k
  // are correlated and put the points on visible lines.
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  vec3 swirl(vec3 p, float seed) {
    return vec3(
      sin(p.y * 0.9 + seed * 12.0 + uTime * 0.9),
      sin(p.z * 0.8 + seed * 7.0 + uTime * 1.1),
      cos(p.x * 0.7 + seed * 9.0 + uTime * 0.7)
    );
  }

  void main() {
    float seed = aRand.z;

    // --- the boot: every particle starts in one point of light at the centre,
    // bursts outward into a turning nebula, and one in eight condenses into
    // the intro's R while the rest hang around it.
    vec3 dir = normalize(vec3(hash(seed * 91.7) - 0.5, hash(seed * 47.3 + 3.1) - 0.5, (hash(seed * 23.9 + 7.7) - 0.5) * 0.5) + 1e-4);
    float shell = 1.4 + pow(hash(seed * 11.1 + 1.3), 0.7) * 11.0;
    vec3 core = dir * 0.05 * hash(seed * 5.9);
    vec3 burst = rotZ(uBoot * (0.06 + 0.5 / shell)) * dir * shell;
    float ex = clamp((uBoot - 0.35 - aRand.x * 0.12) / 0.75, 0.0, 1.0);
    ex = 1.0 - pow(1.0 - ex, 4.0);
    vec3 pre = mix(core, burst, ex);
    float member = step(0.88, hash(seed * 5.3 + 2.2));
    float rk = clamp((uBoot - 0.8 - aRand.x * 0.35) / 0.7, 0.0, 1.0);
    rk = rk * rk * (3.0 - 2.0 * rk) * member;
    pre = mix(pre, aMark + swirl(aMark * 4.0, seed) * 0.01, rk);
    vec3 cPre = mix(mix(uCool, uBase, hash(seed * 2.9)), uBase, rk);
    cPre = mix(uHot, cPre, ex);

    // --- form 0: the headline, drifting up with the page
    float sweep = clamp(uIntro * 1.7 - (aText.x / uViewW + 0.5) * 0.55 - aRand.x * 0.25, 0.0, 1.0);
    sweep = 1.0 - pow(1.0 - sweep, 3.0);
    vec3 text = aText + vec3(uShift0, 0.0);
    text += swirl(aText * 3.0, seed) * 0.012;
    vec3 f0 = mix(pre, text, sweep);
    vec3 c0 = mix(cPre, mix(uBase, uAccent, aRand.w), sweep);
    // One particle in nine stays out of the type as dust hanging in depth
    // behind it, drifting up slowly.
    float dust = step(0.89, fract(seed * 57.0));
    vec3 dp = vec3(
      (hash(seed * 13.1 + 0.7) - 0.5) * 30.0,
      fract(hash(seed * 29.3 + 5.1) + uTime * 0.006) * 18.0 - 9.0,
      -2.0 - hash(seed * 7.7 + 9.3) * 16.0
    );
    f0 = mix(f0, mix(pre, dp, sweep), dust);
    c0 = mix(c0, mix(uCool, uBase, fract(seed * 3.0)), dust);

    // --- form 1: the About heading, riding the rail with its DOM twin. A
    // slow wave of light runs along the letters.
    vec3 f1 = aText2.xyz + vec3(uShift1, 0.0) + swirl(aText2.xyz * 3.0, seed) * 0.012;
    float wave = 0.5 + 0.5 * sin(aText2.x * 1.3 - uTime * 2.2);
    vec3 c1 = mix(uBase, uAccent, aText2.w) * (0.8 + 0.45 * pow(wave, 6.0));
    f1 = mix(f1, dp, dust);
    c1 = mix(c1, mix(uCool, uBase, fract(seed * 3.0)), dust);

    // --- form 2: a three-armed galaxy, turning
    float gr = aGalaxy.x;
    float ga = aGalaxy.y + uTime * 0.22 / (0.5 + gr * 0.35);
    vec3 f2 = rotX(-1.08) * vec3(gr * cos(ga), aGalaxy.z, gr * sin(ga)) * uFormScale + vec3(0.4 * uFormScale, -0.2, -3.0);
    vec3 c2 = mix(uHot, uCool, smoothstep(0.0, 5.5, gr));
    c2 = mix(c2, uAccent, step(0.93, fract(seed * 13.0)) * 0.8);

    // --- form 3: the Aizawa attractor, its points shimmering along the flow
    vec3 ap = aAttr + aAttrDir * sin(uTime * 2.0 + seed * 6.283) * 0.07;
    vec3 f3 = rotX(0.45) * rotY(uTime * 0.16 + uAttrSpin) * ap * uFormScale + vec3(0.0, -0.25, -1.0);
    vec3 c3 = mix(uAccent, uCool, smoothstep(-1.4, 1.6, aAttr.y));

    // Skills: a third of the attractor peels away to spell whichever plane of
    // type is arriving, following that plane's projected box on screen, and
    // falls back into the flow as the plane flies past.
    float g = hash(seed * 3.7 + 1.1);
    float skA = 0.0;
    vec4 sk = vec4(0.0);
    vec2 skC = vec2(0.0);
    float skS = 1.0;
    if (g < 0.16) { skA = uSkAmt.x; sk = aSk0; skC = uSkC0; skS = uSkScale.x; }
    else if (g < 0.32) { skA = uSkAmt.y; sk = aSk1; skC = uSkC1; skS = uSkScale.y; }
    else if (g < 0.48) { skA = uSkAmt.z; sk = aSk2; skC = uSkC2; skS = uSkScale.z; }
    float sa = clamp(skA * 1.4 - aRand.x * 0.4, 0.0, 1.0);
    sa = sa * sa * (3.0 - 2.0 * sa);
    f3 = mix(f3, vec3(skC + sk.xy * skS, sk.z), sa);
    c3 = mix(c3, mix(uBase, uCool, sk.w), sa);

    // --- form 4: a black hole. Disk particles spiral in and are replaced at
    // the rim; the rest trace the lensed arc of the far side of the disk.
    // Its clock runs on its own uniform so feeding it can speed it up
    // without the particles jumping.
    vec3 f4;
    vec3 c4;
    float fall = fract(aHole.x - uHoleT * 0.035);
    float ringAlpha = 1.0;
    if (aHole.z < 0.8) {
      float r = mix(1.35, 7.5, pow(fall, 1.8));
      float a = aHole.y + uHoleT * 2.6 * pow(r, -1.5);
      vec3 d = vec3(r * cos(a), (fract(seed * 31.0) - 0.5) * 0.03 * r, r * sin(a));
      // Seen almost edge-on, tipped just enough to read as a disk; a drag
      // pitches it toward you and banks it.
      f4 = rotZ(uHoleRot.y) * rotX(0.2 + uHoleRot.x) * d;
      float beam = 1.0 + 0.6 * cos(a);    // the side coming toward you is brighter
      c4 = mix(uHot, uAccent, smoothstep(1.4, 4.8, r)) * beam;
    } else {
      // The far side of the disk, bent over and under the shadow by the
      // hole's gravity: a ring standing up behind it, always facing you.
      float r = mix(1.36, 1.9, pow(fract(seed * 17.0), 3.0));
      float a = aHole.y + uHoleT * 0.5;
      f4 = vec3(r * cos(a), r * sin(a), -0.4);
      c4 = mix(uHot, uAccent, smoothstep(1.36, 1.9, r));
      ringAlpha = 0.85;
    }
    c4 *= 1.0 + uFeed * 0.7;
    f4 = f4 * 1.8 * uFormScale * (1.0 + uFeed * 0.08) + vec3(0.0, -0.35, -1.5);

    // --- travel between forms, each particle on its own schedule, flung
    // outward along a swirl while it is in flight
    vec3 P[5];
    vec3 C[5];
    P[0] = f0; P[1] = f1; P[2] = f2; P[3] = f3; P[4] = f4;
    C[0] = c0; C[1] = c1; C[2] = c2; C[3] = c3; C[4] = c4;
    float SIZE[5];
    SIZE[0] = 1.0; SIZE[1] = 1.0; SIZE[2] = 1.25; SIZE[3] = 1.25; SIZE[4] = 1.25;
    float DIM[5];
    DIM[0] = 1.0; DIM[1] = 1.0; DIM[2] = 1.0; DIM[3] = 0.72; DIM[4] = 1.0;
    float m = clamp(uMorph, 0.0, 4.0);
    int seg = int(min(floor(m), 3.0));
    float t = clamp((m - float(seg)) * 1.35 - aRand.x * 0.35, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(P[seg], P[seg + 1], t);
    float flight = sin(3.14159 * t);
    // How much of this particle is currently spelling a skill: scroll speed
    // must not shake the letters apart.
    float skForm = sa * (seg == 2 ? t : (seg == 3 ? 1.0 - t : 0.0));
    p += swirl(p, seed) * (flight * 1.5 + uTurb * (1.0 - skForm * 0.85));
    // Between forms the stream pours toward the viewer, each particle at its
    // own moment, and some of it past them: with the camera diving in at the
    // same time, this is the fly-through.
    float rush = hash(seed * 61.3 + 4.4);
    p.z += flight * uFly * (0.2 + rush * rush * 1.8);
    vColor = mix(C[seg], C[seg + 1], t);

    // --- the pointer parts the cloud
    vec3 dm = p - uMouse;
    float fall2 = exp(-dot(dm.xy, dm.xy) * 1.1) * uMouseAmt;
    p.xy += normalize(dm.xy + 1e-4) * fall2 * 0.9;
    p.z += fall2 * 1.2;

    // --- a shockwave: a ring running out from a click, lifting the particles
    // it passes toward you and lighting them
    float waveGlow = 0.0;
    if (uWaveAge < 3.0) {
      vec2 dw = p.xy - uWaveC;
      float dd = length(dw);
      float front = uWaveAge * uWaveSpeed;
      waveGlow = exp(-pow((dd - front) * 1.4, 2.0)) * uWaveAmp * (1.0 - uWaveAge / 3.0);
      p.xy += dw / (dd + 1e-3) * waveGlow * 0.7;
      p.z += waveGlow * 1.6;
    }

    // --- a supernova: the whole cloud blows apart in a flash, hangs, and
    // falls back together, the slowest particles last.
    float nova = 0.0;
    if (uNovaAge < 5.0) {
      float back = 1.0 - smoothstep(1.0, 3.8, uNovaAge - aRand.x * 0.7);
      nova = (1.0 - exp(-uNovaAge * 8.0)) * back;
      vec3 nd = normalize(vec3(hash(seed * 71.3) - 0.5, hash(seed * 19.7 + 2.0) - 0.5, hash(seed * 43.1 + 6.0) - 0.5) + 1e-4);
      p += nd * nova * (2.5 + pow(hash(seed * 8.3 + 1.7), 2.0) * 15.0);
      p = rotZ(nova * 0.5 * (hash(seed * 3.3) - 0.5)) * p;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float formSize = mix(SIZE[seg], SIZE[seg + 1], t);
    // Anything brushing the lens is dropped rather than drawn as a huge disc.
    float depth = -mv.z;
    gl_PointSize = depth < 0.45 ? 0.0 : min(uPx * (0.55 + aRand.y) * formSize * (${CAM_Z.toFixed(1)} / depth), uMaxPt);
    vAlpha = mix(0.35, 1.0, max(sweep, rk)) * (0.7 + 0.3 * aRand.y) + fall2 * 0.5 + waveGlow * 0.6;
    vAlpha *= 1.0 + skForm * 0.55;
    // Dust is dimmer while it hangs behind the type.
    float inText = seg < 1 ? 1.0 : (seg == 1 ? 1.0 - t : 0.0);
    vAlpha *= mix(1.0, 0.45, dust * inText);
    vAlpha *= mix(DIM[seg], DIM[seg + 1], t);
    // Disk particles fade in at the rim and out at the horizon.
    if (seg == 3) vAlpha *= mix(1.0, aHole.z < 0.8 ? smoothstep(0.0, 0.06, fall) * smoothstep(1.0, 0.6, fall) : ringAlpha, t);
    vAlpha *= smoothstep(0.45, 2.4, depth) * (1.0 - uHush * 0.86);
    float flash = nova * exp(-uNovaAge * 2.2);
    vColor = mix(vColor, uHot, flash);
    vAlpha *= 1.0 + flash * 1.2;
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

// Samples a heading exactly as the browser laid it out: every word is drawn
// into a canvas at its own on-screen box, in its own font, and the lit pixels
// become particle targets on the z = 0 plane. Positions are in the viewport as
// it was at sampling; the frame loop adds however far the element has moved
// since, so the particles ride along with the real layout (scroll, rails).
//
// `local` lays the words out from offsetLeft/Top instead: the skill planes are
// sampled that way, as they sit at rest, whatever 3D transform they are in now.
function sampleWords(root, words, isAccent, n, view, local = false) {
  const box = local
    ? { left: 0, top: 0, width: root.offsetWidth, height: root.offsetHeight }
    : root.getBoundingClientRect();
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
    const r = local
      ? { left: w.offsetLeft, top: w.offsetTop, width: w.offsetWidth, height: w.offsetHeight }
      : w.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const text = w.textContent;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * S}px ${cs.fontFamily}`;
    ctx.fillStyle = isAccent(w) ? "#00ff00" : "#ff0000";
    ctx.textBaseline = "alphabetic";
    // The type is set tight; without its letter-spacing the sample comes out
    // wider than the words it should sit on.
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * S}px`;
    const m = ctx.measureText(text);
    const x0 = (r.left - box.left + pl) * S;
    const targetW = (r.width - pl - pr) * S;
    // The baseline is read from the layout itself, with a zero-size marker
    // sitting on it: the canvas's font metrics put Instrument Serif's
    // baseline somewhere other than CSS does.
    const marker = document.createElement("span");
    marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    w.appendChild(marker);
    let base;
    if (local) base = marker.offsetParent === w ? r.top + marker.offsetTop : marker.offsetTop;
    else base = marker.getBoundingClientRect().top;
    marker.remove();
    ctx.save();
    ctx.translate(x0, (base - box.top) * S);
    // A skill item's box also holds its separator dot; never stretch to it.
    ctx.scale(m.width > 0 && !local ? Math.min(1.15, targetW / m.width) : 1, 1);
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
  // Screen samples are placed in the viewport; local ones around the
  // element's own centre, at the scale it has when it sits at rest.
  const ox = local ? box.width / 2 : view.w / 2;
  const oy = local ? box.height / 2 : view.h / 2;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * count) * 3;
    const sx = box.left + (lit[j] + Math.random()) / S;
    const sy = box.top + (lit[j + 1] + Math.random()) / S;
    pos[i * 3] = ((sx - ox) / view.w) * view.worldW;
    pos[i * 3 + 1] = -((sy - oy) / view.h) * view.worldH;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    accent[i] = lit[j + 2];
  }
  return { pos, accent, left: box.left, top: box.top };
}

const HEADINGS = [
  {
    root: () => document.querySelector(".hero h1"),
    words: (el) => [...el.querySelectorAll(".hword")],
    accent: (w) => w.classList.contains("accent"),
    flag: "gl-text",
  },
  {
    root: () => document.querySelector("#about .section-heading h2"),
    words: (el) => [...el.querySelectorAll(".split-vis .word")],
    accent: (w) => Boolean(w.closest("em")),
    flag: "gl-about",
  },
];

const MARK = () => document.querySelector(".intro-mark span");
const PLANES = () => [...document.querySelectorAll(".skills-section:not(.flat) .plane")];

const toWorldX = (x, v) => (x / v.w - 0.5) * v.worldW;
const toWorldY = (y, v) => -(y / v.h - 0.5) * v.worldH;

const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
// Scroll chapter (0 hero, 1 About, 2 Skills, 3 Work, 4 Contact, 5 the
// bottom) -> position across the five forms. The hero headline streams
// into the About heading as it rises; the heading holds while the rail pins,
// dissolves into the galaxy as it slides off-screen, and the galaxy holds
// behind the cards until the rail is nearly done. Spread evenly, the long
// pinned chapters would leave the cloud mid-flight the whole time.
function morphFor(j) {
  if (j < 2) return ramp(j, 0.2, 1.15) + ramp(j, 1.4, 1.58) + ramp(j, 1.74, 2);
  // The attractor hangs behind Skills and Work; the black hole forms as
  // Contact rises.
  return 3 + ramp(j, 3.75, 4.25);
}

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function key(j, values) {
  const i = Math.min(Math.floor(j), values.length - 2);
  const t = easeIO(Math.min(Math.max(j - i, 0), 1));
  return values[i] + (values[i + 1] - values[i]) * t;
}

// Each flight between forms has its own line through the cloud: how far the
// camera dives in, how far it swings sideways, how far it banks.
const FLIGHTS = [
  { dive: 3.0, side: 1.1, roll: 0.2 },
  { dive: 4.5, side: -1.6, roll: -0.3 },
  { dive: 6.5, side: 1.2, roll: 0.45 },
  { dive: 5.5, side: -0.4, roll: -0.6 },
];

// Quality steps, best first. The controller in the frame loop measures the
// frame rate and walks down them while the device struggles (and back up,
// carefully, once it copes): fewer pixels, then fewer particles, then smaller
// points and a gentler fly-through. Particles are in random order, so drawing
// the first k of them is a fair sample of every form.
const LEVELS = [
  { dpr: 2, share: 1, pt: 48, fly: 1 },
  { dpr: 1.5, share: 1, pt: 40, fly: 1 },
  { dpr: 1.25, share: 0.7, pt: 32, fly: 1 },
  { dpr: 1, share: 0.5, pt: 24, fly: 0.6 },
  { dpr: 0.85, share: 0.32, pt: 18, fly: 0.4 },
];

// ?q=0..4 pins a level (for testing); otherwise a device that says it is
// small or on a data saver starts a step or two down.
function forcedLevel() {
  const v = new URLSearchParams(window.location.search).get("q");
  return v !== null && LEVELS[Number(v)] ? Number(v) : null;
}
function startLevel() {
  const forced = forcedLevel();
  if (forced !== null) return forced;
  if (navigator.connection?.saveData) return 2;
  if ((navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4) return 1;
  return 0;
}

function Cloud({ scroll, pointer, lite, reduced }) {
  const theme = useThemeName();
  const { gl, camera } = useThree();
  const setDpr = useThree((state) => state.setDpr);
  const n = lite ? 50000 : 130000;
  const forms = useMemo(() => buildForms(n), [n]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const text = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) text.set([(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, 0], i * 3);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aText", new THREE.BufferAttribute(text, 3));
    const text2 = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) text2.set([(Math.random() - 0.5) * 10, -6 - Math.random() * 4, 0, 0], i * 4);
    g.setAttribute("aText2", new THREE.BufferAttribute(text2, 4));
    g.setAttribute("aGalaxy", new THREE.BufferAttribute(forms.galaxy, 3));
    g.setAttribute("aAttr", new THREE.BufferAttribute(forms.attr, 3));
    g.setAttribute("aAttrDir", new THREE.BufferAttribute(forms.attrDir, 3));
    g.setAttribute("aHole", new THREE.BufferAttribute(forms.hole, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(forms.rand, 4));
    // Until the R is sampled (or if it never is), its particles gather into
    // a small ball at the centre.
    const mark = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.6);
      mark.set([d.x, d.y, d.z], i * 3);
    }
    g.setAttribute("aMark", new THREE.BufferAttribute(mark, 3));
    for (let k = 0; k < 3; k++) {
      g.setAttribute(`aSk${k}`, new THREE.BufferAttribute(new Float32Array(n * 4), 4));
    }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [n, forms]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBoot: { value: 0 },
    uIntro: { value: 0 },
    uWaveC: { value: new THREE.Vector2() },
    uWaveAge: { value: 99 },
    uWaveAmp: { value: 0 },
    uWaveSpeed: { value: 9 },
    uHoleT: { value: 0 },
    uHoleRot: { value: new THREE.Vector2() },
    uFeed: { value: 0 },
    uSkAmt: { value: new THREE.Vector3() },
    uSkC0: { value: new THREE.Vector2() },
    uSkC1: { value: new THREE.Vector2() },
    uSkC2: { value: new THREE.Vector2() },
    uSkScale: { value: new THREE.Vector3(1, 1, 1) },
    uMorph: { value: 0 },
    uShift0: { value: new THREE.Vector2() },
    uShift1: { value: new THREE.Vector2() },
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
    uFly: { value: 0 },
    uNovaAge: { value: 99 },
    uMaxPt: { value: 48 },
    uHush: { value: 0 },
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
  const bootStart = useRef(0);
  const anchors = useRef([]);
  const planes = useRef([]);
  const resample = useRef(null);

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

      // The intro's R, only while the intro is still showing it.
      const mark = MARK();
      const m = mark && sampleWords(mark, [mark], () => false, n, view.current);
      if (m) {
        const a = geometry.getAttribute("aMark");
        a.array.set(m.pos);
        a.needsUpdate = true;
      }

      // The skill planes, as they sit at rest, relative to their own centres.
      planes.current = [];
      if (!reduced) {
        const els = PLANES();
        for (let k = 0; k < Math.min(3, els.length); k++) {
          const el = els[k];
          const items = [...el.querySelectorAll("li")];
          const r = sampleWords(el, items, (li) => [...li.parentNode.children].indexOf(li) % 2 === 1, n, view.current, true);
          if (!r) continue;
          const a = geometry.getAttribute(`aSk${k}`);
          for (let i = 0; i < n; i++) {
            a.array[i * 4] = r.pos[i * 3];
            a.array[i * 4 + 1] = r.pos[i * 3 + 1];
            a.array[i * 4 + 2] = r.pos[i * 3 + 2];
            a.array[i * 4 + 3] = r.accent[i];
          }
          a.needsUpdate = true;
          planes.current[k] = el;
        }
        document.documentElement.classList.toggle("gl-skills", planes.current.length > 0);
      }

      for (let h = 0; h < HEADINGS.length; h++) {
        const def = HEADINGS[h];
        const el = def.root();
        const result = el && sampleWords(el, def.words(el), def.accent, n, view.current);
        if (!result) continue;
        if (h === 0) {
          const a = geometry.getAttribute("aText");
          a.array.set(result.pos);
          a.needsUpdate = true;
          const r = geometry.getAttribute("aRand");
          for (let i = 0; i < n; i++) r.array[i * 4 + 3] = result.accent[i];
          r.needsUpdate = true;
        } else {
          const a = geometry.getAttribute("aText2");
          for (let i = 0; i < n; i++) {
            a.array[i * 4] = result.pos[i * 3];
            a.array[i * 4 + 1] = result.pos[i * 3 + 1];
            a.array[i * 4 + 2] = result.pos[i * 3 + 2];
            a.array[i * 4 + 3] = result.accent[i];
          }
          a.needsUpdate = true;
        }
        anchors.current[h] = { el, left: result.left, top: result.top };
        document.documentElement.classList.add(def.flag);
      }
      if (anchors.current[0] && !ready.current) {
        ready.current = performance.now();
        // If the intro already gave up waiting, skip the R and go straight
        // from the burst into the headline.
        bootStart.current = ready.current - (window.__rvIntroDone ? 1900 : 0);
        window.__rvSceneReady = true;
        window.dispatchEvent(new Event("rv:scene-ready"));
      }
    };
    resample.current = sample;
    sample();
    const onResize = () => { clearTimeout(timer); timer = setTimeout(sample, 180); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      for (const def of HEADINGS) document.documentElement.classList.remove(def.flag);
      document.documentElement.classList.remove("gl-skills");
    };
  }, [geometry, n, uniforms, reduced]);

  const s = useRef({ j: 0, turb: 0, mouse: 0, spin: 0, feed: 0, cx: 0, cy: 0, novaAt: -1e9 });

  // Quality: the controller's state, and how a level is applied.
  const q = useRef(null);
  useEffect(() => {
    const apply = (level) => {
      const L = LEVELS[level];
      const cap = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
      setDpr(Math.min(cap, L.dpr));
      geometry.setDrawRange(0, Math.floor(n * L.share));
      uniforms.uMaxPt.value = L.pt;
      window.__rvQuality = { level, fps: q.current?.fps ?? null, particles: Math.floor(n * L.share) };
    };
    q.current = {
      level: startLevel(), floor: 0, acc: 0, frames: 0, good: 0, upAt: -1e9,
      born: performance.now(), forced: forcedLevel() !== null, fps: null, apply,
    };
    apply(q.current.level);
  }, [geometry, n, lite, setDpr, uniforms]);

  // Shake the phone or triple-tap the page: everything blows apart.
  useEffect(() => {
    const go = () => { s.current.novaAt = performance.now(); };
    window.addEventListener("rv:nova", go);
    return () => window.removeEventListener("rv:nova", go);
  }, []);

  // Back to the top through the black hole: the cloud is reborn from a point.
  useEffect(() => {
    const reborn = () => {
      bootStart.current = performance.now();
      s.current.j = 0;
    };
    window.addEventListener("rv:rebirth", reborn);
    return () => window.removeEventListener("rv:rebirth", reborn);
  }, []);
  useFrame((_, rawDt) => {
    // Smoothing tolerates a slow frame; animation time does not jump.
    const dt = Math.min(rawDt, 0.25);
    const st = s.current;
    if (!reduced) uniforms.uTime.value += Math.min(rawDt, 0.05);
    // Wall-clock, so the assembly takes the same time on a slow device
    // instead of crawling at its frame rate.
    // Point -> burst -> R (0 to 1.9 s), then the R streams into the headline.
    const now = performance.now();
    if (ready.current) {
      const boot = reduced ? 99 : (now - bootStart.current) / 1000;
      uniforms.uBoot.value = boot;
      uniforms.uIntro.value = Math.min(1, Math.max(0, (boot - 1.9) / 2.6));
    }

    // The black hole: hovering a contact link (or the page falling in) feeds
    // it, which spins the disk up; a drag tilts it, and it drifts back.
    st.feed += (Math.max(fx.feed, fx.warp) - st.feed) * Math.min(1, dt * 4);
    uniforms.uFeed.value = st.feed;
    if (!reduced) uniforms.uHoleT.value += Math.min(rawDt, 0.05) * (1 + st.feed * 3.5);
    const hole = fx.hole;
    if (!hole.dragging) {
      hole.roll += hole.vr * dt;
      hole.pitch += hole.vp * dt;
      const k = Math.exp(-dt * 3);
      hole.vr *= k;
      hole.vp *= k;
      hole.roll -= hole.roll * Math.min(1, dt * 0.9);
      hole.pitch -= hole.pitch * Math.min(1, dt * 0.9);
      hole.roll = Math.max(-1.2, Math.min(1.2, hole.roll));
      hole.pitch = Math.max(-1.25, Math.min(1.25, hole.pitch));
    }
    uniforms.uHoleRot.value.set(hole.pitch, hole.roll);

    st.j += (scroll.chapter - st.j) * Math.min(1, dt * 4);
    uniforms.uMorph.value = morphFor(st.j);
    const v = view.current;
    // Each sampled heading's particles follow the real element wherever the
    // layout has carried it since: scrolled, pinned, or slid along a rail.
    const shifts = [uniforms.uShift0.value, uniforms.uShift1.value];
    for (let h = 0; h < shifts.length; h++) {
      const a = anchors.current[h];
      if (!a) continue;
      if (!a.el.isConnected) {
        // React swapped the element (the About layout changes with the
        // screen); sample the new one.
        anchors.current[h] = null;
        resample.current?.();
        continue;
      }
      const r = a.el.getBoundingClientRect();
      shifts[h].set(((r.left - a.left) / v.w) * v.worldW, (-(r.top - a.top) / v.h) * v.worldH);
    }

    // Skill planes: follow each one's projected box; --form (written by the
    // Skills section) says how fully it should be spelled out.
    const amt = uniforms.uSkAmt.value;
    const centres = [uniforms.uSkC0.value, uniforms.uSkC1.value, uniforms.uSkC2.value];
    const scales = uniforms.uSkScale.value;
    let skMax = 0;
    for (let k = 0; k < 3; k++) {
      const el = planes.current[k];
      let f = 0;
      if (el && el.isConnected) {
        f = parseFloat(el.style.getPropertyValue("--form")) || 0;
        if (f > 0.001) {
          const r = el.getBoundingClientRect();
          centres[k].set(toWorldX(r.left + r.width / 2, v), toWorldY(r.top + r.height / 2, v));
          scales.setComponent(k, el.offsetWidth ? r.width / el.offsetWidth : 1);
        }
      } else if (el) {
        planes.current[k] = null;
        resample.current?.();
      }
      amt.setComponent(k, f);
      skMax = Math.max(skMax, f);
    }

    // Shockwave from the last click, converted to the z = 0 plane.
    const w = fx.wave;
    uniforms.uWaveAge.value = reduced ? 99 : (now - w.at) / 1000;
    uniforms.uWaveAmp.value = w.amp;
    uniforms.uWaveSpeed.value = w.speed;
    uniforms.uWaveC.value.set(toWorldX(w.x, v), toWorldY(w.y, v));

    const speed = Math.abs(scroll.velocity);
    st.turb += (Math.min(speed * 0.012, 0.6) - st.turb) * Math.min(1, dt * 5);
    uniforms.uTurb.value = reduced ? 0 : st.turb;
    st.spin += scroll.velocity * 0.0009;
    uniforms.uAttrSpin.value = st.spin;

    const pt = pointer.current;
    uniforms.uMouse.value.set(pt.x * v.worldW / 2, pt.y * v.worldH / 2, 0);
    st.mouse += ((pt.active && !reduced ? 1 : 0) - st.mouse) * Math.min(1, dt * 3);
    uniforms.uMouseAmt.value = st.mouse;

    // Quality: frame rate over 1.5 s windows (a stalled or hidden tab's long
    // frames are not counted). Below 42 fps, step down; after 7.5 s above 57,
    // try one step up, and if that step drops it again, stay put for good.
    const qq = q.current;
    if (qq && !qq.forced && rawDt < 0.25 && now - qq.born > 2500) {
      qq.acc += rawDt;
      qq.frames += 1;
      if (qq.acc >= 1.5) {
        qq.fps = qq.frames / qq.acc;
        qq.acc = 0;
        qq.frames = 0;
        if (qq.fps < 42 && qq.level < LEVELS.length - 1) {
          if (now - qq.upAt < 6000) qq.floor = qq.level + 1;
          qq.level += 1;
          qq.good = 0;
          qq.apply(qq.level);
        } else if (qq.fps > 57 && qq.level > qq.floor) {
          qq.good += 1;
          if (qq.good >= 5) {
            qq.level -= 1;
            qq.good = 0;
            qq.upAt = now;
            qq.apply(qq.level);
          }
        } else {
          qq.good = 0;
        }
        if (window.__rvQuality) window.__rvQuality.fps = Math.round(qq.fps);
      }
    }
    const L = LEVELS[qq ? qq.level : 0];

    // Point size in device pixels, so density reads the same on any screen;
    // with fewer particles drawn each grows a little to keep the type full.
    uniforms.uPx.value = (lite ? 2.2 : 1.9) * gl.getPixelRatio() * Math.pow(1 / L.share, 0.3);

    uniforms.uNovaAge.value = reduced ? 99 : (now - st.novaAt) / 1000;

    // A slow drift of the camera with the pointer (or, on a phone, with its
    // tilt): the forms are 3D and should feel it. Kept small at the headline,
    // and pulled to the centre while a skill is spelled out, so particle type
    // stays registered on the DOM type.
    const g = fx.gyro;
    const lookX = !pt.active && g.active && !reduced ? g.x : pt.x;
    const lookY = !pt.active && g.active && !reduced ? g.y : pt.y;
    const reach = key(st.j, [0.18, 1.4, 1.6, 0.9, 0.9, 0.9]) * (1 - skMax * 0.9);
    st.cx += (lookX * reach - st.cx) * Math.min(1, dt * 2);
    st.cy += (lookY * reach * 0.6 - st.cy) * Math.min(1, dt * 2);

    // The fly-through: while the particles are between forms the camera
    // dives into the stream on that flight's line, banking, and comes back
    // out as the next form settles. At every form it is back at rest, so the
    // particle type stays on the real type.
    const mm = uniforms.uMorph.value;
    const seg = Math.min(Math.floor(mm), 3);
    const fl = reduced ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, mm - seg)));
    const F = FLIGHTS[seg];
    const go = fl * L.fly;
    uniforms.uFly.value = reduced ? 0 : 3.4 * L.fly;
    // The constellation is the subject in Work; the attractor dims behind it
    // until the black hole starts to form.
    uniforms.uHush.value = ramp(st.j, 2.85, 3.05) * (1 - ramp(st.j, 3.7, 4.05));
    camera.position.set(st.cx + F.side * go, st.cy, CAM_Z - F.dive * go);
    camera.up.set(Math.sin(F.roll * go), Math.cos(F.roll * go), 0);
    camera.lookAt(F.side * go * 0.35, 0, -2 * Math.min(1, st.j) - F.dive * go * 0.5);
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

// If WebGL is unavailable the DOM headline simply stays visible.
class Guard extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    for (const def of HEADINGS) document.documentElement.classList.remove(def.flag);
    document.documentElement.classList.remove("gl-skills");
    // The intro is waiting for the cloud; tell it not to.
    window.dispatchEvent(new Event("rv:scene-failed"));
  }
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
