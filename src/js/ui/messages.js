import { dom } from "./dom.js";

export function showPlantMessage(message) {
  const { $ } = dom();
  $("plantMessage").textContent = message;
}
