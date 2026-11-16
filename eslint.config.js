import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { ignores: ["**/.wrangler/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["server/**/*.js"],
    languageOptions: {
      globals: { ...globals.worker, WebSocketPair: "readonly" },
    },
  },
  {
    files: ["tests/worker.test.js"],
    languageOptions: { globals: globals.node },
  },
  eslintConfigPrettier,
];
