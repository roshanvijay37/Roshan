import { Float, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
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
    particles: "#b5b4ff", particleOpacity: 0.6,
    core: "#8c83ff",
    ring1: "#6ee7ff", ring1Opacity: 0.72,
    ring2: "#c084fc", ring2Opacity: 0.48,
    sparkle: "#ffffff",
    key: "#7dd3fc", fill: "#c084fc",
    ambient: 0.45,
  },
  light: {
    particles: "#7b6ce0", particleOpacity: 0.5,
    core: "#7a68ee",
    ring1: "#0e88ad", ring1Opacity: 0.5,
    ring2: "#8b5cf6", ring2Opacity: 0.34,
    sparkle: "#6d5cd8",
    key: "#3f9fd0", fill: "#8b5cf6",
    ambient: 0.95,
  },
};

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

function ParticleField({ palette }) {
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

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color={palette.particles} transparent opacity={palette.particleOpacity} sizeAttenuation />
    </points>
  );
}

function HeroSculpture({ palette, scrollRef }) {
  const group = useRef();
  const core = useRef();
  const ringA = useRef();
  const ringB = useRef();

  useFrame((state, delta) => {
    if (!group.current || !core.current) return;
    const scroll = scrollRef.current || 0;

    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    core.current.rotation.x -= delta * 0.18;
    core.current.rotation.z += delta * 0.12;

    // The sculpture reacts to reading position: it contracts and spins up as
    // you descend, so the hero object becomes a progress indicator rather than
    // an ornament that ignores the page.
    const shrink = 1 - scroll * 0.45;
    core.current.scale.setScalar(THREE.MathUtils.lerp(core.current.scale.x, shrink, 0.06));
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

  return (
    <group ref={group} position={[1.65, 0.1, -0.8]} rotation={[0.2, 0, -0.15]}>
      <Float speed={1.6} rotationIntensity={0.55} floatIntensity={0.7}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.3, 1]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={0.75}
            chromaticAberration={0.18}
            anisotropy={0.15}
            distortion={0.35}
            distortionScale={0.45}
            temporalDistortion={0.08}
            roughness={0.16}
            transmission={1}
            color={palette.core}
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
      <Sparkles count={38} scale={4.6} size={2.2} speed={0.22} color={palette.sparkle} />
    </group>
  );
}

function Scene({ pointer, scrollRef }) {
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
          <ambientLight intensity={palette.ambient} />
          <pointLight position={[4, 3, 5]} intensity={36} color={palette.key} />
          <pointLight position={[-4, -2, 3]} intensity={24} color={palette.fill} />
          <ParticleField palette={palette} />
          <HeroSculpture palette={palette} scrollRef={scrollRef} />
          <CameraRig pointer={pointer} scrollRef={scrollRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default memo(Scene);
