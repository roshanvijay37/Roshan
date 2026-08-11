import { Billboard, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { memo, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useNearViewport, useThemeName } from "./components";

const PALETTE = {
  dark: { ring: "#5b5570", chip: "#d6d5de", core: "#a99bff", spark: "#65d9ff" },
  light: { ring: "#c3c1d4", chip: "#3b3a48", core: "#6244f5", spark: "#0a7fa3" },
};

// One ring of skills tilted in space. Each sits on a circle, rotates as a group,
// but the labels billboard so they stay readable from any angle — the failure
// mode of naive 3D text is that half of it faces away and becomes noise.
function Ring({ items, radius, tilt, speed, colors, reduced, offsetY = 0 }) {
  const group = useRef();

  const placed = useMemo(
    () =>
      items.map((label, i) => {
        const angle = (i / items.length) * Math.PI * 2;
        return { label, position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] };
      }),
    [items, radius]
  );

  useFrame((_, delta) => {
    if (group.current && !reduced) group.current.rotation.y += delta * speed;
  });

  return (
    <group rotation={[tilt, 0, 0]} position={[0, offsetY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.006, 8, 120]} />
        <meshBasicMaterial color={colors.ring} transparent opacity={0.55} />
      </mesh>
      <group ref={group}>
        {placed.map(({ label, position }) => (
          <Billboard key={label} position={position}>
            <Text
              fontSize={0.12}
              color={colors.chip}
              anchorX="center"
              anchorY="middle"
              maxWidth={1.05}
              textAlign="center"
            >
              {label}
            </Text>
          </Billboard>
        ))}
      </group>
    </group>
  );
}

function OrbitScene({ skills, pointer }) {
  const theme = useThemeName();
  const colors = PALETTE[theme];
  const reduced = useReducedMotion();
  const root = useRef();
  const core = useRef();

  // Two rings so the arrangement reads as a volume rather than a flat dial.
  const [inner, outer] = useMemo(() => {
    const half = Math.ceil(skills.length / 2);
    return [skills.slice(0, half), skills.slice(half)];
  }, [skills]);

  useFrame((state, delta) => {
    if (root.current) {
      const tx = reduced ? 0 : pointer.current.x * 0.25;
      const ty = reduced ? 0 : -pointer.current.y * 0.2;
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, tx, 0.05);
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, ty, 0.05);
    }
    if (core.current && !reduced) {
      core.current.rotation.y += delta * 0.25;
      core.current.rotation.x += delta * 0.13;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshBasicMaterial color={colors.core} wireframe transparent opacity={0.6} />
      </mesh>
      {/* Radii are bounded by the visible frame: a label's half-width (~0.55)
          plus the radius has to stay inside the camera's half-extent (2.4 at
          this camera), or the outer ring's text clips against the canvas edge.
          The vertical offset and opposed tilts keep the two rings from
          occupying the same band, which is what made labels collide. */}
      <Ring items={inner} radius={1.2} tilt={0.5} speed={0.12} offsetY={0.42} colors={colors} reduced={reduced} />
      <Ring items={outer} radius={1.82} tilt={-0.4} speed={-0.085} offsetY={-0.42} colors={colors} reduced={reduced} />
    </group>
  );
}

function SkillOrbit({ skills }) {
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(null);
  const near = useNearViewport(frame);

  const track = (event) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  return (
    <div className="skill-orbit-3d" ref={frame} onPointerMove={track} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
      {/* Further back with a narrower field flattens the perspective, so a label
          on the near side is not three times the size of one on the far side. */}
      {near && (
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 7.4], fov: 36 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <OrbitScene skills={skills} pointer={pointer} />
        </Suspense>
      </Canvas>
      )}
    </div>
  );
}

export default memo(SkillOrbit);
