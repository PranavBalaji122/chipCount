"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function closeGame(gameId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("end_table", {
    p_game_id: gameId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/game/${gameId}`);
}

export async function settleDebt(debtId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("debts")
    .update({ status: "settled", updated_at: new Date().toISOString() })
    .eq("id", debtId)
    .eq("creditor_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/profile");
}

export async function setGameStatus(
  gameId: string,
  status: "active" | "closed",
) {
  const supabase = await createClient();

  // Verify the caller is the host
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error("Game not found");
  if (game.host_id !== user.id) throw new Error("Not the host");

  if (status === "closed") {
    const { error: rpcError } = await supabase.rpc("close_session_with_debts", {
      p_game_id: gameId,
      p_final_status: "closed",
    });
    if (rpcError) throw new Error(rpcError.message);
    revalidatePath(`/game/${gameId}`);
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return;
  }

  if (status === "active") {
    const { error: reopenError } = await supabase.rpc("reopen_session", {
      p_game_id: gameId,
    });
    if (reopenError) throw new Error(reopenError.message);
    revalidatePath(`/game/${gameId}`);
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return;
  }
}
export async function kickPlayer(gameId: string, targetUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only the host can kick
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error("Game not found");
  if (game.host_id !== user.id) throw new Error("Not the host");
  if (targetUserId === user.id) throw new Error("Cannot kick yourself");

  const { error } = await supabase
    .from("game_players")
    .update({ status: "denied" })
    .eq("game_id", gameId)
    .eq("user_id", targetUserId);

  if (error) throw new Error(error.message);

  revalidatePath(`/game/${gameId}`);
}
export async function requestRejoin(gameId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // RLS policy enforces: caller must be the denied player, can only set to 'pending'
  const { error } = await supabase
    .from("game_players")
    .update({ status: "pending" })
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .eq("status", "denied"); // extra safety: only update if currently denied

  if (error) throw new Error(error.message);

  revalidatePath(`/game/${gameId}`);
}

export async function updateRequestedAmounts(
  gameId: string,
  requestedCashIn: number,
  requestedCashOut: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only allow pending or approved players to update their own requested amounts
  const { data: player } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .single();

  if (!player || !["pending", "approved"].includes(player.status)) {
    throw new Error("Not a player in this game");
  }

  const { error } = await supabase
    .from("game_players")
    .update({
      requested_cash_in: requestedCashIn,
      requested_cash_out: requestedCashOut,
    })
    .eq("game_id", gameId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function transferHost(gameId: string, newHostUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify caller is current host
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error("Game not found");
  if (game.host_id !== user.id) throw new Error("Not the host");
  if (newHostUserId === user.id) throw new Error("Already the host");

  // New host must be an approved player
  const { data: newHostPlayer } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", newHostUserId)
    .single();

  if (!newHostPlayer || newHostPlayer.status !== "approved") {
    throw new Error("New host must be an approved player");
  }

  const { error } = await supabase
    .from("games")
    .update({ host_id: newHostUserId })
    .eq("id", gameId);

  if (error) throw new Error(error.message);

  revalidatePath(`/game/${gameId}`);
  revalidatePath("/dashboard");
}

export async function deleteSessionAt(gameId: string, snapshottedAt: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("delete_session_at", {
    p_game_id: gameId,
    p_snapshotted_at: snapshottedAt,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/game/${gameId}/metrics`);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}
