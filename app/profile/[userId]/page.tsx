import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDollar } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { NetProfitGraph } from "@/components/net-profit-graph";
import { IoLogoVenmo } from "react-icons/io5";

function initials(name: string | null) {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, phone, email, venmo_handle, net_profit, profile_public",
    )
    .eq("id", userId)
    .single();

  if (!profile || !profile.profile_public) notFound();

  const net = Number(profile.net_profit);
  const netLabel = net > 0 ? "profit" : net < 0 ? "loss" : "even";

  return (
    <div className="min-h-screen bg-parchment-canvas text-on-surface">
      {/* TopNavBar */}
      <header className="fixed top-0 z-50 w-full border-b border-border-muted bg-parchment-canvas">
        <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary"
          >
            ChipCount
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-primary px-6 py-2 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-6 pb-24 pt-32"
      >
        {/* Profile header */}
        <div className="mb-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-primary font-headline-md text-headline-md text-on-primary">
            {initials(profile.display_name)}
          </div>
          <div>
            <p className="font-label-caps text-label-caps uppercase text-muted-ink">
              Public Profile
            </p>
            <h1 className="font-display-lg text-[48px] uppercase tracking-wider text-primary">
              {profile.display_name || "Anonymous"}
            </h1>
          </div>
        </div>

        {/* Net profit hero */}
        <div className="border border-border-muted bg-sand-surface p-8 md:p-12">
          <p className="font-label-caps text-label-caps uppercase text-muted-ink">
            Net Profit · Lifetime
          </p>
          <p
            className={`mt-2 font-display-lg text-[64px] leading-none ${
              net >= 0 ? "text-primary" : "text-loss"
            }`}
          >
            {formatDollar(net)}
            <span className="sr-only"> {netLabel}</span>
          </p>

          {/* Contact links */}
          <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-border-muted pt-6">
            {profile.venmo_handle && (
              <a
                href={`https://venmo.com/u/${profile.venmo_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-body-md text-body-md text-primary underline decoration-1 underline-offset-4 hover:opacity-70"
              >
                <IoLogoVenmo className="h-5 w-5" />@{profile.venmo_handle}
              </a>
            )}
            {profile.phone && (
              <span className="inline-flex items-center gap-2 font-body-md text-body-md text-muted-ink">
                <Icon name="call" className="text-base" />
                {profile.phone}
              </span>
            )}
            {profile.email && (
              <span className="inline-flex items-center gap-2 font-body-md text-body-md text-muted-ink">
                <Icon name="mail" className="text-base" />
                {profile.email}
              </span>
            )}
          </div>
        </div>

        {/* Net profit over time */}
        <div className="mt-8 border border-border-muted bg-sand-surface p-8 md:p-12">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">
            Net Profit Over Time
          </h2>
          <NetProfitGraph userId={profile.id} />
        </div>
      </main>
    </div>
  );
}
