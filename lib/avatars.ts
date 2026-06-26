export type AvatarOption = {
  label: string;
  style: string;
  seed: string;
};

export const INITIALS_AVATAR_STYLE = "player-initials";

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
