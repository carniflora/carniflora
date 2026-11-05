import { state } from "./state.js";

export const maxSpores = () => (state.players === 2 ? 180 : 120); // set the number of spores available for the level (180 for 2 players or 120 for 1)
