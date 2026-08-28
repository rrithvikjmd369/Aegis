import './style.css';
import * as THREE from 'three';

const canvas = document.getElementById('webgl');
const loaderEl = document.getElementById('loader');
const pctEl = document.getElementById('loaderPct');
const ringProgress = document.querySelector('.loader-progress');
const CIRC = 2 * Math.PI * 78;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.FogExp2(0x050506, 0.028);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 0, 8);

const clock = new THREE.Clock();
const mouse = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0, 0);

window.addEventListener('pointermove', (e) => {
  targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 1,
  roughness: 0.12,
  iridescence: 0.35,
  iridescenceIOR: 1.5,
  iridescenceThicknessRange: [120, 420],
  envMapIntensity: 1.4,
  clearcoat: 1,
  clearcoatRoughness: 0.08
});

const ghost = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.2,
  roughness: 0.25,
  transmission: 0.72,
  thickness: 1.4,
  transparent: true,
  opacity: 0.9,
  iridescence: 0.2
});

const wire = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.22
});

function makeEnv() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 512);
  grd.addColorStop(0, '#0a0a0c');
  grd.addColorStop(0.35, '#3a3a40');
  grd.addColorStop(0.55, '#f2f2f2');
  grd.addColorStop(0.7, '#6a6a70');
  grd.addColorStop(1, '#111114');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const env = makeEnv();
scene.environment = env;
chrome.envMap = env;
ghost.envMap = env;

function makeParticles(count, spread, size) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    spd[i] = 0.2 + Math.random() * 0.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.spread = spread;
  return pts;
}

const dust = makeParticles(1800, 28, 0.018);
scene.add(dust);

function makeLetterA() {
  const g = new THREE.Group();
  const bar = new THREE.BoxGeometry(0.22, 2.2, 0.22);
  const left = new THREE.Mesh(bar, chrome);
  left.rotation.z = 0.32;
  left.position.set(-0.38, 0, 0);
  const right = new THREE.Mesh(bar.clone(), chrome);
  right.rotation.z = -0.32;
  right.position.set(0.38, 0, 0);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.18), chrome);
  cross.position.set(0, -0.18, 0);
  g.add(left, right, cross);
  return g;
}

const emblem = new THREE.Group();
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.045, 24, 128), chrome);
const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.012, 12, 96), wire);
const letter = makeLetterA();
letter.scale.setScalar(0.72);
emblem.add(ring, ringInner, letter);
emblem.position.set(1.8, 0.15, 0);
scene.add(emblem);

function station(build) {
  const g = new THREE.Group();
  build(g);
  g.visible = false;
  scene.add(g);
  return g;
}

const memory = station((g) => {
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.8 - i * 0.18, 0.08, 1.8 - i * 0.18), i % 2 ? chrome : ghost);
    s.position.y = i * 0.28 - 0.5;
    g.add(s);
  }
});

const swarm = station((g) => {
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), chrome);
  g.add(core);
  g.userData.orbiters = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), ghost);
    g.add(m);
    g.userData.orbiters.push({ mesh: m, r: 1.1 + (i % 3) * 0.35, speed: 0.4 + i * 0.12, phase: i });
  }
});

const shield = station((g) => {
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), wire));
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), chrome));
});

const verify = station((g) => {
  const a = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 16, 80), chrome);
  const b = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 16, 80), ghost);
  b.rotation.x = Math.PI / 2;
  g.add(a, b);
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.28), chrome));
});

const gate = station((g) => {
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 16, 64), chrome);
  frame.rotation.x = Math.PI / 2;
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 24), ghost);
  g.add(frame, lock);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), chrome, 12);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
    dummy.updateMatrix();
    pins.setMatrixAt(i, dummy.matrix);
  }
  g.add(pins);
});

const analytics = station((g) => {
  g.userData.bars = [];
  for (let i = 0; i < 8; i++) {
    const h = 0.4 + Math.random() * 1.4;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1, 0.18), i % 2 ? chrome : ghost);
    bar.position.set((i - 3.5) * 0.32, 0, 0);
    bar.scale.y = h;
    g.add(bar);
    g.userData.bars.push({ mesh: bar, base: h });
  }
});

const problemObj = station((g) => {
  g.userData.shards = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.22 + Math.random() * 0.18), Math.random() > 0.5 ? chrome : wire);
    m.position.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.4);
    g.add(m);
    g.userData.shards.push(m);
  }
});

const impactObj = station((g) => {
  const grid = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 24), wire);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), chrome);
  g.add(grid, nucleus);
});

const waitObj = station((g) => {
  g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.18, 128, 16), chrome));
});

const objects = [
  emblem,
  problemObj,
  emblem,
  memory,
  swarm,
  shield,
  verify,
  gate,
  analytics,
  impactObj,
  waitObj
];

const camPath = [
  { pos: [0.15, 0.2, 7.2], look: [1.6, 0.1, 0] },
  { pos: [-1.4, 0.6, 6.2], look: [0.8, 0, 0] },
  { pos: [0.2, 0.1, 7.0], look: [1.7, 0.1, 0] },
  { pos: [0.4, 0.8, 6.4], look: [1.6, 0.1, 0] },
  { pos: [-0.2, 0.2, 6.6], look: [1.5, 0.05, 0] },
  { pos: [0.6, -0.2, 6.5], look: [1.55, 0.1, 0] },
  { pos: [-0.3, 0.4, 6.3], look: [1.5, 0.05, 0] },
  { pos: [0.2, 0.15, 6.5], look: [1.55, 0.08, 0] },
  { pos: [0.1, 0.5, 6.6], look: [1.5, 0.0, 0] },
  { pos: [0.0, 0.2, 7.0], look: [1.4, 0.1, 0] },
  { pos: [0.3, 0.0, 6.4], look: [1.5, 0.05, 0] }
];

const look = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookCur = new THREE.Vector3(1.6, 0.1, 0);

function lerpPath(t) {
  const n = camPath.length - 1;
  const f = THREE.MathUtils.clamp(t, 0, 0.999) * n;
  const i = Math.floor(f);
  const u = f - i;
  const a = camPath[i];
  const b = camPath[i + 1];
  camPos.set(
    THREE.MathUtils.lerp(a.pos[0], b.pos[0], u),
    THREE.MathUtils.lerp(a.pos[1], b.pos[1], u),
    THREE.MathUtils.lerp(a.pos[2], b.pos[2], u)
  );
  look.set(
    THREE.MathUtils.lerp(a.look[0], b.look[0], u),
    THREE.MathUtils.lerp(a.look[1], b.look[1], u),
    THREE.MathUtils.lerp(a.look[2], b.look[2], u)
  );
}

function setActive(index) {
  objects.forEach((obj, i) => {
    const on = i === index || (index === 2 && obj === emblem) || (index === 0 && obj === emblem);
    if (obj === emblem) {
      emblem.visible = index === 0 || index === 2;
      return;
    }
    obj.visible = on;
  });
}

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(4, 6, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0xcfd3dc, 1.2);
rim.position.set(-6, -2, -4);
scene.add(rim);

let load = 0;
const loadTarget = { v: 0 };

function tickLoader() {
  loadTarget.v = Math.min(1, loadTarget.v + 0.018 + Math.random() * 0.03);
  load += (loadTarget.v - load) * 0.12;
  const shown = Math.min(100, Math.floor(load * 100));
  pctEl.textContent = String(shown).padStart(2, '0');
  ringProgress.style.strokeDashoffset = String(CIRC * (1 - load));
  if (load > 0.995) {
    finishLoader();
    return;
  }
  requestAnimationFrame(tickLoader);
}

function finishLoader() {
  pctEl.textContent = '100';
  ringProgress.style.strokeDashoffset = '0';
  setTimeout(() => {
    loaderEl.classList.add('done');
    document.body.classList.add('ready');
  }, 280);
}

requestAnimationFrame(tickLoader);

const panels = [...document.querySelectorAll('.panel')];

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max <= 0 ? 0 : window.scrollY / max;
}

function nearestScene() {
  let best = 0;
  let dist = Infinity;
  panels.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    const d = Math.abs(r.top + r.height * 0.35 - window.innerHeight * 0.4);
    if (d < dist) {
      dist = d;
      best = Number(p.dataset.scene);
    }
  });
  return best;
}

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) document.body.classList.add('scrolled');
  else document.body.classList.remove('scrolled');
}, { passive: true });

document.getElementById('waitlistForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('email');
  if (!input.value) return;
  input.value = '';
  input.placeholder = 'Request received. We’ll be in touch.';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const dummyLook = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const p = scrollProgress();

  mouse.lerp(targetMouse, 0.06);
  lerpPath(p);
  camPos.x += mouse.x * 0.35;
  camPos.y += mouse.y * 0.2;
  camera.position.lerp(camPos, 0.075);
  lookCur.lerp(look, 0.08);
  dummyLook.copy(lookCur);
  camera.lookAt(dummyLook);

  const sceneIndex = nearestScene();
  setActive(sceneIndex);

  emblem.rotation.y = t * 0.18;
  ringInner.rotation.x = t * 0.12;
  letter.rotation.y = Math.sin(t * 0.4) * 0.08;

  problemObj.rotation.y = t * 0.15;
  problemObj.userData.shards.forEach((s, i) => {
    s.rotation.x = t * 0.3 + i;
    s.rotation.y = t * 0.2 + i * 0.4;
    s.position.y += Math.sin(t * 0.8 + i) * 0.002;
  });

  memory.rotation.y = t * 0.12;
  memory.children.forEach((c, i) => {
    c.rotation.y = Math.sin(t * 0.4 + i) * 0.12;
  });

  swarm.rotation.y = t * 0.08;
  swarm.userData.orbiters.forEach((o) => {
    const a = t * o.speed + o.phase;
    o.mesh.position.set(Math.cos(a) * o.r, Math.sin(a * 1.3) * 0.35, Math.sin(a) * o.r);
  });

  shield.rotation.y = t * 0.2;
  shield.rotation.x = t * 0.05;

  verify.rotation.y = t * 0.25;
  verify.rotation.z = Math.sin(t * 0.4) * 0.2;

  gate.rotation.y = t * 0.12;

  analytics.userData.bars.forEach((b, i) => {
    b.mesh.scale.y = b.base + Math.sin(t * 1.4 + i) * 0.18;
  });

  impactObj.rotation.y = t * 0.1;
  impactObj.children[0].rotation.x = t * 0.08;

  waitObj.rotation.x = t * 0.2;
  waitObj.rotation.y = t * 0.28;

  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) + 0.004;
    if (y > 14) y = -14;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  dust.rotation.y = t * 0.012;

  renderer.render(scene, camera);
}

animate();
