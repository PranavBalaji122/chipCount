import { closeGame } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardActions } from "@/components/dashboard-actions"
import { Leaderboard } from "@/components/leaderboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: membershipsRaw } = await supabase
    .from("game_players")
    .select("status, game:games!inner(id, short_code, description, status, host_id)")
    .eq("user_id", user.id)
    .neq("status", "pending")   // exclude people who requested but were never approved
    .in("games.status", ["active", "closed"])

  // JS safety filter — exclude ended games even if the PostgREST filter above
  // didn't apply (e.g. when filtering on a joined-table column is unreliable).
  const memberships = membershipsRaw?.filter((m) => {
    const game = Array.isArray(m.game) ? m.game[0] : m.game
    return game && (game as { status: string }).status !== "ended"
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Start a new table, join one with a game ID, or check the leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardActions />
        </CardContent>
      </Card>

      {memberships && memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your active tables</CardTitle>
            <CardDescription>
              Quickly jump back into tables you&apos;re hosting or playing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberships.map((m: { status: string; game: { id: string; short_code: string; description: string; status: string; host_id: string } | { id: string; short_code: string; description: string; status: string; host_id: string }[] | null }) => {
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
                  className={`flex flex-col gap-2 rounded border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${isDenied ? "border-red-500/20 bg-red-500/5 opacity-75" : ""
                    }`}
                >
                  <div>
                    <p className="font-medium">
                      {game.description || "Game"}{" "}
                      <span className={`ml-1 text-xs ${isDenied ? "text-red-400" : "text-muted-foreground"
                        }`}>
                        ({roleLabel})
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ID: <span className="font-mono">{game.short_code}</span>
                    </p>
                    {isDenied && (
                      <p className="text-red-400/80 text-xs mt-0.5">
                        You were removed — open the game to request to rejoin.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/game/${game.id}`}>Open</Link>
                    </Button>
                    {isHost && (
                      <form action={closeGame.bind(null, game.id)}>
                        <Button variant="destructive" size="sm" type="submit">
                          End Game
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Leaderboard />
    </div>
  )
}
