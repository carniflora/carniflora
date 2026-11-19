import { dom } from "./dom.js";
import { battleService } from "../battleService.js";
import { state, maxSpores } from "../state.js";
import { session, activeBattle, activePhase, activePlants } from "./session.js";
import { towersOf, maxTowers } from "../towers.js";
import { SPORE_CAP, LANE_NAMES } from "../bossLevel.js";
import { BOSS_KINDS } from "../plants.js";
import { bossLaneButtons, bossDeployButtons } from "./bossControls.js";
import { renderEvolutionCards } from "./flow.js";

// store currently displayed HUD value
let shown = {};

let lastRenderedEvolutionLevel = null;

export function hud() {
  const { $ } = dom();
  const battle = activeBattle();
  // Update the battle status indicator.
  const phase = activePhase();

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

  bossDeployButtons.forEach((button, index) => {
    button.disabled =
      session.mode !== "boss" ||
      activePhase() !== "play" ||
      battle.spores < BOSS_KINDS[index].cost;
  });
  bossLaneButtons.forEach((button, lane) => {
    button.disabled =
      session.mode !== "boss" || !["play", "pause"].includes(activePhase());
    button.setAttribute(
      "aria-pressed",
      String(
        session.mode === "boss" && lane === session.bossState.selectedLane,
      ),
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
              : LANE_NAMES[lane];
      const label = `${lane + 1} / ${target}`;
      if (button.textContent !== label) button.textContent = label;
    }
  });
  if (session.mode === "boss") {
    const tanksLeft = battle.tanks.filter((tank) => tank.hp > 0).length;
    const objective =
      battle.phase === "core"
        ? "Core exposed. All lanes converge. Use Rafflesia to pierce armour and keep healing support alive. Mist speed +25%."
        : `Break the chemical tanks (${2 - tanksLeft}/2 breached). Rafflesia pierces their armour. Silence the centre cannon to stop splash fire and slow sprays.`;
    if ($("bossObjective").textContent !== objective)
      $("bossObjective").textContent = objective;
    const hazard = battle.spray
      ? `Lane ${battle.spray.lane + 1}: ${battle.spray.stage === "warning" ? "herbicide incoming — reinforce another lane" : "herbicide active"}.`
      : "Spray targets the largest lane group. Spread your waves. ↑/↓ selects a lane; 1–4 deploys.";
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

  $("ot").textContent = t;
  $("om").textContent = m;
  $("ob").textContent = b;

  const phase = activePhase();

  const overlayIcons = {
    menu: "icon-swords",
    pause: "icon-pause-circle",
    won: "icon-trophy",
    lost: "icon-shield-x",
  };

  $("battleOverlayIcon").className =
    `${overlayIcons[phase] || "icon-swords"} battle-overlay-icon`;

  $("ov").dataset.phase = phase;

  const levelBadge = $("overlayLevel");

  levelBadge.textContent = `Level ${state.level}`;
  levelBadge.hidden = phase !== "menu";

  $("ov").classList.remove("hide");
  $("ob").focus();
}
