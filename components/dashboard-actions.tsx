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
import { Loader2, Play, LogIn, ArrowRight } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export function DashboardActions() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [gameName, setGameName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [showJoinInput, setShowJoinInput] = useState(false)

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
    <>
      {/* Create Table name dialog */}
      <Dialog
        open={showNameInput}
        onOpenChange={(open) => {
          if (!open && !startLoading) {
            setShowNameInput(false)
            setGameName("")
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
              Give your table a name so players know what they&apos;re joining.
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
                  setStartError(null)
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Side-by-side action tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Create Table tile */}
        <button
          id="create-table-tile"
          type="button"
          onClick={() => setShowNameInput(true)}
          disabled={startLoading}
          className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-6 text-center transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.12] hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Create Table</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Start a new game
            </p>
          </div>
        </button>

        {/* Join Table tile */}
        <button
          id="join-table-tile"
          type="button"
          onClick={() => {
            setShowJoinInput(true)
            setJoinError(null)
          }}
          className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-6 text-center transition-all duration-200 hover:border-border/80 hover:bg-card/80 hover:shadow-lg hover:shadow-black/5 active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Join Table</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Enter a game ID
            </p>
          </div>
        </button>
      </div>

      {/* Join table inline input — slides in below the tiles */}
      {showJoinInput && (
        <form
          onSubmit={handleJoinGame}
          className="animate-fade-in-up mt-3 flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <Input
              id="join-code"
              placeholder="Enter game ID, e.g. a1b2c3d4"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="font-mono"
              autoFocus
            />
            <Button
              type="submit"
              disabled={joinLoading}
              size="default"
              className="shrink-0"
            >
              {joinLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
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
      )}
    </>
  )
}
