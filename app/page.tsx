import {
  CalendarDays,
  ChevronRight,
  CircleGauge,
  Send,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { PinPongMark } from "@/components/pinpong-mark";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
} from "@/lib/avatars";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

type HomeProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
};

type HomeTournament = {
  id: string;
  name: string;
  venue: string | null;
  starts_at: string | null;
  max_players: number | null;
  status: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
};

type HomeEntry = {
  tournament_id: string;
  user_id: string;
};

type HomeData = {
  userId: string | null;
  profiles: HomeProfile[];
  tournaments: HomeTournament[];
  entries: HomeEntry[];
};

function displayPlayer(profile: HomeProfile) {
  return profile.display_name || profile.email || "Player";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
  }).format(new Date(value));
}

async function loadHomeData(): Promise<HomeData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      profiles: [],
      tournaments: [],
      entries: [],
    };
  }

  const [profilesResult, tournamentsResult, entriesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name,avatar_style,avatar_seed,rating,wins,losses")
      .order("rating", { ascending: false })
      .limit(5),
    supabase
      .from("tournaments")
      .select("id,name,venue,starts_at,max_players,status,avatar_style,avatar_seed")
      .eq("status", "open")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(4),
    supabase.from("tournament_entries").select("tournament_id,user_id"),
  ]);

  return {
    userId: user.id,
    profiles: (profilesResult.data ?? []) as HomeProfile[],
    tournaments: (tournamentsResult.data ?? []) as HomeTournament[],
    entries: (entriesResult.data ?? []) as HomeEntry[],
  };
}

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const data = await loadHomeData();
  const isLoggedIn = Boolean(data.userId);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="flex min-h-16 w-full justify-center border-b bg-background/85 backdrop-blur">
        <div className="flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <PinPongMark animated />
            <span className="truncate">Chartwell Ping Pong</span>
          </Link>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>

      <section className="court-stripes mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-10 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_0.9fr]">
        <div className="animate-rise-in max-w-2xl">
          <Badge className="border-primary/20 bg-primary/10 text-primary shadow-sm hover:bg-primary/10">
            <PinPongMark className="mr-1 size-5 rounded-sm" />
            Rated table tennis tournaments
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal text-balance sm:text-6xl">
            Chartwell Ping Pong
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Create a player profile, join local tournaments, challenge another
            player, and keep every result tied to a rating that moves after each
            match.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Button asChild size="lg" className="w-full bg-primary shadow-sm shadow-primary/20 hover:bg-primary/90 sm:w-auto">
              <Link href="/protected">
                Open dashboard
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary/30 bg-background/75 text-primary shadow-sm hover:bg-primary/10 sm:w-auto"
            >
              <Link href={isLoggedIn ? "/protected/profile" : "/auth/sign-up"}>
                {isLoggedIn ? "Edit profile" : "Create profile"}
              </Link>
            </Button>
          </div>

          {isLoggedIn ? (
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <Feature
                href="/protected/profile"
                icon={<UserRound className="size-5" />}
                label="Profiles"
                delay="0ms"
              />
              <Feature
                href="/protected/tournaments"
                icon={<Trophy className="size-5" />}
                label="Tournaments"
                delay="80ms"
              />
              <Feature
                href="/protected#leaderboard"
                icon={<CircleGauge className="size-5" />}
                label="Ratings"
                delay="160ms"
              />
            </div>
          ) : null}
        </div>

        <div className="animate-float-in rounded-md border border-primary/20 bg-card p-3 shadow-xl shadow-primary/10 sm:p-4">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-[1fr_0.9fr]">
            <div className="rounded-md border border-primary/15 bg-background/85 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <p className="font-medium">Open tournaments</p>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {data.tournaments.length > 0 ? (
                  data.tournaments.map((tournament) => {
                    const count = data.entries.filter(
                      (entry) => entry.tournament_id === tournament.id,
                    ).length;

                    return (
                      <ScheduleRow
                        key={tournament.id}
                        title={tournament.name}
                        meta={`${formatDate(tournament.starts_at)} · ${count}/${tournament.max_players ?? "?"}`}
                      />
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">
                    {isLoggedIn
                      ? "No open tournaments yet."
                      : "Sign in to view live tournaments."}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-md border border-primary/15 bg-background/85 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-primary" />
                <p className="font-medium">Leaderboard</p>
              </div>
              <div className="mt-4 space-y-3">
                {data.profiles.length > 0 ? (
                  data.profiles.slice(0, 3).map((player, index) => (
                    <div
                      className="grid grid-cols-[1.5rem_2rem_1fr_auto] items-center gap-2 text-sm"
                      key={player.id}
                    >
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <LeaderboardAvatar player={player} />
                      <span className="min-w-0 truncate">
                        {displayPlayer(player)}
                        <span className="ml-1 text-muted-foreground">
                          ({player.wins ?? 0}-{player.losses ?? 0})
                        </span>
                      </span>
                      <Badge variant="secondary">{player.rating ?? 1000}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isLoggedIn
                      ? "No rated players yet."
                      : "Sign in to view live ratings."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-5 sm:py-10 md:grid-cols-3">
          <Workflow
            icon={<CalendarDays className="size-5" />}
            title="Create events"
            text="Set venue, start time, player cap, rating range, and registration status."
          />
          <Workflow
            icon={<Send className="size-5" />}
            title="Challenge players"
            text="Send one-to-one match invites with time, table, and match notes."
          />
          <Workflow
            icon={<CircleGauge className="size-5" />}
            title="Report results"
            text="Submit scores and update both player ratings from the result."
          />
        </div>
      </section>

      <footer className="flex items-center justify-center gap-8 border-t py-8 text-xs">
        <p>Chartwell Ping Pong</p>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}

function HomeSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-foreground">
      Loading Chartwell Ping Pong...
    </main>
  );
}

function LeaderboardAvatar({ player }: { player: HomeProfile }) {
  const label = displayPlayer(player);

  if (isInitialsAvatar(player.avatar_style)) {
    return (
      <div
        aria-label={`${label} initials avatar`}
        className="grid size-8 place-items-center rounded-md border text-xs font-semibold text-white"
        role="img"
        style={initialsAvatarColors(player.avatar_seed ?? player.id)}
      >
        {initialsForName(label)}
      </div>
    );
  }

  return (
    <div
      aria-label={`${label} avatar`}
      className="size-8 rounded-md border bg-accent bg-cover bg-center"
      role="img"
      style={{
        backgroundImage: `url("${avatarUrl(player.avatar_style, player.avatar_seed ?? player.id)}")`,
      }}
    />
  );
}

function Feature({
  href,
  icon,
  label,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  delay: string;
}) {
  return (
    <Link
      href={href}
      className="animate-rise-in flex items-center gap-3 rounded-md border border-primary/15 bg-card/95 p-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
      style={{ animationDelay: delay }}
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}

function ScheduleRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <span className="min-w-0 truncate">{title}</span>
      <span className="text-muted-foreground">{meta}</span>
    </div>
  );
}

function Workflow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-primary/10 bg-background p-5 shadow-sm">
      <div className="flex items-center gap-2 font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
