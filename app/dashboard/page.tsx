import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardActions } from "@/components/dashboard-actions";
import { HostEndTableButton } from "@/components/host-end-table-button";
import { Icon } from "@/components/icon";
import { formatDollar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Home", icon: "home", active: true },
  { href: "/play", label: "Quick Game", icon: "casino" },
  { href: "/import", label: "Import", icon: "upload_file" },
  { href: "#leaderboard", label: "Leaderboard", icon: "leaderboard" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: membershipsRaw }, { data: leaders }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, net_profit")
        .eq("id", user.id)
        .single(),
      supabase
        .from("game_players")
        .select(
          "status, game:games!inner(id, short_code, description, status, host_id)",
        )
        .eq("user_id", user.id)
        .neq("status", "pending")
        .in("games.status", ["active", "closed"]),
      supabase
        .from("profiles")
        .select("id, display_name, net_profit")
        .eq("profile_public", true)
        .order("net_profit", { ascending: false })
        .limit(3),
    ]);

  const memberships =
    membershipsRaw?.filter((m) => {
      const game = Array.isArray(m.game) ? m.game[0] : m.game;
      return game && (game as { status: string }).status !== "ended";
    }) ?? [];

  const firstName = profile?.display_name?.split(" ")[0] ?? "back";
  const net = Number(profile?.net_profit ?? 0);

  return (
    <div className="mx-auto max-w-container-max px-6 pb-24 pt-28 md:px-page-margin">
      <div className="flex gap-grid-gutter">
        {/* Sidebar */}
        <aside className="sticky top-28 hidden h-fit w-64 shrink-0 self-start lg:block">
          <div className="mb-8 space-y-1">
            <h3 className="font-label-caps text-label-caps text-muted-ink">
              HOST TERMINAL
            </h3>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="font-mono-ui text-mono-ui uppercase text-primary">
                {memberships.length} Active
              </span>
            </div>
          </div>
          <nav className="flex flex-col space-y-2">
            {SIDEBAR_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`group flex items-center gap-3 px-4 py-3 transition-all ${
                  l.active
                    ? "bg-surface-container-highest"
                    : "text-muted-ink hover:bg-surface-container-high"
                }`}
              >
                <Icon
                  name={l.icon}
                  filled={l.active}
                  className={
                    l.active
                      ? "text-primary"
                      : "text-muted-ink group-hover:text-primary"
                  }
                />
                <span
                  className={`font-label-caps text-label-caps ${
                    l.active ? "font-bold text-primary" : ""
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="mt-10">
            <div className="bg-primary p-4 text-on-primary">
              <p className="mb-2 font-label-caps text-[10px] opacity-70">
                QUICK ACTION
              </p>
              <p className="mb-4 font-body-md text-body-md">
                Start a local game session
              </p>
              <Link
                href="/play"
                className="block w-full bg-on-primary py-2 text-center font-label-caps text-label-caps text-primary"
              >
                QUICK GAME
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Welcome */}
          <header className="mb-12 md:mb-16">
            <h1 className="mb-4 font-display-lg text-display-lg text-primary">
              Welcome {firstName}
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg text-muted-ink">
              Your host terminal is ready. Start a new table, join one by ID, or
              jump back into a live game below.
            </p>
          </header>

          <div className="grid grid-cols-12 gap-grid-gutter">
            {/* Active Tables */}
            <section className="col-span-12 border border-border-muted bg-sand-surface p-8 transition-all hover:border-primary lg:col-span-8">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="mb-1 font-headline-md text-headline-md text-primary">
                    Active Tables
                  </h2>
                  <p className="font-label-caps text-label-caps text-muted-ink">
                    REAL-TIME GAME MONITOR
                  </p>
                </div>
              </div>

              {memberships.length === 0 ? (
                <div className="border border-dashed border-border-muted bg-parchment-canvas p-10 text-center">
                  <p className="font-body-md text-body-md text-muted-ink">
                    No active tables yet. Create one or join with a game ID.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberships.map((m) => {
                    const game = Array.isArray(m.game) ? m.game[0] : m.game;
                    if (!game) return null;
                    const isHost = game.host_id === user.id;
                    const isDenied = m.status === "denied";
                    const roleLabel = isHost
                      ? "Host"
                      : m.status === "approved"
                        ? "Player"
                        : isDenied
                          ? "Removed"
                          : "Pending";
                    return (
                      <div
                        key={game.id}
                        className={`flex items-center justify-between border border-border-muted bg-parchment-canvas p-4 ${
                          isDenied ? "opacity-70" : ""
                        }`}
                      >
                        <Link
                          href={`/game/${game.id}`}
                          prefetch
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-surface-container-highest">
                            <Icon name="style" className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-body-md text-body-md font-bold">
                              {game.description || "Game"}
                            </p>
                            <p className="font-mono-ui text-[12px] text-muted-ink">
                              ID {game.short_code} • {roleLabel}
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-4">
                          <span
                            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                              isHost
                                ? "bg-primary text-on-primary"
                                : "border border-border-muted bg-surface-container-highest text-primary"
                            }`}
                          >
                            {roleLabel}
                          </span>
                          {isHost ? (
                            <HostEndTableButton
                              gameId={game.id}
                              tableName={game.description ?? ""}
                            />
                          ) : (
                            <Link
                              href={`/game/${game.id}`}
                              prefetch
                              aria-label="Open table"
                              className="text-muted-ink transition-colors hover:text-primary"
                            >
                              <Icon
                                name="arrow_forward_ios"
                                className="text-base"
                              />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick Actions + net */}
            <section
              id="quick-actions"
              className="col-span-12 flex flex-col border border-border-muted bg-sand-surface p-8 transition-all hover:border-primary lg:col-span-4"
            >
              <div className="mb-8">
                <h2 className="mb-1 font-headline-md text-headline-md text-primary">
                  Quick Actions
                </h2>
                <p className="font-label-caps text-label-caps text-muted-ink">
                  CREATE OR JOIN A TABLE
                </p>
              </div>
              <DashboardActions />
              <div className="mt-10 border-t border-border-muted pt-6">
                <p className="font-label-caps text-label-caps text-muted-ink">
                  LIFETIME NET
                </p>
                <p
                  className={`font-display-lg text-[40px] ${
                    net >= 0 ? "text-primary" : "text-loss"
                  }`}
                >
                  {formatDollar(net)}
                </p>
              </div>
            </section>

            {/* Leaderboard band */}
            <section
              id="leaderboard"
              className="col-span-12 mt-8 bg-terminal-black p-8 text-on-primary md:p-12"
            >
              <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <h2 className="mb-2 font-headline-lg text-headline-lg">
                    Leaderboard
                  </h2>
                  <p className="max-w-xl font-body-lg text-body-lg opacity-70">
                    Top performing public profiles by lifetime net profit.
                  </p>
                </div>
              </div>
              {!leaders?.length ? (
                <p className="font-body-md text-body-md opacity-60">
                  No public profiles yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {leaders.map((p, i) => {
                    const pn = Number(p.net_profit);
                    return (
                      <Link
                        key={p.id}
                        href={`/profile/${p.id}`}
                        className="group relative border border-white/20 p-6 transition-all hover:bg-white/5"
                      >
                        <span className="absolute -left-4 -top-4 flex h-10 w-10 items-center justify-center bg-on-primary font-bold text-primary">
                          {i + 1}
                        </span>
                        <p className="mb-2 font-body-md text-body-md font-bold">
                          {p.display_name || "Anonymous"}
                        </p>
                        <p className="font-mono-ui text-headline-md">
                          {formatDollar(pn)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
