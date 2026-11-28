// After-win score screen inside the battle overlay. Owns nothing about the
// battle: loop.js captures the result, this module renders it and stores it.
import { dom } from "./dom.js";
import { computeScore, modeLabel } from "../score.js";
import { scoreStorage } from "../scoreStorage.js";
import { activePhase } from "./session.js";

const NICKNAME_MAX = 12;
const SAVE_FAILURES = {
  blocked: "storage is blocked in this browser",
  full: "storage is full",
  duplicate: "already saved",
};

let pending = null;

// Online only: a peer can change the room while this form is open.
let queuedWin = null;
let heldOverlay = null;
let storage = scoreStorage;
let nextActionWasVisible = false;

function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = String(whole % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function levelLabel(result) {
  return result.isBoss
    ? "Boss"
    : `Mission ${String(result.level).padStart(2, "0")}`;
}

// The progression buttons return exactly as the win screen left them.
function setProgressionHidden(hidden) {
  const { $ } = dom();
  $("ob").hidden = hidden;
  $("ob2").hidden = hidden || !nextActionWasVisible;
}

// Keeps the form open so the player can correct the input.
function showError(message) {
  const { $ } = dom();
  const confirm = $("scoreConfirm");
  confirm.textContent = message;
  confirm.dataset.status = "error";
  confirm.hidden = false;
}

// Replay what the peer did while the form was open. A running battle takes
// the screen; a held pause or session end redraws instead.
function releaseOverlay() {
  const redraw = heldOverlay;
  const next = queuedWin;
  heldOverlay = null;
  queuedWin = null;

  if (next) {
    present(next);
    return;
  }
  if (redraw) {
    redraw();
    return;
  }
  if (activePhase() !== "won") {
    dom().$("ov").classList.add("hide");
  }
}

// Ends the form's turn: Save or Skip has been handled.
function resolveWin(message, isError = false) {
  const { $ } = dom();
  const confirm = $("scoreConfirm");
  confirm.textContent = message;
  confirm.dataset.status = isError ? "error" : "ok";
  confirm.hidden = false;
  $("scoreForm").hidden = true;
  setProgressionHidden(false);
  pending = null;
  releaseOverlay();
}

// Trimmed, non-empty, at most 12 characters. Rendered via textContent only.
function collectNicknames(result) {
  const { $ } = dom();
  const inputs = [$("scoreName1")];
  if (result.players === 2) {
    inputs.push($("scoreName2"));
  }

  const names = inputs.map((input) =>
    input.value.trim().slice(0, NICKNAME_MAX),
  );
  const empty = inputs.find((input, index) => !names[index]);
  if (empty) {
    empty.value = "";
    empty.focus();
    showError("Enter a nickname for each player.");
    return null;
  }
  return names;
}

function saveResult(event) {
  event.preventDefault();
  if (!pending) return;

  const names = collectNicknames(pending);
  if (!names) return;

  const outcome = storage.save(pending.winId, {
    mode: modeLabel(pending.online, pending.players),
    level: pending.isBoss ? "boss" : pending.level,
    nicknames: names,
    score: pending.score.total,
    time: Math.floor(pending.elapsed),
    spores: Math.floor(pending.spores),
    plantsLost: pending.plantsLost,
    date: new Date().toISOString(),
  });

  if (outcome.ok) {
    resolveWin(`Saved for ${names.join(" & ")}.`);
  } else if (outcome.reason === "duplicate") {
    resolveWin("Already saved.");
  } else {
    const why = SAVE_FAILURES[outcome.reason] || "saving failed";
    resolveWin(`Score not saved — ${why}.`, true);
  }
}

function skipResult() {
  if (!pending) return;
  storage.skip(pending.winId);
  resolveWin("Skipped — nothing was saved.");
}

// Show the form for a win. Presenting the same win again (repeated online
// snapshots, a reconnect) keeps the form and the typing untouched.
export function present(result) {
  const { $ } = dom();
  if (pending && pending.winId === result.winId) {
    return;
  }
  // Already saved or skipped, e.g. after a refresh.
  if (storage.isResolved(result.winId)) {
    return;
  }
  if (pending?.online) {
    queuedWin = result;
    return;
  }
  pending = { ...result, score: computeScore(result) };
  nextActionWasVisible = !$("ob2").hidden;

  const score = pending.score;
  $("scoreMode").textContent = modeLabel(pending.online, pending.players);
  $("scoreLevel").textContent = levelLabel(pending);
  $("scoreTime").textContent = clock(pending.elapsed);
  $("scoreSpores").textContent = String(score.sporeBonus);
  $("scoreLost").textContent = String(pending.plantsLost);
  $("scoreTotal").textContent = String(score.total);

  $("scoreConfirm").hidden = true;
  $("scoreForm").hidden = false;
  $("scorePanel").hidden = false;
  $("scoreName2Field").hidden = pending.players !== 2;
  if (pending.players === 1) {
    $("scoreName2").value = "";
  }
  setProgressionHidden(true);
  $("scoreName1").focus();
}

// Any non-win overlay (pause, loss, menu, session end) hides the score UI.
// Called from show(), the single place every overlay redraw goes through.
export function resetScoreScreen() {
  pending = null;
  queuedWin = null;
  heldOverlay = null;
  const { $ } = dom();
  $("scorePanel").hidden = true;
  $("ob").hidden = false;
}

export function hasPending() {
  return pending !== null;
}

// While an online win awaits Save/Skip, peer actions advance the server but
// must not close this player's form. Only the latest redraw is kept.
export function holdOverlay(redraw) {
  if (!pending?.online || activePhase() === "won") {
    return false;
  }
  heldOverlay = redraw;
  return true;
}

export function mountScoreScreen(injectedStorage = undefined) {
  if (injectedStorage) {
    storage = injectedStorage;
  }
  const { $ } = dom();
  $("scoreForm").addEventListener("submit", saveResult);
  $("scoreSkip").addEventListener("click", skipResult);
}
