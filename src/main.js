import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('webgl');
const loaderEl = document.getElementById('loader');
const pctEl = document.getElementById('loaderPct');
const ringProgress = document.querySelector('.loader-progress');
const CIRC = 2 * Math.PI * 78;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.setClearColor(0x050506, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.FogExp2(0x050506, 0.022);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
camera.up.set(0, 1, 0);
camera.position.set(0, 0.2, 8.2);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.7, 0.18);
composer.addPass(bloom);

const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();

window.addEventListener('pointermove', (e) => {
  targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xf4f4f5,
  metalness: 1,
  roughness: 0.08,
  iridescence: 0.45,
  iridescenceIOR: 1.6,
  iridescenceThicknessRange: [80, 380],
  envMapIntensity: 1.6,
  clearcoat: 1,
  clearcoatRoughness: 0.05
});

const ghost = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.15,
  roughness: 0.18,
  transmission: 0.78,
  thickness: 1.2,
  transparent: true,
  opacity: 0.88,
  iridescence: 0.25
});

const wire = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.16
});

function makeEnv() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 512);
  grd.addColorStop(0, '#070709');
  grd.addColorStop(0.4, '#2c2c32');
  grd.addColorStop(0.55, '#f5f5f5');
  grd.addColorStop(0.72, '#6d6d74');
  grd.addColorStop(1, '#0b0b0e');
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

function makeDust(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 36;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xe8e8ec,
    size: 0.016,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
}
const dust = makeDust(2600);
scene.add(dust);

function addBodyPoints(arr, cx, cy, cz, rx, ry, rz, n) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random());
    arr.push(
      cx + Math.sin(v) * Math.cos(u) * rx * r,
      cy + Math.cos(v) * ry * r,
      cz + Math.sin(v) * Math.sin(u) * rz * r
    );
  }
}

function makeFigure() {
  const pts = [];
  addBodyPoints(pts, 0, 1.55, 0, 0.22, 0.26, 0.22, 280);
  addBodyPoints(pts, 0, 0.72, 0, 0.38, 0.62, 0.22, 720);
  addBodyPoints(pts, -0.55, 0.85, 0, 0.12, 0.48, 0.12, 220);
  addBodyPoints(pts, 0.55, 0.85, 0, 0.12, 0.48, 0.12, 220);
  addBodyPoints(pts, -0.16, -0.55, 0, 0.13, 0.7, 0.13, 280);
  addBodyPoints(pts, 0.16, -0.55, 0, 0.13, 0.7, 0.13, 280);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const cloud = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.028,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  cloud.position.set(2.05, -0.15, 0);
  return cloud;
}
const figure = makeFigure();
scene.add(figure);

function makeStroke(amp, lift, phase) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    pts.push(new THREE.Vector3(
      Math.sin(t * Math.PI * 2 + phase) * amp,
      (t - 0.5) * 3.2 + lift,
      Math.cos(t * Math.PI * 1.5 + phase) * (amp * 0.45)
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.012, 6, false), chrome);
  mesh.position.set(2.05, 0.1, 0);
  return mesh;
}
const strokes = [makeStroke(0.95, 0.1, 0.2), makeStroke(1.15, -0.15, 1.4), makeStroke(0.7, 0.35, 2.5)];
strokes.forEach((s) => scene.add(s));

function makeLetterA() {
  const g = new THREE.Group();
  const bar = new THREE.BoxGeometry(0.18, 1.9, 0.18);
  const left = new THREE.Mesh(bar, chrome);
  left.rotation.z = -0.34;
  left.position.set(-0.34, 0.05, 0);
  const right = new THREE.Mesh(bar.clone(), chrome);
  right.rotation.z = 0.34;
  right.position.set(0.34, 0.05, 0);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.14), chrome);
  cross.position.set(0, -0.22, 0);
  g.add(left, right, cross);
  return g;
}

const emblem = new THREE.Group();
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.035, 24, 160), chrome);
const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.01, 12, 120), wire);
const letter = makeLetterA();
letter.scale.setScalar(0.58);
emblem.add(ring, ringInner, letter);
emblem.position.set(-1.55, 0.35, 0.4);
scene.add(emblem);

function station(build) {
  const g = new THREE.Group();
  build(g);
  g.visible = false;
  g.position.set(1.85, 0.05, 0);
  scene.add(g);
  return g;
}

const memory = station((g) => {
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.7 - i * 0.16, 0.06, 1.7 - i * 0.16), i % 2 ? chrome : ghost);
    s.position.y = i * 0.24 - 0.45;
    g.add(s);
  }
});

const swarm = station((g) => {
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), chrome));
  g.userData.orbiters = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), ghost);
    g.add(m);
    g.userData.orbiters.push({ mesh: m, r: 0.95 + (i % 4) * 0.28, speed: 0.35 + i * 0.09, phase: i * 0.7 });
  }
});

const shield = station((g) => {
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), wire));
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), chrome));
});

const verify = station((g) => {
  const a = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 16, 80), chrome);
  const b = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 16, 80), ghost);
  b.rotation.x = Math.PI / 2;
  g.add(a, b, new THREE.Mesh(new THREE.OctahedronGeometry(0.24), chrome));
});

const gate = station((g) => {
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 16, 64), chrome);
  frame.rotation.x = Math.PI / 2;
  g.add(frame, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.62, 24), ghost));
});

const analytics = station((g) => {
  g.userData.bars = [];
  for (let i = 0; i < 8; i++) {
    const h = 0.45 + Math.random() * 1.2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), i % 2 ? chrome : ghost);
    bar.position.set((i - 3.5) * 0.3, 0, 0);
    bar.scale.y = h;
    g.add(bar);
    g.userData.bars.push({ mesh: bar, base: h });
  }
});

const problemObj = station((g) => {
  g.userData.shards = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18 + Math.random() * 0.16), Math.random() > 0.5 ? chrome : wire);
    m.position.set((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.2);
    g.add(m);
    g.userData.shards.push(m);
  }
});

const impactObj = station((g) => {
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 28), wire));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), chrome));
});

const waitObj = station((g) => {
  g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.62, 0.16, 140, 16), chrome));
});

const stageObjects = [null, problemObj, null, memory, swarm, shield, verify, gate, analytics, impactObj, waitObj];

const camPath = [
  { pos: [-0.4, 0.25, 7.4], look: [0.7, 0.15, 0] },
  { pos: [0.2, 0.4, 6.8], look: [1.6, 0.05, 0] },
  { pos: [-0.35, 0.2, 7.2], look: [0.6, 0.2, 0] },
  { pos: [0.15, 0.55, 6.6], look: [1.7, 0.05, 0] },
  { pos: [0.05, 0.2, 6.7], look: [1.7, 0.05, 0] },
  { pos: [0.2, 0.05, 6.6], look: [1.7, 0.08, 0] },
  { pos: [0.0, 0.35, 6.5], look: [1.7, 0.05, 0] },
  { pos: [0.15, 0.15, 6.6], look: [1.7, 0.05, 0] },
  { pos: [0.1, 0.4, 6.7], look: [1.7, 0.0, 0] },
  { pos: [-0.1, 0.25, 7.0], look: [1.6, 0.1, 0] },
  { pos: [0.2, 0.1, 6.5], look: [1.7, 0.05, 0] }
];

const look = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookCur = new THREE.Vector3(0.7, 0.15, 0);

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
  const showHero = index === 0 || index === 2;
  emblem.visible = showHero;
  figure.visible = showHero;
  strokes.forEach((s) => { s.visible = showHero; });
  stageObjects.forEach((obj, i) => {
    if (obj) obj.visible = i === index;
  });
}

scene.add(new THREE.AmbientLight(0xffffff, 0.18));
const key = new THREE.DirectionalLight(0xffffff, 2.3);
key.position.set(5, 7, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0xd4d4d8, 1.35);
rim.position.set(-7, 1, -5);
scene.add(rim);
const mouseLight = new THREE.PointLight(0xffffff, 6, 12);
scene.add(mouseLight);

let load = 0;
const loadTarget = { v: 0 };

function tickLoader() {
  loadTarget.v = Math.min(1, loadTarget.v + 0.016 + Math.random() * 0.028);
  load += (loadTarget.v - load) * 0.11;
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
  panels.forEach((p) => {
    const r = p.getBoundingClientRect();
    const d = Math.abs(r.top + r.height * 0.35 - window.innerHeight * 0.42);
    if (d < dist) {
      dist = d;
      best = Number(p.dataset.scene);
    }
  });
  return best;
}

window.addEventListener('scroll', () => {
  document.body.classList.toggle('scrolled', window.scrollY > 40);
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
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
});

const dummyLook = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const p = scrollProgress();

  mouse.lerp(targetMouse, 0.05);
  lerpPath(p);
  camPos.x += mouse.x * 0.42;
  camPos.y += mouse.y * 0.22;
  camera.up.set(0, 1, 0);
  camera.position.lerp(camPos, 0.07);
  lookCur.lerp(look, 0.07);
  dummyLook.copy(lookCur);
  camera.lookAt(dummyLook);
  mouseLight.position.set(mouse.x * 4, mouse.y * 3 + 1, 3);

  setActive(nearestScene());

  emblem.rotation.y = t * 0.16;
  ringInner.rotation.x = t * 0.1;
  letter.rotation.y = Math.sin(t * 0.35) * 0.06;

  figure.rotation.y = Math.sin(t * 0.18) * 0.12;
  figure.position.y = -0.15 + Math.sin(t * 0.7) * 0.06;
  strokes.forEach((s, i) => {
    s.rotation.y = t * (0.12 + i * 0.03);
    s.rotation.z = Math.sin(t * 0.4 + i) * 0.08;
  });

  if (problemObj.visible) {
    problemObj.rotation.y = t * 0.14;
    problemObj.userData.shards.forEach((s, i) => {
      s.rotation.x = t * 0.28 + i;
      s.rotation.y = t * 0.2 + i * 0.3;
    });
  }
  if (memory.visible) {
    memory.rotation.y = t * 0.1;
    memory.children.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.35 + i) * 0.1; });
  }
  if (swarm.visible) {
    swarm.userData.orbiters.forEach((o) => {
      const a = t * o.speed + o.phase;
      o.mesh.position.set(Math.cos(a) * o.r, Math.sin(a * 1.25) * 0.32, Math.sin(a) * o.r);
    });
  }
  if (shield.visible) {
    shield.rotation.y = t * 0.18;
    shield.rotation.x = t * 0.04;
  }
  if (verify.visible) {
    verify.rotation.y = t * 0.22;
    verify.rotation.z = Math.sin(t * 0.35) * 0.16;
  }
  if (gate.visible) gate.rotation.y = t * 0.1;
  if (analytics.visible) {
    analytics.userData.bars.forEach((b, i) => {
      b.mesh.scale.y = b.base + Math.sin(t * 1.3 + i) * 0.16;
    });
  }
  if (impactObj.visible) {
    impactObj.rotation.y = t * 0.09;
    impactObj.children[0].rotation.x = t * 0.07;
  }
  if (waitObj.visible) {
    waitObj.rotation.x = t * 0.16;
    waitObj.rotation.y = t * 0.22;
  }

  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) + 0.0035;
    if (y > 12) y = -12;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  dust.rotation.y = t * 0.01;

  composer.render();
}

animate();
