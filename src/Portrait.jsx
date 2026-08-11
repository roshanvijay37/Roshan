import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { memo, Suspense, useMemo, useRef } from "react";
import { useNearViewport } from "./components";
import * as THREE from "three";

// Depth is derived in the shader from an elliptical falloff rather than shipped
// as a depth-map image. The subject is centred and roughly elliptical, and the
// background is uniform bokeh, so an approximation reads convincingly — and it
// costs nothing to download and can be retuned by changing two uniforms.
const vertexShader = /* glsl */ `
  uniform float uDepth;
  uniform vec2 uCenter;
  uniform vec2 uRadii;
  varying vec2 vUv;
  varying float vDepth;

  float depthAt(vec2 uv) {
    vec2 p = (uv - uCenter) / uRadii;
    return 1.0 - smoothstep(0.55, 1.15, length(p));
  }

  void main() {
    vUv = uv;
    vDepth = depthAt(uv);
    vec3 pos = position;
    pos.z += vDepth * uDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Nearer things shift further across the frame than distant ones, so the
// texture lookup is offset by pointer * depth — the subject travels, the bokeh
// behind it barely does. That relationship is what sells it as depth rather
// than as a wobble.
const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2 uPointer;
  uniform float uStrength;
  uniform float uAberration;
  uniform float uPlaneAspect;
  uniform float uTexAspect;
  varying vec2 vUv;
  varying float vDepth;

  // The CSS this replaces used object-fit: cover. Without the same crop a
  // square photo gets stretched onto a 0.82 frame and the face elongates.
  vec2 cover(vec2 uv) {
    vec2 scale = uTexAspect > uPlaneAspect
      ? vec2(uPlaneAspect / uTexAspect, 1.0)
      : vec2(1.0, uTexAspect / uPlaneAspect);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec2 shift = uPointer * uStrength * vDepth;
    vec2 uv = cover(vUv) + shift;

    // A whisper of chromatic split at the edges of the depth transition, where
    // a real lens would show it.
    float edge = uAberration * (1.0 - abs(vDepth * 2.0 - 1.0));
    float r = texture2D(uTexture, uv + vec2(edge, 0.0)).r;
    vec4 base = texture2D(uTexture, uv);
    float b = texture2D(uTexture, uv - vec2(edge, 0.0)).b;

    gl_FragColor = vec4(r, base.g, b, 1.0);
    #include <colorspace_fragment>
  }
`;

function PortraitMesh({ src, pointer, reduced }) {
  const texture = useTexture(src);
  const { viewport } = useThree();
  const material = useRef();
  const mesh = useRef();
  const smoothed = useRef({ x: 0, y: 0 });

  // Without this the sampler treats an sRGB image as linear, the output stage
  // converts it again, and the photo comes out washed out.
  texture.colorSpace = THREE.SRGBColorSpace;

  const planeAspect = viewport.width / viewport.height;
  const texAspect = texture.image ? texture.image.width / texture.image.height : 1;

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: 0.055 },
      uAberration: { value: 0.0022 },
      // Anything pushed toward a perspective camera is magnified, so a large
      // displacement swells the middle of the frame into a fisheye — at 0.42
      // against a camera 3.4 away the face rendered 14% larger than the edges.
      // The depth people actually perceive comes from the UV offset below, so
      // this stays small enough to add form without bending the face.
      uDepth: { value: 0.1 },
      uCenter: { value: new THREE.Vector2(0.5, 0.45) },
      uRadii: { value: new THREE.Vector2(0.36, 0.62) },
      uPlaneAspect: { value: planeAspect },
      uTexAspect: { value: texAspect },
    }),
    [texture, planeAspect, texAspect]
  );

  useFrame(() => {
    if (!material.current || !mesh.current) return;
    const target = reduced ? { x: 0, y: 0 } : pointer.current;
    // Ease toward the pointer so the parallax glides instead of snapping.
    smoothed.current.x += (target.x - smoothed.current.x) * 0.06;
    smoothed.current.y += (target.y - smoothed.current.y) * 0.06;
    material.current.uniforms.uPointer.value.set(smoothed.current.x, smoothed.current.y);
    mesh.current.rotation.y = smoothed.current.x * 0.13;
    mesh.current.rotation.x = -smoothed.current.y * 0.1;
  });

  return (
    <mesh ref={mesh}>
      {/* Sized to the canvas viewport so the plane fills the frame exactly
          rather than overflowing it. Subdivided so the vertex displacement has
          geometry to bend. */}
      <planeGeometry args={[viewport.width, viewport.height, 96, 96]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function Portrait({ src, alt }) {
  const reduced = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(null);

  const track = (event) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const reset = () => { pointer.current.x = 0; pointer.current.y = 0; };
  // Below the fold at load: no reason to hold a WebGL context until approached.
  const near = useNearViewport(frame);

  return (
    <div className="portrait-canvas" ref={frame} onPointerMove={track} onPointerLeave={reset}>
      {/* A longer lens further back: same framing (2·z·tan(fov/2) is unchanged)
          but much flatter perspective, so what displacement remains barely
          changes scale across the frame. */}
      {near && (
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.26], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Falls back to nothing while the texture loads; the <img> underneath
            in the DOM stays visible until the canvas paints over it. */}
        <Suspense fallback={null}>
          <PortraitMesh src={src} pointer={pointer} reduced={reduced} />
        </Suspense>
      </Canvas>
      )}
      <img className="portrait-fallback" src={src} alt={alt} />
    </div>
  );
}

export default memo(Portrait);
