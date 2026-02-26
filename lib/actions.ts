"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function closeGame(gameId: string) {
  const supabase = await createClient()

  // Try the close_session RPC (snapshots profits + updates net_profit + sets status = 'ended').
  // Fall back to a direct status update if the RPC isn't deployed yet.
  const { error: rpcError } = await supabase.rpc("close_session", {
    p_game_id: gameId,
    p_final_status: "ended",
  })

  if (rpcError) {
    console.error("close_session RPC failed, falling back to direct update:", rpcError)
    const { error: fallbackError } = await supabase
      .from("games")
      .update({ status: "ended" })
      .eq("id", gameId)
    if (fallbackError) {
      console.error("Fallback update also failed:", fallbackError)
    }
  }

  revalidatePath("/dashboard")
  revalidatePath("/profile")
  revalidatePath(`/game/${gameId}`)
}

export async function setGameStatus(
  gameId: string,
  status: "active" | "closed"
) {
  const supabase = await createClient()

  // Verify the caller is the host
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single()

  if (gameError || !game) throw new Error("Game not found")
  if (game.host_id !== user.id) throw new Error("Not the host")

  // When closing: use RPC that snapshots profits AND updates profiles.net_profit
  if (status === "closed") {
    const { error: rpcError } = await supabase.rpc("close_session", { p_game_id: gameId })
    if (rpcError) throw new Error(rpcError.message)
    // RPC already updated game status to 'closed', so we can return early
    revalidatePath(`/game/${gameId}`)
    revalidatePath("/dashboard")
    revalidatePath("/profile")
    return
  }

  const { error } = await supabase
    .from("games")
    .update({ status })
    .eq("id", gameId)

  if (error) throw new Error(error.message)

  // When reopening: clear all player cash amounts so the new session starts fresh
  if (status === "active") {
    await supabase
      .from("game_players")
      .update({
        cash_in: null,
        cash_out: null,
        requested_cash_in: null,
        requested_cash_out: null,
      })
      .eq("game_id", gameId)
  }

  revalidatePath(`/game/${gameId}`)
  revalidatePath("/dashboard")
}
export async function kickPlayer(gameId: string, targetUserId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Only the host can kick
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single()

  if (gameError || !game) throw new Error("Game not found")
  if (game.host_id !== user.id) throw new Error("Not the host")
  if (targetUserId === user.id) throw new Error("Cannot kick yourself")

  const { error } = await supabase
    .from("game_players")
    .update({ status: "denied" })
    .eq("game_id", gameId)
    .eq("user_id", targetUserId)

  if (error) throw new Error(error.message)

  revalidatePath(`/game/${gameId}`)
}
export async function requestRejoin(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // RLS policy enforces: caller must be the denied player, can only set to 'pending'
  const { error } = await supabase
    .from("game_players")
    .update({ status: "pending" })
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .eq("status", "denied") // extra safety: only update if currently denied

  if (error) throw new Error(error.message)

  revalidatePath(`/game/${gameId}`)
}

export async function updateRequestedAmounts(
  gameId: string,
  requestedCashIn: number,
  requestedCashOut: number
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Only allow pending or approved players to update their own requested amounts
  const { data: player } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .single()

  if (!player || !["pending", "approved"].includes(player.status)) {
    throw new Error("Not a player in this game")
  }

  const { error } = await supabase
    .from("game_players")
    .update({
      requested_cash_in: requestedCashIn,
      requested_cash_out: requestedCashOut,
    })
    .eq("game_id", gameId)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
}


export async function transferHost(gameId: string, newHostUserId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Verify caller is current host
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single()

  if (gameError || !game) throw new Error("Game not found")
  if (game.host_id !== user.id) throw new Error("Not the host")
  if (newHostUserId === user.id) throw new Error("Already the host")

  // New host must be an approved player
  const { data: newHostPlayer } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", newHostUserId)
    .single()

  if (!newHostPlayer || newHostPlayer.status !== "approved") {
    throw new Error("New host must be an approved player")
  }

  const { error } = await supabase
    .from("games")
    .update({ host_id: newHostUserId })
    .eq("id", gameId)

  if (error) throw new Error(error.message)

  revalidatePath(`/game/${gameId}`)
  revalidatePath("/dashboard")
}


