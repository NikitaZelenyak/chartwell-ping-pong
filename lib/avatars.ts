export type AvatarOption = {
  label: string;
  style: string;
  seed: string;
  provider?: AvatarProvider;
  minAchievements?: number;
  rewardTier?: AchievementRewardTier;
};

export const INITIALS_AVATAR_STYLE = "player-initials";

export type AchievementRewardTier = "bronze" | "silver" | "gold" | "champion";
export type AvatarProvider = "dicebear" | "robohash";

const avatarUnlockTargets = [5, 10, 15];

function rewardAvatar(
  label: string,
  set: "set1" | "set2" | "set3",
  seed: string,
  minAchievements: number,
  rewardTier: AchievementRewardTier,
): AvatarOption {
  return {
    label,
    style: `robohash:${set}`,
    seed,
    provider: "robohash",
    minAchievements,
    rewardTier,
  };
}

export const playerAvatarOptions: AvatarOption[] = [
  { label: "Initials", style: INITIALS_AVATAR_STYLE, seed: "player-initials" },
  { label: "Ace Striker", style: "lorelei", seed: "pingpong-ace-striker" },
  { label: "Topspin Pro", style: "adventurer-neutral", seed: "pingpong-topspin-pro" },
  { label: "Rally Master", style: "personas", seed: "pingpong-rally-master" },
  { label: "Smash Bot", style: "bottts", seed: "pingpong-smash-bot" },
  { label: "Spin Wizard", style: "notionists", seed: "pingpong-spin-wizard" },
  { label: "Paddle Hero", style: "open-peeps", seed: "pingpong-paddle-hero" },
  { label: "Pixel Champ", style: "pixel-art", seed: "pingpong-pixel-champ" },
  { label: "Arcade Ace", style: "fun-emoji", seed: "pingpong-arcade-ace" },
  { label: "Backhand Boss", style: "croodles", seed: "pingpong-backhand-boss" },
  { label: "Serve Star", style: "avataaars", seed: "pingpong-serve-star" },
  { label: "Net Ninja", style: "miniavs", seed: "pingpong-net-ninja" },
  { label: "Loop Legend", style: "dylan", seed: "pingpong-loop-legend" },
  rewardAvatar("Bronze Bot", "set1", "bronze-bot-reward", 5, "bronze"),
  rewardAvatar("Bronze Rally", "set1", "bronze-rally-reward", 5, "bronze"),
  rewardAvatar("Bronze Spin", "set1", "bronze-spin-reward", 5, "bronze"),
  rewardAvatar("Bronze Serve", "set1", "bronze-serve-reward", 5, "bronze"),
  rewardAvatar("Bronze Smash", "set1", "bronze-smash-reward", 5, "bronze"),
  rewardAvatar("Bronze Monster", "set2", "bronze-monster-reward", 5, "bronze"),
  rewardAvatar("Bronze Loop", "set2", "bronze-loop-reward", 5, "bronze"),
  rewardAvatar("Bronze Guard", "set2", "bronze-guard-reward", 5, "bronze"),
  rewardAvatar("Bronze Head", "set3", "bronze-head-reward", 5, "bronze"),
  rewardAvatar("Bronze Ace", "set3", "bronze-ace-reward", 5, "bronze"),
  rewardAvatar("Silver Bot", "set1", "silver-bot-reward", 10, "silver"),
  rewardAvatar("Silver Rally", "set1", "silver-rally-reward", 10, "silver"),
  rewardAvatar("Silver Spin", "set1", "silver-spin-reward", 10, "silver"),
  rewardAvatar("Silver Serve", "set1", "silver-serve-reward", 10, "silver"),
  rewardAvatar("Silver Smash", "set1", "silver-smash-reward", 10, "silver"),
  rewardAvatar("Silver Monster", "set2", "silver-monster-reward", 10, "silver"),
  rewardAvatar("Silver Loop", "set2", "silver-loop-reward", 10, "silver"),
  rewardAvatar("Silver Guard", "set2", "silver-guard-reward", 10, "silver"),
  rewardAvatar("Silver Head", "set3", "silver-head-reward", 10, "silver"),
  rewardAvatar("Silver Ace", "set3", "silver-ace-reward", 10, "silver"),
  rewardAvatar("Gold Bot", "set1", "gold-bot-reward", 15, "gold"),
  rewardAvatar("Gold Rally", "set1", "gold-rally-reward", 15, "gold"),
  rewardAvatar("Gold Spin", "set1", "gold-spin-reward", 15, "gold"),
  rewardAvatar("Gold Serve", "set1", "gold-serve-reward", 15, "gold"),
  rewardAvatar("Gold Smash", "set1", "gold-smash-reward", 15, "gold"),
  rewardAvatar("Gold Monster", "set2", "gold-monster-reward", 15, "gold"),
  rewardAvatar("Gold Loop", "set2", "gold-loop-reward", 15, "gold"),
  rewardAvatar("Gold Guard", "set2", "gold-guard-reward", 15, "gold"),
  rewardAvatar("Gold Head", "set3", "gold-head-reward", 15, "gold"),
  rewardAvatar("Gold Ace", "set3", "gold-ace-reward", 15, "gold"),
];

export const tournamentAvatarOptions: AvatarOption[] = [
  { label: "Knockout Cup", style: "shapes", seed: "pingpong-knockout-cup" },
  { label: "Ladder Night", style: "identicon", seed: "pingpong-ladder-night" },
  { label: "Robot Rally", style: "bottts", seed: "pingpong-robot-rally" },
  { label: "Club Badge", style: "icons", seed: "pingpong-club-badge" },
  { label: "Neon Table", style: "rings", seed: "pingpong-neon-table" },
  { label: "Duel Mode", style: "glass", seed: "pingpong-duel-mode" },
  { label: "Arcade Cup", style: "thumbs", seed: "pingpong-arcade-cup" },
  { label: "Spin League", style: "initials", seed: "SPIN" },
];

const allowedStyles = new Set([
  ...playerAvatarOptions.map((option) => option.style),
  ...tournamentAvatarOptions.map((option) => option.style),
]);

export function avatarUrl(style: string | null | undefined, seed: string | null | undefined) {
  if (isInitialsAvatar(style)) {
    return "";
  }

  const safeStyle = style && allowedStyles.has(style) ? style : "lorelei";
  const safeSeed = seed?.trim() || "chartwell-ping-pong";

  if (safeStyle.startsWith("robohash:")) {
    const set = safeStyle.split(":")[1] || "set1";
    return `https://robohash.org/${encodeURIComponent(safeSeed)}.png?set=${encodeURIComponent(set)}&size=300x300`;
  }

  return `https://api.dicebear.com/10.x/${safeStyle}/svg?seed=${encodeURIComponent(safeSeed)}`;
}

export function safeAvatarStyle(value: FormDataEntryValue | null, fallback: string) {
  const style = String(value ?? "");
  return allowedStyles.has(style) ? style : fallback;
}

export function safeAvatarSeed(value: FormDataEntryValue | null, fallback: string) {
  const seed = String(value ?? "").trim();
  return seed.length > 0 && seed.length <= 80 ? seed : fallback;
}

export function achievementRewardTier(
  achievementCount: number,
): AchievementRewardTier | null {
  if (achievementCount >= 20) {
    return "champion";
  }

  if (achievementCount >= 15) {
    return "gold";
  }

  if (achievementCount >= 10) {
    return "silver";
  }

  if (achievementCount >= 5) {
    return "bronze";
  }

  return null;
}

export function isAvatarUnlocked(option: AvatarOption, achievementCount: number) {
  return achievementCount >= (option.minAchievements ?? 0);
}

export function availablePlayerAvatarOptions(achievementCount: number) {
  return playerAvatarOptions.filter((option) =>
    isAvatarUnlocked(option, achievementCount),
  );
}

export function nextAvatarUnlockTarget(achievementCount: number) {
  return avatarUnlockTargets.find((target) => achievementCount < target) ?? null;
}

export function findPlayerAvatarOption(
  style: string | null | undefined,
  seed: string | null | undefined,
) {
  if (isInitialsAvatar(style)) {
    return playerAvatarOptions.find((option) => option.style === INITIALS_AVATAR_STYLE);
  }

  return playerAvatarOptions.find(
    (option) => option.style === style && option.seed === seed,
  );
}

export function isInitialsAvatar(style: string | null | undefined) {
  return style === INITIALS_AVATAR_STYLE;
}

export function initialsForName(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return "CP";
}

export function initialsAvatarColors(seed: string | null | undefined) {
  const text = seed?.trim() || "chartwell-ping-pong";
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 360;
  }

  const hue = hash;
  const accentHue = (hash + 42) % 360;

  return {
    background: `linear-gradient(135deg, hsl(${hue} 88% 54%), hsl(${accentHue} 94% 64%))`,
    color: "white",
  };
}
