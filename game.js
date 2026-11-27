"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const FIELD_W = 660;
const PANEL_X = 676;
const PANEL_W = 260;
const GROUND_Y = 245;
const TAU = Math.PI * 2;

const colors = {
  ink: "#263432",
  muted: "#62706c",
  panel: "#fffaf1",
  panelLine: "#d9cab7",
  meadow: "#8fcf8a",
  meadowDark: "#5fac73",
  blush: "#d89091",
  carrot: "#f18b39",
  gold: "#e5b94f",
  blue: "#6e95bc",
  dress: "#597d8c",
  dressDark: "#3d5f69",
};

const actionButtons = [
  { id: "feed", label: "Beri", x: PANEL_X + 18, y: 468, w: 106, h: 42, key: "1" },
  { id: "pet", label: "Elus", x: PANEL_X + 136, y: 468, w: 106, h: 42, key: "2" },
  { id: "play", label: "Main", x: PANEL_X + 18, y: 520, w: 106, h: 42, key: "3" },
  { id: "sing", label: "Nyanyi", x: PANEL_X + 136, y: 520, w: 106, h: 42, key: "4" },
  { id: "forage", label: "Cari Bekal", x: PANEL_X + 18, y: 572, w: 224, h: 42, key: "R" },
];

const state = {
  tick: 0,
  day: 1,
  mode: "play",
  selectedRabbit: 0,
  hoveredButton: null,
  woman: {
    x: 335,
    y: 410,
    targetX: 335,
    targetY: 410,
    speed: 110,
    facing: 1,
    name: "Mira",
  },
  inventory: {
    carrot: 5,
    clover: 2,
  },
  quest: {
    title: "Buat tiga kelinci cukup senang untuk menari di padang.",
    progress: 0,
    target: 3,
    complete: false,
  },
  rabbits: [
    makeRabbit("Momo", 230, 420, "#f6f1e7", "#c96f72"),
    makeRabbit("Bibi", 460, 380, "#dbc1a4", "#8d6752"),
    makeRabbit("Nala", 560, 462, "#eef2f1", "#6d8190"),
  ],
  gm: {
    title: "AI Game Master",
    line: "Mira berdiri di padang rumput pagi. Tiga kelinci menunggu ajakan bermain. Pilih kelinci, dekatkan Mira, lalu coba aksi.",
    roll: null,
    mood: "cozy",
  },
  floating: [],
};

const params = new URLSearchParams(window.location.search);
if (params.has("showcase")) {
  setupShowcase();
}

function makeRabbit(name, x, y, fur, accent) {
  return {
    name,
    x,
    y,
    vx: 0,
    vy: 0,
    wander: 0,
    mood: 48 + Math.floor(Math.random() * 12),
    hunger: 38 + Math.floor(Math.random() * 18),
    trust: 28 + Math.floor(Math.random() * 10),
    play: 34 + Math.floor(Math.random() * 12),
    fur,
    accent,
    blink: Math.random() * 2,
    hop: Math.random() * TAU,
    danced: false,
  };
}

function setupShowcase() {
  state.selectedRabbit = 0;
  state.woman.x = 284;
  state.woman.y = 430;
  state.woman.targetX = 284;
  state.woman.targetY = 430;
  state.woman.facing = -1;

  const [momo, bibi, nala] = state.rabbits;
  momo.x = 238;
  momo.y = 424;
  momo.mood = 84;
  momo.trust = 66;
  momo.hunger = 22;
  momo.play = 72;
  momo.danced = true;

  bibi.x = 468;
  bibi.y = 386;
  bibi.mood = 62;
  bibi.trust = 42;

  nala.x = 566;
  nala.y = 468;
  nala.mood = 58;
  nala.trust = 38;

  state.quest.progress = 1;
  state.inventory.carrot = 4;
  state.inventory.clover = 3;
  state.gm.line = "Mira melempar pita kecil. Momo mengejarnya, lalu berputar senang. GM mencatat: satu kelinci sudah siap menari.";
  state.gm.roll = { natural: 16, total: 18 };
  state.gm.mood = "bright";
  state.floating.push({ text: "+joy", x: momo.x, y: momo.y - 62, color: colors.gold, life: 1.2 });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function rollD20(modifier = 0) {
  const natural = 1 + Math.floor(Math.random() * 20);
  return { natural, total: natural + modifier };
}

function selectedRabbit() {
  return state.rabbits[state.selectedRabbit];
}

function nearSelectedRabbit() {
  return distance(state.woman, selectedRabbit()) < 118;
}

function addFloat(text, x, y, color = colors.ink) {
  state.floating.push({ text, x, y, color, life: 1.2 });
}

function setGM(line, roll = null, mood = "cozy") {
  state.gm.line = line;
  state.gm.roll = roll;
  state.gm.mood = mood;
}

function performAction(action) {
  const rabbit = selectedRabbit();
  const near = nearSelectedRabbit();

  if (action !== "forage" && !near) {
    const r = rollD20(0);
    setGM(
      `${rabbit.name} mengendus udara, tapi Mira masih terlalu jauh. Gerakkan Mira lebih dekat agar kelinci merasa diajak, bukan dipanggil dari kejauhan.`,
      r,
      "gentle"
    );
    addFloat("Terlalu jauh", rabbit.x, rabbit.y - 44, colors.blush);
    return;
  }

  if (action === "feed") {
    if (state.inventory.carrot <= 0) {
      setGM("Keranjang wortel kosong. GM menyarankan Mira mencari daun semanggi dan wortel liar dulu.", null, "calm");
      addFloat("Wortel habis", state.woman.x, state.woman.y - 70, colors.blush);
      return;
    }
    state.inventory.carrot -= 1;
    const r = rollD20(2);
    rabbit.hunger = clamp(rabbit.hunger - 24, 0, 100);
    rabbit.trust = clamp(rabbit.trust + (r.total >= 10 ? 16 : 9), 0, 100);
    rabbit.mood = clamp(rabbit.mood + (r.total >= 10 ? 14 : 7), 0, 100);
    addFloat("+trust", rabbit.x, rabbit.y - 52, colors.gold);
    setGM(
      r.total >= 10
        ? `${rabbit.name} menerima wortel dan meloncat kecil mengitari Mira. GM memberi tanda: hubungan mereka mulai hangat.`
        : `${rabbit.name} makan pelan-pelan. Tidak spektakuler, tapi cukup untuk membuatnya percaya bahwa Mira datang dengan niat baik.`,
      r,
      "warm"
    );
  }

  if (action === "pet") {
    const r = rollD20(Math.floor(rabbit.trust / 25));
    const success = r.total >= 11;
    rabbit.trust = clamp(rabbit.trust + (success ? 13 : 5), 0, 100);
    rabbit.mood = clamp(rabbit.mood + (success ? 10 : -2), 0, 100);
    addFloat(success ? "purr" : "pelan", rabbit.x, rabbit.y - 52, success ? colors.blue : colors.blush);
    setGM(
      success
        ? `Mira mengelus ${rabbit.name} dengan ritme tenang. Kelinci itu menutup mata sebentar, seolah mengizinkan cerita hari ini berjalan lebih dekat.`
        : `${rabbit.name} belum sepenuhnya yakin. GM mencatat: sentuhan yang baik kadang butuh sabar lebih banyak daripada keberanian.`,
      r,
      success ? "soft" : "careful"
    );
  }

  if (action === "play") {
    const r = rollD20(Math.floor(rabbit.play / 20));
    const success = r.total >= 10;
    rabbit.play = clamp(rabbit.play + 15, 0, 100);
    rabbit.mood = clamp(rabbit.mood + (success ? 19 : 8), 0, 100);
    rabbit.trust = clamp(rabbit.trust + (success ? 8 : 3), 0, 100);
    rabbit.vx += (Math.random() - 0.5) * 80;
    rabbit.vy -= 28;
    addFloat(success ? "+joy" : "+play", rabbit.x, rabbit.y - 52, success ? colors.gold : colors.blue);
    setGM(
      success
        ? `Mira melempar gulungan pita. ${rabbit.name} mengejarnya, lalu berputar seperti sedang latihan panggung. Padang rumput ikut terasa hidup.`
        : `Mainannya meluncur terlalu dekat ke bunga liar. ${rabbit.name} tetap penasaran, tapi GM mencatat aksi ini lebih lucu daripada rapi.`,
      r,
      "bright"
    );
  }

  if (action === "sing") {
    const r = rollD20(1);
    for (const bunny of state.rabbits) {
      const gain = r.total >= 12 ? 9 : 4;
      bunny.mood = clamp(bunny.mood + gain, 0, 100);
      bunny.trust = clamp(bunny.trust + Math.floor(gain / 2), 0, 100);
    }
    addFloat("lagu pagi", state.woman.x, state.woman.y - 80, colors.blue);
    setGM(
      r.total >= 12
        ? "Mira menyanyikan melodi pendek. Semua kelinci berhenti bergerak, lalu mendekat seolah lagu itu adalah pintu kecil ke rasa aman."
        : "Nada Mira agak goyah, tapi kelinci-kelinci tidak menghakimi. Mereka cuma menunggu bait berikutnya dengan telinga tegak.",
      r,
      "lyrical"
    );
  }

  if (action === "forage") {
    const r = rollD20(0);
    const carrots = r.total >= 12 ? 2 : 1;
    const clover = r.total >= 9 ? 1 : 0;
    state.inventory.carrot += carrots;
    state.inventory.clover += clover;
    addFloat(`+${carrots} wortel`, state.woman.x, state.woman.y - 72, colors.carrot);
    setGM(
      clover
        ? `Mira menemukan wortel kecil dan semanggi di dekat pagar putih. GM menyimpan ini sebagai bekal untuk membujuk kelinci yang pemalu.`
        : "Mira menemukan wortel di bawah dedaunan. Tidak banyak, tapi cukup untuk satu ajakan bermain berikutnya.",
      r,
      "forage"
    );
  }

  updateQuest();
}

function updateQuest() {
  let newProgress = 0;
  for (const rabbit of state.rabbits) {
    if (rabbit.mood >= 78) {
      newProgress += 1;
      rabbit.danced = true;
    }
  }
  if (newProgress !== state.quest.progress) {
    state.quest.progress = newProgress;
    if (newProgress > 0) {
      addFloat(`${newProgress}/${state.quest.target}`, 580, 102, colors.gold);
    }
  }
  if (!state.quest.complete && state.quest.progress >= state.quest.target) {
    state.quest.complete = true;
    setGM(
      "Quest selesai. Tiga kelinci menari di sekitar Mira, dan GM menutup adegan dengan padang yang dipenuhi loncatan kecil dan tawa pelan.",
      { natural: 20, total: 20 },
      "victory"
    );
  }
}

function setTargetFromPointer(x, y) {
  if (x > FIELD_W || y < GROUND_Y - 20) return;
  state.woman.targetX = clamp(x, 48, FIELD_W - 46);
  state.woman.targetY = clamp(y, GROUND_Y + 42, H - 70);
}

function selectNearestRabbit(x, y) {
  let best = -1;
  let bestDist = Infinity;
  state.rabbits.forEach((rabbit, index) => {
    const d = Math.hypot(rabbit.x - x, rabbit.y - y);
    if (d < bestDist) {
      best = index;
      bestDist = d;
    }
  });
  if (bestDist < 54 && best >= 0) {
    state.selectedRabbit = best;
    const rabbit = selectedRabbit();
    setGM(`${rabbit.name} sekarang jadi fokus adegan. GM menunggu Mira mendekat dan memilih aksi yang tepat.`, null, "focus");
    addFloat(rabbit.name, rabbit.x, rabbit.y - 58, colors.ink);
    return true;
  }
  return false;
}

function buttonAt(x, y) {
  return actionButtons.find((button) => (
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h
  ));
}

function getPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", (event) => {
  const p = getPointer(event);
  const button = buttonAt(p.x, p.y);
  if (button) {
    performAction(button.id);
    return;
  }
  if (!selectNearestRabbit(p.x, p.y)) {
    setTargetFromPointer(p.x, p.y);
  }
});

canvas.addEventListener("pointermove", (event) => {
  const p = getPointer(event);
  const button = buttonAt(p.x, p.y);
  state.hoveredButton = button ? button.id : null;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "f") {
    toggleFullscreen();
    return;
  }
  if (key === "1") performAction("feed");
  if (key === "2") performAction("pet");
  if (key === "3") performAction("play");
  if (key === "4") performAction("sing");
  if (key === "r") performAction("forage");

  const step = 36;
  if (key === "arrowleft" || key === "a") state.woman.targetX = clamp(state.woman.targetX - step, 48, FIELD_W - 46);
  if (key === "arrowright" || key === "d") state.woman.targetX = clamp(state.woman.targetX + step, 48, FIELD_W - 46);
  if (key === "arrowup" || key === "w") state.woman.targetY = clamp(state.woman.targetY - step, GROUND_Y + 42, H - 70);
  if (key === "arrowdown" || key === "s") state.woman.targetY = clamp(state.woman.targetY + step, GROUND_Y + 42, H - 70);
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function update(dt) {
  state.tick += dt;
  updateWoman(dt);
  updateRabbits(dt);
  updateFloating(dt);
}

function updateWoman(dt) {
  const woman = state.woman;
  const dx = woman.targetX - woman.x;
  const dy = woman.targetY - woman.y;
  const d = Math.hypot(dx, dy);
  if (d > 2) {
    const move = Math.min(d, woman.speed * dt);
    woman.x += (dx / d) * move;
    woman.y += (dy / d) * move;
    woman.facing = dx >= 0 ? 1 : -1;
  }
}

function updateRabbits(dt) {
  for (const rabbit of state.rabbits) {
    rabbit.wander -= dt;
    rabbit.hop += dt * 5.2;
    rabbit.blink += dt;

    if (rabbit.wander <= 0) {
      rabbit.wander = 1.4 + Math.random() * 2.2;
      const trustPull = rabbit.trust > 62 ? 0.45 : 0;
      rabbit.vx = (Math.random() - 0.5) * 34 + (state.woman.x - rabbit.x) * trustPull * 0.08;
      rabbit.vy = (Math.random() - 0.5) * 20 + (state.woman.y - rabbit.y) * trustPull * 0.05;
    }

    rabbit.x += rabbit.vx * dt;
    rabbit.y += rabbit.vy * dt;
    rabbit.vx *= Math.pow(0.78, dt);
    rabbit.vy *= Math.pow(0.78, dt);

    rabbit.x = clamp(rabbit.x, 54, FIELD_W - 46);
    rabbit.y = clamp(rabbit.y, GROUND_Y + 56, H - 66);
    rabbit.hunger = clamp(rabbit.hunger + dt * 0.85, 0, 100);
    rabbit.mood = clamp(rabbit.mood - dt * 0.22 + (rabbit.trust > 70 ? dt * 0.12 : 0), 0, 100);
  }
}

function updateFloating(dt) {
  state.floating = state.floating.filter((item) => {
    item.y -= dt * 22;
    item.life -= dt;
    return item.life > 0;
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawWorld();
  drawCharacters();
  drawFloating();
  drawPanel();
}

function drawWorld() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y + 80);
  sky.addColorStop(0, "#b8dcea");
  sky.addColorStop(0.65, "#dcefcf");
  sky.addColorStop(1, "#f8e1bd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD_W, H);

  drawSun(94, 84);
  drawCloud(210, 82, 1.05);
  drawCloud(496, 72, 0.82);

  drawHill("#9ccf83", -90, 234, 360, 118);
  drawHill("#7fbe79", 180, 247, 390, 108);
  drawHill("#70b772", 410, 255, 330, 92);

  const meadow = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  meadow.addColorStop(0, "#a3d37d");
  meadow.addColorStop(1, "#5fac73");
  ctx.fillStyle = meadow;
  ctx.fillRect(0, GROUND_Y, FIELD_W, H - GROUND_Y);

  drawPath();
  drawFence();
  drawFlowers();
  drawPond();
}

function drawSun(x, y) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  const glow = ctx.createRadialGradient(x, y, 8, x, y, 72);
  glow.addColorStop(0, "#fff4b4");
  glow.addColorStop(1, "rgba(255, 244, 180, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 74, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f4cb5b";
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  roundedBlob([
    [-52, 4, 34],
    [-20, -12, 42],
    [20, -4, 36],
    [52, 8, 28],
  ]);
  ctx.restore();
}

function roundedBlob(parts) {
  ctx.beginPath();
  for (const [x, y, r] of parts) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}

function drawHill(color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y);
  ctx.quadraticCurveTo(x + w * 0.5, y - h, x + w, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

function drawPath() {
  ctx.save();
  ctx.fillStyle = "#e7cfa8";
  ctx.beginPath();
  ctx.moveTo(265, H);
  ctx.bezierCurveTo(322, 528, 372, 461, 410, GROUND_Y + 18);
  ctx.lineTo(512, GROUND_Y + 20);
  ctx.bezierCurveTo(478, 430, 438, 526, 436, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(113, 86, 53, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFence() {
  ctx.save();
  ctx.strokeStyle = "#f7ead5";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.94;
  ctx.beginPath();
  ctx.moveTo(24, 292);
  ctx.quadraticCurveTo(190, 254, 334, 282);
  ctx.quadraticCurveTo(510, 318, 648, 280);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let x = 36; x < 650; x += 54) {
    const y = 286 + Math.sin(x * 0.035) * 16;
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x, y + 36);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlowers() {
  const spots = [
    [72, 462, "#df7c91"], [120, 526, "#e5b94f"], [168, 370, "#ffffff"],
    [294, 560, "#d8798a"], [538, 336, "#ffffff"], [604, 514, "#f0c85f"],
    [78, 340, "#f0c85f"], [246, 318, "#ffffff"], [582, 410, "#df7c91"],
    [392, 354, "#f0c85f"], [212, 598, "#ffffff"], [514, 570, "#d8798a"],
  ];
  for (const [x, y, c] of spots) drawFlower(x, y, c);
}

function drawFlower(x, y, c) {
  ctx.save();
  ctx.strokeStyle = "#357049";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x + 1, y - 2);
  ctx.stroke();
  ctx.fillStyle = c;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 5, y - 3 + Math.sin(a) * 5, 3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#d6a83d";
  ctx.beginPath();
  ctx.arc(x, y - 3, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPond() {
  ctx.save();
  ctx.fillStyle = "rgba(91, 156, 170, 0.58)";
  ctx.beginPath();
  ctx.ellipse(114, 590, 84, 30, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(116, 586, 55, 14, -0.1, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawCharacters() {
  const drawable = [
    ...state.rabbits.map((rabbit, index) => ({ type: "rabbit", item: rabbit, index, y: rabbit.y })),
    { type: "woman", item: state.woman, y: state.woman.y + 6 },
  ].sort((a, b) => a.y - b.y);

  for (const entry of drawable) {
    if (entry.type === "rabbit") drawRabbit(entry.item, entry.index === state.selectedRabbit);
    if (entry.type === "woman") drawWoman(entry.item);
  }
}

function drawWoman(woman) {
  ctx.save();
  ctx.translate(woman.x, woman.y);
  ctx.scale(woman.facing, 1);

  ctx.fillStyle = "rgba(35, 50, 45, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 38, 33, 10, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#8a5f44";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, 14);
  ctx.lineTo(-26, 36);
  ctx.moveTo(13, 14);
  ctx.lineTo(28, 34);
  ctx.stroke();

  ctx.fillStyle = colors.dress;
  ctx.beginPath();
  ctx.moveTo(-27, 45);
  ctx.lineTo(0, -12);
  ctx.lineTo(29, 45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.dressDark;
  ctx.beginPath();
  ctx.ellipse(0, 2, 21, 19, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#65402c";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-9, 43);
  ctx.lineTo(-14, 66);
  ctx.moveTo(12, 43);
  ctx.lineTo(17, 66);
  ctx.stroke();

  ctx.fillStyle = "#f1c49c";
  ctx.beginPath();
  ctx.arc(0, -31, 19, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#5a3b2d";
  ctx.beginPath();
  ctx.arc(-5, -39, 23, Math.PI * 0.66, Math.PI * 2.03);
  ctx.arc(-17, -25, 16, Math.PI * 1.08, Math.PI * 2.45);
  ctx.fill();

  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.arc(7, -32, 2.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = colors.blush;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(11, -25, 5, 0.2, 2.2);
  ctx.stroke();

  ctx.fillStyle = colors.carrot;
  ctx.save();
  ctx.translate(30, 33);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#438f49";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -20);
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, -17);
  ctx.moveTo(0, -10);
  ctx.lineTo(8, -17);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawRabbit(rabbit, selected) {
  const hop = Math.sin(rabbit.hop) * (rabbit.mood > 75 ? 4 : 2);

  ctx.save();
  ctx.translate(rabbit.x, rabbit.y + hop);

  ctx.fillStyle = "rgba(35, 50, 45, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 25 - hop, 30, 8, 0, 0, TAU);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = colors.gold;
    ctx.lineWidth = 4;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 8, 38, 42, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = rabbit.fur;
  ctx.beginPath();
  ctx.ellipse(0, 12, 27, 22, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-3, -12, 19, 0, TAU);
  ctx.fill();

  drawEar(-13, -31, -0.24, rabbit);
  drawEar(7, -33, 0.16, rabbit);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(22, 3, 8, 0, TAU);
  ctx.fill();

  ctx.fillStyle = rabbit.accent;
  ctx.beginPath();
  ctx.arc(6, -13, 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  if (rabbit.blink % 4.8 < 0.12) {
    ctx.fillRect(2, -14, 8, 1.8);
  } else {
    ctx.beginPath();
    ctx.arc(7, -15, 2.2, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = rabbit.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -9);
  ctx.quadraticCurveTo(-8, -5, -13, -8);
  ctx.moveTo(-3, -7);
  ctx.quadraticCurveTo(-8, -1, -15, 0);
  ctx.stroke();

  if (rabbit.danced || rabbit.mood > 78) {
    ctx.fillStyle = colors.gold;
    ctx.font = "18px ui-sans-serif, system-ui";
    ctx.fillText("♪", -34, -34 + Math.sin(state.tick * 5) * 3);
    ctx.fillText("♪", 26, -42 + Math.cos(state.tick * 4) * 3);
  }

  ctx.restore();
}

function drawEar(x, y, rotation, rabbit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = rabbit.fur;
  ctx.beginPath();
  ctx.ellipse(0, -11, 8, 24, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(216, 144, 145, 0.58)";
  ctx.beginPath();
  ctx.ellipse(0, -11, 4, 17, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawFloating() {
  ctx.save();
  ctx.font = "700 15px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  for (const item of state.floating) {
    ctx.globalAlpha = clamp(item.life, 0, 1);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.restore();
}

function drawPanel() {
  ctx.save();
  ctx.fillStyle = "#efe3cf";
  ctx.fillRect(FIELD_W, 0, W - FIELD_W, H);
  ctx.fillStyle = colors.panel;
  roundRect(ctx, PANEL_X, 24, PANEL_W, H - 48, 8);
  ctx.fill();
  ctx.strokeStyle = colors.panelLine;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawPanelHeader();
  drawStats();
  drawQuest();
  drawGMBox();
  drawButtons();
  ctx.restore();
}

function drawPanelHeader() {
  ctx.fillStyle = colors.ink;
  ctx.font = "800 24px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Bunny Meadow", PANEL_X + 18, 62);
  ctx.font = "600 12px ui-sans-serif, system-ui";
  ctx.fillStyle = colors.muted;
  ctx.fillText("prototipe cozy AI GM", PANEL_X + 20, 84);

  ctx.fillStyle = "#f7e7c4";
  roundRect(ctx, PANEL_X + 180, 47, 42, 28, 8);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.font = "700 13px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`D${state.day}`, PANEL_X + 201, 66);
}

function drawStats() {
  const rabbit = selectedRabbit();
  ctx.fillStyle = colors.ink;
  ctx.font = "800 18px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText(rabbit.name, PANEL_X + 18, 126);
  ctx.font = "600 12px ui-sans-serif, system-ui";
  ctx.fillStyle = nearSelectedRabbit() ? "#4d8551" : colors.blush;
  ctx.fillText(nearSelectedRabbit() ? "cukup dekat" : "dekati dulu", PANEL_X + 180, 126);

  meter("Mood", rabbit.mood, PANEL_X + 18, 148, "#e6b75f");
  meter("Trust", rabbit.trust, PANEL_X + 18, 184, "#6e95bc");
  meter("Hunger", 100 - rabbit.hunger, PANEL_X + 18, 220, "#74a967");

  ctx.fillStyle = "#fff3de";
  roundRect(ctx, PANEL_X + 18, 252, 224, 42, 8);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.font = "700 14px ui-sans-serif, system-ui";
  ctx.fillText(`Wortel ${state.inventory.carrot}`, PANEL_X + 34, 278);
  ctx.fillText(`Semanggi ${state.inventory.clover}`, PANEL_X + 134, 278);
}

function meter(label, value, x, y, color) {
  ctx.fillStyle = colors.muted;
  ctx.font = "600 12px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#e8dece";
  roundRect(ctx, x, y + 8, 224, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y + 8, 224 * clamp(value / 100, 0, 1), 10, 5);
  ctx.fill();
}

function drawQuest() {
  const y = 314;
  ctx.fillStyle = "#eef6df";
  roundRect(ctx, PANEL_X + 18, y, 224, 66, 8);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.font = "800 13px ui-sans-serif, system-ui";
  ctx.fillText("Quest", PANEL_X + 34, y + 23);
  ctx.font = "600 12px ui-sans-serif, system-ui";
  ctx.fillStyle = colors.muted;
  wrapText(state.quest.title, PANEL_X + 34, y + 42, 190, 14, 2);

  ctx.fillStyle = state.quest.complete ? "#4d8551" : colors.gold;
  ctx.font = "800 15px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`${state.quest.progress}/${state.quest.target}`, PANEL_X + 226, y + 24);
}

function drawGMBox() {
  const y = 396;
  ctx.fillStyle = "#f6efe4";
  roundRect(ctx, PANEL_X + 18, y, 224, 66, 8);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.font = "800 13px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("GM", PANEL_X + 34, y + 20);
  if (state.gm.roll) {
    ctx.fillStyle = colors.gold;
    ctx.textAlign = "right";
    ctx.fillText(`d20 ${state.gm.roll.total}`, PANEL_X + 226, y + 20);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = colors.muted;
  ctx.font = "600 11px ui-sans-serif, system-ui";
  wrapText(state.gm.line, PANEL_X + 34, y + 38, 192, 13, 2);
}

function drawButtons() {
  for (const button of actionButtons) {
    const disabled = button.id === "feed" && state.inventory.carrot <= 0;
    const active = state.hoveredButton === button.id;
    ctx.fillStyle = disabled ? "#ddd2c3" : active ? "#324441" : colors.ink;
    roundRect(ctx, button.x, button.y, button.w, button.h, 8);
    ctx.fill();

    ctx.fillStyle = disabled ? "#81776b" : "#fff8eb";
    ctx.font = "800 14px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(button.label, button.x + button.w / 2, button.y + 25);
    ctx.font = "700 10px ui-sans-serif, system-ui";
    ctx.fillStyle = disabled ? "#a1988d" : "#e8c56a";
    ctx.fillText(button.key, button.x + button.w - 17, button.y + 15);
  }
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText(`${line.replace(/[.,;:]?$/, "")}...`, x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
}

function roundRect(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + w - radius, y);
  context.quadraticCurveTo(x + w, y, x + w, y + radius);
  context.lineTo(x + w, y + h - radius);
  context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  context.lineTo(x + radius, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function renderGameToText() {
  const rabbit = selectedRabbit();
  return JSON.stringify({
    coordinate_system: "origin top-left; x right; y down; canvas 960x640; playfield x 0-660",
    mode: state.mode,
    woman: {
      name: state.woman.name,
      x: Math.round(state.woman.x),
      y: Math.round(state.woman.y),
      targetX: Math.round(state.woman.targetX),
      targetY: Math.round(state.woman.targetY),
    },
    selectedRabbit: rabbit.name,
    nearSelectedRabbit: nearSelectedRabbit(),
    rabbits: state.rabbits.map((item) => ({
      name: item.name,
      x: Math.round(item.x),
      y: Math.round(item.y),
      mood: Math.round(item.mood),
      trust: Math.round(item.trust),
      hunger: Math.round(item.hunger),
      danced: item.danced,
    })),
    inventory: state.inventory,
    quest: state.quest,
    gmLine: state.gm.line,
    availableActions: actionButtons.map((button) => button.id),
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(1 / 60);
  draw();
};
window.__bunnyMeadowDebug = {
  state,
  performAction,
  selectRabbit(index) {
    state.selectedRabbit = clamp(index, 0, state.rabbits.length - 1);
  },
  moveNearSelected() {
    const rabbit = selectedRabbit();
    state.woman.x = rabbit.x - 42;
    state.woman.y = rabbit.y + 12;
    state.woman.targetX = state.woman.x;
    state.woman.targetY = state.woman.y;
  },
};

if (params.has("autotest")) {
  window.__bunnyMeadowDebug.moveNearSelected();
  performAction("feed");
  performAction("play");
  for (let i = 0; i < 20; i += 1) update(1 / 60);
  document.body.setAttribute("data-game-state", renderGameToText());
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

draw();
requestAnimationFrame(loop);
