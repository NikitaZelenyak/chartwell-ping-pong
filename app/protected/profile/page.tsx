import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Check,
  Crown,
  LockKeyhole,
  Medal,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

import { AchievementsPanel } from "@/components/achievements-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PingPongLoader } from "@/components/ping-pong-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  achievementRewardTier,
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isAvatarUnlocked,
  isInitialsAvatar,
  playerAvatarOptions,
  type AchievementRewardTier,
  type AvatarOption,
} from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { saveProfile, syncMyAchievements } from "../actions";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  doubles_wins: number | null;
  doubles_losses: number | null;
  preferred_hand: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  bio: string | null;
};

type EarnedAchievement = {
  achievement_key: string;
  awarded_at: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function displayPlayer(profile?: Profile | null, fallback = "Player") {
  if (!profile) {
    return fallback;
  }

  return profile.display_name || profile.email || fallback;
}

function ratingBand(rating: number | null) {
  const score = rating ?? 1000;

  if (score >= 1900) {
    return "Elite";
  }

  if (score >= 1500) {
    return "Advanced";
  }

  if (score >= 1200) {
    return "Club";
  }

  return "Rising";
}

async function loadProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,display_name,rating,wins,losses,doubles_wins,doubles_losses,preferred_hand,avatar_style,avatar_seed,bio",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

async function loadAchievements(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_achievements")
    .select("achievement_key,awarded_at")
    .eq("profile_id", userId)
    .order("awarded_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as EarnedAchievement[];
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const [profile, achievements] = await Promise.all([
    loadProfile(user.id),
    loadAchievements(user.id),
  ]);
  const playerName = displayPlayer(profile, user.email ?? "Player");
  const achievementCount = achievements.length;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarThumb
              styleName={profile?.avatar_style}
              seed={profile?.avatar_seed ?? user.id}
              label={playerName}
              className="size-16"
              achievementCount={achievementCount}
            />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Player profile</p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                {playerName}
              </h1>
              {profile?.bio ? (
                <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                  {profile.bio}
                </p>
              ) : null}
            </div>
          </div>
          <Badge variant="secondary">{ratingBand(profile?.rating ?? null)}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:mt-6 sm:grid-cols-5 sm:gap-3">
          <ProfileStat label="Rating" value={profile?.rating ?? 1000} />
          <ProfileStat label="Wins" value={profile?.wins ?? 0} />
          <ProfileStat label="Losses" value={profile?.losses ?? 0} />
          <ProfileStat label="Doubles wins" value={profile?.doubles_wins ?? 0} />
          <ProfileStat label="Doubles losses" value={profile?.doubles_losses ?? 0} />
        </div>
      </section>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserRound className="size-5" />
            Edit profile
          </CardTitle>
          <CardDescription>
            This profile is used for the leaderboard, tournament entry, and
            doubles teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="grid gap-4 md:grid-cols-2">
            <Field
              label="First and last name"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
            />
            <div className="grid gap-2">
              <Label htmlFor="preferred_hand">Preferred hand</Label>
              <select
                id="preferred_hand"
                name="preferred_hand"
                defaultValue={profile?.preferred_hand ?? ""}
                className={selectControlClass}
              >
                <option value="">Choose</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>
            <AvatarPicker
              label="Avatar"
              options={playerAvatarOptions}
              selectedStyle={profile?.avatar_style}
              selectedSeed={profile?.avatar_seed}
              initialsName={profile?.display_name ?? user.email ?? "Player"}
              initialsSeed={profile?.avatar_seed ?? user.id}
              achievementCount={achievementCount}
              className="md:col-span-2"
            />
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile?.bio ?? ""}
                placeholder="Short playing style, availability, or favorite format."
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                <Check className="size-4" />
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardContent className="pt-6">
          <AchievementsPanel achievements={achievements} />
          <div className="mt-5 flex flex-col gap-3 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Already earned something?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sync once to award achievements from existing ratings, wins,
                teams, and tournament history.
              </p>
            </div>
            <form action={syncMyAchievements}>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Sync achievements
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileFallback() {
  return <PingPongLoader label="Loading profile..." className="sm:min-h-[24rem]" />;
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

function AvatarThumb({
  achievementCount = 0,
  styleName,
  seed,
  label,
  className,
}: {
  achievementCount?: number;
  styleName: string | null | undefined;
  seed: string | null | undefined;
  label: string;
  className?: string;
}) {
  const tier = achievementRewardTier(achievementCount);
  const frameClass = avatarFrameClass(tier);

  if (isInitialsAvatar(styleName)) {
    const colors = initialsAvatarColors(seed ?? label);

    return (
      <div className={cn("relative shrink-0", className ?? "size-12")}>
        <div
          aria-label={`${label} initials avatar`}
          className={cn(
            "grid size-full place-items-center rounded-md border font-semibold text-white shadow-sm",
            frameClass,
          )}
          role="img"
          style={colors}
        >
          <span className="text-[clamp(0.75rem,32%,1.8rem)]">
            {initialsForName(label)}
          </span>
        </div>
        <AvatarTierBadge tier={tier} />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className ?? "size-12")}>
      <div
        aria-label={`${label} avatar`}
        className={cn(
          "size-full rounded-md border bg-accent bg-cover bg-center shadow-sm",
          frameClass,
        )}
        role="img"
        style={{
          backgroundImage: `url("${avatarUrl(styleName, seed)}")`,
        }}
      />
      <AvatarTierBadge tier={tier} />
    </div>
  );
}

function AvatarPicker({
  label,
  options,
  selectedStyle,
  selectedSeed,
  initialsName = "Chartwell Player",
  initialsSeed = "chartwell-player",
  achievementCount,
  className,
}: {
  label: string;
  options: AvatarOption[];
  selectedStyle?: string | null;
  selectedSeed?: string | null;
  initialsName?: string;
  initialsSeed?: string;
  achievementCount: number;
  className?: string;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) =>
      isInitialsAvatar(option.style)
        ? option.style === selectedStyle
        : option.style === selectedStyle && option.seed === selectedSeed,
    ),
  );

  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Badge variant="secondary">{achievementCount} achievements</Badge>
      </div>
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
        {options.map((option, index) => {
          const optionSeed = isInitialsAvatar(option.style)
            ? initialsSeed
            : option.seed;
          const optionLabel = isInitialsAvatar(option.style)
            ? initialsName
            : option.label;
          const unlocked = isAvatarUnlocked(option, achievementCount);
          const RewardIcon = tierIcon(option.rewardTier);

          return (
            <label
              className={cn(
                "group rounded-md border bg-background p-2 shadow-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:ring-1 has-[:checked]:ring-primary",
                unlocked
                  ? "cursor-pointer hover:border-primary/60"
                  : "cursor-not-allowed opacity-60",
              )}
              key={`${option.style}-${option.seed}`}
            >
              <input
                className="sr-only"
                defaultChecked={index === selectedIndex}
                disabled={!unlocked}
                name="avatar_choice"
                type="radio"
                value={`${option.style}|${optionSeed}`}
              />
              <div className="relative">
                <AvatarThumb
                  styleName={option.style}
                  seed={optionSeed}
                  label={optionLabel}
                  className="aspect-square w-full"
                />
                {!unlocked ? (
                  <div className="absolute inset-0 grid place-items-center rounded-md bg-background/75 text-muted-foreground backdrop-blur-[1px]">
                    <LockKeyhole className="size-5" />
                  </div>
                ) : null}
              </div>
              <span className="mt-2 block truncate text-center text-xs font-medium">
                {option.label}
              </span>
              {option.minAchievements ? (
                <span
                  className={cn(
                    "mt-1 flex items-center justify-center gap-1 rounded-sm px-1.5 py-1 text-center text-[0.65rem] font-medium",
                    unlocked
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <RewardIcon className="size-3" />
                  {unlocked
                    ? `${tierName(option.rewardTier)} ${providerLabel(option.provider)}`
                    : `Unlock at ${option.minAchievements}`}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function avatarFrameClass(tier: AchievementRewardTier | null) {
  if (tier === "champion") {
    return "ring-4 ring-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.45)]";
  }

  if (tier === "gold") {
    return "ring-4 ring-yellow-300 shadow-[0_0_18px_rgba(234,179,8,0.35)]";
  }

  if (tier === "silver") {
    return "ring-4 ring-slate-300 shadow-[0_0_16px_rgba(148,163,184,0.3)]";
  }

  if (tier === "bronze") {
    return "ring-4 ring-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.28)]";
  }

  return "";
}

function avatarBadgeClass(tier: AchievementRewardTier) {
  if (tier === "champion") {
    return "border-amber-300 bg-amber-400 text-amber-950";
  }

  if (tier === "gold") {
    return "border-yellow-300 bg-yellow-300 text-yellow-950";
  }

  if (tier === "silver") {
    return "border-slate-200 bg-slate-200 text-slate-900";
  }

  return "border-orange-300 bg-orange-300 text-orange-950";
}

function tierName(tier: AchievementRewardTier | undefined) {
  if (tier === "champion") {
    return "Champion";
  }

  if (tier === "gold") {
    return "Gold";
  }

  if (tier === "silver") {
    return "Silver";
  }

  if (tier === "bronze") {
    return "Bronze";
  }

  return "Reward";
}

function AvatarTierBadge({ tier }: { tier: AchievementRewardTier | null }) {
  if (!tier) {
    return null;
  }

  const Icon = tierIcon(tier);

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 grid size-7 place-items-center rounded-full border shadow-sm",
        avatarBadgeClass(tier),
      )}
      title={`${tierName(tier)} achievement tier`}
    >
      <Icon className="size-4" />
    </span>
  );
}

function tierIcon(tier: AchievementRewardTier | undefined) {
  if (tier === "champion") {
    return Crown;
  }

  if (tier === "gold") {
    return Trophy;
  }

  if (tier === "silver") {
    return Sparkles;
  }

  return Medal;
}

function providerLabel(provider: AvatarOption["provider"]) {
  if (provider === "robohash") {
    return "Robohash";
  }

  return "reward";
}
