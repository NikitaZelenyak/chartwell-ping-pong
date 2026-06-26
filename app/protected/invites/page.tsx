import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check, Pencil, Send, ShieldAlert, Swords, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  APP_TIME_ZONE,
  isoToDateTimeLocal,
} from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import {
  respondToInvite,
  sendInvite,
  submitCasualMatchReport,
  updateInvite,
} from "../actions";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
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

type InvitesData = {
  profiles: Profile[];
  invites: MatchInvite[];
  setupError: string | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function displayPlayer(profile?: Profile, fallback = "Unknown player") {
  if (!profile) {
    return fallback;
  }

  return profile.display_name || profile.email || fallback;
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

async function loadInvitesData(userId: string): Promise<InvitesData> {
  const supabase = await createClient();
  const setupErrors: string[] = [];

  const [profilesResult, invitesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name,rating")
      .order("display_name", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_invites")
      .select("id,created_by,opponent_id,status,scheduled_for,location,note,created_at")
      .or(`created_by.eq.${userId},opponent_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [profilesResult, invitesResult]) {
    if (result.error) {
      setupErrors.push(result.error.message);
    }
  }

  return {
    profiles: (profilesResult.data ?? []) as Profile[],
    invites: (invitesResult.data ?? []) as MatchInvite[],
    setupError: setupErrors[0] ?? null,
  };
}

export default function InvitesPage() {
  return (
    <Suspense fallback={<InvitesFallback />}>
      <InvitesContent />
    </Suspense>
  );
}

async function InvitesContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const data = await loadInvitesData(user.id);
  const profilesById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const rivals = data.profiles.filter((profile) => profile.id !== user.id);
  const myProfile = profilesById.get(user.id);
  const pendingCount = data.invites.filter((invite) => invite.status === "pending").length;
  const acceptedCount = data.invites.filter((invite) => invite.status === "accepted").length;

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
              Match scheduling
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
              Player invites
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Send a challenge, edit the details while it is active, and report
              the result once the game is played.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-56">
            <Stat label="Pending" value={pendingCount} />
            <Stat label="Accepted" value={acceptedCount} />
          </div>
        </div>
      </section>

      {data.setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Supabase tables are not ready yet.</p>
            <p className="mt-1 break-words">{data.setupError}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Send className="size-5" />
              Send match invite
            </CardTitle>
            <CardDescription>Challenge another player to a rated match.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendInvite} className="grid gap-4">
              <PlayerSelect label="Opponent" name="opponent_id" profiles={rivals} />
              <Field label="When" name="scheduled_for" type="datetime-local" />
              <Field
                label="Location"
                name="location"
                placeholder="Table 2, community center"
              />
              <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" name="note" placeholder="Best of 5? Warmup time?" />
              </div>
              <Button type="submit" disabled={rivals.length === 0} className="w-full sm:w-auto">
                <Send className="size-4" />
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Swords className="size-5" />
              Invites
            </CardTitle>
            <CardDescription>
              Accept, cancel, edit sent invites, or report accepted games.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.invites.map((invite) => {
              const isIncoming = invite.opponent_id === user.id;
              const canEdit =
                invite.created_by === user.id &&
                (invite.status === "pending" || invite.status === "accepted");
              const otherPlayer = profilesById.get(
                isIncoming ? invite.created_by : invite.opponent_id,
              );

              return (
                <div className="rounded-md border p-4" key={invite.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {isIncoming ? "From" : "To"} {displayPlayer(otherPlayer)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(invite.scheduled_for)} at{" "}
                        {invite.location || "location TBD"}
                      </p>
                      {invite.note ? (
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {invite.note}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={invite.status === "pending" ? "secondary" : "outline"}>
                      {invite.status}
                    </Badge>
                  </div>

                  {canEdit ? <EditInviteForm invite={invite} /> : null}

                  {invite.status === "pending" ? (
                    <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                      {isIncoming ? (
                        <>
                          <InviteAction
                            inviteId={invite.id}
                            status="accepted"
                            label="Accept"
                            icon={<Check className="size-4" />}
                          />
                          <InviteAction
                            inviteId={invite.id}
                            status="declined"
                            label="Decline"
                            icon={<X className="size-4" />}
                          />
                        </>
                      ) : (
                        <InviteAction
                          inviteId={invite.id}
                          status="cancelled"
                          label="Cancel"
                          icon={<X className="size-4" />}
                        />
                      )}
                    </div>
                  ) : null}

                  {invite.status === "accepted" ? (
                    <InviteResultForm
                      inviteId={invite.id}
                      opponentId={isIncoming ? invite.created_by : invite.opponent_id}
                      currentPlayerLabel={
                        myProfile ? displayPlayer(myProfile) : user.email || "Me"
                      }
                      opponentLabel={displayPlayer(otherPlayer)}
                    />
                  ) : null}
                </div>
              );
            })}

            {data.invites.length === 0 ? (
              <EmptyState text="No invites yet. Send a challenge to another player." />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InvitesFallback() {
  return (
    <div className="grid min-h-[24rem] place-items-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
      Loading invites...
    </div>
  );
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

function EditInviteForm({ invite }: { invite: MatchInvite }) {
  return (
    <form
      action={updateInvite}
      className="mt-4 grid gap-3 rounded-md border border-primary/15 bg-muted/35 p-3"
    >
      <input type="hidden" name="invite_id" value={invite.id} />
      <div className="flex items-center gap-2 text-sm font-medium">
        <Pencil className="size-4 text-primary" />
        Edit invite
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="When"
          name="scheduled_for"
          type="datetime-local"
          defaultValue={isoToDateTimeLocal(invite.scheduled_for)}
        />
        <Field
          label="Location"
          name="location"
          defaultValue={invite.location ?? ""}
          placeholder="Table 2, community center"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`note-${invite.id}`}>Note</Label>
        <Textarea
          id={`note-${invite.id}`}
          name="note"
          defaultValue={invite.note ?? ""}
          placeholder="Best of 5? Warmup time?"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
        <Check className="size-4" />
        Save changes
      </Button>
    </form>
  );
}

function InviteResultForm({
  inviteId,
  opponentId,
  currentPlayerLabel,
  opponentLabel,
}: {
  inviteId: string;
  opponentId: string;
  currentPlayerLabel: string;
  opponentLabel: string;
}) {
  const resultId = `invite-result-${inviteId}`;
  const scoreId = `invite-score-${inviteId}`;

  return (
    <form
      action={submitCasualMatchReport}
      className="mt-4 grid gap-3 rounded-md border border-primary/15 bg-primary/5 p-3"
    >
      <input type="hidden" name="invite_id" value={inviteId} />
      <input type="hidden" name="opponent_id" value={opponentId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor={resultId}>Winner</Label>
          <select
            id={resultId}
            name="result"
            className={selectControlClass}
            required
          >
            <option value="win">{currentPlayerLabel}</option>
            <option value="loss">{opponentLabel}</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={scoreId}>Score</Label>
          <Input id={scoreId} name="score_summary" placeholder="11-7" />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          <Check className="size-4" />
          Report
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Ratings update after the other player confirms the result.
      </p>
    </form>
  );
}

function InviteAction({
  inviteId,
  status,
  label,
  icon,
}: {
  inviteId: string;
  status: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={respondToInvite} className="w-full sm:w-auto">
      <input type="hidden" name="invite_id" value={inviteId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
        {icon}
        {label}
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
