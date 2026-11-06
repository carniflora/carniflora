import { dom } from "./dom.js";

export function show(t, m, b) {
  const { $ } = dom();
  $("ot").textContent = t;
  $("om").textContent = m;
  $("ob").textContent = b;
  $("ov").classList.remove("hide");
  $("ob").focus();
}
