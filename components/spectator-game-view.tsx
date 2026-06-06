"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { calcPayouts, formatDollar } from "@/lib/utils"
import type { GameSchema } from "@/lib/schemas"
import { PlayerSummary } from "./player-summary"
import { SlippageInfo } from "./slippage-info"
import { DonutCharts } from "./donut-chart"
import { NegativeChart } from "./negative-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "./ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./ui/dialog"
import { ArrowLeft, Eye, Link as LinkIcon, Lock } from "lucide-react"
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

function statusBadge(status: "pending" | "approved" | "denied") {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>
    case "denied":
      return <Badge variant="destructive">Denied</Badge>
    default:
      return null
  }
}

export function SpectatorGameView({
  shortCode,
  initialData,
  isAuthenticated = false
}: {
  shortCode: string
  initialData: SpectatorGameData
  isAuthenticated?: boolean
}) {
  const [data, setData] = useState(initialData)
  const [showSignInDialog, setShowSignInDialog] = useState(false)

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${shortCode}`
      : `/invite/${shortCode}`

  const loginUrl = `/login?next=${encodeURIComponent(`/invite/${shortCode}`)}`
  const joinUrl = `/invite/${shortCode}/join`

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
    if (isAuthenticated) return

    const dismissed =
      localStorage.getItem(`${DISMISS_KEY_PREFIX}${shortCode}`) === "1"
    if (!dismissed) {
      setShowSignInDialog(true)
    }
  }, [shortCode, isAuthenticated])

  useEffect(() => {
    const interval = setInterval(fetchGame, 5000)
    return () => clearInterval(interval)
  }, [fetchGame])

  const approved = data.players.filter((p) => p.status === "approved")
  const isClosed = data.game.status === "closed"
  const gameLabel = data.game.description || "Game"

  const gameForPayout = useMemo((): GameSchema | null => {
    const guestsWithAmounts = data.guests.filter(
      (g) => g.cash_in !== 0 || g.cash_out !== 0
    )
    if (approved.length + guestsWithAmounts.length < 2) return null

    const names = new Set<string>()
    const makeName = (base: string, fallbackIndex?: number) => {
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
      ...guestsWithAmounts.map((g, i) => ({
        name: makeName(g.name, i),
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
    toast.success("Link copied")
  }

  const hasPlayers = data.players.length > 0 || data.guests.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="sm" className="shrink-0">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="min-w-0 hidden sm:block">
              <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {gameLabel}
              </p>
              <p className="text-muted-foreground text-xs truncate">
                Spectator view · {data.game.short_code}
                {isClosed && " · Closed"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={copyInviteLink} variant="outline" size="sm">
              <LinkIcon className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Copy link</span>
              <span className="sm:hidden">Copy</span>
            </Button>
            <Button asChild size="sm">
              {isAuthenticated ? (
                <Link href={joinUrl}>Join table</Link>
              ) : (
                <Link href={loginUrl}>Sign in</Link>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {gameLabel}
            </h1>
            {isClosed && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Session closed
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            {isAuthenticated
              ? "You're watching this table live. Join to participate, or keep viewing read-only."
              : "Live read-only view. Sign in to request joining as a player."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
          <Card className="h-full">
            <CardHeader className="border-b">
              <CardTitle>Players &amp; amounts</CardTitle>
              <CardDescription>
                Updates every few seconds
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!hasPlayers ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No players yet.
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="text-muted-foreground hidden sm:grid sm:grid-cols-[1fr_5rem_5rem_auto] sm:gap-3 sm:px-2 sm:pb-2 text-xs font-medium">
                    <span>Name</span>
                    <span className="text-right">In</span>
                    <span className="text-right">Out</span>
                    <span className="sr-only">Status</span>
                  </div>
                  <div className="divide-y rounded-lg border">
                    {data.players.map((p, i) => (
                      <div
                        key={`${playerName(p)}-${i}`}
                        className="flex flex-col gap-1 px-3 py-3 sm:grid sm:grid-cols-[1fr_5rem_5rem_auto] sm:items-center sm:gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">
                            {playerName(p)}
                          </span>
                          {statusBadge(p.status)}
                        </div>
                        {p.status === "approved" ? (
                          <>
                            <span className="text-muted-foreground sm:text-right tabular-nums text-sm">
                              <span className="sm:hidden text-xs">In: </span>
                              {formatDollar(p.cash_in)}
                            </span>
                            <span className="text-muted-foreground sm:text-right tabular-nums text-sm">
                              <span className="sm:hidden text-xs">Out: </span>
                              {formatDollar(p.cash_out)}
                            </span>
                            <span className="hidden sm:block" />
                          </>
                        ) : (
                          <span className="text-muted-foreground col-span-2 text-sm sm:col-span-3">
                            Awaiting host approval
                          </span>
                        )}
                      </div>
                    ))}
                    {data.guests.map((g) => (
                      <div
                        key={g.name}
                        className="flex flex-col gap-1 px-3 py-3 sm:grid sm:grid-cols-[1fr_5rem_5rem_auto] sm:items-center sm:gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{g.name}</span>
                          <Badge variant="outline">Guest</Badge>
                        </div>
                        <span className="text-muted-foreground sm:text-right tabular-nums text-sm">
                          <span className="sm:hidden text-xs">In: </span>
                          {formatDollar(g.cash_in)}
                        </span>
                        <span className="text-muted-foreground sm:text-right tabular-nums text-sm">
                          <span className="sm:hidden text-xs">Out: </span>
                          {formatDollar(g.cash_out)}
                        </span>
                        <span className="hidden sm:block" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="border-b">
              <CardTitle>Settlements</CardTitle>
              <CardDescription>
                Who pays whom based on current numbers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {!payout ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16 text-center">
                  <p className="text-muted-foreground text-sm font-medium">
                    Not enough data yet
                  </p>
                  <p className="text-muted-foreground/70 mt-1 max-w-xs text-xs">
                    Settlements appear once at least two players have cash
                    amounts.
                  </p>
                </div>
              ) : (
                <>
                  {Math.abs(payout.slippage) > 1e-9 && (
                    <SlippageInfo payout={payout} />
                  )}

                  <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                    <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
                      <DonutCharts payout={payout} />
                      <div className="min-h-[220px] w-full">
                        <NegativeChart players={payout.players} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[...payout.players]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((player) => (
                        <PlayerSummary
                          key={player.name}
                          player={player}
                          slippage={payout.slippage / payout.players.length}
                        />
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!isAuthenticated && (
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
      )}
    </div>
  )
}
