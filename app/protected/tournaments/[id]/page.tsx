import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, MapPin, ShieldAlert, Trophy } from "lucide-react";

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
import { APP_TIME_ZONE } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import { joinTournament, startTournament } from "../../actions";
import {
  TournamentManager,
  type TournamentManagerEntry,
  type TournamentManagerGame,
  type TournamentManagerProfile,
  type TournamentManagerTournament,
} from "../tournament-manager";

type Tournament = TournamentManagerTournament & {
  venue: string | null;
  max_players: number | null;
  skill_floor: number | null;
  skill_ceiling: number | null;
  organizer_id: string;
};

type TournamentDetailData = {
  entries: TournamentManagerEntry[];
  games: TournamentManagerGame[];
  profiles: TournamentManagerProfile[];
  setupError: string | null;
  tournament: Tournament | null;
};

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

function formatTournamentFormat(format: string | null) {
  return format === "round_robin" ? "Round robin" : "Knockout";
}

async function loadTournamentDetail(id: string): Promise<TournamentDetailData> {
  const supabase = await createClient();
  const setupErrors: string[] = [];

  const [tournamentResult, profilesResult, entriesResult, gamesResult] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select(
          "id,name,venue,starts_at,max_players,skill_floor,skill_ceiling,status,organizer_id,format",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id,email,display_name,rating")
        .order("rating", { ascending: false }),
      supabase
        .from("tournament_entries")
        .select("tournament_id,user_id,status")
        .eq("tournament_id", id),
      supabase
        .from("tournament_games")
        .select(
          "id,tournament_id,round_number,game_number,player_one_id,player_two_id,winner_id,status",
        )
        .eq("tournament_id", id)
        .order("round_number", { ascending: true })
        .order("game_number", { ascending: true }),
    ]);

  for (const result of [
    tournamentResult,
    profilesResult,
    entriesResult,
    gamesResult,
  ]) {
    if (result.error) {
      setupErrors.push(result.error.message);
    }
  }

  return {
    entries: (entriesResult.data ?? []) as TournamentManagerEntry[],
    games: (gamesResult.data ?? []) as TournamentManagerGame[],
    profiles: (profilesResult.data ?? []) as TournamentManagerProfile[],
    setupError: setupErrors[0] ?? null,
    tournament: (tournamentResult.data ?? null) as Tournament | null,
  };
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<TournamentDetailFallback />}>
      <TournamentDetail params={params} />
    </Suspense>
  );
}

async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadTournamentDetail(id);

  if (!data.tournament) {
    notFound();
  }

  const isOrganizer = data.tournament.organizer_id === user.id;
  const isParticipant = data.entries.some((entry) => entry.user_id === user.id);
  const playerCount = data.entries.length;
  const requiredPlayers = data.tournament.max_players ?? 2;
  const canStart = playerCount >= requiredPlayers;
  const isFull = playerCount >= requiredPlayers;
  const canViewManager = isOrganizer || isParticipant;

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href="/protected/tournaments">
          <ArrowLeft className="size-4" />
          Back to tournaments
        </Link>
      </Button>

      {data.setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Tournament data is not ready yet.</p>
            <p className="mt-1 break-words">{data.setupError}</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {formatTournamentFormat(data.tournament.format)}
              </Badge>
              <Badge variant="outline">{data.tournament.status}</Badge>
              {isOrganizer ? <Badge variant="secondary">Creator</Badge> : null}
              {isParticipant ? <Badge variant="secondary">Participant</Badge> : null}
            </div>
            <h1 className="mt-4 break-words text-3xl font-semibold tracking-normal">
              {data.tournament.name}
            </h1>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <InfoLine
                icon={<CalendarDays className="size-4" />}
                label="Starts"
                value={formatDate(data.tournament.starts_at)}
              />
              <InfoLine
                icon={<MapPin className="size-4" />}
                label="Venue"
                value={data.tournament.venue || "Venue to be announced"}
              />
              <InfoLine
                icon={<Trophy className="size-4" />}
                label="Players"
                value={`${playerCount}/${data.tournament.max_players ?? "?"}`}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:min-w-44">
            {!isParticipant &&
            !isOrganizer &&
            data.tournament.status === "open" &&
            !isFull ? (
              <form action={joinTournament}>
                <input type="hidden" name="tournament_id" value={data.tournament.id} />
                <Button type="submit" className="w-full">
                  Join tournament
                </Button>
              </form>
            ) : null}
            {!isParticipant &&
            !isOrganizer &&
            data.tournament.status === "open" &&
            isFull ? (
              <Badge variant="outline">Tournament full</Badge>
            ) : null}
            {isOrganizer && data.tournament.status === "open" ? (
              <div className="grid gap-1">
                <form action={startTournament}>
                  <input type="hidden" name="tournament_id" value={data.tournament.id} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canStart}
                  >
                    Start tournament
                  </Button>
                </form>
                {!canStart ? (
                  <p className="text-xs text-muted-foreground">
                    Needs {requiredPlayers - playerCount} more player
                    {requiredPlayers - playerCount === 1 ? "" : "s"} before it
                    can start.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {canViewManager ? (
        <TournamentManager
          editable={isOrganizer}
          entries={data.entries}
          games={data.games}
          profiles={data.profiles}
          tournament={data.tournament}
        />
      ) : (
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Join to view match board</CardTitle>
            <CardDescription>
              Tournament pairings and results are visible to participants and the
              creator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Join this tournament to follow the manager board when games are
              generated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TournamentDetailFallback() {
  return <PingPongLoader label="Loading tournament..." className="sm:min-h-[24rem]" />;
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <div className="flex items-center gap-2 text-xs">
        {icon}
        {label}
      </div>
      <p className="mt-1 break-words font-medium text-foreground">{value}</p>
    </div>
  );
}
