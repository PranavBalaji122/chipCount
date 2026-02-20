import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDollar } from "@/lib/utils"

export async function Leaderboard() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, net_profit")
    .eq("profile_public", true)
    .order("net_profit", { ascending: false })
    .limit(10)

  return (
    <Card id="leaderboard">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Top 10 by net profit (public profiles only)</CardDescription>
      </CardHeader>
      <CardContent>
        {!profiles?.length ? (
          <p className="text-muted-foreground text-sm">No public profiles yet.</p>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between rounded border px-3 py-2">
                <span className="font-medium">
                  #{i + 1}{" "}
                  <Link href={`/profile/${p.id}`} className="text-link hover:underline">
                    {p.display_name || "Anonymous"}
                  </Link>
                </span>
                <span className={p.net_profit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatDollar(Number(p.net_profit))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
