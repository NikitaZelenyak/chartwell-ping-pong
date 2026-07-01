import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Crown, Medal, Sparkles, Swords, Trophy } from "lucide-react";

import { AchievementsPanel } from "@/components/achievements-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PingPongLoader } from "@/components/ping-pong-loader";
import {
  achievementRewardTier,
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
  type AchievementRewardTier,
} from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

type DoublesTeam = {
  id: string;
  name: string;
  player_one_id: string;
  player_two_id: string;
  rating: number | null;
  wins: number | null;
  losses: number | null;
};

function displayPlayer(profile?: Profile | null) {
  return profile?.display_name || profile?.email || "Player";
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

async function loadPlayerCard(id: string) {
  const supabase = await createClient();

  const [profileResult, achievementsResult, teamsResult, allProfilesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,email,display_name,rating,wins,losses,doubles_wins,doubles_losses,preferred_hand,avatar_style,avatar_seed,bio",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("profile_achievements")
        .select("achievement_key,awarded_at")
        .eq("profile_id", id)
        .order("awarded_at", { ascending: false }),
      supabase
        .from("doubles_teams")
        .select("id,name,player_one_id,player_two_id,rating,wins,losses")
        .or(`player_one_id.eq.${id},player_two_id.eq.${id}`)
        .order("rating", { ascending: false }),
      supabase.from("profiles").select("id,email,display_name"),
    ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  return {
    achievements: (achievementsResult.data ?? []) as EarnedAchievement[],
    allProfiles: (allProfilesResult.data ?? []) as Pick<
      Profile,
      "id" | "email" | "display_name"
    >[],
    profile: profileResult.data as Profile | null,
    teams: (teamsResult.data ?? []) as DoublesTeam[],
  };
}

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PlayerProfileFallback />}>
      <PlayerProfileContent params={params} />
    </Suspense>
  );
}

async function PlayerProfileContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadPlayerCard(id);

  if (!data.profile) {
    notFound();
  }

  const playerName = displayPlayer(data.profile);
  const profilesById = new Map(data.allProfiles.map((profile) => [profile.id, profile]));
  const achievementCount = data.achievements.length;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href="/protected">
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </Button>

      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarThumb
              styleName={data.profile.avatar_style}
              seed={data.profile.avatar_seed ?? data.profile.id}
              label={playerName}
              className="size-20"
              achievementCount={achievementCount}
            />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Player card</p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                {playerName}
              </h1>
              {data.profile.bio ? (
                <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                  {data.profile.bio}
                </p>
              ) : null}
            </div>
          </div>
          <Badge variant="secondary">{ratingBand(data.profile.rating)}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:mt-6 sm:grid-cols-5 sm:gap-3">
          <ProfileStat label="Rating" value={data.profile.rating ?? 1000} />
          <ProfileStat label="Wins" value={data.profile.wins ?? 0} />
          <ProfileStat label="Losses" value={data.profile.losses ?? 0} />
          <ProfileStat label="Doubles wins" value={data.profile.doubles_wins ?? 0} />
          <ProfileStat
            label="Doubles losses"
            value={data.profile.doubles_losses ?? 0}
          />
        </div>
      </section>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Swords className="size-5" />
            Doubles teams
          </CardTitle>
          <CardDescription>Accepted teams this player belongs to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.teams.map((team) => {
            const partnerId =
              team.player_one_id === data.profile?.id
                ? team.player_two_id
                : team.player_one_id;
            const partner = profilesById.get(partnerId);

            return (
              <div className="rounded-md border p-4" key={team.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Partner:{" "}
                      <Link
                        href={`/protected/players/${partnerId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {partner?.display_name || partner?.email || "Player"}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {team.wins ?? 0}-{team.losses ?? 0} team record
                    </p>
                  </div>
                  <Badge variant="secondary">{team.rating ?? 1000}</Badge>
                </div>
              </div>
            );
          })}
          {data.teams.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No accepted doubles teams yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="size-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AchievementsPanel achievements={data.achievements} />
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerProfileFallback() {
  return <PingPongLoader label="Loading player card..." className="sm:min-h-[24rem]" />;
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
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

function tierName(tier: AchievementRewardTier) {
  if (tier === "champion") {
    return "Champion";
  }

  if (tier === "gold") {
    return "Gold";
  }

  if (tier === "silver") {
    return "Silver";
  }

  return "Bronze";
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

function tierIcon(tier: AchievementRewardTier) {
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
