import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SessionHistoryPage({
  params
}: {
  params: { gameId: string }
}) {
  const { gameId } = params
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, description")
    .eq("id", gameId)
    .single()

  if (gameError || !game) {
    notFound()
  }

  const { data: payouts, error: payoutError } = await supabase
    .from("session_payouts")
    .select("id, session_number")
    .eq("game_id", gameId)
    .order("session_number", { ascending: false })

  if (payoutError) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session History for {game.description}</h1>
        <Button asChild>
          <Link href={`/game/${gameId}`}>Go Back</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Previous Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts && payouts.length > 0 ? (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <Link
                  key={payout.id}
                  href={`/game/${gameId}/metrics/history/${payout.id}`}
                  className="block rounded border p-4 hover:bg-muted"
                >
                  Session {payout.session_number}
                </Link>
              ))}
            </div>
          ) : (
            <p>No previous sessions found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}