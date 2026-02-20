"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Play, LogIn, Trophy } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

export function DashboardActions() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [startLoading, setStartLoading] = useState(false)

  async function ensureProfile(supabase: ReturnType<typeof createClient>, user: User) {
    const fallbackName = user.email ? user.email.split("@")[0] : null
    const displayName =
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      fallbackName

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          display_name: displayName
        },
        { onConflict: "id", ignoreDuplicates: true }
      )

    if (error) throw error
  }

  async function handleStartGame() {
    setStartError(null)
    setStartLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStartError("Not logged in")
        setStartLoading(false)
        return
      }

      await ensureProfile(supabase, user)

      const { data: game, error } = await supabase
        .from("games")
        .insert({ host_id: user.id })
        .select("id, short_code")
        .single()
      if (error) throw error
      const { error: playerError } = await supabase.from("game_players").insert({
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
      const { data: { user } } = await supabase.auth.getUser()
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
      const { error: insertError } = await supabase.from("game_players").insert({
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
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleStartGame}
          disabled={startLoading}
          className="w-full"
          size="lg"
        >
          {startLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Start Game
        </Button>
        <p className="text-muted-foreground text-xs">
          Create a new game and share the game ID for others to join.
        </p>
        {startError && <p className="text-destructive text-sm">{startError}</p>}
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
            {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          </Button>
        </div>
        {joinError && <p className="text-destructive text-sm">{joinError}</p>}
      </form>

      <div>
        <Link href="/dashboard#leaderboard">
          <Button variant="outline" className="w-full" size="lg">
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
