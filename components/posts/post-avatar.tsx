import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
} from "@/lib/avatars";
import { displayCommunityProfile, type CommunityProfile } from "@/lib/posts";
import { cn } from "@/lib/utils";

export function PostAvatar({
  profile,
  className,
}: {
  profile: CommunityProfile;
  className?: string;
}) {
  const label = displayCommunityProfile(profile);

  if (isInitialsAvatar(profile.avatarStyle)) {
    return (
      <span
        aria-label={`${label} initials avatar`}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md border text-xs font-semibold text-white shadow-sm",
          className,
        )}
        role="img"
        style={initialsAvatarColors(profile.avatarSeed ?? label)}
      >
        {initialsForName(label)}
      </span>
    );
  }

  return (
    <span
      aria-label={`${label} avatar`}
      className={cn(
        "size-10 shrink-0 rounded-md border bg-accent bg-cover bg-center shadow-sm",
        className,
      )}
      role="img"
      style={{
        backgroundImage: `url("${avatarUrl(
          profile.avatarStyle,
          profile.avatarSeed ?? profile.id,
        )}")`,
      }}
    />
  );
}
