import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { GameMetricsClient } from "@/components/game-metrics-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function GameMetricsPage({
    params
}: {
    params: Promise<{ gameId: string }>
}) {
    const { gameId } = await params
    const supabase = await createClient()

    const {
        data: { user }
    } = await supabase.auth.getUser()
    if (!user) notFound()

    // Game info
    const { data: game } = await supabase
        .from("games")
        .select("id, short_code, description, status, host_id")
        .eq("id", gameId)
        .single()
    if (!game) notFound()

    // Approved players only — for "Current Session" card
    const { data: approvedPlayers } = await supabase
        .from("game_players")
        .select("user_id, cash_in, cash_out, profile:profiles(display_name, venmo_handle)")
        .eq("game_id", gameId)
        .eq("status", "approved")

    // ALL players ever in this game (any status) — for standings (includes kicked)
    const { data: allPlayers } = await supabase
        .from("game_players")
        .select("user_id, status, profile:profiles(display_name, venmo_handle)")
        .eq("game_id", gameId)
        .neq("status", "pending") // exclude people who never got approved

    // Session snapshots for this game (one row per player per close event)
    const { data: snapshots } = await supabase
        .from("session_snapshots")
        .select("user_id, session_net, snapshotted_at")
        .eq("game_id", gameId)
        .order("snapshotted_at", { ascending: true })

    const allSnapshots = snapshots ?? []

    // Per-session chart points for the current user
    const mySnapshots = allSnapshots.filter((s: { user_id: string }) => s.user_id === user.id)
    const sessionChartPoints = mySnapshots.map(
        (s: { session_net: number; snapshotted_at: string }, i: number) => ({
            label: `Session ${i + 1}`,
            date: new Date(s.snapshotted_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }),
            net: Number(s.session_net)
        })
    )

    // Cumulative chart for current user
    let cumulative = 0
    const cumulativeChartPoints = mySnapshots.map(
        (s: { session_net: number; snapshotted_at: string }, i: number) => {
            cumulative += Number(s.session_net)
            return {
                label: `Session ${i + 1}`,
                date: new Date(s.snapshotted_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                net: cumulative
            }
        }
    )

    // Per-player cumulative totals from snapshots
    const snapshotTotals: Record<string, number> = {}
    for (const s of allSnapshots) {
        snapshotTotals[s.user_id] = (snapshotTotals[s.user_id] ?? 0) + Number(s.session_net)
    }

    type RawProfile = { display_name: string | null; venmo_handle: string | null } | null

    // Current session players (approved only)
    const sessionPlayers = (approvedPlayers ?? []).map((p: {
        user_id: string
        cash_in: number | null
        cash_out: number | null
        profile: RawProfile | RawProfile[]
    }) => {
        const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
        const cashIn = Number(p.cash_in ?? 0)
        const cashOut = Number(p.cash_out ?? 0)
        return {
            user_id: p.user_id,
            display_name: prof?.display_name ?? null,
            venmo_handle: prof?.venmo_handle ?? null,
            game_net: snapshotTotals[p.user_id] ?? 0,
            cash_in: cashIn,
            cash_out: cashOut,
            session_net: cashOut - cashIn,
            is_me: p.user_id === user.id,
            was_kicked: false
        }
    })

    // All-time standings: everyone who has a snapshot (approved + kicked)
    // Build from allPlayers, but only include those with a snapshot entry
    const standingsPlayers = (allPlayers ?? [])
        .filter((p: { user_id: string }) => snapshotTotals[p.user_id] !== undefined)
        .map((p: { user_id: string; status: string; profile: RawProfile | RawProfile[] }) => {
            const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
            return {
                user_id: p.user_id,
                display_name: prof?.display_name ?? null,
                venmo_handle: prof?.venmo_handle ?? null,
                game_net: snapshotTotals[p.user_id] ?? 0,
                is_me: p.user_id === user.id,
                was_kicked: p.status === "denied"
            }
        })

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{game.description || "Game"} — Metrics</h1>
                    <p className="text-muted-foreground text-sm">
                        Game ID: <span className="font-mono">{game.short_code}</span> ·{" "}
                        <span className="capitalize">{game.status}</span>
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/game/${gameId}/metrics/history`}>Session History</Link>
                </Button>
            </div>

            <GameMetricsClient
                sessionPlayers={sessionPlayers}
                standingsPlayers={standingsPlayers}
                sessionChartPoints={sessionChartPoints}
                cumulativeChartPoints={cumulativeChartPoints}
                currentUserId={user.id}
            />
        </div>
    )
}
