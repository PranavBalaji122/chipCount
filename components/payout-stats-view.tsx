"use client"

import type { PayoutSchema } from "@/lib/schemas"
import { PlayerSummary } from "./player-summary"
import { SlippageInfo } from "./slippage-info"
import { DonutCharts } from "./donut-chart"
import { NegativeChart } from "./negative-chart"
import { Card, CardContent } from "./ui/card"
import { formatDollar } from "@/lib/utils"

export function PayoutStatsView({ payout }: { payout: PayoutSchema }) {
  const sorted = {
    ...payout,
    players: [...payout.players].sort((a, b) => a.name.localeCompare(b.name))
  }

  return (
    <div className="space-y-6">
      <div className="sr-only">
        <h3>Payout summary by player</h3>
        <ul>
          {sorted.players.map((player) => (
            <li key={player.name}>
              {player.displayName}: cash in {formatDollar(player.cashIn)}, cash
              out {formatDollar(player.cashOut)}, net {formatDollar(player.net)}
            </li>
          ))}
        </ul>
      </div>
      {Math.abs(sorted.slippage) > 1e-9 && <SlippageInfo payout={sorted} />}

      <Card className="bg-card border-border">
        <CardContent className="flex w-full flex-col justify-around gap-5 md:flex-row p-6">
          <DonutCharts payout={sorted} />
          <NegativeChart players={sorted.players} />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
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
