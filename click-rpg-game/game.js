let introSeen = localStorage.getItem("introSeen") === "true";
let autoAttack = false;
let autoAttackInterval = null;
let freezeMonster = false;



/*******************************************
 * 玩家資料
 *******************************************/
const player = {
  maxHp: 100,
  hp: 100,
  atk: 3,
  def: 1,
  gold: 0
};


let critChance = 0.05;   // 5%
let dodgeChance = 0.08;

/*******************************************
 * 怪物資料
 *******************************************/
const monsters = [
  { id: 1, name: "史萊姆", maxHp: 18, atk: 2, interval: 2400, gold: 5 },
  { id: 2, name: "哥布林", maxHp: 32, atk: 3, interval: 2200, gold: 8 },
  { id: 3, name: "森林狼", maxHp: 50, atk: 4, interval: 2100, gold: 12 },
  { id: 4, name: "骷髏兵", maxHp: 75, atk: 6, interval: 2000, gold: 16 },
  { id: 5, name: "巨蛇", maxHp: 105, atk: 7, interval: 1900, gold: 20 },
  { id: 6, name: "黑暗法師", maxHp: 150, atk: 8, interval: 1850, gold: 28 },
  { id: 7, name: "重甲騎士", maxHp: 210, atk: 10, interval: 1800, gold: 35 },
  { id: 8, name: "熔岩巨人", maxHp: 300, atk: 12, interval: 1700, gold: 45 },
  { id: 9, name: "第九關守門者", maxHp: 380, atk: 14, interval: 1600, gold: 60 }
];

const boss = {
  id: 10,
  name: "遠古龍王（Boss）",
  maxHp: 1000,
  atk: 25,
  interval: 1500,
  gold: 500
};

/*******************************************
 * 遊戲狀態
 *******************************************/
let currentMonster = null;
let currentMonsterHp = 0;

let stageIndex = 0;
let inLoopMode = false;
let loopCount = 0;
let inBossFight = false;

let monsterAttackTimer = null;
let monsterTimerLoop = null;

let attackUpgradeCost = 15;
let defUpgradeCount = 0;
let hpUpgradeCount = 0;

/*******************************************
 * UI 元素
 *******************************************/
const playerHpText = document.getElementById("playerHpText");
const playerAtkText = document.getElementById("playerAtkText");
const playerDefText = document.getElementById("playerDefText");
const playerGoldText = document.getElementById("playerGoldText");

const stageLabel = document.getElementById("stageLabel");

const buyAttackButton = document.getElementById("buyAttackButton");
const buyDefButton = document.getElementById("buyDefButton");
const buyHpButton = document.getElementById("buyHpButton");
const buyHealButton = document.getElementById("buyHealButton");

const shopAtkText = document.getElementById("shopAtkText");
const shopNextAtkText = document.getElementById("shopNextAtkText");
const shopCostText = document.getElementById("shopCostText");

const wildArea = document.getElementById("wildArea");
const monsterImg = document.getElementById("monsterImg");

const monsterHpFill = document.getElementById("monsterHpFill");
const monsterTimerFill = document.getElementById("monsterTimerFill");
const stageProgressFill = document.getElementById("stageProgressFill");

const healText = document.getElementById("healText");
const bossButton = document.getElementById("bossButton");

const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const restartButton = document.getElementById("restartButton");

const monsterStatText = document.getElementById("monsterStatText");

/*******************************************
 * 怪物圖片管理
 *******************************************/
function getMonsterImgPath(id) {
  return {
    normal: `img/monster${id}.png`,
    attacked: `img/monster${id}-attacked.png`,
    attack: `img/monster${id}-attack.png`
  };
}
/*******************************************
 * UI 更新
 *******************************************/
function updatePlayerUI() {
  playerHpText.textContent = `${player.hp} / ${player.maxHp}`;
  playerAtkText.textContent = player.atk;
  playerDefText.textContent = player.def;
  playerGoldText.textContent = player.gold;
}

/*******************************************
 * 怪物生成
 *******************************************/
function spawnMonster(mon) {
  stopMonsterAttackLoop();

  currentMonster = { ...mon };
  currentMonsterHp = mon.maxHp;

  const imgPath = getMonsterImgPath(mon.id);
  monsterImg.src = imgPath.normal;
  monsterImg.dataset.normal = imgPath.normal;
  monsterImg.dataset.attacked = imgPath.attacked;
  monsterImg.dataset.attack = imgPath.attack;

  monsterHpFill.style.width = "100%";

  monsterStatText.textContent =
    `HP ${currentMonsterHp} / ${currentMonster.maxHp} | ATK ${currentMonster.atk}`;

  monsterImg.classList.add("spawn-fade");
  setTimeout(() => monsterImg.classList.remove("spawn-fade"), 500);

  updateStageProgress();
  startMonsterAttackLoop();

  monsterImg.style.transform = "translate(-50%, -50%)";

}

/*******************************************
 * 關卡進度條
 *******************************************/
function updateStageProgress() {
  const percent = Math.min((stageIndex / 9) * 100, 100);
  stageProgressFill.style.width = percent + "%";
}

/*******************************************
 * 怪物倒數條 + 攻擊循環（最終修正版）
 *******************************************/
function startMonsterAttackLoop() {
  stopMonsterAttackLoop();

  let timer = 0;
  let full = currentMonster.interval;

  monsterTimerFill.style.width = "100%";

  monsterTimerLoop = setInterval(() => {
    timer += 30;

    let remain = Math.max(0, 1 - timer / full);
    monsterTimerFill.style.width = (remain * 100) + "%";

    if (timer >= full) {
      monsterAttack();
      timer = 0;
      monsterTimerFill.style.width = "100%";
    }
  }, 30);
}

function stopMonsterAttackLoop() {
  if (monsterTimerLoop) clearInterval(monsterTimerLoop);
}

/*******************************************
 * 玩家攻擊
 *******************************************/
function playerAttack() {
  if (!currentMonster || currentMonsterHp <= 0) return;

  // 暴擊判定
  const isCrit = Math.random() < critChance;

  // 正確暴擊傷害（避免被覆蓋）
  let dmg = player.atk;
  if (isCrit) {
    dmg = Math.floor(player.atk * 1.7); // 170% 暴擊
    showFloatingText("CRIT!", "#ffd93d");
  }

  // 實際扣血
  currentMonsterHp = Math.max(0, currentMonsterHp - dmg);

  // 更新血條
  monsterHpFill.style.width =
    (currentMonsterHp / currentMonster.maxHp) * 100 + "%";

  // 顯示怪物資訊（HP / ATK）
  monsterStatText.textContent =
    `HP ${currentMonsterHp} / ${currentMonster.maxHp} | ATK ${currentMonster.atk}`;

  // 播受擊動畫
  monsterImg.src = monsterImg.dataset.attacked;

  setTimeout(() => {
      monsterImg.src = monsterImg.dataset.normal;
  }, 150);

  monsterImg.classList.add("hit-flash");
  setTimeout(() => monsterImg.classList.remove("hit-flash"), 150);

  if (currentMonsterHp <= 0) handleMonsterDefeated();
}

function startAutoAttack() {
  if (autoAttackInterval) return;

  autoAttackInterval = setInterval(() => {
    playerAttack();   // ★ 正確：用 playerAttack()
  }, 80);
}

function stopAutoAttack() {
  clearInterval(autoAttackInterval);
  autoAttackInterval = null;
}

function hideControlButtons() {
  const autoBtn = document.getElementById("autoTestBtn");
  const bossBtn = document.getElementById("bossButton");

  autoBtn.style.display = "none";
  bossBtn.style.display = "none";

  // 停止自動攻擊
  stopAutoAttack();
}



/*******************************************
 * 怪物攻擊玩家（含閃避）
 *******************************************/
function monsterAttack() {

  if (freezeMonster) return;
  if (currentMonsterHp <= 0) return;

  // 閃避
  if (Math.random() < dodgeChance) {
    showFloatingText("MISS", "#8be0ff");
    return;
  }

  //受傷處理
  let dmg = Math.max(1, currentMonster.atk - player.def);
  player.hp = Math.max(0, player.hp - dmg);

  updatePlayerUI();
  showFloatingText("-" + dmg, "#ff4444");

  // ★ 顯示攻擊圖片
  monsterImg.src = monsterImg.dataset.attack;

  // ★ 撞擊動畫
  monsterImg.classList.add("monster-bump");

  // ★ 回復正常圖片
  setTimeout(() => {
    monsterImg.src = monsterImg.dataset.normal;
    monsterImg.classList.remove("monster-bump");

  }, 200);

  if (player.hp <= 0) handlePlayerDefeated();
}



/*******************************************
 * 浮動文字（怪物頭頂）
 *******************************************/
function showFloatingText(text, color) {
  const dm = document.createElement("div");
  dm.textContent = text;
  dm.classList.add("damage-floating", "pixel");
  dm.style.color = color;

  dm.style.left = "50%";
  dm.style.top = "40%";
  dm.style.transform = "translateX(-50%)";

  document.body.appendChild(dm);

  dm.classList.add("damage-anim");
  setTimeout(() => dm.remove(), 900);
}

/*******************************************
 * 怪物死亡爆裂
 *******************************************/
function playExplosion() {
  const container = document.getElementById("explosionContainer");
  container.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.classList.add("explosion-particle");
    p.style.setProperty("--tx", `${(Math.random() - 0.5) * 150}px`);
    p.style.setProperty("--ty", `${(Math.random() - 0.5) * 150}px`);
    container.appendChild(p);
  }
}

/*******************************************
 * 怪物死亡後（掉落金幣 + 切關）
 *******************************************/
function handleMonsterDefeated() {
  playExplosion();
  stopMonsterAttackLoop();

  // 加金幣
  player.gold += currentMonster.gold;
  updatePlayerUI();

  // --- 如果是 Boss ---
  if (inBossFight) {
    return showResult(true);
  }

  // --- 正常模式進行關卡 ---
  if (!inLoopMode) {

    // 第 9 關打完 → 問是否進入 Boss（第 10 關）
    if (stageIndex === 8) {

      // 使用新版木製提示面板
      const askBossOverlay = document.getElementById("askBossOverlay");
      askBossOverlay.style.display = "flex";

      // 點擊前往 Boss
      document.getElementById("askBossEnter").onclick = () => {
        askBossOverlay.style.display = "none";
        loadBoss();
      };

      // 點擊拒絕 → 進入循環關卡 + 顯示 Boss 按鈕
      document.getElementById("askBossCancel").onclick = () => {
        askBossOverlay.style.display = "none";

        // 拒絕後才顯示 Boss 按鈕（正常）
        document.getElementById("bossButton").style.display = "block";

        loadLoopMonster();
      };

      return;
    }

    // 一般關卡 → 下一關
    stageIndex++;
    return loadNormalMonster(stageIndex);
  }

  // --- 循環關卡 ---
  loadLoopMonster();
}

/*******************************************
 * 玩家死亡動畫
 *******************************************/
function handlePlayerDefeated() {

  hideControlButtons();
  stopAutoAttack();

  stopMonsterAttackLoop();
  const mask = document.getElementById("deathMask");
  mask.classList.add("active");

  const dt = document.getElementById("deathText");
  dt.textContent = "YOU DIED";
  dt.style.display = "block";

  setTimeout(() => {
    showResult(false);
    mask.classList.remove("active");
    dt.style.display = "none";
  }, 1200);
}



/*******************************************
 * 商店 UI 更新
 *******************************************/
function refreshShopUI() {

  // ★ 攻擊力（顯示真正費用）
  shopAtkText.textContent = player.atk;
  shopNextAtkText.textContent = player.atk + 1;
  shopCostText.textContent = attackUpgradeCost;

  // ★ 防禦力（顯示真正扣款公式）
  const defCost = Math.round(12 * Math.pow(1.15, defUpgradeCount));
  document.getElementById("defNow").textContent = player.def;
  document.getElementById("defNext").textContent = player.def + 2;
  document.getElementById("defCost").textContent = defCost;

  // ★ 最大生命（顯示真正扣款公式）
  const hpCost = Math.round(10 * Math.pow(1.15, hpUpgradeCount));
  document.getElementById("hpNow").textContent = player.maxHp;
  document.getElementById("hpNext").textContent = player.maxHp + 15;
  document.getElementById("hpCost").textContent = hpCost;

  // ★ 加血藥水（固定價格）
  document.getElementById("addhpNow").textContent = "恢復 10-20 HP";
  document.getElementById("addhpNext").textContent = "恢復 10-20 HP";
  document.getElementById("addhpCost").textContent = 10;
}


/*******************************************
 * 商店功能
 *******************************************/
function buyAttackUpgrade() {
  if (player.gold < attackUpgradeCost) return;

  player.gold -= attackUpgradeCost;
  player.atk++;

  attackUpgradeCost = Math.round(attackUpgradeCost * 1.15 + 3);

  updatePlayerUI();
  refreshShopUI();
}

buyDefButton.addEventListener("click", () => {
  const cost = Math.round(12 * Math.pow(1.15, defUpgradeCount));
  if (!player.gold || player.gold < cost) return;

  player.gold -= cost;
  player.def += Math.floor(Math.random() * 2) + 1;
  defUpgradeCount++;

  updatePlayerUI();
  refreshShopUI();
});

buyHpButton.addEventListener("click", () => {
  const cost = Math.round(10 * Math.pow(1.15, hpUpgradeCount));
  if (player.gold < cost) return;

  player.gold -= cost;

  const increase = Math.floor(Math.random() * 11) + 10;
  player.maxHp += increase;

  player.hp += increase;

  hpUpgradeCount++;

  updatePlayerUI();
  refreshShopUI();
});


buyHealButton.addEventListener("click", () => {
  const cost = 10;
  if (player.gold < cost) return;

  player.gold -= cost;
  const heal = Math.floor(Math.random() * 11) + 10;

  player.hp = Math.min(player.maxHp, player.hp + heal);
  updatePlayerUI();

  healText.textContent = `+${heal}`;
  healText.classList.add("heal-animation");
  setTimeout(() => healText.classList.remove("heal-animation"), 900);

  refreshShopUI();
});

/*******************************************
 * 結果畫面
 *******************************************/
function showResult(win) {
  resultOverlay.style.display = "flex";

  // ★ 結束時隱藏 Auto/Boss 並停止所有攻擊
  hideControlButtons();
  stopAutoAttack();
  stopMonsterAttackLoop();

  resultTitle.textContent = win ? "勝利！" : "失敗…";
  resultMessage.textContent =
    win ? "你擊敗了遠古龍王！世界恢復和平！" : "你倒下了，下次再來挑戰吧。";
}



/*******************************************
 * 重開遊戲
 *******************************************/
function restartGame() {
  document.getElementById("autoTestBtn").style.display = "block";
  localStorage.setItem("introSeen", "true");
  location.reload();
}


/*******************************************
 * 一般怪物／Boss／循環生成
 *******************************************/
function loadNormalMonster(idx) {
  inBossFight = false;
  inLoopMode = false;

  document.getElementById("stageProgressBar").style.display = "block";
  document.getElementById("monsterStatText").classList.remove("boss-monster-stat");


  stageLabel.textContent = `第 ${idx + 1} 關`;
  spawnMonster(monsters[idx]);
}


function loadBoss() {
  inBossFight = true;
  inLoopMode = false;

  stageLabel.textContent = "第 10 關（Boss）";
  bossButton.style.display = "none";
  document.getElementById("stageProgressBar").style.display = "none";

  freezeMonster = false;

  spawnMonster(boss);
}






function loadLoopMonster() {
  inLoopMode = true;
  inBossFight = false;
  loopCount++;

  bossButton.style.display = "block";

  // 從 monster 陣列中隨機挑一隻「外型」
  const base = monsters[Math.floor(Math.random() * monsters.length)];

  // 持續遞增的全域成長曲線（與怪物種類無關）
  let hp = Math.min(950, 80 + loopCount * 35);
  let atk = Math.min(20, 3 + loopCount * 1.1);
  let gold = Math.min(120, 10 + loopCount * 3);
  let interval = Math.max(900, 2000 - loopCount * 40);

  const enhanced = {
    id: base.id, // ★ 使用「隨機怪物」的外型
    name: `強化怪物 · 第 ${loopCount} 波`,
    maxHp: Math.round(hp),
    atk: Math.round(atk),
    interval,
    gold
  };

  stageLabel.textContent = `循環關卡 ${loopCount}`;

  spawnMonster(enhanced);
}







function showFloatingText(text, color = "#ffffff") {
  const float = document.createElement("div");
  float.className = "damage-floating pixel";
  float.style.color = color;
  float.textContent = text;

  document.getElementById("wildArea").appendChild(float);

  float.classList.add("damage-anim");

  setTimeout(() => float.remove(), 1000);
}

/*******************************************
 * 系統綁定
 *******************************************/
wildArea.addEventListener("click", playerAttack);
buyAttackButton.addEventListener("click", buyAttackUpgrade);

bossButton.addEventListener("click", () => {
  const askBossOverlay = document.getElementById("askBossOverlay");
  askBossOverlay.style.display = "flex";

  freezeMonster = true;

  document.getElementById("askBossEnter").onclick = () => {
    askBossOverlay.style.display = "none";
    freezeMonster = false;
    loadBoss();
  };

  document.getElementById("askBossCancel").onclick = () => {
    askBossOverlay.style.display = "none";
    freezeMonster = false;
  };
});


restartButton.addEventListener("click", restartGame);

// ========================
// Auto 自動攻擊按鈕事件
// ========================
const autoTestBtn = document.getElementById("autoTestBtn");

autoTestBtn.addEventListener("click", () => {
  autoAttack = !autoAttack;

  if (autoAttack) {
    startAutoAttack();
    autoTestBtn.textContent = "Stop";
  } else {
    stopAutoAttack();
    autoTestBtn.textContent = "Auto";
  }
});


// ========================
// 開始介面事件
// ========================
const introOverlay = document.getElementById("introOverlay");
const startBtn = document.getElementById("startGameBtn");

startBtn.addEventListener("click", () => {
  introOverlay.style.display = "none";
  localStorage.setItem("introSeen", "true"); 

  // 正式開始遊戲
  updatePlayerUI();
  refreshShopUI();
  loadNormalMonster(0);
});



