"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDollar } from "@/lib/utils";

type Point = { at: string; net: number };

export function NetProfitChart({ points }: { points: Point[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="at"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatDollar(v)}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatDollar(value), "Net profit"]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0px",
              color: "var(--popover-foreground)",
              fontSize: "13px",
            }}
            labelStyle={{
              color: "var(--muted-foreground)",
              marginBottom: "2px",
            }}
            itemStyle={{ color: "var(--foreground)" }}
            cursor={{ stroke: "var(--border)" }}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--foreground)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--foreground)", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
