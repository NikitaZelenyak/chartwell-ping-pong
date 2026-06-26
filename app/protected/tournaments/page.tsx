import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarDays,
  MapPin,
  ShieldAlert,
  Trophy,
} from "lucide-react";

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
import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
  tournamentAvatarOptions,
  type AvatarOption,
} from "@/lib/avatars";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import {
  createTournament,
  joinTournament,
  startTournament,
} from "../actions";

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

type TournamentsData = {
  tournaments: Tournament[];
  entries: TournamentEntry[];
  setupError: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

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

async function loadTournamentsData(): Promise<TournamentsData> {
  const supabase = await createClient();
  const setupErrors: string[] = [];

  const [tournamentsResult, entriesResult] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select(
          "id,name,venue,starts_at,max_players,skill_floor,skill_ceiling,status,organizer_id,avatar_style,avatar_seed,format",
        )
        .order("starts_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("tournament_entries")
        .select("tournament_id,user_id,status"),
    ]);

  for (const result of [
    tournamentsResult,
    entriesResult,
  ]) {
    if (result.error) {
      setupErrors.push(result.error.message);
    }
  }

  return {
    tournaments: (tournamentsResult.data ?? []) as Tournament[],
    entries: (entriesResult.data ?? []) as TournamentEntry[],
    setupError: setupErrors[0] ?? null,
  };
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<TournamentFallback />}>
      <Tournaments />
    </Suspense>
  );
}

async function Tournaments() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadTournamentsData();
  const myEntries = new Set(
    data.entries
      .filter((entry) => entry.user_id === user.id)
      .map((entry) => entry.tournament_id),
  );

  return (
    <div className="w-full space-y-6 sm:space-y-10">
      {data.setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Tournament tables are not ready yet.</p>
            <p className="mt-1 break-words">
              Apply the latest Supabase migrations, then refresh this page.
              Supabase returned: {data.setupError}
            </p>
          </div>
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-5 shadow-sm">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
          Tournament desk
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Tournaments
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Create a format, let players register, start the event, edit pairings,
          and report winners from one place.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="size-5" />
              Create tournament
            </CardTitle>
            <CardDescription>
              Choose knockout for bracket play or round robin when everyone
              should play everyone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTournament} className="grid gap-4">
              <Field label="Tournament name" name="name" required placeholder="Friday Ladder Night" />
              <Field label="Venue" name="venue" placeholder="Court 3" />
              <Field label="Start time" name="starts_at" type="datetime-local" />
              <div className="grid gap-2">
                <Label htmlFor="format">Tournament format</Label>
                <select
                  id="format"
                  name="format"
                  className={selectControlClass}
                  defaultValue="single_elimination"
                >
                  <option value="single_elimination">Knockout bracket</option>
                  <option value="round_robin">Round robin</option>
                </select>
              </div>
              <AvatarPicker
                label="Tournament avatar"
                options={tournamentAvatarOptions}
                selectedStyle="shapes"
                selectedSeed="chartwell-bracket"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Max players" name="max_players" type="number" defaultValue={16} min={2} />
                <Field label="Min rating" name="skill_floor" type="number" defaultValue={900} min={0} />
                <Field label="Max rating" name="skill_ceiling" type="number" defaultValue={2400} min={0} />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <Trophy className="size-4" />
                Create tournament
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CalendarDays className="size-5" />
              Open tournaments
            </CardTitle>
            <CardDescription>
              Join open events or start tournaments you organize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tournaments.map((tournament) => {
              const playerCount = data.entries.filter(
                (entry) => entry.tournament_id === tournament.id,
              ).length;
              const joined = myEntries.has(tournament.id);
              const requiredPlayers = tournament.max_players ?? 2;
              const canStart = playerCount >= requiredPlayers;
              const isFull = playerCount >= requiredPlayers;

              return (
                <div
                  className="rounded-md border p-4 transition hover:border-primary/35 hover:shadow-md"
                  key={tournament.id}
                >
                  <Link
                    className="block"
                    href={`/protected/tournaments/${tournament.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <AvatarThumb
                          styleName={tournament.avatar_style}
                          seed={tournament.avatar_seed ?? tournament.id}
                          label={tournament.name}
                          className="size-12"
                        />
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold">{tournament.name}</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="size-4" />
                            {tournament.venue || "Venue to be announced"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={joined ? "default" : "secondary"}>
                        {joined ? "Joined" : tournament.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <InfoItem label="Starts" value={formatDate(tournament.starts_at)} />
                      <InfoItem
                        label="Format"
                        value={formatTournamentFormat(tournament.format)}
                      />
                      <InfoItem
                        label="Players"
                        value={`${playerCount}/${tournament.max_players ?? "?"}`}
                      />
                    </div>
                    <p className="mt-4 text-xs font-medium text-primary">
                      Open tournament board
                    </p>
                  </Link>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {!joined && tournament.status === "open" && !isFull ? (
                      <form action={joinTournament}>
                        <input type="hidden" name="tournament_id" value={tournament.id} />
                        <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                          Join tournament
                        </Button>
                      </form>
                    ) : null}
                    {!joined && tournament.status === "open" && isFull ? (
                      <Badge variant="outline">Full</Badge>
                    ) : null}
                    {tournament.organizer_id === user.id && tournament.status === "open" ? (
                      <div className="grid gap-1">
                        <form action={startTournament}>
                          <input type="hidden" name="tournament_id" value={tournament.id} />
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={!canStart}
                          >
                            Start tournament
                          </Button>
                        </form>
                        {!canStart ? (
                          <p className="text-xs text-muted-foreground">
                            Needs {requiredPlayers - playerCount} more player
                            {requiredPlayers - playerCount === 1 ? "" : "s"}.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {data.tournaments.length === 0 ? (
              <EmptyState text="No tournaments yet. Create the first one." />
            ) : null}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

function TournamentFallback() {
  return <PingPongLoader label="Loading tournaments..." />;
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
    return (
      <div
        aria-label={`${label} initials avatar`}
        className={`grid shrink-0 place-items-center rounded-md border font-semibold text-white shadow-sm ${className ?? "size-12"}`}
        role="img"
        style={initialsAvatarColors(seed ?? label)}
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

function AvatarPicker({
  label,
  options,
  selectedStyle,
  selectedSeed,
}: {
  label: string;
  options: AvatarOption[];
  selectedStyle?: string | null;
  selectedSeed?: string | null;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex(
      (option) => option.style === selectedStyle && option.seed === selectedSeed,
    ),
  );

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
        {options.map((option, index) => (
          <label
            className="group cursor-pointer rounded-md border bg-background p-2 shadow-sm transition hover:border-primary/60 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:ring-1 has-[:checked]:ring-primary"
            key={`${option.style}-${option.seed}`}
          >
            <input
              className="sr-only"
              defaultChecked={index === selectedIndex}
              name="avatar_choice"
              type="radio"
              value={`${option.style}|${option.seed}`}
            />
            <AvatarThumb
              styleName={option.style}
              seed={option.seed}
              label={option.label}
              className="aspect-square w-full"
            />
            <span className="mt-2 block truncate text-center text-xs font-medium">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
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
