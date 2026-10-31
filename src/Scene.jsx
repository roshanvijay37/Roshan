import { Environment, Float, Lightformer, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThemeName } from "./components";

// The canvas is opaque now — bloom and the lens effects need a real frame to
// work on — so the page ground and its two warm washes are painted inside the
// scene by <Backdrop>. `bg` must match --bg exactly or the edges of the canvas
// show as a seam against the html colour on overscroll.
//
// Highlights that should glow are pushed past 1.0 (`glow`) and bypass tone
// mapping; bloom only picks up those, so the cream page never blooms.
const PALETTE = {
  dark: {
    bg: "#0b0906", bgDeep: "#070502",
    washA: "#cda54b", washAStrength: 0.17,
    washB: "#a06e28", washBStrength: 0.1,
    particles: "#e8cf9c", particleOpacity: 0.8,
    core: "#d9ae5f",
    ring1: "#f0d79a", ring1Opacity: 0.66,
    ring2: "#c2913f", ring2Opacity: 0.5,
    tunnel: "#f0d79a", tunnelOpacity: 0.3,
    glow: 2.6, shardCap: 0.3,
    sparkle: "#fff6e2",
    key: "#ffd89b", fill: "#c2913f",
    ambient: 0.5,
    // The environment the glass core refracts. Dark keeps a moody surround so
    // the gold strips read as bright specular edges rather than a wash.
    envBg: "#100c07", envKey: "#fff1cf", envFill: "#c2913f", envRim: "#fff6e2",
    envIntensity: 2.6,
    // Separate from `core`, which also drives the shard shader. Thickness is
    // Beer-Lambert attenuation: the deeper the glass, the more the tint eats
    // the light passing through it.
    glass: "#d9ae5f", glassThickness: 0.7,
    bloom: 0.7, vignette: 0.32,
  },
  light: {
    bg: "#fcfaf4", bgDeep: "#f2ecdd",
    washA: "#be963c", washAStrength: 0.15,
    washB: "#966923", washBStrength: 0.08,
    particles: "#a8823a", particleOpacity: 0.62,
    core: "#c09442",
    ring1: "#9a6f22", ring1Opacity: 0.46,
    ring2: "#8a6a14", ring2Opacity: 0.32,
    tunnel: "#9a6f22", tunnelOpacity: 0.26,
    glow: 1, shardCap: 0.17,
    sparkle: "#8a6a14",
    key: "#e0b866", fill: "#b8873b",
    ambient: 0.95,
    // Light needs a high-key surround: the core sits on cream, so its refraction
    // has to be brighter than the page or it reads as a hole punched in it.
    envBg: "#fdf8ec", envKey: "#ffffff", envFill: "#f0dcb2", envRim: "#ffffff",
    envIntensity: 4.2,
    // A pale, thin glass on light: a saturated tint at this thickness turns the
    // core into a dark ball, which is the one thing it must not be on cream.
    glass: "#f5ead2", glassThickness: 0.3,
    bloom: 0.35, vignette: 0.18,
  },
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);

// Piecewise keyframes over the chapter value (0 hero … 3 contact), eased
// within each segment so the motion settles on every section instead of
// passing through it at constant speed.
function key(frames, c) {
  const i = Math.min(frames.length - 2, Math.max(0, Math.floor(c)));
  const t = smooth(clamp01(c - i));
  const a = frames[i];
  const b = frames[i + 1];
  return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * t) : a + (b - a) * t;
}

const glowColor = (hex, gain) => new THREE.Color(hex).multiplyScalar(gain);

// A transmission material refracts whatever surrounds it. With no environment
// map it samples the canvas clear colour — transparent, which resolves to black
// — so the core rendered as a dark polygon on the cream page. WebGL cannot
// refract the DOM behind the canvas, so the surround has to exist in the scene.
//
// Built from emissive planes rather than a downloaded HDR: same idea as the
// three.js keyframes example generating its sky through PMREMGenerator instead
// of fetching one. That costs no network request and no HDR asset, though the
// drei helpers themselves add ~20 KB gzipped to this chunk. `frames={1}` bakes
// the cubemap once at mount, so there is no per-frame cost.
function StudioEnvironment({ palette }) {
  return (
    <Environment resolution={256} frames={1}>
      {/* An enclosing shell, not `<color attach="background">` — that does not
          reach the internal scene drei renders these children into, which left
          the gaps between lightformers black and put a dark mass at the centre
          of the refraction. This is the room the glass sits in. */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={palette.envBg} side={THREE.BackSide} />
      </mesh>
      {/* Broad overhead key — gives the facets a gradient to slide across. */}
      <Lightformer
        form="rect" intensity={palette.envIntensity} color={palette.envKey}
        position={[0, 5, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]}
      />
      {/* Narrow side strips read as crisp specular edges on the facet borders. */}
      <Lightformer
        form="rect" intensity={palette.envIntensity * 1.5} color={palette.envRim}
        position={[-5, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[8, 2, 1]}
      />
      <Lightformer
        form="rect" intensity={palette.envIntensity * 1.1} color={palette.envFill}
        position={[5, -1, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 2, 1]}
      />
      {/* Warm bounce from below, so the underside is not dead. */}
      <Lightformer
        form="rect" intensity={palette.envIntensity * 0.6} color={palette.envFill}
        position={[0, -4, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 6, 1]}
      />
      {/* A ring catchlight — the round highlight that makes glass look polished. */}
      <Lightformer
        form="ring" intensity={palette.envIntensity * 2} color={palette.envRim}
        position={[-1.5, 2.5, 3.5]} scale={2.4}
      />
    </Environment>
  );
}

// The page ground, drawn in clip space behind everything. Two soft washes
// drift as the chapters change, so the light in the room moves with the
// camera rather than staying printed on the glass.
const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const backdropFragment = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uWashA;
  uniform vec3 uWashB;
  uniform float uStrengthA;
  uniform float uStrengthB;
  uniform float uChapter;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv;
    p.x *= uAspect;
    float c = uChapter;
    vec2 a = vec2((0.65 - 0.32 * sin(c * 1.05)) * uAspect, 0.82 - 0.12 * c + 0.03 * sin(uTime * 0.2));
    vec2 b = vec2((0.15 + 0.22 * c) * uAspect, 0.45 + 0.08 * cos(c * 1.3 + uTime * 0.15));
    float wa = 1.0 - smoothstep(0.0, 0.62, distance(p, a));
    float wb = 1.0 - smoothstep(0.0, 0.48, distance(p, b));
    vec3 col = mix(uBgDeep, uBg, smoothstep(0.0, 0.55, vUv.y));
    col = mix(col, uWashA, wa * uStrengthA);
    col = mix(col, uWashB, wb * uStrengthB);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Backdrop({ palette }) {
  const material = useRef();
  const { size } = useThree();
  const uniforms = useMemo(() => ({
    uBg: { value: new THREE.Color(palette.bg) },
    uBgDeep: { value: new THREE.Color(palette.bgDeep) },
    uWashA: { value: new THREE.Color(palette.washA) },
    uWashB: { value: new THREE.Color(palette.washB) },
    uStrengthA: { value: palette.washAStrength },
    uStrengthB: { value: palette.washBStrength },
    uChapter: { value: 0 },
    uTime: { value: 0 },
    uAspect: { value: 1 },
  }), [palette]);

  useFrame((state) => {
    if (!material.current) return;
    const u = material.current.uniforms;
    u.uChapter.value = state.journey.chapter;
    u.uTime.value = state.clock.elapsedTime;
    u.uAspect.value = size.width / Math.max(size.height, 1);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={backdropVertex}
        fragmentShader={backdropFragment}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// Holds the smoothed journey values every other component reads, so the
// sculpture, the stars and the tunnel all agree on where the camera is.
// Lives on the R3F state object to avoid threading a ref through every child.
function Journey({ scroll, revealed }) {
  const set = useThree((s) => s.set);
  const j = useRef({ chapter: 0, warp: 0, velocity: 0, enter: 0 });
  useEffect(() => { set({ journey: j.current }); }, [set]);

  useFrame((state, delta) => {
    const k = Math.min(delta * 3.2, 1);
    const v = j.current;
    v.chapter += (scroll.chapter - v.chapter) * k;
    v.velocity += (scroll.velocity - v.velocity) * Math.min(delta * 6, 1);
    v.warp = Math.min(1, Math.abs(v.velocity) / 38);
    v.enter += ((revealed ? 1 : 0) - v.enter) * Math.min(delta * 1.9, 1);
    state.journey = v;
  }, -1);
  return null;
}

function CameraRig({ pointer }) {
  const { camera } = useThree();
  useFrame((state) => {
    const { chapter: c, warp, velocity } = state.journey;
    const p = c / 3;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.current.x * 0.55, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.current.y * 0.35 - p * 0.35, 0.035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6.1 + Math.sin(p * Math.PI) * 0.45, 0.025);
    camera.lookAt(0, -p * 0.25, 0);
    // A roll into the direction of travel and a lens that widens with speed:
    // the two cues that make a flick of the wheel feel like acceleration.
    camera.rotateZ(THREE.MathUtils.clamp(velocity * -0.0016, -0.05, 0.05));
    const fov = 42 + warp * 9;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 0.12);
      camera.updateProjectionMatrix();
    }
    state.scene.rotation.y = THREE.MathUtils.lerp(state.scene.rotation.y, pointer.current.x * 0.06, 0.025);
  });
  return null;
}

// A deep field the camera travels through. Scroll moves every star toward the
// lens and wraps it to the back once it passes, so the field is endless in
// both directions and scrolling up flies backwards.
const warpVertex = /* glsl */ `
  attribute float aRand;
  uniform float uTravel;
  uniform float uTime;
  uniform float uWarp;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float depth = 40.0;
    p.z = mod(p.z + uTravel + uTime * (0.18 + aRand * 0.3), depth) - depth + 6.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.1);
    gl_PointSize = (1.4 + aRand * 2.2) * (1.0 + uWarp * 2.2) * uPixelRatio * (9.0 / dist);
    vAlpha = smoothstep(0.4, 2.8, dist) * (1.0 - smoothstep(24.0, 34.0, dist)) * (0.35 + 0.65 * aRand);
  }
`;

const warpFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uWarp;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.18, 0.5, d);
    gl_FragColor = vec4(uColor * (1.0 + uWarp * 1.4), disc * vAlpha * uOpacity);
  }
`;

function WarpField({ palette, count }) {
  const material = useRef();
  const travel = useRef(0);
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Keep a clear corridor down the middle so the stars stream past the
      // reader's line of sight rather than through the type.
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.4 + Math.pow(Math.random(), 0.7) * 9;
      pos[i * 3] = Math.cos(angle) * radius * 1.3;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 0.8;
      pos[i * 3 + 2] = Math.random() * 40;
      rand[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(() => ({
    uTravel: { value: 0 },
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uPixelRatio: { value: 1 },
    uOpacity: { value: 0 },
    uColor: { value: glowColor(palette.particles, palette.glow * 0.75) },
  }), [palette]);

  useFrame((state) => {
    if (!material.current) return;
    const { chapter, warp, enter } = state.journey;
    // Travel follows scroll position, not time: the field is a place the page
    // moves through, and returning to the top returns the stars too. The
    // entrance adds a rush inward as the curtain opens.
    travel.current = chapter * 11 + (1 - enter) * -14;
    const u = material.current.uniforms;
    u.uTravel.value = travel.current;
    u.uTime.value = state.clock.elapsedTime;
    u.uWarp.value = warp;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uOpacity.value = palette.particleOpacity * enter;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={warpVertex}
        fragmentShader={warpFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

// Gold rings strung along the depth axis. They stay out of sight through the
// hero, then the camera flies through them across Skills and arrives at
// Contact framed by the last few — a corridor between the two halves of the
// page.
const tunnelVertex = /* glsl */ `
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const tunnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    float a = smoothstep(0.6, 4.5, vDepth) * (1.0 - smoothstep(26.0, 46.0, vDepth));
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

const RINGS = 18;

function RingTunnel({ palette }) {
  const mesh = useRef();
  const group = useRef();
  const material = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const uniforms = useMemo(() => ({
    uColor: { value: glowColor(palette.tunnel, palette.glow) },
    uOpacity: { value: 0 },
  }), [palette]);

  useFrame((state, delta) => {
    if (!mesh.current || !material.current) return;
    const { chapter: c, warp } = state.journey;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < RINGS; i++) {
      dummy.position.set(Math.sin(i * 0.55 + c) * 0.9, Math.cos(i * 0.4) * 0.35, -6 - i * 3.1);
      dummy.rotation.set(Math.sin(i * 0.7) * 0.18, Math.cos(i * 0.5) * 0.18, i * 0.35 + t * (0.04 + (i % 3) * 0.02));
      dummy.scale.setScalar(1 + Math.sin(i * 1.7) * 0.18 + warp * 0.08);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    group.current.position.z = key([0, 6, 30, 46], c);
    group.current.rotation.z += delta * 0.03;
    material.current.uniforms.uOpacity.value = palette.tunnelOpacity * smooth(clamp01((c - 1.35) / 0.8));
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[null, null, RINGS]} frustumCulled={false}>
        <torusGeometry args={[3.3, 0.011, 8, 180]} />
        <shaderMaterial
          ref={material}
          vertexShader={tunnelVertex}
          fragmentShader={tunnelFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

// The sculpture breaks into its own triangles and the pieces are driven by
// scroll: whole at the top, scattered through the middle of the page, back
// together by the end.
//
// Every shard lives in one geometry and one draw call. Each vertex carries its
// triangle's centroid and a per-triangle random axis as attributes, so the
// vertex shader can push each face outward and spin it about its own centre
// without eighty separate meshes.
const shardVertex = /* glsl */ `
  attribute vec3 aCentroid;
  attribute vec3 aAxis;
  attribute float aRand;
  uniform float uExplode;
  varying float vRand;
  varying vec3 vNormalView;

  vec3 rotateAxis(vec3 v, vec3 axis, float angle) {
    float c = cos(angle), s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  void main() {
    vRand = aRand;
    vNormalView = normalize(normalMatrix * normal);

    vec3 local = position - aCentroid;
    local = rotateAxis(local, normalize(aAxis), uExplode * (2.0 + aRand * 3.4));
    vec3 drift = normalize(aCentroid) * uExplode * (0.55 + aRand * 1.35);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(aCentroid + local + drift, 1.0);
  }
`;

const shardFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vRand;
  varying vec3 vNormalView;

  void main() {
    float lambert = clamp(dot(normalize(vNormalView), normalize(vec3(0.35, 0.7, 0.62))), 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, vRand) * (0.42 + 0.8 * lambert);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

function Shards({ palette, explodeRef, cap = 0.26 }) {
  const material = useRef();

  const geometry = useMemo(() => {
    // Polyhedron geometry is already non-indexed: every triangle owns its three
    // vertices and can move alone.
    const g = new THREE.IcosahedronGeometry(1.3, 1);
    const pos = g.attributes.position;
    const count = pos.count;
    const centroid = new Float32Array(count * 3);
    const axis = new Float32Array(count * 3);
    const rand = new Float32Array(count);

    for (let i = 0; i < count; i += 3) {
      const mx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const my = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const mz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const r = Math.random();
      let ax = Math.random() * 2 - 1, ay = Math.random() * 2 - 1, az = Math.random() * 2 - 1;
      const len = Math.hypot(ax, ay, az) || 1;
      ax /= len; ay /= len; az /= len;

      for (let k = 0; k < 3; k++) {
        const v = i + k;
        centroid[v * 3] = mx; centroid[v * 3 + 1] = my; centroid[v * 3 + 2] = mz;
        axis[v * 3] = ax; axis[v * 3 + 1] = ay; axis[v * 3 + 2] = az;
        rand[v] = r;
      }
    }

    g.setAttribute("aCentroid", new THREE.BufferAttribute(centroid, 3));
    g.setAttribute("aAxis", new THREE.BufferAttribute(axis, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uExplode: { value: 0 },
      uOpacity: { value: 0 },
      uColorA: { value: new THREE.Color(palette.core) },
      uColorB: { value: new THREE.Color(palette.ring2) },
    }),
    [palette.core, palette.ring2]
  );

  useFrame((state) => {
    if (!material.current) return;
    const e = explodeRef.current;
    // Halved while the About cards hold the screen: the sculpture sits behind
    // their see-through panels there, and full-strength shards fight the copy.
    const c = state.journey.chapter;
    const behindCards = 1 - 0.55 * smooth(clamp01(1 - Math.abs(c - 1) / 0.7));
    material.current.uniforms.uExplode.value = e;
    // Invisible while whole, so the shards never z-fight the glass core they
    // are hidden inside. Capped well below opaque: these sit behind the whole
    // page, and at full strength they compete with the content instead of
    // sitting behind it.
    // The fracture only becomes visible past the hero — which is precisely
    // where the text lives — so this stays low enough to read through.
    material.current.uniforms.uOpacity.value = Math.min(cap, e * 0.6) * behindCards;
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={material}
        vertexShader={shardVertex}
        fragmentShader={shardFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Where the sculpture sits in each chapter. Hero: beside the headline. About:
// pulled back into the empty top-right, clear of the heading and cards. Skills: far off centre, fully
// fractured, the tunnel streaming round it. Contact: back together, beside the
// last call to action. On a narrow screen x is pulled toward centre.
const SCULPT_POS = [[1.65, 0.1, -0.8], [3.1, 1.55, -4.4], [0, -0.1, -7.5], [2.05, -0.15, -1.3]];
const SCULPT_EXPLODE = [0, 0.72, 1, 0];
const SCULPT_SPIN = [0, 1.2, 2.6, 4.2];

function HeroSculpture({ palette }) {
  const group = useRef();
  const core = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const explodeRef = useRef(0);
  const { size } = useThree();
  const narrow = size.width < 720;

  const ringAColor = useMemo(() => glowColor(palette.ring1, palette.glow), [palette]);
  const ringBColor = useMemo(() => glowColor(palette.ring2, palette.glow * 0.85), [palette]);

  useFrame((state, delta) => {
    if (!group.current || !core.current) return;
    const { chapter: c, warp, enter } = state.journey;

    group.current.visible = enter > 0.01;
    const [tx, ty, tz] = key(SCULPT_POS, c);
    const pos = group.current.position;
    pos.x = THREE.MathUtils.lerp(pos.x, narrow ? tx * 0.25 : tx, 0.06);
    pos.y = THREE.MathUtils.lerp(pos.y, narrow ? ty - 0.9 : ty, 0.06);
    // The sculpture assembles out of the distance as the curtain opens.
    pos.z = THREE.MathUtils.lerp(pos.z, tz - (1 - enter) * 5.5, 0.06);

    group.current.rotation.y += delta * (0.08 + warp * 0.6);
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    core.current.rotation.x -= delta * 0.18;
    core.current.rotation.z += delta * 0.12;

    const explodeTarget = enter > 0.5 ? key(SCULPT_EXPLODE, c) : 0;
    explodeRef.current += (explodeTarget - explodeRef.current) * Math.min(delta * 3, 1);
    const explode = explodeRef.current;

    // The glass core recedes as the shards take over, so the two never read as
    // two copies of the same object.
    const shrink = enter * (1 - Math.min(1, explode * 1.35));
    core.current.scale.setScalar(THREE.MathUtils.lerp(core.current.scale.x, Math.max(0, shrink), 0.08));
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -0.15 + key(SCULPT_SPIN, c) * 0.35, 0.05);

    // The rings counter-rotate and open out — they lag the core, which reads as
    // follow-through rather than one rigid object. At Contact they open widest
    // and frame the reassembled glass.
    const open = Math.sin(clamp01(c / 3) * Math.PI) * 0.5 + (c > 2 ? (c - 2) * 0.6 : 0);
    if (ringA.current) {
      ringA.current.rotation.z += delta * (0.12 + warp * 1.2 + open * 0.4);
      ringA.current.scale.setScalar(THREE.MathUtils.lerp(ringA.current.scale.x, 1 + open * 0.55, 0.05));
    }
    if (ringB.current) {
      ringB.current.rotation.z -= delta * (0.09 + warp * 0.9 + open * 0.3);
      ringB.current.scale.setScalar(THREE.MathUtils.lerp(ringB.current.scale.x, 1 + open * 0.85, 0.04));
    }
  });

  // Transmission refracts an off-screen render of the scene behind the mesh.
  // That buffer clears to the canvas colour — transparent, so black — which is
  // what kept the middle of the core dark even once the environment existed.
  // Rays passing straight through now land on the room colour instead.
  const glassBackdrop = useMemo(() => new THREE.Color(palette.envBg), [palette.envBg]);

  return (
    <group ref={group} position={[1.65, 0.1, -6.3]} rotation={[0.2, 0, -0.15]}>
      <Float speed={1.6} rotationIntensity={0.55} floatIntensity={0.7}>
        <mesh ref={core} scale={0}>
          <icosahedronGeometry args={[1.3, 1]} />
          <MeshTransmissionMaterial
            backside
            samples={narrow ? 2 : 4}
            resolution={narrow ? 256 : 512}
            thickness={palette.glassThickness}
            chromaticAberration={0.18}
            anisotropy={0.15}
            distortion={0.35}
            distortionScale={0.45}
            temporalDistortion={0.08}
            roughness={0.16}
            transmission={1}
            color={palette.glass}
            background={glassBackdrop}
          />
        </mesh>
      </Float>
      <mesh ref={ringA} rotation={[1.1, 0.3, 0.4]}>
        <torusGeometry args={[2.05, 0.018, 12, 160]} />
        <meshBasicMaterial color={ringAColor} transparent opacity={palette.ring1Opacity} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation={[0.25, 1.15, -0.4]}>
        <torusGeometry args={[1.72, 0.012, 12, 160]} />
        <meshBasicMaterial color={ringBColor} transparent opacity={palette.ring2Opacity} toneMapped={false} />
      </mesh>
      <Shards palette={palette} explodeRef={explodeRef} cap={narrow ? 0.12 : palette.shardCap} />
      <Sparkles count={38} scale={4.6} size={2.2} speed={0.22} color={palette.sparkle} />
    </group>
  );
}

// Bloom lifts only the over-bright gold; the colour split follows scroll speed,
// so the lens fringes when the page is flung and is clean at rest.
function Effects({ palette }) {
  const aberration = useRef();
  const offset = useMemo(() => new THREE.Vector2(0, 0), []);
  useFrame((state) => {
    const { warp, velocity } = state.journey;
    const amount = warp * 0.0042;
    offset.set(amount * Math.sign(velocity || 1) * 0.35, amount);
    if (aberration.current?.offset) aberration.current.offset.copy(offset);
  });
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={palette.bloom} luminanceThreshold={1.6} luminanceSmoothing={0.3} radius={0.72} />
      <ChromaticAberration ref={aberration} offset={offset} radialModulation modulationOffset={0.15} />
      <Vignette offset={0.28} darkness={palette.vignette} />
      {/* The composer renders off-screen, where three.js skips tone mapping,
          so it is applied here — without it the glass highlights clip white.
          Neutral rather than ACES: it leaves everything below the highlights
          untouched, so the page ground stays exactly --bg. */}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

function Scene({ pointer, scroll, revealed }) {
  // A hook here rather than a prop: memo() would otherwise freeze the scene on
  // whichever theme it first mounted with, since pointer/scroll never change.
  const themeName = useThemeName();
  const palette = PALETTE[themeName];
  // Phones get the journey without the post stack: bloom and MSAA on a
  // full-screen fixed canvas cost more frame time than a phone GPU can spare
  // alongside scrolling.
  const lite = typeof window !== "undefined"
    && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720);
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={lite ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 0, 6.1], fov: 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[palette.bg]} />
        <Journey scroll={scroll} revealed={revealed} />
        <Backdrop palette={palette} />
        <Suspense fallback={null}>
          <StudioEnvironment palette={palette} />
          <ambientLight intensity={palette.ambient} />
          <pointLight position={[4, 3, 5]} intensity={36} color={palette.key} />
          <pointLight position={[-4, -2, 3]} intensity={24} color={palette.fill} />
          <WarpField palette={palette} count={lite ? 700 : 1500} />
          <RingTunnel palette={palette} />
          <HeroSculpture palette={palette} />
          <CameraRig pointer={pointer} />
          {/* Light skips the post stack: there is nothing to bloom on cream, and
              tone mapping the whole frame would grey the page ground. */}
          {!lite && themeName === "dark" && <Effects palette={palette} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default memo(Scene);
