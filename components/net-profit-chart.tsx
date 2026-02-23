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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="at"
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatDollar(v)}
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatDollar(value), "Net profit"]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#f4f4f5",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#a1a1aa", marginBottom: "2px" }}
            itemStyle={{ color: "#4ade80" }}
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#4ade80"
            strokeWidth={2}
            dot={{ r: 3, fill: "#4ade80", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#4ade80", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
