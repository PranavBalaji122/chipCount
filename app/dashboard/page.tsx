import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardActions } from "@/components/dashboard-actions"
import { HostEndTableButton } from "@/components/host-end-table-button"
import { Leaderboard } from "@/components/leaderboard"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Add short cache for faster back/forward navigation
export const dynamic = "force-dynamic"
export const revalidate = 30 // 30 seconds

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Get user's profile for greeting
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single()

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    null

  // Get user's game memberships
  const { data: membershipsRaw } = await supabase
    .from("game_players")
    .select(
      "status, game:games!inner(id, short_code, description, status, host_id)"
    )
    .eq("user_id", user.id)
    .neq("status", "pending")
    .in("games.status", ["active", "closed"])

  const memberships = membershipsRaw?.filter((m) => {
    const game = Array.isArray(m.game) ? m.game[0] : m.game
    return game && (game as { status: string }).status !== "ended"
  })

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Greeting */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight">
          {displayName ? (
            <>
              Welcome back, {displayName}
              <span className="ml-1.5 inline-block" aria-hidden="true">
                👋
              </span>
            </>
          ) : (
            <>
              Welcome back
              <span className="ml-1.5 inline-block" aria-hidden="true">
                👋
              </span>
            </>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a new table or jump back into an active game.
        </p>
      </div>

      {/* Action tiles */}
      <div className="animate-fade-in-up animate-delay-1">
        <DashboardActions />
      </div>

      {/* Active tables */}
      {memberships && memberships.length > 0 && (
        <div className="animate-fade-in-up animate-delay-2 space-y-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Active Tables
            </h2>
          </div>
          <div className="divide-y divide-border rounded-xl border bg-card/50">
            {memberships.map(
              (m: {
                status: string
                game:
                  | {
                      id: string
                      short_code: string
                      description: string
                      status: string
                      host_id: string
                    }
                  | {
                      id: string
                      short_code: string
                      description: string
                      status: string
                      host_id: string
                    }[]
                  | null
              }) => {
                const game = Array.isArray(m.game) ? m.game[0] : m.game
                if (!game) return null
                const isHost = game.host_id === user.id
                const isDenied = m.status === "denied"
                const roleLabel = isHost
                  ? "Host"
                  : m.status === "approved"
                    ? "Player"
                    : isDenied
                      ? "Removed"
                      : "Pending"

                return (
                  <div
                    key={game.id}
                    className={`flex items-center justify-between px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      isDenied
                        ? "bg-destructive/5 opacity-75"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {game.description || "Game"}
                        </p>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isHost
                              ? "bg-primary/15 text-primary"
                              : isDenied
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {roleLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {game.short_code}
                      </p>
                      {isDenied && (
                        <p className="mt-0.5 text-xs text-destructive">
                          You were removed — open the game to request to rejoin.
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/game/${game.id}`} prefetch={true}>
                          Open
                        </Link>
                      </Button>
                      {isHost && (
                        <HostEndTableButton
                          gameId={game.id}
                          tableName={game.description ?? ""}
                        />
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="animate-fade-in-up animate-delay-3">
        <Leaderboard />
      </div>
    </div>
  )
}
