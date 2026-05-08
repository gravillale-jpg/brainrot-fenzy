export const RARITIES = ["common", "uncommon", "rare", "epic", "mythic", "legendary", "secret"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<Rarity, { ru: string; en: string }> = {
  common: { ru: "Обычный", en: "Common" },
  uncommon: { ru: "Необычный", en: "Uncommon" },
  rare: { ru: "Редкий", en: "Rare" },
  epic: { ru: "Эпический", en: "Epic" },
  mythic: { ru: "Мифический", en: "Mythic" },
  legendary: { ru: "Легендарный", en: "Legendary" },
  secret: { ru: "Секретный", en: "Secret" },
};

export const RARITY_GRADIENT: Record<Rarity, string> = {
  common: "from-slate-400 to-slate-600",
  uncommon: "from-emerald-400 to-emerald-600",
  rare: "from-sky-400 to-blue-600",
  epic: "from-fuchsia-400 to-purple-600",
  mythic: "from-rose-400 to-red-600",
  legendary: "from-amber-300 to-orange-500",
  secret: "from-pink-400 via-purple-500 to-indigo-500",
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common: "shadow-[0_0_20px_rgba(148,163,184,0.4)]",
  uncommon: "shadow-[0_0_24px_rgba(52,211,153,0.55)]",
  rare: "shadow-[0_0_28px_rgba(56,189,248,0.6)]",
  epic: "shadow-[0_0_32px_rgba(217,70,239,0.65)]",
  mythic: "shadow-[0_0_36px_rgba(251,113,133,0.7)]",
  legendary: "shadow-[0_0_42px_rgba(251,191,36,0.8)]",
  secret: "shadow-[0_0_56px_rgba(236,72,153,0.85)]",
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, mythic: 4, legendary: 5, secret: 6,
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60, uncommon: 22, rare: 11, epic: 5, mythic: 1.5, legendary: 0.4, secret: 0.1,
};
