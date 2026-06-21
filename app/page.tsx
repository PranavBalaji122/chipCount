import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "ChipCount | Professional Poker Ledger",
  description: "Track poker games, settle up, and climb the leaderboard",
};

const FEATURES = [
  {
    icon: "bolt",
    title: "Quick Game",
    body: "Client-side calculation for instant play. No login required, no data leaves your browser. Pure efficiency.",
    cta: "Launch tool",
    href: "/play",
  },
  {
    icon: "upload_file",
    title: "Import Logs",
    body: "Seamlessly parse PokerNow hand histories or custom CSV exports. Aggregate your lifetime stats in one command center.",
    cta: "Upload file",
    href: "/import",
  },
  {
    icon: "hub",
    title: "Hosted Tables",
    body: "Real-time multiplayer ledger for live home games. Sync across devices with join-by-code.",
    cta: "Create room",
    href: "/login",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="bg-parchment-canvas text-on-surface">
      {/* TopNavBar */}
      <nav className="fixed top-0 z-50 w-full border-b border-border-muted bg-parchment-canvas">
        <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
          <span className="font-headline-md text-headline-md text-primary">
            ChipCount
          </span>
          <div className="hidden items-center space-x-8 md:flex">
            <Link
              href="/play"
              className="border-b-2 border-primary pb-1 font-body-md text-body-md font-bold text-primary"
            >
              Play
            </Link>
            <Link
              href="/import"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Import
            </Link>
            <Link
              href="/dashboard"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
          </div>
          <Link
            href="/login"
            className="font-body-md text-body-md text-primary transition-opacity hover:opacity-70"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main id="main-content" tabIndex={-1} className="pt-20">
        {/* Hero */}
        <section className="mx-auto flex max-w-container-max flex-col items-center px-6 py-24 text-center md:px-page-margin md:py-section-gap">
          <div className="max-w-3xl space-y-6">
            <h1 className="font-display-lg text-display-lg leading-tight text-primary">
              Professional ledger for the serious player.
            </h1>
            <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-muted-ink">
              Precise accounting for private games and high-stakes sessions.
              Tactile minimalism meets powerful analytical tools.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Link
                href="/play"
                className="rounded-full bg-primary px-10 py-4 font-body-md text-body-md text-on-primary transition-transform hover:scale-95"
              >
                Start Quick Game
              </Link>
              <Link
                href="/import"
                className="flex items-center gap-2 rounded-full border border-primary px-10 py-4 font-body-md text-body-md text-primary transition-colors hover:bg-sand-surface"
              >
                <Icon name="play_circle" className="text-[20px]" />
                Import a game
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="bg-sand-surface py-24 md:py-section-gap">
          <div className="mx-auto max-w-container-max px-6 md:px-page-margin">
            <div className="grid grid-cols-1 gap-grid-gutter md:grid-cols-3">
              {FEATURES.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group flex flex-col justify-between border border-border-muted bg-parchment-canvas p-10 transition-colors hover:border-primary"
                >
                  <div className="space-y-4">
                    <Icon name={f.icon} className="text-[32px] text-primary" />
                    <h3 className="font-headline-md text-headline-md">
                      {f.title}
                    </h3>
                    <p className="font-body-md text-body-md text-muted-ink">
                      {f.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-8 font-label-caps text-label-caps font-bold uppercase text-primary transition-all group-hover:gap-3">
                    {f.cta} <Icon name="arrow_forward" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust band */}
        <section className="mx-auto max-w-container-max px-6 py-24 md:px-page-margin md:py-section-gap">
          <div className="space-y-12 text-center">
            <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-muted-ink">
              Trusted for private games &amp; high-stakes sessions
            </p>
            <div className="grid grid-cols-2 items-center gap-12 opacity-40 md:grid-cols-4">
              {[
                "Aces High",
                "The Bluff Room",
                "Riverside Club",
                "Pocket Kings",
              ].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-center font-headline-md text-[20px] text-on-surface"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detail / Demo */}
        <section className="mx-auto max-w-container-max px-6 pb-24 md:px-page-margin md:pb-section-gap">
          <div className="grid grid-cols-1 items-center gap-grid-gutter lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-block bg-primary px-3 py-1 font-label-caps text-label-caps uppercase text-on-primary">
                Terminal Interface
              </div>
              <h2 className="font-headline-lg text-headline-lg leading-tight">
                Precision data for every stack.
              </h2>
              <p className="font-body-lg text-body-lg text-muted-ink">
                Our terminal interface removes the clutter of typical gambling
                apps. We focus on what matters: accurate buy-ins, transparent
                slippage calculation, and instant settlement reports.
              </p>
              <ul className="space-y-4">
                {[
                  "Automated settlement paths that minimize transactions.",
                  "Detailed session graphs with monochrome precision.",
                  "Shareable, editable game links — no account required.",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Icon name="check_circle" className="text-primary" />
                    <span className="font-body-md text-body-md">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative border border-border-muted bg-sand-surface p-8 shadow-sm">
              <div className="flex aspect-video items-center justify-center overflow-hidden border border-border-muted bg-white">
                <span className="font-display-lg text-[120px] leading-none text-border-muted">
                  $
                </span>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden w-64 bg-terminal-black p-6 text-white md:block">
                <p className="mb-2 font-label-caps text-[10px] opacity-60">
                  LIVE SESSION STATS
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono-ui text-2xl font-bold">$4,820.00</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      TOTAL POT VOLUME
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400">+12%</p>
                    <p className="text-[10px] opacity-60">VS LAST HOUR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-muted bg-parchment-canvas">
        <div className="mx-auto flex max-w-container-max flex-col items-center justify-between px-6 py-16 md:flex-row md:px-page-margin md:py-24">
          <div className="mb-8 space-y-4 md:mb-0">
            <div className="font-headline-md text-headline-md text-primary">
              ChipCount
            </div>
            <p className="max-w-xs font-body-md text-body-md text-muted-ink">
              The authoritative standard in poker session management and
              ledgering.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-6 md:items-end">
            <div className="flex space-x-8">
              <Link
                href="/play"
                className="font-body-md text-body-md text-muted-ink underline decoration-1 underline-offset-4 hover:text-primary"
              >
                Play
              </Link>
              <Link
                href="/import"
                className="font-body-md text-body-md text-muted-ink underline decoration-1 underline-offset-4 hover:text-primary"
              >
                Import
              </Link>
              <Link
                href="/login"
                className="font-body-md text-body-md text-muted-ink underline decoration-1 underline-offset-4 hover:text-primary"
              >
                Sign In
              </Link>
            </div>
            <p className="font-body-md text-body-md text-muted-ink opacity-60">
              © {new Date().getFullYear()} ChipCount Terminal. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
