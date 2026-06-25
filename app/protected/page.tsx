import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  Check,
  CircleGauge,
  Send,
  ShieldAlert,
  Swords,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
} from "@/lib/avatars";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import { reportMatch } from "./actions";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  preferred_hand: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  bio: string | null;
};

type Tournament = {
  id: string;
  name: string;
  venue: string | null;
  starts_at: string | null;
  max_players: number | null;
  skill_floor: number | null;
  skill_ceiling: number | null;
  status: string | null;
  organizer_id: string;
  avatar_style: string | null;
  avatar_seed: string | null;
  format: string | null;
};

type TournamentEntry = {
  tournament_id: string;
  user_id: string;
  status: string | null;
};

type MatchInvite = {
  id: string;
  created_by: string;
  opponent_id: string;
  status: string | null;
  scheduled_for: string | null;
  location: string | null;
  note: string | null;
  created_at: string | null;
};

type Match = {
  id: string;
  player_one_id: string;
  player_two_id: string;
  winner_id: string;
  loser_id: string;
  player_one_score: number | null;
  player_two_score: number | null;
  score_summary: string | null;
  rating_delta: number | null;
  tournament_id: string | null;
  created_at: string | null;
};

type DashboardData = {
  profiles: Profile[];
  tournaments: Tournament[];
  entries: TournamentEntry[];
  invites: MatchInvite[];
  matches: Match[];
  setupError: string | null;
};

function displayPlayer(profile?: Profile) {
  if (!profile) {
    return "Unknown player";
  }

  return profile.display_name || profile.email || "Player";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date to be announced";
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

async function loadDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const setupErrors: string[] = [];

  const [
    profilesResult,
    tournamentsResult,
    entriesResult,
    invitesResult,
    matchesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,display_name,rating,wins,losses,preferred_hand,avatar_style,avatar_seed,bio",
      )
      .order("rating", { ascending: false }),
    supabase
      .from("tournaments")
      .select(
        "id,name,venue,starts_at,max_players,skill_floor,skill_ceiling,status,organizer_id,avatar_style,avatar_seed,format",
      )
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("tournament_entries")
      .select("tournament_id,user_id,status"),
    supabase
      .from("match_invites")
      .select(
        "id,created_by,opponent_id,status,scheduled_for,location,note,created_at",
      )
      .or(`created_by.eq.${userId},opponent_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select(
        "id,player_one_id,player_two_id,winner_id,loser_id,player_one_score,player_two_score,score_summary,rating_delta,tournament_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  for (const result of [
    profilesResult,
    tournamentsResult,
    entriesResult,
    invitesResult,
    matchesResult,
  ]) {
    if (result.error) {
      setupErrors.push(result.error.message);
    }
  }

  return {
    profiles: (profilesResult.data ?? []) as Profile[],
    tournaments: (tournamentsResult.data ?? []) as Tournament[],
    entries: (entriesResult.data ?? []) as TournamentEntry[],
    invites: (invitesResult.data ?? []) as MatchInvite[],
    matches: (matchesResult.data ?? []) as Match[],
    setupError: setupErrors[0] ?? null,
  };
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadDashboardData(user.id);
  const profilesById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const myProfile = profilesById.get(user.id);
  const rivals = data.profiles.filter((profile) => profile.id !== user.id);
  const myEntries = new Set(
    data.entries
      .filter((entry) => entry.user_id === user.id)
      .map((entry) => entry.tournament_id),
  );
  const joinedTournaments = data.tournaments.filter((tournament) =>
    myEntries.has(tournament.id),
  );
  const acceptedInvites = data.invites.filter(
    (invite) => invite.status === "accepted",
  );
  const openInvites = data.invites.filter(
    (invite) => invite.status === "pending",
  );

  return (
    <div className="w-full space-y-6 sm:space-y-10">
      {data.setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Supabase tables are not ready yet.</p>
            <p className="mt-1 break-words">
              Apply the latest Supabase migration in{" "}
              <span className="font-mono">supabase/migrations</span>, then
              refresh this page. Supabase returned: {data.setupError}
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border bg-card p-4 sm:p-5 md:col-span-2">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarThumb
                styleName={myProfile?.avatar_style}
                seed={myProfile?.avatar_seed ?? user.id}
                label={displayPlayer(myProfile)}
                className="size-16"
              />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Player profile</p>
                <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                  {displayPlayer(myProfile) || user.email}
                </h1>
              </div>
            </div>
            <Badge variant="secondary">{ratingBand(myProfile?.rating ?? null)}</Badge>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm sm:mt-6 sm:gap-3">
            <div>
              <p className="text-muted-foreground">Rating</p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">
                {myProfile?.rating ?? 1000}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Wins</p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">{myProfile?.wins ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Losses</p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">
                {myProfile?.losses ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/protected/profile">Edit profile</Link>
            </Button>
          </div>
        </div>
        <StatTile
          icon={<Trophy className="size-5" />}
          label="Open tournaments"
          value={data.tournaments.filter((item) => item.status === "open").length}
        />
        <StatTile
          icon={<Send className="size-5" />}
          label="Pending invites"
          value={openInvites.length}
        />
      </section>

      <section>
        <Card id="leaderboard" className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CircleGauge className="size-5" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Ratings update automatically when matches are reported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.profiles.slice(0, 8).map((profile, index) => (
              <div
                className="grid grid-cols-[2rem_2.75rem_1fr_auto] items-center gap-3 rounded-md border p-3"
                key={profile.id}
              >
                <div className="text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </div>
                <AvatarThumb
                  styleName={profile.avatar_style}
                  seed={profile.avatar_seed ?? profile.id}
                  label={displayPlayer(profile)}
                  className="size-11"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayPlayer(profile)}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.wins ?? 0}-{profile.losses ?? 0} record
                  </p>
                </div>
                <Badge variant={profile.id === user.id ? "default" : "secondary"}>
                  {profile.rating ?? 1000}
                </Badge>
              </div>
            ))}
            {data.profiles.length === 0 ? (
              <EmptyState text="Create your profile to start the leaderboard." />
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card id="tournaments" className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="size-5" />
            Tournament desk
          </CardTitle>
          <CardDescription>
            Create tournaments, choose formats, start brackets, edit pairings,
            and report winners on a dedicated page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/protected/tournaments">Open tournaments</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Send className="size-5" />
            Player invites
          </CardTitle>
          <CardDescription>
            Send challenges, edit invite details, accept requests, and report
            accepted games on a dedicated page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/protected/invites">Open invites</Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Check className="size-5" />
              Report match
            </CardTitle>
            <CardDescription>
              Rated results update both players with an Elo-style calculation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={reportMatch} className="grid gap-4">
              <PlayerSelect label="Opponent" name="opponent_id" profiles={rivals} />
              <div className="grid gap-2">
                <Label htmlFor="result">Winner</Label>
                <select
                  id="result"
                  name="result"
                  className={selectControlClass}
                  required
                >
                  <option value="win">I won</option>
                  <option value="loss">Opponent won</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tournament_id">Tournament</Label>
                <select
                  id="tournament_id"
                  name="tournament_id"
                  className={selectControlClass}
                >
                  <option value="">Casual rated match</option>
                  {joinedTournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite_id">Linked invite</Label>
                <select
                  id="invite_id"
                  name="invite_id"
                  className={selectControlClass}
                >
                  <option value="">No invite</option>
                  {acceptedInvites.map((invite) => {
                    const otherPlayer = profilesById.get(
                      invite.created_by === user.id ? invite.opponent_id : invite.created_by,
                    );

                    return (
                      <option key={invite.id} value={invite.id}>
                        {displayPlayer(otherPlayer)} - {formatDate(invite.scheduled_for)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Field label="Game score" name="score_summary" placeholder="11-7" />
              <Button type="submit" disabled={rivals.length === 0} className="w-full sm:w-auto">
                <Check className="size-4" />
                Report result
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Swords className="size-5" />
              Recent results
            </CardTitle>
            <CardDescription>Latest completed rated matches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.matches.map((match) => {
              const playerOne = profilesById.get(match.player_one_id);
              const playerTwo = profilesById.get(match.player_two_id);
              const winner = profilesById.get(match.winner_id);

              return (
                <div className="rounded-md border p-4" key={match.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">
                        {displayPlayer(playerOne)} vs {displayPlayer(playerTwo)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Winner: {displayPlayer(winner)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {match.rating_delta && match.rating_delta > 0 ? "+" : ""}
                      {match.rating_delta ?? 0}
                    </Badge>
                  </div>
                  <p className="mt-3 break-words text-sm text-muted-foreground">
                    {match.score_summary ||
                      `${match.player_one_score ?? 0}-${match.player_two_score ?? 0}`}{" "}
                    · {formatDate(match.created_at)}
                  </p>
                </div>
              );
            })}
            {data.matches.length === 0 ? (
              <EmptyState text="No match results reported yet." />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="grid min-h-[24rem] place-items-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground sm:min-h-[40rem]">
      Loading Chartwell PinPong dashboard...
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold sm:mt-4 sm:text-3xl">{value}</p>
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

function PlayerSelect({
  label,
  name,
  profiles,
}: {
  label: string;
  name: string;
  profiles: Profile[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className={selectControlClass}
        required
      >
        <option value="">Choose player</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {displayPlayer(profile)} · {profile.rating ?? 1000}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AvatarThumb({
  styleName,
  seed,
  label,
  className,
}: {
  styleName: string | null | undefined;
  seed: string | null | undefined;
  label: string;
  className?: string;
}) {
  if (isInitialsAvatar(styleName)) {
    const colors = initialsAvatarColors(seed ?? label);

    return (
      <div
        aria-label={`${label} initials avatar`}
        className={`grid shrink-0 place-items-center rounded-md border font-semibold text-white shadow-sm ${className ?? "size-12"}`}
        role="img"
        style={colors}
      >
        <span className="text-[clamp(0.75rem,32%,1.8rem)]">
          {initialsForName(label)}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label={`${label} avatar`}
      className={`shrink-0 rounded-md border bg-accent bg-cover bg-center shadow-sm ${className ?? "size-12"}`}
      role="img"
      style={{
        backgroundImage: `url("${avatarUrl(styleName, seed)}")`,
      }}
    />
  );
}
