import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "ChipCount",
  description: "Track poker games, settle up, and climb the leaderboard"
}

export default function LandingPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">ChipCount</CardTitle>
          <CardDescription>
            Track poker games, calculate payouts, and see who&apos;s up over time.
            Log in to start or join a game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full" size="lg">
              Log in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
