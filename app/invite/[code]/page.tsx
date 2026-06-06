import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import {
  SpectatorGameView,
  type SpectatorGameData
} from "@/components/spectator-game-view"

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | null
) {
  const fallbackName = email ? email.split("@")[0] : null

  const { data: existing } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single()

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      email,
      display_name: fallbackName
    })
    if (error) {
      console.error("Error ensuring profile in invite route:", error)
    }
  }
}

export default async function InvitePage({
  params
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const shortCode = code.trim().toLowerCase()

  if (user) {
    await ensureProfile(supabase, user.id, user.email ?? null)

    const { data: game } = await supabase
      .from("games")
      .select("id")
      .eq("short_code", shortCode)
      .maybeSingle()

    if (game) {
      const { data: existingParticipation } = await supabase
        .from("game_players")
        .select("status")
        .eq("game_id", game.id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (existingParticipation) {
        redirect(`/game/${game.id}`)
      }
    }
  }

  const { data: spectatorData, error } = await supabase.rpc(
    "get_spectator_game",
    { p_short_code: shortCode }
  )

  if (error || !spectatorData) {
    notFound()
  }

  return (
    <main id="main-content" tabIndex={-1}>
      <SpectatorGameView
        shortCode={shortCode}
        initialData={spectatorData as SpectatorGameData}
        isAuthenticated={!!user}
      />
    </main>
  )
}
