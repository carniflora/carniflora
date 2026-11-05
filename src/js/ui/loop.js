import { dom } from "./dom.js";
import { session, activePhase } from "./session.js";
import { state, update } from "../game.js";
import { updateBossLevel, drawBossLevel } from "../bossLevel.js";
import { LEVEL_PATHS } from "../path.js";
import { show } from "./overlay.js";
import { draw } from "./render.js";
import { hud } from "./hud.js";

let lastPhase = null;

// store timestamp of previous frame
let last = performance.now();

// Forces the next frame to re-evaluate the phase change, so a restarted
// level still shows its win/lose overlay.
export function resetPhase() {
  lastPhase = null;
}

function loop(timer) {
  const { canvas, ctx: g } = dom();
  const deltaTime = Math.min(0.05, (timer - last) / 1000);
  last = timer;
  if (session.mode === "boss") updateBossLevel(session.bossState, deltaTime);
  else if (activePhase() === "play") update(deltaTime);

  // check if game is ended
  const phase = activePhase();
  if (phase !== lastPhase) {
    if (session.mode === "boss" && phase === "won")
      show(
        "Harvester breached",
        `The garden is reclaimed in ${Math.ceil(session.bossState.elapsed)} seconds. ${session.bossState.stats.deployed} plants deployed; ${session.bossState.stats.lost} lost (${session.bossState.stats.mistLost} to mist).`,
        "Retry Boss",
      );
    else if (session.mode === "boss" && phase === "lost")
      show(
        "The mist caught up",
        `The battlefield was overrun with ${Math.ceil(session.bossState.boss.hp)} boss HP remaining. Deploy early and combine plant abilities to push farther.`,
        "Retry Boss",
      );
    else if (phase === "won")
      show(
        "Keep breached",
        "Level " + state.level + " cleared.",
        state.level < LEVEL_PATHS.length ? "Next level" : "Replay level",
      );
    else if (phase === "lost")
      show(
        "The swarm withered",
        "No plants left and not enough spores.",
        "Retry",
      );
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
