"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeAvatarSeed, safeAvatarStyle } from "@/lib/avatars";
import { dateTimeLocalToIso } from "@/lib/datetime";

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to do that.");
  }

  return { supabase, user };
}

function cleanString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function cleanNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanTournamentFormat(value: FormDataEntryValue | null) {
  const format = String(value ?? "");
  return format === "round_robin" ? "round_robin" : "single_elimination";
}

function cleanAvatarChoice(
  value: FormDataEntryValue | null,
  fallbackStyle: string,
  fallbackSeed: string,
) {
  const [style, seed] = String(value ?? "").split("|");

  return {
    avatar_style: safeAvatarStyle(style, fallbackStyle),
    avatar_seed: safeAvatarSeed(seed, fallbackSeed),
  };
}

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const avatar = cleanAvatarChoice(
    formData.get("avatar_choice"),
    "lorelei",
    user.id,
  );

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: cleanString(formData.get("display_name")),
      preferred_hand: cleanString(formData.get("preferred_hand")),
      ...avatar,
      bio: cleanString(formData.get("bio")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/protected");
  revalidatePath("/protected/profile");
}

export async function createTournament(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const maxPlayers = cleanNumber(formData.get("max_players"), 16);
  const skillFloor = cleanNumber(formData.get("skill_floor"), 900);
  const skillCeiling = cleanNumber(formData.get("skill_ceiling"), 2400);
  const name = cleanString(formData.get("name"));
  const avatar = cleanAvatarChoice(
    formData.get("avatar_choice"),
    "shapes",
    name ?? "chartwell-tournament",
  );

  const { error } = await supabase.from("tournaments").insert({
    organizer_id: user.id,
    name,
    venue: cleanString(formData.get("venue")),
    starts_at: dateTimeLocalToIso(cleanString(formData.get("starts_at"))),
    max_players: maxPlayers,
    skill_floor: skillFloor,
    skill_ceiling: skillCeiling,
    format: cleanTournamentFormat(formData.get("format")),
    ...avatar,
    status: "open",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected");
}

function nextPowerOfTwo(value: number) {
  let size = 1;

  while (size < value) {
    size *= 2;
  }

  return size;
}

type TournamentGameInsert = {
  tournament_id: string;
  round_number: number;
  game_number: number;
  player_one_id: string | null;
  player_two_id: string | null;
  winner_id: string | null;
  status: "scheduled" | "completed";
};

function buildRoundRobinGames(tournamentId: string, playerIds: string[]) {
  const games: TournamentGameInsert[] = [];
  let gameNumber = 1;

  for (let first = 0; first < playerIds.length; first += 1) {
    for (let second = first + 1; second < playerIds.length; second += 1) {
      games.push({
        tournament_id: tournamentId,
        round_number: 1,
        game_number: gameNumber,
        player_one_id: playerIds[first],
        player_two_id: playerIds[second],
        winner_id: null,
        status: "scheduled",
      });
      gameNumber += 1;
    }
  }

  return games;
}

function buildSingleEliminationGames(tournamentId: string, playerIds: string[]) {
  const bracketSize = nextPowerOfTwo(playerIds.length);
  const rounds = Math.log2(bracketSize);
  const slots = [...playerIds, ...Array<string | null>(bracketSize - playerIds.length).fill(null)];
  const games: TournamentGameInsert[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const gamesInRound = bracketSize / 2 ** round;

    for (let game = 1; game <= gamesInRound; game += 1) {
      games.push({
        tournament_id: tournamentId,
        round_number: round,
        game_number: game,
        player_one_id: null,
        player_two_id: null,
        winner_id: null,
        status: "scheduled",
      });
    }
  }

  for (let index = 0; index < bracketSize; index += 2) {
    const game = games[index / 2];
    const playerOne = slots[index];
    const playerTwo = slots[index + 1];
    const byeWinner = playerOne && !playerTwo ? playerOne : playerTwo && !playerOne ? playerTwo : null;

    game.player_one_id = playerOne;
    game.player_two_id = playerTwo;

    if (byeWinner) {
      game.winner_id = byeWinner;
      game.status = "completed";

      const nextGame = games.find(
        (candidate) =>
          candidate.round_number === 2 &&
          candidate.game_number === Math.ceil(game.game_number / 2),
      );

      if (nextGame) {
        if (game.game_number % 2 === 1) {
          nextGame.player_one_id = byeWinner;
        } else {
          nextGame.player_two_id = byeWinner;
        }
      }
    }
  }

  return games;
}

export async function startTournament(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const tournamentId = cleanString(formData.get("tournament_id"));

  if (!tournamentId) {
    throw new Error("Tournament is required.");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,organizer_id,format")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message ?? "Tournament not found.");
  }

  if (tournament.organizer_id !== user.id) {
    throw new Error("Only the organizer can start this tournament.");
  }

  const { data: entries, error: entriesError } = await supabase
    .from("tournament_entries")
    .select("user_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "registered");

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const playerIds = (entries ?? []).map((entry) => entry.user_id);

  if (playerIds.length < 2) {
    throw new Error("At least two registered players are required.");
  }

  const { error: deleteError } = await supabase
    .from("tournament_games")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const games =
    tournament.format === "round_robin"
      ? buildRoundRobinGames(tournamentId, playerIds)
      : buildSingleEliminationGames(tournamentId, playerIds);

  const { error: gamesError } = await supabase
    .from("tournament_games")
    .insert(games);

  if (gamesError) {
    throw new Error(gamesError.message);
  }

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ status: "running" })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/protected");
}

export async function updateTournamentGame(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const gameId = cleanString(formData.get("game_id"));
  const playerOneId = cleanString(formData.get("player_one_id"));
  const playerTwoId = cleanString(formData.get("player_two_id"));

  if (!gameId || !playerOneId || !playerTwoId || playerOneId === playerTwoId) {
    throw new Error("Choose two different players.");
  }

  const { data: game, error: gameError } = await supabase
    .from("tournament_games")
    .select("id,tournament_id,tournaments!inner(organizer_id)")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    throw new Error(gameError?.message ?? "Game not found.");
  }

  const tournament = Array.isArray(game.tournaments)
    ? game.tournaments[0]
    : game.tournaments;

  if (tournament?.organizer_id !== user.id) {
    throw new Error("Only the organizer can edit games.");
  }

  const { error } = await supabase
    .from("tournament_games")
    .update({
      player_one_id: playerOneId,
      player_two_id: playerTwoId,
      winner_id: null,
      status: "scheduled",
    })
    .eq("id", gameId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected");
}

export async function reportTournamentGame(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const gameId = cleanString(formData.get("game_id"));
  const winnerId = cleanString(formData.get("winner_id"));

  if (!gameId || !winnerId) {
    throw new Error("Winner is required.");
  }

  const { data: game, error: gameError } = await supabase
    .from("tournament_games")
    .select(
      "id,tournament_id,round_number,game_number,player_one_id,player_two_id,tournaments!inner(id,organizer_id,format)",
    )
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    throw new Error(gameError?.message ?? "Game not found.");
  }

  const tournament = Array.isArray(game.tournaments)
    ? game.tournaments[0]
    : game.tournaments;

  if (tournament?.organizer_id !== user.id) {
    throw new Error("Only the organizer can report tournament games.");
  }

  if (winnerId !== game.player_one_id && winnerId !== game.player_two_id) {
    throw new Error("Winner must be one of the game players.");
  }

  const loserId = winnerId === game.player_one_id ? game.player_two_id : game.player_one_id;

  if (!loserId) {
    throw new Error("Both players are required before reporting a winner.");
  }

  const { error: ratingError } = await supabase.rpc("report_match", {
    p_player_one: game.player_one_id,
    p_player_two: game.player_two_id,
    p_winner: winnerId,
    p_player_one_score: winnerId === game.player_one_id ? 1 : 0,
    p_player_two_score: winnerId === game.player_two_id ? 1 : 0,
    p_score_summary: "Tournament game",
    p_tournament_id: game.tournament_id,
    p_invite_id: null,
  });

  if (ratingError) {
    throw new Error(ratingError.message);
  }

  const { error: updateError } = await supabase
    .from("tournament_games")
    .update({ winner_id: winnerId, status: "completed" })
    .eq("id", gameId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (tournament.format === "single_elimination") {
    const nextRound = game.round_number + 1;
    const nextGameNumber = Math.ceil(game.game_number / 2);
    const nextSlot = game.game_number % 2 === 1 ? "player_one_id" : "player_two_id";

    const { data: nextGame } = await supabase
      .from("tournament_games")
      .select("id")
      .eq("tournament_id", game.tournament_id)
      .eq("round_number", nextRound)
      .eq("game_number", nextGameNumber)
      .maybeSingle();

    if (nextGame) {
      const { error: advanceError } = await supabase
        .from("tournament_games")
        .update({ [nextSlot]: winnerId })
        .eq("id", nextGame.id);

      if (advanceError) {
        throw new Error(advanceError.message);
      }
    } else {
      await supabase
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", game.tournament_id);

      await supabase
        .from("tournament_entries")
        .update({ status: "winner" })
        .eq("tournament_id", game.tournament_id)
        .eq("user_id", winnerId);
    }
  } else {
    const { data: openGames } = await supabase
      .from("tournament_games")
      .select("id")
      .eq("tournament_id", game.tournament_id)
      .eq("status", "scheduled")
      .limit(1);

    if (!openGames?.length) {
      await supabase
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", game.tournament_id);
    }
  }

  revalidatePath("/protected");
}

export async function joinTournament(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const tournamentId = cleanString(formData.get("tournament_id"));

  if (!tournamentId) {
    throw new Error("Tournament is required.");
  }

  const { error } = await supabase.from("tournament_entries").upsert(
    {
      tournament_id: tournamentId,
      user_id: user.id,
      status: "registered",
    },
    { onConflict: "tournament_id,user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected");
}

export async function sendInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const opponentId = cleanString(formData.get("opponent_id"));

  if (!opponentId || opponentId === user.id) {
    throw new Error("Choose another player.");
  }

  const { error } = await supabase.from("match_invites").insert({
    created_by: user.id,
    opponent_id: opponentId,
    scheduled_for: dateTimeLocalToIso(cleanString(formData.get("scheduled_for"))),
    location: cleanString(formData.get("location")),
    note: cleanString(formData.get("note")),
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}

export async function updateInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const inviteId = cleanString(formData.get("invite_id"));

  if (!inviteId) {
    throw new Error("Invite is required.");
  }

  const { error } = await supabase
    .from("match_invites")
    .update({
      scheduled_for: dateTimeLocalToIso(cleanString(formData.get("scheduled_for"))),
      location: cleanString(formData.get("location")),
      note: cleanString(formData.get("note")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("created_by", user.id)
    .in("status", ["pending", "accepted"]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}

export async function respondToInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const inviteId = cleanString(formData.get("invite_id"));
  const status = cleanString(formData.get("status"));

  if (!inviteId || !["accepted", "declined", "cancelled"].includes(status ?? "")) {
    throw new Error("Invite response is invalid.");
  }

  let query = supabase
    .from("match_invites")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  query =
    status === "cancelled"
      ? query.eq("created_by", user.id)
      : query.eq("opponent_id", user.id);

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}

export async function submitCasualMatchReport(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const opponentId = cleanString(formData.get("opponent_id"));
  const result = cleanString(formData.get("result"));
  const inviteId = cleanString(formData.get("invite_id"));

  if (!opponentId || opponentId === user.id) {
    throw new Error("Choose a valid opponent.");
  }

  if (!["win", "loss"].includes(result ?? "")) {
    throw new Error("Choose who won the match.");
  }

  if (inviteId) {
    const { data: invite, error: inviteError } = await supabase
      .from("match_invites")
      .select("created_by,opponent_id,status")
      .eq("id", inviteId)
      .single();

    if (inviteError || !invite) {
      throw new Error(inviteError?.message ?? "Invite was not found.");
    }

    const invitePlayers = [invite.created_by, invite.opponent_id];

    if (
      invite.status !== "accepted" ||
      !invitePlayers.includes(user.id) ||
      !invitePlayers.includes(opponentId)
    ) {
      throw new Error("This invite cannot be reported.");
    }
  }

  const winnerId = result === "win" ? user.id : opponentId;
  const playerOneScore = result === "win" ? 1 : 0;
  const playerTwoScore = result === "win" ? 0 : 1;

  const { error } = await supabase.from("match_reports").insert({
    reporter_id: user.id,
    opponent_id: opponentId,
    invite_id: inviteId,
    player_one_id: user.id,
    player_two_id: opponentId,
    winner_id: winnerId,
    player_one_score: playerOneScore,
    player_two_score: playerTwoScore,
    score_summary: cleanString(formData.get("score_summary")),
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}

export async function confirmMatchReport(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const reportId = cleanString(formData.get("report_id"));

  if (!reportId) {
    throw new Error("Match report is required.");
  }

  const { error } = await supabase.rpc("confirm_match_report", {
    p_report_id: reportId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}

export async function declineMatchReport(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const reportId = cleanString(formData.get("report_id"));

  if (!reportId) {
    throw new Error("Match report is required.");
  }

  const { error } = await supabase
    .from("match_reports")
    .update({
      status: "declined",
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("opponent_id", user.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
}
