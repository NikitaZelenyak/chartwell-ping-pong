"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitDoublesMatchReport } from "@/app/protected/actions";

type DoublesTeamOption = {
  id: string;
  name: string;
  player_one_id: string;
  player_two_id: string;
  rating: number | null;
};

const selectControlClass =
  "h-11 rounded-md border border-input bg-background px-3 text-base shadow-sm md:h-9 md:text-sm";

function teamLabel(team: DoublesTeamOption) {
  return `${team.name} · ${team.rating ?? 1000}`;
}

export function DoublesMatchReportForm({
  myTeams,
  teams,
}: {
  myTeams: DoublesTeamOption[];
  teams: DoublesTeamOption[];
}) {
  const [teamOneId, setTeamOneId] = useState(myTeams[0]?.id ?? "");
  const [teamTwoId, setTeamTwoId] = useState("");
  const [winnerSide, setWinnerSide] = useState<"team_one" | "team_two">("team_one");
  const selectedTeamOne = teams.find((team) => team.id === teamOneId);

  const opponentTeams = useMemo(() => {
    if (!selectedTeamOne) {
      return [];
    }

    const selectedPlayers = [
      selectedTeamOne.player_one_id,
      selectedTeamOne.player_two_id,
    ];

    return teams.filter(
      (team) =>
        team.id !== selectedTeamOne.id &&
        !selectedPlayers.includes(team.player_one_id) &&
        !selectedPlayers.includes(team.player_two_id),
    );
  }, [selectedTeamOne, teams]);

  const winnerTeamId = winnerSide === "team_one" ? teamOneId : teamTwoId;

  return (
    <form action={submitDoublesMatchReport} className="grid gap-4">
      <input type="hidden" name="winner_team_id" value={winnerTeamId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="team_one_id">Your team</Label>
          <select
            id="team_one_id"
            name="team_one_id"
            className={selectControlClass}
            value={teamOneId}
            onChange={(event) => {
              setTeamOneId(event.target.value);
              setTeamTwoId("");
              setWinnerSide("team_one");
            }}
            required
          >
            <option value="">Choose team</option>
            {myTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="team_two_id">Opponent team</Label>
          <select
            id="team_two_id"
            name="team_two_id"
            className={selectControlClass}
            value={teamTwoId}
            onChange={(event) => setTeamTwoId(event.target.value)}
            required
          >
            <option value="">Choose opponent team</option>
            {opponentTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_0.6fr_0.6fr]">
        <div className="grid gap-2">
          <Label htmlFor="winner_side">Winner</Label>
          <select
            id="winner_side"
            className={selectControlClass}
            value={winnerSide}
            onChange={(event) =>
              setWinnerSide(event.target.value as "team_one" | "team_two")
            }
            required
          >
            <option value="team_one">Your team won</option>
            <option value="team_two">Opponent team won</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="team_one_score">Your score</Label>
          <Input id="team_one_score" name="team_one_score" min={0} type="number" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="team_two_score">Opponent score</Label>
          <Input id="team_two_score" name="team_two_score" min={0} type="number" />
        </div>
      </div>
      <Button
        type="submit"
        disabled={myTeams.length === 0 || opponentTeams.length === 0 || !teamTwoId}
        className="w-full sm:w-auto"
      >
        <Check className="size-4" />
        Send for confirmation
      </Button>
    </form>
  );
}
