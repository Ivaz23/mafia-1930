'use strict';

/* ================================================================
   ПРОВЕРКА THREE + ВСПОМОГАТЕЛЬНОЕ
   ================================================================ */
const el = function(id) { return document.getElementById(id); };
function bootSetProgress(p, label) {
  const bar = document.getElementById('bootBar');
  const lbl = document.getElementById('bootLabel');
  if (bar) bar.style.width = Math.round(p * 100) + '%';
  if (lbl) { lbl.textContent = label; lbl.className = ''; }
}
function bootFinish() {
  const b = document.getElementById('bootScreen');
  if (b) { b.style.transition = 'opacity 0.4s'; b.style.opacity = '0'; setTimeout(() => { if (b.parentNode) b.remove(); }, 400); }
}
function bootError(msg) {
  const lbl = document.getElementById('bootLabel');
  if (lbl) { lbl.textContent = 'ОШИБКА: ' + msg; lbl.className = 'err'; }
  console.error('BOOT ERROR:', msg);
}

/* ================================================================
   НАСТРОЙКИ / СОХРАНЕНИЕ
   ================================================================ */
const DEFAULTS = { sens: 1.0, vol: 1.0, quality: 1, shake: true, autosave: true };
let SETTINGS = Object.assign({}, DEFAULTS);
let SAVE = {
  money: 500,
  upgrades: { mag: 0, dmg: 0, reload: 0, acc: 0 },
  achievements: {},
  totalKills: 0,
  headshots: 0,
  carsOwned: [true, false, false, true, false, false],
  meta: { respect: 0, influence: 0, heat: 0, chapter: 1, missions: 0, cleanJobs: 0, approach: 'quiet', territory: 0 },
  businesses: {},
  businessWeek: 1,
  businessWeekClock: 0,
  businessDebt: 0
};
try {
  const s = localStorage.getItem('mafia1930_settings');
  if (s) SETTINGS = Object.assign(SETTINGS, JSON.parse(s));
  const g = localStorage.getItem('mafia1930_save');
  if (g) SAVE = Object.assign(SAVE, JSON.parse(g));
} catch(e) {}
SAVE.meta = Object.assign({ respect: 0, influence: 0, heat: 0, chapter: 1, missions: 0, cleanJobs: 0, approach: 'quiet' }, SAVE.meta || {});
function saveSettings() { try { localStorage.setItem('mafia1930_settings', JSON.stringify(SETTINGS)); } catch(e){} }
function saveGame() { try { localStorage.setItem('mafia1930_save', JSON.stringify(SAVE)); } catch(e){} }

/* ================================================================
   ОРУЖИЕ
   ================================================================ */
const WEAPONS = [
  { name: 'ТОММИ-ГАН', short: 'ТОММИ', mag: 50, dmg: 34, rate: 0.10, auto: true,  reload: 2.0, spread: 0.012, pellets: 1, vol: 0.45, freq: 1500, kick: 0.006, recoilVis: 1.0 },
  { name: 'КОЛТ 1911', short: 'КОЛТ',  mag: 8,  dmg: 46, rate: 0.26, auto: false, reload: 1.2, spread: 0.004, pellets: 1, vol: 0.50, freq: 2100, kick: 0.011, recoilVis: 1.4 },
  { name: 'ДРОБОВИК',  short: 'ДРОБА', mag: 6,  dmg: 21, rate: 0.85, auto: false, reload: 2.4, spread: 0.055, pellets: 8, vol: 0.70, freq: 750,  kick: 0.020, recoilVis: 2.4 }
];
let weapon = 0;
let ammoInMag = WEAPONS.map(w => w.mag);

const UPGRADE_DEFS = [
  { key: 'mag',    name: 'Магазин',     desc: '+15% ёмкости', max: 3, cost: [600, 1800, 4000] },
  { key: 'dmg',    name: 'Урон',        desc: '+12% урона',   max: 3, cost: [800, 2200, 5000] },
  { key: 'reload', name: 'Перезарядка', desc: '−12% времени', max: 3, cost: [500, 1500, 3200] },
  { key: 'acc',    name: 'Точность',    desc: '−15% разброса',max: 3, cost: [700, 1900, 4200] }
];
function upgradeMult(k) {
  const lvl = SAVE.upgrades[k] || 0;
  if (k === 'mag') return 1 + lvl * 0.15;
  if (k === 'dmg') return 1 + lvl * 0.12;
  if (k === 'reload') return 1 - lvl * 0.12;
  if (k === 'acc') return 1 - lvl * 0.15;
  return 1;
}
function applyUpgradesToWeapons() {
  const base = [
    { mag:50, dmg:34, reload:2.0, spread:0.012 },
    { mag:8,  dmg:46, reload:1.2, spread:0.004 },
    { mag:6,  dmg:21, reload:2.4, spread:0.055 }
  ];
  const magM = upgradeMult('mag'), dmgM = upgradeMult('dmg'), relM = upgradeMult('reload'), accM = upgradeMult('acc');
  for (let i = 0; i < base.length; i++) {
    WEAPONS[i].mag    = Math.round(base[i].mag * magM);
    WEAPONS[i].dmg    = base[i].dmg * dmgM;
    WEAPONS[i].reload = base[i].reload * relM;
    WEAPONS[i].spread = base[i].spread * accM;
  }
  ammoInMag = WEAPONS.map((w, i) => Math.min(ammoInMag[i] || w.mag, w.mag));
}
applyUpgradesToWeapons();

/* ================================================================
   ДОСТИЖЕНИЯ
   ================================================================ */
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Первая кровь', desc: 'Убить первого врага', test: () => SAVE.totalKills >= 1 },
  { id: 'sniper', name: 'Снайпер', desc: '5 хедшотов', test: () => SAVE.headshots >= 5 },
  { id: 'deadeye', name: 'Меткий глаз', desc: '25 хедшотов', test: () => SAVE.headshots >= 25 },
  { id: 'brawler', name: 'Мясник', desc: '50 убийств', test: () => SAVE.totalKills >= 50 },
  { id: 'boss1', name: 'Палач', desc: 'Победить босса', test: () => (SAVE.achievements.boss1 || 0) >= 1 },
  { id: 'rich', name: 'Богач', desc: 'Накопить $10 000', test: () => SAVE.money >= 10000 },
  { id: 'tycoon', name: 'Магнат', desc: '4 бизнеса', test: () => (SAVE.achievements.tycoon || 0) >= 1 },
  { id: 'wheelman', name: 'За рулём', desc: 'Пройти развозку', test: () => (SAVE.achievements.wheelman || 0) >= 1 },
  { id: 'survivor', name: 'Живучий', desc: 'Без урона', test: () => (SAVE.achievements.survivor || 0) >= 1 },
  { id: 'collector', name: 'Коллекционер', desc: '3 апгрейда', test: () => (SAVE.upgrades.mag + SAVE.upgrades.dmg + SAVE.upgrades.reload + SAVE.upgrades.acc) >= 3 }
];

/* ================================================================
   УРОВНИ
   ================================================================ */
const LEVELS = [
  { name: 'СКЛАД У ДОКОВ', objective: 'Зачисти склад и забери чемодан с деньгами',
    winText: 'Чемодан у нас. Теперь отправляйся в ночные доки.',
    bounds: { minX: -19.4, maxX: 19.4, minZ: -79.4, maxZ: -0.6 },
    spawn: [0, -4], suitcase: [0, -74],
    bg: 0x050507, fogColor: 0x070709, fogDensity: 0.018,
    enemies: [[-12,-20],[8,-25],[0,-33],[-6,-42],[14,-45],[-14,-53],[4,-60],[-4,-68]],
    enemyHp: 100, enemyDelay: 1.0, enemySpeed: 2.4,
    palette: { coat: 0x18181c, hat: 0x1f1f24 }, build: null,
    boss: { name: 'САЛЬВАТОРЕ', palette: { coat: 0x2a1010, hat: 0x1a0808 }, pos: [0, -70], hp: 550 }
  },
  { name: 'НОЧНЫЕ ДОКИ', objective: 'Зачисти доки и забери чемодан',
    winText: 'Доки чисты. Осталось логово — бар «У Клефа».',
    bounds: { minX: -23.5, maxX: 23.5, minZ: -31.5, maxZ: 29.5 },
    spawn: [0, 26], suitcase: [-18, -26],
    bg: 0x060912, fogColor: 0x080d18, fogDensity: 0.020,
    enemies: [[-14,10],[12,6],[-4,-2],[16,-8],[-18,-12],[6,-16],[-8,-22],[18,-24],[0,-28],[-20,2]],
    enemyHp: 110, enemyDelay: 0.85, enemySpeed: 2.6,
    palette: { coat: 0x2a2018, hat: 0x241a10 }, build: null, rain: true,
    boss: { name: 'КАРПОНЕ', palette: { coat: 0x0a0a14, hat: 0x050510 }, pos: [-18, -26], hp: 650 }
  },
  { name: 'БАР «У КЛЕФА»', objective: 'Зачисти бар и забери чемодан!',
    winText: 'Бар взят. Время сесть за руль.',
    bounds: { minX: -13.4, maxX: 13.4, minZ: -38.4, maxZ: -0.6 },
    spawn: [0, -3], suitcase: [-8.5, -36],
    bg: 0x080404, fogColor: 0x0a0505, fogDensity: 0.026,
    enemies: [[-8,-8],[8,-10],[0,-14],[-11,-16],[11,-18],[-4,-20],[5,-23],[-10,-25],[10,-28],[-2,-30],[7,-33],[-12,-33]],
    enemyHp: 125, enemyDelay: 0.75, enemySpeed: 2.8,
    palette: { coat: 0x1c1a22, hat: 0x14121a }, build: null,
    boss: { name: 'ДОН ВИТОРИО', palette: { coat: 0x1a0808, hat: 0x080404 }, pos: [-8.5, -36], hp: 800 }
  },
  { name: 'ГОРОДСКАЯ РАЗВОЗКА', mode: 'drive', objective: 'Проедь все точки маршрута',
    winText: 'Груз развезён! Семья довольна.',
    bounds: { minX: -96, maxX: 96, minZ: -96, maxZ: 96 }, spawn: [0, 60],
    bg: 0x060812, fogColor: 0x080b16, fogDensity: 0.010, build: null
  },
  { name: 'МИРНОЕ ВРЕМЯ', mode: 'peace', objective: 'Империя: покупай бизнесы, собирай долги',
    winText: 'Город под контролем Семьи!',
    bounds: { minX: -96, maxX: 96, minZ: -96, maxZ: 96 }, spawn: [0, 60],
    bg: 0x8a9ea8, fogColor: 0x9fb0bc, fogDensity: 0.004, build: null
  }
];

/* ================================================================
   ПЕРЕМЕННЫЕ БЕЗ THREE (создаём всё лениво)
   ================================================================ */
let scene, camera, renderer, clock;
let ambientLight, hemiLight, moonLight;
let gun, gunBase, drumMesh, flashMesh, flashLight, enemyFlashLight, sparkMesh, shotLight;
let suitcase, suitcaseLight;
let colliders = [], worldMeshes = [], enemies = [], tracers = [];
let keys = {}, state = 'menu', level = 0, hp = 100, kills = 0, totalEnemies = 8;
let reloading = false, reloadT = 0, firing = false, lastShot = 0, recoil = 0, bobT = 0;
let startTime = 0, yaw = 0, pitch = 0, gameT = 0, msgT = -10;
let shake = 0, shakeRoll = 0, hitFlash = 0;
let playerFootstepT = 0, damageTakenThisLevel = 0;
let mode = 'shoot', car = null, cpMarker = null, nearBiz = null;
let carIdx = 0, cpIdx = 0, timeLeft = 0, money = 0, orbitYaw = 0;
let inCover = false, coverAnchor = null;
let coverNormal = null;
let crouching = false, camY = 1.7, hiding = false, wanted = 0;
let meleeT = -10;
let pedestrians = [], buildings = [], activeJob = null, cops = [];
let interactTarget = null, interactType = null, missionArrow = null, pickups = [];
let rainMesh = null;
let ysdk = null;

let fxGroup, partGeo, partMats, matBarrel, matBarrelTop;
let parts = [];
let partCursor = 0;
let MAX_PARTS = 100;

const PLAYER_SPEED = 5.2, PLAYER_RADIUS = 0.5, CROUCH_SPEED = 2.5;
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const joy = { active: false, id: null, dx: 0, dy: 0 };
const lookTouch = { id: null, lx: 0, ly: 0 };
let raycaster;

let texBrick, texWood, texFloor, texWallpaper, texFlash, texWindows, texWater, texRoad;
let matBrick, matWood, matFloor, matWallPaper, matWindows, matRoad;

/* ================================================================
   SPATIAL GRID
   ================================================================ */
let colliderGrid = null;
const GRID_CELL = 8;
function buildColliderGrid() {
  colliderGrid = new Map();
  for (let c of colliders) {
    const cx0 = Math.floor(c.minX / GRID_CELL), cx1 = Math.floor(c.maxX / GRID_CELL);
    const cz0 = Math.floor(c.minZ / GRID_CELL), cz1 = Math.floor(c.maxZ / GRID_CELL);
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
      const k = cx + ',' + cz;
      let arr = colliderGrid.get(k);
      if (!arr) { arr = []; colliderGrid.set(k, arr); }
      arr.push(c);
    }
  }
}
function getNearbyColliders(x, z, r) {
  if (!colliderGrid) return colliders;
  const cx0 = Math.floor((x - r) / GRID_CELL), cx1 = Math.floor((x + r) / GRID_CELL);
  const cz0 = Math.floor((z - r) / GRID_CELL), cz1 = Math.floor((z + r) / GRID_CELL);
  const seen = new Set();
  const out = [];
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const arr = colliderGrid.get(cx + ',' + cz);
    if (!arr) continue;
    for (let c of arr) if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

/* ================================================================
   ЗВУК
   ================================================================ */
let actx = null;
function initAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
  if (actx && actx.state === 'suspended') actx.resume();
}
function gv(v) { return v * SETTINGS.vol; }
function playShot(vol, freq) {
  if (!actx) return;
  const dur = 0.09;
  const buf = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1500;
  const g = actx.createGain();
  g.gain.setValueAtTime(gv(vol), actx.currentTime);
  g.gain.linearRampToValueAtTime(0.01, actx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
}
function playClick(delay, freq, vol) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const g = actx.createGain();
  g.gain.setValueAtTime(gv(vol || 0.08), t);
  g.gain.linearRampToValueAtTime(0.01, t + 0.04);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.05);
}
function playReload(dur) { playClick(0, 300); playClick(dur * 0.4, 220); playClick(dur - 0.2, 380); }
function playHit(head) { playClick(0, head ? 260 : 140, head ? 0.14 : 0.1); }
function playHurt() { playClick(0, 90, 0.14); playClick(0.05, 70, 0.1); }
function playCash() { playClick(0, 880, 0.09); playClick(0.06, 1320, 0.08); }
function playStep() { playClick(0, 170 + Math.random() * 40, 0.035); }
function playScream() { playClick(0, 200, 0.1); playClick(0.08, 140, 0.09); }
function playMelee() { playClick(0, 100, 0.14); playClick(0.04, 60, 0.1); }

/* ================================================================
   ТЕКСТУРЫ
   ================================================================ */
function makeBrickTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4a2d24'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#633c30';
  for (let y = 0; y < 128; y += 16) {
    const off = (y / 16 % 2) * 16;
    for (let x = -16; x < 128; x += 32) g.fillRect(x + off + 1, y + 1, 30, 14);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeWoodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5c3a1e'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#7a4e28';
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y + 2, 128, 28);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeFloorTexture(rx, ry) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#222226'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#28282d';
  for (let y = 0; y < 128; y += 64) for (let x = 0; x < 128; x += 64) g.fillRect(x+2, y+2, 60, 60);
  g.strokeStyle = '#151518'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx || 8, ry || 16); return t;
}
function makeWallpaperTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3a1f1e'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4f2a28'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 8, 64);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeFlashTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#ffcc44'); gr.addColorStop(1, 'rgba(255,100,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function makeWindowsTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#15171f'; g.fillRect(0, 0, 128, 128);
  for (let y = 10; y < 118; y += 22) for (let x = 8; x < 118; x += 20) {
    const lit = Math.random() < 0.34;
    g.fillStyle = lit ? (Math.random() < 0.4 ? '#ffd27a' : '#ffe9b0') : '#0d0f15';
    g.fillRect(x, y, 12, 14);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeWaterTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0a1420'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(120,170,220,0.18)'; g.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y);
    g.bezierCurveTo(40, y + (Math.random()*10-5), 90, y + (Math.random()*10-5), 128, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10); return t;
}
function makeRoadTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1e2026'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 120; i++) g.fillRect(Math.random()*128|0, Math.random()*128|0, 2, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* ================================================================
   ЧАСТИЦЫ
   ================================================================ */
function getPartMat(color) {
  if (!partMats[color]) partMats[color] = new THREE.MeshBasicMaterial({ color: color });
  return partMats[color];
}
function initParticles() {
  MAX_PARTS = SETTINGS.quality === 0 ? 60 : (SETTINGS.quality === 1 ? 110 : 180);
  for (let i = 0; i < MAX_PARTS; i++) {
    const m = new THREE.Mesh(partGeo, getPartMat(0xffffff));
    m.visible = false; fxGroup.add(m);
    parts.push({ mesh: m, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 1, active: false, spin: 0 });
  }
}
function spawnParticles(pos, color, count, speed, life, size, grav) {
  if (!parts.length) return;
  if (SETTINGS.quality === 0) count = Math.max(1, count >> 1);
  let spawned = 0;
  for (let i = 0; i < parts.length && spawned < count; i++) {
    partCursor = (partCursor + 1) % parts.length;
    const p = parts[partCursor];
    if (p.active) continue;
    p.active = true; p.life = 0;
    p.maxLife = life * (0.6 + Math.random() * 0.7);
    p.grav = grav === undefined ? 9 : grav;
    p.mesh.material = getPartMat(color);
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.mesh.position.x += (Math.random()-0.5) * 0.15;
    p.mesh.position.y += (Math.random()-0.5) * 0.15;
    p.mesh.position.z += (Math.random()-0.5) * 0.15;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const sp = speed * (0.4 + Math.random() * 0.9);
    p.vx = Math.sin(ph) * Math.cos(th) * sp;
    p.vy = Math.abs(Math.cos(ph)) * sp * 1.2 + speed * 0.3;
    p.vz = Math.sin(ph) * Math.sin(th) * sp;
    const s = size * (0.6 + Math.random() * 0.8);
    p.mesh.scale.set(s, s, s);
    p.spin = (Math.random() - 0.5) * 14;
    spawned++;
  }
}
function updateParticles(dt) {
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.maxLife) { p.active = false; p.mesh.visible = false; continue; }
    p.vy -= p.grav * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    if (p.mesh.position.y < 0.03) { p.mesh.position.y = 0.03; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.y += p.spin * dt * 0.7;
    p.mesh.scale.multiplyScalar(1 - dt * 0.6);
  }
}

/* ================================================================
   ХЕЛПЕРЫ ГЕОМЕТРИИ
   ================================================================ */
function addBox(w, h, d, mat, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); scene.add(m);
  if (!opts || opts.raycast !== false) worldMeshes.push(m);
  if (opts && opts.collide) {
    const pad = opts.pad || 0.15;
    colliders.push({ minX: x - w/2 - pad, maxX: x + w/2 + pad, minZ: z - d/2 - pad, maxZ: z + d/2 + pad, top: y + h/2, cover: (opts.cover !== false) && h > 1.0 });
  }
  return m;
}
function addCrate(x, z, w, h, d) {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWood);
  crate.position.set(x, h/2, z); crate.rotation.y = (Math.random() - 0.5) * 0.25;
  scene.add(crate); worldMeshes.push(crate);
  colliders.push({ minX: x - w/2 - 0.15, maxX: x + w/2 + 0.15, minZ: z - d/2 - 0.15, maxZ: z + d/2 + 0.15, top: h, cover: h > 1.0 });
}
function addBarrel(x, z, r) {
  r = r || 0.42;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.05, 8), matBarrel);
  b.position.set(x, 0.525, z); scene.add(b); worldMeshes.push(b);
  // Бочка является полноценным укрытием: при попадании линии огня в её корпус
  // пуля должна физически остановиться, а игрок может присесть за ней.
  colliders.push({ minX: x-r-0.1, maxX: x+r+0.1, minZ: z-r-0.1, maxZ: z+r+0.1, top: 1.05, cover: true });
}
function addPillar(x, z, h) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), matBrick);
  p.position.set(x, h/2, z); scene.add(p); worldMeshes.push(p);
  colliders.push({ minX: x-0.55, maxX: x+0.55, minZ: z-0.55, maxZ: z+0.55, top: h, cover: true });
}
function buildSuitcase(x, z) {
  const caseGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 0.4), new THREE.MeshLambertMaterial({ color: 0x5a3a1e }));
  body.position.y = 0.44; caseGroup.add(body);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.28), new THREE.MeshBasicMaterial({ color: 0x2fae4e }));
  glow.position.y = 0.46; caseGroup.add(glow);
  caseGroup.position.set(x, 0, z); caseGroup.rotation.y = 0.4;
  scene.add(caseGroup); suitcase = caseGroup;
  suitcaseLight = new THREE.PointLight(0x55dd77, 1.4, 9, 2);
  suitcaseLight.position.set(x, 1.5, z); scene.add(suitcaseLight);
}
function buildLamp(x, y, z, color, intensity, dist) {
  const pl = new THREE.PointLight(color, intensity, dist, 2);
  pl.position.set(x, y, z); scene.add(pl);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), new THREE.MeshBasicMaterial({ color: color }));
  bulb.position.set(x, y + 0.08, z); scene.add(bulb);
}

/* ================================================================
   ПИКАПЫ
   ================================================================ */
function spawnPickup(x, z, type) {
  if (pickups.length > 35) return;
  const g = new THREE.Group();
  let color, sz = [0.5, 0.4, 0.4];
  if (type === 'ammo') color = 0x8a6a2a;
  else if (type === 'med') color = 0xc22a3a;
  else { color = 0x2a8a3a; sz = [0.6, 0.4, 0.4]; }
  const box = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), new THREE.MeshLambertMaterial({ color: color }));
  box.position.y = 0.3; g.add(box);
  g.position.set(x, 0, z); scene.add(g);
  pickups.push({ group: g, type: type, t: 0, life: 30 });
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt; p.life -= dt;
    p.group.rotation.y += dt * 2;
    p.group.position.y = Math.sin(p.t * 3) * 0.08;
    const dx = camera.position.x - p.group.position.x;
    const dz = camera.position.z - p.group.position.z;
    if (dx*dx + dz*dz < 1.2) {
      if (p.type === 'ammo') {
        const give = 15 + Math.floor(Math.random() * 20);
        ammoInMag[weapon] = Math.min(WEAPONS[weapon].mag, ammoInMag[weapon] + give);
        showMsg('+ ' + give + ' ПАТРОНОВ');
      } else if (p.type === 'med') {
        hp = Math.min(100, hp + 35); showMsg('+ 35 HP');
      } else {
        const g = 30 + Math.floor(Math.random() * 90);
        money += g; SAVE.money += g; showMsg('+ $' + g);
      }
      playCash();
      scene.remove(p.group); pickups.splice(i, 1); updateHUD();
      continue;
    }
    if (p.life <= 0) { scene.remove(p.group); pickups.splice(i, 1); }
  }
}

/* ================================================================
   ДОЖДЬ
   ================================================================ */
function buildRain() {
  const N = SETTINGS.quality === 0 ? 250 : (SETTINGS.quality === 1 ? 500 : 900);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i*3] = (Math.random() - 0.5) * 60;
    pos[i*3+1] = Math.random() * 30;
    pos[i*3+2] = (Math.random() - 0.5) * 60;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x88a8c8, size: 0.08, transparent: true, opacity: 0.7 });
  rainMesh = new THREE.Points(geo, mat);
  rainMesh.frustumCulled = false;
  scene.add(rainMesh);
}
function updateRain(dt) {
  if (!rainMesh) return;
  const arr = rainMesh.geometry.attributes.position.array;
  const px = camera.position.x, pz = camera.position.z;
  for (let i = 1; i < arr.length; i += 3) {
    arr[i] -= dt * 22;
    if (arr[i] < -1) {
      arr[i] = 30;
      arr[i-1] = px + (Math.random()-0.5)*60;
      arr[i+1] = pz + (Math.random()-0.5)*60;
    }
  }
  rainMesh.geometry.attributes.position.needsUpdate = true;
}

/* ================================================================
   ПОСТРОЙКА УРОВНЕЙ
   ================================================================ */
function buildWarehouse() {
  ambientLight.color.setHex(0x3a3844); ambientLight.intensity = 1.15;
  hemiLight.intensity = 0.45; moonLight.intensity = 0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -40);
  scene.add(floor); worldMeshes.push(floor);
  addBox(1, 10, 82, matBrick, -20.5, 5, -40, { collide: true });
  addBox(1, 10, 82, matBrick, 20.5, 5, -40, { collide: true });
  addBox(42, 10, 1, matBrick, 0, 5, 0.5, { collide: true });
  addBox(42, 10, 1, matBrick, 0, 5, -80.5, { collide: true });
  for (let z of [-12, -30, -50, -70]) {
    addPillar(-16, z, 10); addPillar(16, z, 10);
    buildLamp(0, 6.2, z, 0xffb84d, 1.7, 24);
  }
  const cratesDef = [[-8,-15,2,2,2],[5,-18,2.2,1.6,2.2],[-15,-28,3,2.4,2.4],[10,-30,2,2,2],[0,-38,2.5,1.8,2],
    [-10,-46,2,2,2],[12,-50,3,2.2,2.2],[3,-55,2,1.6,2],[-14,-62,2.4,2,2.4],[9,-66,2,1.8,2],[-5,-72,2.6,2.2,2.6],[15,-38,1.8,2.6,1.8]];
  for (const c of cratesDef) addCrate(c[0], c[1], c[2], c[3], c[4]);
  addBarrel(-11, -20); addBarrel(-10.2, -21.1); addBarrel(12, -22);
  addBarrel(-16, -45); addBarrel(14, -58); addBarrel(13, -57.2);
  buildSuitcase(LEVELS[0].suitcase[0], LEVELS[0].suitcase[1]);
}
function buildDocks() {
  ambientLight.color.setHex(0x2a3244); ambientLight.intensity = 0.85;
  hemiLight.intensity = 0.55; moonLight.intensity = 0.9;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 64), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -1);
  scene.add(floor); worldMeshes.push(floor);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshLambertMaterial({ map: texWater, color: 0x6a8fb0 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -1.4, -60); scene.add(water);
  addBox(1, 12, 64, matBrick, -24.5, 6, -1, { collide: true });
  addBox(1, 12, 64, matBrick, 24.5, 6, -1, { collide: true });
  addBox(50, 12, 1, matBrick, 0, 6, 31.5, { collide: true });
  for (let pos of [[-18, 8], [10, 2], [-12, -14], [18, -20], [0, 20]]) {
    addPillar(pos[0], pos[1], 11);
    buildLamp(pos[0], 5.6, pos[1], 0xffc06a, 1.5, 22);
  }
  const contMat = new THREE.MeshLambertMaterial({ color: 0x2f4a52 });
  const contMat2 = new THREE.MeshLambertMaterial({ color: 0x5a3a2a });
  function container(x, z, w, d, m) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), m);
    c.position.set(x, 1.3, z); scene.add(c); worldMeshes.push(c);
    colliders.push({ minX: x-w/2-0.2, maxX: x+w/2+0.2, minZ: z-d/2-0.2, maxZ: z+d/2+0.2, top: 2.6, cover: true });
  }
  container(-16, 16, 8, 2.6, contMat); container(15, 14, 8, 2.6, contMat2);
  container(-19, -6, 2.6, 9, contMat2); container(19, -4, 2.6, 9, contMat);
  const crateDefs = [[-8,4,2,2,2],[4,12,2,1.6,2],[-2,-10,2.5,1.8,2],[12,-14,2,2,2],[-6,-22,2,1.8,2]];
  for (let c of crateDefs) addCrate(c[0], c[1], c[2], c[3], c[4]);
  addBarrel(-12, 12); addBarrel(-11, 13); addBarrel(8, -6); addBarrel(9, -7.1);
  buildSuitcase(LEVELS[1].suitcase[0], LEVELS[1].suitcase[1]);
  buildRain();
}
function buildBar() {
  ambientLight.color.setHex(0x443028); ambientLight.intensity = 0.95;
  hemiLight.intensity = 0.45; moonLight.intensity = 0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 40), matWood);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -19.5);
  scene.add(floor); worldMeshes.push(floor);
  addBox(1, 4.5, 41, matWallPaper, -14.5, 2.25, -19.5, { collide: true });
  addBox(1, 4.5, 41, matWallPaper, 14.5, 2.25, -19.5, { collide: true });
  addBox(30, 4.5, 1, matWallPaper, 0, 2.25, 0.5, { collide: true });
  addBox(30, 4.5, 1, matWallPaper, 0, 2.25, -39.5, { collide: true });
  addBox(2.0, 1.15, 12, matWood, -12.6, 0.57, -30, { collide: true });
  const tables = [[6,-10], [-5,-14], [8,-22], [-4,-26], [4,-33]];
  for (let t of tables) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 8), matWood);
    top.position.set(t[0], 0.78, t[1]); scene.add(top); worldMeshes.push(top);
    colliders.push({ minX: t[0]-0.7, maxX: t[0]+0.7, minZ: t[1]-0.7, maxZ: t[1]+0.7, top: 0.8, cover: false });
  }
  const chandLight = new THREE.PointLight(0xffd08a, 1.5, 26, 2);
  chandLight.position.set(0, 3.4, -19); scene.add(chandLight);
  buildSuitcase(LEVELS[2].suitcase[0], LEVELS[2].suitcase[1]);
}
LEVELS[0].build = buildWarehouse;
LEVELS[1].build = buildDocks;
LEVELS[2].build = buildBar;

/* ================================================================
   ИНИЦИАЛИЗАЦИЯ СЦЕНЫ
   ================================================================ */
function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.7, -4);
  scene.add(camera);
  renderer = new THREE.WebGLRenderer({ antialias: SETTINGS.quality >= 1, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const pr = SETTINGS.quality === 0 ? 1 : (SETTINGS.quality === 1 ? 1.25 : Math.min(window.devicePixelRatio, 2));
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.far = 120;
  coverNormal = new THREE.Vector3();
  scene.add(fxGroup);
}
function makeConsts() {
  fxGroup = new THREE.Group();
  partGeo = new THREE.BoxGeometry(1, 1, 1);
  partMats = {};
  matBarrel = new THREE.MeshLambertMaterial({ color: 0x3a4a3a });
  matBarrelTop = new THREE.MeshLambertMaterial({ color: 0x2a3a2a });
}
function makeTextures() {
  texBrick = makeBrickTexture();
  texWood = makeWoodTexture();
  texFloor = makeFloorTexture(8, 16);
  texWallpaper = makeWallpaperTexture();
  texFlash = makeFlashTexture();
  texWindows = makeWindowsTexture();
  texWater = makeWaterTexture();
  texRoad = makeRoadTexture();
}
function makeMaterials() {
  matBrick = new THREE.MeshLambertMaterial({ map: texBrick });
  matWood = new THREE.MeshLambertMaterial({ map: texWood });
  matFloor = new THREE.MeshLambertMaterial({ map: texFloor });
  matWallPaper = new THREE.MeshLambertMaterial({ map: texWallpaper });
  matWindows = new THREE.MeshLambertMaterial({ map: texWindows });
  matRoad = new THREE.MeshLambertMaterial({ map: texRoad });
}
function makeLights() {
  ambientLight = new THREE.AmbientLight(0x3a3844, 1.15); scene.add(ambientLight);
  hemiLight = new THREE.HemisphereLight(0x33323f, 0x0c0a08, 0.55); scene.add(hemiLight);
  moonLight = new THREE.DirectionalLight(0x9db4d6, 0);
  moonLight.position.set(25, 35, 15); scene.add(moonLight);
  const fillLight = new THREE.PointLight(0x998866, 0.5, 6, 2);
  fillLight.position.set(0.15, -0.05, -0.3); camera.add(fillLight);
}
function clearScene() {
  const keep = [camera, ambientLight, hemiLight, moonLight, fxGroup];
  const toRemove = [];
  for (let c of scene.children) if (keep.indexOf(c) === -1) toRemove.push(c);
  for (let o of toRemove) scene.remove(o);
  colliders = []; worldMeshes = []; enemies = []; tracers = []; pickups = [];
  pedestrians = []; buildings = []; activeJob = null; cops = [];
  interactTarget = null; interactType = null;
  suitcase = null; suitcaseLight = null; drumMesh = null;
  if (gun) { camera.remove(gun); gun = null; }
  car = null; cpMarker = null; nearBiz = null; rainMesh = null; missionArrow = null;
  colliderGrid = null;
  for (let p of parts) { p.active = false; p.mesh.visible = false; }
  inCover = false; coverAnchor = null; crouching = false; hiding = false;
}
function loadLevel(idx) {
  level = idx;
  const L = LEVELS[idx];
  mode = L.mode || 'shoot';
  document.body.classList.toggle('mode-drive', mode === 'drive');
  document.body.classList.toggle('mode-peace', mode === 'peace');
  kills = 0; hp = 100; reloading = false; firing = false;
  yaw = 0; pitch = 0; bobT = 0; recoil = 0;
  shake = 0; shakeRoll = 0; hitFlash = 0; wanted = (mode === 'peace' ? Math.max(0, Math.min(5, SAVE.meta.heat || 0)) : 0); damageTakenThisLevel = 0;
  camY = 1.7;
  clearScene();
  scene.background = new THREE.Color(L.bg);
  scene.fog = new THREE.FogExp2(L.fogColor, L.fogDensity);
  if (mode === 'shoot') {
    totalEnemies = 0;
    ammoInMag = WEAPONS.map(w => w.mag);
    L.build(); buildGun(weapon); buildEffects(); spawnEnemies(L);
    camera.position.set(L.spawn[0], 1.7, L.spawn[1]);
    camera.rotation.set(0, 0, 0);
  } else if (mode === 'drive') {
    totalEnemies = 0; buildDriveLevel();
  } else {
    totalEnemies = 0; buildPeaceLevel();
    camera.position.set(L.spawn[0], 1.7, L.spawn[1]);
    camera.rotation.set(0, 0, 0);
  }
  buildColliderGrid();
  el('objText').textContent = L.objective;
  el('distLabel').textContent = '';
  el('levelLabel').textContent = (mode === 'shoot' ? 'УР. ' + (idx + 1) + ' · ' : '') + L.name;
  updateHUD();
}

/* ================================================================
   ОРУЖИЕ
   ================================================================ */
function buildGun(wi) {
  if (gun) camera.remove(gun);
  gun = new THREE.Group(); drumMesh = null;
  const metal  = new THREE.MeshLambertMaterial({ color: 0x30303a });
  const metal2 = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  const woodG  = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
  const woodD  = new THREE.MeshLambertMaterial({ color: 0x4a2c16 });
  let muzzle = new THREE.Vector3(0, 0.02, -0.62);
  if (wi === 1) {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.26), metal);
    slide.position.set(0, 0.03, -0.08); gun.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.15, 0.065), woodG);
    grip.position.set(0, -0.1, 0.06); grip.rotation.x = 0.28; gun.add(grip);
    muzzle = new THREE.Vector3(0, 0.035, -0.28);
    gunBase = { x: 0.28, y: -0.3, z: -0.5 };
  } else if (wi === 2) {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), metal); gun.add(receiver);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), metal2);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.35); gun.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.26), woodG);
    stock.position.set(0, -0.02, 0.33); gun.add(stock);
    muzzle = new THREE.Vector3(0, 0.02, -0.64);
    gunBase = { x: 0.3, y: -0.31, z: -0.56 };
  } else {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 0.5), metal); gun.add(receiver);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8), metal2);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.015, -0.4); gun.add(barrel);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 10), metal);
    drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.115, 0.02); gun.add(drum);
    drumMesh = drum;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.28), woodG);
    stock.position.set(0, -0.03, 0.36); gun.add(stock);
    muzzle = new THREE.Vector3(0, 0.02, -0.66);
    gunBase = { x: 0.32, y: -0.32, z: -0.62 };
  }
  gun.userData.muzzle = muzzle;
  gun.position.set(gunBase.x, gunBase.y, gunBase.z);
  gun.rotation.set(0, 0, 0);
  camera.add(gun);
  if (flashMesh) { flashMesh.position.copy(muzzle); gun.add(flashMesh); }
}
function buildEffects() {
  if (!flashMesh) {
    flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: texFlash, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  flashMesh.position.copy(gun.userData.muzzle); flashMesh.visible = false; gun.add(flashMesh);
  if (flashLight) camera.remove(flashLight);
  flashLight = new THREE.PointLight(0xffcc66, 0, 9, 2);
  flashLight.position.set(0.3, -0.25, -1.2); camera.add(flashLight);
  if (!enemyFlashLight) { enemyFlashLight = new THREE.PointLight(0xffaa44, 0, 12, 2); scene.add(enemyFlashLight); }
  if (!sparkMesh) {
    sparkMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32),
      new THREE.MeshBasicMaterial({ map: texFlash, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(sparkMesh);
  }
  sparkMesh.visible = false;
  if (!shotLight) { shotLight = new THREE.PointLight(0xffdd88, 0, 6, 2); scene.add(shotLight); }
}
let sparkT = -10, flashT = -10;
function spark(point, color) {
  sparkMesh.position.copy(point); sparkMesh.visible = true;
  shotLight.position.copy(point); shotLight.intensity = 1.5; sparkT = gameT;
  spawnParticles(point, color || 0xffcc66, 4, 3.2, 0.32, 0.055, 6);
}
function addTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.85 }));
  scene.add(line); tracers.push({ line: line, t: gameT });
}

/* ================================================================
   МОДЕЛЬ ГАНГСТЕРА
   ================================================================ */
function createGangsterModel(palette, kind, scale) {
  const g = new THREE.Group();
  if (scale) g.scale.setScalar(scale);
  const coatMat  = new THREE.MeshLambertMaterial({ color: palette.coat });
  const coatDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(palette.coat).multiplyScalar(0.68).getHex() });
  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xc79b72 });
  const hatMat   = new THREE.MeshLambertMaterial({ color: palette.hat });
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xd9d3c2 });
  const tieMat   = new THREE.MeshLambertMaterial({ color: 0x8a1a1a });
  const shoeMat  = new THREE.MeshLambertMaterial({ color: 0x121014 });
  const gunMat   = new THREE.MeshLambertMaterial({ color: 0x25252c });

  const legLPivot = new THREE.Group(); legLPivot.position.set(-0.17, 0.92, 0);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.92, 0.26), coatDark);
  legL.position.y = -0.46; legLPivot.add(legL);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.4), shoeMat);
  shoeL.position.set(0, -0.9, 0.06); legLPivot.add(shoeL); g.add(legLPivot);
  const legRPivot = new THREE.Group(); legRPivot.position.set(0.17, 0.92, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.92, 0.26), coatDark);
  legR.position.y = -0.46; legRPivot.add(legR);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.4), shoeMat);
  shoeR.position.set(0, -0.9, 0.06); legRPivot.add(shoeR); g.add(legRPivot);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.5), coatMat);
  torso.position.y = 1.44; g.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.14), shirtMat);
  chest.position.set(0, 1.5, 0.26); g.add(chest);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.05), tieMat);
  tie.position.set(0, 1.42, 0.32); g.add(tie);

  const armLPivot = new THREE.Group(); armLPivot.position.set(-0.52, 1.86, 0);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.22), coatMat);
  armL.position.y = -0.42; armLPivot.add(armL); g.add(armLPivot);

  const armRPivot = new THREE.Group(); armRPivot.position.set(0.52, 1.86, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.22), coatMat);
  armR.position.y = -0.42; armRPivot.add(armR);
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.19), skinMat);
  handR.position.y = -0.9; armRPivot.add(handR); g.add(armRPivot);

  const gunGroup = new THREE.Group();
  if (kind === 'tommy' || kind === 'brute') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.46), gunMat); gunGroup.add(body);
  } else if (kind === 'shotgun') {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), gunMat); gunGroup.add(r);
  } else if (kind === 'sniper') {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.55), gunMat); gunGroup.add(r);
  } else {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.24), gunMat); gunGroup.add(sl);
  }
  gunGroup.position.set(0, -1.0, -0.12);
  gunGroup.rotation.x = -0.1;
  armRPivot.add(gunGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.4), skinMat);
  head.position.y = 2.2; g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x16110c });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), eyeMat);
  eyeL.position.set(-0.1, 2.27, 0.205); g.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.1; g.add(eyeR);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.045, 8), hatMat);
  brim.position.y = 2.44; g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.32, 8), hatMat);
  crown.position.y = 2.62; g.add(crown);

  g.traverse(o => { o.userData.enemyRoot = g; });
  head.userData.isHead = true;
  head.traverse(o => { o.userData.isHead = true; o.userData.enemyRoot = g; });

  return { group: g, legL: legLPivot, legR: legRPivot, armL: armLPivot, armR: armRPivot, gunGroup: gunGroup };
}
function pickEnemyKind() {
  const r = Math.random();
  if (r < 0.45) return 'pistol';
  if (r < 0.70) return 'tommy';
  if (r < 0.85) return 'shotgun';
  if (r < 0.95) return 'brute';
  return 'sniper';
}
function spawnEnemies(L) {
  let list = L.enemies;
  if (SETTINGS.quality === 0) list = L.enemies.filter((_, i) => i % 2 === 0);
  for (let i = 0; i < list.length; i++) {
    const kind = pickEnemyKind();
    const scale = kind === 'brute' ? 1.22 : (kind === 'sniper' ? 0.95 : 1.0);
    const model = createGangsterModel(L.palette, kind, scale);
    model.group.position.set(list[i][0], 0, list[i][1]);
    model.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(model.group);
    let hpMult = 1, dmgMult = 1, speedMult = 1, delayMult = 1;
    if (kind === 'brute') { hpMult = 3.4; dmgMult = 1.4; speedMult = 0.6; delayMult = 1.3; }
    else if (kind === 'sniper') { hpMult = 0.85; dmgMult = 1.8; speedMult = 0.7; delayMult = 1.6; }
    else if (kind === 'shotgun') { hpMult = 1.1; dmgMult = 1.6; speedMult = 1.15; delayMult = 1.0; }
    else if (kind === 'tommy') { hpMult = 1.15; dmgMult = 1.0; speedMult = 0.92; delayMult = 0.85; }
    if (SAVE.meta.approach === 'quiet') { dmgMult *= 0.88; delayMult *= 1.14; speedMult *= 0.96; }
    else if (SAVE.meta.approach === 'loud') { dmgMult *= 1.08; delayMult *= 0.92; }

    const e = {
      group: model.group, legL: model.legL, legR: model.legR,
      armL: model.armL, armR: model.armR, gunGroup: model.gunGroup,
      hp: L.enemyHp * hpMult, maxHp: L.enemyHp * hpMult, kind: kind,
      dmgMult: dmgMult, alive: true, removed: false, isBoss: false,
      shootT: (1.6 + Math.random() * 2.2) * L.enemyDelay * delayMult,
      delayMult: L.enemyDelay * delayMult, speed: L.enemySpeed * speedMult,
      walkT: Math.random() * 6, deathT: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 1 + Math.random() * 2,
      burst: 0, burstT: 0, flinch: 0,
      coverPos: null, coverT: 0, aiMode: 'advance', aiTimer: 1 + Math.random() * 2,
      looted: false
    };
    model.group.userData.enemy = e;
    enemies.push(e);
  }
  if (L.boss) {
    const model = createGangsterModel(L.boss.palette, 'brute', 1.4);
    model.group.position.set(L.boss.pos[0], 0, L.boss.pos[1]);
    model.group.rotation.y = Math.PI;
    scene.add(model.group);
    const b = {
      group: model.group, legL: model.legL, legR: model.legR,
      armL: model.armL, armR: model.armR, gunGroup: model.gunGroup,
      hp: L.boss.hp, maxHp: L.boss.hp, kind: 'brute', dmgMult: 1.5 * (SAVE.meta.approach === 'loud' ? 1.08 : 0.92),
      alive: true, removed: false, isBoss: true, bossName: L.boss.name,
      shootT: 1.0, delayMult: 0.7, speed: 2.4,
      walkT: 0, deathT: 0, strafeDir: 1, strafeT: 1.5,
      burst: 0, burstT: 0, flinch: 0,
      coverPos: null, coverT: 0, aiMode: 'advance', aiTimer: 1, looted: false
    };
    model.group.userData.enemy = b;
    enemies.push(b);
  }
  totalEnemies = enemies.length;
}
function collideCircle(pos, r) {
  const b = LEVELS[level].bounds;
  pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
  pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
  const near = getNearbyColliders(pos.x, pos.z, r + 1);
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    const nx = pos.x < c.minX ? c.minX : (pos.x > c.maxX ? c.maxX : pos.x);
    const nz = pos.z < c.minZ ? c.minZ : (pos.z > c.maxZ ? c.maxZ : pos.z);
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * r; pos.z = nz + (dz / d) * r;
    }
  }
}

/* ================================================================
   УКРЫТИЯ / ПРИСЕД
   ================================================================ */
function findCover(maxDist) {
  const near = getNearbyColliders(camera.position.x, camera.position.z, (maxDist || 1.7) + 0.5);
  let best = null, bestD = maxDist || 1.7;
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (!c.cover) continue;
    const nx = Math.max(c.minX, Math.min(camera.position.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(camera.position.z, c.maxZ));
    const dx = camera.position.x - nx, dz = camera.position.z - nz;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
function enterCover() {
  if (mode !== 'shoot') return;
  const c = findCover();
  if (!c) { showMsg('НЕТ УКРЫТИЯ РЯДОМ'); return; }
  inCover = true; coverAnchor = c;
  const nx = Math.max(c.minX, Math.min(camera.position.x, c.maxX));
  const nz = Math.max(c.minZ, Math.min(camera.position.z, c.maxZ));
  coverNormal.set(camera.position.x - nx, 0, camera.position.z - nz);
  if (coverNormal.length() < 0.001) coverNormal.set(0, 0, 1);
  coverNormal.normalize();
  showMsg('В УКРЫТИИ · C — ВЫЙТИ');
  playClick(0, 600);
}
function exitCover() { inCover = false; coverAnchor = null; playClick(0, 400); }
function toggleCover() { if (inCover) exitCover(); else enterCover(); }

/* ================================================================
   HUD
   ================================================================ */
function updateHUD() {
  el('hpFill').style.width = Math.max(0, hp) + '%';
  el('lowhp').classList.toggle('on', hp < 30 && hp > 0 && state === 'playing');
  if (mode === 'drive') {
    el('kills').textContent = 'Точка ' + Math.min(cpIdx + 1, CPS.length) + ' / ' + CPS.length;
    el('timerLabel').textContent = 'ВРЕМЯ: ' + Math.max(0, Math.ceil(timeLeft));
    return;
  }
  if (mode === 'peace') {
    el('kills').textContent = 'Бизнесов: ' + ownedCount() + ' / ' + BUSINESSES.length;
    el('moneyLabel').textContent = '$' + Math.floor(money) + ' · +$' + incomePerMin() + '/мин';
    const stars = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
    el('wantedStars').textContent = wanted > 0 ? 'РОЗЫСК: ' + stars : '';
    return;
  }
  const w = WEAPONS[weapon];
  el('ammoCount').textContent = ammoInMag[weapon];
  el('weaponName').textContent = w.name;
  el('kills').textContent = 'Убито: ' + kills + ' / ' + totalEnemies;
  el('reloadHint').textContent = reloading ? 'ПЕРЕЗАРЯДКА...' : (ammoInMag[weapon] === 0 ? 'ПУСТО — НАЖМИ R' : '');
}
function updateDistLabel() {
  const d = el('distLabel');
  if (mode === 'shoot' && suitcase) {
    const dx = camera.position.x - suitcase.position.x;
    const dz = camera.position.z - suitcase.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (kills >= totalEnemies) d.textContent = 'ЧЕМОДАН: ' + dist.toFixed(0) + ' м';
    else d.textContent = 'Врагов: ' + (totalEnemies - kills);
  } else if (mode === 'drive' && cpMarker) {
    const dx = car.group.position.x - cpMarker.position.x;
    const dz = car.group.position.z - cpMarker.position.z;
    d.textContent = 'ДО ТОЧКИ: ' + Math.sqrt(dx*dx + dz*dz).toFixed(0) + ' м';
  } else if (mode === 'peace') {
    if (activeJob) {
      const dx = camera.position.x - activeJob.tx, dz = camera.position.z - activeJob.tz;
      d.textContent = 'ЗАДАНИЕ: ' + activeJob.title + ' · ' + Math.sqrt(dx*dx+dz*dz).toFixed(0) + ' м';
    } else if (interactTarget) {
      d.textContent = interactType === 'door' ? '[E] ВОЙТИ' :
                      interactType === 'ped' ? '[E] ГОВОРИТЬ · [F] ОГРАБИТЬ' : '';
    } else d.textContent = 'TAB — БИЗНЕС · E — ДЕЙСТВИЕ · F — ОГРАБИТЬ';
  } else d.textContent = '';
}
function showHitmarker(kill, head) {
  const hm = el('hitmarker');
  hm.className = (kill ? 'kill ' : '') + (head ? 'head' : '');
  hm.style.opacity = '1';
}
function showMsg(text) { el('msg').textContent = text; el('msg').style.opacity = '1'; msgT = gameT; }
function updateStatusIcons() {
  el('chipCover').classList.toggle('on', inCover);
  el('chipCrouch').classList.toggle('on', crouching);
  el('chipHide').classList.toggle('on', hiding || inCover);
}
function updateCrosshair() {
  const w = WEAPONS[weapon];
  let gap = 5 + w.spread * 380 + recoil * 9;
  if (mode === 'shoot') {
    const moving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
                   Math.abs(joy.dx) > 0.2 || Math.abs(joy.dy) > 0.2;
    if (moving) gap += 5;
    if (crouching) gap -= 2;
    if (inCover) gap += 3;
  }
  el('crosshair').style.setProperty('--gap', Math.max(3, gap).toFixed(1) + 'px');
}
function feed(text, isPlayer, isGold) {
  const feedBox = el('killFeed');
  const div = document.createElement('div');
  div.className = 'feedItem' + (isPlayer ? ' player' : '') + (isGold ? ' hs' : '');
  div.textContent = text;
  feedBox.insertBefore(div, feedBox.firstChild);
  while (feedBox.children.length > 5) feedBox.removeChild(feedBox.lastChild);
  setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 6000);
}
function showDamageIndicator(worldX, worldZ) {
  const dx = worldX - camera.position.x;
  const dz = worldZ - camera.position.z;
  const angle = Math.atan2(dx, -dz) + yaw;
  const container = el('dmgIndicators');
  const ind = document.createElement('div');
  ind.className = 'dmgInd';
  ind.style.transform = 'rotate(' + (-angle * 180 / Math.PI) + 'deg)';
  container.appendChild(ind);
  setTimeout(() => { ind.style.opacity = '1'; }, 10);
  setTimeout(() => { ind.style.opacity = '0'; }, 500);
  setTimeout(() => { if (ind.parentNode) ind.parentNode.removeChild(ind); }, 900);
}

/* ================================================================
   МИНИ-КАРТА
   ================================================================ */
let miniCanvas, miniCtx;
function initMinimap() {
  miniCanvas = el('minimap');
  miniCtx = miniCanvas.getContext('2d');
}
function drawMinimap() {
  if (!miniCtx || state !== 'playing') return;
  const W = miniCanvas.width, H = miniCanvas.height;
  miniCtx.clearRect(0, 0, W, H);
  miniCtx.fillStyle = 'rgba(10,8,5,0.85)'; miniCtx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const range = 42;
  const scl = (W / 2) / range;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const fx = -sinY, fz = -cosY, rx = cosY, rz = -sinY;
  const px = camera.position.x, pz = camera.position.z;
  const rangeSq = range * range;
  miniCtx.fillStyle = 'rgba(90,70,40,0.55)';
  const near = getNearbyColliders(px, pz, range + 4);
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (c.maxX - c.minX < 1.5 && c.maxZ - c.minZ < 1.5) continue;
    const x1 = c.minX - px, z1 = c.minZ - pz;
    const x2 = c.maxX - px, z2 = c.maxZ - pz;
    const sx1 = x1*rx + z1*rz, sy1 = x1*fx + z1*fz;
    const sx2 = x2*rx + z2*rz, sy2 = x2*fx + z2*fz;
    const A = cx + sx1*scl, B = cy - sy1*scl;
    const C = cx + sx2*scl, D = cy - sy2*scl;
    miniCtx.fillRect(Math.min(A,C), Math.min(B,D), Math.abs(C-A), Math.abs(D-B));
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive || !e.group.parent) continue;
    const dx = e.group.position.x - px, dz = e.group.position.z - pz;
    if (dx*dx + dz*dz > rangeSq) continue;
    const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
    miniCtx.fillStyle = e.isBoss ? '#ffd200' : '#ff3322';
    miniCtx.beginPath();
    miniCtx.arc(cx + sx*scl, cy - sy*scl, e.isBoss ? 5 : 3, 0, Math.PI * 2);
    miniCtx.fill();
  }
  for (let i = 0; i < cops.length; i++) {
    const c = cops[i]; if (!c.alive) continue;
    const dx = c.group.position.x - px, dz = c.group.position.z - pz;
    if (dx*dx + dz*dz > rangeSq) continue;
    const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
    miniCtx.fillStyle = '#3366ff';
    miniCtx.beginPath(); miniCtx.arc(cx + sx*scl, cy - sy*scl, 3, 0, Math.PI*2); miniCtx.fill();
  }
  if (mode === 'peace') {
    miniCtx.fillStyle = '#d8c88f';
    for (let i = 0; i < pedestrians.length; i++) {
      const p = pedestrians[i]; if (!p.alive) continue;
      const dx = p.model.group.position.x - px, dz = p.model.group.position.z - pz;
      if (dx*dx + dz*dz > rangeSq) continue;
      const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
      miniCtx.beginPath(); miniCtx.arc(cx + sx*scl, cy - sy*scl, 2, 0, Math.PI*2); miniCtx.fill();
    }
  }
  for (let i = 0; i < pickups.length; i++) {
    const pk = pickups[i];
    const dx = pk.group.position.x - px, dz = pk.group.position.z - pz;
    if (dx*dx + dz*dz > rangeSq) continue;
    const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
    miniCtx.fillStyle = pk.type === 'med' ? '#ff4466' : (pk.type === 'ammo' ? '#e3c877' : '#33dd66');
    miniCtx.beginPath(); miniCtx.arc(cx + sx*scl, cy - sy*scl, 2.5, 0, Math.PI*2); miniCtx.fill();
  }
  if (suitcase) {
    const dx = suitcase.position.x - px, dz = suitcase.position.z - pz;
    if (dx*dx + dz*dz <= rangeSq) {
      const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
      miniCtx.fillStyle = '#33dd66';
      miniCtx.beginPath(); miniCtx.arc(cx + sx*scl, cy - sy*scl, 4, 0, Math.PI*2); miniCtx.fill();
    }
  }
  if (mode === 'peace') {
    for (let i = 0; i < BUSINESSES.length; i++) {
      const b = BUSINESSES[i];
      const dx = b.mx - px, dz = b.mz - pz;
      if (dx*dx + dz*dz > rangeSq) continue;
      const sx = dx*rx + dz*rz, sy = dx*fx + dz*fz;
      miniCtx.fillStyle = b.owned ? '#33cc66' : '#ffcc33';
      miniCtx.beginPath(); miniCtx.arc(cx + sx*scl, cy - sy*scl, 4, 0, Math.PI*2); miniCtx.fill();
    }
  }
  miniCtx.fillStyle = '#ffffff';
  miniCtx.beginPath();
  miniCtx.moveTo(cx, cy - 6); miniCtx.lineTo(cx - 4, cy + 5); miniCtx.lineTo(cx + 4, cy + 5);
  miniCtx.closePath(); miniCtx.fill();
}

/* ================================================================
   СТРЕЛЬБА
   ================================================================ */
function tryShoot() {
  if (state !== 'playing' || reloading || mode !== 'shoot') return;
  if (gameT - lastShot < WEAPONS[weapon].rate) return;
  shoot();
}
function shoot() {
  const w = WEAPONS[weapon];
  if (ammoInMag[weapon] <= 0) { startReload(); return; }
  ammoInMag[weapon]--; lastShot = gameT; recoil = 1;
  let kickMult = 1;
  if (crouching) kickMult *= 0.7;
  if (inCover) kickMult *= 0.85;
  pitch = Math.max(-1.45, Math.min(1.45, pitch + w.kick * kickMult));
  yaw += (Math.random() - 0.5) * w.spread * (crouching ? 0.6 : 1) * (inCover ? 0.75 : 1);
  playShot(w.vol, w.freq);
  shake = Math.min(0.5, shake + w.recoilVis * 0.045);
  if (drumMesh) drumMesh.rotation.x += 0.6;
  flashMesh.visible = true; flashLight.intensity = 2.2; flashT = gameT;
  spawnParticles(camera.position.clone().add(
    new THREE.Vector3(Math.sin(yaw)*-0.5, -0.15, Math.cos(yaw)*-0.5)), 0xffcc66, 2, 1.6, 0.16, 0.03, 2);

  for (let p = 0; p < w.pellets; p++) {
    raycaster.setFromCamera({ x: (Math.random() - 0.5) * w.spread, y: (Math.random() - 0.5) * w.spread }, camera);
    const targets = worldMeshes.slice();
    for (let e of enemies) if (e.alive) targets.push(e.group);
    for (let c of cops) if (c.alive) targets.push(c.group);
    const hits = raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      const h = hits[0];
      let obj = h.object;
      let isHead = false;
      let root = obj;
      while (root && !root.userData.enemyRoot && root.parent) {
        if (root.userData.isHead) isHead = true;
        root = root.parent;
      }
      if (root && root.userData.enemyRoot) root = root.userData.enemyRoot;
      if (obj.userData.isHead) isHead = true;
      if (root && root.userData.enemy && root.userData.enemy.alive) {
        const target = root.userData.enemy;
        const isCopTarget = cops.indexOf(target) >= 0;
        let dmg = w.dmg;
        if (isHead) dmg *= 2.5;
        if (h.distance > 25) dmg *= 0.7;
        damageEnemy(target, dmg, h.point, isHead, isCopTarget);
      } else if (p === 0 || w.pellets > 1) {
        spark(h.point, 0xffcc66);
      }
    }
  }
  updateHUD();
}
function startReload() {
  if (mode !== 'shoot' || reloading || ammoInMag[weapon] === WEAPONS[weapon].mag) return;
  reloading = true; reloadT = 0; playReload(WEAPONS[weapon].reload); updateHUD();
}
function switchWeapon(i) {
  if (mode !== 'shoot') return;
  weapon = (i + WEAPONS.length) % WEAPONS.length;
  reloading = false; buildGun(weapon);
  if (flashMesh) { flashMesh.position.copy(gun.userData.muzzle); gun.add(flashMesh); }
  playClick(0, 520); showMsg(WEAPONS[weapon].name); updateHUD();
}
function meleeAttack() {
  if (state !== 'playing' || mode !== 'shoot') return;
  if (gameT - meleeT < 0.55) return;
  meleeT = gameT; playMelee();
  shake = Math.min(0.5, shake + 0.15);
  const pp = camera.position;
  const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
  for (let e of enemies) {
    if (!e.alive) continue;
    const dx = e.group.position.x - pp.x, dz = e.group.position.z - pp.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d > 2.3) continue;
    const dot = (dx * fwdX + dz * fwdZ) / (d || 1);
    if (dot < 0.55) continue;
    damageEnemy(e, 55 + Math.random() * 25, e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), false, false);
  }
  for (let c of cops) {
    if (!c.alive) continue;
    const dx = c.group.position.x - pp.x, dz = c.group.position.z - pp.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d > 2.3) continue;
    const dot = (dx * fwdX + dz * fwdZ) / (d || 1);
    if (dot < 0.55) continue;
    damageEnemy(c, 60, c.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), false, true);
  }
}
function damageEnemy(e, dmg, point, isHead, isCop) {
  if (!e.alive) return;
  e.hp -= dmg;
  playHit(isHead); e.flinch = 1;
  if (point) spawnParticles(point, 0x8a1212, isHead ? 8 : 5, 2.6, 0.55, 0.05, 10);
  if (isHead) { SAVE.headshots++; feed((isCop ? 'КОП' : 'ВРАГ') + ' — ХЕДШОТ', true, true); }
  if (e.hp <= 0) {
    e.alive = false; e.deathT = gameT; kills++; SAVE.totalKills++;
    SAVE.meta.respect += isCop ? 2 : (e.isBoss ? 12 : 1);
    SAVE.meta.influence += e.isBoss ? 5 : 1;
    showHitmarker(true, isHead);
    playScream();
    const bp = e.group.position.clone(); bp.y = 1.2;
    spawnParticles(bp, 0x8a1212, 12, 3.2, 0.9, 0.07, 11);
    const roll = Math.random();
    const px = e.group.position.x, pz = e.group.position.z;
    if (roll < 0.35) spawnPickup(px, pz, 'ammo');
    else if (roll < 0.55) spawnPickup(px, pz, 'cash');
    else if (roll < 0.68) spawnPickup(px, pz, 'med');
    if (e.isBoss) {
      feed('★ ' + e.bossName + ' ПОВЕРЖЕН', true, true);
      SAVE.achievements.boss1 = (SAVE.achievements.boss1 || 0) + 1;
      for (let i = 0; i < 4; i++) spawnPickup(px + (Math.random()-0.5)*3, pz + (Math.random()-0.5)*3, ['ammo','med','cash','ammo'][i]);
    }
    if (isCop) { wanted = Math.max(0, wanted - 1); SAVE.meta.heat = Math.max(0, (SAVE.meta.heat || 0) - 1); }
    if (kills >= totalEnemies) {
      el('objText').textContent = 'Путь чист — забери чемодан!';
      showMsg('ПУТЬ ЧИСТ — ЗАБЕРИ ЧЕМОДАН');
    } else showMsg('ЕСТЬ! ОСТАЛОСЬ ' + (totalEnemies - kills));
    checkAchievements();
  } else showHitmarker(false, isHead);
}

/* ================================================================
   AI ВРАГОВ
   ================================================================ */
function findEnemyCover(e, maxDist) {
  const near = getNearbyColliders(e.group.position.x, e.group.position.z, 8);
  let best = null, bestD = maxDist || 6;
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (!c.cover) continue;
    const cx = (c.minX + c.maxX) * 0.5, cz = (c.minZ + c.maxZ) * 0.5;
    const dx = cx - camera.position.x, dz = cz - camera.position.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    const ex = e.group.position.x - cx, ez = e.group.position.z - cz;
    const ed = Math.sqrt(ex*ex + ez*ez);
    if (d < 2 || d > 22) continue;
    if (ed > bestD) continue;
    if (ed > d) continue;
    bestD = ed; best = c;
  }
  return best;
}
function updateEnemies(dt) {
  const pp = camera.position;
  for (let ei = 0; ei < enemies.length; ei++) {
    const e = enemies[ei];
    if (e.removed) continue;
    if (e.flinch > 0) e.flinch = Math.max(0, e.flinch - dt * 4);
    if (!e.alive) {
      const t = gameT - e.deathT;
      const fall = Math.min(1, t / 0.7);
      e.group.rotation.x = -fall * Math.PI / 2 * 0.95;
      e.group.position.y = -fall * 0.15;
      if (t > 6) { scene.remove(e.group); e.removed = true; }
      continue;
    }
    const dx = pp.x - e.group.position.x, dz = pp.z - e.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const targetRot = Math.atan2(dx, dz);
    let dr = targetRot - e.group.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    e.group.rotation.y += dr * Math.min(1, dt * 6);

    e.aiTimer -= dt;
    if (e.aiTimer <= 0) {
      e.aiTimer = 1.5 + Math.random() * 2.5;
      if (e.hp < e.maxHp * 0.28 && !e.isBoss) e.aiMode = 'retreat';
      else if (dist > 14) e.aiMode = 'advance';
      else if (dist < 6) e.aiMode = 'strafe';
      else e.aiMode = (Math.random() < 0.5) ? 'cover' : 'advance';
    }
    if (e.aiMode === 'cover') {
      if (!e.coverPos || e.coverT <= 0) { e.coverPos = findEnemyCover(e, 6); e.coverT = 3 + Math.random() * 3; }
      e.coverT -= dt;
      if (e.coverPos) {
        const cx = (e.coverPos.minX + e.coverPos.maxX) * 0.5;
        const cz = (e.coverPos.minZ + e.coverPos.maxZ) * 0.5;
        const ex = cx - e.group.position.x, ez = cz - e.group.position.z;
        const ed = Math.sqrt(ex*ex + ez*ez);
        if (ed > 0.7) {
          const sp = e.speed * dt;
          e.group.position.x += (ex / ed) * sp;
          e.group.position.z += (ez / ed) * sp;
          e.walkT += dt * 9;
          e.legL.rotation.x = Math.sin(e.walkT) * 0.55;
          e.legR.rotation.x = -Math.sin(e.walkT) * 0.55;
        }
      }
    } else if (e.aiMode === 'advance') {
      if (dist > 7) {
        const sp = e.speed * dt;
        e.group.position.x += (dx / dist) * sp;
        e.group.position.z += (dz / dist) * sp;
        e.walkT += dt * 9;
        e.legL.rotation.x = Math.sin(e.walkT) * 0.55;
        e.legR.rotation.x = -Math.sin(e.walkT) * 0.55;
      } else e.aiMode = 'strafe';
    } else if (e.aiMode === 'retreat') {
      const sp = e.speed * 1.2 * dt;
      e.group.position.x -= (dx / dist) * sp;
      e.group.position.z -= (dz / dist) * sp;
      e.walkT += dt * 10;
      e.legL.rotation.x = Math.sin(e.walkT) * 0.65;
      e.legR.rotation.x = -Math.sin(e.walkT) * 0.65;
    } else {
      e.strafeT -= dt;
      if (e.strafeT <= 0) { e.strafeDir *= -1; e.strafeT = 1.2 + Math.random() * 2; }
      const px = -dz / dist, pz = dx / dist;
      e.group.position.x += px * e.strafeDir * e.speed * 0.55 * dt;
      e.group.position.z += pz * e.strafeDir * e.speed * 0.55 * dt;
      e.walkT += dt * 5;
      e.legL.rotation.x = Math.sin(e.walkT) * 0.3;
      e.legR.rotation.x = -Math.sin(e.walkT) * 0.3;
    }
    collideCircle(e.group.position, 0.5);
    e.armR.rotation.x = -Math.PI / 2 + 0.15;

    if (e.burst > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) { e.burst--; e.burstT = 0.09; enemyShoot(e, dist); }
    } else {
      e.shootT -= dt;
      if (e.shootT <= 0 && dist < 26 && state === 'playing') {
        if (e.kind === 'tommy' || e.isBoss) {
          e.burst = e.isBoss ? 6 : 4; e.burstT = 0;
          e.shootT = (1.9 + Math.random() * 1.6) * e.delayMult;
        } else if (e.kind === 'shotgun') {
          e.shootT = (1.8 + Math.random() * 1.4) * e.delayMult;
          enemyShoot(e, dist, true);
        } else {
          e.shootT = (1.4 + Math.random() * 1.6) * e.delayMult;
          enemyShoot(e, dist);
        }
      }
    }
  }
}
function hasLineOfFire(muzzle, target) {
  const dir = target.clone().sub(muzzle);
  const targetDist = dir.length();
  if (targetDist <= 0.001) return true;
  dir.normalize();
  const ray = new THREE.Raycaster(muzzle, dir, 0, targetDist);
  const hits = ray.intersectObjects(worldMeshes, true);
  // Любой объект среды между стрелком и игроком блокирует урон.
  // Малый epsilon не даёт дрожанию камеры/поверхностей случайно гасить выстрелы.
  for (const hit of hits) {
    if (hit.distance < targetDist - 0.12) return false;
  }
  return true;
}
function enemyShoot(e, dist) {
  const muzzle = e.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  muzzle.x += Math.sin(e.group.rotation.y) * -0.5;
  muzzle.z += Math.cos(e.group.rotation.y) * -0.5;
  playShot(0.13, 900);
  addTracer(muzzle, camera.position.clone());
  enemyFlashLight.position.copy(muzzle); enemyFlashLight.intensity = 1.4;
  const target = camera.position.clone();
  const blocked = !hasLineOfFire(muzzle, target);
  if (blocked) return;
  let chance = e.kind === 'tommy' ? 0.28 : (e.kind === 'sniper' ? 0.55 : 0.42);
  chance = Math.max(0.08, chance - dist * (e.kind === 'sniper' ? 0.006 : 0.014));
  const moving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
                 Math.abs(joy.dx) > 0.2 || Math.abs(joy.dy) > 0.2;
  if (moving) chance *= 0.72;
  if (crouching) chance *= 0.75;
  if (inCover) chance *= 0.35;
  if (Math.random() < chance) {
    let dmg = e.kind === 'tommy' ? (5 + Math.random() * 5) :
              e.kind === 'sniper' ? (16 + Math.random() * 10) :
              e.kind === 'shotgun' ? (12 + Math.random() * 12) :
              (9 + Math.random() * 8);
    dmg *= (e.dmgMult || 1);
    hp -= dmg; hitFlash = 1; shake = Math.min(0.7, shake + 0.12);
    damageTakenThisLevel += dmg;
    playHurt(); showDamageIndicator(muzzle.x, muzzle.z); updateHUD();
    if (hp <= 0) die();
  }
}

/* ================================================================
   ЭКРАНЫ
   ================================================================ */
function showScreen(id) {
  const screens = ['startScreen', 'pauseScreen', 'deadScreen', 'winScreen', 'carScreen'];
  for (let s of screens) { const scr = el(s); if (scr) scr.classList.toggle('visible', s === id); }
  document.body.classList.toggle('playing', id === null);
}
function startPlaying() {
  state = 'playing'; startTime = gameT; initAudio(); showScreen(null);
  if (!isTouch && renderer && renderer.domElement && renderer.domElement.requestPointerLock) {
    try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch(e){}
  }
}
function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused'; firing = false; showScreen('pauseScreen');
  if (document.exitPointerLock) document.exitPointerLock();
  if (SETTINGS.autosave) saveGame();
}
function resumeGame() {
  state = 'playing'; showScreen(null);
  if (!isTouch && renderer && renderer.domElement && renderer.domElement.requestPointerLock) {
    try { renderer.domElement.requestPointerLock(); } catch(e){}
  }
}
function restartLevel() { loadLevel(level); startPlaying(); }
function goToMenu() { state = 'menu'; firing = false; showScreen('startScreen'); if (SETTINGS.autosave) saveGame(); }
function die() {
  state = 'dead'; firing = false;
  el('deadStats').textContent = mode === 'shoot' ? 'Убито: ' + kills + ' / ' + totalEnemies : '';
  showScreen('deadScreen');
  if (document.exitPointerLock) document.exitPointerLock();
}
function winGame() {
  state = 'win'; firing = false;
  const L = LEVELS[level];
  el('winText').textContent = L.winText || 'Семья довольна.';
  if (mode === 'shoot') {
    el('winStats').textContent = 'Время: ' + (gameT - startTime).toFixed(1) + ' с · Убито: ' + kills + ' / ' + totalEnemies;
    if (damageTakenThisLevel < 1) SAVE.achievements.survivor = (SAVE.achievements.survivor || 0) + 1;
    const reward = 200 + kills * 25;
    SAVE.money += reward;
    el('winStats').textContent += ' · + $' + reward;
  } else if (mode === 'drive') {
    el('winStats').textContent = 'Осталось: ' + Math.max(0, timeLeft).toFixed(1) + ' с';
    SAVE.achievements.wheelman = (SAVE.achievements.wheelman || 0) + 1;
    SAVE.money += 500;
  } else {
    el('winStats').textContent = 'Капитал: $' + Math.floor(money) + ' · Доход: $' + incomePerMin() + '/мин';
  }
  checkAchievements(); saveGame();
  el('btnNextLevel').style.display = (level < LEVELS.length - 1) ? '' : 'none';
  showScreen('winScreen');
  if (document.exitPointerLock) document.exitPointerLock();
}
function checkAchievements() {
  let unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!SAVE.achievements[a.id] && a.test()) {
      SAVE.achievements[a.id] = 1;
      unlocked.push(a);
    }
  }
  if (unlocked.length) {
    saveGame();
    for (const a of unlocked) feed('🏆 ' + a.name, false, true);
    showMsg('🏆 ' + unlocked[0].name);
  }
}

/* ================================================================
   УПРАВЛЕНИЕ
   ================================================================ */
let mouseSens = 0.0022;
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement && state === 'playing') {
    if (mode === 'drive') orbitYaw = Math.max(-1.5, Math.min(1.5, orbitYaw - e.movementX * 0.003));
    else {
      yaw -= e.movementX * mouseSens * SETTINGS.sens;
      pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * mouseSens * SETTINGS.sens));
    }
  }
});
document.addEventListener('mousedown', e => {
  if (e.button === 0 && state === 'playing' && mode === 'shoot') {
    if (WEAPONS[weapon].auto) firing = true; else tryShoot();
  }
});
document.addEventListener('mouseup', e => { if (e.button === 0) firing = false; });
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (state !== 'playing') return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') switchWeapon(0);
  if (e.code === 'Digit2') switchWeapon(1);
  if (e.code === 'Digit3') switchWeapon(2);
  if (e.code === 'KeyQ') switchWeapon(weapon + 1);
  if (e.code === 'KeyC') toggleCover();
  if (e.code === 'ControlLeft' || e.code === 'KeyZ') crouching = !crouching;
  if (e.code === 'KeyV') meleeAttack();
  if (e.code === 'KeyE') { if (mode === 'peace') doInteract(); else if (mode === 'shoot') tryLoot(); }
  if (e.code === 'KeyF' && mode === 'peace') tryRob();
  if (e.code === 'Tab' && mode === 'peace') { e.preventDefault(); toggleBizMenu(); }
  if (e.code === 'KeyP') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function setupTouch() {
  const joyZone = el('joyZone'), joyKnob = el('joyKnob');
  function mJoy(t) {
    const r = joyZone.getBoundingClientRect();
    let dx = (t.clientX - (r.left + r.width/2)) / (r.width/2);
    let dy = (t.clientY - (r.top + r.height/2)) / (r.height/2);
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 1) { dx/=len; dy/=len; }
    joy.dx = dx; joy.dy = dy;
    joyKnob.style.transform = `translate(calc(-50% + ${dx*38}px), calc(-50% + ${dy*38}px))`;
  }
  joyZone.addEventListener('touchstart', e => { e.preventDefault(); joy.active = true; mJoy(e.changedTouches[0]); }, {passive:false});
  joyZone.addEventListener('touchmove', e => { e.preventDefault(); if (joy.active) mJoy(e.changedTouches[0]); }, {passive:false});
  joyZone.addEventListener('touchend', e => { e.preventDefault(); joy.active = false; joy.dx = 0; joy.dy = 0; joyKnob.style.transform = 'translate(-50%, -50%)'; }, {passive:false});
  document.addEventListener('touchstart', e => {
    for (let t of e.changedTouches) {
      if (t.clientX > window.innerWidth * 0.4 && lookTouch.id === null) {
        lookTouch.id = t.identifier; lookTouch.lx = t.clientX; lookTouch.ly = t.clientY;
      }
    }
  }, {passive:true});
  document.addEventListener('touchmove', e => {
    for (let t of e.changedTouches) {
      if (t.identifier === lookTouch.id) {
        yaw -= (t.clientX - lookTouch.lx) * 0.005 * SETTINGS.sens;
        pitch = Math.max(-1.45, Math.min(1.45, pitch - (t.clientY - lookTouch.ly) * 0.005 * SETTINGS.sens));
        lookTouch.lx = t.clientX; lookTouch.ly = t.clientY;
      }
    }
  }, {passive:true});
  document.addEventListener('touchend', e => {
    for (let t of e.changedTouches) if (t.identifier === lookTouch.id) lookTouch.id = null;
  }, {passive:true});
  el('btnFire').addEventListener('touchstart', e => { e.preventDefault(); if (WEAPONS[weapon].auto) firing = true; else tryShoot(); }, {passive:false});
  el('btnFire').addEventListener('touchend', e => { e.preventDefault(); firing = false; }, {passive:false});
  el('btnReload').addEventListener('touchstart', e => { e.preventDefault(); startReload(); }, {passive:false});
  el('btnWeapon').addEventListener('touchstart', e => { e.preventDefault(); switchWeapon(weapon + 1); }, {passive:false});
  el('btnPause').addEventListener('touchstart', e => { e.preventDefault(); pauseGame(); }, {passive:false});
  el('btnCrouch').addEventListener('touchstart', e => { e.preventDefault(); crouching = !crouching; }, {passive:false});
  el('btnCover').addEventListener('touchstart', e => { e.preventDefault(); toggleCover(); }, {passive:false});
  el('btnAction').addEventListener('touchstart', e => { e.preventDefault(); doInteract(); }, {passive:false});
  el('btnMenu').addEventListener('touchstart', e => { e.preventDefault(); toggleBizMenu(); }, {passive:false});
}
function bindBtn(id, fn) {
  const b = el(id); if (!b) return;
  b.addEventListener('click', e => { e.preventDefault(); fn(); });
  b.addEventListener('touchend', e => { e.preventDefault(); fn(); });
}

/* ================================================================
   ИГРОК
   ================================================================ */
function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (keys['KeyW']) iz += 1; if (keys['KeyS']) iz -= 1;
  if (keys['KeyA']) ix -= 1; if (keys['KeyD']) ix += 1;
  ix += joy.dx; iz -= joy.dy;
  let len = Math.sqrt(ix * ix + iz * iz);
  if (len > 1) { ix /= len; iz /= len; }
  if (inCover && coverAnchor) {
    const tx = -coverNormal.z, tz = coverNormal.x;
    const along = ix * tx + iz * tz;
    ix = tx * along; iz = tz * along;
  }
  const baseSpeed = (crouching ? CROUCH_SPEED : PLAYER_SPEED) * (inCover ? 0.55 : 1);
  const speed = baseSpeed * dt;
  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  camera.position.x += (cosY * ix - sinY * iz) * speed;
  camera.position.z += (-sinY * ix - cosY * iz) * speed;
  collideCircle(camera.position, PLAYER_RADIUS);

  const moving = len > 0.08 && baseSpeed > 0.5;
  if (moving) {
    bobT += dt * (crouching ? 6 : 9);
    playerFootstepT -= dt * (crouching ? 0.7 : 1);
    if (playerFootstepT <= 0) { playerFootstepT = crouching ? 0.6 : 0.42; playStep(); }
  } else playerFootstepT = 0;
  const bob = moving ? Math.sin(bobT) * (crouching ? 0.018 : 0.035) : 0;
  const sway = moving ? Math.cos(bobT * 0.5) * 0.02 : 0;

  const targetY = crouching ? 1.05 : (inCover ? 1.25 : 1.7);
  camY += (targetY - camY) * Math.min(1, dt * 10);

  shake = Math.max(0, shake - dt * 2.2);
  if (!SETTINGS.shake) shake = 0;
  shakeRoll += ((Math.random() - 0.5) * shake * 0.06 - shakeRoll) * Math.min(1, dt * 12);
  const shakePitch = (Math.random() - 0.5) * shake * 0.035;
  const shakeYaw = (Math.random() - 0.5) * shake * 0.035;

  camera.position.y = camY + bob * 0.5;
  camera.rotation.y = yaw + shakeYaw;
  camera.rotation.x = pitch + shakePitch;
  camera.rotation.z = shakeRoll;

  hiding = false;
  if (inCover) hiding = true;
  else if (crouching) {
    const near = getNearbyColliders(camera.position.x, camera.position.z, 2);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (c.top > 1.0 || c.top < 0.4) continue;
      const nx = Math.max(c.minX, Math.min(camera.position.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(camera.position.z, c.maxZ));
      const dx = camera.position.x - nx, dz = camera.position.z - nz;
      if (dx*dx + dz*dz < 1.2) { hiding = true; break; }
    }
  }
  if (gun) {
    recoil = Math.max(0, recoil - dt * 7);
    const kick = recoil * WEAPONS[weapon].recoilVis;
    if (gameT - meleeT < 0.25) {
      const k = (gameT - meleeT) / 0.25;
      gun.rotation.x = -Math.sin(k * Math.PI) * 0.9;
      gun.position.z = gunBase.z - Math.sin(k * Math.PI) * 0.25;
    } else {
      const gunYExtra = inCover ? -0.06 : 0;
      const gunZExtra = inCover ? 0.04 : 0;
      gun.position.z += ((gunBase.z + kick * 0.075 + gunZExtra) - gun.position.z) * Math.min(1, dt * 15);
      gun.position.y = gunBase.y + bob + kick * 0.02 + gunYExtra;
      gun.position.x = gunBase.x + sway;
      if (reloading) {
        reloadT += dt;
        const p = Math.min(1, reloadT / WEAPONS[weapon].reload);
        gun.rotation.x = Math.sin(Math.PI * p) * 0.85;
        gun.rotation.z = Math.sin(Math.PI * p) * 0.35;
        if (reloadT >= WEAPONS[weapon].reload) {
          reloading = false; ammoInMag[weapon] = WEAPONS[weapon].mag;
          gun.rotation.set(0, 0, 0); updateHUD();
        }
      } else {
        gun.rotation.x += (0 - gun.rotation.x) * Math.min(1, dt * 12);
        gun.rotation.z += (0 - gun.rotation.z) * Math.min(1, dt * 12);
      }
    }
    if (firing && WEAPONS[weapon].auto) tryShoot();
  }
}
function updateEffects(dt) {
  if (flashMesh && flashMesh.visible && gameT - flashT > 0.05) { flashMesh.visible = false; flashLight.intensity = 0; }
  if (sparkMesh && sparkMesh.visible && gameT - sparkT > 0.09) { sparkMesh.visible = false; shotLight.intensity = 0; }
  if (enemyFlashLight && enemyFlashLight.intensity > 0) enemyFlashLight.intensity = Math.max(0, enemyFlashLight.intensity - dt * 18);
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i]; const age = gameT - tr.t;
    if (age > 0.07) { scene.remove(tr.line); tr.line.geometry.dispose(); tracers.splice(i, 1); }
    else tr.line.material.opacity = 0.85 * (1 - age / 0.07);
  }
  const v = el('vignette');
  if (parseFloat(v.style.opacity || 0) > 0) v.style.opacity = Math.max(0, parseFloat(v.style.opacity) - dt * 3);
  const df = el('dmgFlash');
  if (hitFlash > 0) { hitFlash = Math.max(0, hitFlash - dt * 2.6); df.style.opacity = hitFlash * 0.9; }
  else if (df.style.opacity !== '0') df.style.opacity = '0';
  updateParticles(dt);
  updateStatusIcons();
}
function checkWin() {
  if (suitcase) {
    const dx = camera.position.x - suitcase.position.x, dz = camera.position.z - suitcase.position.z;
    if (dx*dx + dz*dz < 4 && kills >= totalEnemies) winGame();
  }
}
function tryLoot() {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.alive || e.looted || !e.group.parent) continue;
    const dx = e.group.position.x - camera.position.x;
    const dz = e.group.position.z - camera.position.z;
    if (dx*dx + dz*dz < 2.5) {
      e.looted = true;
      const roll = Math.random();
      if (roll < 0.4) spawnPickup(e.group.position.x, e.group.position.z, 'ammo');
      else if (roll < 0.7) spawnPickup(e.group.position.x, e.group.position.z, 'cash');
      else if (roll < 0.85) spawnPickup(e.group.position.x, e.group.position.z, 'med');
      showMsg('ОБЫСК...');
      return;
    }
  }
  showMsg('НЕКОГО ОБЫСКАТЬ');
}

/* ================================================================
   МАШИНЫ
   ================================================================ */
const CARS = [
  { name: 'ГАЗ-А «Фаэтон»', accel: 13, steer: 2.7, color: 0x3e5c2a, L: 3.4, W: 1.45, top: 26, era: '1932', price: 0 },
  { name: 'ГАЗ-М1 «Эмка»',  accel: 12, steer: 2.5, color: 0x23252b, L: 4.0, W: 1.5,  top: 30, era: '1936', price: 2500 },
  { name: 'ЗИС-101',        accel: 11, steer: 2.4, color: 0x5a1418, L: 5.0, W: 1.6,  top: 34, era: '1936', price: 5000 },
  { name: 'ВАЗ-2101 «Копейка»', accel: 14, steer: 3.0, color: 0xd8d0b8, L: 4.1, W: 1.55, top: 32, era: '1970', price: 0 },
  { name: 'ВАЗ-2106',         accel: 14, steer: 3.05, color: 0x8a2a1a, L: 4.1, W: 1.55, top: 34, era: '1976', price: 3500 },
  { name: 'ВАЗ-2109 «Девятка»', accel: 15, steer: 3.2, color: 0x1a3a5a, L: 4.0, W: 1.62, top: 38, era: '1987', price: 6000 }
];
const CPS = [[0,0],[30,0],[30,-30],[60,-30],[0,60],[-30,0],[-60,-60]];
const BUSINESSES = [
  { name: 'БАР «У КЛЕФА»',    mx: -15, mz: 15,  price: 0,    income: 80,   owned: true,  color: 0x6a3a1a },
  { name: 'ПРАЧЕЧНАЯ',         mx: 45,  mz: -15, price: 400,  income: 120,  owned: false, color: 0x2a4a6a },
  { name: 'ОТЕЛЬ «МЕТРОПОЛЬ»', mx: 15,  mz: 75,  price: 1500, income: 400,  owned: false, color: 0x5a4a2a },
  { name: 'КАЗИНО «ФЛАМИНГО»', mx: -55, mz: -45, price: 3200, income: 700,  owned: false, color: 0x6a1a3a },
  { name: 'ПОРТ',              mx: 70,  mz: 60,  price: 6000, income: 1200, owned: false, color: 0x2a5a4a }
];

/* ================================================================
   СЕМЕЙНЫЙ БИЗНЕС · ПЕРСОНАЛ / ОХРАНА / КОНКУРЕНТЫ
   ================================================================ */
const GAME_WEEK_SECONDS = 120; // 2 минуты реального времени = 1 игровая неделя
const GUARD_WEEKLY_WAGE = 75;
const BIZ_UPGRADE_COSTS = [900, 2200, 5200, 11000];
const BIZ_ROLES = ['УПРАВЛЯЮЩИЙ','БАРМЕН','ПОВАР','КЛАВИШНИК','ОХОТНИК ЗА ДОЛГАМИ','БУХГАЛТЕР','ШВЕЙЦАР','КРУПЬЕ'];
const STAFF_NAMES = ['Винченцо','Рикардо','Марко','Леоне','Сальваторе','Анжело','Франко','Пьетро','Лука','Тони','Джузеппе','Никко','Романо','Карло','Марио','Энцо','Ренато','Бруно'];
const STAFF_SURNAMES = ['Беллини','Моретти','Галли','Ферретти','Рицци','Ломбарди','Конти','Бьянки','Манфреди','Фьоре','Санти','Де Лука'];
const RIVAL_NAMES = ['Семья Белладжио','Синдикат Роччи','Банда Ланца','Братья Ферри','Союз Капелло'];
let businessGuards = [];
let businessStaffModels = [];
let interiorGroup = null;
let interiorBiz = null;
let interiorWorldMeshes = [];
let interiorColliders = [];
let inBusinessInterior = false;
let competitorTimer = 24;
let rivalRetaliations = [];
let peaceShots = 0;
let businessMessageTimer = 0;

function randInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function clamp100(v){ return Math.max(0, Math.min(100, Math.round(v))); }
function bizKey(b){ return b.name; }
function staffName(){ return STAFF_NAMES[randInt(0,STAFF_NAMES.length-1)] + ' ' + STAFF_SURNAMES[randInt(0,STAFF_SURNAMES.length-1)]; }
function defaultBusinessRecord(b){
  const owned = !!b.owned;
  const level = owned ? 1 : 0;
  const staff = [];
  if (owned) for(let i=0;i<4;i++) staff.push(makeStaff(b, i));
  return { owned, level, condition: 88, guards: owned ? 1 : 0, sabotage: 0, rivalHeat: 0, staff, cash: 0, recruitmentCooldown: 0 };
}
function makeStaff(b, slot=0){
  const skill = randInt(42,94), loyalty = randInt(35,96), discipline = randInt(40,95);
  const quality = Math.round(skill*0.58 + loyalty*0.22 + discipline*0.20);
  const base = 65 + Math.round(quality*1.05);
  return { id:'stf_'+Date.now()+'_'+Math.random().toString(36).slice(2,8), name:staffName(), role:BIZ_ROLES[(slot + randInt(0,BIZ_ROLES.length-1)) % BIZ_ROLES.length], skill, loyalty, discipline, quality, wage:base, training:0 };
}
function ensureBusinessSystem(){
  SAVE.meta = Object.assign({respect:0,influence:0,heat:0,chapter:1,missions:0,cleanJobs:0,approach:'quiet',territory:0}, SAVE.meta||{});
  SAVE.businesses = SAVE.businesses || {};
  for(const b of BUSINESSES){
    const k=bizKey(b); const old=SAVE.businesses[k];
    if(!old){ SAVE.businesses[k]=defaultBusinessRecord(b); continue; }
    old.staff=Array.isArray(old.staff)?old.staff:[]; old.level=old.level==null?(old.owned?1:0):old.level;
    old.condition=old.condition==null?88:old.condition; old.guards=Math.max(0,Math.min(15,old.guards||0));
    old.sabotage=old.sabotage||0; old.rivalHeat=old.rivalHeat||0; old.cash=old.cash||0; old.recruitmentCooldown=old.recruitmentCooldown||0;
    if(old.owned===undefined) old.owned=!!b.owned;
  }
  for(const b of BUSINESSES){ const r=SAVE.businesses[bizKey(b)]; b.owned=!!r.owned; b.bizState=r; }
  SAVE.businessWeek=SAVE.businessWeek||1; SAVE.businessWeekClock=SAVE.businessWeekClock||0; SAVE.businessDebt=SAVE.businessDebt||0;
}
function getBizState(b){ ensureBusinessSystem(); return SAVE.businesses[bizKey(b)]; }
function bizCapacity(b){ const r=getBizState(b); return 3 + Math.max(0,r.level||0); }
function staffQuality(st){ return clamp100(st.skill*0.58 + st.loyalty*0.22 + st.discipline*0.20); }
function staffEfficiency(b){ const r=getBizState(b); if(!r.staff.length) return 0.45; return Math.max(0.52, r.staff.reduce((a,st)=>a+staffQuality(st),0)/r.staff.length/100); }
function bizGrossPerMin(b){ const r=getBizState(b); if(!r.owned) return 0; const levelMult=1+Math.max(0,r.level-1)*0.17; const condition=Math.max(0.55,(r.condition||0)/100); const sabotage=Math.max(0,1-(r.sabotage||0)*0.18); return b.income*levelMult*(0.68+staffEfficiency(b)*0.48)*condition*sabotage; }
function bizGrossPerWeek(b){ return bizGrossPerMin(b)*GAME_WEEK_SECONDS; }
function bizWeeklyPayroll(b){ const r=getBizState(b); return r.staff.reduce((a,s)=>a+(s.wage||100),0)+(r.guards||0)*GUARD_WEEKLY_WAGE; }
function bizNetPerWeek(b){ return bizGrossPerWeek(b)-bizWeeklyPayroll(b); }
function allWeeklyGross(){ return BUSINESSES.reduce((a,b)=>a+bizGrossPerWeek(b),0); }
const legacyIncomePerMinCrime=incomePerMin;
incomePerMin=function(){ ensureBusinessSystem(); return BUSINESSES.reduce((sum,b)=>sum+bizGrossPerMin(b),0); };
function allWeeklyPayroll(){ return BUSINESSES.reduce((a,b)=>a+bizWeeklyPayroll(b),0); }
function allWeeklyNet(){ return allWeeklyGross()-allWeeklyPayroll(); }
function businessSecurity(b){ const r=getBizState(b); return Math.max(0, Math.min(0.88,(r.guards||0)*0.055 + Math.max(0,(r.level||0)-1)*0.055 + staffEfficiency(b)*0.08)); }
function businessRival(b){ return RIVAL_NAMES[Math.abs(b.name.length*7 + b.mx + b.mz) % RIVAL_NAMES.length]; }
function saveBusinesses(){ saveGame(); }
function applyBusinessVisuals(){
  ensureBusinessSystem();
  for(const b of BUSINESSES){ if(b.sign && b.sign.material){ b.sign.material.color.setHex(b.owned?0x33cc66:0xccaa33); } }
  refreshAllBusinessGuards();
}


function buildCityBlocks(minR, maxR, count, nightMode) {
  for (let i = 0; i < count; i++) {
    const w = 8 + Math.random() * 14;
    const d = 8 + Math.random() * 14;
    const h = 8 + Math.random() * 26;
    let x, z, ok = false, tries = 0;
    while (!ok && tries < 30) {
      tries++;
      x = (Math.random() * 2 - 1) * maxR;
      z = (Math.random() * 2 - 1) * maxR;
      if (Math.abs(x) < minR && Math.abs(z) < minR) continue;
      if (Math.abs(x) < 14 || Math.abs(z) < 14) continue;
      if (Math.abs(Math.abs(x) - 60) < 12 || Math.abs(Math.abs(z) - 60) < 12) continue;
      ok = true;
    }
    if (!ok) continue;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWindows);
    b.position.set(x, h/2, z); scene.add(b); worldMeshes.push(b);
    colliders.push({ minX: x-w/2, maxX: x+w/2, minZ: z-d/2, maxZ: z+d/2, top: h, cover: true });
    if (!nightMode) buildings.push({ x, z, w, d, h });
  }
}
function buildCarModel(def) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0e0e12 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(def.W, 0.78, def.L), bodyMat);
  body.position.y = 0.72; g.add(body);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(def.W * 1.04, 0.34, def.L * 0.98), darkMat);
  lower.position.y = 0.38; g.add(lower);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(def.W * 0.88, 0.66, def.L * 0.45), bodyMat);
  cabin.position.set(0, 1.4, def.L * 0.03); g.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(def.W * 0.9, 0.16, def.L * 0.34), bodyMat);
  hood.position.set(0, 1.05, -def.L * 0.28); g.add(hood);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  for (let s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), headMat);
    hl.position.set(s * def.W * 0.33, 0.85, -def.L/2 - 0.03); g.add(hl);
  }
  const wheels = [];
  const wGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 8);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x121214 });
  const wPos = [[-def.W/2 - 0.06, def.L * 0.32], [def.W/2 + 0.06, def.L * 0.32],
    [-def.W/2 - 0.06, -def.L * 0.32], [def.W/2 + 0.06, -def.L * 0.32]];
  for (let p of wPos) {
    const wp = new THREE.Group(); wp.position.set(p[0], 0.42, p[1]);
    const wheel = new THREE.Mesh(wGeo, wMat); wheel.rotation.z = Math.PI / 2; wp.add(wheel);
    g.add(wp); wheels.push(wp);
  }
  return { group: g, speed: 0, heading: 0, wheels: wheels };
}
function buildDriveLevel() {
  const L = LEVELS[level];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ color: 0x0d0f14 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  const roadMatLocal = new THREE.MeshLambertMaterial({ map: texRoad, color: 0x808080 });
  function road(w, d, x, z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMatLocal);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0, z); scene.add(r);
  }
  road(20, 260, 0, 0); road(20, 260, 60, 0); road(20, 260, -60, 0);
  road(260, 20, 0, 0); road(260, 20, 0, 60); road(260, 20, 0, -60);
  buildCityBlocks(24, 110, SETTINGS.quality === 0 ? 18 : (SETTINGS.quality === 1 ? 28 : 40), true);
  car = buildCarModel(CARS[carIdx]);
  car.group.position.set(L.spawn[0], 0, L.spawn[1]);
  scene.add(car.group);
  cpMarker = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 16, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd958, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  cpMarker.position.y = 8; scene.add(cpMarker);
  const cpRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffd958 }));
  cpRing.rotation.x = -Math.PI/2; cpRing.position.y = 0.15; scene.add(cpRing);
  cpMarker.userData.ring = cpRing;
  cpIdx = 0; timeLeft = 40;
  cpMarker.position.set(CPS[0][0], 8, CPS[0][1]);
  cpRing.position.set(CPS[0][0], 0.15, CPS[0][1]);
  camera.position.set(L.spawn[0], 4, L.spawn[1] + 9);
}
function updateCar(dt) {
  const def = CARS[carIdx];
  let throttle = 0, steer = 0;
  if (keys['KeyW']) throttle += 1; if (keys['KeyS']) throttle -= 1;
  if (keys['KeyA']) steer -= 1; if (keys['KeyD']) steer += 1;
  throttle -= joy.dy; steer += joy.dx;
  car.speed += throttle * def.accel * dt - car.speed * 0.9 * dt;
  car.speed = Math.max(-def.top * 0.5, Math.min(def.top, car.speed));
  const steerPower = def.steer * Math.min(1, Math.abs(car.speed) / 8);
  car.heading -= steer * steerPower * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.group.position.x - Math.sin(car.heading) * car.speed * dt;
  const nz = car.group.position.z - Math.cos(car.heading) * car.speed * dt;
  const b = LEVELS[level].bounds;
  car.group.position.x = Math.max(b.minX, Math.min(b.maxX, nx));
  car.group.position.z = Math.max(b.minZ, Math.min(b.maxZ, nz));
  car.group.rotation.y = car.heading;
  for (let w of car.wheels) w.rotation.x -= car.speed * dt * 2.4;
  const camDist = 8.5, camH = 3.8;
  const targetX = car.group.position.x + Math.sin(car.heading) * camDist;
  const targetZ = car.group.position.z + Math.cos(car.heading) * camDist;
  camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 5);
  camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 5);
  camera.position.y += (camH - camera.position.y) * Math.min(1, dt * 5);
  const lookX = car.group.position.x - Math.sin(car.heading) * 6;
  const lookZ = car.group.position.z - Math.cos(car.heading) * 6;
  camera.lookAt(lookX, 1.2, lookZ);
}
function updateDrive(dt) {
  timeLeft -= dt; updateHUD();
  const cp = CPS[cpIdx];
  const dx = car.group.position.x - cp[0], dz = car.group.position.z - cp[1];
  if (dx*dx + dz*dz < 24) {
    cpIdx++; timeLeft += 13;
    spawnParticles(new THREE.Vector3(cp[0], 1.5, cp[1]), 0xffd958, 12, 5, 0.8, 0.09, 7);
    if (cpIdx >= CPS.length) { winGame(); return; }
    cpMarker.position.set(CPS[cpIdx][0], 8, CPS[cpIdx][1]);
    cpMarker.userData.ring.position.set(CPS[cpIdx][0], 0.15, CPS[cpIdx][1]);
    showMsg('ТОЧКА ВЗЯТА · +13 С');
  }
  if (cpMarker) cpMarker.rotation.y += dt * 0.8;
  if (timeLeft <= 0) die();
}

/* ================================================================
   МИРНЫЙ РЕЖИМ
   ================================================================ */
function createPedestrian(colorHex) {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshLambertMaterial({ color: colorHex });
  const coatDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(colorHex).multiplyScalar(0.7).getHex() });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xc79b72 });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x121014 });
  const legL = new THREE.Group(); legL.position.set(-0.15, 0.85, 0);
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.22), coatDark); l1.position.y = -0.42; legL.add(l1);
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.34), shoeMat); s1.position.set(0, -0.85, 0.05); legL.add(s1);
  g.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.15, 0.85, 0);
  legR.add(l1.clone()); legR.add(s1.clone()); g.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.4), coatMat); torso.position.y = 1.35; g.add(torso);
  const armL = new THREE.Group(); armL.position.set(-0.44, 1.75, 0);
  const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.78, 0.18), coatMat); a1.position.y = -0.39; armL.add(a1); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.44, 1.75, 0); armR.add(a1.clone()); g.add(armR);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.36), skinMat); head.position.y = 2.05; g.add(head);
  g.traverse(o => { o.userData.pedestrianRoot = g; });
  return { group: g, legL, legR, armL, armR };
}
function spawnPedestrians() {
  const colors = [0x3a3a4a, 0x5a3a2a, 0x2a4a3a, 0x4a2a3a, 0x2a2a4a, 0x6a5a3a, 0x1a2a3a, 0x4a3a2a];
  const names = ['Джонни','Сэм','Мэйбл','Клайд','Луиза','Рико','Мо','Гарри','Этель','Сэл','Тони','Багси'];
  const dialogs = [
    'Слышал, у Карпоне большие проблемы...',
    'Не люблю, когда тут стреляют по ночам.',
    'Если ищешь работу — зайди в бар.',
    'Ты из Семьи? Держись подальше от копов.',
    'Доллар сегодня крепче, чем вчера.',
    'Ставки на бега — знаешь такое местечко?',
    'Мне бы тоже такую шляпу...',
    'В городе новый шериф. Не суйся к нему.',
    'Дай монетку, брат, совсем пусто.',
    'Видел твою машину — ух, красота!'
  ];
  const count = SETTINGS.quality === 0 ? 12 : (SETTINGS.quality === 1 ? 18 : 22);
  for (let i = 0; i < count; i++) {
    const model = createPedestrian(colors[i % colors.length]);
    let x, z, ok = false, tries = 0;
    while (!ok && tries < 30) {
      tries++;
      x = (Math.random() * 2 - 1) * 90; z = (Math.random() * 2 - 1) * 90;
      if (Math.abs(x) < 16 || Math.abs(z) < 16) ok = true;
      if (Math.abs(Math.abs(x) - 60) < 14) ok = true;
      if (Math.abs(Math.abs(z) - 60) < 14) ok = true;
    }
    let inside = false;
    for (let c of colliders) if (x > c.minX-1 && x < c.maxX+1 && z > c.minZ-1 && z < c.maxZ+1 && c.top > 3) { inside = true; break; }
    if (inside) { i--; continue; }
    model.group.position.set(x, 0, z);
    model.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(model.group);
    const ang = Math.random() * Math.PI * 2;
    pedestrians.push({
      model: model, name: names[i % names.length], dialog: dialogs[i % dialogs.length],
      dirX: Math.cos(ang), dirZ: Math.sin(ang), speed: 0.8 + Math.random() * 0.9,
      walkT: Math.random() * 10, dirT: 2 + Math.random() * 4,
      fleeing: false, fleeT: 0, alive: true, robbed: false, hasJob: Math.random() < 0.22
    });
  }
}
function updatePedestrians(dt) {
  for (let i = 0; i < pedestrians.length; i++) {
    const p = pedestrians[i];
    if (!p.alive || !p.model.group.parent) continue;
    if (p.fleeing) { p.fleeT -= dt; if (p.fleeT <= 0) { p.fleeing = false; p.dirX = -p.dirX; p.dirZ = -p.dirZ; } p.speed = 3.5; }
    else p.speed = 0.8 + (p.speed > 1.5 ? 0.4 : 0);
    p.dirT -= dt;
    if (p.dirT <= 0 && !p.fleeing) {
      const ang = Math.random() * Math.PI * 2;
      p.dirX = Math.cos(ang); p.dirZ = Math.sin(ang); p.dirT = 2 + Math.random() * 4;
    }
    const nx = p.model.group.position.x + p.dirX * p.speed * dt;
    const nz = p.model.group.position.z + p.dirZ * p.speed * dt;
    p.model.group.position.x = Math.max(-92, Math.min(92, nx));
    p.model.group.position.z = Math.max(-92, Math.min(92, nz));
    const targetRot = Math.atan2(p.dirX, p.dirZ);
    let dr = targetRot - p.model.group.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    p.model.group.rotation.y += dr * Math.min(1, dt * 4);
    p.walkT += dt * (p.speed * 4);
    const amp = p.fleeing ? 0.7 : 0.45;
    p.model.legL.rotation.x = Math.sin(p.walkT) * amp;
    p.model.legR.rotation.x = -Math.sin(p.walkT) * amp;
    p.model.armL.rotation.x = -Math.sin(p.walkT) * amp * 0.7;
    p.model.armR.rotation.x = Math.sin(p.walkT) * amp * 0.7;
  }
}
function updateInteraction() {
  if (mode !== 'peace' || state !== 'playing') { interactTarget = null; interactType = null; return; }
  let best = null, bestType = null, bestD = 6.5;
  for (let b of BUSINESSES) {
    const dx = camera.position.x - b.mx, dz = camera.position.z - (b.mz + 7);
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestD) { bestD = d; best = b; bestType = 'door'; }
  }
  for (let p of pedestrians) {
    if (!p.alive) continue;
    const dx = camera.position.x - p.model.group.position.x;
    const dz = camera.position.z - p.model.group.position.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestD) { bestD = d; best = p; bestType = 'ped'; }
  }
  interactTarget = best; interactType = bestType;
}
function doInteract() {
  if (mode === 'peace') {
    if (!interactTarget) return;
    if (interactType === 'door') openBusinessDoor(interactTarget);
    else if (interactType === 'ped') talkToPed(interactTarget);
  } else if (mode === 'shoot') tryLoot();
}
function openBusinessDoor(biz) {
  const owned = biz.owned;
  const text = owned
    ? 'Твоё заведение работает как часы. Прибыль: $' + biz.income + '/мин. Продать за $' + Math.floor(biz.price * 0.75) + '?'
    : 'Внутри пахнет деревом и табаком. Хозяин готов продать за $' + biz.price + '.';
  const opts = [];
  if (owned) {
    opts.push({ label: 'ПРОДАТЬ ЗА $' + Math.floor(biz.price * 0.75), fn: () => {
      SAVE.money += Math.floor(biz.price * 0.75); money += Math.floor(biz.price * 0.75);
      biz.owned = false; biz.sign.material.color.setHex(0xccaa33);
      playCash(); showMsg('ПРОДАНО: ' + biz.name); updateHUD(); closeDialog();
    }});
    opts.push({ label: 'СОБРАТЬ ВЫРУЧКУ ($' + biz.income + ')', fn: () => {
      const g = biz.income; SAVE.money += g; money += g; playCash(); showMsg('СОБРАНО: $' + g); updateHUD(); closeDialog();
    }});
  } else {
    const canBuy = SAVE.money >= biz.price;
    opts.push({ label: canBuy ? 'КУПИТЬ ЗА $' + biz.price : 'НЕ ХВАТАЕТ $' + (biz.price - Math.floor(SAVE.money)),
      fn: () => { if (canBuy) { SAVE.money -= biz.price; money -= biz.price; biz.owned = true;
        SAVE.meta.influence += 4; SAVE.meta.respect += 3;
        biz.sign.material.color.setHex(0x33cc66); playCash(); showMsg('КУПЛЕНО: ' + biz.name); updateHUD();
        if (ownedCount() >= 4) SAVE.achievements.tycoon = 1; checkAchievements(); } closeDialog(); } });
  }
  opts.push({ label: 'УЙТИ', fn: closeDialog });
  showDialog(biz.name, text, opts);
}
function talkToPed(p) {
  const opts = [];
  if (p.hasJob && !activeJob) {
    const targets = [
      { tx: 40 + Math.random()*30, tz: 40 + Math.random()*30, title: 'ДОСТАВИТЬ ПАКЕТ' },
      { tx: -40 - Math.random()*30, tz: -40 - Math.random()*30, title: 'ОТНЕСТИ ПИСЬМО' },
      { tx: -30, tz: 50, title: 'ЗАБРАТЬ ДОЛГ' }
    ];
    const t = targets[Math.floor(Math.random() * targets.length)];
    opts.push({ label: 'ВЗЯТЬ РАБОТУ · ' + t.title, fn: () => {
      activeJob = { title: t.title, tx: t.tx, tz: t.tz, reward: 150 + Math.floor(Math.random()*200) };
      p.hasJob = false; showMsg('ЗАДАНИЕ: ' + t.title + ' · $' + activeJob.reward); closeDialog();
      if (!missionArrow) {
        missionArrow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), new THREE.MeshBasicMaterial({ color: 0xffd958 }));
        scene.add(missionArrow);
      }
      missionArrow.position.set(t.tx, 6, t.tz);
    }});
  }
  opts.push({ label: 'ПОГОВОРИТЬ', fn: () => { showMsg(p.name + ': «' + p.dialog + '»'); closeDialog(); } });
  opts.push({ label: 'УЙТИ', fn: closeDialog });
  showDialog(p.name, '«' + p.dialog + '»', opts);
}
function tryRob() {
  if (mode !== 'peace' || state !== 'playing') return;
  if (interactType !== 'ped' || !interactTarget) { showMsg('НИКОГО РЯДОМ'); return; }
  const p = interactTarget;
  if (!p.alive || p.robbed) { showMsg('УЖЕ ОБОБРАН'); return; }
  p.robbed = true; p.fleeing = true; p.fleeT = 6;
  const take = 30 + Math.floor(Math.random() * 120);
  SAVE.money += take; money += take; playCash();
  spawnParticles(p.model.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffd958, 8, 3, 0.6, 0.06, 7);
  SAVE.meta.respect = Math.max(0, SAVE.meta.respect - 1);
  SAVE.meta.influence += 1; SAVE.meta.heat = Math.min(5, (SAVE.meta.heat || 0) + 1);
  showMsg('ОГРАБЛЕН: +$' + take + ' · РОЗЫСК +');
  wanted = Math.min(5, (SAVE.meta.heat || 0));
  setTimeout(spawnCop, 1200);
  updateHUD();
}
function spawnCop() {
  if (mode !== 'peace' || state !== 'playing') return;
  const ang = Math.random() * Math.PI * 2;
  const cx = camera.position.x + Math.cos(ang) * 25;
  const cz = camera.position.z + Math.sin(ang) * 25;
  const model = createGangsterModel({ coat: 0x1a2a4a, hat: 0x0a0a1a }, 'pistol');
  model.group.position.set(cx, 0, cz);
  scene.add(model.group);
  const cop = {
    group: model.group, legL: model.legL, legR: model.legR,
    armL: model.armL, armR: model.armR, gunGroup: model.gunGroup,
    hp: 200, maxHp: 200, alive: true, removed: false, kind: 'cop', dmgMult: 1,
    shootT: 1.5, delayMult: 0.6, speed: 3.6, walkT: 0, deathT: 0, flinch: 0,
    strafeDir: 1, strafeT: 1, burst: 0, burstT: 0
  };
  model.group.userData.enemy = cop;
  cops.push(cop);
  showMsg('ПОЛИЦИЯ! БЕГИ ИЛИ ДЕРИСЬ');
}
function updateCops(dt) {
  const pp = camera.position;
  for (let i = 0; i < cops.length; i++) {
    const e = cops[i];
    if (e.removed) continue;
    if (e.flinch > 0) e.flinch = Math.max(0, e.flinch - dt * 4);
    if (!e.alive) {
      const t = gameT - e.deathT;
      const fall = Math.min(1, t / 0.7);
      e.group.rotation.x = -fall * Math.PI / 2 * 0.95;
      e.group.position.y = -fall * 0.15;
      if (t > 6) { scene.remove(e.group); e.removed = true; }
      continue;
    }
    const dx = pp.x - e.group.position.x, dz = pp.z - e.group.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const targetRot = Math.atan2(dx, dz);
    let dr = targetRot - e.group.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    e.group.rotation.y += dr * Math.min(1, dt * 8);
    if (dist > 6) {
      const sp = e.speed * dt;
      e.group.position.x += (dx / dist) * sp;
      e.group.position.z += (dz / dist) * sp;
      e.walkT += dt * 10;
      e.legL.rotation.x = Math.sin(e.walkT) * 0.6;
      e.legR.rotation.x = -Math.sin(e.walkT) * 0.6;
    }
    collideCircle(e.group.position, 0.5);
    e.armR.rotation.x = -Math.PI / 2 + 0.15;
    if (e.burst > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) { e.burst--; e.burstT = 0.1; copShoot(e, dist); }
    } else {
      e.shootT -= dt;
      if (e.shootT <= 0 && dist < 26) { e.burst = 3; e.burstT = 0; e.shootT = (1.2 + Math.random()*1.0) * e.delayMult; }
    }
  }
}
function copShoot(e, dist) {
  const muzzle = e.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  muzzle.x += Math.sin(e.group.rotation.y) * -0.5;
  muzzle.z += Math.cos(e.group.rotation.y) * -0.5;
  playShot(0.13, 900);
  const target = camera.position.clone();
  addTracer(muzzle, target);
  enemyFlashLight.position.copy(muzzle); enemyFlashLight.intensity = 1.4;
  if (!hasLineOfFire(muzzle, target)) return;
  let chance = Math.max(0.1, 0.5 - dist * 0.012);
  if (crouching) chance *= 0.75;
  if (inCover) chance *= 0.4;
  if (Math.random() < chance) {
    const dmg = 6 + Math.random() * 8;
    hp -= dmg; hitFlash = 1; shake = Math.min(0.7, shake + 0.1);
    damageTakenThisLevel += dmg;
    playHurt(); showDamageIndicator(muzzle.x, muzzle.z); updateHUD();
    if (hp <= 0) die();
  }
}

/* ================================================================
   МЕНЮ
   ================================================================ */
function toggleBizMenu() {
  const o = el('bizOverlay');
  if (o.classList.contains('visible')) { o.classList.remove('visible'); return; }
  if (mode !== 'peace') return;
  renderBizMenu(); o.classList.add('visible');
  if (document.exitPointerLock) document.exitPointerLock();
}
function renderBizMenu() {
  el('bizSummary').textContent = 'Капитал: $' + Math.floor(SAVE.money) + ' · Доход: $' + incomePerMin() + '/мин';
  const list = el('bizList'); list.innerHTML = '';
  for (let i = 0; i < BUSINESSES.length; i++) {
    const b = BUSINESSES[i];
    const row = document.createElement('div'); row.className = 'row';
    const name = document.createElement('div'); name.className = 'name';
    name.textContent = b.name + (b.owned ? ' ✓' : '');
    const info = document.createElement('div'); info.className = 'info';
    info.textContent = 'Доход $' + b.income + '/мин';
    row.appendChild(name); row.appendChild(info);
    const btn = document.createElement('button'); btn.className = 'btn small';
    if (b.owned) {
      btn.classList.add('sell');
      btn.textContent = 'ПРОДАТЬ $' + Math.floor(b.price * 0.75);
      btn.onclick = () => { SAVE.money += Math.floor(b.price * 0.75); money += Math.floor(b.price * 0.75);
        b.owned = false; b.sign.material.color.setHex(0xccaa33); playCash(); renderBizMenu(); updateHUD(); };
    } else {
      const canBuy = SAVE.money >= b.price;
      btn.textContent = canBuy ? 'КУПИТЬ $' + b.price : '$' + b.price;
      btn.disabled = !canBuy;
      btn.onclick = () => { if (canBuy) { SAVE.money -= b.price; money -= b.price; b.owned = true;
        b.sign.material.color.setHex(0x33cc66); playCash(); renderBizMenu(); updateHUD();
        if (ownedCount() >= 4) SAVE.achievements.tycoon = 1; checkAchievements(); } };
    }
    row.appendChild(btn);
    list.appendChild(row);
  }
}
function renderUpgrades() {
  el('upgradeMoney').textContent = 'Деньги: $' + Math.floor(SAVE.money);
  const list = el('upgradeList'); list.innerHTML = '';
  for (const def of UPGRADE_DEFS) {
    const lvl = SAVE.upgrades[def.key] || 0;
    const row = document.createElement('div'); row.className = 'row';
    const left = document.createElement('div'); left.className = 'name';
    left.innerHTML = def.name + ' <span style="color:#8a7a4e;font-size:12px">· ' + def.desc + '</span>' +
      '<div class="upgradeBar">' + [0,1,2].map(i => '<div class="upgradePip ' + (i < lvl ? 'on' : '') + '"></div>').join('') + '</div>';
    row.appendChild(left);
    const btn = document.createElement('button'); btn.className = 'btn small';
    if (lvl >= def.max) { btn.textContent = 'МАКС'; btn.disabled = true; }
    else {
      const cost = def.cost[lvl];
      btn.textContent = '$' + cost;
      btn.disabled = SAVE.money < cost;
      btn.onclick = () => {
        if (SAVE.money >= cost) {
          SAVE.money -= cost; SAVE.upgrades[def.key] = lvl + 1;
          saveGame(); renderUpgrades(); playCash();
          showMsg(def.name + ' → УР. ' + (lvl + 1));
          applyUpgradesToWeapons();
        }
      };
    }
    row.appendChild(btn);
    list.appendChild(row);
  }
}
function renderAchievements() {
  const list = el('achList'); list.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const row = document.createElement('div');
    row.className = 'achRow' + (SAVE.achievements[a.id] ? ' done' : '');
    row.innerHTML = '<div>' + (SAVE.achievements[a.id] ? '✓ ' : '○ ') + a.name + '</div>' +
      '<div class="meta">' + a.desc + '</div>';
    list.appendChild(row);
  }
}
function showDialog(title, text, opts) {
  el('dialogTitle').textContent = title;
  el('dialogText').textContent = text;
  const o = el('dialogOpts'); o.innerHTML = '';
  for (let op of opts) {
    const b = document.createElement('button');
    b.className = 'btn secondary small'; b.textContent = op.label;
    b.addEventListener('click', e => { e.preventDefault(); op.fn(); });
    b.addEventListener('touchend', e => { e.preventDefault(); op.fn(); });
    o.appendChild(b);
  }
  el('dialogOverlay').classList.add('visible');
  if (document.exitPointerLock) document.exitPointerLock();
}
function closeDialog() {
  el('dialogOverlay').classList.remove('visible');
  if (state === 'playing' && !isTouch && renderer && renderer.domElement.requestPointerLock) {
    try { renderer.domElement.requestPointerLock(); } catch(e){}
  }
}
function buildPeaceLevel() {
  money = SAVE.money;
  ambientLight.color.setHex(0xaab8c8); ambientLight.intensity = 1.3;
  hemiLight.intensity = 0.9; moonLight.intensity = 0.5;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ color: 0x4a5442 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  const roadMatLocal = new THREE.MeshLambertMaterial({ map: texRoad, color: 0x909090 });
  function road(w, d, x, z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMatLocal);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0, z); scene.add(r);
  }
  road(16, 260, 0, 0); road(16, 260, 60, 0); road(16, 260, -60, 0);
  road(260, 16, 0, 0); road(260, 16, 0, 60); road(260, 16, 0, -60);
  buildCityBlocks(24, 105, SETTINGS.quality === 0 ? 16 : (SETTINGS.quality === 1 ? 26 : 36), false);
  for (let b of BUSINESSES) {
    const h = 6 + Math.random() * 6;
    const bld = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), new THREE.MeshLambertMaterial({ color: b.color }));
    bld.position.set(b.mx, h/2, b.mz); scene.add(bld); worldMeshes.push(bld);
    colliders.push({ minX: b.mx-6, maxX: b.mx+6, minZ: b.mz-6, maxZ: b.mz+6, top: h, cover: true });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 0.4),
      new THREE.MeshBasicMaterial({ color: b.owned ? 0x33cc66 : 0xccaa33 }));
    sign.position.set(b.mx, h - 1.2, b.mz + 6.3); scene.add(sign);
    b.sign = sign; b.height = h;
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.3), new THREE.MeshLambertMaterial({ color: 0x3a1a10 }));
    door.position.set(b.mx, 1.5, b.mz + 6.2); scene.add(door); b.doorMesh = door;
  }
  spawnPedestrians();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2a4a2a });
  const treeCount = SETTINGS.quality === 0 ? 15 : (SETTINGS.quality === 1 ? 22 : 30);
  for (let i = 0; i < treeCount; i++) {
    const x = (Math.random() * 2 - 1) * 90;
    const z = (Math.random() * 2 - 1) * 90;
    if (Math.abs(x) < 14 || Math.abs(z) < 14) continue;
    if (Math.abs(Math.abs(x) - 60) < 12 || Math.abs(Math.abs(z) - 60) < 12) continue;
    let inside = false;
    for (let c of colliders) if (x > c.minX-1 && x < c.maxX+1 && z > c.minZ-1 && z < c.maxZ+1 && c.top > 3) { inside = true; break; }
    if (inside) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 6), trunkMat);
    trunk.position.set(x, 1.1, z); scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 5), leafMat);
    leaves.position.set(x, 3.2, z); scene.add(leaves);
    colliders.push({ minX: x-0.3, maxX: x+0.3, minZ: z-0.3, maxZ: z+0.3, top: 2.4, cover: false });
  }
}
function ownedCount() { return BUSINESSES.filter(b => b.owned).length; }
function incomePerMin() { return BUSINESSES.filter(b => b.owned).reduce((s, b) => s + b.income, 0); }
function updatePeace(dt) {
  money += (incomePerMin() / 60) * dt;
  SAVE.money += (incomePerMin() / 60) * dt;
  updateHUD();
  updatePedestrians(dt); updateInteraction(); updateCops(dt);
  if (activeJob) {
    const dx = camera.position.x - activeJob.tx, dz = camera.position.z - activeJob.tz;
    if (dx*dx + dz*dz < 12) {
      SAVE.money += activeJob.reward; money += activeJob.reward; playCash();
      SAVE.meta.respect += 4; SAVE.meta.influence += 2; SAVE.meta.missions += 1;
      spawnParticles(new THREE.Vector3(activeJob.tx, 2, activeJob.tz), 0x33dd66, 12, 4, 0.9, 0.08, 7);
      showMsg('ЗАДАНИЕ ВЫПОЛНЕНО: +$' + activeJob.reward);
      if (missionArrow) { scene.remove(missionArrow); missionArrow = null; }
      activeJob = null; updateHUD();
    } else if (missionArrow) {
      missionArrow.rotation.y += dt * 2;
      missionArrow.position.y = 6 + Math.sin(gameT * 3) * 0.4;
    }
  }
  if (SAVE.money >= 10000) winGame();
}
function buildCarScreen() {
  const g = el('carGrid'); g.innerHTML = '';
  for (let i = 0; i < CARS.length; i++) {
    const c = CARS[i];
    const owned = SAVE.carsOwned[i];
    const card = document.createElement('div'); card.className = 'carCard' + (owned ? '' : ' locked');
    const col = '#' + c.color.toString(16).padStart(6, '0');
    card.innerHTML = '<h3>' + c.name + '</h3>' +
      '<div style="font-size:11px;color:#9a8a5e;margin-bottom:4px">ГОД ' + c.era + (owned ? '' : ' · 🔒 $' + c.price) + '</div>' +
      '<div style="font-size:12px;color:#9a8a5e;margin-bottom:6px">' +
      'СКОРОСТЬ ' + c.top + ' · РАЗГОН ' + c.accel + ' · <span style="display:inline-block;width:12px;height:12px;background:' + col + ';border:1px solid #666;vertical-align:middle"></span></div>' +
      '<button class="btn" type="button">' + (owned ? 'ВЫБРАТЬ' : 'КУПИТЬ') + '</button>';
    const btn = card.querySelector('button');
    const handler = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!owned) {
        if (SAVE.money >= c.price) {
          SAVE.money -= c.price; SAVE.carsOwned[i] = true;
          saveGame(); playCash(); buildCarScreen(); showMsg('КУПЛЕНО: ' + c.name);
        } else showMsg('НЕ ХВАТАЕТ $' + (c.price - Math.floor(SAVE.money)));
      } else {
        carIdx = i; loadLevel(3); startPlaying();
      }
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchend', handler);
    g.appendChild(card);
  }
}
function setupButtons() {
  bindBtn('btnStart', () => startMissionWithBriefing(0));
  document.querySelectorAll('.lvlBtn').forEach(b => {
    const handler = (e) => { e.preventDefault(); startMissionWithBriefing(parseInt(b.getAttribute('data-l'))); };
    b.addEventListener('click', handler); b.addEventListener('touchend', handler);
  });
  bindBtn('btnResume', resumeGame);
  bindBtn('btnPauseRestart', restartLevel);
  bindBtn('btnPauseMenu', goToMenu);
  bindBtn('btnPauseUpgrades', () => { renderUpgrades(); el('upgradeOverlay').classList.add('visible'); });
  bindBtn('btnPauseSettings', () => el('settingsOverlay').classList.add('visible'));
  bindBtn('btnRevive', () => showRewardedAd(() => { hp = 100; ammoInMag = WEAPONS.map(w => w.mag); resumeGame(); }));
  bindBtn('btnRestart', restartLevel);
  bindBtn('btnDeadMenu', goToMenu);
  bindBtn('btnNextLevel', () => { if (level < LEVELS.length - 1) startMissionWithBriefing(level + 1); });
  bindBtn('btnDrive', () => { buildCarScreen(); showScreen('carScreen'); });
  bindBtn('btnCarBack', () => showScreen('startScreen'));
  bindBtn('btnWinRestart', restartLevel);
  bindBtn('btnWinMenu', goToMenu);
  bindBtn('btnWinUpgrades', () => { renderUpgrades(); el('upgradeOverlay').classList.add('visible'); });
  bindBtn('btnUpgrades', () => { renderUpgrades(); el('upgradeOverlay').classList.add('visible'); });
  bindBtn('btnAch', () => { renderAchievements(); el('achOverlay').classList.add('visible'); });
  bindBtn('btnDossier', () => { renderDossier(); el('dossierOverlay').classList.add('visible'); });
  bindBtn('btnSettings', () => el('settingsOverlay').classList.add('visible'));
  bindBtn('dialogClose', closeDialog);
  bindBtn('missionClose', closeMissionBriefing);
  bindBtn('dossierClose', () => el('dossierOverlay').classList.remove('visible'));
  bindBtn('btnDossierClose', () => el('dossierOverlay').classList.remove('visible'));
  bindBtn('btnFixHeat', fixPoliceProblem);
  bindBtn('bizClose', toggleBizMenu);
  bindBtn('upgradeClose', () => { el('upgradeOverlay').classList.remove('visible'); saveGame(); });
  bindBtn('achClose', () => el('achOverlay').classList.remove('visible'));
  bindBtn('settingsClose', () => { el('settingsOverlay').classList.remove('visible'); saveSettings(); applySettings(); });
  bindBtn('btnResetProgress', resetProgress);

  const sS = el('setSens'), sV = el('setVol'), sQ = el('setQuality'), sSh = el('setShake'), sAs = el('setAutosave');
  sS.value = SETTINGS.sens; sV.value = SETTINGS.vol; sQ.value = SETTINGS.quality;
  sSh.checked = SETTINGS.shake; sAs.checked = SETTINGS.autosave;
  sS.addEventListener('input', () => SETTINGS.sens = parseFloat(sS.value));
  sV.addEventListener('input', () => SETTINGS.vol = parseFloat(sV.value));
  sQ.addEventListener('input', () => SETTINGS.quality = parseInt(sQ.value));
  sSh.addEventListener('change', () => SETTINGS.shake = sSh.checked);
  sAs.addEventListener('change', () => SETTINGS.autosave = sAs.checked);
}
function applySettings() {
  saveSettings();
  if (renderer) {
    const pr = SETTINGS.quality === 0 ? 1 : (SETTINGS.quality === 1 ? 1.25 : Math.min(window.devicePixelRatio, 2));
    renderer.setPixelRatio(pr);
  }
}
function resetProgress() {
  SAVE = { money: 500, upgrades: { mag: 0, dmg: 0, reload: 0, acc: 0 },
    achievements: {}, totalKills: 0, headshots: 0, carsOwned: [true, false, false, true, false, false],
    meta: { respect: 0, influence: 0, heat: 0, chapter: 1, missions: 0, cleanJobs: 0, approach: 'quiet', territory: 0 },
    businesses: {}, businessWeek: 1, businessWeekClock: 0, businessDebt: 0 };
  ensureBusinessSystem();
  saveGame();
    businessGuards.forEach(g=>{if(g.group&&g.group.parent)scene.remove(g.group);}); businessGuards=[]; if(interiorGroup&&interiorGroup.parent)scene.remove(interiorGroup); interiorWorldMeshes=[]; interiorColliders=[]; interiorGroup=null; interiorBiz=null; inBusinessInterior=false; businessStaffModels=[];
  renderAchievements();
  showMsg('ПРОГРЕСС СБРОШЕН');
}
function showRewardedAd(onReward) {
  if (ysdk && ysdk.adv && ysdk.adv.showRewardedVideo) {
    ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: onReward, onError: onReward } });
  } else { onReward(); }
}



/* ================================================================
   CRIME FAMILY · ПОЛНОЕ УПРАВЛЕНИЕ БИЗНЕСОМ
   ================================================================ */
ensureBusinessSystem();

function refreshAllBusinessGuards(){
  // Убираем старых охранников.
  businessGuards.forEach(g=>{ if(g.group && g.group.parent) scene.remove(g.group); });
  businessGuards=[];
  if(mode!=='peace' || !scene) return;
  for(const b of BUSINESSES){ if(getBizState(b).owned) spawnBusinessGuards(b); }
}
function spawnBusinessGuards(b){
  const r=getBizState(b); const count=Math.max(0,Math.min(15,r.guards||0));
  for(let i=0;i<count;i++){
    const m=createGangsterModel({coat:0x161a20,hat:0x090b10},'pistol');
    const ang=(Math.PI*2/count)*(i+0.35), rad=count===1?5.2:5.2;
    m.group.position.set(b.mx+Math.cos(ang)*rad,0,b.mz+Math.sin(ang)*rad+1.5);
    m.group.rotation.y=ang+Math.PI;
    m.group.userData.businessGuard=true;
    scene.add(m.group);
    businessGuards.push({group:m.group, biz:b, model:m, alive:true, fireT:1+Math.random()*1.5, outsidePos:m.group.position.clone()});
  }
}
function updateBusinessGuards(dt){
  if(mode!=='peace' || !businessGuards.length) return;
  for(const g of businessGuards){
    if(!g.alive || !g.group.parent) continue;
    const b=g.biz, r=getBizState(b);
    let nearest=null, nd=18*18;
    for(const c of cops){ if(!c.alive) continue; const dx=c.group.position.x-g.group.position.x, dz=c.group.position.z-g.group.position.z, d=dx*dx+dz*dz; if(d<nd){nd=d;nearest=c;} }
    if(nearest){
      const dx=nearest.group.position.x-g.group.position.x,dz=nearest.group.position.z-g.group.position.z;
      g.group.rotation.y=Math.atan2(dx,dz); g.fireT-=dt;
      if(g.fireT<=0){
        g.fireT=1.0+Math.random()*1.3;
        const p=nearest.group.position.clone().add(new THREE.Vector3(0,1.2,0));
        if(typeof damageEnemy==='function') damageEnemy(nearest,16+r.level*2,p,false,true);
        playShot(0.08,1100);
      }
    }
  }
}
function buildBusinessInterior(b){
  if(interiorGroup && interiorGroup.parent) scene.remove(interiorGroup);
  interiorWorldMeshes=[]; interiorColliders=[];
  interiorGroup=new THREE.Group(); scene.add(interiorGroup);
  const addInteriorCollider = c => { colliders.push(c); interiorColliders.push(c); };
  const addInteriorMesh = m => { worldMeshes.push(m); interiorWorldMeshes.push(m); };
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.MeshLambertMaterial({color:b.color}));
  floor.rotation.x=-Math.PI/2; floor.position.set(b.mx,0,b.mz); interiorGroup.add(floor);
  const wallMat=new THREE.MeshLambertMaterial({color:0x21170f});
  const back=new THREE.Mesh(new THREE.BoxGeometry(11,3.8,.35),wallMat); back.position.set(b.mx,1.9,b.mz-5.5); interiorGroup.add(back); addInteriorMesh(back); addInteriorCollider({minX:b.mx-5.5,maxX:b.mx+5.5,minZ:b.mz-5.7,maxZ:b.mz-5.3,top:3.8,cover:true});
  const left=new THREE.Mesh(new THREE.BoxGeometry(.35,3.8,11),wallMat); left.position.set(b.mx-5.5,1.9,b.mz); interiorGroup.add(left); addInteriorMesh(left); addInteriorCollider({minX:b.mx-5.7,maxX:b.mx-5.3,minZ:b.mz-5.5,maxZ:b.mz+5.5,top:3.8,cover:true});
  const right=new THREE.Mesh(new THREE.BoxGeometry(.35,3.8,11),wallMat); right.position.set(b.mx+5.5,1.9,b.mz); interiorGroup.add(right); addInteriorMesh(right); addInteriorCollider({minX:b.mx+5.3,maxX:b.mx+5.7,minZ:b.mz-5.5,maxZ:b.mz+5.5,top:3.8,cover:true});
  const frontL=new THREE.Mesh(new THREE.BoxGeometry(4.2,3.8,.35),wallMat); frontL.position.set(b.mx-3.4,1.9,b.mz+5.5); interiorGroup.add(frontL); addInteriorMesh(frontL); addInteriorCollider({minX:b.mx-5.5,maxX:b.mx-1.3,minZ:b.mz+5.3,maxZ:b.mz+5.7,top:3.8,cover:true});
  const frontR=new THREE.Mesh(new THREE.BoxGeometry(4.2,3.8,.35),wallMat); frontR.position.set(b.mx+3.4,1.9,b.mz+5.5); interiorGroup.add(frontR); addInteriorMesh(frontR); addInteriorCollider({minX:b.mx+1.3,maxX:b.mx+5.5,minZ:b.mz+5.3,maxZ:b.mz+5.7,top:3.8,cover:true});
  const counter=new THREE.Mesh(new THREE.BoxGeometry(6,1.05,1),new THREE.MeshLambertMaterial({color:0x6a4226})); counter.position.set(b.mx,0.55,b.mz-1.7); interiorGroup.add(counter); addInteriorMesh(counter); addInteriorCollider({minX:b.mx-3.1,maxX:b.mx+3.1,minZ:b.mz-2.3,maxZ:b.mz-1.1,top:1.05,cover:true});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(6,1.1,.15),new THREE.MeshBasicMaterial({color:0xd8b958})); sign.position.set(b.mx,3.0,b.mz-5.1); interiorGroup.add(sign);
  // Персонал.
  businessStaffModels=[];
  const st=getBizState(b);
  st.staff.forEach((person,i)=>{
    const m=createGangsterModel({coat: i%2?0x2c1b16:0x1c2328,hat:0x111014},'pistol');
    const x=b.mx-3+(i%3)*3, z=b.mz-3+Math.floor(i/3)*2.0;
    m.group.position.set(x,0,z); m.group.rotation.y=Math.PI; interiorGroup.add(m.group);
    businessStaffModels.push({group:m.group,staff:person});
  });
  // Охранники переезжают внутрь до выхода.
  let idx=0; const guards=businessGuards.filter(g=>g.biz===b);
  guards.forEach((g)=>{ const x=b.mx-4.2+(idx%3)*4.2, z=b.mz+2.7+Math.floor(idx/3)*1.1; g.group.position.set(x,0,z); g.group.rotation.y=Math.PI; g.interior=true; idx++; });
  const lamp=new THREE.PointLight(0xffcc88,1.1,16,2); lamp.position.set(b.mx,3.2,b.mz); interiorGroup.add(lamp);
}
function enterBusiness(b){
  if(inBusinessInterior && interiorBiz===b){ el('bizOverlay').classList.remove('visible'); return; }
  if(!b || !getBizState(b).owned){ showMsg('ЭТО НЕ ТВОЁ ЗАВЕДЕНИЕ'); return; }
  inBusinessInterior=true; interiorBiz=b;
  if(b.mesh) b.mesh.visible=false; if(b.doorMesh) b.doorMesh.visible=false; if(b.sign) b.sign.visible=false;
  if(b.collider) colliders=colliders.filter(c=>c!==b.collider);
  if(!inBusinessInterior) return;
  // Охранники перемещаются в интерьер.
  buildBusinessInterior(b);
  camera.position.set(b.mx,1.7,b.mz+3.8); yaw=0; pitch=0; camera.rotation.set(0,0,0);
  buildColliderGrid();
  el('objText').textContent='ЗАВЕДЕНИЕ: '+b.name+' · E — ВЫЙТИ · TAB — УПРАВЛЕНИЕ';
  showMsg('ТЫ ВНУТРИ: '+b.name); updateHUD();
}
function exitBusiness(){
  if(!inBusinessInterior || !interiorBiz) return;
  const b=interiorBiz;
  if(interiorGroup && interiorGroup.parent) scene.remove(interiorGroup);
  worldMeshes = worldMeshes.filter(m => !interiorWorldMeshes.includes(m));
  colliders = colliders.filter(c => !interiorColliders.includes(c));
  interiorWorldMeshes=[]; interiorColliders=[]; interiorGroup=null; businessStaffModels=[];
  if(b.collider && !colliders.includes(b.collider)) colliders.push(b.collider);
  if(b.mesh) b.mesh.visible=true; if(b.doorMesh) b.doorMesh.visible=true; if(b.sign) b.sign.visible=true;
  businessGuards.filter(g=>g.biz===b).forEach((g,i)=>{ const count=Math.max(1,getBizState(b).guards); const ang=(Math.PI*2/count)*(i+0.35),rad=5.2; g.group.position.set(b.mx+Math.cos(ang)*rad,0,b.mz+Math.sin(ang)*rad+1.5); g.group.rotation.y=ang+Math.PI; g.interior=false; });
  camera.position.set(b.mx,1.7,b.mz+8.2); yaw=0; pitch=0; camera.rotation.set(0,0,0);
  inBusinessInterior=false; interiorBiz=null; buildColliderGrid();
  el('objText').textContent=LEVELS[level].objective; showMsg('НАЗАД НА УЛИЦУ'); updateHUD();
}
function businessConditionLabel(v){ return v>82?'ОТЛИЧНО':v>62?'ХОРОШО':v>40?'СРЕДНЕ':'ПЛОХО'; }
function qualityLabel(q){ return q>=85?'ОТЛИЧНЫЙ':q>=70?'ХОРОШИЙ':q>=55?'СРЕДНИЙ':'СЛАБЫЙ'; }
function businessSummaryHTML(b){
  const r=getBizState(b), weeklyG=bizGrossPerWeek(b), weeklyP=bizWeeklyPayroll(b), net=bizNetPerWeek(b);
  const warn=net<0?'warn':'good'; const cap=bizCapacity(b);
  return '<div class="bizHeader"><div><div class="title">'+b.name+'</div><div class="bizSub">Конкурент: '+businessRival(b)+' · Уровень '+r.level+'/5 · Состояние: '+businessConditionLabel(r.condition)+'</div></div><div class="bizBadge">ОХРАНА '+r.guards+'/15</div></div>' +
    '<div class="bizSub">Валовая выручка: $'+Math.floor(weeklyG)+'/нед · Зарплаты: $'+Math.floor(weeklyP-r.guards*GUARD_WEEKLY_WAGE)+'/нед · Охрана: $'+(r.guards*GUARD_WEEKLY_WAGE)+'/нед</div>' +
    '<div class="bizSub '+warn+'">Прогноз чистой прибыли: $'+Math.floor(net)+'/нед'+(net<0?' · УБЫТОК — НУЖНО РЕЖЕ РАБОТНИКОВ / БОЛЬШЕ ВЫРУЧКИ':'')+'</div>' +
    '<div class="barMeter"><i style="width:'+Math.max(0,Math.min(100,r.condition))+'%"></i></div>';
}
function renderBizMenu(){
  ensureBusinessSystem();
  const list=el('bizList'); list.innerHTML='';
  const net=allWeeklyNet();
  el('bizSummary').textContent='Капитал: $'+Math.floor(SAVE.money)+' · Валовая выручка: $'+Math.floor(allWeeklyGross())+'/нед · ФОТ+охрана: $'+Math.floor(allWeeklyPayroll())+'/нед';
  const report=document.createElement('div'); report.className='weekReport'+(net<0?' bad':''); report.innerHTML='Неделя '+SAVE.businessWeek+' · Прогноз сети: <b>$'+Math.floor(net)+'/нед</b><br>'+ (net<0?'СЕМЬЯ ТЕРЯЕТ ДЕНЬГИ. Сократи персонал, охрану или подними уровень заведений.':'Сеть работает в плюс.'); list.appendChild(report);
  const grid=document.createElement('div'); grid.className='bizGrid';
  BUSINESSES.forEach(b=>{
    const r=getBizState(b); const card=document.createElement('div'); card.className='bizCard'+(r.owned?' owned':'');
    const q=r.owned?(Math.round(staffEfficiency(b)*100)) : 0;
    card.innerHTML='<div class="name">'+b.name+(r.owned?' ✓':'')+'</div><div class="line">'+(r.owned?('Выручка $'+Math.floor(bizGrossPerMin(b))+'/мин · Качество персонала '+q+'/100 · Персонал '+r.staff.length+'/'+bizCapacity(b)):'Покупка: $'+b.price+' · Базовая выручка $'+b.income+'/мин')+'</div>'+(r.owned?'<div class="line">Охрана '+r.guards+'/15 · '+r.guards*GUARD_WEEKLY_WAGE+'$/нед · '+(r.sabotage?'Саботаж: '+r.sabotage+'/3':'УГРОЗА НЕТ')+'</div>':'');
    const btns=document.createElement('div'); btns.className='bizBtns';
    if(r.owned){
      const enter=document.createElement('button'); enter.className='btn'; enter.textContent='ВОЙТИ'; enter.onclick=()=>enterBusiness(b); btns.appendChild(enter);
      const manage=document.createElement('button'); manage.className='btn secondary'; manage.textContent='УПРАВЛЕНИЕ'; manage.onclick=()=>renderBusinessManagement(b); btns.appendChild(manage);
    }else{
      const buy=document.createElement('button'); buy.className='btn'; buy.textContent='КУПИТЬ $'+b.price; buy.disabled=SAVE.money<b.price; buy.onclick=()=>buyBusiness(b); btns.appendChild(buy);
    }
    card.appendChild(btns); grid.appendChild(card);
  });
  list.appendChild(grid);
}
function buyBusiness(b){
  const r=getBizState(b); if(r.owned) return;
  if(SAVE.money<b.price){showMsg('НЕДОСТАТОЧНО ДЕНЕГ');return;}
  SAVE.money-=b.price; money=SAVE.money; r.owned=true; r.level=1; r.condition=88; r.guards=1; r.staff=[]; for(let i=0;i<3;i++)r.staff.push(makeStaff(b,i));
  r.sabotage=0; saveBusinesses(); applyBusinessVisuals(); renderBizMenu(); updateHUD(); playCash(); showMsg('ПРИОБРЕТЕНО: '+b.name);
  SAVE.meta.territory=(SAVE.meta.territory||0)+1; saveGame(); updateMetaHud();
}
function renderBusinessManagement(b){
  const r=getBizState(b); const list=el('bizList'); list.innerHTML='';
  const back=document.createElement('button'); back.className='btn secondary small'; back.textContent='← К СПИСКУ'; back.onclick=renderBizMenu; list.appendChild(back);
  const top=document.createElement('div'); top.innerHTML=businessSummaryHTML(b); list.appendChild(top);
  const actions=document.createElement('div'); actions.className='bizBtns';
  const up=document.createElement('button'); up.className='btn'; up.textContent=r.level<5?'УЛУЧШИТЬ ЗАВЕДЕНИЕ · $'+BIZ_UPGRADE_COSTS[r.level-1]:'МАКСИМУМ'; up.disabled=r.level>=5 || SAVE.money<BIZ_UPGRADE_COSTS[r.level-1]; up.onclick=()=>upgradeBusiness(b); actions.appendChild(up);
  const repair=document.createElement('button'); repair.className='btn secondary'; repair.textContent='РЕМОНТ · $'+(150+r.level*90); repair.onclick=()=>repairBusiness(b); actions.appendChild(repair);
  const enter=document.createElement('button'); enter.className='btn secondary'; enter.textContent='ВОЙТИ В ЗАЛ'; enter.onclick=()=>{el('bizOverlay').classList.remove('visible');enterBusiness(b);}; actions.appendChild(enter);
  const sab=document.createElement('button'); sab.className='btn secondary'; sab.textContent='САБОТАЖ КОНКУРЕНТА'; sab.disabled=SAVE.money<250+r.level*80 || SAVE.meta.influence<2; sab.onclick=()=>sabotageRival(b); actions.appendChild(sab);
  list.appendChild(actions);
  const guardRow=document.createElement('div'); guardRow.className='staffCard'; guardRow.innerHTML='<b>ВООРУЖЁННАЯ ОХРАНА</b><div class="staffStats">Сейчас: '+r.guards+'/15 · один охранник стоит '+GUARD_WEEKLY_WAGE+' монет в неделю. Чем больше охраны, тем меньше риск саботажа.</div>';
  const gb=document.createElement('div');gb.className='staffBtns';
  const hire=document.createElement('button');hire.className='btn';hire.textContent='НАНЯТЬ +1 · $75/НЕД';hire.disabled=r.guards>=15;hire.onclick=()=>{r.guards++;saveBusinesses();applyBusinessVisuals();renderBusinessManagement(b);};gb.appendChild(hire);
  const fire=document.createElement('button');fire.className='btn secondary';fire.textContent='УВОЛИТЬ −1';fire.disabled=r.guards<=0;fire.onclick=()=>{r.guards--;saveBusinesses();applyBusinessVisuals();renderBusinessManagement(b);};gb.appendChild(fire);
  guardRow.appendChild(gb); list.appendChild(guardRow);
  const stTitle=document.createElement('div'); stTitle.className='panel h3'; stTitle.innerHTML='<h3 style="margin-top:14px">ПЕРСОНАЛ · '+r.staff.length+'/'+bizCapacity(b)+'</h3>'; list.appendChild(stTitle);
  r.staff.forEach((st,idx)=>{
    st.quality=staffQuality(st); const card=document.createElement('div'); card.className='staffCard '+(st.quality>=82?'good':(st.quality<58?'bad':''));
    card.innerHTML='<b>'+st.name+'</b> · '+st.role+' · <span style="color:#e3c877">'+qualityLabel(st.quality)+' '+st.quality+'/100</span><div class="staffStats">Навык '+st.skill+' · Лояльность '+st.loyalty+' · Дисциплина '+st.discipline+' · Зарплата $'+st.wage+'/нед · Обучение '+st.training+'</div>';
    const sb=document.createElement('div'); sb.className='staffBtns';
    const train=document.createElement('button');train.className='btn';train.textContent='ОБУЧИТЬ · $'+(120+st.training*90);train.disabled=SAVE.money<(120+st.training*90);train.onclick=()=>trainStaff(b,idx);sb.appendChild(train);
    const fireS=document.createElement('button');fireS.className='btn secondary';fireS.textContent='УВОЛИТЬ';fireS.onclick=()=>fireStaff(b,idx);sb.appendChild(fireS); card.appendChild(sb); list.appendChild(card);
  });
  if(r.staff.length<bizCapacity(b)){
    const add=document.createElement('button');add.className='btn';add.textContent='НАНЯТЬ НОВОГО СОТРУДНИКА';add.onclick=()=>hireStaff(b);list.appendChild(add);
  }
}
function upgradeBusiness(b){
  const r=getBizState(b); if(r.level>=5)return; const cost=BIZ_UPGRADE_COSTS[r.level-1]; if(SAVE.money<cost)return;
  SAVE.money-=cost; r.level++; r.condition=Math.min(100,r.condition+8); SAVE.meta.territory=(SAVE.meta.territory||0)+1; saveBusinesses(); showMsg(b.name+' → УРОВЕНЬ '+r.level); renderBusinessManagement(b); updateHUD(); playCash();
}
function repairBusiness(b){ const r=getBizState(b), cost=150+r.level*90; if(SAVE.money<cost)return; SAVE.money-=cost;r.condition=Math.min(100,r.condition+24);saveBusinesses();playCash();renderBusinessManagement(b);showMsg('РЕМОНТ ЗАВЕРШЁН'); }
function trainStaff(b,idx){ const r=getBizState(b),st=r.staff[idx]; if(!st)return; const cost=120+st.training*90;if(SAVE.money<cost)return;SAVE.money-=cost;st.training++;st.skill=clamp100(st.skill+randInt(4,8));st.discipline=clamp100(st.discipline+randInt(2,6));st.loyalty=clamp100(st.loyalty+randInt(1,5));st.quality=staffQuality(st);st.wage+=10;saveBusinesses();playCash();renderBusinessManagement(b);showMsg(st.name+' стал лучше');}
function fireStaff(b,idx){ const r=getBizState(b); if(!r.staff[idx])return; const name=r.staff[idx].name;r.staff.splice(idx,1);saveBusinesses();renderBusinessManagement(b);showMsg(name+' УВОЛЕН'); }
function hireStaff(b){ const r=getBizState(b); if(r.staff.length>=bizCapacity(b))return; if(SAVE.money<150){showMsg('НУЖНО $150 НА ПОИСК КАДРОВ');return;} SAVE.money-=150; const st=makeStaff(b,r.staff.length); r.staff.push(st);saveBusinesses();renderBusinessManagement(b);showMsg('НАНЯТ: '+st.name+' · '+qualityLabel(st.quality)); }
function sabotageRival(b){
  const r=getBizState(b),cost=250+r.level*80; if(SAVE.money<cost || SAVE.meta.influence<2)return; SAVE.money-=cost;SAVE.meta.influence-=2;SAVE.meta.heat=Math.min(5,(SAVE.meta.heat||0)+1);wanted=SAVE.meta.heat;
  r.rivalHeat=(r.rivalHeat||0)+1; rivalRetaliations.push({biz:b,at:gameT+16+Math.random()*18,damage:8+Math.random()*10});saveBusinesses();updateHUD();showMsg('УДАР ПО '+businessRival(b)+' · ОТВЕТ БУДЕТ');
  showDialog('ВОЙНА С КОНКУРЕНТОМ','Ты повредил интересы '+businessRival(b)+'. Они узнают, кто заказал работу.',[
    {label:'ОСТАВИТЬСЯ В ТЕНИ',fn:closeDialog},{label:'ПОДГОТОВИТЬСЯ К ОТВЕТУ',fn:()=>{closeDialog();showMsg('ОХРАНА ПЕРЕВЕДЕНА В БОЕВОЙ РЕЖИМ');}}
  ]);
}
function showRivalEvent(b, retaliate){
  const r=getBizState(b); const loss=randInt(8,22); const blocked=Math.random()<businessSecurity(b);
  if(blocked){ showDialog('ПОПЫТКА САБОТАЖА','Люди '+businessRival(b)+' попытались сорвать работу, но охрана остановила их.',[{label:'ПОНЯТНО',fn:closeDialog}]); return; }
  r.sabotage=Math.min(3,(r.sabotage||0)+1); r.condition=Math.max(25,r.condition-loss); saveBusinesses();
  const text=(retaliate?'Это ответ за твой прошлый удар. ':'')+'Заведение понесло ущерб: −'+loss+' состояния.';
  showDialog('КОНКУРЕНТ НАНЁС УДАР',text,[
    {label:'МОЛЧАТЬ',fn:closeDialog},
    {label:'ОТВЕТИТЬ · $'+(230+r.level*100)+' · +РОЗЫСК',fn:()=>{ closeDialog(); if(SAVE.money>=230+r.level*100&&SAVE.meta.influence>=1){SAVE.money-=230+r.level*100;SAVE.meta.influence-=1;SAVE.meta.heat=Math.min(5,(SAVE.meta.heat||0)+1);wanted=SAVE.meta.heat;r.rivalHeat=(r.rivalHeat||0)+1;rivalRetaliations.push({biz:b,at:gameT+18+Math.random()*14,damage:9+Math.random()*10});saveBusinesses();showMsg('ОТВЕТ ОТПРАВЛЕН · ЖДИ ИХ ХОД');updateHUD();} else showMsg('НЕ ХВАТАЕТ ДЕНЕГ ИЛИ ВЛИЯНИЯ');}}
  ]);
}
function updateRivalBusiness(dt){
  competitorTimer-=dt; businessMessageTimer=Math.max(0,businessMessageTimer-dt);
  if(competitorTimer<=0 && mode==='peace'){
    competitorTimer=25+Math.random()*25;
    const owned=BUSINESSES.filter(b=>getBizState(b).owned);
    if(owned.length){
      const b=owned[randInt(0,owned.length-1)],r=getBizState(b);
      const risk=Math.max(0.05,0.23-businessSecurity(b)-r.condition/100*0.05+(r.sabotage||0)*0.04);
      if(Math.random()<risk && businessMessageTimer<=0){ businessMessageTimer=7; showRivalEvent(b,false); }
    }
  }
  for(let i=rivalRetaliations.length-1;i>=0;i--){ const q=rivalRetaliations[i]; if(gameT>=q.at){ rivalRetaliations.splice(i,1); showRivalEvent(q.biz,true); } }
}
function processBusinessWeek(){
  ensureBusinessSystem(); SAVE.businessWeek=(SAVE.businessWeek||1)+1;
  let payroll=0; let unpaid=0;
  for(const b of BUSINESSES){ const r=getBizState(b); if(!r.owned) continue; const cost=bizWeeklyPayroll(b); payroll+=cost; if(SAVE.money>=cost){SAVE.money-=cost;r.condition=Math.min(100,r.condition+1);} else {unpaid+=cost-SAVE.money;SAVE.money=0;r.condition=Math.max(20,r.condition-10);if(r.guards>0)r.guards--;if(r.staff.length>2&&Math.random()<0.45)r.staff.splice(randInt(0,r.staff.length-1),1);} r.sabotage=Math.max(0,(r.sabotage||0)-1); for(const st of r.staff){ if(Math.random()<0.04)st.loyalty=clamp100(st.loyalty+1); }
  }
  SAVE.businessDebt=(SAVE.businessDebt||0)+unpaid; saveBusinesses();
  const net=allWeeklyNet(); showDialog('ФИНАНСОВАЯ НЕДЕЛЯ '+SAVE.businessWeek,'ФОТ + охрана: $'+Math.floor(payroll)+'/нед. Прогноз сети: $'+Math.floor(net)+'/нед.'+(unpaid?'\nНевыплачено: $'+Math.floor(unpaid)+' · Семья теряет людей.':''),[{label:'ЗАКРЫТЬ',fn:closeDialog}]);
}

// Открытие заведений: теперь можно реально войти в своё помещение и управлять им.
const legacyOpenBusinessDoor = openBusinessDoor;
openBusinessDoor = function(biz){
  const r=getBizState(biz);
  if(!r.owned){
    showDialog(biz.name,'Это заведение принадлежит конкурентам. Цена входа в бизнес — $'+biz.price+'.',[
      {label:'КУПИТЬ ЗА $'+biz.price,fn:()=>{closeDialog();buyBusiness(biz);}},
      {label:'УЙТИ',fn:closeDialog}
    ]);
    return;
  }
  const net=Math.floor(bizNetPerWeek(biz));
  showDialog(biz.name,'Уровень '+r.level+'/5 · персонал '+r.staff.length+'/'+bizCapacity(biz)+' · охрана '+r.guards+'/15 · прогноз '+(net>=0?'+':'')+net+'$/нед.',[
    {label:'ВОЙТИ В ЗАВЕДЕНИЕ',fn:()=>{closeDialog();enterBusiness(biz);}},
    {label:'УПРАВЛЯТЬ ПЕРСОНАЛОМ И ОХРАНОЙ',fn:()=>{closeDialog();renderBusinessManagement(biz);el('bizOverlay').classList.add('visible');}},
    {label:'ОТЧЁТ ПО КАССЕ',fn:()=>{closeDialog();showDialog('КАССА '+biz.name,'Текущая выручка: $'+Math.floor(bizGrossPerMin(biz))+'/мин. Прогноз за игровую неделю: $'+Math.floor(bizGrossPerWeek(biz))+'. Чистая прибыль после зарплат и охраны: $'+Math.floor(bizNetPerWeek(biz))+'/нед.',[{label:'ПОНЯТНО',fn:closeDialog}]);}},
    {label:'УЙТИ',fn:closeDialog}
  ]);
};

// Мирная жизнь с оружием.
const legacyLoadLevelForBusiness=loadLevel;
loadLevel=function(idx){ inBusinessInterior=false; interiorBiz=null; if(interiorGroup&&interiorGroup.parent)scene.remove(interiorGroup); interiorGroup=null; interiorWorldMeshes=[]; interiorColliders=[]; businessStaffModels=[]; legacyLoadLevelForBusiness(idx); if(mode==='peace'){ ensureBusinessSystem(); ammoInMag=WEAPONS.map(w=>w.mag); buildGun(weapon); buildEffects(); updateHUD(); } };
const legacyTryShootPeace=tryShoot;
tryShoot=function(){
  if(mode==='peace'){
    if(state!=='playing' || reloading) return;
    if(gameT-lastShot<WEAPONS[weapon].rate) return;
    peaceShots++; shoot();
    if(peaceShots%5===0){ wanted=Math.min(5,wanted+1);SAVE.meta.heat=wanted;if(Math.random()<0.45)spawnCop();updateHUD();saveGame();showMsg('СТРЕЛЬБА НА УЛИЦЕ · РОЗЫСК +1'); }
  } else legacyTryShootPeace();
};
const legacyStartReloadPeace=startReload;
startReload=function(){ if(mode==='peace'){ if(reloading||ammoInMag[weapon]===WEAPONS[weapon].mag)return; reloading=true;reloadT=0;playReload(WEAPONS[weapon].reload);updateHUD(); } else legacyStartReloadPeace(); };
const legacySwitchWeaponPeace=switchWeapon;
switchWeapon=function(i){ if(mode==='peace'){weapon=(i+WEAPONS.length)%WEAPONS.length;reloading=false;buildGun(weapon);playClick(0,520);showMsg(WEAPONS[weapon].name);updateHUD();} else legacySwitchWeaponPeace(i); };
const legacyUpdateHudBusiness=updateHUD;
updateHUD=function(){ legacyUpdateHudBusiness(); if(mode==='peace'){el('ammoCount').textContent=ammoInMag[weapon];el('weaponName').textContent=WEAPONS[weapon].name;el('ammoLabel').textContent='ПАТРОНЫ · МИРНАЯ ЖИЗНЬ';el('reloadHint').textContent=reloading?'ПЕРЕЗАРЯДКА...':'';} };

// Мышь/тач уже работают для шутера; добавляем отдельную мирную обработку клика.
document.addEventListener('mousedown',e=>{
  if(e.button!==0||state!=='playing'||mode!=='peace')return;
  if(document.querySelector('.overlay.visible'))return;
  if(WEAPONS[weapon].auto) firing=true; else tryShoot();
});

const legacyBuildPeaceLevel=buildPeaceLevel;
buildPeaceLevel=function(){ legacyBuildPeaceLevel(); ensureBusinessSystem(); applyBusinessVisuals(); };
const legacyUpdatePeaceBusiness=updatePeace;
updatePeace=function(dt){
  legacyUpdatePeaceBusiness(dt);
  ensureBusinessSystem();
  SAVE.businessWeekClock=(SAVE.businessWeekClock||0)+dt;
  if(SAVE.businessWeekClock>=GAME_WEEK_SECONDS){SAVE.businessWeekClock-=GAME_WEEK_SECONDS;processBusinessWeek();}
  updateBusinessGuards(dt); updateRivalBusiness(dt);
  if(rivalRetaliations.length>0 && SAVE.meta.heat>0){wanted=SAVE.meta.heat;}
  if(Math.random()<0.0004) { for(const b of BUSINESSES){ const r=getBizState(b); if(!r.owned||!r.staff.length)continue; const thief=r.staff.find(st=>st.loyalty<40&&st.discipline<45); if(thief){const loss=Math.min(SAVE.money,randInt(40,180));SAVE.money-=loss;r.condition=Math.max(20,r.condition-4);showMsg(thief.name+' украл $'+loss+' из кассы');saveBusinesses();break;} } }
  updateMetaHud();
};

const legacyUpdateInteractionBusiness=updateInteraction;
updateInteraction=function(){
  if(mode==='peace' && inBusinessInterior){ interactTarget={};interactType='interiorExit';return; }
  legacyUpdateInteractionBusiness();
};
const legacyDoInteractBusiness=doInteract;
doInteract=function(){
  if(mode==='peace' && inBusinessInterior){exitBusiness();return;}
  legacyDoInteractBusiness();
};

// Кнопка/Tab остаются теми же, но меню теперь показывает полноценную экономику.
const legacyToggleBizMenu=toggleBizMenu;
toggleBizMenu=function(){
  ensureBusinessSystem(); if(mode!=='peace')return;
  const o=el('bizOverlay'); if(o.classList.contains('visible')){o.classList.remove('visible');return;} renderBizMenu();o.classList.add('visible');if(document.exitPointerLock)document.exitPointerLock();
};

// При входе в мир отображаем оружие и бизнес-охрану.
const legacyStartPlayingBusiness=startPlaying;
startPlaying=function(){ legacyStartPlayingBusiness(); if(mode==='peace'){ updateHUD(); } };


/* ================================================================
   СЕМЬЯ · СЮЖЕТНЫЙ СЛОЙ
   ================================================================ */
const MAFIA_CHAPTERS = [
  { title: 'ГЛАВА I · ПЕРВАЯ ПОРУКА', contact: 'ДОН ЭЛИО', text: 'Грязная работа начинается с малого: деньги, которые должен чужой человек, нужно вернуть Семье.' },
  { title: 'ГЛАВА II · НОЧНОЙ ГОРОД', contact: 'ЛУКА «КОПЧЁНЫЙ»', text: 'В городе появляется новая сила. Вопрос уже не в деньгах — вопрос в территории.' },
  { title: 'ГЛАВА III · ДОЛГ КРОВЬЮ', contact: 'МАРКО', text: 'Когда исчезают свидетели, Семья предпочитает не задавать лишних вопросов.' },
  { title: 'ГЛАВА IV · СВОЙ ГОРОД', contact: 'ЭНЦО', text: 'Деньги превращаются во власть. Теперь улицы должны приносить доход даже без стрельбы.' },
  { title: 'ГЛАВА V · ИМПЕРИЯ', contact: 'ДОН ЭЛИО', text: 'Город стал твоим бизнесом. Но чем выше поднимаешься, тем громче стучат в дверь.' }
];

function metaEnsure() {
  SAVE.meta = Object.assign({ respect: 0, influence: 0, heat: 0, chapter: 1, missions: 0, cleanJobs: 0, approach: 'quiet' }, SAVE.meta || {});
}
function metaHeatStars(n) { n = Math.max(0, Math.min(5, n || 0)); return '★'.repeat(n) + '☆'.repeat(5 - n); }
function updateMetaHud() {
  metaEnsure();
  const t = el('metaHudText');
  if (t) t.innerHTML = 'Уважение <b>' + Math.floor(SAVE.meta.respect) + '</b> · Влияние <b>' + Math.floor(SAVE.meta.influence) + '</b>' +
    (mode === 'peace' ? ' · Розыск <b>' + metaHeatStars(wanted) + '</b>' : '');
  const dr = el('dossierRespect'); if (dr) dr.textContent = Math.floor(SAVE.meta.respect);
  const di = el('dossierInfluence'); if (di) di.textContent = Math.floor(SAVE.meta.influence);
  const dm = el('dossierMoney'); if (dm) dm.textContent = '$' + Math.floor(SAVE.money);
  const dh = el('dossierHeat'); if (dh) dh.textContent = metaHeatStars(SAVE.meta.heat);
}
function renderDossier() {
  metaEnsure(); updateMetaHud();
  const c = el('dossierContacts');
  c.innerHTML = '';
  const contacts = [
    ['ДОН ЭЛИО', 'Глава Семьи · сюжет и крупные дела', '«Уважение дороже денег. Деньги просто помогают его купить.»'],
    ['ЛУКА «КОПЧЁНЫЙ»', 'Капо · силовые поручения', 'Хедшоты и боссы быстрее поднимают влияние.'],
    ['ЭНЦО', 'Водитель · маршруты и машины', 'Чистые доставки дают деньги без перестрелки.'],
    ['МАРКО', 'Фиксер · бизнес и полиция', 'Влияние позволяет решать проблемы без стрельбы.']
  ];
  contacts.forEach((x, i) => {
    const d = document.createElement('div'); d.className = 'contactCard';
    d.innerHTML = '<b>' + x[0] + '</b><span>' + x[1] + '</span><span>' + x[2] + '</span>';
    if (i === 0) d.style.borderColor = '#d8b958';
    c.appendChild(d);
  });
  const f = el('btnFixHeat');
  if (f) { f.disabled = (SAVE.meta.influence < 3 || SAVE.meta.heat < 1); f.textContent = SAVE.meta.heat > 0 ? 'РЕШИТЬ ВОПРОС · 3 ВЛИЯНИЯ' : 'ПОЛИЦИЯ УЖЕ НЕ ИЩЕТ ТЕБЯ'; }
}
function fixPoliceProblem() {
  metaEnsure();
  if (SAVE.meta.heat < 1) { showMsg('У РЕБЯТ НЕТ ВОПРОСОВ'); renderDossier(); return; }
  if (SAVE.meta.influence < 3) { showMsg('НУЖНО ЕЩЁ ВЛИЯНИЕ'); return; }
  SAVE.meta.influence -= 3; SAVE.meta.heat = Math.max(0, SAVE.meta.heat - 2); wanted = SAVE.meta.heat;
  cops.forEach(c => { if (c.alive) { c.alive = false; c.deathT = gameT; } });
  playCash(); saveGame(); renderDossier(); updateHUD(); showMsg('ВОПРОС РЕШЁН · РОЗЫСК СНИЖЕН');
}
function closeMissionBriefing() { el('missionOverlay').classList.remove('visible'); }
function startMissionWithBriefing(idx) {
  metaEnsure();
  const L = LEVELS[idx];
  if (!L || L.mode === 'peace') { loadLevel(idx); startPlaying(); return; }
  const ch = MAFIA_CHAPTERS[Math.min(MAFIA_CHAPTERS.length - 1, idx)];
  el('missionTitle').textContent = ch.title;
  el('missionBrief').innerHTML = '<b>' + ch.contact + '</b><br>' + ch.text + '<br><br><span style="color:#8a7a4e;letter-spacing:1px">ЦЕЛЬ:</span> ' + L.objective;
  el('missionQuote').textContent = idx === 0 ? '«Сначала научись забирать своё. Потом научишься владеть городом.»' :
    idx === 1 ? '«Полиция видит выстрел. Семья видит результат.»' :
    idx === 2 ? '«У человека может быть много друзей. У Семьи — только интересы.»' :
    '«Город любит сильных. Особенно тех, кто платит вовремя.»';
  const quiet = el('approachQuiet'), loud = el('approachLoud');
  quiet.onclick = () => chooseMissionApproach(idx, 'quiet');
  loud.onclick = () => chooseMissionApproach(idx, 'loud');
  el('missionOverlay').classList.add('visible');
  if (document.exitPointerLock) document.exitPointerLock();
}
function chooseMissionApproach(idx, approach) {
  metaEnsure();
  SAVE.meta.approach = approach;
  SAVE.meta.chapter = Math.max(SAVE.meta.chapter || 1, idx + 1);
  closeMissionBriefing();
  loadLevel(idx); startPlaying();
  showMsg(approach === 'quiet' ? 'ТИХОЕ ДЕЛО · ДЕРЖИ НИЖЕ РАДИОШУМА' : 'ЖЁСТКОЕ ДЕЛО · БЕРИ ГРОМКО');
  saveGame(); updateMetaHud();
}

// Расширяем итог миссии поверх исходной награды.
const mafiaOriginalWinGame = winGame;
winGame = function() {
  metaEnsure();
  const finishedMode = mode, finishedLevel = level, finishedApproach = SAVE.meta.approach;
  const clean = damageTakenThisLevel < 1;
  mafiaOriginalWinGame();
  if (finishedMode === 'shoot') {
    const respectGain = (finishedApproach === 'quiet' ? 14 : 9) + (clean ? 8 : 0) + (kills >= totalEnemies ? 2 : 0);
    const influenceGain = 4 + (clean ? 3 : 0) + (finishedLevel >= 2 ? 2 : 0);
    let bonus = 75 + kills * 8;
    if (finishedApproach === 'loud') bonus = Math.round(bonus * 1.35);
    SAVE.meta.respect += respectGain;
    SAVE.meta.influence += influenceGain;
    SAVE.meta.missions += 1;
    if (clean) SAVE.meta.cleanJobs += 1;
    if (finishedApproach === 'loud') SAVE.meta.heat = Math.min(5, (SAVE.meta.heat || 0) + 1);
    SAVE.money += bonus;
    const grade = clean ? 'S' : (damageTakenThisLevel < 25 ? 'A' : 'B');
    el('winStats').textContent += ' · КЛАСС ' + grade + ' · +$' + bonus + ' · УВАЖЕНИЕ +' + respectGain + ' · ВЛИЯНИЕ +' + influenceGain;
  } else if (finishedMode === 'drive') {
    SAVE.meta.respect += 7;
    SAVE.meta.influence += 3;
  } else if (finishedMode === 'peace') {
    SAVE.meta.respect += 5;
  }
  updateMetaHud(); saveGame();
};

// Тепло постепенно уходит, когда игрок скрывается от улицы.
let mafiaHeatT = 0;
const mafiaOriginalUpdatePeace = updatePeace;
updatePeace = function(dt) {
  mafiaOriginalUpdatePeace(dt);
  metaEnsure();
  if (wanted > 0 && cops.every(c => !c.alive)) {
    mafiaHeatT += dt;
    if (mafiaHeatT > 16) {
      mafiaHeatT = 0;
      wanted = Math.max(0, wanted - 1);
      SAVE.meta.heat = wanted;
      saveGame();
      showMsg(wanted ? 'РОЗЫСК СНИЖАЕТСЯ' : 'ПОЛИЦИЯ ПОТЕРЯЛА СЛЕД');
      updateHUD();
    }
  } else mafiaHeatT = 0;
  updateMetaHud();
};

const mafiaOriginalSetupButtons = setupButtons;
setupButtons = function() {
  mafiaOriginalSetupButtons();
  // Не переопределяем существующие кнопки — добавляем только новые панели.
  const oldStartText = el('btnStart'); if (oldStartText) oldStartText.title = 'Выбор подхода перед делом';
};

/* ================================================================
   ГЛАВНЫЙ ЦИКЛ
   ================================================================ */
let distT = 0, minimapT = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  gameT += dt;
  if (state === 'playing') {
    if (mode === 'drive') { updateCar(dt); updateDrive(dt); }
    else {
      updatePlayer(dt);
      if (mode === 'shoot') { updateEnemies(dt); checkWin(); updatePickups(dt); }
      else updatePeace(dt);
    }
    if (suitcaseLight) suitcaseLight.intensity = 1.1 + Math.sin(gameT * 3) * 0.35;
    if (suitcase) suitcase.rotation.y += dt * 0.5;
    if (rainMesh) updateRain(dt);
    distT += dt; if (distT > 0.15) { distT = 0; updateDistLabel(); }
    minimapT += dt; if (minimapT > 0.2) { minimapT = 0; drawMinimap(); }
  }
  updateEffects(dt);
  updateCrosshair();
  updateMetaHud();
  if (gameT - msgT > 2.2) el('msg').style.opacity = '0';
  const hm = el('hitmarker');
  if (parseFloat(hm.style.opacity || 0) > 0) hm.style.opacity = '0';
  renderer.render(scene, camera);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 200);
});

/* ================================================================
   ЗАГРУЗКА
   ================================================================ */
function loadYandexSDK() {
  if (ysdk) return;
  const s = document.createElement('script');
  s.src = 'https://yandex.ru/games/sdk/v2';
  s.async = true;
  s.onload = () => {
    if (typeof YaGames !== 'undefined') {
      YaGames.init().then(sdk => {
        ysdk = sdk;
        try { if (ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready) ysdk.features.LoadingAPI.ready(); } catch(e){}
      }).catch(()=>{});
    }
  };
  s.onerror = () => { /* тихо игнорируем, если не Яндекс */ };
  document.head.appendChild(s);
}

function bootStepInitThree() {
  if (typeof THREE === 'undefined') throw new Error('Three.js не загрузился');
}
function bootStepScene() { initScene(); }
function bootStepConsts() { makeConsts(); }
function bootStepTextures() { makeTextures(); }
function bootStepMaterials() { makeMaterials(); }
function bootStepLights() { makeLights(); }
function bootStepParticles() { initParticles(); }
function bootStepMinimap() { initMinimap(); }
function bootStepLevel() { loadLevel(0); }
function bootStepUI() { setupTouch(); setupButtons(); updateHUD(); applySettings(); }
function bootStepRun() { animate(); }
function bootStepDone() { bootFinish(); setTimeout(loadYandexSDK, 800); }

const BOOT_STEPS = [
  { p: 0.05, label: 'Проверка движка...', fn: bootStepInitThree },
  { p: 0.12, label: 'Инициализация сцены...', fn: bootStepScene },
  { p: 0.20, label: 'Константы...', fn: bootStepConsts },
  { p: 0.32, label: 'Текстуры окружения...', fn: bootStepTextures },
  { p: 0.44, label: 'Материалы...', fn: bootStepMaterials },
  { p: 0.52, label: 'Освещение...', fn: bootStepLights },
  { p: 0.60, label: 'Частицы...', fn: bootStepParticles },
  { p: 0.66, label: 'Мини-карта...', fn: bootStepMinimap },
  { p: 0.80, label: 'Первый уровень...', fn: bootStepLevel },
  { p: 0.90, label: 'Интерфейс...', fn: bootStepUI },
  { p: 0.96, label: 'Запуск...', fn: bootStepRun },
  { p: 1.00, label: 'Готово', fn: bootStepDone }
];

function bootRun(idx) {
  if (idx >= BOOT_STEPS.length) return;
  const s = BOOT_STEPS[idx];
  bootSetProgress(s.p, s.label);
  requestAnimationFrame(() => {
    setTimeout(() => {
      try { s.fn(); }
      catch(e) {
        console.error('Boot step error:', e);
        bootError(s.label + ' — ' + (e.message || e));
        return;
      }
      bootRun(idx + 1);
    }, 8);
  });
}

// Стартуем, когда THREE готов (или сразу, если уже загружен)
function startBoot() {
  if (typeof THREE === 'undefined') {
    bootSetProgress(0.02, 'Ожидание движка...');
    // Ожидаем загрузку THREE с любого источника
    window.__onThreeReady = function() { bootRun(0); };
    // На случай если скрипт-загрузчик уже успел загрузить THREE до нас
    if (typeof THREE !== 'undefined') bootRun(0);
  } else {
    bootRun(0);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBoot);
} else {
  startBoot();
}