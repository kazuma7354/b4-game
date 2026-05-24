const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const titleScreen = document.getElementById("titleScreen");
const levelSelect = document.getElementById("levelSelect");
const gameOverScreen = document.getElementById("gameOverScreen");
const rankingScreen = document.getElementById("rankingScreen");
const finalMessage = document.getElementById("finalMessage");
const finalScore = document.getElementById("finalScore");
const playerNameInput = document.getElementById("playerName");
const rankingList = document.getElementById("rankingList");
const hudLevel = document.getElementById("hudLevel");
const hudHp = document.getElementById("hudHp");
const hudTime = document.getElementById("hudTime");
const hudScore = document.getElementById("hudScore");
const hudStatus = document.getElementById("hudStatus");

const startButton = document.getElementById("startButton");
const rankButton = document.getElementById("rankButton");
const backToTitle = document.getElementById("backToTitle");
const rankingBack = document.getElementById("rankingBack");
const retryButton = document.getElementById("retryButton");
const backTitleFromGameOver = document.getElementById("backTitleFromGameOver");
const saveScoreButton = document.getElementById("saveScore");

let currentState = "title";
let currentLevel = 1;
let rankingLevel = 1;
let keys = {};
let gameData = {
  player: { x: 320, y: 820, w: 32, h: 32, hp: 10, cooldown: 0, power: 1, invincible: 0 },
  bullets: [],
  enemyBullets: [],
  enemies: [],
  items: [],
  boss: null,
  coins: 0,
  kills: 0,
  strongKills: 0,
  bossTime: null,
  timeLeft: 60,
  score: 0,
};
let audioCtx;

const settings = {
  playerSpeed: 4.5,
  bulletSpeed: 4,
  enemySpeed: 2.3,
  enemyShotSpeed: 2.5,
  canvasWidth: 640,
  canvasHeight: 900,
  coinValue: 10,
};

const levelSettings = {
  1: { timeLimit: 60, enemyFrequency: 120, enemyTypes: ["weak"], dropCoinRate: 0.4, scoreName: "coins" },
  2: { timeLimit: 45, enemyFrequency: 110, enemyTypes: ["weak", "strong"], dropPowerRate: 0.25, scoreName: "kills" },
  3: { timeLimit: null, enemyFrequency: 100, enemyTypes: ["weak", "strong"], bossTriggerScore: 20, bossActive: false, scoreName: "bossTime" },
};

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration = 0.12, type = "sine", gain = 0.12) {
  initAudio();
  const osc = audioCtx.createOscillator();
  const vol = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol);
  vol.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function setState(newState) {
  currentState = newState;
  titleScreen.classList.toggle("hidden", newState !== "title");
  levelSelect.classList.toggle("hidden", newState !== "levelSelect");
  gameOverScreen.classList.toggle("hidden", newState !== "gameOver");
  rankingScreen.classList.toggle("hidden", newState !== "ranking");
  document.getElementById("hud").style.display = newState === "play" ? "grid" : "none";
}

function loadRanking() {
  // kept for compatibility: return ranking for current level
  return loadRankingForLevel(currentLevel || 1);
}

function saveRankingEntry(entry, level = currentLevel || 1) {
  const key = `space-training-ranking-${level}`;
  const raw = localStorage.getItem(key) || "[]";
  let ranking;
  try {
    ranking = JSON.parse(raw);
  } catch {
    ranking = [];
  }
  ranking.push(entry);
  ranking.sort((a, b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(ranking.slice(0, 8)));
}

function loadRankingForLevel(level = 1) {
  const key = `space-training-ranking-${level}`;
  const raw = localStorage.getItem(key) || "[]";
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function showRanking() {
  const list = loadRankingForLevel(rankingLevel);
  if (list.length) {
    rankingList.innerHTML = list.map(item => `<li>${item.name} - ${item.score}</li>`).join("");
  } else {
    rankingList.innerHTML = "<li>まだスコアがありません</li>";
  }
  // Update active tab button
  document.querySelectorAll(".ranking-tab-button").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.level) === rankingLevel);
  });
}

function startLevel(level) {
  currentLevel = level;
  // reset per-level runtime flags so repeated plays behave correctly
  if (levelSettings[level]) levelSettings[level].bossActive = false;
  gameData = {
    frame: 0,
    startTime: performance.now(),
    player: { x: 320, y: 820, w: 32, h: 32, hp: 5, cooldown: 0, power: 1 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    items: [],
    score: 0,
    coins: 0,
    kills: 0,
    strongKills: 0,
    bossTime: null,
    bossStart: null,
    timeLeft: levelSettings[level].timeLimit,
    gameOver: false,
    boss: null,
  };
  setState("play");
  playTone(190, 0.18, "triangle", 0.16);
}

function addEnemy(type) {
  const x = Math.random() * (settings.canvasWidth - 60) + 30;
  const y = -40;
  const base = { x, y, w: 40, h: 40, type, cooldown: 0, hp: type === "strong" ? 4 : 1, speed: type === "strong" ? 1.3 : 2.3 };
  gameData.enemies.push(base);
}

function spawnEnemy() {
  const config = levelSettings[currentLevel];
  if (currentLevel === 3 && !config.bossActive && gameData.kills >= config.bossTriggerScore) {
    spawnBoss();
    config.bossActive = true;
    return;
  }
  const type = config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];
  addEnemy(type);
}

function spawnBoss() {
  gameData.boss = {
    x: 320,
    y: -120,
    w: 120,
    h: 120,
    hp: 15,
    phase: 0,
    cooldown: 0,
    time: 0,
  };
  gameData.bossStart = performance.now();
  playTone(80, 0.4, "sawtooth", 0.2);
}

function spawnItem(x, y, type) {
  gameData.items.push({ x, y, w: 16, h: 16, type, vy: 2.2 });
}

function rectCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer() {
  const p = gameData.player;
  if (keys.ArrowLeft || keys.a) p.x -= settings.playerSpeed;
  if (keys.ArrowRight || keys.d) p.x += settings.playerSpeed;
  if (keys.ArrowUp || keys.w) p.y -= settings.playerSpeed;
  if (keys.ArrowDown || keys.s) p.y += settings.playerSpeed;
  p.x = Math.max(10, Math.min(settings.canvasWidth - p.w - 10, p.x));
  p.y = Math.max(10, Math.min(settings.canvasHeight - p.h - 10, p.y));
  if (keys.z && p.cooldown <= 0) {
    firePlayerBullet();
    p.cooldown = Math.max(12, 25 - p.power * 2);
  }
  p.cooldown -= 1;
}

function firePlayerBullet() {
  gameData.bullets.push({ x: gameData.player.x + 14, y: gameData.player.y - 10, w: 8, h: 16, vy: -settings.bulletSpeed, power: 1 });
  if (gameData.player.power > 1) {
    gameData.bullets.push({ x: gameData.player.x + 22, y: gameData.player.y - 10, w: 8, h: 16, vy: -settings.bulletSpeed, power: 1 });
  }
  playTone(520, 0.08, "square", 0.08);
}

function updateBullets() {
  gameData.bullets.forEach(b => b.y += b.vy);
  gameData.enemyBullets.forEach(b => b.y += b.vy);
  gameData.bullets = gameData.bullets.filter(b => b.y > -20);
  gameData.enemyBullets = gameData.enemyBullets.filter(b => b.y < settings.canvasHeight + 20);
}

function updateEnemies() {
  gameData.enemies.forEach(enemy => {
    enemy.y += enemy.speed;
    enemy.cooldown -= 1;
    if (enemy.type === "strong") {
      enemy.x += Math.sin((gameData.frame + enemy.y) * 0.02) * 1.8;
    }
    if (enemy.cooldown <= 0) {
      enemy.cooldown = enemy.type === "strong" ? 90 : 130;
      // only fire while enemy is visible on screen (avoid firing after passing bottom)
      if (enemy.y > 20 && enemy.y < settings.canvasHeight - 10) fireEnemyBullet(enemy, { aim: false });
    }
  });
  // remove enemies that passed below the visible area so they cannot fire or interact
  gameData.enemies = gameData.enemies.filter(e => e.y < settings.canvasHeight && e.hp > 0);
}

function fireEnemyBullet(enemy) {
  // legacy single-arg; keep compatibility by delegating
  return fireEnemyBullet(enemy, { aim: true });
}

// fireEnemyBullet supports an options object: { aim: boolean }
function fireEnemyBullet(enemy, opts = { aim: false }) {
  const aim = !!opts.aim;
  const startX = enemy.x + enemy.w / 2 - 6;
  const startY = enemy.y + enemy.h / 2;
  if (aim) {
    const dx = gameData.player.x + gameData.player.w / 2 - (enemy.x + enemy.w / 2);
    const dy = gameData.player.y - (enemy.y + enemy.h / 2);
    const dist = Math.max(1, Math.hypot(dx, dy));
    gameData.enemyBullets.push({ x: startX, y: startY, w: 12, h: 18, vy: (dy / dist) * settings.enemyShotSpeed, vx: (dx / dist) * 2.4 });
  } else {
    // straight down shot (no homing)
    gameData.enemyBullets.push({ x: startX, y: startY, w: 12, h: 18, vy: settings.enemyShotSpeed, vx: 0 });
  }
}

function updateEnemyBullets() {
  gameData.enemyBullets.forEach(b => {
    b.y += b.vy;
    b.x += b.vx || 0;
  });
}

function updateItems() {
  gameData.items.forEach(item => item.y += item.vy);
  gameData.items = gameData.items.filter(item => item.y < settings.canvasHeight + 30);
}

function updateBoss() {
  const boss = gameData.boss;
  if (!boss) return;
  if (boss.y < 140) boss.y += 2.2;
  boss.cooldown -= 1;
  boss.time += 1;
  if (boss.cooldown <= 0) {
    boss.cooldown = 50;
    if (boss.phase % 2 === 0) {
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI * 0.8 * (i / 4) + boss.time * 0.04;
        gameData.enemyBullets.push({ x: boss.x + boss.w / 2 - 7, y: boss.y + boss.h / 2, w: 14, h: 14, vx: Math.cos(angle) * 3.4, vy: Math.sin(angle) * 3.4 });
      }
    } else {
      fireEnemyBullet({ x: boss.x + boss.w / 2 - 6, y: boss.y + boss.h / 2, w: boss.w, h: boss.h });
    }
    boss.phase += 1;
  }
  if (boss.phase % 2 === 0) boss.x += Math.sin(gameData.frame * 0.02) * 2.2;
  if (boss.x < 10) boss.x = 10;
  if (boss.x > settings.canvasWidth - boss.w - 10) boss.x = settings.canvasWidth - boss.w - 10;
}

function updateCollisions() {
  const player = gameData.player;
  gameData.bullets.forEach(bullet => {
    if (gameData.boss && rectCollision(bullet, gameData.boss)) {
      gameData.boss.hp -= bullet.power;
      bullet.y = -100;
      playTone(280, 0.06, "square", 0.08);
      if (gameData.boss.hp <= 0) {
        onBossDefeated();
      }
    }
    gameData.enemies.forEach(enemy => {
      if (rectCollision(bullet, enemy)) {
        enemy.hp -= bullet.power;
        bullet.y = -100;
        if (enemy.hp <= 0) {
          onEnemyDestroyed(enemy);
        }
      }
    });
  });
  gameData.enemyBullets.forEach(bullet => {
    if (rectCollision(bullet, player) && !player.invincible) {
      player.hp -= 1;
      player.invincible = 20;
      bullet.y = settings.canvasHeight + 30;
      playTone(90, 0.15, "square", 0.16);
    }
  });
  if (player.invincible > 0) player.invincible -= 1;
  gameData.items.forEach((item, idx) => {
    if (rectCollision(item, player)) {
      if (item.type === "coin") {
        gameData.coins += 1;
        playTone(660, 0.12, "triangle", 0.1);
      } else if (item.type === "power") {
        gameData.player.power = Math.min(4, gameData.player.power + 1);
        playTone(320, 0.16, "sine", 0.12);
      }
      gameData.items.splice(idx, 1);
    }
  });
}

function onEnemyDestroyed(enemy) {
  gameData.kills += 1;
  if (enemy.type === "strong") gameData.strongKills += 1;
  if (Math.random() < levelSettings[currentLevel].dropCoinRate) spawnItem(enemy.x + 12, enemy.y + 12, "coin");
  if (currentLevel === 2 && Math.random() < levelSettings[2].dropPowerRate) spawnItem(enemy.x + 12, enemy.y + 12, "power");
  playTone(180, 0.16, "triangle", 0.16);
}

function onBossDefeated() {
  const now = performance.now();
  gameData.bossTime = (now - gameData.bossStart) / 1000;
  gameData.boss = null;
  gameData.gameOver = true;
  playTone(120, 0.5, "sawtooth", 0.2);
}

function updateGame() {
  if (currentState !== "play") return;
  const config = levelSettings[currentLevel];
  gameData.frame += 1;
  updatePlayer();
  updateBullets();
  updateEnemyBullets();
  updateEnemies();
  updateItems();
  updateBoss();
  updateCollisions();

  if (config.timeLimit !== null) {
    const elapsedSeconds = Math.floor((performance.now() - gameData.startTime) / 1000);
    gameData.timeLeft = Math.max(0, config.timeLimit - elapsedSeconds);
    if (gameData.timeLeft <= 0) gameData.gameOver = true;
  }

  if (gameData.player.hp <= 0) gameData.gameOver = true;
  if (!gameData.boss && currentLevel === 3 && config.bossActive && gameData.kills >= config.bossTriggerScore && !gameData.gameOver) {
    // boss defeated handled in onBossDefeated
  }
  if (gameData.frame % config.enemyFrequency === 0 && !gameData.boss) {
    spawnEnemy();
  }

  if (gameData.gameOver) {
    showGameOver();
  }
}

function showGameOver() {
  setState("gameOver");
  let score = 0;
  if (currentLevel === 1) score = gameData.coins * settings.coinValue + gameData.kills * 8;
  if (currentLevel === 2) score = gameData.kills * 12 + gameData.strongKills * 15;
  if (currentLevel === 3) score = gameData.bossTime ? Math.max(0, 200 - Math.floor(gameData.bossTime * 8)) : (gameData.kills * 10 + (gameData.coins || 0) * settings.coinValue);
  score = Math.max(score, 0);
  gameData.score = score;
  finalScore.textContent = `スコア: ${score}`;
  // Level-specific result messages
  if (currentLevel === 3 && gameData.bossTime) {
    finalMessage.textContent = `ボス撃破タイム: ${gameData.bossTime.toFixed(2)} 秒`;
  } else if (currentLevel === 1) {
    finalMessage.textContent = `撃墜数: ${gameData.kills} / コイン: ${gameData.coins}`;
  } else if (currentLevel === 2) {
    finalMessage.textContent = `撃墜数: ${gameData.kills} （強敵: ${gameData.strongKills}）`;
  } else {
    finalMessage.textContent = `撃墜数: ${gameData.kills} / コイン: ${gameData.coins}`;
  }
}

function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#5fd6ff";
  drawRoundRect(gameData.player.x, gameData.player.y, gameData.player.w, gameData.player.h, 8);
  if (gameData.player.invincible > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(gameData.player.x - 2, gameData.player.y - 2, gameData.player.w + 4, gameData.player.h + 4);
  }

  gameData.bullets.forEach(b => {
    ctx.fillStyle = "#ffff66";
    drawRoundRect(b.x, b.y, b.w, b.h, 4);
  });
  gameData.enemyBullets.forEach(b => {
    ctx.fillStyle = "#ff6a6a";
    drawRoundRect(b.x, b.y, b.w, b.h, 4);
  });
  gameData.enemies.forEach(enemy => {
    ctx.fillStyle = enemy.type === "strong" ? "#ff7f3f" : "#a0d8ff";
    drawRoundRect(enemy.x, enemy.y, enemy.w, enemy.h, 8);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(enemy.x, enemy.y - 6, enemy.w * (enemy.hp / (enemy.type === "strong" ? 4 : 1)), 4);
  });
  if (gameData.boss) {
    ctx.fillStyle = "#ff3fe8";
    drawRoundRect(gameData.boss.x, gameData.boss.y, gameData.boss.w, gameData.boss.h, 16);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(100, 30, 440 * (gameData.boss.hp / 15), 16);
  }
  gameData.items.forEach(item => {
    ctx.fillStyle = item.type === "coin" ? "#ffd44d" : "#a2ff80";
    ctx.beginPath();
    ctx.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateHud() {
  hudLevel.textContent = `LEVEL ${currentLevel}`;
  hudHp.textContent = `HP: ${gameData.player.hp}`;
  hudTime.textContent = levelSettings[currentLevel].timeLimit !== null ? `TIME: ${gameData.timeLeft}` : `TIME: ---`;
  const currentScore = currentLevel === 1 ? gameData.coins * settings.coinValue + gameData.kills * 8 : currentLevel === 2 ? gameData.kills * 12 + gameData.strongKills * 15 : gameData.bossTime ? Math.max(0, 200 - Math.floor(gameData.bossTime * 8)) : 0;
  hudScore.textContent = `SCORE: ${currentScore}`;
  hudStatus.textContent = currentLevel === 3 ? "ボス戦: 弾を避けて攻撃パターンを読む" : "通常ステージ: 弾をよけて敵を倒す";
}

function gameLoop() {
  updateGame();
  render();
  updateHud();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Enter" && currentState === "title") {
    setState("levelSelect");
  }
});
window.addEventListener("keyup", e => keys[e.key] = false);

startButton.addEventListener("click", () => setState("levelSelect"));
rankButton.addEventListener("click", () => { 
  rankingLevel = currentLevel || 1;
  showRanking(); 
  setState("ranking"); 
});
rankingBack.addEventListener("click", () => setState("title"));
backToTitle.addEventListener("click", () => setState("title"));
retryButton.addEventListener("click", () => startLevel(currentLevel));
backTitleFromGameOver.addEventListener("click", () => setState("title"));
saveScoreButton.addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "PLAYER";
  saveRankingEntry({ name, score: gameData.score }, currentLevel);
  playerNameInput.value = "";
  showRanking();
  setState("ranking");
});

document.querySelectorAll(".levelButton").forEach(button => {
  button.addEventListener("click", () => {
    const level = Number(button.dataset.level);
    startLevel(level);
  });
});

document.querySelectorAll(".ranking-tab-button").forEach(button => {
  button.addEventListener("click", () => {
    rankingLevel = Number(button.dataset.level);
    showRanking();
  });
});

showRanking();
setState("title");
requestAnimationFrame(gameLoop);
