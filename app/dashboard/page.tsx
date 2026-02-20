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

  const { data: memberships } = await supabase
    .from("game_players")
    .select("status, game:games(id, short_code, description, status, host_id)")
    .eq("user_id", user.id)
    .neq("status", "denied")
    .eq("game.status", "active")

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Start a new game, join one with a game ID, or check the leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardActions />
        </CardContent>
      </Card>

      {memberships && memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your active games</CardTitle>
            <CardDescription>
              Quickly jump back into games you&apos;re hosting or playing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberships.map((m: any) => {
              const game = m.game
              if (!game) return null
              const isHost = game.host_id === user.id
              const roleLabel = isHost ? "Host" : m.status === "approved" ? "Player" : "Pending"

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {game.description || "Game"}{" "}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({roleLabel})
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ID: <span className="font-mono">{game.short_code}</span>
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/game/${game.id}`}>Open</Link>
                  </Button>
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
