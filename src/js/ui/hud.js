import { dom } from "./dom.js";
import { session, activeBattle, activePhase, activePlants } from "./session.js";
import { state, towersOf, maxTowers, maxSpores } from "../game.js";
import { SPORE_CAP, LANE_NAMES, KINDS as BOSS_KINDS } from "../bossLevel.js";
import { bossLaneButtons, bossDeployButtons } from "./bossControls.js";
import { renderEvolutionCards } from "./progression.js";

// store currently displayed HUD value
let shown = {};

let lastRenderedEvolutionLevel = null;

export function hud() {
  const { $ } = dom();
  const battle = activeBattle();
  // Refresh the collection when the level changes.
  if (lastRenderedEvolutionLevel !== state.level) {
    renderEvolutionCards();
    lastRenderedEvolutionLevel = state.level;
  }

  const cap = session.mode === "boss" ? SPORE_CAP : maxSpores();

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
  // Disables the Select Plant button.
  // ===================================================

  if (session.selectedPlantIndex !== null) {
    const plant = activePlants()[session.selectedPlantIndex];
    const hasTower =
      session.mode === "boss" ||
      state.myTowers.some((t) => t.plant === session.selectedPlantIndex);
    $("selectPlantBtn").disabled =
      activePhase() !== "play" || !hasTower || battle.spores < plant.cost;
  }

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
  $("pz").textContent = activePhase() === "pause" ? "Resume (P)" : "Pause (P)";
  $("pz").setAttribute("aria-pressed", String(activePhase() === "pause"));
}
