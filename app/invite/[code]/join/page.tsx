import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { JoinRequestForm } from "./join-request-form"

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
    await supabase.from("profiles").insert({
      id: userId,
      email,
      display_name: fallbackName
    })
  }
}

export default async function InviteJoinPage({
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
    redirect(`/login?next=${encodeURIComponent(`/invite/${code}/join`)}`)
  }

  await ensureProfile(supabase, user.id, user.email ?? null)

  const shortCode = code.trim().toLowerCase()
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, description")
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

  if (existingParticipation) {
    redirect(`/game/${game.id}`)
  }

  return (
    <main id="main-content" tabIndex={-1}>
      <JoinRequestForm
        gameId={game.id}
        gameDescription={game.description ?? undefined}
      />
    </main>
  )
}
