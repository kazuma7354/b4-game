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
const accessLogList = document.getElementById("accessLogList");

let currentState = "title";
let currentLevel = 1;
let rankingLevel = 1;
let keys = {};
let gameData = {
  player: { x: 320, y: 820, w: 32, h: 32, hp: 10, cooldown: 0, power: 1, invincible: 0, speed: 1, shield: 0, fireRate: 1 },
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
  elapsed: 0,
  enemySpawnTimer: 120,
  score: 0,
};
let audioCtx;

/*プレイヤー画像*/
const playerImg = new Image();
playerImg.src = "player.png";

/*敵用画像（複数枚ランダム表示）*/
const enemyImgs = [
  { src: "enemy1.png", img: new Image() },
  { src: "enemy2.png", img: new Image() },
  { src: "enemy3.png", img: new Image() },
  { src: "enemy4.png", img: new Image() }
];
enemyImgs.forEach(e => e.img.src = e.src);

/*ボス画像*/
const bossImg = new Image();
bossImg.src = "boss.png";

/*コイン・弾・敵弾画像*/
const coinImg = new Image();
coinImg.src = "coin.png";

const bulletImg = new Image();
bulletImg.src = "bullet.png";

const enemyBulletImg = new Image();
enemyBulletImg.src = "enemy_bullet.png";

/*効果音*/
const soundDestroy = new Audio("destroy.mp3");
const soundShoot = new Audio("shoot.mp3");
const soundHit = new Audio("hit.mp3");
const soundCoin = new Audio("coin.mp3");

// 効果音のボリューム調整
soundDestroy.volume = 0.3;
soundShoot.volume = 0.2;
soundHit.volume = 0.3;
soundCoin.volume = 0.3;

const BASE_FPS = 60;

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
  2: { timeLimit: 45, enemyFrequency: 120, enemyTypes: ["weak", "strong"], dropCoinRate: 0, dropPowerRate: 0.25, scoreName: "kills" },
  3: { timeLimit: null, enemyFrequency: 110, enemyTypes: ["weak", "strong"], bossTriggerScore: 15, bossActive: false, dropCoinRate: 0, scoreName: "bossTime" },
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
  
  // タイトル画面に遷移する時にトップスコアを更新
  if (newState === "title") {
    displayTopScoresOnTitle();
  }
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
  
  // アクセスログを記録
  logGameSession(entry, level);
}

// アクセスログを記録する関数
function logGameSession(entry, level) {
  const logKey = "space-training-access-log";
  const raw = localStorage.getItem(logKey) || "[]";
  let logs;
  try {
    logs = JSON.parse(raw);
  } catch {
    logs = [];
  }
  
  logs.push({
    name: entry.name,
    level: level,
    score: entry.score,
    timestamp: new Date().toISOString()
  });
  
  // 最新100件を保持
  localStorage.setItem(logKey, JSON.stringify(logs.slice(-100)));
}

// 全レベルのトップスコアを取得する関数
function getGlobalTopScores() {
  const topScores = {};
  
  for (let level = 1; level <= 3; level++) {
    const ranking = loadRankingForLevel(level);
    if (ranking.length > 0) {
      const topEntry = ranking[0];
      topScores[level] = {
        name: topEntry.name,
        score: topEntry.score
      };
    } else {
      topScores[level] = null;
    }
  }
  
  return topScores;
}

// タイトル画面にトップスコアを表示する関数
function displayTopScoresOnTitle() {
  const topScores = getGlobalTopScores();
  const titleScreen = document.getElementById("titleScreen");
  
  // 既存のトップスコア表示を削除
  const existingTopScores = titleScreen.querySelector(".top-scores");
  if (existingTopScores) {
    existingTopScores.remove();
  }
  
  // トップスコア表示エリアを作成
  const topScoresHtml = document.createElement("div");
  topScoresHtml.className = "top-scores";
  topScoresHtml.innerHTML = "<h3>🏆 トップスコア 🏆</h3>";
  
  for (let level = 1; level <= 3; level++) {
    if (topScores[level]) {
      topScoresHtml.innerHTML += `<p>レベル ${level}: <strong>${topScores[level].name}</strong> - ${topScores[level].score}点</p>`;
    } else {
      topScoresHtml.innerHTML += `<p>レベル ${level}: まだスコアがありません</p>`;
    }
  }
  
  // タイトル画面の最後に追加
  titleScreen.appendChild(topScoresHtml);
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
  showAccessLog();
  // Update active tab button
  document.querySelectorAll(".ranking-tab-button").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.level) === rankingLevel);
  });
}

function loadAccessLog() {
  const raw = localStorage.getItem("space-training-access-log") || "[]";
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function formatLogTimestamp(timestamp) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function showAccessLog() {
  const logs = loadAccessLog();
  if (logs.length) {
    accessLogList.innerHTML = logs.slice().reverse().map(log => {
      const time = formatLogTimestamp(log.timestamp);
      return `<li>${time} — L${log.level} ${log.name} - ${log.score} 点</li>`;
    }).join("");
  } else {
    accessLogList.innerHTML = "<li>まだプレイ履歴がありません</li>";
  }
}

function startLevel(level) {
  currentLevel = level;
  // reset per-level runtime flags so repeated plays behave correctly
  if (levelSettings[level]) levelSettings[level].bossActive = false;
  let enemySpawnTimer = levelSettings[level].enemyFrequency;
  let initialEnemy = null;
  if (level === 1) {
    enemySpawnTimer = BASE_FPS * 3; // ステージ1開始後3秒だけ空白時間
  }
  if (level === 2) {
    enemySpawnTimer = BASE_FPS * 5; // 最初の強敵1体が出現してから5秒後に次の出現
    initialEnemy = "strong";
  }

  gameData = {
    frame: 0,
    elapsed: 0,
    startTime: performance.now(),
    enemySpawnTimer,
    player: { x: 320, y: 820, w: 32, h: 32, hp: 10, cooldown: 0, power: 1, invincible: 0, speed: 1, shield: 0, fireRate: 1 },
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
  if (initialEnemy) addEnemy(initialEnemy);
  setState("play");
  playTone(190, 0.18, "triangle", 0.16);
}

function addEnemy(type) {
  const x = Math.random() * (settings.canvasWidth - 60) + 30;
  const y = -40;
  
  // サイズと画像インデックスを決定
  let size = 40;
  let imgIndex = Math.floor(Math.random() * enemyImgs.length);  // ランダムに画像選択
  
  const base = { 
    x, y, 
    w: size,
    h: size, 
    type, 
    cooldown: 0, 
    hp: type === "strong" ? 4 : 1, 
    speed: type === "strong" ? 1.3 : 2.3,
    imgIndex: imgIndex  // 画像インデックスを保持
  };
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
  const bossSize = 100;
  gameData.boss = {
    x: 320,
    y: -120,

    w: 100,
    h: 100,
    hp: 25,
    maxHp: 25,

    phase: 0,
    cooldown: 0,
    time: 0,
    vx: 0,
    vy: 0,
  };
  gameData.bossStart = performance.now();
  playTone(80, 0.4, "sawtooth", 0.2);
}

function spawnItem(x, y, type) {
  gameData.items.push({ x, y, w: 24, h: 24, type, vy: 2.2 });  // 16x16 から 24x24 に変更
}

function rectCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer(frameDelta) {
  const p = gameData.player;
  if (keys.ArrowLeft || keys.a) p.x -= settings.playerSpeed * p.speed * frameDelta;
  if (keys.ArrowRight || keys.d) p.x += settings.playerSpeed * p.speed * frameDelta;
  if (keys.ArrowUp || keys.w) p.y -= settings.playerSpeed * p.speed * frameDelta;
  if (keys.ArrowDown || keys.s) p.y += settings.playerSpeed * p.speed * frameDelta;
  p.x = Math.max(10, Math.min(settings.canvasWidth - p.w - 10, p.x));
  p.y = Math.max(10, Math.min(settings.canvasHeight - p.h - 10, p.y));
  if (keys.z && p.cooldown <= 0) {
    firePlayerBullet();
    p.cooldown = Math.max(20, 34 - p.power * 2 - p.fireRate * 4);
  }
  p.cooldown -= frameDelta;
}

function firePlayerBullet() {
  gameData.bullets.push({ x: gameData.player.x + 14, y: gameData.player.y - 10, w: 8, h: 16, vy: -settings.bulletSpeed, power: 1 });
  if (gameData.player.power > 1) {
    gameData.bullets.push({ x: gameData.player.x + 22, y: gameData.player.y - 10, w: 8, h: 16, vy: -settings.bulletSpeed, power: 1 });
  }
  // MP3音声を再生
  soundShoot.currentTime = 0;
  soundShoot.play().catch(e => console.log("Shoot sound error:", e));
}

function updateBullets(frameDelta) {
  gameData.bullets.forEach(b => b.y += b.vy * frameDelta);
  gameData.enemyBullets.forEach(b => b.y += b.vy * frameDelta);
  gameData.bullets = gameData.bullets.filter(b => b.y > -20);
  gameData.enemyBullets = gameData.enemyBullets.filter(b => b.y < settings.canvasHeight + 20);
}

function updateEnemies(frameDelta) {
  gameData.enemies.forEach(enemy => {
    enemy.y += enemy.speed * frameDelta;
    enemy.cooldown -= frameDelta;
    if (enemy.type === "strong") {
      enemy.x += Math.sin((gameData.frame + enemy.y) * 0.02) * 1.8 * frameDelta;
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

function updateEnemyBullets(frameDelta) {
  gameData.enemyBullets.forEach(b => {
    // Update homing bullets
    if (b.homingActive && b.homingTime < b.homingDuration) {
      const dx = gameData.player.x + gameData.player.w / 2 - b.x;
      const dy = gameData.player.y + gameData.player.h / 2 - b.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      b.vx = (dx / dist) * speed * 0.95 + b.vx * 0.05;
      b.vy = (dy / dist) * speed * 0.95 + b.vy * 0.05;
      b.homingTime += frameDelta;
    }
    b.y += b.vy * frameDelta;
    b.x += (b.vx || 0) * frameDelta;
  });
}

function updateItems(frameDelta) {
  gameData.items.forEach(item => item.y += item.vy * frameDelta);
  gameData.items = gameData.items.filter(item => item.y < settings.canvasHeight + 30);
}

function updateBoss(frameDelta) {
  const boss = gameData.boss;
  if (!boss) return;
  if (boss.y < 140) boss.y += 2.5 * frameDelta;
  boss.cooldown -= frameDelta;
  boss.time += frameDelta;
  
  // Complex movement pattern: horizontal movement + approach to player
  const playerCenterX = gameData.player.x + gameData.player.w / 2;
  const bossCenterX = boss.x + boss.w / 2;
  const distToPlayer = playerCenterX - bossCenterX;
  
  // Horizontal sine wave movement
  boss.x += Math.sin(gameData.elapsed * 0.9) * 2.5 * frameDelta;
  
  // Approach movement: gradually move towards or away from player
  if (boss.time % 120 < 60) {
    // Move towards player
    boss.x += Math.sign(distToPlayer) * 1.2 * frameDelta;
  } else {
    // Move away from player
    boss.x -= Math.sign(distToPlayer) * 0.8 * frameDelta;
  }
  
  boss.x = Math.max(50, Math.min(settings.canvasWidth - boss.w - 50, boss.x));
  
  if (boss.cooldown <= 0) {
    boss.cooldown = 45;
    const attackType = Math.floor((boss.time / 45) % 4);
    
    if (attackType === 0) {
      // Attack type 0: Radial spread aimed at the player
      const dx = gameData.player.x + gameData.player.w / 2 - (boss.x + boss.w / 2);
      const dy = gameData.player.y + gameData.player.h / 2 - (boss.y + boss.h / 2);
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < 7; i++) {
        const spread = (i - 3) * 0.22;
        const angle = baseAngle + spread;
        const speed = 3.8;
        gameData.enemyBullets.push({ 
          x: boss.x + boss.w / 2 - 14, 
          y: boss.y + boss.h / 2, 
          w: 28, 
          h: 28, 
          vx: Math.cos(angle) * speed, 
          vy: Math.sin(angle) * speed,
          homingTime: 0,
          homingActive: false
        });
      }
    } else if (attackType === 1) {
      // Attack type 1: Stronger homing bullets
      const dx = gameData.player.x + gameData.player.w / 2 - (boss.x + boss.w / 2);
      const dy = gameData.player.y + gameData.player.h / 2 - (boss.y + boss.h / 2);
      const dist = Math.max(1, Math.hypot(dx, dy));
      for (let i = 0; i < 4; i++) {
        const angle = (i - 1.5) * 0.25;
        const speed = 3.5;
        const vx = (dx / dist) * speed + Math.cos(angle) * 1.5;
        const vy = (dy / dist) * speed + Math.sin(angle) * 1.5;
        gameData.enemyBullets.push({ 
          x: boss.x + boss.w / 2 - 12, 
          y: boss.y + boss.h / 2, 
          w: 24, 
          h: 24, 
          vx: vx, 
          vy: vy,
          homingTime: 0,
          homingActive: true,
          homingDuration: 120
        });
      }
    } else if (attackType === 2) {
      // Attack type 2: Straight down shots with wider spread
      for (let i = 0; i < 5; i++) {
        const offsetX = (i - 2) * 2.0;
        gameData.enemyBullets.push({ 
          x: boss.x + boss.w / 2 - 12 + offsetX, 
          y: boss.y + boss.h / 2, 
          w: 24, 
          h: 24, 
          vx: 0, 
          vy: 4.2,
          homingTime: 0,
          homingActive: false
        });
      }
    } else {
      // Attack type 3: Multiple aimed tracking shots
      for (let i = 0; i < 3; i++) {
        fireEnemyBullet({ x: boss.x + boss.w / 2 - 6 + (i - 1) * 10, y: boss.y + boss.h / 2, w: boss.w, h: boss.h }, { aim: true });
      }
    }
    boss.phase += 1;
  }
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
    if (rectCollision(bullet, player)) {
      if (player.shield > 0) {
        player.shield -= 1;
        bullet.y = settings.canvasHeight + 30;
        playTone(150, 0.1, "square", 0.12);
      } else if (!player.invincible) {
        player.hp -= 1;
        player.invincible = 20;
        bullet.y = settings.canvasHeight + 30;
        playTone(90, 0.15, "square", 0.16);
      }
    }
    // Homing bullets heal boss on hit
    if (gameData.boss && bullet.homingActive && rectCollision(bullet, gameData.boss)) {
      gameData.boss.hp += 1;
      bullet.y = settings.canvasHeight + 30;
      // MP3音声を再生
      soundHit.currentTime = 0;
      soundHit.play().catch(e => console.log("Hit sound error:", e));
    }
  });
  if (player.invincible > 0) player.invincible = Math.max(0, player.invincible - (gameData.lastFrameDelta || 0));
  gameData.items = gameData.items.filter((item, idx) => {
    if (rectCollision(item, player)) {
      if (item.type === "coin") {
        gameData.coins += 1;
        // コイン取得音を再生
        soundCoin.currentTime = 0;
        soundCoin.play().catch(e => console.log("Coin sound error:", e));
        gameData.score += settings.coinValue;
      } else if (item.type === "power") {
        gameData.player.power = Math.min(4, gameData.player.power + 1);
        gameData.score += 15;
        playTone(320, 0.16, "sine", 0.12);
      } else if (item.type === "speed") {
        gameData.player.speed = Math.min(1.6, gameData.player.speed + 0.2);
        gameData.score += 20;
        playTone(440, 0.16, "sine", 0.12);
      } else if (item.type === "shield") {
        gameData.player.shield = Math.min(2, gameData.player.shield + 1);
        gameData.score += 25;
        playTone(550, 0.16, "sine", 0.12);
      } else if (item.type === "heal") {
        gameData.player.hp = Math.min(gameData.player.hp + 2, 10);
        gameData.score += 30;
        playTone(380, 0.16, "sine", 0.12);
      } else if (item.type === "fireRate") {
        gameData.player.fireRate = Math.min(3, gameData.player.fireRate + 0.5);
        gameData.score += 20;
        playTone(600, 0.16, "sine", 0.12);
      }
      return false; // アイテムを削除
    }
    return true; // アイテムを保持
  });
}

function onEnemyDestroyed(enemy) {
  gameData.kills += 1;
  if (enemy.type === "strong") gameData.strongKills += 1;

  // MP3音声を再生
  soundDestroy.currentTime = 0;
  soundDestroy.play().catch(e => console.log("Destroy sound error:", e));
  
  // Always add base score
  gameData.score += enemy.type === "strong" ? 25 : 10;
  
  // Drop coin items in all levels
  if (Math.random() < levelSettings[currentLevel].dropCoinRate) {
    spawnItem(enemy.x + 12, enemy.y + 12, "coin");
  }
  
  // アイテムは強敵討伐のメリットのみ
  if (enemy.type === "strong") {
    if ((currentLevel === 2 || currentLevel === 3) && Math.random() < levelSettings[2].dropPowerRate) {
      spawnItem(enemy.x + 12, enemy.y + 12, "power");
    }
    if (currentLevel === 2 || currentLevel === 3) {
      const rand = Math.random();
      if (rand < 0.12) spawnItem(enemy.x + 12, enemy.y + 12, "speed");
      else if (rand < 0.24) spawnItem(enemy.x + 12, enemy.y + 12, "shield");
      else if (rand < 0.34) spawnItem(enemy.x + 12, enemy.y + 12, "heal");
      else if (rand < 0.44) spawnItem(enemy.x + 12, enemy.y + 12, "fireRate");
    }
  }
}

function onBossDefeated() {
  const now = performance.now();
  gameData.bossTime = (now - gameData.bossStart) / 1000;
  gameData.boss = null;
  gameData.bossStart = null;
  gameData.gameOver = true;
  playTone(120, 0.5, "sawtooth", 0.2);
}

function updateGame() {
  if (currentState !== "play") return;
  const config = levelSettings[currentLevel];
  const now = performance.now();
  const dt = Math.min(0.1, (now - (gameData.lastTimestamp || now)) / 1000);
  gameData.lastTimestamp = now;
  const frameDelta = dt * BASE_FPS;
  gameData.lastFrameDelta = frameDelta;
  gameData.frame += frameDelta;
  gameData.elapsed += dt;

  updatePlayer(frameDelta);
  updateBullets(frameDelta);
  updateEnemyBullets(frameDelta);
  updateEnemies(frameDelta);
  updateItems(frameDelta);
  updateBoss(frameDelta);
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

  if (!gameData.boss) {
    gameData.enemySpawnTimer -= frameDelta;
    while (gameData.enemySpawnTimer <= 0) {
      spawnEnemy();
      gameData.enemySpawnTimer += config.enemyFrequency;
    }
  }

  if (gameData.gameOver) {
    showGameOver();
  }
}

function showGameOver() {
  setState("gameOver");
  // Score is now accumulated during gameplay (addition based)
  let finalScoreValue = gameData.score;
  
  // ステージ3の場合、ボス撃破タイムから減点形式でスコア算出
  if (currentLevel === 3) {
    if (gameData.bossTime) {
      const baseBossScore = 2000;
      const timePenalty = Math.round(gameData.bossTime * 30);
      finalScoreValue = Math.max(100, baseBossScore - timePenalty);
    } else {
      finalScoreValue = 0;
    }
  }
  
  // Ensure score never becomes negative
  finalScoreValue = Math.max(finalScoreValue, 0);
  gameData.score = finalScoreValue;
  
  finalScore.textContent = `スコア: ${finalScoreValue}`;
  
  // Level-specific result messages
  if (currentLevel === 3) {
    if (gameData.bossTime) {
      finalMessage.textContent = `ボス撃破タイム: ${gameData.bossTime.toFixed(2)} 秒`;
    } else {
      finalMessage.textContent = `ボス未討伐`;
    }
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);    /*背景クリア*/
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (playerImg.complete && playerImg.naturalWidth > 0) {    /*プレイヤー描画*/
    // 無敵時間中は点滅
    if (gameData.player.invincible > 0) {
      const alpha = Math.floor(gameData.player.invincible / 4) % 2 === 0 ? 1.0 : 0.8;
      ctx.globalAlpha = alpha;
    }
    
    ctx.drawImage(playerImg, gameData.player.x, gameData.player.y, 32, 32);
    ctx.globalAlpha = 1.0;  // リセット重要！
    
    // プレイヤーのHP バー表示（敵と同じ形式）
    ctx.fillStyle = "rgba(255,100,100,0.9)";
    const playerHpMax = 10;
    ctx.fillRect(gameData.player.x, gameData.player.y + 35, gameData.player.w * (gameData.player.hp / playerHpMax), 4);
  }
  if (gameData.player.shield > 0) {
    ctx.strokeStyle = "rgba(100,200,255,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < gameData.player.shield; i++) {
      ctx.strokeRect(gameData.player.x - 8 - i * 4, gameData.player.y - 8 - i * 4, gameData.player.w + 16 + i * 8, gameData.player.h + 16 + i * 8);
    }
  }

  gameData.bullets.forEach(b => {    /*プレイヤーの弾描画*/
    if (bulletImg.complete && bulletImg.naturalWidth > 0) {
      ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h);
    } else {
      // 画像がない場合は代替表示（黄色三角形）
      ctx.fillStyle = "#ffff66";
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(b.x, b.y + b.h);
      ctx.closePath();
      ctx.fill();
    }
  });
  
  gameData.enemyBullets.forEach(b => {
    if (enemyBulletImg.complete && enemyBulletImg.naturalWidth > 0) {
      ctx.drawImage(enemyBulletImg, b.x, b.y, b.w, b.h);
    } else {
      // 画像がない場合は代替表示（赤い円）
      ctx.fillStyle = "#ff6a6a";
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  gameData.enemies.forEach(enemy => {    /*敵描画*/
    // 画像がある場合は画像で描画
    if (enemyImgs[enemy.imgIndex] && enemyImgs[enemy.imgIndex].img.complete && enemyImgs[enemy.imgIndex].img.naturalWidth > 0) {
      ctx.drawImage(enemyImgs[enemy.imgIndex].img, enemy.x, enemy.y, enemy.w, enemy.h);
    } else {
      // 画像がない場合は代替表示
      ctx.fillStyle = enemy.type === "strong" ? "#ff7f3f" : "#a0d8ff";
      drawRoundRect(enemy.x, enemy.y, enemy.w, enemy.h, 8);
    }
    
    // HP バー（強敵は赤、弱敵は白）
    ctx.fillStyle = enemy.type === "strong" ? "#ff4444" : "rgba(255,255,255,0.8)";
    const hpMax = enemy.type === "strong" ? 4 : 1;
    ctx.fillRect(enemy.x, enemy.y - 6, enemy.w * (enemy.hp / hpMax), 4);
  });
  
  // ボス描画
  if (gameData.boss) {
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      ctx.drawImage(bossImg, gameData.boss.x, gameData.boss.y, gameData.boss.w, gameData.boss.h);
    } else {
      // 画像がない場合は代替表示
      ctx.fillStyle = "#ff3fe8";
      drawRoundRect(gameData.boss.x, gameData.boss.y, gameData.boss.w, gameData.boss.h, 16);
    }
    
    // HP バー
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(70, 25, 500 * (gameData.boss.hp / gameData.boss.maxHp), 20);
    
    // Display boss time
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px Arial";
    const bossTimeElapsed = (performance.now() - gameData.bossStart) / 1000;
    ctx.fillText(`ボス戦: ${bossTimeElapsed.toFixed(1)}秒`, 10, 450);
  }
  
  // アイテム描画
  gameData.items.forEach(item => {
    if (item.type === "coin") {
      if (coinImg.complete && coinImg.naturalWidth > 0) {
        ctx.drawImage(coinImg, item.x, item.y, item.w, item.h);
      }
      return;
    } else if (item.type === "power") {
      ctx.fillStyle = "#a2ff80";
    } else if (item.type === "speed") {
      ctx.fillStyle = "#ffaa00";
    } else if (item.type === "shield") {
      ctx.fillStyle = "#00ccff";
    } else if (item.type === "heal") {
      ctx.fillStyle = "#ff99ff";
    } else if (item.type === "fireRate") {
      ctx.fillStyle = "#ffff00";
    }
    ctx.beginPath();
    ctx.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateHud() {
  hudLevel.textContent = `LEVEL ${currentLevel}`;
  hudHp.textContent = `HP: ${gameData.player.hp}`;
  hudTime.textContent = levelSettings[currentLevel].timeLimit !== null ? `TIME: ${gameData.timeLeft}` : `TIME: ---`;
  hudScore.textContent = `SCORE: ${gameData.score}`;
  
  // Status display
  let statusText = "";
  if (currentLevel === 3) {
    statusText = "ボス戦: 弾を避けて攻撃パターンを読む";
  } else {
    statusText = "通常ステージ: 弾をよけて敵を倒す";
  }
  
  // Add item status if any active
  const statusItems = [];
  if (gameData.player.shield > 0) statusItems.push(`シールド×${gameData.player.shield}`);
  if (gameData.player.speed > 1) statusItems.push(`速度UP`);
  if (gameData.player.fireRate > 1) statusItems.push(`連射UP`);
  
  if (statusItems.length > 0) {
    statusText += ` [${statusItems.join("/")}]`;
  }
  
  hudStatus.textContent = statusText;
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
displayTopScoresOnTitle();
setState("title");
requestAnimationFrame(gameLoop);
