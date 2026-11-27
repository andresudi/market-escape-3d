"use strict";

const canvas = document.getElementById("game");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

const hud = {
  time: document.getElementById("timeText"),
  loot: document.getElementById("lootText"),
  noise: document.getElementById("noiseText"),
  backpack: document.getElementById("backpack"),
  prompt: document.getElementById("promptText"),
  modal: document.getElementById("modal"),
  modalKicker: document.getElementById("modalKicker"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
};

if (!gl) {
  hud.prompt.textContent = "WebGL is not available in this browser.";
  throw new Error("WebGL not available");
}

const TAU = Math.PI * 2;
const WORLD = { minX: -14, maxX: 14, minZ: -10.5, maxZ: 10.5 };

const palette = {
  fog: rgb("#101820"),
  ground: rgba("#253b35"),
  path: rgba("#4a3c32"),
  pathSoft: rgba("#614d3f"),
  rabbit: rgba("#f0e9dc"),
  rabbitShade: rgba("#d5c9b8"),
  rabbitEar: rgba("#d79a92"),
  rabbitMuzzle: rgba("#fff8ed"),
  rabbitEye: rgba("#1b2224"),
  rabbitEyeBlue: rgba("#70aeea"),
  rabbitPupil: rgba("#0c1820"),
  rabbitMouth: rgba("#1a0d10"),
  rabbitNose: rgba("#c56f76"),
  rabbitPaw: rgba("#eadfcd"),
  rabbitTail: rgba("#fbf7ee"),
  whisker: rgba("#efe8d7"),
  brainGlow: rgba("#6fffe2", 0.18),
  brainGlowHot: rgba("#ff6fd8", 0.22),
  brainGold: rgba("#ffd65c"),
  brainPink: rgba("#ff75c8"),
  brainBlue: rgba("#73d7ff"),
  brainLime: rgba("#b7ff61"),
  backpack: rgba("#7b5a3d"),
  carrot: rgba("#f1993d"),
  ticket: rgba("#edcc68"),
  charm: rgba("#69b7b2"),
  guard: rgba("#354a5d"),
  guardCap: rgba("#f2bb55"),
  redVision: rgba("#ff7868", 0.24),
  canopyA: rgba("#ca675f"),
  canopyB: rgba("#3f887a"),
  canopyC: rgba("#d69d43"),
  wood: rgba("#70513a"),
  crate: rgba("#98683f"),
  lantern: rgba("#f2c868"),
  exit: rgba("#89d7c8"),
  shadow: rgba("#051012", 0.28),
  white: rgba("#fff8e7"),
};

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMat;

varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uViewProj * world;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec4 uColor;
uniform vec3 uLightDir;
uniform vec3 uFogColor;
uniform float uAlpha;

varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, normalize(-uLightDir)), 0.0);
  float hemi = normal.y * 0.5 + 0.5;
  vec3 lit = uColor.rgb * (0.34 + diffuse * 0.58 + hemi * 0.18);
  float fog = smoothstep(18.0, 34.0, length(vWorld.xz));
  vec3 color = mix(lit, uFogColor, fog * 0.55);
  gl_FragColor = vec4(color, uColor.a * uAlpha);
}
`;

const program = createProgram(vertexShaderSource, fragmentShaderSource);
const attr = {
  position: gl.getAttribLocation(program, "aPosition"),
  normal: gl.getAttribLocation(program, "aNormal"),
};
const uni = {
  model: gl.getUniformLocation(program, "uModel"),
  viewProj: gl.getUniformLocation(program, "uViewProj"),
  normalMat: gl.getUniformLocation(program, "uNormalMat"),
  color: gl.getUniformLocation(program, "uColor"),
  lightDir: gl.getUniformLocation(program, "uLightDir"),
  fogColor: gl.getUniformLocation(program, "uFogColor"),
  alpha: gl.getUniformLocation(program, "uAlpha"),
};

const meshes = {
  cube: createMesh(makeCube()),
  sphere: createMesh(makeSphere(14, 18)),
  cone: createMesh(makeCone(18)),
  cylinder: createMesh(makeCylinder(18)),
  disk: createMesh(makeDisk(34)),
  wedge: createMesh(makeWedge(32, Math.PI * 0.56)),
};

const stalls = [
  { x: -9.5, z: -6.7, w: 4.4, d: 2.0, color: palette.canopyA, sign: "satay" },
  { x: -3.0, z: -7.2, w: 4.0, d: 2.0, color: palette.canopyB, sign: "tea" },
  { x: 4.2, z: -6.6, w: 4.6, d: 2.0, color: palette.canopyC, sign: "prize" },
  { x: 10.0, z: -3.0, w: 2.0, d: 4.0, color: palette.canopyA, sign: "noodle" },
  { x: -10.0, z: 0.2, w: 2.0, d: 4.0, color: palette.canopyB, sign: "fruit" },
  { x: -5.0, z: 3.8, w: 4.2, d: 2.0, color: palette.canopyC, sign: "cake" },
  { x: 2.0, z: 4.2, w: 4.4, d: 2.0, color: palette.canopyA, sign: "toy" },
  { x: 9.0, z: 3.2, w: 2.1, d: 4.2, color: palette.canopyB, sign: "mask" },
];

const decorations = [
  { x: -12, z: -9, s: 0.8 }, { x: -6, z: -9.4, s: 0.6 }, { x: 0, z: -9.2, s: 0.7 },
  { x: 7, z: -9.0, s: 0.65 }, { x: 12, z: -7.3, s: 0.75 }, { x: -12.2, z: 7.8, s: 0.7 },
  { x: -6.7, z: 8.6, s: 0.6 }, { x: 0.4, z: 8.4, s: 0.7 }, { x: 7.4, z: 8.1, s: 0.65 },
];

const initialLoot = [
  { x: -11.7, z: -4.2, type: "C", value: 12, color: palette.carrot },
  { x: -5.5, z: -4.7, type: "T", value: 18, color: palette.ticket },
  { x: 1.2, z: -7.8, type: "G", value: 28, color: palette.charm },
  { x: 7.5, z: -5.2, type: "C", value: 12, color: palette.carrot },
  { x: 11.8, z: -0.2, type: "T", value: 18, color: palette.ticket },
  { x: -8.5, z: 2.8, type: "G", value: 28, color: palette.charm },
  { x: -1.0, z: 2.0, type: "C", value: 12, color: palette.carrot },
  { x: 5.7, z: 2.4, type: "T", value: 18, color: palette.ticket },
  { x: 12.1, z: 5.8, type: "G", value: 28, color: palette.charm },
];

const initialGuards = [
  { path: [{ x: -12, z: -8 }, { x: -2, z: -8 }, { x: -2, z: -3 }, { x: -12, z: -3 }], speed: 1.65 },
  { path: [{ x: 7, z: -8 }, { x: 12, z: -2 }, { x: 8, z: 2 }, { x: 3, z: -2 }], speed: 1.85 },
  { path: [{ x: -7, z: 7 }, { x: 2, z: 7 }, { x: 6, z: 3 }, { x: -4, z: 2 }], speed: 1.55 },
];

const input = new Set();
const viewProj = mat4Identity();
const projection = mat4Identity();
const view = mat4Identity();

let state = resetState();
let lastTime = performance.now();

initBackpack();
bindEvents();
resize();
requestAnimationFrame(loop);

function resetState() {
  return {
    status: "playing",
    timeLeft: 120,
    alert: 0,
    totalLoot: 0,
    tick: 0,
    player: {
      x: -12.2,
      y: 0,
      z: 8.4,
      angle: -0.68,
      hidden: false,
      noise: 0.05,
      backpack: [],
      maxSlots: 5,
    },
    guards: initialGuards.map((guard) => ({
      x: guard.path[0].x,
      z: guard.path[0].z,
      angle: 0,
      target: 1,
      speed: guard.speed,
      path: guard.path.map((point) => ({ ...point })),
    })),
    loot: initialLoot.map((item) => ({ ...item, collected: false, bob: Math.random() * TAU })),
    message: "Collect market loot, avoid guard vision cones, then escape through the green gate.",
  };
}

function bindEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    input.add(event.code);
    if (event.code === "KeyR") resetGame();
  });
  window.addEventListener("keyup", (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    input.delete(event.code);
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    hud.prompt.textContent = "WebGL context lost. Reload the page to play again.";
  });
}

function isGameKey(code) {
  return ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "ShiftLeft", "ShiftRight", "Space", "KeyR"].includes(code);
}

function resetGame() {
  state = resetState();
  hud.modal.classList.add("hidden");
  updateHud();
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  state.tick += dt;
  if (state.status === "playing") {
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    updatePlayer(dt);
    updateGuards(dt);
    updateLoot();
    updateDetection(dt);
    updateExtraction();
    if (state.timeLeft <= 0) lose("Market closed.", "The gate shut down before the rabbit could extract. Press R to try again.");
  }
  updateHud();
}

function updatePlayer(dt) {
  const player = state.player;
  let vx = 0;
  let vz = 0;
  if (input.has("KeyW") || input.has("ArrowUp")) vz -= 1;
  if (input.has("KeyS") || input.has("ArrowDown")) vz += 1;
  if (input.has("KeyA") || input.has("ArrowLeft")) vx -= 1;
  if (input.has("KeyD") || input.has("ArrowRight")) vx += 1;

  const moving = vx !== 0 || vz !== 0;
  if (moving) {
    const len = Math.hypot(vx, vz);
    vx /= len;
    vz /= len;
    player.angle = Math.atan2(vx, vz);
  }

  const canHide = nearHideSpot();
  player.hidden = input.has("Space") && canHide;
  const sprinting = (input.has("ShiftLeft") || input.has("ShiftRight")) && moving && !player.hidden;
  const speed = player.hidden ? 1.05 : sprinting ? 5.6 : 3.35;
  const nextX = player.x + vx * speed * dt;
  const nextZ = player.z + vz * speed * dt;

  if (!collides(nextX, player.z)) player.x = clamp(nextX, WORLD.minX + 0.45, WORLD.maxX - 0.45);
  if (!collides(player.x, nextZ)) player.z = clamp(nextZ, WORLD.minZ + 0.45, WORLD.maxZ - 0.45);

  const targetNoise = player.hidden ? 0.02 : !moving ? 0.06 : sprinting ? 1.0 : 0.38;
  player.noise = lerp(player.noise, targetNoise, 1 - Math.pow(0.001, dt));

  if (player.hidden) {
    state.message = "The rabbit crouches under the stall. Guards will pass without spotting it.";
  } else if (canHide) {
    state.message = "Hold Space near a stall to hide.";
  } else if (state.player.backpack.length >= state.player.maxSlots) {
    state.message = "Backpack full. Reach the green gate to extract.";
  } else {
    state.message = "Grab glowing loot, avoid guard cones, then extract.";
  }
}

function updateGuards(dt) {
  for (const guard of state.guards) {
    const target = guard.path[guard.target];
    const dx = target.x - guard.x;
    const dz = target.z - guard.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) {
      guard.target = (guard.target + 1) % guard.path.length;
      continue;
    }
    const dirX = dx / dist;
    const dirZ = dz / dist;
    guard.x += dirX * guard.speed * dt;
    guard.z += dirZ * guard.speed * dt;
    guard.angle = Math.atan2(dirX, dirZ);
  }
}

function updateLoot() {
  if (state.player.backpack.length >= state.player.maxSlots) return;
  for (const item of state.loot) {
    if (item.collected) continue;
    const dist = Math.hypot(item.x - state.player.x, item.z - state.player.z);
    if (dist < 0.72) {
      item.collected = true;
      state.player.backpack.push(item.type);
      state.totalLoot += item.value;
      state.message = item.type === "C" ? "Golden carrot added to the backpack." : item.type === "T" ? "Prize ticket secured." : "Night market charm found.";
      break;
    }
  }
}

function updateDetection(dt) {
  let spotted = false;
  for (const guard of state.guards) {
    const dx = state.player.x - guard.x;
    const dz = state.player.z - guard.z;
    const dist = Math.hypot(dx, dz);
    const coneLength = 5.6 + state.player.noise * 1.8;
    if (dist > coneLength || state.player.hidden) continue;
    const angleToPlayer = Math.atan2(dx, dz);
    const diff = Math.abs(angleDelta(angleToPlayer, guard.angle));
    if (diff < 0.58) {
      spotted = true;
      break;
    }
  }

  if (spotted) {
    state.alert = clamp(state.alert + dt * (0.8 + state.player.noise), 0, 1.2);
    state.message = "A guard spotted movement. Break line of sight or hide.";
  } else {
    state.alert = clamp(state.alert - dt * 0.95, 0, 1.2);
  }

  if (state.alert >= 1) {
    lose("Caught by a guard.", "The rabbit dropped the loot and fled the market. Press R for a new run.");
  }
}

function updateExtraction() {
  const dist = Math.hypot(state.player.x - 12.2, state.player.z - 8.4);
  if (dist < 1.55 && state.player.backpack.length > 0) {
    win();
  }
}

function win() {
  state.status = "won";
  hud.modalKicker.textContent = "Extracted";
  hud.modalTitle.textContent = "Loot secured.";
  hud.modalBody.textContent = `The rabbit escaped with ${state.totalLoot} loot value. Press R for a new run.`;
  hud.modal.classList.remove("hidden");
}

function lose(title, body) {
  state.status = "lost";
  hud.modalKicker.textContent = "Run failed";
  hud.modalTitle.textContent = title;
  hud.modalBody.textContent = body;
  hud.modal.classList.remove("hidden");
}

function nearHideSpot() {
  return stalls.some((stall) => {
    const dx = Math.abs(state.player.x - stall.x) - stall.w * 0.5;
    const dz = Math.abs(state.player.z - stall.z) - stall.d * 0.5;
    return Math.max(dx, dz) < 0.95;
  });
}

function collides(x, z) {
  if (x < WORLD.minX + 0.4 || x > WORLD.maxX - 0.4 || z < WORLD.minZ + 0.4 || z > WORLD.maxZ - 0.4) return true;
  return stalls.some((stall) => circleRect(x, z, 0.38, stall.x, stall.z, stall.w * 0.5, stall.d * 0.5));
}

function circleRect(cx, cz, radius, rx, rz, hw, hd) {
  const nearX = clamp(cx, rx - hw, rx + hw);
  const nearZ = clamp(cz, rz - hd, rz + hd);
  return Math.hypot(cx - nearX, cz - nearZ) < radius;
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(palette.fog[0], palette.fog[1], palette.fog[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.useProgram(program);
  gl.uniform3fv(uni.lightDir, new Float32Array([-0.46, -0.78, -0.42]));
  gl.uniform3fv(uni.fogColor, new Float32Array(palette.fog));

  updateCamera();
  drawWorld();
}

function updateCamera() {
  const player = state.player;
  const cameraX = player.x - 7.6;
  const cameraY = 8.4;
  const cameraZ = player.z + 9.4;
  mat4Perspective(projection, 48 * Math.PI / 180, canvas.width / canvas.height, 0.1, 90);
  mat4LookAt(view, [cameraX, cameraY, cameraZ], [player.x, 0.9, player.z], [0, 1, 0]);
  mat4Multiply(viewProj, projection, view);
  gl.uniformMatrix4fv(uni.viewProj, false, viewProj);
}

function drawWorld() {
  drawMesh(meshes.cube, [0, -0.12, 0], [15, 0.08, 11.6], 0, palette.ground);
  drawMesh(meshes.cube, [0, -0.06, -1.0], [14.2, 0.05, 1.35], 0, palette.path);
  drawMesh(meshes.cube, [0, -0.055, 6.6], [13.3, 0.05, 1.15], 0, palette.pathSoft);
  drawMesh(meshes.cube, [-12.7, -0.052, 0], [1.0, 0.05, 10.2], 0, palette.pathSoft);
  drawMesh(meshes.cube, [12.7, -0.052, 0], [1.0, 0.05, 10.2], 0, palette.path);

  drawExitGate();
  for (const stall of stalls) drawStall(stall);
  for (const decor of decorations) drawLanternPost(decor);
  for (const item of state.loot) if (!item.collected) drawLoot(item);

  for (const guard of state.guards) drawVision(guard);
  for (const guard of state.guards) drawGuard(guard);
  drawRabbit();
}

function drawStall(stall) {
  drawMesh(meshes.cube, [stall.x, 0.42, stall.z], [stall.w * 0.5, 0.35, stall.d * 0.5], 0, palette.wood);
  drawMesh(meshes.cube, [stall.x, 1.45, stall.z], [stall.w * 0.58, 0.18, stall.d * 0.62], 0, stall.color);
  drawMesh(meshes.cube, [stall.x, 1.73, stall.z - stall.d * 0.32], [stall.w * 0.5, 0.08, 0.08], 0, palette.white);
  drawMesh(meshes.cube, [stall.x - stall.w * 0.43, 0.9, stall.z - stall.d * 0.43], [0.08, 0.75, 0.08], 0, palette.wood);
  drawMesh(meshes.cube, [stall.x + stall.w * 0.43, 0.9, stall.z - stall.d * 0.43], [0.08, 0.75, 0.08], 0, palette.wood);
  drawMesh(meshes.cube, [stall.x - stall.w * 0.33, 0.82, stall.z + stall.d * 0.55], [0.45, 0.28, 0.32], 0.1, palette.crate);
  drawMesh(meshes.sphere, [stall.x + stall.w * 0.28, 1.15, stall.z + stall.d * 0.1], [0.18, 0.18, 0.18], 0, palette.lantern);
}

function drawLanternPost(post) {
  drawMesh(meshes.cylinder, [post.x, 1.0, post.z], [0.08 * post.s, 1.0, 0.08 * post.s], 0, palette.wood);
  drawMesh(meshes.sphere, [post.x, 2.15, post.z], [0.24 * post.s, 0.24 * post.s, 0.24 * post.s], 0, palette.lantern);
  drawMesh(meshes.disk, [post.x, 0.011, post.z], [0.8 * post.s, 1, 0.8 * post.s], 0, rgba("#f2c868", 0.1));
}

function drawExitGate() {
  drawMesh(meshes.disk, [12.2, 0.02, 8.4], [1.72, 1, 1.72], 0, rgba("#70e0c9", 0.18));
  drawMesh(meshes.cube, [11.0, 1.1, 9.0], [0.15, 1.1, 0.15], 0, palette.exit);
  drawMesh(meshes.cube, [13.4, 1.1, 9.0], [0.15, 1.1, 0.15], 0, palette.exit);
  drawMesh(meshes.cube, [12.2, 2.25, 9.0], [1.45, 0.15, 0.16], 0, palette.exit);
}

function drawLoot(item) {
  const y = 0.42 + Math.sin(state.tick * 3 + item.bob) * 0.08;
  drawMesh(meshes.disk, [item.x, 0.018, item.z], [0.45, 1, 0.45], 0, rgba("#f8da7a", 0.16));
  if (item.type === "C") {
    drawMesh(meshes.cone, [item.x, y, item.z], [0.22, 0.5, 0.22], Math.PI, item.color);
    drawMesh(meshes.cylinder, [item.x, y + 0.25, item.z], [0.08, 0.16, 0.08], 0, rgba("#70b85e"));
  } else if (item.type === "T") {
    drawMesh(meshes.cube, [item.x, y, item.z], [0.35, 0.04, 0.22], state.tick + item.bob, item.color);
  } else {
    drawMesh(meshes.sphere, [item.x, y, item.z], [0.22, 0.28, 0.22], 0, item.color);
  }
}

function drawVision(guard) {
  drawMesh(meshes.wedge, [guard.x, 0.026, guard.z], [5.6 + state.player.noise * 1.8, 1, 5.6 + state.player.noise * 1.8], guard.angle, palette.redVision);
}

function drawGuard(guard) {
  drawMesh(meshes.disk, [guard.x, 0.02, guard.z], [0.58, 1, 0.58], 0, palette.shadow);
  drawMesh(meshes.cylinder, [guard.x, 0.62, guard.z], [0.32, 0.62, 0.32], guard.angle, palette.guard);
  drawMesh(meshes.sphere, [guard.x, 1.34, guard.z], [0.28, 0.28, 0.28], guard.angle, rgba("#d7b28d"));
  drawMesh(meshes.cube, [guard.x, 1.66, guard.z + 0.04], [0.32, 0.08, 0.25], guard.angle, palette.guardCap);
}

function drawRabbit() {
  const p = state.player;
  const moving = p.noise > 0.12 && state.status === "playing";
  const hop = state.status === "playing" ? Math.sin(state.tick * 12) * (moving ? 0.055 : 0.014) : 0;
  const breathe = Math.sin(state.tick * 4.5) * 0.018;
  const legSwing = moving ? Math.sin(state.tick * 14) : 0;
  const baseY = 0.12 + hop;
  const fur = p.hidden ? rgba("#cfe7dc", 0.72) : palette.rabbit;
  const shade = p.hidden ? rgba("#b5cbc4", 0.58) : palette.rabbitShade;
  const wobble = Math.sin(state.tick * 5.2) * 0.055;

  drawMesh(meshes.disk, [p.x, 0.021, p.z], [0.82, 1, 0.56], p.angle, palette.shadow);

  drawRabbitPart(0, baseY + 0.76, 0.02, [0.48, 0.74 + breathe, 0.38], [0, p.angle, 0], fur);
  drawRabbitPart(0, baseY + 1.31, 0.13, [0.4, 0.38, 0.34], [0.02, p.angle, 0], fur);
  drawRabbitMeshPart(meshes.cube, 0, baseY + 0.73, 0.42, [0.29, 0.29, 0.022], [0.02, p.angle, 0], palette.rabbitEar);
  drawRabbitMeshPart(meshes.cube, 0, baseY + 0.74, 0.447, [0.23, 0.23, 0.014], [0.02, p.angle, 0], rgba("#f0a7b8"));

  drawRabbitPart(-0.58, baseY + 0.82, 0.08, [0.09, 0.36, 0.09], [0.16, p.angle, 0.86], fur);
  drawRabbitPart(0.58, baseY + 0.82, 0.08, [0.09, 0.36, 0.09], [0.16, p.angle, -0.86], fur);
  drawRabbitPart(-0.74, baseY + 1.08, 0.16, [0.17, 0.13, 0.12], [0.18, p.angle, 0.4], fur);
  drawRabbitPart(0.74, baseY + 1.08, 0.16, [0.17, 0.13, 0.12], [0.18, p.angle, -0.4], fur);
  drawRabbitMeshPart(meshes.cube, -0.74, baseY + 1.1, 0.28, [0.032, 0.11, 0.018], [0, p.angle, -0.12], palette.rabbitEar);
  drawRabbitMeshPart(meshes.cube, 0.74, baseY + 1.1, 0.28, [0.032, 0.11, 0.018], [0, p.angle, 0.12], palette.rabbitEar);

  drawRabbitPart(0, baseY + 0.38, -0.36, [0.16, 0.13, 0.14], [0, p.angle, 0], palette.rabbitTail);
  drawRabbitPart(-0.22, baseY + 0.1, 0.3 + legSwing * 0.035, [0.31, 0.15, 0.38], [0, p.angle - 0.07, 0], palette.rabbitEar);
  drawRabbitPart(0.22, baseY + 0.1, 0.3 - legSwing * 0.035, [0.31, 0.15, 0.38], [0, p.angle + 0.07, 0], palette.rabbitEar);
  drawRabbitPart(-0.2, baseY + 0.2, 0.42 + legSwing * 0.035, [0.1, 0.13, 0.055], [-0.1, p.angle - 0.07, 0], fur);
  drawRabbitPart(0.2, baseY + 0.2, 0.42 - legSwing * 0.035, [0.1, 0.13, 0.055], [-0.1, p.angle + 0.07, 0], fur);

  drawRabbitPart(-0.19, baseY + 1.42, 0.42, [0.12, 0.13, 0.08], [0, p.angle, 0], palette.white);
  drawRabbitPart(0.19, baseY + 1.42, 0.42, [0.12, 0.13, 0.08], [0, p.angle, 0], palette.white);
  drawRabbitPart(-0.19 + Math.sin(state.tick * 7.3) * 0.01, baseY + 1.42, 0.49, [0.07, 0.08, 0.04], [0, p.angle, 0], palette.rabbitPupil);
  drawRabbitPart(0.19 + Math.cos(state.tick * 6.7) * 0.01, baseY + 1.42, 0.49, [0.07, 0.08, 0.04], [0, p.angle, 0], palette.rabbitPupil);
  drawRabbitPart(-0.22, baseY + 1.47, 0.52, [0.02, 0.022, 0.012], [0, p.angle, 0], palette.white);
  drawRabbitPart(0.16, baseY + 1.47, 0.52, [0.02, 0.022, 0.012], [0, p.angle, 0], palette.white);

  drawRabbitMeshPart(meshes.cube, 0, baseY + 1.21, 0.48, [0.28, 0.11, 0.032], [0.07, p.angle, 0], palette.rabbitMouth);
  drawRabbitMeshPart(meshes.cube, 0, baseY + 1.26, 0.515, [0.22, 0.035, 0.018], [0.07, p.angle, 0], palette.white);
  drawRabbitPart(0, baseY + 1.33, 0.53, [0.055, 0.038, 0.026], [0, p.angle, 0], palette.rabbitNose);
  drawRabbitMeshPart(meshes.cube, -0.038, baseY + 1.16, 0.515, [0.038, 0.08, 0.018], [0.07, p.angle, 0], palette.white);
  drawRabbitMeshPart(meshes.cube, 0.038, baseY + 1.16, 0.515, [0.038, 0.08, 0.018], [0.07, p.angle, 0], palette.white);

  drawRabbitPart(-0.19, baseY + 2.0, 0.1, [0.12, 0.6, 0.065], [-0.2 + wobble, p.angle - 0.16, -0.12], fur);
  drawRabbitPart(0.19, baseY + 2.0, 0.1, [0.12, 0.6, 0.065], [-0.2 - wobble, p.angle + 0.16, 0.12], fur);
  drawRabbitPart(-0.19, baseY + 2.03, 0.13, [0.055, 0.43, 0.026], [-0.2 + wobble, p.angle - 0.16, -0.12], palette.rabbitEar);
  drawRabbitPart(0.19, baseY + 2.03, 0.13, [0.055, 0.43, 0.026], [-0.2 - wobble, p.angle + 0.16, 0.12], palette.rabbitEar);

  drawRabbitPart(0, baseY + 0.68, -0.38, [0.24, 0.21, 0.16], [0, p.angle, 0], palette.backpack);
  drawRabbitPart(0, baseY + 0.82, -0.14, [0.34, 0.035, 0.05], [0.25, p.angle, 0], rgba("#b99462"));
}

function drawRabbitPart(side, y, forward, scale, rotation, color) {
  drawRabbitMeshPart(meshes.sphere, side, y, forward, scale, rotation, color);
}

function drawRabbitMeshPart(mesh, side, y, forward, scale, rotation, color) {
  const a = state.player.angle;
  const x = state.player.x + Math.sin(a) * forward + Math.cos(a) * side;
  const z = state.player.z + Math.cos(a) * forward - Math.sin(a) * side;
  drawMesh(mesh, [x, y, z], scale, rotation, color);
}

function drawMesh(mesh, position, scale, rotationY, color) {
  const alpha = color[3] ?? 1;
  if (alpha < 1) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
  } else {
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
  }

  const model = makeModel(position, scale, rotationY);
  gl.uniformMatrix4fv(uni.model, false, model);
  gl.uniformMatrix3fv(uni.normalMat, false, normalFromModel(model));
  gl.uniform4fv(uni.color, new Float32Array(color));
  gl.uniform1f(uni.alpha, 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
  gl.enableVertexAttribArray(attr.position);
  gl.vertexAttribPointer(attr.position, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
  gl.enableVertexAttribArray(attr.normal);
  gl.vertexAttribPointer(attr.normal, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

  if (alpha < 1) {
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
  }
}

function updateHud() {
  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = Math.floor(state.timeLeft % 60).toString().padStart(2, "0");
  hud.time.textContent = `${minutes}:${seconds}`;
  hud.loot.textContent = String(state.totalLoot);
  hud.noise.textContent = state.player.noise > 0.75 ? "High" : state.player.noise > 0.24 ? "Med" : "Low";
  hud.prompt.textContent = state.message;
  for (let i = 0; i < state.player.maxSlots; i += 1) {
    const slot = hud.backpack.children[i];
    const item = state.player.backpack[i];
    slot.classList.toggle("filled", Boolean(item));
    slot.textContent = item || "";
  }
}

function initBackpack() {
  hud.backpack.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    hud.backpack.appendChild(slot);
  }
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(window.innerWidth * dpr));
  const height = Math.max(1, Math.floor(window.innerHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(vsSource, fsSource) {
  const programObject = gl.createProgram();
  gl.attachShader(programObject, createShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(programObject, createShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(programObject);
  if (!gl.getProgramParameter(programObject, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(programObject));
  }
  return programObject;
}

function createMesh(data) {
  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);

  const normal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

  return { position, normal, index, count: data.indices.length };
}

function makeCube() {
  const positions = [];
  const normals = [];
  const indices = [];
  const faces = [
    [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1]],
    [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1]],
    [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0]],
    [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, -1, 0]],
    [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, 0, 0]],
    [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, 0]],
  ];
  for (const face of faces) {
    const base = positions.length / 3;
    for (let i = 0; i < 4; i += 1) {
      positions.push(...face[i]);
      normals.push(...face[4]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

function makeSphere(lat, lon) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let y = 0; y <= lat; y += 1) {
    const v = y / lat;
    const theta = v * Math.PI;
    for (let x = 0; x <= lon; x += 1) {
      const u = x / lon;
      const phi = u * TAU;
      const sx = Math.sin(theta) * Math.cos(phi);
      const sy = Math.cos(theta);
      const sz = Math.sin(theta) * Math.sin(phi);
      positions.push(sx, sy, sz);
      normals.push(sx, sy, sz);
    }
  }
  for (let y = 0; y < lat; y += 1) {
    for (let x = 0; x < lon; x += 1) {
      const i = y * (lon + 1) + x;
      indices.push(i, i + lon + 1, i + 1, i + 1, i + lon + 1, i + lon + 2);
    }
  }
  return { positions, normals, indices };
}

function makeCone(segments) {
  const positions = [0, 1, 0, 0, 0, 0];
  const normals = [0, 1, 0, 0, -1, 0];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a), 0, Math.sin(a));
    normals.push(Math.cos(a), 0.5, Math.sin(a));
  }
  for (let i = 0; i < segments; i += 1) {
    const rim = 2 + i;
    indices.push(0, rim, rim + 1);
    indices.push(1, rim + 1, rim);
  }
  return { positions, normals, indices };
}

function makeCylinder(segments) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let y = -1; y <= 1; y += 2) {
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * TAU;
      positions.push(Math.cos(a), y, Math.sin(a));
      normals.push(Math.cos(a), 0, Math.sin(a));
    }
  }
  for (let i = 0; i < segments; i += 1) {
    indices.push(i, i + 1, i + segments + 1, i + 1, i + segments + 2, i + segments + 1);
  }
  const topCenter = positions.length / 3;
  positions.push(0, 1, 0);
  normals.push(0, 1, 0);
  const bottomCenter = positions.length / 3;
  positions.push(0, -1, 0);
  normals.push(0, -1, 0);
  for (let i = 0; i < segments; i += 1) {
    indices.push(topCenter, segments + 1 + i, segments + 1 + i + 1);
    indices.push(bottomCenter, i + 1, i);
  }
  return { positions, normals, indices };
}

function makeDisk(segments) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a), 0, Math.sin(a));
    normals.push(0, 1, 0);
  }
  for (let i = 1; i <= segments; i += 1) indices.push(0, i, i + 1);
  return { positions, normals, indices };
}

function makeWedge(segments, angle) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = -angle + (i / segments) * angle * 2;
    positions.push(Math.sin(a), 0, Math.cos(a));
    normals.push(0, 1, 0);
  }
  for (let i = 1; i <= segments; i += 1) indices.push(0, i, i + 1);
  return { positions, normals, indices };
}

function makeModel(position, scale, rotation) {
  const rx = Array.isArray(rotation) ? rotation[0] : 0;
  const ry = Array.isArray(rotation) ? rotation[1] : rotation;
  const rz = Array.isArray(rotation) ? rotation[2] : 0;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  const r00 = cz * cy;
  const r01 = cz * sy * sx - sz * cx;
  const r02 = cz * sy * cx + sz * sx;
  const r10 = sz * cy;
  const r11 = sz * sy * sx + cz * cx;
  const r12 = sz * sy * cx - cz * sx;
  const r20 = -sy;
  const r21 = cy * sx;
  const r22 = cy * cx;

  return new Float32Array([
    r00 * scale[0], r10 * scale[0], r20 * scale[0], 0,
    r01 * scale[1], r11 * scale[1], r21 * scale[1], 0,
    r02 * scale[2], r12 * scale[2], r22 * scale[2], 0,
    position[0], position[1], position[2], 1,
  ]);
}

function normalFromModel(model) {
  const x = normalize3(model[0], model[1], model[2]);
  const y = normalize3(model[4], model[5], model[6]);
  const z = normalize3(model[8], model[9], model[10]);
  return new Float32Array([
    x[0], x[1], x[2],
    y[0], y[1], y[2],
    z[0], z[1], z[2],
  ]);
}

function mat4Identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
}

function mat4LookAt(out, eye, target, up) {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
}

function mat4Multiply(out, a, b) {
  const temp = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      temp[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  out.set(temp);
}

function rgb(hex) {
  const color = parseInt(hex.slice(1), 16);
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
}

function rgba(hex, alpha = 1) {
  return [...rgb(hex), alpha];
}

function normalize3(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}
