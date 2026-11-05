export const plantImages = [
  "./assets/plants/flytrap.png",
  "./assets/plants/sundew.png",
  "./assets/plants/pitcher.png",
  "./assets/plants/rafflesia.png",
];

//==========================================
//   PLANT PROGRESSION DATA
//==========================================

export const plantProgression = [
  {
    name: "Flytrap",
    level: 1,
    role: "Frontline",
    description:
      "A tough plant that attacks enemies up close and can withstand damage.",
    image: "./assets/plants/flytrap.png",
    cost: 0,
  },

  {
    name: "Sundew",
    level: 2,
    role: "Support",
    description:
      "A specialized plant that helps control enemies during battle.",
    image: "./assets/plants/sundew.png",
    cost: 200,
  },

  {
    name: "Pitcher",
    level: 3,
    role: "Defender",
    description:
      "A resilient plant that strengthens your strategy as levels progress.",
    image: "./assets/plants/pitcher.png",
    cost: 300,
  },
  {
    name: "Rafflesia",
    level: 4,
    role: "Boss",
    description:
      "A powerful plant with abilities designed for tougher battles.",
    image: "./assets/plants/rafflesia.png",
    cost: 400,
  },
];

export const plantRoles = [
  "Strong Attacker", // Flytrap
  "Slows Towers", // Sundew
  "Protects & Heals", // Pitcher
  "Splash Damage", // Rafflesia
];

// Lucide icons for each combat role
export const plantRoleIcons = [
  "icon-shield", // Flytrap
  "icon-crosshair", // Sundew
  "icon-heart-pulse", // Pitcher
  "icon-bomb", // Rafflesia
];
