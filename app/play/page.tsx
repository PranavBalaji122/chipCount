"use client";

import Link from "next/link";
import { Suspense } from "react";

import { GameForm } from "@/components/game-form";
import { PayoutStats } from "@/components/payout-stats";
import { QuickGameActions } from "@/components/quick-game-actions";
import { Skeleton } from "@/components/ui/skeleton";

function PlayPageContent() {
  return (
    <div className="min-h-screen bg-parchment-canvas text-on-surface">
      {/* TopNavBar */}
      <header className="fixed top-0 z-50 w-full border-b border-border-muted bg-parchment-canvas">
        <nav className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary"
          >
            ChipCount
          </Link>
          <div className="hidden items-center space-x-12 md:flex">
            <Link
              href="/dashboard"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
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
          </div>
          <Link
            href="/login"
            className="rounded-full bg-primary px-8 py-2.5 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-transform hover:scale-95"
          >
            Sign In
          </Link>
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-screen max-w-container-max px-6 pb-24 pt-32 md:px-page-margin"
      >
        {/* Header Section */}
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="mb-4 font-display-lg text-display-lg text-primary">
              Calculator
            </h1>
            <p className="font-body-lg text-body-lg text-muted-ink">
              Input your table stacks to reconcile the session. Our engine
              handles currency slippage automatically, and everything auto-saves
              to the link.
            </p>
          </div>
          <QuickGameActions />
        </div>

        <div className="grid grid-cols-12 items-start gap-grid-gutter">
          {/* Left: input form */}
          <section className="col-span-12 lg:col-span-7">
            <GameForm />
          </section>

          {/* Right: results panel */}
          <aside className="col-span-12 lg:sticky lg:top-32 lg:col-span-5">
            <PayoutStats />
          </aside>
        </div>
      </main>
    </div>
  );
}

function PlayPageSkeleton() {
  return (
    <div className="min-h-screen bg-parchment-canvas">
      <div className="border-b border-border-muted px-6 py-6">
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="mx-auto max-w-container-max space-y-6 px-6 py-12 md:px-page-margin">
        <Skeleton className="h-16 w-full max-w-lg" />
        <div className="grid grid-cols-12 gap-grid-gutter">
          <Skeleton className="col-span-12 h-[28rem] lg:col-span-7" />
          <Skeleton className="col-span-12 h-[28rem] lg:col-span-5" />
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<PlayPageSkeleton />}>
      <PlayPageContent />
    </Suspense>
  );
}
