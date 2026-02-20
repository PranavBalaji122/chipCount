"use client"

import type { PayoutSchema } from "@/lib/schemas"
import { PlayerSummary } from "./player-summary"
import { SlippageInfo } from "./slippage-info"
import { DonutCharts } from "./donut-chart"
import { NegativeChart } from "./negative-chart"
import { Card, CardContent } from "./ui/card"

export function PayoutStatsView({ payout }: { payout: PayoutSchema }) {
  const sorted = { ...payout, players: [...payout.players].sort((a, b) => a.name.localeCompare(b.name)) }

  return (
    <div className="space-y-5">
      {Math.abs(sorted.slippage) > 1e-9 && <SlippageInfo payout={sorted} />}

      <Card className="bg-secondary">
        <CardContent className="flex w-full flex-col justify-around gap-5 md:flex-row">
          <DonutCharts payout={sorted} />
          <NegativeChart players={sorted.players} />
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        {sorted.players.map((player) => (
          <PlayerSummary
            key={player.name}
            player={player}
            slippage={sorted.slippage / sorted.players.length}
          />
        ))}
      </div>
    </div>
  )
}
