"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { setGameStatus, kickPlayer, requestRejoin, transferHost, updateRequestedAmounts } from "@/lib/actions"
import { calcPayouts } from "@/lib/utils"
import type { GameSchema } from "@/lib/schemas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PayoutStatsView } from "./payout-stats-view"
import { Loader2, Check, X, Copy, Lock, LockOpen, Crown, ArrowRightLeft } from "lucide-react"
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
  cash_in: number | null
  cash_out: number | null
  requested_cash_in: number | null
  requested_cash_out: number | null
  display_name: string | null
  venmo_handle: string | null
}

type GuestPlayer = {
  id: string
  name: string
  cash_in: number | null
  cash_out: number | null
}

// Helper function to parse cash input values, handling "zero" conversion
function parseCashInput(value: string): number | null {
  if (value === "") return null
  if (value.toLowerCase() === "zero") return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

export function GameSession({
  game,
  initialPlayers,
  currentUserId,
  isHost: _initialIsHost,
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
  const [togglingClose, setTogglingClose] = useState(false)
  const [kicking, setKicking] = useState<string | null>(null)
  const [gameStatus, setGameStatus_] = useState(game.status)
  const [hostId, setHostId] = useState(game.host_id)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [transferConfirm, setTransferConfirm] = useState(false)
  
  // Guest functionality — persisted to game_guests table
  const [guests, setGuests] = useState<GuestPlayer[]>([])
  const [guestForm, setGuestForm] = useState({ name: "", cash_in: "", cash_out: "" })
  const [lastGameStatus, setLastGameStatus] = useState(game.status)

  // Derive isHost reactively from hostId state so host transfers update the UI instantly
  const isHost = hostId === currentUserId

  // Auto-delete guests when session is reopened (closed -> active)
  useEffect(() => {
    if (lastGameStatus === "closed" && gameStatus === "active" && isHost && guests.length > 0) {
      // Delete all guests from database
      const deleteGuests = async () => {
        const supabase = createClient()
        const { error } = await supabase
          .from("game_guests")
          .delete()
          .eq("game_id", game.id)
        if (error) {
          console.error("Failed to delete guests:", error)
          toast.error("Failed to remove guests")
        } else {
          setGuests([])
          toast.success("Guests have been removed as the session was reopened")
        }
      }
      deleteGuests()
    }
    setLastGameStatus(gameStatus)
  }, [gameStatus, lastGameStatus, isHost, guests.length, game.id])

  const origin =
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "")
  const inviteUrl = `${origin}/invite/${game.short_code}`

  const isClosed = gameStatus === "closed"
  const approved = players.filter((p) => p.status === "approved")
  const pending = players.filter((p) => p.status === "pending")
  
  // Guest management — persisted to Supabase
  async function addGuest(name: string) {
    if (!name.trim()) return
    const supabase = createClient()
    const cashIn = parseCashInput(guestForm.cash_in)
    const cashOut = parseCashInput(guestForm.cash_out)
    const { data, error } = await supabase
      .from("game_guests")
      .insert({
        game_id: game.id,
        name: name.trim(),
        cash_in: cashIn ?? 0,
        cash_out: cashOut ?? 0,
      })
      .select("id, name, cash_in, cash_out")
      .single()
    if (error) {
      toast.error("Failed to add guest")
      return
    }
    setGuests((prev) => [...prev, { id: data.id, name: data.name, cash_in: data.cash_in, cash_out: data.cash_out }])
    setGuestForm({ name: "", cash_in: "", cash_out: "" })
    toast.success(`Guest "${data.name}" added`)
  }

  function handleGuestNameChange(name: string) {
    setGuestForm((prev) => ({ ...prev, name }))
  }

  function handleGuestNameBlur() {
    const name = guestForm.name.trim()
    if (!name) return
    const existsAlready = guests.some((g) => g.name.toLowerCase() === name.toLowerCase())
    if (!existsAlready) {
      addGuest(name)
    }
  }

  async function updateGuestDb(guestId: string, updates: Partial<Pick<GuestPlayer, "cash_in" | "cash_out">>) {
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, ...updates } : g)))
    const supabase = createClient()
    const patch: Record<string, number> = {}
    if (updates.cash_in !== undefined) patch.cash_in = updates.cash_in ?? 0
    if (updates.cash_out !== undefined) patch.cash_out = updates.cash_out ?? 0
    await supabase.from("game_guests").update(patch).eq("id", guestId)
  }

  async function removeGuest(guestId: string) {
    setGuests((prev) => prev.filter((g) => g.id !== guestId))
    const supabase = createClient()
    await supabase.from("game_guests").delete().eq("id", guestId)
  }

  async function handleKick(userId: string) {
    setKicking(userId)
    // Optimistic: remove from local list immediately
    setPlayers((prev) => prev.filter((p) => p.user_id !== userId))
    try {
      await kickPlayer(game.id, userId)
      toast.success("Player removed")
    } catch (err) {
      toast.error("Failed to remove player")
      // Revert by refetching
      fetchAll()
    } finally {
      setKicking(null)
    }
  }

  async function handleTransferHost(targetUserId: string) {
    setTransferring(true)
    try {
      await transferHost(game.id, targetUserId)
      toast.success("Host transferred successfully")
      // Update local state immediately so the UI flips without waiting for a poll/refresh
      setHostId(targetUserId)
      setSelectedPlayer(null)
      setTransferConfirm(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer host")
    } finally {
      setTransferring(false)
    }
  }

  // Fetch fresh player + guest data directly from Supabase on the client
  async function fetchAll() {
    const supabase = createClient()

    const { data: gameData } = await supabase
      .from("games")
      .select("status, host_id")
      .eq("id", game.id)
      .single()
    if (gameData) {
      setGameStatus_(gameData.status as "active" | "closed" | "ended")
      setHostId(gameData.host_id)
    }

    const { data } = await supabase
      .from("game_players")
      .select("user_id, status, cash_in, cash_out, requested_cash_in, requested_cash_out, profile:profiles(display_name, venmo_handle)")
      .eq("game_id", game.id)
    if (data) {
      setPlayers(
        data.map((p: {
          user_id: string
          status: string
          cash_in: number | null
          cash_out: number | null
          requested_cash_in: number | null
          requested_cash_out: number | null
          profile: { display_name: string | null; venmo_handle: string | null } | { display_name: string | null; venmo_handle: string | null }[] | null
        }) => {
          const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
          return {
            user_id: p.user_id,
            status: p.status as "pending" | "approved" | "denied",
            cash_in: p.cash_in === null ? null : Number(p.cash_in),
            cash_out: p.cash_out === null ? null : Number(p.cash_out),
            requested_cash_in: p.requested_cash_in === null ? (p.cash_in === null ? null : Number(p.cash_in)) : Number(p.requested_cash_in),
            requested_cash_out: p.requested_cash_out === null ? (p.cash_out === null ? null : Number(p.cash_out)) : Number(p.requested_cash_out),
            display_name: prof?.display_name ?? null,
            venmo_handle: prof?.venmo_handle ?? null,
          }
        })
      )
    }

    // Fetch persisted guests
    const { data: guestData } = await supabase
      .from("game_guests")
      .select("id, name, cash_in, cash_out")
      .eq("game_id", game.id)
    if (guestData) {
      setGuests(
        guestData.map((g: { id: string; name: string; cash_in: number; cash_out: number }) => ({
          id: g.id,
          name: g.name,
          cash_in: g.cash_in,
          cash_out: g.cash_out,
        }))
      )
    }
  }

  // Keep fetchPlayers as alias for backwards compat with realtime callbacks
  const fetchPlayers = fetchAll

  useEffect(() => {
    const supabase = createClient()

    // Watch player changes — realtime fast path (fires instantly when RLS allows)
    const playersChannel = supabase
      .channel(`game_players:${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${game.id}`
        },
        () => fetchAll()
      )
      .subscribe()

    // Watch game status changes — realtime fast path
    const gameChannel = supabase
      .channel(`games:${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`
        },
        () => fetchAll()
      )
      .subscribe()

    // Polling fallback — guarantees updates every 4s even if realtime/RLS blocks events
    const pollInterval = setInterval(() => fetchAll(), 4000)

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(gameChannel)
      clearInterval(pollInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id])

  const gameForPayout = useMemo((): GameSchema | null => {
    const allGamePlayers = [...approved, ...guests.filter(g => g.cash_in !== null || g.cash_out !== null)]
    if (allGamePlayers.length < 2) return null
    
    const names = new Set<string>()
    const makeName = (p: PlayerRow | GuestPlayer) => {
      let base: string
      if ('venmo_handle' in p) {
        // Regular player
        base = p.venmo_handle ? `@${p.venmo_handle}` : p.display_name || `Player_${p.user_id.slice(0, 8)}`
      } else {
        // Guest player
        base = `${p.name} (guest)`
      }
      
      let name = base
      let n = 0
      while (names.has(name)) {
        name = `${base}_${++n}`
      }
      names.add(name)
      return name
    }
    
    const players = [
      ...approved.map((p) => ({
        name: makeName(p),
        cashIn: p.cash_in ?? 0,
        cashOut: p.cash_out ?? 0
      })),
      ...guests
        .filter(g => g.cash_in !== null || g.cash_out !== null)
        .map((g) => ({
          name: makeName(g),
          cashIn: g.cash_in ?? 0,
          cashOut: g.cash_out ?? 0
        }))
    ]
    
    return {
      description: game.description || undefined,
      players
    }
  }, [approved, guests, game.description])

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

  async function updateCash(gameId: string, userId: string, cash_in: number | null, cash_out: number | null) {
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
    requested_cash_in: number | null,
    requested_cash_out: number | null
  ) {
    await updatePlayerFields(gameId, userId, {
      requested_cash_in,
      requested_cash_out
    })
  }

  async function setStatus(gameId: string, userId: string, status: "approved" | "denied") {
    await updatePlayerFields(gameId, userId, { status })
  }

  async function handleToggleClose() {
    setTogglingClose(true)
    try {
      const newStatus = isClosed ? "active" : "closed"
      await setGameStatus(game.id, newStatus)
      setGameStatus_(newStatus)
      toast.success(isClosed ? "Session reopened" : "Session closed — edits are locked")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTogglingClose(false)
    }
  }

  async function handleEndGame() {
    if (!payout || !gameForPayout || (approved.length + guests.filter(g => g.cash_in !== null || g.cash_out !== null).length) < 2) return
    setEnding(true)
    const nameToUserId = new Map<string, string>()
    
    // Map approved players to user IDs
    approved.forEach((player) => {
      const playerName = gameForPayout.players.find(gp => {
        const base = player.venmo_handle ? `@${player.venmo_handle}` : player.display_name || `Player_${player.user_id.slice(0, 8)}`
        return gp.name === base || gp.name.startsWith(base + '_')
      })?.name
      if (playerName) {
        nameToUserId.set(playerName, player.user_id)
      }
    })
    
    // Create profit deltas only for players with user IDs (excluding guests)
    const profit_deltas = payout.players
      .filter(pl => nameToUserId.has(pl.name)) // Only include players with user IDs
      .map((pl) => ({
        user_id: nameToUserId.get(pl.name)!,
        profit_delta: pl.net
      }))
    
    // Note: We don't validate that all payout players have user IDs since guests won't have them
    const supabase = createClient()
    const { error } = await supabase.rpc("end_game", {
      p_game_id: game.id,
      p_profit_deltas: profit_deltas
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
          <div className="flex items-center gap-2">
            {isHost && (
              <Button
                variant={isClosed ? "outline" : "secondary"}
                size="sm"
                onClick={handleToggleClose}
                disabled={togglingClose}
              >
                {togglingClose ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : isClosed ? (
                  <LockOpen className="mr-1 h-4 w-4" />
                ) : (
                  <Lock className="mr-1 h-4 w-4" />
                )}
                {isClosed ? "Reopen Session" : "Close Session"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyGameLink}>
              <Copy className="mr-1 h-4 w-4" />
              Copy link
            </Button>
          </div>
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
                    Requested in: {p.requested_cash_in ?? 0} / out: {p.requested_cash_out ?? 0}
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
          <CardDescription>
            {isClosed
              ? "Session is closed — amounts are locked. Host can reopen to allow edits."
              : "Cash in / out per player (editable by host or self if approved)"}
          </CardDescription>
        </CardHeader>
        {isClosed && (
          <div className="mx-6 mb-2 flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-500">
            <Lock className="h-4 w-4 shrink-0" />
            Session closed — all edits are locked until the host reopens it.
          </div>
        )}
        <CardContent>
          <div className="space-y-3">
            {players.map((p) => (
              <div
                key={p.user_id}
                className="flex flex-wrap items-center gap-2 rounded border p-2"
              >
                {/* Player name: host can click approved players to open action modal */}
                <span className="font-medium">
                  {isHost && p.status === "approved" && p.user_id !== currentUserId ? (
                    <button
                      className="cursor-pointer text-left underline underline-offset-2 decoration-white"
                      onClick={() => {
                        setSelectedPlayer(p)
                        setTransferConfirm(false)
                      }}
                    >
                      {p.display_name || p.user_id.slice(0, 8)}
                    </button>
                  ) : (
                    p.display_name || p.user_id.slice(0, 8)
                  )}
                  {p.status === "pending" && (
                    <span className="text-muted-foreground ml-1 text-sm">(pending)</span>
                  )}
                  {p.status === "denied" && (
                    <span className="text-muted-foreground ml-1 text-sm">(denied)</span>
                  )}
                </span>
                {p.status === "approved" && (
                  <>
                    {/* Host controls: always editable, even when session is closed */}
                    {isHost && (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            className="w-24"
                            placeholder="In"
                            value={p.cash_in === null || p.cash_in === undefined ? "" : p.cash_in.toString()}
                            onChange={(e) => {
                              const v = parseCashInput(e.target.value)
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, cash_in: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseCashInput(e.target.value)
                              updateCash(game.id, p.user_id, v, p.cash_out)
                            }}
                          />
                          <Input
                            className="w-24"
                            placeholder="Out"
                            value={p.cash_out === null || p.cash_out === undefined ? "" : p.cash_out.toString()}
                            onChange={(e) => {
                              const v = parseCashInput(e.target.value)
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, cash_out: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseCashInput(e.target.value)
                              updateCash(game.id, p.user_id, p.cash_in, v)
                            }}
                          />
                        </div>
                        {!isClosed && (p.requested_cash_in !== p.cash_in || p.requested_cash_out !== p.cash_out) && (
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {p.requested_cash_in !== p.cash_in && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex-1">
                                  Requested in: {p.requested_cash_in ?? 0} (current {p.cash_in ?? 0})
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    size="sm"
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
                                    size="sm"
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
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex-1">
                                  Requested out: {p.requested_cash_out ?? 0} (current {p.cash_out ?? 0})
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    size="sm"
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
                                    size="sm"
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

                    {/* Non-host self: editable inputs when open, read-only when closed */}
                    {!isHost && p.user_id === currentUserId && !isClosed && (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            className="w-24"
                            placeholder="In"
                            value={p.requested_cash_in === null || p.requested_cash_in === undefined ? "" : p.requested_cash_in.toString()}
                            onChange={(e) => {
                              const v = parseCashInput(e.target.value)
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, requested_cash_in: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseCashInput(e.target.value)
                              updateRequestedCash(game.id, p.user_id, v, p.requested_cash_out)
                            }}
                          />
                          <Input
                            className="w-24"
                            placeholder="Out"
                            value={p.requested_cash_out === null || p.requested_cash_out === undefined ? "" : p.requested_cash_out.toString()}
                            onChange={(e) => {
                              const v = parseCashInput(e.target.value)
                              setPlayers((prev) =>
                                prev.map((x) =>
                                  x.user_id === p.user_id ? { ...x, requested_cash_out: v } : x
                                )
                              )
                            }}
                            onBlur={(e) => {
                              const v = parseCashInput(e.target.value)
                              updateRequestedCash(game.id, p.user_id, p.requested_cash_in, v)
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Current approved: In {p.cash_in ?? 0} / Out {p.cash_out ?? 0}
                          {(p.requested_cash_in !== p.cash_in || p.requested_cash_out !== p.cash_out) &&
                            " — awaiting host approval"}
                        </span>
                      </div>
                    )}

                    {/* Non-host self: read-only when closed */}
                    {!isHost && p.user_id === currentUserId && isClosed && (
                      <span className="text-muted-foreground text-sm">
                        In: {p.cash_in ?? 0} / Out: {p.cash_out ?? 0}
                      </span>
                    )}

                    {/* Other players: always read-only */}
                    {!isHost && p.user_id !== currentUserId && (
                      <span className="text-muted-foreground text-sm">
                        In: {p.cash_in ?? 0} / Out: {p.cash_out ?? 0}
                      </span>
                    )}
                  </>
                )}
                {p.status === "pending" && !isHost && p.user_id === currentUserId && !isClosed && (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-24"
                        placeholder="Requested in"
                        value={p.requested_cash_in === null || p.requested_cash_in === undefined ? "" : p.requested_cash_in.toString()}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value) || null
                          setPlayers((prev) =>
                            prev.map((x) =>
                              x.user_id === p.user_id ? { ...x, requested_cash_in: v } : x
                            )
                          )
                        }}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value) || null
                          updateRequestedAmounts(game.id, v ?? 0, p.requested_cash_out ?? 0).catch(() =>
                            toast.error("Failed to save")
                          )
                        }}
                      />
                      <Input
                        className="w-24"
                        placeholder="Requested out"
                        value={p.requested_cash_out === null || p.requested_cash_out === undefined ? "" : p.requested_cash_out.toString()}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value) || null
                          setPlayers((prev) =>
                            prev.map((x) =>
                              x.user_id === p.user_id ? { ...x, requested_cash_out: v } : x
                            )
                          )
                        }}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value) || null
                          updateRequestedAmounts(game.id, p.requested_cash_in ?? 0, v ?? 0).catch(() =>
                            toast.error("Failed to save")
                          )
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Waiting for host to approve your join request and amounts.
                    </span>
                  </div>
                )}
                {/* Denied self: offer to request rejoin */}
                {!isHost && p.user_id === currentUserId && p.status === "denied" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-red-400">
                      You were removed from this table.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === p.user_id}
                      onClick={async () => {
                        setUpdating(p.user_id)
                        try {
                          await requestRejoin(game.id)
                          // Optimistically flip to pending in local state
                          setPlayers((prev) =>
                            prev.map((x) =>
                              x.user_id === p.user_id ? { ...x, status: "pending" } : x
                            )
                          )
                          toast.success("Rejoin request sent — waiting for host approval")
                        } catch {
                          toast.error("Failed to send rejoin request")
                        } finally {
                          setUpdating(null)
                        }
                      }}
                    >
                      {updating === p.user_id
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : null}
                      Request to Rejoin
                    </Button>
                  </div>
                )}

                {/* Kick button — host only, not on self */}
                {isHost && p.user_id !== currentUserId && (
                  <button
                    className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Remove player"
                    disabled={kicking === p.user_id}
                    onClick={() => handleKick(p.user_id)}
                  >
                    {kicking === p.user_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
              </div>
            ))}
            
            {/* Guest section — visible to everyone, editable by host */}
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded border p-3"
              >
                <span className="font-medium flex-shrink-0">
                  {guest.name}
                  <span className="text-muted-foreground ml-1 text-sm">(guest)</span>
                </span>
                {isHost ? (
                  <div className="flex items-center gap-2 sm:flex-1">
                    <Input
                      className="flex-1 sm:w-24 sm:flex-initial"
                      placeholder="In"
                      value={guest.cash_in === null || guest.cash_in === undefined ? "" : guest.cash_in.toString()}
                      onChange={(e) => {
                        const v = parseCashInput(e.target.value)
                        setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, cash_in: v } : g)))
                      }}
                      onBlur={(e) => {
                        const v = parseCashInput(e.target.value)
                        updateGuestDb(guest.id, { cash_in: v })
                      }}
                      disabled={isClosed}
                    />
                    <Input
                      className="flex-1 sm:w-24 sm:flex-initial"
                      placeholder="Out"
                      value={guest.cash_out === null || guest.cash_out === undefined ? "" : guest.cash_out.toString()}
                      onChange={(e) => {
                        const v = parseCashInput(e.target.value)
                        setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, cash_out: v } : g)))
                      }}
                      onBlur={(e) => {
                        const v = parseCashInput(e.target.value)
                        updateGuestDb(guest.id, { cash_out: v })
                      }}
                      disabled={isClosed}
                    />
                    <button
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title="Remove guest"
                      onClick={() => removeGuest(guest.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    In: {guest.cash_in ?? 0} / Out: {guest.cash_out ?? 0}
                  </span>
                )}
              </div>
            ))}

            {/* Add guest form — host only */}
            {isHost && !isClosed && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 rounded border p-3 bg-zinc-500/5 border-zinc-500/20">
                <Input
                  className="flex-1 sm:flex-initial sm:w-32 min-w-0"
                  placeholder="Guest name"
                  value={guestForm.name}
                  onChange={(e) => handleGuestNameChange(e.target.value)}
                  onBlur={handleGuestNameBlur}
                />
                <div className="flex gap-2">
                  <Input
                    className="flex-1 sm:w-24"
                    placeholder="In"
                    value={guestForm.cash_in}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, cash_in: e.target.value }))}
                  />
                  <Input
                    className="flex-1 sm:w-24"
                    placeholder="Out"
                    value={guestForm.cash_out}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, cash_out: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {payout && (
        <>
          <h2 className="text-lg font-semibold">Payout summary</h2>
          <PayoutStatsView payout={payout} />
        </>
      )}

      {isHost && (
        <div className="flex justify-end gap-2">
          {(approved.length + guests.filter(g => g.cash_in !== null || g.cash_out !== null).length) >= 2 && (
            <Button
              onClick={handleEndGame}
              disabled={ending}
              variant="destructive"
            >
              {ending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End Game
            </Button>
          )}
        </div>
      )}

      {/* Transfer Host Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPlayer(null)
              setTransferConfirm(false)
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Crown className="h-5 w-5 text-yellow-500" />
                Player Actions
              </div>
              <p className="text-zinc-400 text-sm">
                {selectedPlayer.display_name || selectedPlayer.venmo_handle || selectedPlayer.user_id.slice(0, 8)}
              </p>
            </div>

            {/* Transfer Host section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium text-sm">
                <ArrowRightLeft className="h-4 w-4 text-zinc-400" />
                Transfer Host
              </div>
              <p className="text-xs text-zinc-500">
                This player will become the new host and gain full control of the game.
                You will become a regular player.
              </p>
              {!transferConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTransferConfirm(true)}
                >
                  Make Host
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-yellow-400 font-medium">
                    Are you sure? This cannot be undone without the new host&apos;s consent.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={transferring}
                      onClick={() => handleTransferHost(selectedPlayer.user_id)}
                    >
                      {transferring ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                      Confirm Transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTransferConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-zinc-500"
              onClick={() => {
                setSelectedPlayer(null)
                setTransferConfirm(false)
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
