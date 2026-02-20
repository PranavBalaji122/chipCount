"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { formatDollar } from "@/lib/utils"

type Point = { at: string; net: number }

export function NetProfitChart({ points }: { points: Point[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="at" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => formatDollar(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [formatDollar(value), "Net profit"]}
            labelFormatter={(label) => label}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
