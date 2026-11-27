import { dom } from "./dom.js";
import { battleService } from "../battleService.js";
import { state, maxSpores } from "../state.js";
import { session, activeBattle, activePhase, activePlants } from "./session.js";
import { towersOf, maxTowers } from "../towers.js";
import { SPORE_CAP, bossLaneOwner } from "../bossLevel.js";
import { BOSS_KINDS } from "../plants.js";
import {
  BOSS_KEYS,
  bossLaneButtons,
  bossDeployButtons,
} from "./bossControls.js";
import { renderEvolutionCards } from "./flow.js";
import { LEVEL_TIME_LIMIT } from "../constants.js";

const SECONDS_PER_MINUTE = 60;

// store currently displayed HUD value
let shown = {};

let lastRenderedEvolutionLevel = null;

// 65.2 -> "1:05"
function clock(seconds) {
  const whole = Math.ceil(Math.max(0, seconds));
  const mins = Math.floor(whole / SECONDS_PER_MINUTE);
  const secs = String(whole % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateBossMission(battle, phase) {
  const { $ } = dom();
  const isBoss = session.mode === "boss";

  $("bossMissionProgress").hidden = !isBoss;
  $("bossMissionObjectives").hidden = !isBoss;

  $("battleEyebrow").textContent = isBoss
    ? "CHAPTER V · THE FINAL SIEGE"
    : "Your Battle Journey";

  $("battleSubtitle").textContent = isBoss
    ? "Break the defences. Expose the core. Defeat the Apex Harvester."
    : "Deploy your plants, destroy enemy towers, and defeat the castle.";

  if (!isBoss) return;

  const coreExposed = battle.phase === "core";
  const bossDefeated = phase === "won";

  const tanksDestroyed = battle.tanks.filter((tank) => tank.hp <= 0).length;

  const cannonDestroyed = !battle.towers.some(
    (tower) => tower.type === "cannon" && tower.hp > 0,
  );

  $("bossTankCount").textContent = `${tanksDestroyed}/2 tanks breached`;

  function updatePhase(id, completed, active) {
    const element = $(id);

    element.classList.toggle("is-completed", completed);
    element.classList.toggle("is-active", active);

    element.querySelector(".boss-phase-status").textContent = completed
      ? "Completed"
      : active
        ? "In progress"
        : "Pending";
  }

  updatePhase(
    "bossPhaseDefence",
    coreExposed || bossDefeated,
    !coreExposed && !bossDefeated,
  );

  updatePhase("bossPhaseCore", coreExposed || bossDefeated, false);

  updatePhase("bossPhaseVictory", bossDefeated, coreExposed && !bossDefeated);

  function updateObjective(id, completed) {
    const element = $(id);

    element.classList.toggle("is-completed", completed);

    element.querySelector("i").className = completed
      ? "icon-check-circle"
      : "icon-circle";
  }

  updateObjective(
    "objectiveUpperTank",
    battle.tanks.some((tank) => tank.lane === 0 && tank.hp <= 0),
  );

  updateObjective("objectiveCannon", cannonDestroyed);

  updateObjective(
    "objectiveLowerTank",
    battle.tanks.some(
      (tank) => tank.lane === battle.laneY.length - 1 && tank.hp <= 0,
    ),
  );

  updateObjective("objectiveBoss", bossDefeated);
}

export function hud() {
  const { $ } = dom();
  const battle = activeBattle();
  // Update the battle status indicator.
  const phase = activePhase();

  updateBossMission(battle, phase);

  const battleStatuses = {
    menu: "Ready for Battle",
    play: "Battle in Progress",
    pause: "Battle Paused",
    won: "Victory",
    lost: "Defeat",
  };

  $("battleStatus").dataset.phase = phase;
  $("battleStatusText").textContent =
    battleStatuses[phase] || "Ready for Battle";

  // Refresh the collection when the level changes.
  if (lastRenderedEvolutionLevel !== state.level) {
    renderEvolutionCards();
    lastRenderedEvolutionLevel = state.level;
  }

  const cap = session.mode === "boss" ? SPORE_CAP : maxSpores();
  $("sporeProgress").max = cap;
  $("sporeProgress").value = battle.spores;

  // Update enemy castle health.
  const castleHealth = $("castleHealth");
  const keep = battle.keep;

  if (session.mode === "boss" && session.selectedPlantIndex !== null) {
    $("detailName").textContent = BOSS_KINDS[session.selectedPlantIndex].n;
  }

  castleHealth.hidden =
    session.mode === "boss" || !keep || activePhase() === "menu";

  if (!castleHealth.hidden) {
    const health = Math.max(0, keep.hp);
    //to test the color of the castle health bar in the battle  remove this line of code
    //const percentage = Math.round((health / keep.max) * 100);
    //and replace it with this:
    //1. const percentage = 20; (chnages to red color)
    //2. const percentage = 45; (changes to orange color)
    //3. const percentage = 70; (changes to purple color)
    //4. const percentage = 100; (changes to green color)
    const percentage = Math.round((health / keep.max) * 100);

    $("castleHealthProgress").max = keep.max;
    $("castleHealthProgress").value = health;
    $("castleHealthText").textContent = `${percentage}%`;
    castleHealth.dataset.health =
      percentage <= 25
        ? "critical"
        : percentage <= 50
          ? "warning"
          : percentage <= 75
            ? "damaged"
            : "healthy";
  }

  const v = {
    sp: Math.floor(battle.spores) + " / " + cap,
    lv: session.mode === "boss" ? "Boss" : state.level,
    tm:
      session.mode === "boss"
        ? "—"
        : clock(LEVEL_TIME_LIMIT - (battle.elapsed || 0)),
    tw: (session.mode === "boss"
      ? [...battle.towers, ...battle.minions, ...battle.tanks, battle.boss]
      : battle.enemies
    ).filter((enemy) => enemy.hp > 0).length,
    tc:
      session.mode === "boss"
        ? "—"
        : towersOf(session.activePlayer).length + " / " + maxTowers(),
  };

  // Update spores, level, and towers.
  for (const id in v) {
    if (shown[id] !== v[id]) {
      $(id).textContent = v[id];
      shown[id] = v[id];
    }
  }

  // Update plant discovery indicators.
  document.querySelectorAll(".battle-plant-option").forEach((card) => {
    const index = Number(card.dataset.plantIndex);
    const locked = state.level < index + 1;

    card.classList.toggle("is-locked", locked);
  });

  // ===================================================
  // Update deployement buttons
  // ===================================================

  if (session.selectedPlantIndex !== null) {
    const plant = activePlants()[session.selectedPlantIndex];
    const hasTower =
      session.mode === "boss" ||
      state.myTowers.some(
        (t) =>
          t.plant === session.selectedPlantIndex &&
          t.owner === session.activePlayer,
      );

    const deploymentDisabled =
      activePhase() !== "play" ||
      !hasTower ||
      battle.spores < plant.cost ||
      (battleService.online() && !battleService.ready());

    $("selectPlantBtn").disabled = deploymentDisabled;
    $("battleDeployBtn").disabled = deploymentDisabled;
  } else {
    $("selectPlantBtn").disabled = true;
    $("battleDeployBtn").disabled = true;
  }

  // Hide the regular toolbar during Boss Battle.
  document.querySelector(".battle-toolbar").hidden = session.mode === "boss";

  const coop = session.mode === "boss" && battle.selectedLanes.length === 2;
  $("bossPlayer").hidden = !coop;
  if (coop) {
    const label = `Player ${session.activePlayer + 1} controls | Switch player`;
    if ($("bossPlayer").textContent !== label) {
      $("bossPlayer").textContent = label;
    }
  }
  bossDeployButtons.forEach((button, index) => {
    const key = BOSS_KEYS[coop ? session.activePlayer : 0][index];
    const hint = button.querySelector("kbd");
    if (hint.textContent !== key) {
      hint.textContent = key;
    }
    button.disabled =
      session.mode !== "boss" ||
      activePhase() !== "play" ||
      battle.spores < BOSS_KINDS[index].cost;
  });
  bossLaneButtons.forEach((button, lane) => {
    button.hidden = session.mode !== "boss" || lane >= battle.laneY.length;
    if (button.hidden) {
      return;
    }
    const owner = bossLaneOwner(battle, lane);
    button.disabled =
      owner !== session.activePlayer ||
      !["play", "pause"].includes(activePhase());
    button.setAttribute(
      "aria-pressed",
      String(session.mode === "boss" && battle.selectedLanes.includes(lane)),
    );
    if (session.mode === "boss") {
      const tank = battle.tanks.find((target) => target.lane === lane);
      const target =
        battle.phase === "core"
          ? "Furnace core"
          : tank?.hp === 0
            ? "Tank breached"
            : lane === 1 &&
                !battle.towers.some(
                  (tower) => tower.type === "cannon" && tower.hp > 0,
                )
              ? "Centre staging"
              : battle.laneNames[lane];
      const label = button.querySelector(".boss-lane-name");

      const name = coop ? `P${owner + 1} / ${target}` : target;
      if (label && label.textContent !== name) {
        label.textContent = name;
      }
      const selected = battle.selectedLanes.includes(lane);

      const completed =
        lane === 1
          ? !battle.towers.some(
              (tower) => tower.type === "cannon" && tower.hp > 0,
            )
          : battle.tanks.some((tank) => tank.lane === lane && tank.hp <= 0);

      button.classList.toggle("is-completed", completed);

      const badge = button.querySelector(".boss-lane-number");

      if (badge) {
        badge.innerHTML = completed
          ? '<i class="icon-check-circle" aria-hidden="true"></i> Destroyed'
          : selected
            ? '<i class="icon-check" aria-hidden="true"></i> Selected'
            : `Lane ${lane + 1}`;
      }
    }
  });
  if (session.mode === "boss") {
    const tanksLeft = battle.tanks.filter((tank) => tank.hp > 0).length;

    const breached = 2 - tanksLeft;
    const attackCounter = $("bossAttackCounter");

    attackCounter.textContent = `${breached}/2 tanks breached`;

    attackCounter.classList.toggle("is-completed", breached === 2);

    const objective =
      battle.phase === "core"
        ? "Core exposed. All lanes converge. Use Rafflesia to pierce armour and keep healing support alive. Mist speed +25%."
        : `Break the chemical tanks (${2 - tanksLeft}/2 breached). Rafflesia pierces their armour. Silence the centre cannon to stop splash fire and slow sprays.`;
    if ($("bossObjective").textContent !== objective)
      $("bossObjective").textContent = objective;
    const hazard = battle.spray
      ? `Lane ${battle.spray.lane + 1}: ${battle.spray.stage === "warning" ? "herbicide incoming — reinforce another lane" : "herbicide active"}.`
      : "Spread your army across lanes.";
    if ($("bossHazard").textContent !== hazard)
      $("bossHazard").textContent = hazard;
  }
  const isPaused = activePhase() === "pause";

  $("pauseLabel").textContent = isPaused ? "Resume (P)" : "Pause (P)";
  $("pauseIcon").className = isPaused ? "icon-play" : "icon-pause";
  $("pz").setAttribute("aria-pressed", String(isPaused));
}

export function showPlantMessage(message, type = "info") {
  const { $ } = dom();
  const messageElement = $("plantMessage");

  messageElement.textContent = message;
  messageElement.dataset.status = type;
}

export function show(t, m, b) {
  const { $ } = dom();
  const phase = activePhase();

  const isMission = phase === "menu";

  $("ot").textContent =
    isMission && session.mode !== "boss" && state.level === 1
      ? "The First Breach"
      : t;

  $("om").textContent =
    isMission && session.mode !== "boss" && state.level === 1
      ? "Grow your army. Break the defenses. Reclaim the garden."
      : m;

  $("ob").textContent = isMission ? "Begin Mission" : b;

  // Update overlay icon.
  const overlayIcons = {
    menu: "icon-swords",
    pause: "icon-pause-circle",
    won: "icon-trophy",
    lost: "icon-shield-x",
  };

  $("battleOverlayIcon").className =
    `${overlayIcons[phase] || "icon-swords"} battle-overlay-icon`;

  $("ov").dataset.phase = phase;

  // Update mission badge.
  const levelBadge = $("overlayLevel");

  levelBadge.textContent =
    session.mode === "boss"
      ? "BOSS MISSION"
      : `MISSION ${String(state.level).padStart(2, "0")}`;

  levelBadge.hidden = !isMission;

  $("missionStats").hidden = true;

  // Display overlay.
  $("ov").classList.remove("hide");
  $("ob").focus();
}
