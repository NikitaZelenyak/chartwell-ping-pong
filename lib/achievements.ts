export type AchievementKey =
  | "singles_king"
  | "doubles_dynasty"
  | "first_win"
  | "wins_10"
  | "wins_25"
  | "wins_50"
  | "wins_100"
  | "hot_streak"
  | "on_fire"
  | "upset_alert"
  | "giant_slayer"
  | "doubles_debut"
  | "team_builder"
  | "trusted_partner"
  | "table_regular"
  | "tournament_winner"
  | "bracket_climber"
  | "round_robin_grinder"
  | "comeback_player"
  | "perfect_partner";

export type AchievementDefinition = {
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "singles_king",
    name: "Singles King",
    description: "Reached first place on the singles leaderboard.",
    icon: "Crown",
  },
  {
    key: "doubles_dynasty",
    name: "Doubles Dynasty",
    description: "Member of the top-rated doubles team.",
    icon: "Trophy",
  },
  {
    key: "first_win",
    name: "First Win",
    description: "Won your first confirmed match.",
    icon: "Medal",
  },
  {
    key: "wins_10",
    name: "10 Wins",
    description: "Reached 10 total wins across singles and doubles.",
    icon: "BadgeCheck",
  },
  {
    key: "wins_25",
    name: "25 Wins",
    description: "Reached 25 total wins across singles and doubles.",
    icon: "Star",
  },
  {
    key: "wins_50",
    name: "50 Wins",
    description: "Reached 50 total wins across singles and doubles.",
    icon: "Sparkles",
  },
  {
    key: "wins_100",
    name: "100 Wins",
    description: "Reached 100 total wins across singles and doubles.",
    icon: "Gem",
  },
  {
    key: "hot_streak",
    name: "Hot Streak",
    description: "Built a 3-match winning streak.",
    icon: "Flame",
  },
  {
    key: "on_fire",
    name: "On Fire",
    description: "Built a 5-match winning streak.",
    icon: "FlameKindling",
  },
  {
    key: "upset_alert",
    name: "Upset Alert",
    description: "Won a match where the rating math favored the opponent.",
    icon: "Zap",
  },
  {
    key: "giant_slayer",
    name: "Giant Slayer",
    description: "Won a major upset against a much stronger opponent or team.",
    icon: "ShieldCheck",
  },
  {
    key: "doubles_debut",
    name: "Doubles Debut",
    description: "Joined your first accepted doubles team.",
    icon: "UsersRound",
  },
  {
    key: "team_builder",
    name: "Team Builder",
    description: "Created 3 accepted doubles teams.",
    icon: "Handshake",
  },
  {
    key: "trusted_partner",
    name: "Trusted Partner",
    description: "Won 10 doubles matches with the same teammate.",
    icon: "HeartHandshake",
  },
  {
    key: "table_regular",
    name: "Table Regular",
    description: "Played 25 confirmed matches total.",
    icon: "CalendarCheck",
  },
  {
    key: "tournament_winner",
    name: "Tournament Winner",
    description: "Won a tournament.",
    icon: "Award",
  },
  {
    key: "bracket_climber",
    name: "Bracket Climber",
    description: "Won 3 tournament games.",
    icon: "Workflow",
  },
  {
    key: "round_robin_grinder",
    name: "Round Robin Grinder",
    description: "Completed 5 round-robin tournament games.",
    icon: "Repeat",
  },
  {
    key: "comeback_player",
    name: "Comeback Player",
    description: "Won when the rating math expected a harder match.",
    icon: "TrendingUp",
  },
  {
    key: "perfect_partner",
    name: "Perfect Partner",
    description: "Belongs to a doubles team with 10 wins.",
    icon: "Crown",
  },
];

export const ACHIEVEMENT_BY_KEY = new Map(
  ACHIEVEMENTS.map((achievement) => [achievement.key, achievement]),
);
