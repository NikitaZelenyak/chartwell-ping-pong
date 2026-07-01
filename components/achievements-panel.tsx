import {
  Award,
  BadgeCheck,
  CalendarCheck,
  Crown,
  Flame,
  Gem,
  Handshake,
  HeartHandshake,
  Medal,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";

type EarnedAchievement = {
  achievement_key: string;
  awarded_at: string | null;
};

const iconMap = {
  Award,
  BadgeCheck,
  CalendarCheck,
  Crown,
  Flame,
  FlameKindling: Flame,
  Gem,
  Handshake,
  HeartHandshake,
  Medal,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
  UsersRound,
  Workflow,
  Zap,
};

function formatAwardedAt(value: string | null) {
  if (!value) {
    return "Earned";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AchievementsPanel({
  achievements,
}: {
  achievements: EarnedAchievement[];
}) {
  const earnedByKey = new Map(
    achievements.map((achievement) => [
      achievement.achievement_key,
      achievement.awarded_at,
    ]),
  );
  const earnedCount = achievements.length;

  return (
    <div className="space-y-5 px-1 pb-1 sm:px-2 sm:pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Achievements</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Earned from singles, doubles, tournaments, and leaderboard history.
          </p>
        </div>
        <Badge variant="secondary">
          {earnedCount}/{ACHIEVEMENTS.length} earned
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => {
          const earnedAt = earnedByKey.get(achievement.key);
          const earned = earnedByKey.has(achievement.key);
          const Icon =
            iconMap[achievement.icon as keyof typeof iconMap] ?? BadgeCheck;

          return (
            <div
              className={cn(
                "rounded-md border p-4 transition sm:p-5",
                earned
                  ? "border-primary/25 bg-primary/5 shadow-sm"
                  : "bg-muted/30 opacity-65",
              )}
              key={achievement.key}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-md border",
                    earned
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{achievement.name}</p>
                    {earned ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        {formatAwardedAt(earnedAt ?? null)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Locked</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
