"use client"

import { useState, useMemo } from "react"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    ReferenceLine
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PayoutStatsView } from "./payout-stats-view"
import { TrendingUp, TrendingDown, Minus, History, Search, ArrowLeft, X } from "lucide-react"
import { formatDollar, calcPayouts } from "@/lib/utils"
import type { GameSchema } from "@/lib/schemas"

type SessionPlayer = {
    user_id: string
    display_name: string | null
    venmo_handle: string | null
    game_net: number
    cash_in: number
    cash_out: number
    session_net: number
    is_me: boolean
    was_kicked: boolean
}

type StandingsPlayer = {
    user_id: string
    display_name: string | null
    venmo_handle: string | null
    game_net: number
    is_me: boolean
    was_kicked: boolean
}

type SessionChartPoint = { label: string; date: string; net: number }

type SessionHistoryEntry = {
    snapshotted_at: string
    label: string
    players: { name: string; cashIn: number; cashOut: number }[]
}

const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        color: "var(--foreground)",
        fontSize: 13,
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.25)"
    },
    itemStyle: { color: "var(--muted-foreground)" },
    labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 2 }
}

const TICK = { fontSize: 11, fill: "var(--muted-foreground)" }

function yDomain(data: { net: number }[]): [number, number] {
    if (!data.length) return [-10, 10]
    const vals = data.map((d) => d.net)
    const max = Math.max(...vals, 0)
    const min = Math.min(...vals, 0)
    const range = max - min || 1
    const pad = range * 0.2
    return [Math.floor(min - pad), Math.ceil(max + pad)]
}

function NetBadge({ value }: { value: number }) {
    if (value > 0.01)
        return (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold tabular-nums">
                <TrendingUp className="h-3.5 w-3.5" />
                {formatDollar(value)}
            </span>
        )
    if (value < -0.01)
        return (
            <span className="flex items-center gap-1 text-red-400 font-semibold tabular-nums">
                <TrendingDown className="h-3.5 w-3.5" />
                {formatDollar(value)}
            </span>
        )
    return (
        <span className="flex items-center gap-1 text-muted-foreground font-semibold">
            <Minus className="h-3.5 w-3.5" />
            $0
        </span>
    )
}

function PlayerBarChart({
    data,
    tooltipLabel
}: {
    data: { name: string; net: number; isMe: boolean }[]
    tooltipLabel: string
}) {
    const allZero = data.every((d) => Math.abs(d.net) < 0.01)
    if (allZero) {
        return (
            <p className="text-muted-foreground text-sm text-center py-6">
                No data yet — this updates when games are ended.
            </p>
        )
    }
    const domain = yDomain(data)
    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barSize={36} barCategoryGap="40%">
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + "…" : v)}
                    />
                    <YAxis
                        tickFormatter={(v) => formatDollar(v)}
                        tick={TICK}
                        width={58}
                        axisLine={false}
                        tickLine={false}
                        domain={domain}
                    />
                    <Tooltip
                        formatter={(value: number) => [formatDollar(value), tooltipLabel]}
                        cursor={{ fill: "hsl(var(--muted) / 0.5)", radius: 6 }}
                        {...TOOLTIP_STYLE}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                    <Bar dataKey="net" radius={[6, 6, 2, 2]}>
                        {data.map((entry, i) => (
                            <Cell
                                key={i}
                                fill={entry.isMe
                                    ? entry.net >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
                                    : entry.net >= 0 ? "hsl(var(--success) / 0.7)" : "hsl(var(--destructive) / 0.7)"}
                                opacity={entry.isMe ? 1 : 0.6}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

function SessionHistoryModal({
    sessions,
    onClose
}: {
    sessions: SessionHistoryEntry[]
    onClose: () => void
}) {
    const [search, setSearch] = useState("")
    const [selectedSession, setSelectedSession] = useState<SessionHistoryEntry | null>(null)

    const filtered = useMemo(() => {
        if (!search.trim()) return sessions
        const q = search.toLowerCase()
        return sessions.filter((s) =>
            s.label.toLowerCase().includes(q) ||
            s.players.some((p) => p.name.toLowerCase().includes(q))
        )
    }, [sessions, search])

    const selectedPayout = useMemo(() => {
        if (!selectedSession || selectedSession.players.length < 2) return null
        const gameData: GameSchema = {
            players: selectedSession.players.map((p) => ({
                name: p.name,
                cashIn: p.cashIn,
                cashOut: p.cashOut,
            })),
        }
        return calcPayouts(gameData)
    }, [selectedSession])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 w-full max-w-sm sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                    {selectedSession ? (
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base sm:text-lg font-semibold truncate">Session Payouts</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{selectedSession.label}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-base sm:text-lg font-semibold">Session History</h2>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-2"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                {selectedSession ? (
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
                        {selectedPayout ? (
                            <PayoutStatsView payout={selectedPayout} />
                        ) : (
                            <p className="text-muted-foreground text-sm py-8 text-center">
                                Not enough players to compute payouts.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="px-4 sm:px-6 pb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search sessions..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 bg-muted/50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Session list */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
                            {filtered.length === 0 ? (
                                <p className="text-muted-foreground text-sm py-8 text-center px-2">
                                    {sessions.length === 0
                                        ? "No sessions recorded yet. Close a session to save history."
                                        : "No sessions match your search."}
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {[...filtered].reverse().map((session) => {
                                        const totalIn = session.players.reduce((s, p) => s + p.cashIn, 0)
                                        const totalOut = session.players.reduce((s, p) => s + p.cashOut, 0)
                                        const pot = totalIn + totalOut

                                        return (
                                            <button
                                                key={session.snapshotted_at}
                                                onClick={() => setSelectedSession(session)}
                                                className="w-full text-left rounded-xl border bg-muted/30 p-3 sm:p-4 hover:bg-muted/60 hover:border-foreground/20 transition-colors active:bg-muted/80"
                                            >
                                                <div className="space-y-2">
                                                    {/* Top row - date and pot */}
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-sm sm:text-base">{session.label}</p>
                                                        {pot > 0 && (
                                                            <p className="text-xs sm:text-sm text-emerald-400 font-medium">
                                                                {formatDollar(pot)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Bottom row - player count and names */}
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">
                                                            {session.players.length} player{session.players.length !== 1 ? "s" : ""}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1 justify-end max-w-[60%] sm:max-w-[70%]">
                                                            {session.players.slice(0, 3).map((p) => (
                                                                <span
                                                                    key={p.name}
                                                                    className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate max-w-[60px] sm:max-w-[80px]"
                                                                    title={p.name}
                                                                >
                                                                    {p.name}
                                                                </span>
                                                            ))}
                                                            {session.players.length > 3 && (
                                                                <span className="text-xs text-muted-foreground/60">
                                                                    +{session.players.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export function GameMetricsClient({
    sessionPlayers,
    standingsPlayers,
    sessionChartPoints,
    cumulativeChartPoints,
    sessionHistory,
    currentUserId
}: {
    sessionPlayers: SessionPlayer[]
    standingsPlayers: StandingsPlayer[]
    sessionChartPoints: SessionChartPoint[]
    cumulativeChartPoints: SessionChartPoint[]
    sessionHistory: SessionHistoryEntry[]
    currentUserId: string
}) {
    const [historyOpen, setHistoryOpen] = useState(false)
    const me = sessionPlayers.find((p) => p.user_id === currentUserId)

    const sessionBarData = sessionPlayers.map((p) => ({
        name: p.display_name || p.venmo_handle || p.user_id.slice(0, 8),
        net: p.session_net,
        isMe: p.user_id === currentUserId
    }))

    const allTimeBarData = standingsPlayers.map((p) => ({
        name: p.display_name || p.venmo_handle || p.user_id.slice(0, 8),
        net: p.game_net,
        isMe: p.user_id === currentUserId
    }))

    const sessionDomain = yDomain(sessionChartPoints)
    const cumDomain = yDomain(cumulativeChartPoints)

    const finalCumNet = cumulativeChartPoints[cumulativeChartPoints.length - 1]?.net ?? 0
    const lineColor = finalCumNet >= 0 ? "#22c55e" : "#ef4444"

    return (
        <div className="space-y-5">
            {/* Session History button */}
            <div className="flex justify-end">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryOpen(true)}
                    className="min-h-[44px] px-4"
                >
                    <History className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Session History</span>
                    <span className="sm:hidden">History</span>
                </Button>
            </div>

            {/* Stat cards */}
            {me && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Session In", value: me.cash_in, neutral: true },
                        { label: "Session Out", value: me.cash_out, neutral: true },
                        { label: "Session Net", value: me.session_net },
                        { label: "Game Net", value: me.game_net }
                    ].map(({ label, value, neutral }) => (
                        <Card key={label} className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors">
                            <CardContent className="px-4 pt-4 pb-3">
                                <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
                                <p className={`text-xl font-bold tabular-nums ${neutral ? "text-foreground"
                                    : value > 0.01 ? "text-green-500 dark:text-green-400"
                                        : value < -0.01 ? "text-red-500 dark:text-red-400"
                                            : "text-muted-foreground"
                                    }`}>
                                    {formatDollar(value)}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Current session */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Current Session</CardTitle>
                    <CardDescription>Live net profit / loss per player</CardDescription>
                </CardHeader>
                <CardContent>
                    {sessionBarData.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">No approved players yet.</p>
                    ) : (
                        <PlayerBarChart data={sessionBarData} tooltipLabel="Session Net" />
                    )}
                </CardContent>
            </Card>

            {/* Per-session profit bars */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Your Profit Per Session</CardTitle>
                    <CardDescription>Net profit recorded each time the host closes the session</CardDescription>
                </CardHeader>
                <CardContent>
                    {sessionChartPoints.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">
                            Close the session to record the first data point.
                        </p>
                    ) : (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={sessionChartPoints}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                                    barSize={36}
                                    barCategoryGap="40%"
                                >
                                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tickFormatter={(v) => formatDollar(v)}
                                        tick={TICK}
                                        width={58}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={sessionDomain}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatDollar(value), "Session Net"]}
                                        labelFormatter={(label, payload) => {
                                            const pt = payload?.[0]?.payload as SessionChartPoint | undefined
                                            return pt ? pt.date : label
                                        }}
                                        cursor={{ fill: "hsl(var(--muted) / 0.5)", radius: 6 }}
                                        {...TOOLTIP_STYLE}
                                    />
                                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                                    <Bar dataKey="net" radius={[6, 6, 2, 2]}>
                                        {sessionChartPoints.map((entry, i) => (
                                            <Cell key={i} fill={entry.net >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cumulative line */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Cumulative Profit — This Game</CardTitle>
                    <CardDescription>Running total across all closed sessions</CardDescription>
                </CardHeader>
                <CardContent>
                    {cumulativeChartPoints.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">
                            Close the session to record the first data point.
                        </p>
                    ) : (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cumulativeChartPoints} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
                                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tickFormatter={(v) => formatDollar(v)}
                                        tick={TICK}
                                        width={58}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={cumDomain}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatDollar(value), "Cumulative Net"]}
                                        labelFormatter={(label, payload) => {
                                            const pt = payload?.[0]?.payload as SessionChartPoint | undefined
                                            return pt ? pt.date : label
                                        }}
                                        cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 }}
                                        {...TOOLTIP_STYLE}
                                    />
                                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                                    <Line
                                        type="monotone"
                                        dataKey="net"
                                        stroke={lineColor}
                                        strokeWidth={2.5}
                                        dot={(props) => {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const { cx, cy, payload } = props as any
                                            const c = (payload.net ?? 0) >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
                                            return (
                                                <circle
                                                    key={payload.label}
                                                    cx={cx}
                                                    cy={cy}
                                                    r={5}
                                                    fill={c}
                                                    stroke="hsl(var(--background))"
                                                    strokeWidth={2}
                                                />
                                            )
                                        }}
                                        activeDot={{ r: 7, fill: lineColor, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* All-time standings */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">All-Time Standings</CardTitle>
                    <CardDescription>Lifetime net profit for players at this table</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {standingsPlayers.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No data yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {[...standingsPlayers]

                                .sort((a, b) => b.game_net - a.game_net)
                                .map((p, i) => (
                                    <div
                                        key={p.user_id}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${p.user_id === currentUserId
                                            ? "bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 dark:border-emerald-500/20"
                                            : "bg-muted/40 dark:bg-muted/60"
                                            } ${p.was_kicked ? "opacity-60" : ""}`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <span className="text-muted-foreground text-xs w-5 tabular-nums">#{i + 1}</span>
                                            <span className="font-medium">
                                                {p.display_name || p.venmo_handle || p.user_id.slice(0, 8)}
                                                {p.user_id === currentUserId && (
                                                    <span className="ml-2 text-xs text-emerald-500 font-normal">you</span>
                                                )}
                                                {p.was_kicked && (
                                                    <span className="ml-2 text-xs text-muted-foreground font-normal">removed</span>
                                                )}
                                            </span>
                                        </span>
                                        <NetBadge value={p.game_net} />
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Session History Modal */}
            {historyOpen && (
                <SessionHistoryModal
                    sessions={sessionHistory}
                    onClose={() => setHistoryOpen(false)}
                />
            )}
        </div>
    )
}
