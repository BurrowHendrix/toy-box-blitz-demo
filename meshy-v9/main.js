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

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
  preserveDrawingBuffer: true, logarithmicDepthBuffer: true,
});
function applySize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
}
applySize();
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6ec8ff);
scene.fog = new THREE.Fog(0x6ec8ff, 85, 180);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.2, 300);
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
  const tex = texLoader.load('../meshy/assets/field_texture.jpg?v=meshy1');
  tex.flipY = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(YARDS.width, YARDS.length);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  scene.add(mesh);

  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(YARDS.width + 14, YARDS.length + 10),
    new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
  );
  track.rotation.x = -Math.PI / 2;
  track.position.y = -0.05;
  scene.add(track);

  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, YARDS.length),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sx * (FIELD_HALF_W + 2.2), -0.02, 0);
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

  const losMat = new THREE.MeshBasicMaterial({
    color: 0xffe000, transparent: true, opacity: 0.85, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const fdMat = new THREE.MeshBasicMaterial({
    color: 0xff2200, transparent: true, opacity: 0.85, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const los = new THREE.Mesh(new THREE.PlaneGeometry(YARDS.width - 2, 0.12), losMat);
  los.rotation.x = -Math.PI / 2; los.position.set(0, 0.04, -20); los.renderOrder = 2; scene.add(los);
  const fd = new THREE.Mesh(new THREE.PlaneGeometry(YARDS.width - 2, 0.12), fdMat);
  fd.rotation.x = -Math.PI / 2; fd.position.set(0, 0.045, -10); fd.renderOrder = 3; scene.add(fd);
  return { los, fd };
}
const { los, fd } = makeField();

const CIRCLE_R = 0.55;
const playerCircle = new THREE.Mesh(
  new THREE.RingGeometry(CIRCLE_R * 0.82, CIRCLE_R, 48),
  new THREE.MeshBasicMaterial({
    color: 0x2299ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  })
);
playerCircle.rotation.x = -Math.PI / 2; playerCircle.position.y = 0.05; playerCircle.renderOrder = 4; scene.add(playerCircle);
const circleFill = new THREE.Mesh(
  new THREE.CircleGeometry(CIRCLE_R * 0.82, 48),
  new THREE.MeshBasicMaterial({
    color: 0x1188ee, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  })
);
circleFill.rotation.x = -Math.PI / 2; circleFill.position.y = 0.048; circleFill.renderOrder = 4; scene.add(circleFill);

const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});
const playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), shadowMat);
playerShadow.rotation.x = -Math.PI / 2;
playerShadow.position.y = 0.03;
playerShadow.renderOrder = 1;
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
let spineBone = null;
let spine01Bone = null;
let carryBones = [];

const BALL_ARM = /^(RightShoulder|RightArm|RightForeArm|RightHand)$/i;
const LOCO_NAMES = ['jog', 'run', 'runVar', 'sprint'];

const loco = {
  phase: 0,
  varW: 0,
  varTimer: 2.8,
  startT: 0,
  stopT: 0,
  plantT: 0,
  lean: 0,
  yawRate: 0,
  prevMoving: false,
  mode: 'idle', // idle | start | loco | stop | plant | spin
};


const BASE_SPEED = 12;
const TURBO_MULT = 1.7;
const ACCEL = 48;
const FRICTION = 30;
const YAW_RATE = 10; // rad/s exponential yaw follow rate

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

function trackBone(name) {
  return (name || '').split('.')[0];
}

function stripBallArm(clip) {
  clip.tracks = clip.tracks.filter((t) => !BALL_ARM.test(trackBone(t.name)));
  return clip;
}

function evalTrack(track, time) {
  const t = THREE.MathUtils.clamp(time, 0, track.times[track.times.length - 1] || 0);
  return track.createInterpolant().evaluate(t);
}

function poseFromClip(clip, time) {
  const pose = new Map();
  for (const track of clip.tracks) pose.set(track.name, Array.from(evalTrack(track, time)));
  return pose;
}

function clipFromPoses(name, duration, poseA, poseB, steps = 10) {
  const tracks = [];
  for (const key of poseA.keys()) {
    if (!poseB.has(key)) continue;
    const a = poseA.get(key);
    const b = poseB.get(key);
    const times = [];
    const values = [];
    const isQ = key.endsWith('.quaternion');
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      times.push(u * duration);
      if (isQ && a.length >= 4 && b.length >= 4) {
        qa.set(a[0], a[1], a[2], a[3]);
        qb.set(b[0], b[1], b[2], b[3]);
        q.copy(qa).slerp(qb, u);
        values.push(q.x, q.y, q.z, q.w);
      } else {
        const n = Math.min(a.length, b.length);
        for (let k = 0; k < n; k++) values.push(a[k] + (b[k] - a[k]) * u);
      }
    }
    tracks.push(isQ
      ? new THREE.QuaternionKeyframeTrack(key, times, values)
      : new THREE.VectorKeyframeTrack(key, times, values));
  }
  return new THREE.AnimationClip(name, duration, tracks);
}

function amplitudeVariant(src, factor, name) {
  const clip = src.clone();
  clip.name = name;
  const q0 = new THREE.Quaternion();
  const qk = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.quaternion')) continue;
    const bone = trackBone(track.name);
    // Keep feet/hips closer to source so foot plants stay honest; damp upper body + legs slightly
    let f = factor;
    if (/Foot|Toe|Hips/i.test(bone)) f = Math.min(1, factor + 0.18);
    if (/Spine|Head|neck|Shoulder|Arm|Hand/i.test(bone)) f = Math.max(0.35, factor - 0.08);
    const arr = track.values;
    if (arr.length < 4) continue;
    q0.set(arr[0], arr[1], arr[2], arr[3]);
    for (let i = 0; i < arr.length; i += 4) {
      qk.set(arr[i], arr[i + 1], arr[i + 2], arr[i + 3]);
      q.copy(q0).slerp(qk, f);
      arr[i] = q.x; arr[i + 1] = q.y; arr[i + 2] = q.z; arr[i + 3] = q.w;
    }
  }
  return clip;
}

function twistVariant(src, name) {
  const clip = src.clone();
  clip.name = name;
  const extra = new THREE.Quaternion();
  extra.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.11);
  const qk = new THREE.Quaternion();
  for (const track of clip.tracks) {
    const bone = trackBone(track.name);
    if (!track.name.endsWith('.quaternion')) continue;
    if (!/Spine01|Spine02|LeftShoulder|LeftArm/i.test(bone)) continue;
    const arr = track.values;
    for (let i = 0; i < arr.length; i += 4) {
      qk.set(arr[i], arr[i + 1], arr[i + 2], arr[i + 3]);
      qk.multiply(extra);
      arr[i] = qk.x; arr[i + 1] = qk.y; arr[i + 2] = qk.z; arr[i + 3] = qk.w;
    }
  }
  return clip;
}

function holdPoseClip(src, time, name, duration = 1) {
  const pose = poseFromClip(src, time);
  const tracks = [];
  for (const [key, val] of pose) {
    if (key.endsWith('.quaternion')) {
      tracks.push(new THREE.QuaternionKeyframeTrack(key, [0, duration], val.concat(val)));
    } else {
      tracks.push(new THREE.VectorKeyframeTrack(key, [0, duration], val.concat(val)));
    }
  }
  return new THREE.AnimationClip(name, duration, tracks);
}

function makeAction(clip, { loop = THREE.LoopRepeat, paused = false, weight = 0 } = {}) {
  const a = mixer.clipAction(clip);
  a.enabled = true;
  a.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
  if (loop === THREE.LoopOnce) a.clampWhenFinished = true;
  a.setEffectiveTimeScale(1);
  a.setEffectiveWeight(weight);
  a.play();
  a.paused = paused;
  return a;
}

function zeroLocoWeights() {
  for (const n of LOCO_NAMES) {
    if (actions[n]) actions[n].setEffectiveWeight(0);
  }
}

function locoWeights(speed) {
  // Phase-synced blend space: jog -> run -> sprint, weights by ground speed
  const jog = 5.5, run = 11.5, sprint = 17.5;
  const w = { jog: 0, run: 0, sprint: 0 };
  if (speed <= jog) w.jog = 1;
  else if (speed < run) {
    const t = (speed - jog) / (run - jog);
    w.jog = 1 - t; w.run = t;
  } else if (speed < sprint) {
    const t = (speed - run) / (sprint - run);
    w.run = 1 - t; w.sprint = t;
  } else w.sprint = 1;
  return w;
}

function applyLocoWeights(base, varW) {
  const runA = (base.run || 0) * (1 - varW);
  const runB = (base.run || 0) * varW;
  const map = { jog: base.jog || 0, run: runA, runVar: runB, sprint: base.sprint || 0 };
  for (const [n, w] of Object.entries(map)) {
    if (actions[n]) actions[n].setEffectiveWeight(w);
  }
}

function syncLocoPhase() {
  for (const n of LOCO_NAMES) {
    const a = actions[n];
    if (!a) continue;
    const dur = a.getClip().duration || 1;
    a.paused = true;
    a.time = (loco.phase % 1) * dur;
    a.enabled = true;
  }
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

async function loadPlayer() {
  statusEl.textContent = 'Loading Meshy #8…';
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('../meshy/assets/player.glb?v=meshy-v1');
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
  model.traverse((o) => {
    if (!o.isBone) return;
    const n = o.name || '';
    if (!spineBone && n === 'Spine') spineBone = o;
    if (!spine01Bone && (n === 'Spine01' || n === 'Spine1')) spine01Bone = o;
    if (BALL_ARM.test(n)) carryBones.push(o);
  });

  playerRoot.add(model);

  mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations.map((c) => {
    const clip = c.clone();
    stripRootMotion(clip);
    return clip;
  });

  const idleClip = findClip(clips, 'idle') || clips[0];
  const runSrc = findClip(clips, 'runfast', 'run') || clips[1] || idleClip;
  const sprintSrc = findClip(clips, 'lean_forward_sprint', 'sprint') || runSrc;
  const spinClip = findClip(clips, 'quick_step_and_spin_dodge', 'spin', 'dodge') || null;

  // Lower+free-arm locomotion; ball-carry arm is a separate upper-body layer.
  const runClip = stripBallArm(runSrc.clone());
  const sprintClip = stripBallArm(sprintSrc.clone());
  const jogClip = stripBallArm(amplitudeVariant(runSrc, 0.62, 'JogDerived'));
  const runVarClip = stripBallArm(twistVariant(runSrc, 'RunVarDerived'));
  const idleBody = stripBallArm(idleClip.clone());

  const startClip = stripBallArm(clipFromPoses(
    'StartAccel', 0.34,
    poseFromClip(idleBody, 0),
    poseFromClip(runClip, 0.0),
  ));
  const stopClip = stripBallArm(clipFromPoses(
    'StopDecel', 0.40,
    poseFromClip(runClip, 0.0),
    poseFromClip(idleBody, 0),
  ));
  const plantClip = stripBallArm(holdPoseClip(runClip, 0.0, 'CutPlant', 0.22));
  const carryClip = (() => {
    const pose = poseFromClip(idleClip, 0);
    const tracks = [];
    for (const [key, val] of pose) {
      if (!BALL_ARM.test(trackBone(key))) continue;
      if (key.endsWith('.quaternion')) {
        tracks.push(new THREE.QuaternionKeyframeTrack(key, [0, 1], val.concat(val)));
      } else if (key.endsWith('.position')) {
        tracks.push(new THREE.VectorKeyframeTrack(key, [0, 1], val.concat(val)));
      }
    }
    return new THREE.AnimationClip('BallCarry', 1, tracks);
  })();

  actions.idle = makeAction(idleBody, { weight: 1 });
  actions.jog = makeAction(jogClip, { paused: true, weight: 0 });
  actions.run = makeAction(runClip, { paused: true, weight: 0 });
  actions.runVar = makeAction(runVarClip, { paused: true, weight: 0 });
  actions.sprint = makeAction(sprintClip, { paused: true, weight: 0 });
  actions.start = makeAction(startClip, { loop: THREE.LoopOnce, weight: 0 });
  actions.stop = makeAction(stopClip, { loop: THREE.LoopOnce, weight: 0 });
  actions.plant = makeAction(plantClip, { loop: THREE.LoopOnce, weight: 0 });
  actions.carry = makeAction(carryClip, { weight: 1 });
  if (spinClip) actions.spin = makeAction(spinClip, { loop: THREE.LoopOnce, weight: 0 });

  currentAction = actions.idle;
  loco.mode = 'idle';

  modelReady = true;
  statusEl.textContent = 'Ready — locomotion set (jog/run/sprint blend)';
  setTimeout(() => { statusEl.style.opacity = '0'; }, 2500);

  window.__tb = {
    player, camera, scene, playerRoot, mixer, actions, setAction, loco,
    forceKeys: (codes) => { keys.clear(); for (const c of codes) keys.add(c); },
    clearKeys: () => keys.clear(),
    resetLook: () => {
      updateCamera._look = new THREE.Vector3(player.x, LOOK_Y, player.z + LOOK_NORTH_BIAS);
      camera.position.set(player.x, CAM_HEIGHT, player.z - CAM_BACK);
      camera.lookAt(updateCamera._look);
    },
    sampleNdc: () => {
      const v = new THREE.Vector3(player.x, 1.0, player.z).project(camera);
      return {
        x: v.x, y: v.y, z: v.z,
        px: player.x, pz: player.z,
        cx: camera.position.x, cy: camera.position.y, cz: camera.position.z,
        lx: updateCamera._look ? updateCamera._look.x : 0,
        lz: updateCamera._look ? updateCamera._look.z : 0,
        mode: player.mode,
      };
    },
    step: (dt) => stepSimulation(dt),
  };
}

loadPlayer().catch((err) => {
  console.error(err);
  statusEl.textContent = 'Failed to load player: ' + err.message;
});

function dirFromInput() {
  // Screen-relative strafe from the game cam (looking +Z / north):
  // Three.js view has world +X on screen-LEFT and world -X on screen-RIGHT.
  let dx = 0, dz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx += 1;   // screen-left
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx -= 1;  // screen-right
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
  if (modelReady) {
    zeroLocoWeights();
    if (actions.start) actions.start.setEffectiveWeight(0);
    if (actions.stop) actions.stop.setEffectiveWeight(0);
    if (actions.plant) actions.plant.setEffectiveWeight(0);
    actions.idle.reset();
    actions.idle.setEffectiveWeight(1);
    currentAction = actions.idle;
    player.mode = 'idle';
    loco.mode = 'idle';
    loco.startT = loco.stopT = loco.plantT = 0;
  }
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

  // Smooth yaw (frame-rate independent exponential)
  let dyaw = player.targetYaw - player.yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  const yawStep = dyaw * (1 - Math.exp(-YAW_RATE * dt));
  player.yaw += yawStep;
  loco.yawRate = dt > 1e-5 ? yawStep / dt : 0;

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

  const groundSpeed = Math.hypot(player.vx, player.vz);
  updateLocomotion(dt, {
    moving, usingTurbo, groundSpeed,
    headingErr: wrapPi(player.targetYaw - player.yaw),
  });
}

function fadeWeight(action, target, dt, rate = 10) {
  if (!action) return;
  const cur = action.getEffectiveWeight();
  action.setEffectiveWeight(cur + (target - cur) * (1 - Math.exp(-rate * dt)));
}

function updateLocomotion(dt, { moving, usingTurbo, groundSpeed, headingErr }) {
  if (!modelReady || !mixer) return;

  if (player.special === 'spin') {
    zeroLocoWeights();
    fadeWeight(actions.idle, 0, dt, 14);
    fadeWeight(actions.start, 0, dt, 16);
    fadeWeight(actions.stop, 0, dt, 16);
    fadeWeight(actions.plant, 0, dt, 16);
    fadeWeight(actions.carry, 0, dt, 12); // full-body spin, no carry mask
    if (actions.spin) {
      actions.spin.paused = false;
      fadeWeight(actions.spin, 1, dt, 18);
    }
    player.mode = 'spin';
    loco.mode = 'spin';
    loco.prevMoving = moving;
    return;
  }
  if (actions.spin) fadeWeight(actions.spin, 0, dt, 14);
  fadeWeight(actions.carry, 1, dt, 8);

  // Variation: swap run-cycle flavor every few seconds at a foot-plant (phase wrap)
  loco.varTimer -= dt;
  if (loco.varTimer <= 0 && loco.phase < 0.08) {
    loco.varW = loco.varW > 0.5 ? 0 : 1;
    loco.varTimer = 2.4 + Math.random() * 1.6;
  }

  const wantMove = moving && player.special !== 'td';
  const justStarted = wantMove && !loco.prevMoving;
  const justStopped = !wantMove && loco.prevMoving;
  loco.prevMoving = wantMove;

  const sharpCut = wantMove && Math.abs(headingErr) > 1.15 && groundSpeed > 3.2;

  if (justStarted && loco.mode !== 'start') {
    loco.mode = 'start';
    loco.startT = actions.start ? (actions.start.getClip().duration || 0.34) : 0.34;
    if (actions.start) {
      actions.start.reset();
      actions.start.paused = false;
      actions.start.setEffectiveWeight(1);
      actions.start.play();
    }
    fadeWeight(actions.idle, 0, dt, 18);
    fadeWeight(actions.stop, 0, dt, 18);
    player.mode = 'start';
  } else if (sharpCut && loco.mode === 'loco') {
    loco.mode = 'plant';
    loco.plantT = 0.20;
    loco.phase = (loco.phase < 0.25 || loco.phase > 0.75) ? 0 : 0.5;
    if (actions.plant) {
      actions.plant.reset();
      actions.plant.paused = false;
      actions.plant.setEffectiveWeight(1);
      actions.plant.play();
    }
    player.mode = 'plant';
  } else if (justStopped && groundSpeed > 0.8 && loco.mode !== 'idle') {
    loco.mode = 'stop';
    loco.stopT = actions.stop ? (actions.stop.getClip().duration || 0.4) : 0.4;
    if (actions.stop) {
      actions.stop.reset();
      actions.stop.paused = false;
      actions.stop.setEffectiveWeight(1);
      actions.stop.play();
    }
    zeroLocoWeights();
    player.mode = 'stop';
  }

  if (loco.mode === 'start') {
    loco.startT -= dt;
    fadeWeight(actions.idle, 0, dt, 14);
    fadeWeight(actions.start, 1, dt, 16);
    zeroLocoWeights();
    if (loco.startT <= 0) {
      fadeWeight(actions.start, 0, dt, 18);
      loco.mode = 'loco';
      loco.phase = 0;
    }
  } else if (loco.mode === 'plant') {
    loco.plantT -= dt;
    fadeWeight(actions.plant, 1, dt, 16);
    fadeWeight(actions.start, 0, dt, 16);
    const base = locoWeights(groundSpeed);
    applyLocoWeights(base, loco.varW);
    // keep legs at the planted contact while the cut plays
    syncLocoPhase();
    if (loco.plantT <= 0) {
      fadeWeight(actions.plant, 0, dt, 14);
      loco.mode = 'loco';
    }
  } else if (loco.mode === 'stop') {
    loco.stopT -= dt;
    fadeWeight(actions.stop, 1, dt, 14);
    fadeWeight(actions.start, 0, dt, 16);
    fadeWeight(actions.plant, 0, dt, 16);
    zeroLocoWeights();
    if (loco.stopT <= 0 || groundSpeed < 0.35) {
      fadeWeight(actions.stop, 0, dt, 10);
      fadeWeight(actions.idle, 1, dt, 10);
      loco.mode = 'idle';
      player.mode = 'idle';
    }
  } else if (!wantMove && groundSpeed < 0.55) {
    loco.mode = 'idle';
    player.mode = 'idle';
    fadeWeight(actions.idle, 1, dt, 9);
    fadeWeight(actions.start, 0, dt, 12);
    fadeWeight(actions.stop, 0, dt, 10);
    fadeWeight(actions.plant, 0, dt, 12);
    zeroLocoWeights();
  } else {
    loco.mode = 'loco';
    const base = locoWeights(Math.max(groundSpeed, wantMove ? 4.2 : groundSpeed));
    const cadJog = 1.55, cadRun = 2.15, cadSprint = 2.65;
    const cadence = (base.jog * cadJog) + (base.run * cadRun) + (base.sprint * cadSprint);
    loco.phase = (loco.phase + dt * cadence) % 1;
    applyLocoWeights(base, loco.varW);
    syncLocoPhase();
    fadeWeight(actions.idle, 0, dt, 12);
    fadeWeight(actions.start, 0, dt, 14);
    fadeWeight(actions.stop, 0, dt, 14);
    fadeWeight(actions.plant, 0, dt, 12);
    player.mode = base.sprint > 0.55 ? 'sprint' : (base.jog > 0.55 ? 'jog' : 'run');
  }

  // Banking / lean into turns (additive upper-body after mixer in syncMeshes)
  const leanTarget = THREE.MathUtils.clamp(-headingErr * 0.55 - loco.yawRate * 0.12, -0.42, 0.42);
  loco.lean += (leanTarget - loco.lean) * (1 - Math.exp(-9 * dt));
}

// Game camera: high above, slightly behind (world-south). Single controller —
// exp-smoothed follow + mild velocity look-ahead. NO per-frame NDC spring
// (that fought look-ahead and shook hard at 60–144Hz while screenshots looked fine).
const CAM_HEIGHT = 10.4;
const CAM_BACK = 11.5;
const LOOK_Y = 0.95;
const LOOK_AHEAD = 3.0;       // mild, along velocity / facing
const LOOK_NORTH_BIAS = 4.5;  // frames player center-low from arcade cam
const CAM_POS_RATE = 9;      // 1-exp(-k*dt) follow rates
const CAM_LOOK_RATE = 10;

function expAlpha(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

function updateCamera(dt) {
  camera.up.set(0, 1, 0);

  const idealPos = updateCamera._idealPos || (updateCamera._idealPos = new THREE.Vector3());
  idealPos.set(player.x, CAM_HEIGHT, player.z - CAM_BACK);
  camera.position.lerp(idealPos, expAlpha(CAM_POS_RATE, dt));

  const spd = Math.hypot(player.vx, player.vz);
  let ax = 0, az = 1;
  if (spd > 0.8) {
    ax = player.vx / spd;
    az = player.vz / spd;
  } else if (spd > 0.05 || keys.size) {
    ax = Math.sin(player.yaw);
    az = Math.cos(player.yaw);
  }

  const idealLook = updateCamera._idealLook || (updateCamera._idealLook = new THREE.Vector3());
  // Look mostly north of player (center-low framing) with a little velocity lead.
  // Keep lead modest so left/right screen motion matches world motion (no overshoot flip).
  // No lateral look-ahead: ax lead put the player on the opposite side of
  // screen-center while strafing, which felt like left/right were swapped.
  idealLook.set(
    player.x,
    LOOK_Y,
    player.z + az * LOOK_AHEAD * 0.4 + LOOK_NORTH_BIAS,
  );
  if (!updateCamera._look) updateCamera._look = idealLook.clone();
  updateCamera._look.lerp(idealLook, expAlpha(CAM_LOOK_RATE, dt));
  camera.lookAt(updateCamera._look);
}

function syncMeshes() {
  playerRoot.position.set(player.x, 0, player.z);
  playerRoot.rotation.y = player.yaw + MODEL_FORWARD_YAW;

  // Soft-hold hips to rest XZ (root tracks already stripped). Avoid hard snap pops.
  if (hipBone && hipRestLocal) {
    hipBone.position.x += (hipRestLocal.x - hipBone.position.x) * 0.85;
    hipBone.position.z += (hipRestLocal.z - hipBone.position.z) * 0.85;
  }

  // Additive bank into turns: roll spine toward the cut (game-cam readable).
  const bank = loco.mode === 'spin' ? 0 : loco.lean;
  const plantDip = loco.mode === 'plant' ? 0.18 : 0;
  if (spineBone) {
    spineBone.rotation.z += bank * 0.75;
    spineBone.rotation.x += plantDip;
  }
  if (spine01Bone) {
    spine01Bone.rotation.z += bank * 0.55;
    spine01Bone.rotation.x += plantDip * 0.5;
  }

  playerCircle.position.x = player.x; playerCircle.position.z = player.z;
  circleFill.position.x = player.x; circleFill.position.z = player.z;
  playerShadow.position.x = player.x;
  playerShadow.position.z = player.z;
}

let last = performance.now(), frames = 0, fpsT = 0;
let rafStarted = false;

function stepSimulation(dt) {
  // Clamp: avoid huge hits on tab-focus; avoid zero/negative
  dt = Math.min(0.05, Math.max(0, dt));
  updatePlayer(dt);
  if (mixer) mixer.update(dt);
  updateCamera(dt);
  syncMeshes();
}

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  frames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
  stepSimulation(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

if (!rafStarted) {
  rafStarted = true;
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applySize();
});

// Test hook: drive sim at fixed/variable dt without relying on display refresh
Object.defineProperty(window, '__tbStep', {
  configurable: true,
  get: () => (dt) => { stepSimulation(dt); return window.__tb ? window.__tb.sampleNdc() : null; },
});
