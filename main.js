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
const SPRITE_H = 1.85;
const SPRITE_W = 1.85;

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
if (new URLSearchParams(location.search).has('nearfar')) {
  titleEl.style.display = 'none'; playing = true;
  window.addEventListener('load', () => { setTimeout(() => { if (window.__tb) { window.__tb.player.z = 42; window.__tb.player.x = 0; } }, 100); });
}
const __topdown = new URLSearchParams(location.search).has('topdown');
let __qaCam = null;

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
  const tex = loader.load('./field_texture.jpg?v=ez180');
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

// Ground shadow (separates during hurdle)
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
});
const playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), shadowMat);
playerShadow.rotation.x = -Math.PI / 2;
playerShadow.position.y = 0.03;
playerShadow.renderOrder = 5;
scene.add(playerShadow);

const MOVE_SPEC = {
  juke:   { dur: 0.40, frames: 6, anim: 'juke' },
  spin:   { dur: 0.50, frames: 8, anim: 'spin' },
  stiff:  { dur: 0.45, frames: 6, anim: 'stiff' },
  hurdle: { dur: 0.55, frames: 8, anim: 'hurdle' },
  celeb:  { dur: 0.70, frames: 6, anim: 'celeb' },
};

const HURDLE_LIFT = [0, 0.25, 0.7, 1.15, 1.1, 0.65, 0.2, 0];

const player = {
  x: 0, z: -25, vx: 0, vz: 0, facing: 'n', facingPrev: 'n',
  turbo: 1, anim: 'idle', frame: 0, frameT: 0,
  special: null, specialT: 0, specialDur: 0,
  turnT: 0, spriteY: 0, celebPending: false,
};

const frameTex = {};
const frameMeta = {};
let currentAnim = 'idle', currentFrame = 0;

const spriteMat = new THREE.SpriteMaterial({
  transparent: true, depthWrite: false, depthTest: true,
  alphaTest: 0.08, sizeAttenuation: true, color: 0xffffff,
});
const spriteMesh = new THREE.Sprite(spriteMat);
spriteMesh.scale.set(SPRITE_W, SPRITE_H, 1);
spriteMesh.center.set(0.5, 0.0);
spriteMesh.renderOrder = 20;
scene.add(spriteMesh);

async function loadFrames() {
  const meta = await (await fetch('./frames.json?v=1916b1d')).json();
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
    const fb = { run_ne: 'run_n', run_nw: 'run_n', run_se: 'run_s', run_sw: 'run_s' };
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

const PERP = {
  n: [1, 0], s: [-1, 0], e: [0, -1], w: [0, 1],
  ne: [0.7, -0.7], nw: [0.7, 0.7], se: [-0.7, -0.7], sw: [-0.7, 0.7],
};

let homeScore = 0, tdCooldown = 0;
function resetPlayer() {
  player.x = 0; player.z = -25; player.vx = 0; player.vz = 0;
  player.facing = 'n'; player.facingPrev = 'n';
  player.special = null; player.spriteY = 0; player.celebPending = false;
  player.turbo = Math.max(player.turbo, 0.55);
  los.position.z = -20; fd.position.z = -10;
  document.getElementById('banner').textContent = '1st & 10';
}
function showTD() {
  homeScore += 7; scoreHome.textContent = String(homeScore);
  tdEl.classList.add('show'); tdCooldown = 2.4;
  player.special = 'celeb';
  player.specialDur = MOVE_SPEC.celeb.dur;
  player.specialT = MOVE_SPEC.celeb.dur;
  player.frame = 0; player.frameT = 0;
  player.vx = 0; player.vz = 0;
  setTimeout(() => { tdEl.classList.remove('show'); resetPlayer(); }, 2000);
}

function startSpecial(name) {
  const spec = MOVE_SPEC[name];
  if (!spec) return;
  player.special = name;
  player.specialDur = spec.dur;
  player.specialT = spec.dur;
  player.frame = 0;
  player.frameT = 0;

  if (name === 'juke') {
    const p = PERP[player.facing] || [1, 0];
    player.vx = player.vx * 0.7 + p[0] * 16;
    player.vz = player.vz * 0.7 + p[1] * 16;
  } else if (name === 'spin') {
    player.vx *= 1.15; player.vz *= 1.15;
  } else if (name === 'stiff') {
    const spd = Math.hypot(player.vx, player.vz) || 8;
    const fx = ({ n:0,s:0,e:1,w:-1,ne:0.7,nw:-0.7,se:0.7,sw:-0.7 })[player.facing] || 0;
    const fz = ({ n:1,s:-1,e:0,w:0,ne:0.7,nw:0.7,se:-0.7,sw:-0.7 })[player.facing] || 1;
    player.vx += fx * 4; player.vz += fz * 4;
  } else if (name === 'hurdle') {
    player.vx *= 1.05; player.vz *= 1.05;
  }
}

const BASE_SPEED = 14, TURBO_MULT = 1.65, ACCEL = 55, FRICTION = 28;

function updatePlayer(dt) {
  if (!playing) return;
  if (tdCooldown > 0) {
    tdCooldown -= dt;
    // still advance celeb anim
  } else if (tdCooldown <= 0 && player.special === 'celeb') {
    player.special = null;
  }

  if (!player.special && tdCooldown <= 0) {
    if (keys.has('KeyE')) startSpecial('juke');
    else if (keys.has('KeyQ')) startSpecial('spin');
    else if (keys.has('KeyF')) startSpecial('stiff');
    else if (keys.has('KeyR') || keys.has('KeyC')) startSpecial('hurdle');
  }

  if (player.special) {
    player.specialT -= dt;
    const spec = MOVE_SPEC[player.special];
    const nF = (frameMeta[spec.anim] || []).length || spec.frames;
    const elapsed = spec.dur - player.specialT;
    const fi = Math.min(nF - 1, Math.floor((elapsed / spec.dur) * nF));
    player.frame = fi;
    player.anim = spec.anim;

    if (player.special === 'hurdle') {
      const t = Math.max(0, Math.min(1, elapsed / spec.dur));
      const idx = Math.min(HURDLE_LIFT.length - 1, Math.floor(t * HURDLE_LIFT.length));
      const nidx = Math.min(HURDLE_LIFT.length - 1, idx + 1);
      const frac = (t * HURDLE_LIFT.length) - idx;
      player.spriteY = HURDLE_LIFT[idx] * (1 - frac) + HURDLE_LIFT[nidx] * frac;
    } else {
      player.spriteY = 0;
    }

    if (player.specialT <= 0) {
      const was = player.special;
      player.special = null;
      player.spriteY = 0;
      // resume run at contact frame
      player.frame = (was === 'spin' || was === 'juke') ? 0 : player.frame % 8;
      player.frameT = 0;
    }
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
  if (moving && !player.special && tdCooldown <= 0) {
    const nf = facingFromDir(dx, dz);
    if (nf !== player.facing) {
      player.facingPrev = player.facing;
      player.facing = nf;
      player.turnT = 0.08; // short turn blend
    }
  }

  const speed = BASE_SPEED * (usingTurbo ? TURBO_MULT : 1);
  let tx = 0, tz = 0;
  if (moving && !player.special && tdCooldown <= 0) {
    const len = Math.hypot(dx, dz) || 1;
    tx = (dx / len) * speed; tz = (dz / len) * speed;
  } else if (player.special === 'juke' || player.special === 'spin' || player.special === 'hurdle' || player.special === 'stiff') {
    // keep momentum; light friction
    tx = player.vx; tz = player.vz;
  }
  const ax = tx - player.vx, az = tz - player.vz;
  const maxA = (moving && !player.special) ? ACCEL : FRICTION * (player.special ? 0.35 : 1);
  const al = Math.hypot(ax, az);
  if (al > 0.001 && tdCooldown <= 0) {
    const s = Math.min(1, (maxA * dt) / al);
    player.vx += ax * s; player.vz += az * s;
  }
  if (tdCooldown <= 0 || player.special === 'celeb') {
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

  // Animation selection when not in special
  if (!player.special) {
    player.spriteY = 0;
    if (player.turnT > 0) {
      player.turnT -= dt;
      player.anim = 'run_' + player.facingPrev;
    } else if (moving || Math.hypot(player.vx, player.vz) > 1.5) {
      player.anim = 'run_' + player.facing;
      const spd = Math.hypot(player.vx, player.vz);
      const count = (frameMeta[player.anim] || frameMeta.run_n || [1]).length;
      const turboBoost = usingTurbo ? 0.35 : 0;
      const cadence = (5.5 + spd * 0.45) * (0.85 + turboBoost) * (count >= 6 ? 1.1 : 1);
      player.frameT += dt * cadence;
      if (player.frameT >= 1) {
        player.frameT = 0;
        player.frame = (player.frame + 1) % Math.max(1, count);
      }
    } else {
      player.anim = 'idle';
      const count = (frameMeta.idle || [1]).length;
      player.frameT += dt * 3.2;
      if (player.frameT >= 1) {
        player.frameT = 0;
        player.frame = (player.frame + 1) % Math.max(1, count);
      }
    }
  }
  setAnimFrame(player.anim, player.frame);
}

function updateCamera(dt) {
  if (__topdown) {
    if (!__qaCam) {
      const fr = 65;
      const aspect = innerWidth / innerHeight;
      __qaCam = new THREE.OrthographicCamera(-fr * aspect, fr * aspect, fr, -fr, 0.5, 300);
      __qaCam.position.set(0, 150, 0);
      __qaCam.up.set(0, 0, 1);
      __qaCam.lookAt(0, 0, 0);
    }
    return;
  }
  camera.up.set(0, 1, 0);
  const ideal = new THREE.Vector3(player.x * 0.15, 14.5, player.z - 16);
  camera.position.lerp(ideal, 1 - Math.pow(0.001, dt));
  const look = new THREE.Vector3(player.x * 0.3, 1.0, player.z + 12);
  if (!updateCamera._look) updateCamera._look = look.clone();
  updateCamera._look.lerp(look, 1 - Math.pow(0.0008, dt));
  camera.lookAt(updateCamera._look);
}

function syncMeshes() {
  spriteMesh.position.set(player.x, 0.02 + player.spriteY, player.z);
  playerCircle.position.x = player.x; playerCircle.position.z = player.z;
  circleFill.position.x = player.x; circleFill.position.z = player.z;
  playerCircle.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.03);
  // Shadow stays on ground; shrinks / offsets when airborne
  playerShadow.position.x = player.x;
  playerShadow.position.z = player.z - player.spriteY * 0.15;
  const sh = Math.max(0.45, 1 - player.spriteY * 0.35);
  playerShadow.scale.setScalar(sh);
  shadowMat.opacity = 0.35 * sh;
}

let last = performance.now(), frames = 0, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; frames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
  updatePlayer(dt); updateCamera(dt); syncMeshes();
  renderer.render(scene, __topdown && __qaCam ? __qaCam : camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__tb = { player, camera, scene, spriteMesh, frameTex, setAnimFrame, startSpecial };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
