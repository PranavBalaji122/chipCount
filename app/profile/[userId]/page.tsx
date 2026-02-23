import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDollar } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NetProfitGraph } from "@/components/net-profit-graph"
import { IoLogoVenmo } from "react-icons/io5"

export default async function PublicProfilePage({
  params
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, phone, email, venmo_handle, net_profit, profile_public")
    .eq("id", userId)
    .single()

  if (!profile || !profile.profile_public) notFound()

  const net = Number(profile.net_profit)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">Back to dashboard</Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{profile.display_name || "Anonymous"}</CardTitle>
          <CardDescription>Public profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-sm">Net profit</p>
            <p className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatDollar(net)}
            </p>
          </div>
          {profile.venmo_handle && (
            <a
              href={`https://venmo.com/u/${profile.venmo_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link inline-flex items-center gap-1"
            >
              <IoLogoVenmo className="h-5 w-5" />
              @{profile.venmo_handle}
            </a>
          )}
          <NetProfitGraph userId={profile.id} />
        </CardContent>
      </Card>
    </div>
  )
}
