// Real WebGL, not CSS transforms on flat divs. The previous version rotated
// bordered <div>s in perspective — no geometry, no lighting, no depth sorting.
//
// The lighting is the lesson from fixing the site's glass core: a metal without
// an environment map has nothing to reflect and renders as a dark blob. So the
// room is generated once through PMREMGenerator and everything reads off it.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const cv = document.getElementById("orbitcv");
const host = cv.parentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.6, 8.4);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

const PALETTE = {
  light: { core: "#c8a04a", ring: "#8a6a14", bead: "#7d5f10", key: "#ffffff", fill: "#e6cb96", amb: 0.9, exposure: 1.25 },
  dark:  { core: "#e2b869", ring: "#e6c374", bead: "#fff3d6", key: "#ffd89b", fill: "#c2913f", amb: 0.42, exposure: 1.05 },
};
const themeName = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

const key = new THREE.DirectionalLight("#ffffff", 3.2); key.position.set(4, 5, 4); scene.add(key);
const fill = new THREE.DirectionalLight("#ffffff", 1.7); fill.position.set(-5, -2, -3); scene.add(fill);
const amb = new THREE.AmbientLight("#ffffff", 0.6); scene.add(amb);

const root = new THREE.Group();
root.rotation.z = -0.22;
scene.add(root);

// polished core
const coreMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.2 });
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 4), coreMat);
root.add(core);

// three real tori at different inclinations
const ringMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.28 });
const rings = [
  { r: 2.15, t: 0.018, rot: [1.42, 0.0, 0.0], spd: 0.16 },
  { r: 2.75, t: 0.012, rot: [1.15, 0.5, 0.35], spd: -0.11 },
  { r: 3.35, t: 0.008, rot: [1.6, -0.35, -0.2], spd: 0.07 },
].map((cfg) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.t, 10, 220), ringMat);
  m.rotation.set(...cfg.rot);
  m.userData.spd = cfg.spd;
  root.add(m);
  return m;
});

// beads that actually travel the rings in 3D
const beadMat = new THREE.MeshBasicMaterial();
const beads = [0, 1, 2].map((i) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), beadMat);
  b.userData = { ring: rings[i], radius: [2.15, 2.75, 3.35][i], phase: i * 2.1, spd: [0.7, -0.5, 0.34][i] };
  root.add(b);
  return b;
});

// a drift of shards, echoing the site's own motif
const shardGeo = new THREE.TetrahedronGeometry(0.075);
const shards = new THREE.InstancedMesh(shardGeo, ringMat, 46);
const dummy = new THREE.Object3D();
const seeds = Array.from({ length: 46 }, (_, i) => ({
  r: 1.7 + Math.random() * 2.4,
  a: Math.random() * Math.PI * 2,
  y: (Math.random() - 0.5) * 2.6,
  s: 0.5 + Math.random(),
  spin: Math.random() * 2,
}));
root.add(shards);

function applyTheme() {
  const p = PALETTE[themeName()];
  coreMat.color.set(p.core); ringMat.color.set(p.ring); beadMat.color.set(p.bead);
  key.color.set(p.key); fill.color.set(p.fill); amb.intensity = p.amb;
  renderer.toneMappingExposure = p.exposure;
}
applyTheme();
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);

// pointer parallax — the object should feel like it occupies space
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => {
  ptr.tx = (e.clientX / innerWidth - 0.5) * 2;
  ptr.ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

// Don't burn frames while it is scrolled away — this runs on an Iris Xe.
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }).observe(host);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (!reduced) {
    root.rotation.y += dt * 0.14;
    core.rotation.y -= dt * 0.09;
    core.rotation.x += dt * 0.04;
    rings.forEach((m) => { m.rotation.z += dt * m.userData.spd; });
    beads.forEach((b) => {
      const a = b.userData.phase + t * b.userData.spd;
      const local = new THREE.Vector3(Math.cos(a) * b.userData.radius, Math.sin(a) * b.userData.radius, 0);
      b.position.copy(local.applyEuler(b.userData.ring.rotation));
    });
    seeds.forEach((s, i) => {
      const a = s.a + t * 0.12 * s.s;
      dummy.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 0.5 + i) * 0.12, Math.sin(a) * s.r);
      dummy.rotation.set(t * s.spin, t * s.spin * 0.7, 0);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    });
    shards.instanceMatrix.needsUpdate = true;
  }

  ptr.x += (ptr.tx - ptr.x) * 0.045;
  ptr.y += (ptr.ty - ptr.y) * 0.045;
  camera.position.x = ptr.x * 0.9;
  camera.position.y = 0.6 - ptr.y * 0.6;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
});

window.__orbitReady = true;
