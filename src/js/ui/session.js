import { state } from "../state.js";
import { PLANTS } from "../plants.js";
import { KINDS as BOSS_KINDS } from "../kinds.js";

export const session = {
  mode: "td",
  bossState: null,
  selectedPlantIndex: null,
  activePlayer: 0,
  pickedBy: [null, null],
  hoverCell: null,
};

export function activeBattle() {
  return session.mode === "boss" ? session.bossState : state;
}

export function activePlants() {
  return session.mode === "boss" ? BOSS_KINDS : PLANTS;
}

export function activePhase() {
  return session.mode === "boss" ? session.bossState.state : state.phase;
}

export function setActivePhase(phase) {
  if (session.mode === "boss") session.bossState.state = phase;
  else state.phase = phase;
}
