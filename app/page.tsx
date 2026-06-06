import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "ChipCount",
  description: "Track poker games, settle up, and climb the leaderboard"
}

export default function LandingPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[80vh] flex-col items-center justify-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">ChipCount</CardTitle>
          <CardDescription>
            Track poker games, calculate payouts, and see who&apos;s up over
            time. Start a quick game with no account, or log in for hosted
            tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/play">
            <Button className="w-full" size="lg">
              Quick game (no account)
            </Button>
          </Link>
          <Link href="/login">
            <Button className="w-full" size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
