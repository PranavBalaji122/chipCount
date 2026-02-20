"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { calcPayouts } from "@/lib/utils"
import type { GameSchema } from "@/lib/schemas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PayoutStatsView } from "./payout-stats-view"
import { Loader2, Check, X, Copy } from "lucide-react"
import { toast } from "sonner"

type Game = {
  id: string
  short_code: string
  host_id: string
  description: string | null
  status: string
}

type PlayerRow = {
  user_id: string
  status: "pending" | "approved" | "denied"
  cash_in: number
  cash_out: number
  requested_cash_in: number
  requested_cash_out: number
  display_name: string | null
  venmo_handle: string | null
}

export function GameSession({
  game,
  initialPlayers,
  currentUserId,
  isHost,
  baseUrl
}: {
  game: Game
  initialPlayers: PlayerRow[]
  currentUserId: string
  isHost: boolean
  baseUrl?: string
}) {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerRow[]>(initialPlayers)
  const [updating, setUpdating] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)

  const origin =
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "")
  const inviteUrl = `${origin}/invite/${game.short_code}`

  const approved = players.filter((p) => p.status === "approved")
  const pending = players.filter((p) => p.status === "pending")

  useEffect(() => {
    const supabase = createClient()

    async function syncPlayers() {
      const { data, error } = await supabase
        .from("game_players")
        .select(
          "user_id, status, cash_in, cash_out, requested_cash_in, requested_cash_out, profile:profiles(display_name, venmo_handle)"
        )
        .eq("game_id", game.id)

      if (error || !data) return

      setPlayers(
        data.map((p: any) => ({
          user_id: p.user_id,
          status: p.status,
          cash_in: Number(p.cash_in ?? 0),
          cash_out: Number(p.cash_out ?? 0),
          requested_cash_in: Number(p.requested_cash_in ?? p.cash_in ?? 0),
          requested_cash_out: Number(p.requested_cash_out ?? p.cash_out ?? 0),
          display_name: p.profile?.display_name ?? null,
          venmo_handle: p.profile?.venmo_handle ?? null
        }))
      )
    }

    const channel = supabase
      .channel(`game_players:${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${game.id}`
        },
        () => {
          syncPlayers()
        }
      )
      .subscribe()

    // Initial sync in case state is stale
    syncPlayers()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [game.id])

  const gameForPayout = useMemo((): GameSchema | null => {
    if (approved.length < 2) return null
    const names = new Set<string>()
    const makeName = (p: PlayerRow) => {
      const base = p.venmo_handle ? `@${p.venmo_handle}` : p.display_name || `Player_${p.user_id.slice(0, 8)}`
      let name = base
      let n = 0
      while (names.has(name)) {
        name = `${base}_${++n}`
      }
      names.add(name)
      return name
    }
    return {
      description: game.description || undefined,
      players: approved.map((p) => ({
        name: makeName(p),
        cashIn: p.cash_in,
        cashOut: p.cash_out
      }))
    }
  }, [approved, game.description])

  const payout = useMemo(() => (gameForPayout ? calcPayouts(gameForPayout) : null), [gameForPayout])

  async function updatePlayerFields(
    gameId: string,
    userId: string,
    patch: Partial<
      Pick<
        PlayerRow,
        "cash_in" | "cash_out" | "requested_cash_in" | "requested_cash_out" | "status"
      >
    >
  ) {
    setUpdating(userId)
    const supabase = createClient()
    await supabase
      .from("game_players")
      .update(patch)
      .eq("game_id", gameId)
      .eq("user_id", userId)
    setPlayers((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, ...patch } : p))
    )
    setUpdating(null)
  }

  async function updateCash(gameId: string, userId: string, cash_in: number, cash_out: number) {
    await updatePlayerFields(gameId, userId, {
      cash_in,
      cash_out,
      requested_cash_in: cash_in,
      requested_cash_out: cash_out
    })
  }

  async function updateRequestedCash(
    gameId: string,
    userId: string,
    requested_cash_in: number,
    requested_cash_out: number
  ) {
    await updatePlayerFields(gameId, userId, {
      requested_cash_in,
      requested_cash_out
    })
  }

  async function setStatus(gameId: string, userId: string, status: "approved" | "denied") {
    await updatePlayerFields(gameId, userId, { status })
  }

  async function handleEndGame() {
    if (!payout || !gameForPayout || approved.length < 2) return
    setEnding(true)
    const nameToUserId = new Map<string, string>()
    gameForPayout.players.forEach((gp, i) => {
      nameToUserId.set(gp.name, approved[i].user_id)
    })
    const profit_deltas = payout.players.map((pl) => ({
      user_id: nameToUserId.get(pl.name)!,
      profit_delta: pl.net
    }))
    const validDeltas = profit_deltas.filter((d) => d.user_id)
    if (validDeltas.length !== payout.players.length) {
      toast.error("Could not map players to users")
      setEnding(false)
      return
    }
    const supabase = createClient()
    const { error } = await supabase.rpc("end_game", {
      p_game_id: game.id,
      p_profit_deltas: validDeltas
    })
    if (error) {
      toast.error(error.message)
      setEnding(false)
      return
    }
    toast.success("Game ended. Profits updated.")
    router.push("/dashboard")
    router.refresh()
  }

  function copyGameLink() {
    navigator.clipboard.writeText(inviteUrl)
    toast.success("Link copied")
  }

  if (game.status === "ended") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">This game has ended.</p>
          <Button asChild className="mt-2">
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{game.description || "Game"}</CardTitle>
            <CardDescription>
              Game ID: <span className="font-mono">{game.short_code}</span> — share so others can join
              <br />
              Invite link:{" "}
              <span className="font-mono break-all">{inviteUrl}</span>
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyGameLink}>
            <Copy className="mr-1 h-4 w-4" />
            Copy link
          </Button>
        </CardHeader>
      </Card>

      {pending.length > 0 && isHost && (
        <Card>
          <CardHeader>
            <CardTitle>Pending approval</CardTitle>
            <CardDescription>Approve or deny players to join the game</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div className="flex flex-col gap-1">
                  <span>{p.display_name || p.user_id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">
                    Requested in: {p.requested_cash_in} / out: {p.requested_cash_out}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={updating === p.user_id}
                    onClick={() =>
                      updatePlayerFields(game.id, p.user_id, {
                        status: "approved",
                        cash_in: p.requested_cash_in,
                        requested_cash_in: p.requested_cash_in,
                        cash_out: p.requested_cash_out,
                        requested_cash_out: p.requested_cash_out
                      })
                    }
                  >
                    {updating === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={updating === p.user_id}
                    onClick={() => setStatus(game.id, p.user_id, "denied")}
                  >
                    <X className="h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Players & amounts</CardTitle>
          <CardDescription>Cash in / out per player (editable by host or self if approved)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {players.map((p) => (
              <div
                key={p.user_id}
                className="flex flex-wrap items-center gap-2 rounded border p-2"
              >
                <span className="min-w-[120px] font-medium">
                  {p.display_name || p.user_id.slice(0, 8)}
                  {p.status === "pending" && (
                    <span className="text-muted-foreground ml-1 text-sm">(pending)</span>
                  )}
                  {p.status === "denied" && (
                    <span className="text-muted-foreground ml-1 text-sm">(denied)</span>
                  )}
                </span>
                {p.status === "approved" && (
                  <>
                    {/* Host controls: edit official amounts and handle approval of requests */}
                    {isHost && (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="In"
                            value={p.cash_in ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, cash_in: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              updateCash(game.id, p.user_id, v, p.cash_out)
                            }}
                          />
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="Out"
                            value={p.cash_out ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, cash_out: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              updateCash(game.id, p.user_id, p.cash_in, v)
                            }}
                          />
                        </div>
                        {(p.requested_cash_in !== p.cash_in ||
                          p.requested_cash_out !== p.cash_out) && (
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {p.requested_cash_in !== p.cash_in && (
                              <div className="flex items-center gap-2">
                                <span>
                                  Requested in: {p.requested_cash_in} (current {p.cash_in})
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={updating === p.user_id}
                                    onClick={() =>
                                      updatePlayerFields(game.id, p.user_id, {
                                        cash_in: p.requested_cash_in,
                                        requested_cash_in: p.requested_cash_in
                                      })
                                    }
                                  >
                                    <Check className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    disabled={updating === p.user_id}
                                    onClick={() =>
                                      updatePlayerFields(game.id, p.user_id, {
                                        requested_cash_in: p.cash_in
                                      })
                                    }
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    Deny
                                  </Button>
                                </div>
                              </div>
                            )}
                            {p.requested_cash_out !== p.cash_out && (
                              <div className="flex items-center gap-2">
                                <span>
                                  Requested out: {p.requested_cash_out} (current {p.cash_out})
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={updating === p.user_id}
                                    onClick={() =>
                                      updatePlayerFields(game.id, p.user_id, {
                                        cash_out: p.requested_cash_out,
                                        requested_cash_out: p.requested_cash_out
                                      })
                                    }
                                  >
                                    <Check className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    disabled={updating === p.user_id}
                                    onClick={() =>
                                      updatePlayerFields(game.id, p.user_id, {
                                        requested_cash_out: p.cash_out
                                      })
                                    }
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    Deny
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Self (non-host) controls: request cash in/out values */}
                    {!isHost && p.user_id === currentUserId && (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="In"
                            value={p.requested_cash_in ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id
                                    ? { ...x, requested_cash_in: v }
                                    : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              updateRequestedCash(
                                game.id,
                                p.user_id,
                                v,
                                p.requested_cash_out
                              )
                            }}
                          />
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="Out"
                            value={p.requested_cash_out ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id
                                    ? { ...x, requested_cash_out: v }
                                    : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0
                              updateRequestedCash(
                                game.id,
                                p.user_id,
                                p.requested_cash_in,
                                v
                              )
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Current approved: In {p.cash_in} / Out {p.cash_out}
                          {(p.requested_cash_in !== p.cash_in ||
                            p.requested_cash_out !== p.cash_out) &&
                            " — awaiting host approval"}
                        </span>
                      </div>
                    )}

                    {/* Other players (view only) */}
                    {!isHost && p.user_id !== currentUserId && (
                      <span className="text-muted-foreground text-sm">
                        In: {p.cash_in} / Out: {p.cash_out}
                      </span>
                    )}
                  </>
                )}
                {p.status === "pending" && !isHost && p.user_id === currentUserId && (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        placeholder="Requested in"
                        value={p.requested_cash_in ?? ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          setPlayers((prev) =>
                            prev.map((x) =>
                              x.user_id === p.user_id
                                ? { ...x, requested_cash_in: v }
                                : x
                            )
                          )
                        }}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          updateRequestedCash(
                            game.id,
                            p.user_id,
                            v,
                            p.requested_cash_out
                          )
                        }}
                      />
                      <Input
                        type="number"
                        className="w-24"
                        placeholder="Requested out"
                        value={p.requested_cash_out ?? ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          setPlayers((prev) =>
                            prev.map((x) =>
                              x.user_id === p.user_id
                                ? { ...x, requested_cash_out: v }
                                : x
                            )
                          )
                        }}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          updateRequestedCash(
                            game.id,
                            p.user_id,
                            p.requested_cash_in,
                            v
                          )
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Waiting for host to approve your join request and amounts.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {payout && (
        <>
          <h2 className="text-lg font-semibold">Payout summary</h2>
          <PayoutStatsView payout={payout} />
        </>
      )}

      {isHost && approved.length >= 2 && (
        <div className="flex justify-end">
          <Button onClick={handleEndGame} disabled={ending}>
            {ending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            End game
          </Button>
        </div>
      )}
    </div>
  )
}
