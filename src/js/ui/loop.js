import { battleService } from "../battleService.js";
import { dom } from "./dom.js";
import { session, activePhase } from "./session.js";
import { state, saveCastleConquered, BOSS_LEVEL } from "../state.js";
import { update } from "../combat.js";
import { updateBossLevel } from "../bossLevel.js";
import { drawBossLevel } from "../bossRenderer.js";
import { draw } from "./render.js";
import { hud, show } from "./hud.js";
import { present } from "./scoreScreen.js";
import { winKey } from "../score.js";
import { LAST_REGULAR_LEVEL, LEVEL_TIME_LIMIT } from "../constants.js";

let lastPhase = null;
const RESTART_LABEL = "Restart Level";

// store timestamp of previous frame
let last = performance.now();

// Forces the next frame to re-evaluate the phase change, so a restarted
// level still shows its win/lose overlay.
export function resetPhase() {
  lastPhase = null;
}

// 1P/2P button should only work before the first level has started.
function syncPlayerToggle($) {
  const button = $("playerToggle");
  const locked =
    battleService.online() || activePhase() !== "menu" || state.level > 1;
  button.disabled = locked;
  button.classList.toggle("is-locked", locked);
  button.title = locked
    ? "Player number can only be changed before the first level starts."
    : "";
}

// Everything the score screen needs, captured at the moment of victory.
function winResult() {
  const online = battleService.online();
  const isBoss = session.mode === "boss";
  const battle = isBoss ? session.bossState : state;
  const mode = isBoss ? "boss" : "td";
  return {
    winId: winKey({
      mode,
      level: isBoss ? mode : state.level,
      players: state.players,
      generation: online ? battleService.generation() : undefined,
      at: Date.now(),
    }),
    isBoss,
    level: isBoss ? BOSS_LEVEL : state.level,
    players: state.players,
    online,
    elapsed: battle.elapsed || 0,
    spores: battle.spores || 0,
    plantsLost: isBoss ? battle.stats.lost : state.plantsLost || 0,
  };
}

function loop(timer) {
  const { canvas, ctx: g, $ } = dom();
  const deltaTime = Math.min(0.05, (timer - last) / 1000);
  last = timer;
  if (!battleService.online()) {
    if (session.mode === "boss") {
      updateBossLevel(session.bossState, deltaTime);
    } else if (activePhase() === "play") {
      update(deltaTime);
    }
  }

  // check if game is ended
  const phase = activePhase();
  if (phase !== lastPhase) {
    syncPlayerToggle($);
    if (session.mode === "boss" && phase === "won") {
      saveCastleConquered();
      show(
        "Harvester breached",
        `The garden is reclaimed in ${Math.ceil(session.bossState.elapsed)} seconds. ${session.bossState.stats.deployed} plants deployed; ${session.bossState.stats.lost} lost (${session.bossState.stats.mistLost} to mist).`,
        "Return Home",
      );
      $("ob2").hidden = battleService.online();
    } else if (session.mode === "boss" && phase === "lost")
      show(
        "The mist caught up",
        `The battlefield was overrun with ${Math.ceil(session.bossState.boss.hp)} boss HP remaining. Deploy early and combine plant abilities to push farther.`,
        RESTART_LABEL,
      );
    else if (phase === "won" && state.level >= LAST_REGULAR_LEVEL)
      show(
        "Final Level Complete!",
        `You cleared Level ${state.level}. The Apex Harvester is waiting at the end of the road.`,
        "Face the Boss",
      );
    else if (phase === "won")
      show(
        "Victory!",
        `Congratulations! You successfully completed Level ${state.level}.`,
        state.level >= LAST_REGULAR_LEVEL ? "Replay Level" : "Next Level",
      );
    else if (phase === "lost" && state.elapsed >= LEVEL_TIME_LIMIT)
      show(
        "Time's Up",
        "The castle held out until time ran out. Push faster and try again.",
        RESTART_LABEL,
      );
    else if (phase === "lost")
      show(
        "Battle Defeated",
        "Your swarm has run out of plants and spores. Regroup and try again.",
        RESTART_LABEL,
      );
    if (phase === "won") {
      present(winResult());
    }
    lastPhase = phase;
  }
  if (session.mode === "boss")
    drawBossLevel(g, session.bossState, canvas.width);
  else draw();
  hud();

  requestAnimationFrame(loop);
}

// Starts the animation loop.
export function startLoop() {
  last = performance.now();
  requestAnimationFrame(loop);
}
