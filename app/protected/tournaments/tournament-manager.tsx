import {
  CheckCircle2,
  Clock3,
  ListChecks,
  Sparkles,
  Swords,
  UsersRound,
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
import { Label } from "@/components/ui/label";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { reportTournamentGame, updateTournamentGame } from "../actions";

export type TournamentManagerProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
};

export type TournamentManagerTournament = {
  id: string;
  name: string;
  starts_at: string | null;
  status: string | null;
  format: string | null;
};

export type TournamentManagerEntry = {
  tournament_id: string;
  user_id: string;
  status: string | null;
};

export type TournamentManagerGame = {
  id: string;
  tournament_id: string;
  round_number: number;
  game_number: number;
  player_one_id: string | null;
  player_two_id: string | null;
  winner_id: string | null;
  status: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function displayPlayer(profile?: TournamentManagerProfile) {
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

function formatTournamentFormat(format: string | null) {
  return format === "round_robin" ? "Round robin" : "Knockout";
}

function roundLabel(format: string | null, round: number) {
  if (format === "round_robin") {
    return "All-play-all";
  }

  if (round === 1) {
    return "Opening round";
  }

  return `Round ${round}`;
}

export function TournamentManager({
  editable,
  entries,
  games,
  profiles,
  tournament,
}: {
  editable: boolean;
  entries: TournamentManagerEntry[];
  games: TournamentManagerGame[];
  profiles: TournamentManagerProfile[];
  tournament: TournamentManagerTournament;
}) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const tournamentGames = games.filter((game) => game.tournament_id === tournament.id);
  const completedGames = tournamentGames.filter(
    (game) => game.status === "completed",
  ).length;
  const scheduledGames = tournamentGames.length - completedGames;
  const players = entries
    .filter((entry) => entry.tournament_id === tournament.id)
    .map((entry) => profilesById.get(entry.user_id))
    .filter((profile): profile is TournamentManagerProfile => Boolean(profile));
  const rounds = Array.from(
    new Set(tournamentGames.map((game) => game.round_number)),
  ).sort((first, second) => first - second);
  const progress =
    tournamentGames.length > 0
      ? Math.round((completedGames / tournamentGames.length) * 100)
      : 0;
  const nextGame = tournamentGames.find(
    (game) =>
      game.status !== "completed" &&
      game.player_one_id &&
      game.player_two_id,
  );

  if (tournamentGames.length === 0) {
    return (
      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Swords className="size-5" />
            Tournament manager
          </CardTitle>
          <CardDescription>
            The match board appears after the organizer starts this tournament.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-md shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Swords className="size-5" />
          Tournament manager
        </CardTitle>
        <CardDescription>
          {editable
            ? "Edit pairings and report winners. Knockout winners advance automatically."
            : "Participants can follow pairings, rounds, winners, and tournament progress."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="border-b bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),hsl(var(--accent)/0.55),hsl(var(--background)))] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                    <Sparkles className="size-3" />
                    Live control
                  </Badge>
                  <Badge variant="outline">{tournament.status}</Badge>
                  {!editable ? <Badge variant="secondary">Read only</Badge> : null}
                </div>
                <h3 className="mt-3 break-words text-xl font-semibold">
                  {tournament.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTournamentFormat(tournament.format)} ·{" "}
                  {formatDate(tournament.starts_at)}
                </p>
              </div>
              <TournamentProgress value={progress} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ManagerStat
                icon={<UsersRound className="size-4" />}
                label="Players"
                value={players.length}
              />
              <ManagerStat
                icon={<ListChecks className="size-4" />}
                label="Completed"
                value={`${completedGames}/${tournamentGames.length}`}
              />
              <ManagerStat
                icon={<Clock3 className="size-4" />}
                label="Scheduled"
                value={scheduledGames}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Match board</p>
                <p className="text-xs text-muted-foreground">
                  {editable
                    ? "Update pairings before reporting a winner."
                    : "Only the creator can edit pairings or report winners."}
                </p>
              </div>
              <Badge variant="secondary">{rounds.length} rounds</Badge>
            </div>

            {nextGame ? (
              <NextMatch
                game={nextGame}
                profilesById={profilesById}
                roundLabel={roundLabel(tournament.format, nextGame.round_number)}
              />
            ) : null}

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {rounds.map((round) => {
                const roundGames = tournamentGames.filter(
                  (game) => game.round_number === round,
                );
                const roundDone = roundGames.filter(
                  (game) => game.status === "completed",
                ).length;

                return (
                  <div
                    className="rounded-md border bg-card p-3 shadow-sm"
                    key={round}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold">
                          {roundLabel(tournament.format, round)}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {roundDone}/{roundGames.length} decided
                        </p>
                      </div>
                      <Badge
                        variant={
                          roundDone === roundGames.length ? "default" : "outline"
                        }
                      >
                        {roundGames.length} games
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {roundGames.map((game) => (
                        <TournamentGameRow
                          editable={editable}
                          game={game}
                          key={game.id}
                          players={players}
                          profilesById={profilesById}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentProgress({ value }: { value: number }) {
  return (
    <div className="grid min-w-28 place-items-center rounded-md border bg-background/80 px-4 py-3 text-center shadow-sm">
      <p className="text-2xl font-semibold">{value}%</p>
      <p className="text-xs text-muted-foreground">complete</p>
    </div>
  );
}

function ManagerStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background/80 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function NextMatch({
  game,
  profilesById,
  roundLabel,
}: {
  game: TournamentManagerGame;
  profilesById: Map<string, TournamentManagerProfile>;
  roundLabel: string;
}) {
  const playerOne = game.player_one_id
    ? profilesById.get(game.player_one_id)
    : undefined;
  const playerTwo = game.player_two_id
    ? profilesById.get(game.player_two_id)
    : undefined;

  return (
    <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-primary">
            Next match ready
          </p>
          <p className="mt-1 text-lg font-semibold">
            {displayPlayer(playerOne)} vs {displayPlayer(playerTwo)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {roundLabel} · Game {game.game_number}
          </p>
        </div>
        <Badge className="gap-1">
          <Swords className="size-3" />
          Ready
        </Badge>
      </div>
    </div>
  );
}

function TournamentGameRow({
  editable,
  game,
  players,
  profilesById,
}: {
  editable: boolean;
  game: TournamentManagerGame;
  players: TournamentManagerProfile[];
  profilesById: Map<string, TournamentManagerProfile>;
}) {
  const playerOne = game.player_one_id
    ? profilesById.get(game.player_one_id)
    : undefined;
  const playerTwo = game.player_two_id
    ? profilesById.get(game.player_two_id)
    : undefined;
  const winner = game.winner_id ? profilesById.get(game.winner_id) : undefined;
  const canReport =
    editable &&
    game.player_one_id &&
    game.player_two_id &&
    game.status !== "completed";

  return (
    <div className="rounded-md border bg-background/80 p-3 shadow-sm transition hover:border-primary/25 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Game {game.game_number}
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <PlayerLine
              label="Player 1"
              player={playerOne}
              won={game.winner_id === game.player_one_id}
            />
            <div className="grid place-items-center">
              <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
                vs
              </span>
            </div>
            <PlayerLine
              label="Player 2"
              player={playerTwo}
              won={game.winner_id === game.player_two_id}
            />
          </div>
        </div>
        <Badge
          className="gap-1"
          variant={game.status === "completed" ? "default" : "secondary"}
        >
          {game.status === "completed" ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Clock3 className="size-3" />
          )}
          {game.status}
        </Badge>
      </div>

      {game.status === "completed" ? (
        <p className="mt-3 text-sm">
          Winner: <span className="font-medium">{displayPlayer(winner)}</span>
        </p>
      ) : editable ? (
        <div className="mt-4 grid gap-3">
          <form
            action={updateTournamentGame}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="game_id" value={game.id} />
            <PlayerGameSelect
              label="Player 1"
              name="player_one_id"
              players={players}
              value={game.player_one_id}
            />
            <PlayerGameSelect
              label="Player 2"
              name="player_two_id"
              players={players}
              value={game.player_two_id}
            />
            <div className="flex items-end">
              <Button type="submit" size="sm" variant="outline" className="w-full">
                Save pairing
              </Button>
            </div>
          </form>

          {canReport ? (
            <div className="rounded-md border border-primary/15 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-normal text-primary">
                Report winner
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <WinnerButton
                  gameId={game.id}
                  playerId={game.player_one_id!}
                  playerName={displayPlayer(playerOne)}
                />
                <WinnerButton
                  gameId={game.id}
                  playerId={game.player_two_id!}
                  playerName={displayPlayer(playerTwo)}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose two players before reporting the winner.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Waiting for organizer to report this game.
        </p>
      )}
    </div>
  );
}

function PlayerLine({
  label,
  player,
  won,
}: {
  label: string;
  player?: TournamentManagerProfile;
  won: boolean;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 rounded-md border bg-card px-2 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{displayPlayer(player)}</span>
      {won ? (
        <Badge className="text-[10px]">Winner</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">
          {player?.rating ?? 1000}
        </span>
      )}
    </div>
  );
}

function PlayerGameSelect({
  label,
  name,
  players,
  value,
}: {
  label: string;
  name: string;
  players: TournamentManagerProfile[];
  value: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}-${value ?? "empty"}`}>{label}</Label>
      <select
        id={`${name}-${value ?? "empty"}`}
        name={name}
        className={selectControlClass}
        defaultValue={value ?? ""}
        required
      >
        <option value="">Choose player</option>
        {players.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {displayPlayer(profile)}
          </option>
        ))}
      </select>
    </div>
  );
}

function WinnerButton({
  gameId,
  playerId,
  playerName,
}: {
  gameId: string;
  playerId: string;
  playerName: string;
}) {
  return (
    <form action={reportTournamentGame}>
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="winner_id" value={playerId} />
      <Button type="submit" size="sm" className="w-full">
        {playerName} won
      </Button>
    </form>
  );
}
