import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowRight,
  CircleGauge,
  ClipboardCheck,
  Medal,
  Send,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const ratingExamples = [
  { match: "1000 beats 1000", change: "+16", note: "Even match" },
  { match: "500 beats 1000", change: "about +30", note: "Underdog win" },
  { match: "1000 beats 500", change: "about +2", note: "Expected win" },
  { match: "500 beats 5000", change: "+32 max", note: "Huge upset" },
  { match: "5000 beats 500", change: "+1 min", note: "Heavy favorite" },
];

export default function GuidePage() {
  return (
    <Suspense fallback={<GuideFallback />}>
      <GuideContent />
    </Suspense>
  );
}

async function GuideContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full space-y-6 sm:space-y-10">
      <section className="rounded-md border bg-card p-5 shadow-sm">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
          How it works
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Chartwell Ping Pong guide
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Use this page as the operating manual for profiles, ratings, invites,
          tournament formats, and match results.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <WorkflowCard
          icon={<UserRound className="size-5" />}
          title="Create profile"
          text="Add your first and last name, choose an avatar, and start with the default rating."
        />
        <WorkflowCard
          icon={<Send className="size-5" />}
          title="Challenge players"
          text="Send a match invite with time, location, and notes. After it is accepted, either player can report the result right from the invite."
        />
        <WorkflowCard
          icon={<ClipboardCheck className="size-5" />}
          title="Report games"
          text="Report casual games one at a time. The opponent confirms before ratings move."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1fr]">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CircleGauge className="size-5" />
              Ratings
            </CardTitle>
            <CardDescription>
              Ratings use an Elo-style formula, so upsets are worth more than
              expected wins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-background/80 p-4 text-sm">
              <p className="font-medium">Current formula</p>
              <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
{`expected = 1 / (1 + 10 ^ ((loser_rating - winner_rating) / 400))
rating_delta = max(1, round(32 * (1 - expected)))`}
              </pre>
            </div>
            <div className="space-y-2">
              {ratingExamples.map((example) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-md border p-3 text-sm"
                  key={example.match}
                >
                  <div>
                    <p className="font-medium">{example.match}</p>
                    <p className="text-xs text-muted-foreground">
                      {example.note}
                    </p>
                  </div>
                  <Badge variant="secondary">{example.change}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="size-5" />
              Tournament formats
            </CardTitle>
            <CardDescription>
              Choose the format before players register and before the
              tournament starts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormatCard
              title="Round robin"
              steps={[
                "Every player is paired with every other player.",
                "Works well for 3-8 players when everyone should play many games.",
                "The tournament completes when every scheduled game has a winner.",
              ]}
            />
            <FormatCard
              title="Knockout bracket"
              steps={[
                "Players are placed into a bracket sized to the next power of two.",
                "If the player count is uneven, empty slots create byes.",
                "Winners advance to the next round until one winner remains.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Swords className="size-5" />
              Tournament manager
            </CardTitle>
            <CardDescription>
              Organizers manage games from the tournament page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <GuideStep text="Create a tournament and choose round robin or knockout." />
            <GuideStep text="Players join while the tournament is open." />
            <GuideStep text="Organizer starts the tournament once at least two players registered." />
            <GuideStep text="The app generates games automatically." />
            <GuideStep text="Organizer can edit pairings, then report each winner." />
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Medal className="size-5" />
              What changes after a result
            </CardTitle>
            <CardDescription>
              Confirmed casual games and tournament games affect player history
              and standings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <GuideStep text="Casual reports wait for opponent confirmation." />
            <GuideStep text="Winner gains rating points based on rating difference." />
            <GuideStep text="Loser loses the same number of rating points." />
            <GuideStep text="Winner gets one win; loser gets one loss." />
            <GuideStep text="Recent results show the game and rating delta." />
            <GuideStep text="Knockout winners move into the next bracket game." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GuideFallback() {
  return (
    <div className="grid min-h-[24rem] place-items-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground sm:min-h-[40rem]">
      Loading guide...
    </div>
  );
}

function WorkflowCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="rounded-md shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function FormatCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-md border p-4">
      <p className="font-medium">{title}</p>
      <div className="mt-3 space-y-2">
        {steps.map((step) => (
          <GuideStep key={step} text={step} />
        ))}
      </div>
    </div>
  );
}

function GuideStep({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{text}</p>
    </div>
  );
}
