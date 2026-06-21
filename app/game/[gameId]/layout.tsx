import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart2 } from "lucide-react";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: game } = await supabase
    .from("games")
    .select("id, short_code, host_id, status, description")
    .eq("id", gameId)
    .single();

  if (!game) notFound();

  const { data: myParticipation } = await supabase
    .from("game_players")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .single();

  const isHost = game.host_id === user.id;
  const isPlayer = !!myParticipation;
  if (!isHost && !isPlayer) notFound();

  const gameLabel = game.description || `Game ${game.short_code}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <span className="text-border">/</span>
            <Link
              href={`/game/${gameId}`}
              className="font-display text-lg tracking-tight text-foreground transition-opacity hover:opacity-70"
            >
              {gameLabel}
            </Link>
            {isHost && (
              <span className="bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Host
              </span>
            )}
          </div>
          <Link href={`/game/${gameId}/metrics`} prefetch={true}>
            <Button variant="outline" size="sm">
              <BarChart2 className="mr-1.5 h-4 w-4" />
              Metrics
            </Button>
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
