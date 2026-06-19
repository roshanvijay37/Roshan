import { Float, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

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

function ParticleField() {
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
      <pointsMaterial size={0.018} color="#b5b4ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function HeroSculpture() {
  const group = useRef();
  const core = useRef();
  useFrame((state, delta) => {
    if (!group.current || !core.current) return;
    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    core.current.rotation.x -= delta * 0.18;
    core.current.rotation.z += delta * 0.12;
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
            color="#8c83ff"
          />
        </mesh>
      </Float>
      <mesh rotation={[1.1, 0.3, 0.4]}>
        <torusGeometry args={[2.05, 0.018, 12, 160]} />
        <meshBasicMaterial color="#6ee7ff" transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[0.25, 1.15, -0.4]}>
        <torusGeometry args={[1.72, 0.012, 12, 160]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.48} />
      </mesh>
      <Sparkles count={38} scale={4.6} size={2.2} speed={0.22} color="#ffffff" />
    </group>
  );
}

function Scene({ pointer, scrollRef }) {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.1], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.45} />
          <pointLight position={[4, 3, 5]} intensity={36} color="#7dd3fc" />
          <pointLight position={[-4, -2, 3]} intensity={24} color="#c084fc" />
          <ParticleField />
          <HeroSculpture />
          <CameraRig pointer={pointer} scrollRef={scrollRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default memo(Scene);
