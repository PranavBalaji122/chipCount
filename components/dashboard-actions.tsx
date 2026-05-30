"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Play, LogIn, UserPlus, X } from "lucide-react"
import type { User } from "@supabase/supabase-js"

type GuestEntry = { id: string; name: string }

export function DashboardActions() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [gameName, setGameName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)

  // Guest state for the "New Table" dialog
  const [guests, setGuests] = useState<GuestEntry[]>([])
  const [guestInput, setGuestInput] = useState("")

  function addGuestFromInput() {
    const name = guestInput.trim()
    if (!name) return
    const alreadyExists = guests.some(
      (g) => g.name.toLowerCase() === name.toLowerCase()
    )
    if (alreadyExists) return
    setGuests((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name }
    ])
    setGuestInput("")
  }

  function removeGuest(id: string) {
    setGuests((prev) => prev.filter((g) => g.id !== id))
  }

  async function ensureProfile(
    supabase: ReturnType<typeof createClient>,
    user: User
  ) {
    const fallbackName = user.email ? user.email.split("@")[0] : null
    const displayName =
      (typeof user.user_metadata?.display_name === "string" &&
        user.user_metadata.display_name) ||
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name) ||
      fallbackName

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName
      },
      { onConflict: "id", ignoreDuplicates: true }
    )

    if (error) throw error
  }

  async function handleStartGame(e?: React.FormEvent) {
    e?.preventDefault()
    setStartError(null)
    setStartLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        setStartError("Not logged in")
        setStartLoading(false)
        return
      }

      await ensureProfile(supabase, user)

      const description = gameName.trim() || null
      const { data: game, error } = await supabase
        .from("games")
        .insert({ host_id: user.id, description })
        .select("id, short_code")
        .single()
      if (error) throw error
      const { error: playerError } = await supabase
        .from("game_players")
        .insert({
          game_id: game.id,
          user_id: user.id,
          status: "approved"
        })
      if (playerError) throw playerError

      // Insert any pre-added guests
      if (guests.length > 0) {
        const { error: guestError } = await supabase
          .from("game_guests")
          .insert(
            guests.map((g) => ({
              game_id: game.id,
              name: g.name,
              cash_in: 0,
              cash_out: 0
            }))
          )
        if (guestError) {
          console.error("Failed to add guests:", guestError)
          // Non-fatal: still navigate to the game
        }
      }

      router.push(`/game/${game.id}`)
      router.refresh()
    } catch (e) {
      console.error(e)
      setStartError(e instanceof Error ? e.message : "Unable to start game")
      setStartLoading(false)
    }
  }

  async function handleJoinGame(e: React.FormEvent) {
    e.preventDefault()
    setJoinError(null)
    const code = joinCode.trim().toLowerCase()
    if (!code) {
      setJoinError("Enter a game ID")
      return
    }
    setJoinLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        setJoinError("Not logged in")
        setJoinLoading(false)
        return
      }

      await ensureProfile(supabase, user)

      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("id")
        .eq("short_code", code)
        .eq("status", "active")
        .single()
      if (gameError || !game) {
        setJoinError("Game not found or not active")
        setJoinLoading(false)
        return
      }
      const { error: insertError } = await supabase
        .from("game_players")
        .insert({
          game_id: game.id,
          user_id: user.id,
          status: "pending"
        })
      if (insertError) {
        if (insertError.code === "23505") {
          setJoinError("You already joined this game")
        } else {
          setJoinError(insertError.message)
        }
        setJoinLoading(false)
        return
      }
      router.push(`/game/${game.id}`)
      router.refresh()
    } catch (e) {
      console.error(e)
      setJoinError("Something went wrong")
      setJoinLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog
        open={showNameInput}
        onOpenChange={(open) => {
          if (!open && !startLoading) {
            setShowNameInput(false)
            setGameName("")
            setGuests([])
            setGuestInput("")
            setStartError(null)
          } else {
            setShowNameInput(open)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Table</DialogTitle>
            <DialogDescription>
              Give your table a name and optionally add guests before starting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartGame} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="game-name">
                Table name{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="game-name"
                placeholder="e.g. Friday Night Poker"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                autoFocus
                disabled={startLoading}
                className="bg-muted/50"
              />
            </div>

            {/* Guest section */}
            <div className="space-y-2">
              <Label htmlFor="guest-input">
                Guests{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="guest-input"
                  placeholder="Guest name"
                  value={guestInput}
                  onChange={(e) => setGuestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addGuestFromInput()
                    }
                  }}
                  disabled={startLoading}
                  className="bg-muted/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Add guest"
                  onClick={addGuestFromInput}
                  disabled={startLoading || !guestInput.trim()}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              {guests.length > 0 && (
                <ul className="space-y-1">
                  {guests.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                    >
                      <span>{g.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove guest ${g.name}`}
                        onClick={() => removeGuest(g.id)}
                        disabled={startLoading}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {startError && (
              <p className="text-destructive text-sm" role="alert">
                {startError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={startLoading} className="flex-1">
                {startLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Create Table
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={startLoading}
                onClick={() => {
                  setShowNameInput(false)
                  setGameName("")
                  setGuests([])
                  setGuestInput("")
                  setStartError(null)
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Start Game button */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => setShowNameInput(true)}
          disabled={startLoading}
          className="w-full"
          size="lg"
        >
          <Play className="mr-2 h-4 w-4" />
          Create Table
        </Button>
        <p className="text-muted-foreground text-xs">
          Create a new table and share the game ID for others to join.
        </p>
      </div>

      <form onSubmit={handleJoinGame} className="flex flex-col gap-2">
        <Label htmlFor="join-code">Join with Game ID</Label>
        <div className="flex gap-2">
          <Input
            id="join-code"
            placeholder="e.g. a1b2c3d4"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={joinLoading}>
            {joinLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span className="sr-only">Join table</span>
          </Button>
        </div>
        {joinError && (
          <p className="text-destructive text-sm" role="alert">
            {joinError}
          </p>
        )}
      </form>
    </div>
  )
}
