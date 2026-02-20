import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"

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
      // If this fails, we still allow joining the game; profile can be fixed later.
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

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${code}`)}`)
  }

  await ensureProfile(supabase, user.id, user.email)

  const shortCode = code.trim().toLowerCase()

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("short_code", shortCode)
    .single()

  if (gameError || !game || game.status !== "active") {
    notFound()
  }

  const { data: existingParticipation } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", game.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existingParticipation) {
    const { error: insertError } = await supabase.from("game_players").insert({
      game_id: game.id,
      user_id: user.id,
      status: "pending"
    })

    if (insertError && insertError.code !== "23505") {
      console.error("Error joining game from invite link:", insertError)
      notFound()
    }
  }

  redirect(`/game/${game.id}`)
}

