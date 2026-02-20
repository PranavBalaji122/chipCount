import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { GameSession } from "@/components/game-session"

export default async function GamePage({
  params
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, short_code, host_id, description, status")
    .eq("id", gameId)
    .single()

  if (gameError || !game) {
    notFound()
  }

  const { data: rawPlayers, error: playersError } = await supabase
    .from("game_players")
    .select(
      "user_id, status, cash_in, cash_out, requested_cash_in, requested_cash_out, profile:profiles(display_name, venmo_handle)"
    )
    .eq("game_id", gameId)

  if (playersError) {
    console.error("Error fetching players:", playersError)
  }

  const players =
    rawPlayers?.map((p: any) => ({
      user_id: p.user_id,
      status: p.status,
      cash_in: Number(p.cash_in ?? 0),
      cash_out: Number(p.cash_out ?? 0),
      requested_cash_in: Number(p.requested_cash_in ?? p.cash_in ?? 0),
      requested_cash_out: Number(p.requested_cash_out ?? p.cash_out ?? 0),
      display_name: p.profile?.display_name ?? null,
      venmo_handle: p.profile?.venmo_handle ?? null
    })) ?? []

  const isHost = game.host_id === user.id

  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const protocol = headerStore.get("x-forwarded-proto") ?? "http"
  const baseUrl = host ? `${protocol}://${host}` : ""

  return (
    <GameSession
      game={game}
      initialPlayers={players}
      currentUserId={user.id}
      isHost={isHost}
      baseUrl={baseUrl}
    />
  )
}