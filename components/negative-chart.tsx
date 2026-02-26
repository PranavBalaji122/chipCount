import { PlayerSchema } from "@/lib/schemas"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, LabelList } from "recharts"
import { formatDollar } from "@/lib/utils"

export function NegativeChart({ players }: { players: PlayerSchema[] }) {
  const chartConfig = {
    net: {
      label: "Net"
    }
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full max-h-[500px] min-h-[10px] w-full"
    >
      <BarChart
        accessibilityLayer
        data={players.map((player) => ({
          ...player,
          fill:
            player.net > 1e-9
              ? "var(--success)"
              : player.net < -1e-9
                ? "var(--destructive)"
                : "var(--muted-foreground)"
        }))}
      >
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => payload[0].payload.displayName}
            />
          }
        />
        <Bar dataKey="net">
          <LabelList 
            position="bottom" 
            dataKey="displayName" 
            fillOpacity={1} 
            fill="hsl(var(--foreground))"
            fontSize={12}
          />
          <LabelList
            position="top"
            dataKey="net"
            fillOpacity={1}
            fill="hsl(var(--foreground))"
            fontSize={12}
            formatter={(val: number) => formatDollar(val)}
          />
          {players.map((item) => (
            <Cell key={item.name} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
