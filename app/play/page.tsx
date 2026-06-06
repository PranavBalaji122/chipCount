"use client"

import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"

import { GameForm } from "@/components/game-form"
import { PayoutStats } from "@/components/payout-stats"
import { QuickGameActions } from "@/components/quick-game-actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function PlayPageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="sm" className="shrink-0">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="min-w-0 hidden sm:block">
              <p className="font-semibold text-sm truncate">Quick Game</p>
              <p className="text-muted-foreground text-xs truncate">
                No account needed
              </p>
            </div>
          </div>
          <QuickGameActions />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Track &amp; settle up
          </h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm sm:text-base">
            Enter player buy-ins and cash-outs below. Everything auto-saves to
            the link — share it so anyone can view and edit.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <GameForm />
          <PayoutStats />
        </div>
      </div>
    </div>
  )
}

function PlayPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <Skeleton className="h-16 w-full max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
      </div>
    </div>
  )
}

export default function PlayPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Suspense fallback={<PlayPageSkeleton />}>
        <PlayPageContent />
      </Suspense>
    </main>
  )
}
