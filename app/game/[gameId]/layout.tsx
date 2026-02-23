import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart2 } from "lucide-react"

export default async function GameLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: game } = await supabase
    .from("games")
    .select("id, short_code, host_id, status, description")
    .eq("id", gameId)
    .single()

  if (!game) notFound()

  const { data: myParticipation } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .single()

  const isHost = game.host_id === user.id
  const isPlayer = !!myParticipation
  if (!isHost && !isPlayer) notFound()

  const gameLabel = game.description || `Game ${game.short_code}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/dashboard" className="shrink-0">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <Link
              href={`/game/${gameId}`}
              className="truncate font-medium hover:text-foreground transition-colors text-sm min-w-0"
            >
              {gameLabel}
            </Link>
            {isHost && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                Host
              </span>
            )}
          </div>
          <Link href={`/game/${gameId}/metrics`} className="shrink-0">
            <Button variant="outline" size="sm">
              <BarChart2 className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}

