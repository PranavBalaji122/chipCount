import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { GameMetricsClient } from "@/components/game-metrics-client"
import { Button } from "@/components/ui/button"

function formatSessionDate(iso: string): string {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const y = String(d.getFullYear()).slice(-2)
    const h = d.getHours()
    const min = String(d.getMinutes()).padStart(2, "0")
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${m}/${day}/${y} ${h12}:${min} ${ampm}`
}

function shortSessionDate(iso: string): string {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours()
    const min = String(d.getMinutes()).padStart(2, "0")
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${m}/${day} ${h12}:${min}${ampm}`
}

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

    // Run ALL queries in parallel for maximum speed
    const [gameResult, approvedPlayersResult, allPlayersResult, snapshotsResult, guestSnapshotsResult] = await Promise.all([
        supabase
            .from("games")
            .select("id, short_code, description, status, host_id")
            .eq("id", gameId)
            .single(),
        supabase
            .from("game_players")
            .select("user_id, cash_in, cash_out, profile:profiles(display_name, venmo_handle)")
            .eq("game_id", gameId)
            .eq("status", "approved"),
        supabase
            .from("game_players")
            .select("user_id, status, profile:profiles(display_name, venmo_handle)")
            .eq("game_id", gameId)
            .neq("status", "pending"),
        supabase
            .from("session_snapshots")
            .select("user_id, cash_in, cash_out, session_net, snapshotted_at")
            .eq("game_id", gameId)
            .order("snapshotted_at", { ascending: true }),
        supabase
            .from("guest_session_snapshots")
            .select("guest_name, cash_in, cash_out, session_net, snapshotted_at")
            .eq("game_id", gameId)
            .order("snapshotted_at", { ascending: true })
    ])

    const { data: game } = gameResult
    const { data: approvedPlayers } = approvedPlayersResult
    const { data: allPlayers } = allPlayersResult
    const { data: snapshots } = snapshotsResult
    const { data: guestSnapshots } = guestSnapshotsResult

    if (!game) notFound()

    const allSnapshots = snapshots ?? []
    const allGuestSnapshots = guestSnapshots ?? []

    type RawProfile = { display_name: string | null; venmo_handle: string | null } | null

    // Build userId -> display name map
    const userNameMap = new Map<string, string>()
    for (const p of (allPlayers ?? []) as { user_id: string; profile: RawProfile | RawProfile[] }[]) {
        const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
        const name = prof?.venmo_handle
            ? `@${prof.venmo_handle}`
            : prof?.display_name || p.user_id.slice(0, 8)
        userNameMap.set(p.user_id, name)
    }

    // Group all snapshots (player + guest) by snapshotted_at
    type SessionEntry = { name: string; cashIn: number; cashOut: number }
    const sessionMap = new Map<string, SessionEntry[]>()

    for (const s of allSnapshots) {
        const key = s.snapshotted_at
        if (!sessionMap.has(key)) sessionMap.set(key, [])
        sessionMap.get(key)!.push({
            name: userNameMap.get(s.user_id) ?? s.user_id.slice(0, 8),
            cashIn: Number(s.cash_in ?? 0),
            cashOut: Number(s.cash_out ?? 0),
        })
    }

    for (const gs of allGuestSnapshots) {
        const key = gs.snapshotted_at
        if (!sessionMap.has(key)) sessionMap.set(key, [])
        sessionMap.get(key)!.push({
            name: `${gs.guest_name} (guest)`,
            cashIn: Number(gs.cash_in ?? 0),
            cashOut: Number(gs.cash_out ?? 0),
        })
    }

    const sessionHistory = [...sessionMap.entries()]
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([timestamp, players]) => ({
            snapshotted_at: timestamp,
            label: formatSessionDate(timestamp),
            players,
        }))

    // Per-session chart points for the current user (labeled by date/time)
    const mySnapshots = allSnapshots.filter((s: { user_id: string }) => s.user_id === user.id)
    const sessionChartPoints = mySnapshots.map(
        (s: { session_net: number; snapshotted_at: string }) => ({
            label: shortSessionDate(s.snapshotted_at),
            date: formatSessionDate(s.snapshotted_at),
            net: Number(s.session_net)
        })
    )

    let cumulative = 0
    const cumulativeChartPoints = mySnapshots.map(
        (s: { session_net: number; snapshotted_at: string }) => {
            cumulative += Number(s.session_net)
            return {
                label: shortSessionDate(s.snapshotted_at),
                date: formatSessionDate(s.snapshotted_at),
                net: cumulative
            }
        }
    )

    const snapshotTotals: Record<string, number> = {}
    for (const s of allSnapshots) {
        snapshotTotals[s.user_id] = (snapshotTotals[s.user_id] ?? 0) + Number(s.session_net)
    }

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
        .sort((a, b) => b.game_net - a.game_net) // Sort by net profit descending
        .slice(0, 3) // Take only top 3

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
                <Button variant="outline" size="sm">
                    Session History
                </Button>
            </div>

            <GameMetricsClient
                sessionPlayers={sessionPlayers}
                standingsPlayers={standingsPlayers}
                sessionChartPoints={sessionChartPoints}
                cumulativeChartPoints={cumulativeChartPoints}
                sessionHistory={sessionHistory}
                currentUserId={user.id}
            />
        </div>
    )
}
