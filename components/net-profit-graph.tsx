import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NetProfitChart } from "./net-profit-chart"

export async function NetProfitGraph({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("game_profit_history")
    .select("profit_delta, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })

  if (!rows?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net profit over time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No game history yet.</p>
        </CardContent>
      </Card>
    )
  }

  let running = 0
  const points = rows.map((r) => {
    running += Number(r.profit_delta)
    return {
      at: new Date(r.recorded_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      }),
      net: running
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Net profit over time</CardTitle>
      </CardHeader>
      <CardContent>
        <NetProfitChart points={points} />
      </CardContent>
    </Card>
  )
}
