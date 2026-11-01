import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThemeName } from "./components";

// "Signal": one landscape of ink lines, drawn the way a seismograph or a
// pulsar plot draws — every row a trace, every ridge hiding the rows behind
// it. The camera flies it as the page scrolls, and the terrain's amplitude is
// the page's mood: alive at the hero, quiet under the cards, wild through the
// capabilities, flat and calm at the contact.
const PALETTE = {
  light: { bg: "#e9e9e4", line: "#0d0e11", accent: "#2b38ff", lineAlpha: 0.62 },
  dark: { bg: "#07080a", line: "#e8e9e3", accent: "#d2ff3c", lineAlpha: 0.78 },
};

// Simplex noise (Ashima Arts / Ian McEwan, MIT) plus the height field both
// the lines and their occluding surface share, so the two never disagree.
const HEIGHT = /* glsl */ `
  uniform float uTime;
  uniform float uTravel;
  uniform float uAmp;
  uniform vec2 uPointer;
  uniform float uPointerAmt;
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float terrain(vec2 p) {
    vec2 q = vec2(p.x, p.y - uTravel);
    float ridge = 1.0 - abs(snoise(q * 0.075));
    ridge = ridge * ridge * ridge;
    float detail = snoise(q * 0.22 + uTime * 0.03) * 0.35 + snoise(q * 0.6) * 0.08;
    // A calmer channel down the middle keeps the type over it legible; the
    // mountains rise toward the edges of the frame.
    float side = smoothstep(1.5, 13.0, abs(p.x));
    float h = (ridge * 2.6 + detail) * (0.28 + 0.72 * side) * uAmp;
    float d = distance(p, uPointer);
    h += sin(d * 1.9 - uTime * 3.2) * exp(-d * 0.38) * 0.55 * uPointerAmt;
    return h;
  }
`;

const LINE_VERT = /* glsl */ `
  ${HEIGHT}
  varying float vDepth;
  varying float vHeight;
  varying float vX;
  varying float vZ;
  void main() {
    vec3 p = position;
    p.y = terrain(p.xz);
    vHeight = p.y;
    vX = p.x;
    vZ = p.z;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uLine;
  uniform vec3 uAccent;
  uniform vec3 uBg;
  uniform float uAlpha;
  uniform float uScan;
  uniform float uFar;
  uniform vec2 uPointer;
  uniform float uPointerAmt;
  varying float vDepth;
  varying float vHeight;
  varying float vX;
  varying float vZ;
  void main() {
    // A band of accent sweeps through the rows like a radar return, and the
    // ground under the pointer lights up as it ripples.
    float scan = exp(-pow((vZ - uScan) * 0.55, 2.0));
    float near = exp(-distance(vec2(vX, vZ), uPointer) * 0.32) * uPointerAmt;
    float peak = smoothstep(1.4, 3.2, vHeight) * 0.55;
    float hot = clamp(scan * 0.9 + near * 0.9 + peak, 0.0, 1.0);
    vec3 col = mix(uLine, uAccent, hot);
    float fog = smoothstep(uFar * 0.25, uFar, vDepth);
    float edge = 1.0 - smoothstep(17.0, 24.0, abs(vX));
    float a = uAlpha * (1.0 - fog) * edge * (0.55 + 0.45 * hot + 0.25);
    // Thin out the nearest rows: they pass under the body copy.
    a *= 0.35 + 0.65 * smoothstep(3.0, 12.0, vDepth);
    gl_FragColor = vec4(mix(col, uBg, fog * 0.6), a);
    #include <colorspace_fragment>
  }
`;

const FILL_VERT = /* glsl */ `
  ${HEIGHT}
  void main() {
    vec3 p = position;
    p.y = terrain(p.xz) - 0.015;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FILL_FRAG = /* glsl */ `
  uniform vec3 uBg;
  void main() {
    gl_FragColor = vec4(uBg, 1.0);
    #include <colorspace_fragment>
  }
`;

const W = 48;
const Z_NEAR = 8;
const Z_FAR = -64;

// One LineSegments geometry holds every row: two vertices per segment, flat
// on the ground; the vertex shader raises them.
function rowGeometry(rows, segs) {
  const pos = new Float32Array(rows * segs * 2 * 3);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const z = Z_NEAR + (Z_FAR - Z_NEAR) * (r / (rows - 1));
    for (let s = 0; s < segs; s++) {
      const x0 = -W / 2 + (W * s) / segs;
      const x1 = -W / 2 + (W * (s + 1)) / segs;
      pos.set([x0, 0, z, x1, 0, z], k);
      k += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -28), 80);
  return g;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Values keyed to the scroll chapter: 0 hero, 1 about, 2 capabilities,
// 3 contact. Linear between chapters, eased within each step.
function key(j, values) {
  const i = Math.min(Math.floor(j), values.length - 2);
  const t = ease(Math.min(Math.max(j - i, 0), 1));
  const a = values[i];
  const b = values[i + 1];
  return Array.isArray(a) ? a.map((v, n) => v + (b[n] - v) * t) : a + (b - a) * t;
}

const CAM_POS = [[0, 2.6, 9], [0, 15, 7], [-2.2, 1.35, 6.5], [0, 4.2, 11]];
const CAM_LOOK = [[0, 0.4, -30], [0, 0, -6], [3, 1.8, -34], [0, -0.4, -30]];
const AMP = [1, 0.55, 1.65, 0.12];
const ALPHA = [1, 0.36, 0.95, 0.85];
const ROLL = [0, 0, 0.09, 0];

function Signal({ scroll, pointer, lite, reduced }) {
  const theme = useThemeName();
  const { camera, scene, gl } = useThree();
  const rows = lite ? 52 : 92;
  const segs = lite ? 110 : 220;
  const lines = useMemo(() => rowGeometry(rows, segs), [rows, segs]);
  const fill = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, Z_NEAR - Z_FAR, segs, rows * 2);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (Z_NEAR + Z_FAR) / 2);
    return g;
  }, [rows, segs]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTravel: { value: 0 },
    uAmp: { value: 1 },
    uPointer: { value: new THREE.Vector2(0, -6) },
    uPointerAmt: { value: 0 },
    uLine: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
    uBg: { value: new THREE.Color() },
    uAlpha: { value: 1 },
    uScan: { value: 0 },
    uFar: { value: 60 },
  }), []);

  useEffect(() => {
    const p = PALETTE[theme];
    uniforms.uLine.value.set(p.line);
    uniforms.uAccent.value.set(p.accent);
    uniforms.uBg.value.set(p.bg);
    scene.background = new THREE.Color(p.bg);
    gl.setClearColor(p.bg, 1);
  }, [theme, uniforms, scene, gl]);

  const look = useRef(new THREE.Vector3(...CAM_LOOK[0]));
  const state = useRef({ j: 0, travel: 0, amp: 1, pAmt: 0, scan: -60 });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ground = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    s.j += (scroll.chapter - s.j) * Math.min(1, dt * 3.2);
    const j = s.j;
    const speed = Math.abs(scroll.velocity);

    // Flight: the ground streams toward the camera, faster through the
    // capabilities chapter and with every flick of the wheel.
    if (!reduced) {
      s.travel += dt * (0.55 + key(j, [0, 0.2, 1.6, 0.1]) * 2.2 + Math.min(speed * 0.05, 3));
      uniforms.uTime.value += dt;
      s.scan += dt * 22;
      if (s.scan > 10) s.scan = -64;
    }
    uniforms.uTravel.value = s.travel + j * 9;
    uniforms.uScan.value = s.scan;

    const ampTarget = key(j, AMP) + Math.min(speed * 0.018, 0.7);
    s.amp += (ampTarget - s.amp) * Math.min(1, dt * 4);
    uniforms.uAmp.value = s.amp;
    uniforms.uAlpha.value = PALETTE[theme].lineAlpha * key(j, ALPHA);

    const [px, py, pz] = key(j, CAM_POS);
    const [lx, ly, lz] = key(j, CAM_LOOK);
    const pt = pointer.current;
    camera.position.x += (px + pt.x * 0.8 - camera.position.x) * Math.min(1, dt * 3);
    camera.position.y += (py + pt.y * 0.35 - camera.position.y) * Math.min(1, dt * 3);
    camera.position.z += (pz - camera.position.z) * Math.min(1, dt * 3);
    look.current.lerp(hit.set(lx, ly, lz), Math.min(1, dt * 3));
    camera.lookAt(look.current);
    camera.rotateZ(key(j, ROLL) + Math.max(-0.06, Math.min(0.06, scroll.velocity * -0.0012)));

    // Where the pointer meets the ground, for the ripple.
    ndc.set(pt.x, pt.y);
    ray.setFromCamera(ndc, camera);
    const active = pt.active && ray.ray.intersectPlane(ground, hit);
    if (active) uniforms.uPointer.value.lerp(new THREE.Vector2(hit.x, hit.z), Math.min(1, dt * 8));
    s.pAmt += ((active && !reduced ? 1 : 0) - s.pAmt) * Math.min(1, dt * 2.5);
    uniforms.uPointerAmt.value = s.pAmt;
  });

  return (
    <>
      <mesh geometry={fill} renderOrder={0}>
        <shaderMaterial
          vertexShader={FILL_VERT}
          fragmentShader={FILL_FRAG}
          uniforms={uniforms}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={lines} renderOrder={1}>
        <shaderMaterial
          vertexShader={LINE_VERT}
          fragmentShader={LINE_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
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
      <Canvas
        camera={{ position: CAM_POS[0], fov: 50, near: 0.1, far: 90 }}
        dpr={lite ? [1, 1.5] : [1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Signal scroll={scroll} pointer={pointer} lite={lite} reduced={reduced} />
      </Canvas>
    </div>
  );
}
