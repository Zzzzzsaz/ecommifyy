export const CS_RANKS = [
  { name: "Silver I", min: 0, max: 5000, color: "#7D7D7D", icon: "S1" },
  { name: "Silver II", min: 5000, max: 10000, color: "#8B8B8B", icon: "S2" },
  { name: "Silver III", min: 10000, max: 15000, color: "#9A9A9A", icon: "S3" },
  { name: "Silver IV", min: 15000, max: 25000, color: "#ABABAB", icon: "S4" },
  { name: "Gold Nova I", min: 25000, max: 40000, color: "#C5960C", icon: "GN1" },
  { name: "Gold Nova II", min: 40000, max: 55000, color: "#D4A017", icon: "GN2" },
  { name: "Gold Nova III", min: 55000, max: 70000, color: "#E6B422", icon: "GN3" },
  { name: "Gold Nova Master", min: 70000, max: 85000, color: "#FFD700", icon: "GNM" },
  { name: "Master Guardian I", min: 85000, max: 105000, color: "#4A90D9", icon: "MG1" },
  { name: "Master Guardian II", min: 105000, max: 125000, color: "#5BA3EC", icon: "MG2" },
  { name: "MG Elite", min: 125000, max: 150000, color: "#6DB6FF", icon: "MGE" },
  { name: "DMG", min: 150000, max: 175000, color: "#9B59B6", icon: "DMG" },
  { name: "Legendary Eagle", min: 175000, max: 195000, color: "#E74C3C", icon: "LE" },
  { name: "LE Master", min: 195000, max: 215000, color: "#FF4444", icon: "LEM" },
  { name: "Supreme", min: 215000, max: 235000, color: "#F39C12", icon: "SMFC" },
  { name: "Global Elite", min: 235000, max: Infinity, color: "#27AE60", icon: "GE" },
];

export const TARGET = 250000;

export const getRank = (revenue) => CS_RANKS.find((r) => revenue >= r.min && revenue < r.max) || CS_RANKS[0];

export const getRankIndex = (revenue) => CS_RANKS.findIndex((r) => revenue >= r.min && revenue < r.max);

export const getNextRank = (revenue) => {
  const idx = getRankIndex(revenue);
  return idx >= 0 && idx < CS_RANKS.length - 1 ? CS_RANKS[idx + 1] : null;
};

export const getRankProgress = (revenue) => {
  const rank = getRank(revenue);
  if (rank.max === Infinity) return 100;
  return Math.min(((revenue - rank.min) / (rank.max - rank.min)) * 100, 100);
};
