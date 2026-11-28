// localStorage persistence for win scores. DOM-free: the browser storage is
// injected, so tests can simulate blocked, full, and damaged storage.
// Saving must never interrupt play: every failure degrades to a status.

const SCORES_KEY = "carniflora.scores";
const RESOLVED_KEY = "carniflora.scoreWins";
const HISTORY_LIMIT = 100;
const RESOLVED_LIMIT = 50;

const FAIL = {
  BLOCKED: "blocked",
  FULL: "full",
  DAMAGED: "damaged",
};

// Set by the most recent failed write, so callers can say why a save failed.
let lastFailure = FAIL.BLOCKED;

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    // Damaged payloads are discarded rather than failing every later save.
    try {
      storage.removeItem(key);
    } catch {
      /* Even removal can be blocked; treat as unreadable. */
    }
    return [];
  }
}

function failureKind(error) {
  const name = String(error?.name || "");
  return /quota/i.test(name) ? FAIL.FULL : FAIL.BLOCKED;
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    lastFailure = failureKind(error);
    return false;
  }
}

// A win is saved at most once per browser, even across refreshes: the
// resolved set remembers both saves and skips for recent win keys.
export function createScoreStorage(storage) {
  function isResolved(winId) {
    return readJson(storage, RESOLVED_KEY).includes(winId);
  }

  function markResolved(winId) {
    const resolved = readJson(storage, RESOLVED_KEY);
    if (resolved.includes(winId)) return true;
    resolved.push(winId);
    while (resolved.length > RESOLVED_LIMIT) resolved.shift();
    return writeJson(storage, RESOLVED_KEY, resolved);
  }

  return {
    // Records one win. Resolves to a reason string when it did not save.
    save(winId, record) {
      if (isResolved(winId)) return { ok: false, reason: "duplicate" };

      const history = readJson(storage, SCORES_KEY);
      history.push({ ...record, winId });
      while (history.length > HISTORY_LIMIT) history.shift();
      if (!writeJson(storage, SCORES_KEY, history)) {
        return { ok: false, reason: lastFailure };
      }
      if (!markResolved(winId)) {
        return { ok: false, reason: lastFailure };
      }
      return { ok: true };
    },

    // Skipping writes no score, but the win is still marked handled so a
    // refresh does not offer the same form again.
    skip(winId) {
      return { ok: markResolved(winId) };
    },

    isResolved,

    loadHistory() {
      return readJson(storage, SCORES_KEY);
    },

    reasons: FAIL,
  };
}

// Browser default; tests inject their own storage instead.
export const scoreStorage = createScoreStorage(
  typeof localStorage === "undefined" ? null : localStorage,
);
