import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('c');
const turboFill = document.getElementById('turboFill');
const tdEl = document.getElementById('td');
const fpsEl = document.getElementById('fps');
const titleEl = document.getElementById('title');
const startBtn = document.getElementById('startBtn');
const scoreHome = document.getElementById('scoreHome');
const statusEl = document.getElementById('status');

const YARDS = { width: 53.33, length: 120 };
const FIELD_HALF_LEN = YARDS.length / 2;
const FIELD_HALF_W = YARDS.width / 2;

// Meshy biped rest pose often faces +Z; game "north" (toward far end zone) is +Z.
const MODEL_FORWARD_YAW = 0; // radians added to facing yaw

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

let playing = false;
startBtn.addEventListener('click', () => { titleEl.style.display = 'none'; playing = true; });
const params = new URLSearchParams(location.search);
if (params.has('autoplay')) {
  titleEl.style.display = 'none'; playing = true;
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6ec8ff);
scene.fog = new THREE.Fog(0x6ec8ff, 85, 180);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 250);
camera.position.set(0, 10.4, -31.5);
camera.up.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xfff2d9, 0x3a5a28, 1.15));
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(-20, 40, 10);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const texLoader = new THREE.TextureLoader();

function makeBench(x, z, lenAlongZ) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.35, lenAlongZ),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a })
  );
  seat.position.set(0, 0.35, 0); g.add(seat);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.1, lenAlongZ),
    new THREE.MeshLambertMaterial({ color: 0x1a3550 })
  );
  back.position.set(x > 0 ? 0.5 : -0.5, 0.9, 0); g.add(back);
  g.position.set(x, 0, z);
  scene.add(g);
}

function makeField() {
  const tex = texLoader.load('./assets/field_texture.jpg?v=meshy1');
  tex.flipY = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const geo = new THREE.PlaneGeometry(YARDS.width, YARDS.length);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(YARDS.width + 14, YARDS.length + 10),
    new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
  );
  track.rotation.x = -Math.PI / 2;
  track.position.y = -0.03;
  scene.add(track);

  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, YARDS.length),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sx * (FIELD_HALF_W + 2.2), -0.01, 0);
    scene.add(strip);
  }

  const crowdMat = new THREE.MeshLambertMaterial({ color: 0x5a3848, side: THREE.DoubleSide });
  const wallH = 8;
  for (const s of [
    { w: YARDS.length + 10, h: wallH, pos: [-FIELD_HALF_W - 7, wallH / 2, 0], ry: Math.PI / 2 },
    { w: YARDS.length + 10, h: wallH, pos: [FIELD_HALF_W + 7, wallH / 2, 0], ry: -Math.PI / 2 },
    { w: YARDS.width + 14, h: wallH, pos: [0, wallH / 2, -FIELD_HALF_LEN - 5], ry: 0 },
    { w: YARDS.width + 14, h: wallH, pos: [0, wallH / 2, FIELD_HALF_LEN + 5], ry: Math.PI },
  ]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), crowdMat);
    m.position.set(...s.pos); m.rotation.y = s.ry; scene.add(m);
  }

  function goalPost(z) {
    const g = new THREE.Group();
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.35, roughness: 0.45 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 8), yellow);
    post.position.y = 4; g.add(post);
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.2, 8), yellow);
    cross.rotation.z = Math.PI / 2; cross.position.y = 8; g.add(cross);
    for (const x of [-3.1, 3.1]) {
      const u = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), yellow);
      u.position.set(x, 10.6, 0); g.add(u);
    }
    g.position.set(0, 0, z); scene.add(g);
  }
  goalPost(50);
  goalPost(-50);

  makeBench(-FIELD_HALF_W - 3.2, -15, 18);
  makeBench(-FIELD_HALF_W - 3.2, 15, 18);
  makeBench(FIELD_HALF_W + 3.2, -15, 18);
  makeBench(FIELD_HALF_W + 3.2, 15, 18);

  const los = new THREE.Mesh(
    new THREE.PlaneGeometry(YARDS.width - 2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffe000, transparent: true, opacity: 0.85, depthWrite: false })
  );
  los.rotation.x = -Math.PI / 2; los.position.set(0, 0.025, -20); scene.add(los);
  const fd = new THREE.Mesh(
    new THREE.PlaneGeometry(YARDS.width - 2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.85, depthWrite: false })
  );
  fd.rotation.x = -Math.PI / 2; fd.position.set(0, 0.028, -10); scene.add(fd);
  return { los, fd };
}
const { los, fd } = makeField();

const CIRCLE_R = 0.55;
const playerCircle = new THREE.Mesh(
  new THREE.RingGeometry(CIRCLE_R * 0.82, CIRCLE_R, 48),
  new THREE.MeshBasicMaterial({ color: 0x2299ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
);
playerCircle.rotation.x = -Math.PI / 2; playerCircle.position.y = 0.04; scene.add(playerCircle);
const circleFill = new THREE.Mesh(
  new THREE.CircleGeometry(CIRCLE_R * 0.82, 48),
  new THREE.MeshBasicMaterial({ color: 0x1188ee, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
);
circleFill.rotation.x = -Math.PI / 2; circleFill.position.y = 0.035; scene.add(circleFill);

const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
});
const playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), shadowMat);
playerShadow.rotation.x = -Math.PI / 2;
playerShadow.position.y = 0.03;
playerShadow.renderOrder = 5;
scene.add(playerShadow);

const player = {
  x: 0, z: -25, vx: 0, vz: 0,
  yaw: 0, targetYaw: 0,
  turbo: 1,
  special: null, specialT: 0,
  mode: 'idle', // idle | run | sprint | spin
};

const playerRoot = new THREE.Group();
scene.add(playerRoot);

let mixer = null;
let actions = {};
let currentAction = null;
let modelReady = false;
let hipBone = null;
let hipRestLocal = null;

const BASE_SPEED = 12;
const TURBO_MULT = 1.7;
const ACCEL = 48;
const FRICTION = 30;
const YAW_LERP = 12; // higher = snappier facing

// Nominal ground speeds the clips were authored for (m/s), used to sync timeScale
const CLIP_SPEED = { run: 6.5, sprint: 9.5 };

function findClip(anims, ...names) {
  const lower = names.map((n) => n.toLowerCase());
  for (const a of anims) {
    const n = (a.name || '').toLowerCase();
    if (lower.some((x) => n === x || n.includes(x))) return a;
  }
  return null;
}

function stripRootMotion(clip) {
  // Drop translation tracks on hips / armature / root so character stays planted under playerRoot
  const keep = [];
  for (const track of clip.tracks) {
    const name = track.name;
    const isPos = name.endsWith('.position');
    const isRootish = /hips|armature|root|pelvis|mixamorig:hips/i.test(name.split('.')[0]);
    if (isPos && isRootish) continue;
    keep.push(track);
  }
  if (keep.length !== clip.tracks.length) {
    clip.tracks = keep;
  }
  return clip;
}

function setAction(name, fade = 0.22) {
  const next = actions[name];
  if (!next || next === currentAction) {
    if (next) player.mode = name;
    return;
  }
  next.reset();
  next.setEffectiveWeight(1);
  next.play();
  if (currentAction) currentAction.crossFadeTo(next, fade, false);
  currentAction = next;
  player.mode = name;
}

async function loadPlayer() {
  statusEl.textContent = 'Loading Meshy #8…';
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('./assets/player.glb?v=meshy-v1');
  const model = gltf.scene;

  // Normalize height to ~1.9 m, feet on ground
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.9 / Math.max(0.001, size.y);
  model.scale.setScalar(scale);
  box.setFromObject(model);
  model.position.y = -box.min.y;

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.FrontSide;
        }
      }
    }
    if (o.isBone) {
      const n = (o.name || '').toLowerCase();
      if (!hipBone && (n === 'hips' || n === 'hip' || n === 'pelvis')) hipBone = o;
    }
  });
  // Fallback: often first child of Armature
  if (!hipBone) {
    model.traverse((o) => {
      if (!hipBone && o.isBone && /hips|pelvis/i.test(o.name || '')) hipBone = o;
    });
  }
  if (hipBone) hipRestLocal = hipBone.position.clone();

  playerRoot.add(model);

  mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations.map((c) => {
    const clip = c.clone();
    stripRootMotion(clip);
    return clip;
  });

  const idleClip = findClip(clips, 'idle') || clips[0];
  const runClip = findClip(clips, 'runfast', 'run') || clips[1] || idleClip;
  const sprintClip = findClip(clips, 'lean_forward_sprint', 'sprint') || runClip;
  const spinClip = findClip(clips, 'quick_step_and_spin_dodge', 'spin', 'dodge') || null;

  actions.idle = mixer.clipAction(idleClip);
  actions.run = mixer.clipAction(runClip);
  actions.sprint = mixer.clipAction(sprintClip);
  if (spinClip) actions.spin = mixer.clipAction(spinClip);

  for (const a of Object.values(actions)) {
    a.enabled = true;
    a.setEffectiveTimeScale(1);
    a.setEffectiveWeight(0);
    a.play();
  }
  actions.idle.setEffectiveWeight(1);
  actions.idle.play();
  currentAction = actions.idle;
  if (actions.spin) {
    actions.spin.setLoop(THREE.LoopOnce, 1);
    actions.spin.clampWhenFinished = true;
  }

  modelReady = true;
  statusEl.textContent = 'Ready — 8-dir skeletal run';
  setTimeout(() => { statusEl.style.opacity = '0'; }, 2500);

  window.__tb = {
    player, camera, scene, playerRoot, mixer, actions, setAction,
    forceKeys: (codes) => { keys.clear(); for (const c of codes) keys.add(c); },
    clearKeys: () => keys.clear(),
    resetLook: () => {
      updateCamera._look = new THREE.Vector3(player.x, LOOK_Y, player.z + LOOK_NORTH_BIAS);
      camera.position.set(player.x, CAM_HEIGHT, player.z - CAM_BACK);
      camera.lookAt(updateCamera._look);
    },
    sampleNdc: () => {
      const v = new THREE.Vector3(player.x, 1.0, player.z).project(camera);
      return { x: v.x, y: v.y, z: v.z, px: player.x, pz: player.z, mode: player.mode };
    },
  };
}

loadPlayer().catch((err) => {
  console.error(err);
  statusEl.textContent = 'Failed to load player: ' + err.message;
});

function dirFromInput() {
  let dx = 0, dz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dz -= 1;
  return { dx, dz };
}

let homeScore = 0, tdCooldown = 0;
function resetPlayer() {
  player.x = 0; player.z = -25; player.vx = 0; player.vz = 0;
  player.yaw = 0; player.targetYaw = 0;
  player.special = null; player.specialT = 0;
  player.turbo = Math.max(player.turbo, 0.55);
  los.position.z = -20; fd.position.z = -10;
  document.getElementById('banner').textContent = '1st & 10';
  if (modelReady) setAction('idle', 0.15);
}
function showTD() {
  homeScore += 7; scoreHome.textContent = String(homeScore);
  tdEl.classList.add('show'); tdCooldown = 2.4;
  player.vx = 0; player.vz = 0;
  player.special = 'td'; player.specialT = 2.0;
  if (modelReady) setAction('idle', 0.2);
  setTimeout(() => { tdEl.classList.remove('show'); resetPlayer(); }, 2000);
}

function startSpin() {
  if (!actions.spin || player.special) return;
  player.special = 'spin';
  player.specialT = actions.spin.getClip().duration || 0.9;
  player.vx *= 1.2; player.vz *= 1.2;
  setAction('spin', 0.08);
}

function updatePlayer(dt) {
  if (!playing || !modelReady) return;

  if (tdCooldown > 0) tdCooldown -= dt;

  if (!player.special && tdCooldown <= 0) {
    if (keys.has('KeyQ')) startSpin();
  }

  if (player.special === 'spin') {
    player.specialT -= dt;
    if (player.specialT <= 0 || (actions.spin && !actions.spin.isRunning() && actions.spin.time >= actions.spin.getClip().duration - 0.05)) {
      player.special = null;
      // fall through to locomotion selection below
    }
  } else if (player.special === 'td') {
    player.specialT -= dt;
    if (player.specialT <= 0) player.special = null;
  }

  const { dx, dz } = dirFromInput();
  const turboHeld = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space');
  let usingTurbo = false;
  if (turboHeld && player.turbo > 0.02 && (dx || dz) && !player.special) {
    usingTurbo = true; player.turbo = Math.max(0, player.turbo - dt * 0.45);
  } else if (!player.special) {
    player.turbo = Math.min(1, player.turbo + dt * 0.22);
  }
  turboFill.style.width = `${(player.turbo * 100).toFixed(1)}%`;

  const moving = dx !== 0 || dz !== 0;
  if (moving && tdCooldown <= 0) {
    player.targetYaw = Math.atan2(dx, dz); // 0 = +Z (north)
  }

  // Smooth yaw
  let dy = player.targetYaw - player.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  player.yaw += dy * Math.min(1, YAW_LERP * dt);

  const speed = BASE_SPEED * (usingTurbo ? TURBO_MULT : 1);
  let tx = 0, tz = 0;
  if (moving && player.special !== 'td' && tdCooldown <= 0) {
    const len = Math.hypot(dx, dz) || 1;
    tx = (dx / len) * speed; tz = (dz / len) * speed;
  } else if (player.special === 'spin') {
    tx = player.vx; tz = player.vz;
  }

  const ax = tx - player.vx, az = tz - player.vz;
  const maxA = (moving && player.special !== 'td') ? ACCEL : FRICTION * (player.special === 'spin' ? 0.4 : 1);
  const al = Math.hypot(ax, az);
  if (al > 0.001 && tdCooldown <= 0) {
    const s = Math.min(1, (maxA * dt) / al);
    player.vx += ax * s; player.vz += az * s;
  }
  if (tdCooldown <= 0 || player.special === 'td') {
    player.x += player.vx * dt; player.z += player.vz * dt;
  }
  const maxX = FIELD_HALF_W - 1.2, maxZ = FIELD_HALF_LEN - 1.5;
  player.x = Math.max(-maxX, Math.min(maxX, player.x));
  player.z = Math.max(-maxZ, Math.min(maxZ, player.z));
  if (player.z >= 50 && tdCooldown <= 0) showTD();

  const ballZ = player.z;
  if (fd.position.z < ballZ - 0.5) {
    los.position.z = ballZ;
    fd.position.z = Math.min(50, ballZ + 10);
  }

  // Locomotion anim selection + foot-speed sync
  const groundSpeed = Math.hypot(player.vx, player.vz);
  if (player.special === 'spin') {
    // keep spin
  } else if (groundSpeed < 0.6 && !moving) {
    setAction('idle', 0.25);
    if (actions.idle) actions.idle.setEffectiveTimeScale(1);
  } else if (usingTurbo || groundSpeed > BASE_SPEED * 1.15) {
    setAction('sprint', 0.18);
    if (actions.sprint) {
      actions.sprint.setEffectiveTimeScale(THREE.MathUtils.clamp(groundSpeed / CLIP_SPEED.sprint, 0.75, 1.6));
    }
  } else {
    setAction('run', 0.18);
    if (actions.run) {
      actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(groundSpeed / CLIP_SPEED.run, 0.7, 1.55));
    }
  }
}

// Game camera: high above, slightly behind (world-south of player). Same arcade angle,
// tighter distance so #8 reads larger. Snappy XZ follow + velocity look-ahead so the
// player stays near screen center-low and never runs off the bottom (or any edge).
const CAM_HEIGHT = 10.4;
const CAM_BACK = 11.5;       // height/back ≈ 0.90 — same pitch as old 14.5/16
const LOOK_Y = 0.95;
const LOOK_AHEAD = 5.5;      // along move / facing
const LOOK_NORTH_BIAS = 2.0; // keeps player center-low when idle / running north
const CAM_FOLLOW = 0.000001; // pow base → near-locked follow (was 0.001, lagged south)
const LOOK_FOLLOW = 0.000001;

function updateCamera(dt) {
  camera.up.set(0, 1, 0);

  const ideal = new THREE.Vector3(player.x, CAM_HEIGHT, player.z - CAM_BACK);
  const follow = 1 - Math.pow(CAM_FOLLOW, dt);
  camera.position.lerp(ideal, follow);

  const spd = Math.hypot(player.vx, player.vz);
  let ax, az;
  if (spd > 0.8) {
    ax = player.vx / spd;
    az = player.vz / spd;
  } else {
    ax = Math.sin(player.yaw);
    az = Math.cos(player.yaw);
  }

  const look = new THREE.Vector3(
    player.x + ax * LOOK_AHEAD,
    LOOK_Y,
    player.z + az * LOOK_AHEAD + LOOK_NORTH_BIAS,
  );
  if (!updateCamera._look) updateCamera._look = look.clone();
  updateCamera._look.lerp(look, 1 - Math.pow(LOOK_FOLLOW, dt));
  camera.lookAt(updateCamera._look);

  // Soft framing spring: keep #8 near screen center-low in every direction.
  // Nudges look target when projection is sane so long south runs never leave frame.
  if (!updateCamera._ndc) updateCamera._ndc = new THREE.Vector3();
  const ndc = updateCamera._ndc.set(player.x, 1.0, player.z).project(camera);
  const sane = ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < 1.5 && Math.abs(ndc.y) < 1.5;
  if (sane) {
    const TARGET_Y = -0.30; // center-low
    const dy = ndc.y - TARGET_Y;
    const dx = ndc.x;
    // Dead-zone: only correct outside a small band
    let nudged = false;
    if (Math.abs(dy) > 0.12) {
      // +look.z → player moves down on screen with this arcade cam
      updateCamera._look.z += Math.max(-3.5, Math.min(3.5, dy * 7));
      nudged = true;
    }
    if (Math.abs(dx) > 0.35) {
      updateCamera._look.x += Math.max(-3.5, Math.min(3.5, dx * 6));
      nudged = true;
    }
    // Hard edge rescue
    if (ndc.y < -0.72 || ndc.y > 0.55 || Math.abs(ndc.x) > 0.82) {
      updateCamera._look.x = player.x + dx * -2;
      updateCamera._look.z = player.z + 4;
      nudged = true;
    }
    if (nudged) camera.lookAt(updateCamera._look);
  }
}

function syncMeshes() {
  playerRoot.position.set(player.x, 0, player.z);
  playerRoot.rotation.y = player.yaw + MODEL_FORWARD_YAW;

  // Kill residual root motion on hips each frame
  if (hipBone && hipRestLocal) {
    hipBone.position.x = hipRestLocal.x;
    hipBone.position.z = hipRestLocal.z;
  }

  playerCircle.position.x = player.x; playerCircle.position.z = player.z;
  circleFill.position.x = player.x; circleFill.position.z = player.z;
  playerCircle.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.03);
  playerShadow.position.x = player.x;
  playerShadow.position.z = player.z;
}

let last = performance.now(), frames = 0, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; frames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
  updatePlayer(dt);
  if (mixer) mixer.update(dt);
  updateCamera(dt);
  syncMeshes();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
