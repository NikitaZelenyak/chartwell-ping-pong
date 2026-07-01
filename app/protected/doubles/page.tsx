import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  Check,
  Pencil,
  Send,
  ShieldAlert,
  Trash2,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

import { DoublesMatchReportForm } from "@/components/doubles-match-report-form";
import { DoublesTeamLeaderboard } from "@/components/doubles-leaderboards";
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
import { PingPongLoader } from "@/components/ping-pong-loader";
import { createClient } from "@/lib/supabase/server";
import {
  confirmDoublesMatchReport,
  createDoublesTeamInvite,
  declineDoublesMatchReport,
  deleteDoublesTeamInvite,
  renameDoublesTeam,
  respondToDoublesTeamInvite,
} from "../actions";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
};

type DoublesTeam = {
  id: string;
  name: string;
  created_by: string;
  player_one_id: string;
  player_two_id: string;
  rating: number | null;
  wins: number | null;
  losses: number | null;
};

type DoublesTeamInvite = {
  id: string;
  created_by: string;
  invited_user_id: string;
  team_name: string;
  status: string | null;
  created_at: string | null;
};

type DoublesMatchReport = {
  id: string;
  reporter_id: string;
  team_one_id: string;
  team_two_id: string;
  winner_team_id: string;
  responder_team_id: string;
  team_one_score: number | null;
  team_two_score: number | null;
  status: string | null;
  created_at: string | null;
};

type DoublesData = {
  profiles: Profile[];
  teams: DoublesTeam[];
  invites: DoublesTeamInvite[];
  reports: DoublesMatchReport[];
  setupError: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function displayPlayer(profile?: Profile | null) {
  return profile?.display_name || profile?.email || "Player";
}

function displayTeam(team?: DoublesTeam | null) {
  return team?.name || "Unknown team";
}

async function loadDoublesData(userId: string): Promise<DoublesData> {
  const supabase = await createClient();
  const setupErrors: string[] = [];

  const [profilesResult, teamsResult, invitesResult, reportsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,rating")
        .order("display_name", { ascending: true, nullsFirst: false }),
      supabase
        .from("doubles_teams")
        .select("id,name,created_by,player_one_id,player_two_id,rating,wins,losses")
        .order("rating", { ascending: false }),
      supabase
        .from("doubles_team_invites")
        .select("id,created_by,invited_user_id,team_name,status,created_at")
        .or(`created_by.eq.${userId},invited_user_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("doubles_match_reports")
        .select(
          "id,reporter_id,team_one_id,team_two_id,winner_team_id,responder_team_id,team_one_score,team_two_score,status,created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

  for (const result of [
    profilesResult,
    teamsResult,
    invitesResult,
    reportsResult,
  ]) {
    if (result.error) {
      setupErrors.push(result.error.message);
    }
  }

  return {
    profiles: (profilesResult.data ?? []) as Profile[],
    teams: (teamsResult.data ?? []) as DoublesTeam[],
    invites: (invitesResult.data ?? []) as DoublesTeamInvite[],
    reports: (reportsResult.data ?? []) as DoublesMatchReport[],
    setupError: setupErrors[0] ?? null,
  };
}

export default function DoublesPage() {
  return (
    <Suspense fallback={<DoublesFallback />}>
      <DoublesContent />
    </Suspense>
  );
}

async function DoublesContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadDoublesData(user.id);
  const profilesById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const teamsById = new Map(data.teams.map((team) => [team.id, team]));
  const rivals = data.profiles.filter((profile) => profile.id !== user.id);
  const myTeams = data.teams.filter((team) =>
    [team.player_one_id, team.player_two_id].includes(user.id),
  );
  const pendingInvites = data.invites.filter((invite) => invite.status === "pending");
  const pendingReports = data.reports.filter((report) => report.status === "pending");
  const teamLeaderboard = data.teams.map((team) => ({
    id: team.id,
    name: team.name,
    rating: team.rating,
    wins: team.wins,
    losses: team.losses,
    playerOneId: team.player_one_id,
    playerOne: displayPlayer(profilesById.get(team.player_one_id)),
    playerTwoId: team.player_two_id,
    playerTwo: displayPlayer(profilesById.get(team.player_two_id)),
  }));

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
              Doubles
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
              Doubles teams
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create partner teams, report team matches, and track team ratings
              plus each player&apos;s match rating.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-56">
            <Stat label="My teams" value={myTeams.length} />
            <Stat label="Pending" value={pendingInvites.length + pendingReports.length} />
          </div>
        </div>
      </section>

      {data.setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Doubles tables are not ready yet.</p>
            <p className="mt-1 break-words">
              Apply the latest Supabase migrations, then refresh. Supabase
              returned: {data.setupError}
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Send className="size-5" />
              Create doubles team
            </CardTitle>
            <CardDescription>
              Send a team invite. The team is created after your partner accepts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createDoublesTeamInvite} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="partner_id">Partner</Label>
                <select
                  id="partner_id"
                  name="partner_id"
                  className={selectControlClass}
                  required
                >
                  <option value="">Choose partner</option>
                  {rivals.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {displayPlayer(profile)} · {profile.rating ?? 1000}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Team name"
                name="team_name"
                placeholder="Spin Partners"
                required
              />
              <Button type="submit" disabled={rivals.length === 0} className="w-full sm:w-auto">
                <Send className="size-4" />
                Send team invite
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <UsersRound className="size-5" />
              Team invites
            </CardTitle>
            <CardDescription>
              Accept, decline, cancel, or remove doubles team invites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.invites.map((invite) => {
              const incoming = invite.invited_user_id === user.id;
              const otherPlayer = profilesById.get(
                incoming ? invite.created_by : invite.invited_user_id,
              );

              return (
                <div className="rounded-md border p-4" key={invite.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{invite.team_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {incoming ? "From" : "To"} {displayPlayer(otherPlayer)}
                      </p>
                    </div>
                    <Badge variant={invite.status === "pending" ? "secondary" : "outline"}>
                      {invite.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    {invite.status === "pending" && incoming ? (
                      <>
                        <TeamInviteAction
                          inviteId={invite.id}
                          status="accepted"
                          label="Accept"
                          icon={<Check className="size-4" />}
                        />
                        <TeamInviteAction
                          inviteId={invite.id}
                          status="declined"
                          label="Decline"
                          icon={<X className="size-4" />}
                        />
                      </>
                    ) : null}
                    {invite.status === "pending" && !incoming ? (
                      <TeamInviteAction
                        inviteId={invite.id}
                        status="cancelled"
                        label="Cancel"
                        icon={<X className="size-4" />}
                      />
                    ) : null}
                    <DeleteTeamInviteAction inviteId={invite.id} />
                  </div>
                </div>
              );
            })}
            {data.invites.length === 0 ? (
              <EmptyState text="No doubles team invites yet." />
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Pencil className="size-5" />
              My teams
            </CardTitle>
            <CardDescription>
              Either teammate can edit the team name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myTeams.map((team) => (
              <div className="rounded-md border p-4" key={team.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link
                        href={`/protected/players/${team.player_one_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {displayPlayer(profilesById.get(team.player_one_id))}
                      </Link>{" "}
                      +{" "}
                      <Link
                        href={`/protected/players/${team.player_two_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {displayPlayer(profilesById.get(team.player_two_id))}
                      </Link>
                    </p>
                  </div>
                  <Badge variant="secondary">{team.rating ?? 1000}</Badge>
                </div>
                <form action={renameDoublesTeam} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="team_id" value={team.id} />
                  <Input name="team_name" defaultValue={team.name} required />
                  <Button type="submit" variant="outline" className="w-full sm:w-auto">
                    <Pencil className="size-4" />
                    Rename
                  </Button>
                </form>
              </div>
            ))}
            {myTeams.length === 0 ? (
              <EmptyState text="Create or accept a team invite to start doubles." />
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="size-5" />
              Report doubles match
            </CardTitle>
            <CardDescription>
              One player from the opposing team confirms before ratings move.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoublesMatchReportForm myTeams={myTeams} teams={data.teams} />
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Check className="size-5" />
            Pending doubles confirmations
          </CardTitle>
          <CardDescription>
            Confirm only when the teams, winner, and score are correct.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingReports.map((report) => {
            const responderTeam = teamsById.get(report.responder_team_id);
            const canRespond =
              responderTeam &&
              [responderTeam.player_one_id, responderTeam.player_two_id].includes(user.id);

            return (
              <div className="rounded-md border p-4" key={report.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {displayTeam(teamsById.get(report.team_one_id))} vs{" "}
                      {displayTeam(teamsById.get(report.team_two_id))}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Winner reported: {displayTeam(teamsById.get(report.winner_team_id))}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Score: {report.team_one_score ?? 0}-{report.team_two_score ?? 0}
                    </p>
                  </div>
                  <Badge variant={canRespond ? "secondary" : "outline"}>
                    {canRespond ? "Needs you" : "Waiting"}
                  </Badge>
                </div>
                {canRespond ? (
                  <div className="mt-4 grid gap-2 sm:flex">
                    <form action={confirmDoublesMatchReport}>
                      <input type="hidden" name="report_id" value={report.id} />
                      <Button type="submit" size="sm" className="w-full sm:w-auto">
                        Confirm
                      </Button>
                    </form>
                    <form action={declineDoublesMatchReport}>
                      <input type="hidden" name="report_id" value={report.id} />
                      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                        Decline
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
          {pendingReports.length === 0 ? (
            <EmptyState text="No doubles confirmations waiting." />
          ) : null}
        </CardContent>
      </Card>

      <section>
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Doubles team leaderboard</CardTitle>
            <CardDescription>Teams are ranked by shared doubles rating.</CardDescription>
          </CardHeader>
          <CardContent>
            <DoublesTeamLeaderboard teams={teamLeaderboard} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DoublesFallback() {
  return <PingPongLoader label="Loading doubles..." className="sm:min-h-[24rem]" />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
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

function TeamInviteAction({
  icon,
  inviteId,
  label,
  status,
}: {
  icon: React.ReactNode;
  inviteId: string;
  label: string;
  status: string;
}) {
  return (
    <form action={respondToDoublesTeamInvite} className="w-full sm:w-auto">
      <input type="hidden" name="invite_id" value={inviteId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
        {icon}
        {label}
      </Button>
    </form>
  );
}

function DeleteTeamInviteAction({ inviteId }: { inviteId: string }) {
  return (
    <form action={deleteDoublesTeamInvite} className="w-full sm:w-auto">
      <input type="hidden" name="invite_id" value={inviteId} />
      <Button type="submit" size="sm" variant="destructive" className="w-full sm:w-auto">
        <Trash2 className="size-4" />
        Remove
      </Button>
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
