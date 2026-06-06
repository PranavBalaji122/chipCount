"use client"

import { calcPayouts, parseZipson } from "@/lib/utils"
import { useQueryState } from "nuqs"
import { gameSchema } from "@/lib/schemas"
import { PlayerSummary } from "./player-summary"
import { SlippageInfo } from "./slippage-info"
import { useMemo } from "react"
import { DonutCharts } from "./donut-chart"
import { NegativeChart } from "./negative-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"
import { BarChart3 } from "lucide-react"

export function PayoutStats() {
  const [game] = useQueryState("game", parseZipson)

  const payout = useMemo(() => {
    const parseResult = gameSchema.safeParse(game)
    if (!parseResult.success) return

    const payout = calcPayouts(parseResult.data)
    payout.players.sort((a, b) => a.name.localeCompare(b.name))

    return payout
  }, [game])

  if (!payout) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Settlements
          </CardTitle>
          <CardDescription>
            Payouts appear here once you add at least two players with names
            and cash amounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-6">
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16 text-center">
            <BarChart3 className="text-muted-foreground/50 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm font-medium">
              Waiting for player data
            </p>
            <p className="text-muted-foreground/70 mt-1 max-w-xs text-xs">
              Fill in names, buy-ins, and cash-outs on the left to see who owes
              whom.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle>Settlements</CardTitle>
        <CardDescription>
          Who pays whom based on current numbers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {Math.abs(payout.slippage) > 1e-9 && <SlippageInfo payout={payout} />}

        <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
          <div className="flex w-full flex-col justify-around gap-5 lg:flex-row">
            <DonutCharts payout={payout} />
            <NegativeChart players={payout.players} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {payout.players.map((player) => (
            <PlayerSummary
              key={player.name}
              player={player}
              slippage={payout.slippage / payout.players.length}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
