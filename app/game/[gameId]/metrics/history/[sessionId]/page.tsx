import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PayoutStatsView } from "@/components/payout-stats-view"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Payout } from "@/lib/utils"

export default async function SessionReviewPage({
  params
}: {
  params: Promise<{ gameId: string, sessionId: string }>
}) {
  const { gameId, sessionId } = await params
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: payout, error: payoutError } = await supabase
    .from("session_payouts")
    .select("payout, session_number")
    .eq("id", sessionId)
    .single()

  if (payoutError || !payout) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session {payout.session_number}</h1>
        <Button asChild>
          <Link href={`/game/${gameId}/metrics/history`}>Go Back</Link>
        </Button>
      </div>
      <PayoutStatsView payout={payout.payout as unknown as Payout} />
    </div>
  )
}