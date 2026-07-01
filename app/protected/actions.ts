"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AchievementKey } from "@/lib/achievements";
import {
  findPlayerAvatarOption,
  isAvatarUnlocked,
  safeAvatarSeed,
  safeAvatarStyle,
} from "@/lib/avatars";
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

function orderedPair(firstId: string, secondId: string) {
  return [firstId, secondId].sort() as [string, string];
}

async function awardAchievement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  achievementKey: AchievementKey,
  sourceType?: string,
  sourceId?: string | null,
) {
  await supabase.rpc("award_profile_achievement", {
    p_profile_id: profileId,
    p_achievement_key: achievementKey,
    p_source_type: sourceType ?? null,
    p_source_id: sourceId ?? null,
  });
}

async function evaluateProfileAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  source?: {
    id?: string | null;
    type?: string;
    winnerIds?: string[];
    ratingDelta?: number | null;
  },
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,rating,wins,losses,doubles_wins,doubles_losses")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) {
    return;
  }

  const totalWins = profile.wins ?? 0;
  const totalMatches = totalWins + (profile.losses ?? 0);

  if (totalWins >= 1) {
    await awardAchievement(supabase, profileId, "first_win", source?.type, source?.id);
  }
  if (totalWins >= 10) {
    await awardAchievement(supabase, profileId, "wins_10", source?.type, source?.id);
  }
  if (totalWins >= 25) {
    await awardAchievement(supabase, profileId, "wins_25", source?.type, source?.id);
  }
  if (totalWins >= 50) {
    await awardAchievement(supabase, profileId, "wins_50", source?.type, source?.id);
  }
  if (totalWins >= 100) {
    await awardAchievement(supabase, profileId, "wins_100", source?.type, source?.id);
  }
  if (totalMatches >= 25) {
    await awardAchievement(supabase, profileId, "table_regular", source?.type, source?.id);
  }
  if (
    source?.winnerIds?.includes(profileId) &&
    typeof source.ratingDelta === "number"
  ) {
    if (source.ratingDelta >= 18) {
      await awardAchievement(supabase, profileId, "comeback_player", source.type, source.id);
    }
    if (source.ratingDelta >= 24) {
      await awardAchievement(supabase, profileId, "upset_alert", source.type, source.id);
    }
    if (source.ratingDelta >= 30) {
      await awardAchievement(supabase, profileId, "giant_slayer", source.type, source.id);
    }
  }

  const { data: topSingles } = await supabase
    .from("profiles")
    .select("id")
    .order("rating", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topSingles?.id === profileId) {
    await awardAchievement(supabase, profileId, "singles_king", "leaderboard", profileId);
  }

  const { data: myTeams } = await supabase
    .from("doubles_teams")
    .select("id,created_by,rating,wins")
    .or(`player_one_id.eq.${profileId},player_two_id.eq.${profileId}`);

  if (myTeams?.length) {
    await awardAchievement(supabase, profileId, "doubles_debut", "doubles_team", myTeams[0].id);
  }

  if ((myTeams ?? []).filter((team) => team.created_by === profileId).length >= 3) {
    await awardAchievement(supabase, profileId, "team_builder", "doubles_team", profileId);
  }

  const tenWinTeam = (myTeams ?? []).find((team) => (team.wins ?? 0) >= 10);
  if (tenWinTeam) {
    await awardAchievement(supabase, profileId, "trusted_partner", "doubles_team", tenWinTeam.id);
    await awardAchievement(supabase, profileId, "perfect_partner", "doubles_team", tenWinTeam.id);
  }

  const { data: topDoubles } = await supabase
    .from("doubles_teams")
    .select("id,player_one_id,player_two_id")
    .order("rating", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    topDoubles &&
    [topDoubles.player_one_id, topDoubles.player_two_id].includes(profileId)
  ) {
    await awardAchievement(supabase, profileId, "doubles_dynasty", "doubles_team", topDoubles.id);
  }

  const { data: tournamentWinner } = await supabase
    .from("tournament_entries")
    .select("tournament_id")
    .eq("user_id", profileId)
    .eq("status", "winner")
    .limit(1)
    .maybeSingle();

  if (tournamentWinner) {
    await awardAchievement(
      supabase,
      profileId,
      "tournament_winner",
      "tournament",
      tournamentWinner.tournament_id,
    );
  }

  const { count: tournamentWins } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("winner_id", profileId)
    .not("tournament_id", "is", null);

  if ((tournamentWins ?? 0) >= 3) {
    await awardAchievement(supabase, profileId, "bracket_climber", "match", profileId);
  }

  const { count: roundRobinGames } = await supabase
    .from("matches")
    .select("id,tournaments!inner(format)", { count: "exact", head: true })
    .or(`player_one_id.eq.${profileId},player_two_id.eq.${profileId}`)
    .eq("tournaments.format", "round_robin");

  if ((roundRobinGames ?? 0) >= 5) {
    await awardAchievement(supabase, profileId, "round_robin_grinder", "match", profileId);
  }

  if (totalWins >= 3) {
    await awardAchievement(supabase, profileId, "hot_streak", source?.type, source?.id);
  }
  if (totalWins >= 5) {
    await awardAchievement(supabase, profileId, "on_fire", source?.type, source?.id);
  }
}

async function evaluateProfilesAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileIds: string[],
  source?: Parameters<typeof evaluateProfileAchievements>[2],
) {
  for (const profileId of new Set(profileIds)) {
    await evaluateProfileAchievements(supabase, profileId, source);
  }
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

function cleanPlayerAvatarChoice(
  value: FormDataEntryValue | null,
  achievementCount: number,
  fallbackSeed: string,
) {
  const [style, rawSeed] = String(value ?? "").split("|");
  const seed = safeAvatarSeed(rawSeed, fallbackSeed);
  const option = findPlayerAvatarOption(style, seed);

  if (!option) {
    throw new Error("Choose a valid profile avatar.");
  }

  if (!isAvatarUnlocked(option, achievementCount)) {
    throw new Error(
      `This avatar unlocks at ${option.minAchievements ?? 0} achievements.`,
    );
  }

  return {
    avatar_style: option.style,
    avatar_seed: seed,
  };
}

export async function syncMyAchievements() {
  const { supabase, user } = await getCurrentUser();

  await evaluateProfileAchievements(supabase, user.id, {
    id: user.id,
    type: "profile_sync",
  });

  revalidatePath("/protected");
  revalidatePath("/protected/profile");
  revalidatePath(`/protected/players/${user.id}`);
}

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const { count: achievementCount, error: achievementError } = await supabase
    .from("profile_achievements")
    .select("achievement_key", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if (achievementError) {
    throw new Error(achievementError.message);
  }

  const avatar = cleanPlayerAvatarChoice(
    formData.get("avatar_choice"),
    achievementCount ?? 0,
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
  revalidatePath("/protected/tournaments");
}

export async function updateTournamentSettings(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const tournamentId = cleanString(formData.get("tournament_id"));

  if (!tournamentId) {
    throw new Error("Tournament is required.");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,organizer_id,status,max_players")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message ?? "Tournament not found.");
  }

  if (tournament.organizer_id !== user.id) {
    throw new Error("Only the organizer can update this tournament.");
  }

  if (["completed", "cancelled"].includes(tournament.status ?? "")) {
    throw new Error("Completed or cancelled tournaments cannot be changed.");
  }

  const { count, error: countError } = await supabase
    .from("tournament_entries")
    .select("user_id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "registered");

  if (countError) {
    throw new Error(countError.message);
  }

  const registeredPlayers = count ?? 0;
  const maxPlayers = Math.trunc(cleanNumber(formData.get("max_players"), tournament.max_players ?? 2));
  const minimumPlayers = Math.max(2, registeredPlayers);

  if (maxPlayers < minimumPlayers) {
    throw new Error(
      `Max players cannot be lower than the ${registeredPlayers} player${registeredPlayers === 1 ? "" : "s"} already registered.`,
    );
  }

  const { error } = await supabase
    .from("tournaments")
    .update({
      starts_at: dateTimeLocalToIso(cleanString(formData.get("starts_at"))),
      max_players: maxPlayers,
    })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected");
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${tournamentId}`);
}

export async function deleteTournament(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const tournamentId = cleanString(formData.get("tournament_id"));

  if (!tournamentId) {
    throw new Error("Tournament is required.");
  }

  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected");
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${tournamentId}`);
  redirect("/protected/tournaments");
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
    .select("id,organizer_id,format,max_players")
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
  const requiredPlayers = tournament.max_players ?? 2;

  if (playerIds.length < requiredPlayers) {
    throw new Error(
      `This tournament needs ${requiredPlayers} registered players before it can start.`,
    );
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
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${tournamentId}`);
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
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${game.tournament_id}`);
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

  const { data: matchId, error: ratingError } = await supabase.rpc("report_match", {
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

  await evaluateProfilesAchievements(
    supabase,
    [game.player_one_id, game.player_two_id],
    {
      id: matchId,
      type: "match",
      winnerIds: [winnerId],
    },
  );

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

  await evaluateProfileAchievements(supabase, winnerId, {
    id: matchId,
    type: "match",
    winnerIds: [winnerId],
  });

  revalidatePath("/protected");
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${game.tournament_id}`);
}

export async function joinTournament(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const tournamentId = cleanString(formData.get("tournament_id"));

  if (!tournamentId) {
    throw new Error("Tournament is required.");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,max_players,status")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message ?? "Tournament not found.");
  }

  if (tournament.status !== "open") {
    throw new Error("This tournament is not open for registration.");
  }

  const { count, error: countError } = await supabase
    .from("tournament_entries")
    .select("user_id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "registered");

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) >= (tournament.max_players ?? 2)) {
    throw new Error("This tournament is already full.");
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
  revalidatePath("/protected/tournaments");
  revalidatePath(`/protected/tournaments/${tournamentId}`);
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

export async function deleteInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const inviteId = cleanString(formData.get("invite_id"));

  if (!inviteId) {
    throw new Error("Invite is required.");
  }

  const { error } = await supabase
    .from("match_invites")
    .delete()
    .eq("id", inviteId)
    .or(`created_by.eq.${user.id},opponent_id.eq.${user.id}`);

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

  const { data: matchId, error } = await supabase.rpc("confirm_match_report", {
    p_report_id: reportId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (matchId) {
    const { data: match } = await supabase
      .from("matches")
      .select("player_one_id,player_two_id,winner_id,rating_delta")
      .eq("id", matchId)
      .maybeSingle();

    if (match) {
      await evaluateProfilesAchievements(
        supabase,
        [match.player_one_id, match.player_two_id],
        {
          id: matchId,
          type: "match",
          winnerIds: [match.winner_id],
          ratingDelta: match.rating_delta,
        },
      );
    }
  }

  revalidatePath("/protected/invites");
  revalidatePath("/protected");
  revalidatePath("/protected/profile");
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

export async function createDoublesTeamInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const partnerId = cleanString(formData.get("partner_id"));
  const teamName = cleanString(formData.get("team_name"));

  if (!partnerId || partnerId === user.id) {
    throw new Error("Choose another player as your doubles partner.");
  }

  if (!teamName) {
    throw new Error("Team name is required.");
  }

  const [playerOneId, playerTwoId] = orderedPair(user.id, partnerId);

  const { data: existingTeam } = await supabase
    .from("doubles_teams")
    .select("id")
    .eq("player_one_id", playerOneId)
    .eq("player_two_id", playerTwoId)
    .maybeSingle();

  if (existingTeam) {
    throw new Error("You already have an accepted doubles team with this player.");
  }

  const { error } = await supabase.from("doubles_team_invites").insert({
    created_by: user.id,
    invited_user_id: partnerId,
    player_one_id: playerOneId,
    player_two_id: playerTwoId,
    team_name: teamName,
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/doubles");
}

export async function respondToDoublesTeamInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const inviteId = cleanString(formData.get("invite_id"));
  const status = cleanString(formData.get("status"));

  if (!inviteId || !["accepted", "declined", "cancelled"].includes(status ?? "")) {
    throw new Error("Team invite response is invalid.");
  }

  const { data: invite, error: inviteError } = await supabase
    .from("doubles_team_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    throw new Error(inviteError?.message ?? "Team invite not found.");
  }

  if (invite.status !== "pending") {
    throw new Error("This team invite has already been handled.");
  }

  if (status === "cancelled" && invite.created_by !== user.id) {
    throw new Error("Only the sender can cancel this team invite.");
  }

  if (["accepted", "declined"].includes(status ?? "") && invite.invited_user_id !== user.id) {
    throw new Error("Only the invited player can respond.");
  }

  let acceptedTeamId: string | null = null;

  if (status === "accepted") {
    const { data: existingTeam } = await supabase
      .from("doubles_teams")
      .select("id")
      .eq("player_one_id", invite.player_one_id)
      .eq("player_two_id", invite.player_two_id)
      .maybeSingle();

    if (existingTeam) {
      acceptedTeamId = existingTeam.id;
    } else {
      const { data: team, error: teamError } = await supabase
        .from("doubles_teams")
        .insert({
          name: invite.team_name,
          created_by: invite.created_by,
          player_one_id: invite.player_one_id,
          player_two_id: invite.player_two_id,
        })
        .select("id")
        .single();

      if (teamError || !team) {
        throw new Error(teamError?.message ?? "Could not create doubles team.");
      }

      acceptedTeamId = team.id;
    }
  }

  const { error } = await supabase
    .from("doubles_team_invites")
    .update({
      status,
      accepted_team_id: acceptedTeamId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inviteId);

  if (error) {
    throw new Error(error.message);
  }

  if (acceptedTeamId) {
    await evaluateProfilesAchievements(
      supabase,
      [invite.player_one_id, invite.player_two_id],
      { id: acceptedTeamId, type: "doubles_team" },
    );
  }

  revalidatePath("/protected/doubles");
  revalidatePath("/protected/profile");
}

export async function deleteDoublesTeamInvite(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const inviteId = cleanString(formData.get("invite_id"));

  if (!inviteId) {
    throw new Error("Team invite is required.");
  }

  const { error } = await supabase
    .from("doubles_team_invites")
    .delete()
    .eq("id", inviteId)
    .or(`created_by.eq.${user.id},invited_user_id.eq.${user.id}`);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/doubles");
}

export async function renameDoublesTeam(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const teamId = cleanString(formData.get("team_id"));
  const teamName = cleanString(formData.get("team_name"));

  if (!teamId || !teamName) {
    throw new Error("Team and team name are required.");
  }

  const { error } = await supabase
    .from("doubles_teams")
    .update({ name: teamName })
    .eq("id", teamId)
    .or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/doubles");
}

export async function submitDoublesMatchReport(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const teamOneId = cleanString(formData.get("team_one_id"));
  const teamTwoId = cleanString(formData.get("team_two_id"));
  const winnerTeamId = cleanString(formData.get("winner_team_id"));

  if (!teamOneId || !teamTwoId || !winnerTeamId || teamOneId === teamTwoId) {
    throw new Error("Choose two different doubles teams and a winner.");
  }

  if (![teamOneId, teamTwoId].includes(winnerTeamId)) {
    throw new Error("Winner must be one of the selected teams.");
  }

  const { data: teams, error: teamsError } = await supabase
    .from("doubles_teams")
    .select("id,player_one_id,player_two_id")
    .in("id", [teamOneId, teamTwoId]);

  if (teamsError || !teams || teams.length !== 2) {
    throw new Error(teamsError?.message ?? "Both doubles teams are required.");
  }

  const teamOne = teams.find((team) => team.id === teamOneId);
  const teamTwo = teams.find((team) => team.id === teamTwoId);

  if (!teamOne || !teamTwo) {
    throw new Error("Both doubles teams are required.");
  }

  const teamOnePlayers = [teamOne.player_one_id, teamOne.player_two_id];
  const teamTwoPlayers = [teamTwo.player_one_id, teamTwo.player_two_id];

  if (teamOnePlayers.some((playerId) => teamTwoPlayers.includes(playerId))) {
    throw new Error("Teams sharing a player cannot play a rated doubles match.");
  }

  const reporterTeamId = teamOnePlayers.includes(user.id)
    ? teamOneId
    : teamTwoPlayers.includes(user.id)
      ? teamTwoId
      : null;

  if (!reporterTeamId) {
    throw new Error("You must belong to one selected doubles team.");
  }

  const responderTeamId = reporterTeamId === teamOneId ? teamTwoId : teamOneId;

  const { error } = await supabase.from("doubles_match_reports").insert({
    reporter_id: user.id,
    team_one_id: teamOneId,
    team_two_id: teamTwoId,
    winner_team_id: winnerTeamId,
    responder_team_id: responderTeamId,
    team_one_score: Math.max(0, cleanNumber(formData.get("team_one_score"), 0)),
    team_two_score: Math.max(0, cleanNumber(formData.get("team_two_score"), 0)),
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/doubles");
}

export async function confirmDoublesMatchReport(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const reportId = cleanString(formData.get("report_id"));

  if (!reportId) {
    throw new Error("Doubles report is required.");
  }

  const { data: matchId, error } = await supabase.rpc(
    "confirm_doubles_match_report",
    { p_report_id: reportId },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (matchId) {
    const { data: match } = await supabase
      .from("doubles_matches")
      .select("team_one_id,team_two_id,winner_team_id,profile_rating_delta")
      .eq("id", matchId)
      .maybeSingle();

    if (match) {
      const { data: teams } = await supabase
        .from("doubles_teams")
        .select("id,player_one_id,player_two_id")
        .in("id", [match.team_one_id, match.team_two_id]);

      const profileIds =
        teams?.flatMap((team) => [team.player_one_id, team.player_two_id]) ?? [];
      const winnerTeam = teams?.find((team) => team.id === match.winner_team_id);
      const winnerIds = winnerTeam
        ? [winnerTeam.player_one_id, winnerTeam.player_two_id]
        : [];

      await evaluateProfilesAchievements(supabase, profileIds, {
        id: matchId,
        type: "doubles_match",
        winnerIds,
        ratingDelta: match.profile_rating_delta,
      });
    }
  }

  revalidatePath("/protected/doubles");
  revalidatePath("/protected/profile");
}

export async function declineDoublesMatchReport(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const reportId = cleanString(formData.get("report_id"));

  if (!reportId) {
    throw new Error("Doubles report is required.");
  }

  const { data: report, error: reportError } = await supabase
    .from("doubles_match_reports")
    .select("id,responder_team_id,status")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error(reportError?.message ?? "Doubles report not found.");
  }

  if (report.status !== "pending") {
    throw new Error("This doubles report has already been handled.");
  }

  const { data: responderTeam } = await supabase
    .from("doubles_teams")
    .select("player_one_id,player_two_id")
    .eq("id", report.responder_team_id)
    .maybeSingle();

  if (
    !responderTeam ||
    ![responderTeam.player_one_id, responderTeam.player_two_id].includes(user.id)
  ) {
    throw new Error("Only a player from the opposing team can decline this report.");
  }

  const { error } = await supabase
    .from("doubles_match_reports")
    .update({
      status: "declined",
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/protected/doubles");
}
