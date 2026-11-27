// Win score maths. Pure: no DOM, no storage, no game state imports.
// score = max(0, 1000 + 10 * max(0, 300 - wholeSeconds) + floor(sporesLeft)
//           - 25 * plantsLost)

export const SCORE_BASE = 1000;
export const SCORE_PAR_SECONDS = 300;
export const SCORE_TIME_BONUS_PER_SECOND = 10;
export const SCORE_PLANT_LOSS_PENALTY = 25;

const ZERO = 0;

// elapsed/spores may be fractional simulation values; wholeSeconds floors.
export function computeScore({ elapsed, spores, plantsLost = 0 }) {
  const wholeSeconds = Math.floor(Math.max(0, elapsed || 0));
  const sporesLeft = Math.floor(Math.max(0, spores || 0));
  const lost = Math.max(0, plantsLost || 0);

  const timeBonus =
    SCORE_TIME_BONUS_PER_SECOND *
    Math.max(ZERO, SCORE_PAR_SECONDS - wholeSeconds);
  const breakdown = {
    base: SCORE_BASE,
    timeBonus,
    sporeBonus: sporesLeft,
    lossPenalty: SCORE_PLANT_LOSS_PENALTY * lost,
  };
  breakdown.total = Math.max(
    ZERO,
    breakdown.base +
      breakdown.timeBonus +
      breakdown.sporeBonus -
      breakdown.lossPenalty,
  );
  return breakdown;
}

// Label shown on the score screen for how the battle was played.
export function modeLabel(online, players) {
  if (online) return "Online Co-op";
  return players === 2 ? "Local 2P" : "Solo";
}

// A win's identity. Online wins share the room's generation, so both
// browsers and a refreshed tab derive the same key; local wins use the
// moment of victory, so replaying a level is a new, savable win.
export function winKey({ mode, level, players, generation, at }) {
  const token = generation === undefined ? `t${at}` : `g${generation}`;
  return `${mode}-${level}-${players}-${token}`;
}
