"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { calcPayouts, formatDollar } from "@/lib/utils"
import type { GameSchema } from "@/lib/schemas"
import { PayoutStatsView } from "./payout-stats-view"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./ui/dialog"
import { Copy, Eye, Lock } from "lucide-react"
import { toast } from "sonner"

export type SpectatorGameData = {
  game: {
    id: string
    short_code: string
    description: string | null
    status: "active" | "closed"
  }
  players: {
    display_name: string | null
    status: "pending" | "approved" | "denied"
    cash_in: number
    cash_out: number
    venmo_handle: string | null
  }[]
  guests: {
    name: string
    cash_in: number
    cash_out: number
  }[]
}

const DISMISS_KEY_PREFIX = "chipcount-spectator-signin-dismissed-"

function playerName(p: SpectatorGameData["players"][number]) {
  return (
    p.display_name ||
    (p.venmo_handle ? `@${p.venmo_handle}` : null) ||
    "Player"
  )
}

export function SpectatorGameView({
  shortCode,
  initialData
}: {
  shortCode: string
  initialData: SpectatorGameData
}) {
  const [data, setData] = useState(initialData)
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState("")

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${shortCode}`
      : `/invite/${shortCode}`

  const loginUrl = `/login?next=${encodeURIComponent(`/invite/${shortCode}`)}`

  const fetchGame = useCallback(async () => {
    const supabase = createClient()
    const { data: result, error } = await supabase.rpc("get_spectator_game", {
      p_short_code: shortCode
    })
    if (!error && result) {
      setData(result as SpectatorGameData)
    }
  }, [shortCode])

  useEffect(() => {
    const dismissed =
      localStorage.getItem(`${DISMISS_KEY_PREFIX}${shortCode}`) === "1"
    if (!dismissed) {
      setShowSignInDialog(true)
    }
  }, [shortCode])

  useEffect(() => {
    const interval = setInterval(fetchGame, 5000)
    return () => clearInterval(interval)
  }, [fetchGame])

  const approved = data.players.filter((p) => p.status === "approved")
  const isClosed = data.game.status === "closed"

  const gameForPayout = useMemo((): GameSchema | null => {
    const guestsWithAmounts = data.guests.filter(
      (g) => g.cash_in !== 0 || g.cash_out !== 0
    )
    if (approved.length + guestsWithAmounts.length < 2) return null

    const names = new Set<string>()
    const makeName = (
      base: string,
      fallbackIndex?: number
    ) => {
      let name = base
      let n = fallbackIndex ?? 0
      while (names.has(name)) {
        name = `${base}_${++n}`
      }
      names.add(name)
      return name
    }

    const players = [
      ...approved.map((p, i) => ({
        name: makeName(
          p.venmo_handle
            ? `@${p.venmo_handle}`
            : p.display_name || `Player_${i}`,
          i
        ),
        cashIn: p.cash_in,
        cashOut: p.cash_out
      })),
      ...guestsWithAmounts.map((g) => ({
        name: makeName(`${g.name} (guest)`),
        cashIn: g.cash_in,
        cashOut: g.cash_out
      }))
    ]

    return {
      description: data.game.description || undefined,
      players
    }
  }, [approved, data.game.description, data.guests])

  const payout = useMemo(
    () => (gameForPayout ? calcPayouts(gameForPayout) : null),
    [gameForPayout]
  )

  function dismissSignInDialog() {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${shortCode}`, "1")
    setShowSignInDialog(false)
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopyFeedback("Invite link copied")
    window.setTimeout(() => setCopyFeedback(""), 2000)
    toast.success("Link copied")
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div
        className="bg-primary text-primary-foreground sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2 text-sm shadow-sm"
        role="banner"
      >
        <span>Sign in to join this table</span>
        <Button asChild size="sm" variant="secondary">
          <Link href={loginUrl}>Sign in</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-sm">
              <Eye className="h-4 w-4" />
              Spectator view
            </div>
            <CardTitle>{data.game.description || "Game"}</CardTitle>
            <CardDescription>
              Game ID:{" "}
              <span className="font-mono">{data.game.short_code}</span>
              {isClosed && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Session closed
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyInviteLink}>
            <Copy className="mr-1 h-4 w-4" />
            Copy link
          </Button>
        </CardHeader>
        <div className="sr-only" aria-live="polite">
          {copyFeedback}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Players & amounts</CardTitle>
          <CardDescription>Live read-only view of the table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.players.map((p, i) => (
              <div
                key={`${playerName(p)}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded border p-2"
              >
                <span className="font-medium">
                  {playerName(p)}
                  {p.status === "pending" && (
                    <span className="text-muted-foreground ml-1 text-sm">
                      (pending)
                    </span>
                  )}
                  {p.status === "denied" && (
                    <span className="text-muted-foreground ml-1 text-sm">
                      (denied)
                    </span>
                  )}
                </span>
                {p.status === "approved" && (
                  <span className="text-muted-foreground text-sm">
                    In: {formatDollar(p.cash_in)} / Out:{" "}
                    {formatDollar(p.cash_out)}
                  </span>
                )}
              </div>
            ))}
            {data.guests.map((g) => (
              <div
                key={g.name}
                className="flex flex-wrap items-center gap-2 rounded border p-2"
              >
                <span className="font-medium">
                  {g.name}
                  <span className="text-muted-foreground ml-1 text-sm">
                    (guest)
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">
                  In: {formatDollar(g.cash_in)} / Out:{" "}
                  {formatDollar(g.cash_out)}
                </span>
              </div>
            ))}
            {data.players.length === 0 && data.guests.length === 0 && (
              <p className="text-muted-foreground text-sm">No players yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {payout && <PayoutStatsView payout={payout} />}

      <Dialog
        open={showSignInDialog}
        onOpenChange={(open) => {
          if (!open) dismissSignInDialog()
          else setShowSignInDialog(true)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Viewing as spectator</DialogTitle>
            <DialogDescription>
              You can watch this table live. Sign in to request joining as a
              player.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissSignInDialog}>
              Continue watching
            </Button>
            <Button asChild>
              <Link href={loginUrl}>Sign in to join</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
