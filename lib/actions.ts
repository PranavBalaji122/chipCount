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
  } else {
    await insertDebtsForGame(supabase, gameId)
  }

  revalidatePath("/dashboard")
  revalidatePath("/profile")
  revalidatePath(`/game/${gameId}`)
}

// Shared helper: compute and insert debts for a game after close_session succeeds.
// Non-fatal — game is already closed if this fails.
// The insert_game_debts RPC is idempotent, so safe to call on repeated closes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertDebtsForGame(supabase: any, gameId: string) {
  try {
    const { data: players } = await supabase
      .from("game_players")
      .select("user_id, cash_in, cash_out")
      .eq("game_id", gameId)
      .eq("status", "approved")

    if (players && players.length >= 2) {
      const debts = computeDebts(
        players.map((p: { user_id: string; cash_in: number | null; cash_out: number | null }) => ({
          userId: p.user_id,
          cashIn: p.cash_in ?? 0,
          cashOut: p.cash_out ?? 0,
        }))
      )

      if (debts.length > 0) {
        const { error: debtError } = await supabase.rpc("insert_game_debts", {
          p_game_id: gameId,
          p_debts: debts,
        })
        if (debtError) {
          console.error("insert_game_debts RPC failed:", debtError)
        }
      }
    }
  } catch (err) {
    console.error("Failed to compute/insert game debts:", err)
  }
}

// Minimal debt algorithm (same logic as calcPayouts) that operates on user IDs
// directly, avoiding the name-based mapping that calcPayouts requires.
function computeDebts(
  players: Array<{ userId: string; cashIn: number; cashOut: number }>
): Array<{ creditor_id: string; debtor_id: string; amount: number }> {
  const n = players.length
  const slippage = players.reduce((sum, p) => sum + p.cashIn - p.cashOut, 0)

  const withBalances = players
    .map((p) => ({
      userId: p.userId,
      balance: p.cashOut - p.cashIn + slippage / n,
    }))
    .sort((a, b) => a.balance - b.balance)

  const debts: Array<{ creditor_id: string; debtor_id: string; amount: number }> = []
  let left = 0
  let right = withBalances.length - 1

  while (left < right) {
    const loser = withBalances[left]
    const winner = withBalances[right]
    const payment = Math.min(-loser.balance, winner.balance)

    if (payment > 1e-9) {
      debts.push({
        creditor_id: winner.userId,
        debtor_id: loser.userId,
        amount: Math.round(payment * 100) / 100,
      })
      loser.balance += payment
      winner.balance -= payment
    }

    if (Math.abs(loser.balance) < 1e-9) left++
    if (Math.abs(winner.balance) < 1e-9) right--
  }

  return debts
}

export async function settleDebt(debtId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("debts")
    .update({ status: "settled", updated_at: new Date().toISOString() })
    .eq("id", debtId)
    .eq("creditor_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/profile")
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
    // Insert debts now that the session is closed
    await insertDebtsForGame(supabase, gameId)
    revalidatePath(`/game/${gameId}`)
    revalidatePath("/dashboard")
    revalidatePath("/profile")
    return
  }

  // When reopening: zero out all player cash amounts BEFORE updating game status
  // This prevents race conditions with real-time subscriptions
  if (status === "active") {
    const { error: clearError } = await supabase
      .from("game_players")
      .update({
        cash_in: 0,
        cash_out: 0,
        requested_cash_in: 0,
        requested_cash_out: 0,
      })
      .eq("game_id", gameId)
    
    if (clearError) throw new Error(clearError.message)
  }

  const { error } = await supabase
    .from("games")
    .update({ status })
    .eq("id", gameId)

  if (error) throw new Error(error.message)

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


