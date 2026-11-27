import { battleService } from "../battleService.js";
import { state, normalLevel, BOSS_LEVEL } from "../state.js";
import { build } from "../build.js";
import { MAP_COLS, MAP_ROWS, TILE } from "../constants.js";
import { session } from "./session.js";
import { dom, resizeCanvas } from "./dom.js";
import { setActiveTab, showPlantDetails } from "./tabs.js";
import { restoreCampaign, setPlayers } from "./flow.js";
import { show, showPlantMessage } from "./hud.js";

export function mountMultiplayer() {
  const { $ } = dom();
  const status = $("networkStatus");
  let busy = false;
  let overlayStamp = null;

  function controls() {
    const online = battleService.online();
    const waiting = online && !battleService.ready();
    $("createSession").disabled = busy || online;
    $("joinSession").disabled = busy || online;
    $("sessionKey").disabled = busy || online;
    $("copySession").hidden = !online;
    $("leaveSession").hidden = !online;
    $("playerToggle").disabled = online;
    $("bm").disabled = online;
    for (const id of ["ob", "pz", "rs"]) {
      $(id).disabled = waiting;
    }
  }

  battleService.mount({
    enter(key) {
      overlayStamp = null;
      session.mode = "td";
      state.phase = "menu";
      setPlayers(2);
      if (state.level === BOSS_LEVEL) {
        state.level = normalLevel(state.level);
        build();
      }
      resizeCanvas(MAP_COLS * TILE, MAP_ROWS * TILE);
      $("bossControls").hidden = true;
      $("battleTitle").textContent = "Online Battle";
      $("battleHint").textContent =
        "Each browser controls its assigned player. Spores are shared.";
      $("bm").textContent = "Boss Battle";
      $("bm").setAttribute("aria-pressed", "false");
      $("sessionKey").value = key;
      showPlantDetails(session.selectedPlantIndex ?? 0);
      setActiveTab("battle");
      show("Online session", "Connecting…", "Start");
      controls();
    },
    player(player) {
      session.activePlayer = player;
      showPlantMessage(
        `Player ${player + 1}: place a tower beside the path, then deploy.`,
      );
    },
    status(message) {
      status.textContent = message;
      controls();
    },
    error(message) {
      showPlantMessage(message);
    },
    snapshot(message) {
      const text = `Player ${session.activePlayer + 1} · ${battleService.key()} · ${message.ready ? "Connected" : "Waiting for other player"}`;
      if (status.textContent !== text) {
        status.textContent = text;
      }
      controls();
      const stamp = `${state.phase}:${message.ready}:${message.snapshot.generation}`;
      if (overlayStamp === stamp) {
        return;
      }
      overlayStamp = stamp;
      if (state.phase === "menu") {
        show(
          "Online session",
          message.ready
            ? "Both players connected."
            : "Share the key with Player 2.",
          "Start",
        );
      } else if (state.phase === "pause") {
        show(
          "Paused",
          message.ready
            ? "Either player can resume."
            : "Waiting for the other player to reconnect (two minutes).",
          "Resume",
        );
      } else if (state.phase === "play") {
        $("ov").classList.add("hide");
      }
      controls();
    },
    end(reason) {
      session.activePlayer = 0;
      setPlayers(1);
      restoreCampaign();
      status.textContent = reason;
      show("Session ended", reason, "Start local battle");
      controls();
    },
  });

  async function run(action) {
    if (busy || battleService.online()) {
      return;
    }
    busy = true;
    controls();
    try {
      await action();
    } catch (error) {
      status.textContent = error.message;
    }
    busy = false;
    controls();
  }

  $("createSession").onclick = () => run(() => battleService.create());
  $("joinForm").onsubmit = (event) => {
    event.preventDefault();
    void run(() => battleService.join($("sessionKey").value));
  };
  $("copySession").onclick = async () => {
    try {
      await navigator.clipboard.writeText(battleService.key());
      showPlantMessage("Session key copied.");
    } catch {
      status.textContent = `Share this key: ${battleService.key()}`;
    }
  };
  $("leaveSession").onclick = () => battleService.leave();

  // Close the multiplayer lobby.
  function closeMultiplayerLobby() {
    const panel = document.querySelector(".network-panel");
    const toggle = $("networkToggle");

    if (!panel?.classList.contains("is-open")) {
      return;
    }

    panel.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.focus();
  }

  // Close using the X button.
  $("closeMultiplayerBtn")?.addEventListener("click", closeMultiplayerLobby);

  // Close using the Escape key.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMultiplayerLobby();
    }
  });

  battleService.restore();
  controls();
}
