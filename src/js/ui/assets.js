export const plantImages = [
  "./assets/plants/flytrap-icon.png",
  "./assets/plants/sundew-icon.png",
  "./assets/plants/pitcher-icon.png",
  "./assets/plants/rafflesia-icon.png",
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
    image: "./assets/plants/flytrap-icon.png",
    cost: 0,
  },

  {
    name: "Sundew",
    level: 2,
    role: "Support",
    description:
      "A specialized plant that helps control enemies during battle.",
    image: "./assets/plants/sundew-icon.png",
    cost: 200,
  },

  {
    name: "Pitcher",
    level: 3,
    role: "Defender",
    description:
      "A resilient plant that strengthens your strategy as levels progress.",
    image: "./assets/plants/pitcher-icon.png",
    cost: 300,
  },
  {
    name: "Rafflesia",
    level: 4,
    role: "Boss",
    description:
      "A powerful plant with abilities designed for tougher battles.",
    image: "./assets/plants/rafflesia-icon.png",
    cost: 400,
  },
];

export const plantDiscovery = [
  {
    territory: "Green Awakening",
    ability: "Powerful close-range attacks.",
    tip: "Deploy first to protect your supporting plants.",
  },
  {
    territory: "Golden Marsh",
    ability: "Slows enemy towers.",
    tip: "Deploy alongside Flytrap to help your army advance.",
  },
  {
    territory: "Crystal Wetlands",
    ability: "Protects and heals nearby friendly plants.",
    tip: "Keep your frontline plants alive for longer.",
  },
  {
    territory: "Crimson Fortress",
    ability: "Deals powerful splash damage.",
    tip: "Deploy against groups of nearby enemies.",
  },
];

export const plantRoles = [
  "Strong Attacker", // Flytrap
  "Slows Towers", // Sundew
  "Protects & Heals", // Pitcher
  "Splash Damage", // Rafflesia
];

export const plantRoleIcons = [
  "icon-shield", // Flytrap
  "icon-crosshair", // Sundew
  "icon-heart-pulse", // Pitcher
  "icon-bomb", // Rafflesia
];
