import { Billboard, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { memo, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useNearViewport, useThemeName } from "./components";

// One hue per discipline, tuned per theme — the light values are darkened so
// they hold contrast against a near-white page.
// Five metals rather than five arbitrary hues: gold, amber, rose gold, brass
// and copper. Still distinguishable enough for the legend to mean something,
// but all drawn from the same family so the sphere reads as one object.
const PALETTE = {
  dark: {
    shell: "#4a3f28",
    lang: "#e6c374",
    front: "#e0a760",
    motion: "#dd9a86",
    back: "#c4c47e",
    ops: "#c2913f",
  },
  light: {
    shell: "#d8cfb6",
    lang: "#8a6a14",
    front: "#9a5f14",
    motion: "#9c4f38",
    back: "#65701c",
    ops: "#8a5320",
  },
};

// Fibonacci distribution: the only cheap way to place N points on a sphere with
// roughly even spacing. Ring-based layouts crowd at the poles, which with text
// means labels overlapping into noise exactly where the sphere is busiest.
function spherePoints(count, radius) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    return [Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius];
  });
}

function SkillSphere({ groups, pointer }) {
  const colors = PALETTE[useThemeName()];
  const reduced = useReducedMotion();
  const root = useRef();
  const shell = useRef();
  const labels = useRef([]);
  const worldPos = useMemo(() => new THREE.Vector3(), []);

  const placed = useMemo(() => {
    const flat = groups.flatMap((g) => g.items.map((label) => ({ label, key: g.key })));
    const points = spherePoints(flat.length, 2.7);
    return flat.map((entry, i) => ({ ...entry, position: points[i] }));
  }, [groups]);

  const tick = useRef(0);

  useFrame((state, delta) => {
    if (root.current) {
      if (!reduced) root.current.rotation.y += delta * 0.075;
      const tx = reduced ? 0 : -pointer.current.y * 0.32;
      const tz = reduced ? 0 : pointer.current.x * 0.14;
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, tx, 0.05);
      root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, tz, 0.05);
    }
    if (shell.current && !reduced) shell.current.rotation.y -= delta * 0.03;

    // Depth fade. Without it every label renders at full strength and the cloud
    // reads flat — the far side is what tells the eye this is a sphere.
    // Every other frame: 43 material writes per frame is the single biggest cost
    // here, and at this rotation speed the difference is invisible.
    tick.current += 1;
    if (tick.current % 2) return;
    for (const item of labels.current) {
      if (!item) continue;
      item.getWorldPosition(worldPos);
      const depth = (worldPos.z + 2.7) / 5.4;
      item.children[0].fillOpacity = 0.12 + Math.max(0, Math.min(1, depth)) * 0.88;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={shell}>
        <icosahedronGeometry args={[2.7, 1]} />
        <meshBasicMaterial color={colors.shell} wireframe transparent opacity={0.14} />
      </mesh>
      {placed.map((item, i) => (
        <Billboard key={item.label} position={item.position} ref={(el) => { labels.current[i] = el; }}>
          <Text fontSize={0.145} color={colors[item.key]} anchorX="center" anchorY="middle">
            {item.label}
          </Text>
        </Billboard>
      ))}
    </group>
  );
}

function SkillOrbit({ groups }) {
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
    <div
      className="skill-orbit-3d"
      ref={frame}
      onPointerMove={track}
      onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}
    >
      {/* A long lens well back: at a wider angle the near labels render several
          times the size of the far ones and the sphere reads as a mess. */}
      {near && (
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 11.5], fov: 34 }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <SkillSphere groups={groups} pointer={pointer} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

export default memo(SkillOrbit);
