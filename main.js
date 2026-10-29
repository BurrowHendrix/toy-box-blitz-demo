import * as THREE from 'three';

const canvas = document.getElementById('c');
const turboFill = document.getElementById('turboFill');
const tdEl = document.getElementById('td');
const fpsEl = document.getElementById('fps');
const titleEl = document.getElementById('title');
const startBtn = document.getElementById('startBtn');
const scoreHome = document.getElementById('scoreHome');

const YARDS = { width: 53.33, length: 120 };
const FIELD_HALF_LEN = YARDS.length / 2;
const FIELD_HALF_W = YARDS.width / 2;

// Sprite world height ~2.2 yards (player ~2 yd tall); width matched to square frames
const SPRITE_H = 2.35;
const SPRITE_W = 2.35;

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

let playing = false;
startBtn.addEventListener('click', () => { titleEl.style.display = 'none'; playing = true; });
if (new URLSearchParams(location.search).has('autoplay')) {
  titleEl.style.display = 'none'; playing = true;
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6ec8ff);
scene.fog = new THREE.Fog(0x6ec8ff, 85, 180);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 250);
camera.position.set(0, 16, -43);
camera.up.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xfff2d9, 0x3a5a28, 1.15));
const sun = new THREE.DirectionalLight(0xffffff, 0.95);
sun.position.set(-20, 40, 10);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const loader = new THREE.TextureLoader();

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
  const tex = loader.load('./field_texture.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // NO UV Y-flip — texture is authored with image top = near (−Z), bottom = far (+Z)
  const geo = new THREE.PlaneGeometry(YARDS.width, YARDS.length);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  // Sideline track / apron
  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(YARDS.width + 14, YARDS.length + 10),
    new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
  );
  track.rotation.x = -Math.PI / 2;
  track.position.y = -0.03;
  scene.add(track);

  // Painted sideline strip (subtle)
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

  // Team benches along both sidelines
  makeBench(-FIELD_HALF_W - 3.2, -15, 18);
  makeBench(-FIELD_HALF_W - 3.2, 15, 18);
  makeBench(FIELD_HALF_W + 3.2, -15, 18);
  makeBench(FIELD_HALF_W + 3.2, 15, 18);

  // Thin on-field LOS / first-down only (never a HUD bar)
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

// Selection circle — sized for ~2 yd player, centered under feet
const CIRCLE_R = 0.72;
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

const player = {
  x: 0, z: -25, vx: 0, vz: 0, facing: 'n', turbo: 1,
  anim: 'idle', frame: 0, frameT: 0, specialT: 0, special: null,
};

const frameTex = {};
const frameMeta = {};
let currentAnim = 'idle', currentFrame = 0;

const spriteMat = new THREE.SpriteMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: true,
  alphaTest: 0.08,
  sizeAttenuation: true,
  color: 0xffffff,
});
const spriteMesh = new THREE.Sprite(spriteMat);
spriteMesh.scale.set(SPRITE_W, SPRITE_H, 1);
spriteMesh.center.set(0.5, 0.0); // feet on ground
spriteMesh.renderOrder = 20;
scene.add(spriteMesh);

async function loadFrames() {
  const meta = await (await fetch('./frames.json')).json();
  Object.assign(frameMeta, meta);
  const jobs = [];
  for (const [anim, paths] of Object.entries(meta)) {
    frameTex[anim] = paths.map(() => null);
    paths.forEach((path, i) => {
      jobs.push(new Promise((resolve) => {
        loader.load(path, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          frameTex[anim][i] = tex;
          resolve();
        });
      }));
    });
  }
  await Promise.all(jobs);
  setAnimFrame('idle', 0);
  window.__atlasLoaded = true;
}

function setAnimFrame(animKey, frameIndex) {
  let list = frameTex[animKey];
  if (!list || !list.length) {
    // fallback diagonals → nearest cardinal / run_n
    const fb = {
      run_ne: 'run_n', run_nw: 'run_n', run_se: 'run_s', run_sw: 'run_s',
    };
    list = frameTex[fb[animKey]] || frameTex.run_n || frameTex.idle;
  }
  if (!list || !list.length) return;
  const fi = ((frameIndex % list.length) + list.length) % list.length;
  const tex = list[fi];
  if (!tex) return;
  spriteMat.map = tex;
  spriteMat.needsUpdate = true;
  currentAnim = animKey;
  currentFrame = fi;
}

loadFrames();

function dirFromInput() {
  let dx = 0, dz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dz -= 1;
  return { dx, dz };
}
function facingFromDir(dx, dz) {
  if (dx === 0 && dz === 0) return player.facing;
  const ang = Math.atan2(dx, dz);
  const oct = Math.round(ang / (Math.PI / 4));
  const map = { 0: 'n', 1: 'ne', 2: 'e', 3: 'se', 4: 's', '-4': 's', '-3': 'sw', '-2': 'w', '-1': 'nw' };
  return map[String(oct)] || 'n';
}

let homeScore = 0, tdCooldown = 0;
function resetPlayer() {
  player.x = 0; player.z = -25; player.vx = 0; player.vz = 0;
  player.facing = 'n'; player.special = null;
  player.turbo = Math.max(player.turbo, 0.55);
  los.position.z = -20; fd.position.z = -10;
  document.getElementById('banner').textContent = '1st & 10';
}
function showTD() {
  homeScore += 7; scoreHome.textContent = String(homeScore);
  tdEl.classList.add('show'); tdCooldown = 2.2;
  setTimeout(() => { tdEl.classList.remove('show'); resetPlayer(); }, 1800);
}

const BASE_SPEED = 14, TURBO_MULT = 1.65, ACCEL = 55, FRICTION = 28;

function updatePlayer(dt) {
  if (!playing) return;
  if (tdCooldown > 0) { tdCooldown -= dt; return; }

  if (!player.special) {
    if (keys.has('KeyE')) {
      player.special = 'juke'; player.specialT = 0.35;
      const perp = { n: [1, 0], s: [-1, 0], e: [0, -1], w: [0, 1], ne: [0.7, -0.7], nw: [0.7, 0.7], se: [-0.7, -0.7], sw: [-0.7, 0.7] };
      const p = perp[player.facing] || [1, 0];
      player.vx += p[0] * 18; player.vz += p[1] * 18;
    } else if (keys.has('KeyQ')) {
      player.special = 'spin'; player.specialT = 0.45;
      player.vx *= 1.2; player.vz *= 1.2;
    }
  } else {
    player.specialT -= dt;
    if (player.specialT <= 0) player.special = null;
  }

  const { dx, dz } = dirFromInput();
  const turboHeld = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space');
  let usingTurbo = false;
  if (turboHeld && player.turbo > 0.02 && (dx || dz)) {
    usingTurbo = true; player.turbo = Math.max(0, player.turbo - dt * 0.45);
  } else {
    player.turbo = Math.min(1, player.turbo + dt * 0.22);
  }
  turboFill.style.width = `${(player.turbo * 100).toFixed(1)}%`;

  const moving = dx !== 0 || dz !== 0;
  if (moving && !player.special) player.facing = facingFromDir(dx, dz);

  const speed = BASE_SPEED * (usingTurbo ? TURBO_MULT : 1);
  let tx = 0, tz = 0;
  if (moving) {
    const len = Math.hypot(dx, dz) || 1;
    tx = (dx / len) * speed; tz = (dz / len) * speed;
  }
  const ax = tx - player.vx, az = tz - player.vz;
  const maxA = moving ? ACCEL : FRICTION;
  const al = Math.hypot(ax, az);
  if (al > 0.001) {
    const s = Math.min(1, (maxA * dt) / al);
    player.vx += ax * s; player.vz += az * s;
  }
  player.x += player.vx * dt; player.z += player.vz * dt;
  const maxX = FIELD_HALF_W - 1.2, maxZ = FIELD_HALF_LEN - 1.5;
  player.x = Math.max(-maxX, Math.min(maxX, player.x));
  player.z = Math.max(-maxZ, Math.min(maxZ, player.z));
  if (player.z >= 50 && tdCooldown <= 0) showTD();

  // Keep first-down marker on the field ahead of the ball (never a bottom HUD bar)
  const ballZ = player.z;
  if (fd.position.z < ballZ - 0.5) {
    // player crossed FD — roll a new 10 yd marker ahead
    los.position.z = ballZ;
    fd.position.z = Math.min(50, ballZ + 10);
  }

  if (player.special === 'juke') { player.anim = 'juke'; player.frame = 0; }
  else if (player.special === 'spin') { player.anim = 'spin'; player.frame = 0; }
  else if (moving || Math.hypot(player.vx, player.vz) > 1.5) {
    player.anim = 'run_' + player.facing;
    const spd = Math.hypot(player.vx, player.vz);
    const count = (frameMeta[player.anim] || frameMeta.run_n || [1]).length;
    player.frameT += dt * (5.5 + spd * 0.4) * (count >= 4 ? 1.15 : 1);
    if (player.frameT >= 1) { player.frameT = 0; player.frame = (player.frame + 1) % Math.max(1, count); }
  } else { player.anim = 'idle'; player.frame = 0; }
  setAnimFrame(player.anim, player.frame);
}

function updateCamera(dt) {
  camera.up.set(0, 1, 0);
  const ideal = new THREE.Vector3(player.x * 0.15, 14.5, player.z - 16);
  camera.position.lerp(ideal, 1 - Math.pow(0.001, dt));
  const look = new THREE.Vector3(player.x * 0.3, 1.0, player.z + 12);
  if (!updateCamera._look) updateCamera._look = look.clone();
  updateCamera._look.lerp(look, 1 - Math.pow(0.0008, dt));
  camera.lookAt(updateCamera._look);
}

function syncMeshes() {
  spriteMesh.position.set(player.x, 0.02, player.z);
  playerCircle.position.x = player.x; playerCircle.position.z = player.z;
  circleFill.position.x = player.x; circleFill.position.z = player.z;
  playerCircle.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.03);
}

let last = performance.now(), frames = 0, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; frames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
  updatePlayer(dt); updateCamera(dt); syncMeshes();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__tb = { player, camera, scene, spriteMesh, frameTex, setAnimFrame };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
