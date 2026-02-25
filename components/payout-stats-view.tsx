"use client"

import { PlayerSummary } from "./player-summary"
import { SlippageInfo } from "./slippage-info"
import { DonutCharts } from "./donut-chart"
import { NegativeChart } from "./negative-chart"
import { Card, CardContent } from "./ui/card"
import { Payout } from "@/lib/utils"

export function PayoutStatsView({ payout }: { payout: Payout }) {

  return (
    <div className="space-y-5">
      {Math.abs(payout.slippage) > 1e-9 && <SlippageInfo payout={payout} />}

      <Card className="bg-secondary">
        <CardContent className="flex w-full flex-col justify-around gap-5 md:flex-row">
          <DonutCharts payout={payout} />
          <NegativeChart players={payout.players} />
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        {payout.players.map((player) => (
          <PlayerSummary
            key={player.name}
            player={player}
            slippage={payout.slippage / payout.players.length}
          />
        ))}
      </div>
    </div>
  )
}
