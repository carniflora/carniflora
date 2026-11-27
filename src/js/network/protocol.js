export const VERSION = 1;
export const KEY_LENGTH = 12;
export const KEY_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
export const HEARTBEAT_MS = 15_000;
export const TIMEOUT_MS = 45_000;
export const GRACE_MS = 120_000;
export const LOBBY_MS = 600_000;
export const STEP_MS = 20;
export const SNAPSHOT_MS = 50;
export const MAX_MESSAGE = 4096;
export const MAX_RATE = 60;
export const MAX_PENDING = 100;
export const CLOSE = {
  NORMAL: 1000,
  POLICY: 1008,
  RETRY: 1013,
  CLIENT_RETRY: 4000,
};
export const HTTP = {
  OK: 200,
  CREATED: 201,
  UPGRADE: 101,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  TOO_LARGE: 413,
  METHOD: 405,
};

export const Action = {
  PLACE: "place",
  DEPLOY: "deploy",
  LANE: "lane",
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  RESTART: "restart",
  ADVANCE: "advance",
  LEAVE: "leave",
};
