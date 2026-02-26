"use client"

import { PayoutSchema } from "@/lib/schemas"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { Label, LabelList, Pie, PieChart } from "recharts"
import { useMemo } from "react"
import { formatDollar } from "@/lib/utils"
import chroma from "chroma-js"

export function DonutCharts({ payout }: { payout: PayoutSchema }) {
  const players = payout.players.toSorted((a, b) => b.net - a.net)
  const smallestNet = players[players.length - 1].net
  const largestNet = players[0].net

  const colors = useMemo(() => {
    const lowerBound = smallestNet
    const upperBound = largestNet
    let success: string
    let destructive: string
    let muted: string
    if (typeof window === "undefined") {
      // Server-side fallback colors
      success = "hsl(150 60% 50%)"
      destructive = "hsl(0 84% 60%)"
      muted = "hsl(215 16% 47%)"
    } else {
      const rootStyles = window.getComputedStyle(document.documentElement)
      // Get CSS custom property values and convert to hsl
      const successVar = rootStyles.getPropertyValue("--success").trim()
      const destructiveVar = rootStyles.getPropertyValue("--destructive").trim()
      const mutedVar = rootStyles.getPropertyValue("--muted-foreground").trim()
      
      success = successVar ? `hsl(${successVar})` : "hsl(150 60% 50%)"
      destructive = destructiveVar ? `hsl(${destructiveVar})` : "hsl(0 84% 60%)"
      muted = mutedVar ? `hsl(${mutedVar})` : "hsl(215 16% 47%)"
    }
    return chroma
      .scale([success, muted, destructive])
      .mode("lrgb")
      .domain([lowerBound, 0, upperBound])
      .colors(upperBound + Math.abs(lowerBound) + 1)
      .toReversed()
  }, [smallestNet, largestNet])

  const playersData = players.map((player) => ({
    name: player.displayName,
    cashIn: player.cashIn,
    cashOut: player.cashOut,
    fill: colors[Math.floor(player.net + Math.abs(smallestNet))]
  }))

  const chartConfig = Object.fromEntries(
    playersData.map((player) => [player.name, { label: player.name }])
  ) satisfies ChartConfig

  const totalPot = useMemo(() => {
    return playersData.reduce((acc, curr) => acc + curr.cashOut, 0)
  }, [playersData])

  return (
    <ChartContainer
      config={chartConfig}
      className="m-auto mx-auto aspect-6/5 h-[250px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                switch (payload[0].dataKey) {
                  case "cashOut":
                    return "Cash Out"
                  case "cashIn":
                    return "Cash In"
                  default:
                    return "Cash In/Out"
                }
              }}
            />
          }
        />
        <Pie
          data={playersData.filter((player) => player.cashOut !== 0)}
          dataKey="cashOut"
          nameKey="name"
          outerRadius={100}
          innerRadius={90}
          strokeWidth={2}
          stroke="hsl(var(--background))"
          paddingAngle={5}
        >
          <LabelList
            dataKey="name"
            position="outside"
            offset={8}
            className="fill-foreground"
            stroke="none"
          />
        </Pie>

        <Pie
          data={playersData.filter((player) => player.cashIn !== 0)}
          dataKey="cashIn"
          nameKey="name"
          outerRadius={80}
          innerRadius={totalPot < 100 ? 50 : totalPot < 1000 ? 60 : 63.5}
          strokeWidth={2}
          stroke="hsl(var(--background))"
          paddingAngle={5}
        >
          {Math.abs(payout.slippage) < 1e-9 && (
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {formatDollar(Math.floor(totalPot))}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        Total Pot
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          )}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
