import type { Profile } from "@/lib/db-types"
import { formatDollar } from "@/lib/utils"
import { NetProfitGraph } from "./net-profit-graph"

export function NetProfitBlock({ profile }: { profile: Profile }) {
  const net = Number(profile.net_profit)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-muted-foreground text-sm">Net profit (all time)</p>
        <p className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatDollar(net)}
        </p>
      </div>
      <NetProfitGraph userId={profile.id} />
    </div>
  )
}
