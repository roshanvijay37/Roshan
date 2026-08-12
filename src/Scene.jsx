import { Environment, Float, Lightformer, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThemeName } from "./components";

// The canvas is transparent, so every colour here is read against the page
// behind it. The dark values are luminous because they sit on near-black; on a
// white ground the same hues disappear, so light gets deeper, denser ones and a
// brighter ambient to compensate for losing the glow.
const PALETTE = {
  dark: {
    particles: "#e0c9a0", particleOpacity: 0.55,
    core: "#d9ae5f",
    ring1: "#f0d79a", ring1Opacity: 0.66,
    ring2: "#c2913f", ring2Opacity: 0.5,
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
  },
  light: {
    particles: "#a8823a", particleOpacity: 0.45,
    core: "#c09442",
    ring1: "#9a6f22", ring1Opacity: 0.46,
    ring2: "#8a6a14", ring2Opacity: 0.32,
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
  },
};

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

function CameraRig({ pointer, scrollRef }) {
  const { camera } = useThree();
  useFrame((state) => {
    const scroll = scrollRef.current || 0;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.current.x * 0.55, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.current.y * 0.35 - scroll * 0.35, 0.035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6.1 + Math.sin(scroll * Math.PI) * 0.45, 0.025);
    camera.lookAt(0, -scroll * 0.25, 0);
    state.scene.rotation.y = THREE.MathUtils.lerp(state.scene.rotation.y, pointer.current.x * 0.06, 0.025);
  });
  return null;
}

function ParticleField({ palette, revealed }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const values = new Float32Array(900 * 3);
    for (let i = 0; i < values.length; i += 3) {
      values[i] = (Math.random() - 0.5) * 16;
      values[i + 1] = (Math.random() - 0.5) * 12;
      values[i + 2] = (Math.random() - 0.5) * 10;
    }
    return values;
  }, []);

  const material = useRef();
  const entrance = useRef(0);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;

    // The field rushes inward from far out as the curtain opens, which gives
    // the reveal something moving behind the headline rather than a static
    // starfield that was clearly already there.
    const target = revealed ? 1 : 0;
    entrance.current += (target - entrance.current) * Math.min(delta * 1.7, 1);
    const enter = entrance.current;
    ref.current.scale.setScalar(1 + (1 - enter) * 1.9);
    if (material.current) material.current.opacity = palette.particleOpacity * enter;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={material} size={0.018} color={palette.particles} transparent opacity={0} sizeAttenuation />
    </points>
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

function Shards({ palette, explodeRef }) {
  const material = useRef();

  const geometry = useMemo(() => {
    // Non-indexed so every triangle owns its three vertices and can move alone.
    const g = new THREE.IcosahedronGeometry(1.3, 1).toNonIndexed();
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

  useFrame(() => {
    if (!material.current) return;
    const e = explodeRef.current;
    material.current.uniforms.uExplode.value = e;
    // Invisible while whole, so the shards never z-fight the glass core they
    // are hidden inside. Capped well below opaque: these sit behind the whole
    // page, and at full strength they compete with the content instead of
    // sitting behind it.
    // The fracture only becomes visible past the hero — which is precisely
    // where the text lives — so this stays low enough to read through.
    material.current.uniforms.uOpacity.value = Math.min(0.26, e * 0.6);
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

function HeroSculpture({ palette, scrollRef, revealed }) {
  const group = useRef();
  const core = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const explodeRef = useRef(0);
  // Eases 0 -> 1 once the curtain opens, so the sculpture assembles into the
  // hero instead of already sitting there when the panels part.
  const entrance = useRef(0);

  useFrame((state, delta) => {
    if (!group.current || !core.current) return;
    const scroll = scrollRef.current || 0;

    const target = revealed ? 1 : 0;
    entrance.current += (target - entrance.current) * Math.min(delta * 2.4, 1);
    const enter = entrance.current;
    group.current.visible = enter > 0.01;
    group.current.position.z = -0.8 - (1 - enter) * 5.5;

    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    core.current.rotation.x -= delta * 0.18;
    core.current.rotation.z += delta * 0.12;

    // Whole at the top, fully scattered around the middle of the page, back
    // together by the end — sin() gives exactly that arc with no keyframes.
    const explodeTarget = revealed ? Math.sin(Math.max(0, Math.min(1, scroll)) * Math.PI) : 0;
    explodeRef.current += (explodeTarget - explodeRef.current) * Math.min(delta * 3, 1);
    const explode = explodeRef.current;

    // The glass core recedes as the shards take over, so the two never read as
    // two copies of the same object.
    const shrink = (1 - scroll * 0.45) * enter * (1 - Math.min(1, explode * 1.35));
    core.current.scale.setScalar(THREE.MathUtils.lerp(core.current.scale.x, Math.max(0, shrink), 0.08));
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -0.15 + scroll * 1.4, 0.05);

    // The rings counter-rotate and open out — they lag the core, which reads as
    // follow-through rather than one rigid object.
    if (ringA.current) {
      ringA.current.rotation.z += delta * (0.12 + scroll * 0.9);
      ringA.current.scale.setScalar(THREE.MathUtils.lerp(ringA.current.scale.x, 1 + scroll * 0.5, 0.05));
    }
    if (ringB.current) {
      ringB.current.rotation.z -= delta * (0.09 + scroll * 0.7);
      ringB.current.scale.setScalar(THREE.MathUtils.lerp(ringB.current.scale.x, 1 + scroll * 0.8, 0.04));
    }
  });

  // Transmission refracts an off-screen render of the scene behind the mesh.
  // That buffer clears to the canvas colour — transparent, so black — which is
  // what kept the middle of the core dark even once the environment existed.
  // Rays passing straight through now land on the room colour instead.
  const glassBackdrop = useMemo(() => new THREE.Color(palette.envBg), [palette.envBg]);

  return (
    <group ref={group} position={[1.65, 0.1, -0.8]} rotation={[0.2, 0, -0.15]}>
      <Float speed={1.6} rotationIntensity={0.55} floatIntensity={0.7}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.3, 1]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
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
        <meshBasicMaterial color={palette.ring1} transparent opacity={palette.ring1Opacity} />
      </mesh>
      <mesh ref={ringB} rotation={[0.25, 1.15, -0.4]}>
        <torusGeometry args={[1.72, 0.012, 12, 160]} />
        <meshBasicMaterial color={palette.ring2} transparent opacity={palette.ring2Opacity} />
      </mesh>
      <Shards palette={palette} explodeRef={explodeRef} />
      <Sparkles count={38} scale={4.6} size={2.2} speed={0.22} color={palette.sparkle} />
    </group>
  );
}

function Scene({ pointer, scrollRef, revealed }) {
  // A hook here rather than a prop: memo() would otherwise freeze the scene on
  // whichever theme it first mounted with, since pointer/scrollRef never change.
  const palette = PALETTE[useThemeName()];
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.1], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <StudioEnvironment palette={palette} />
          <ambientLight intensity={palette.ambient} />
          <pointLight position={[4, 3, 5]} intensity={36} color={palette.key} />
          <pointLight position={[-4, -2, 3]} intensity={24} color={palette.fill} />
          <ParticleField palette={palette} revealed={revealed} />
          <HeroSculpture palette={palette} scrollRef={scrollRef} revealed={revealed} />
          <CameraRig pointer={pointer} scrollRef={scrollRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default memo(Scene);
