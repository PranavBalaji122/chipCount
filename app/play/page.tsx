"use client"

import { Suspense } from "react"

import { GameForm } from "@/components/game-form"
import { PayoutStats } from "@/components/payout-stats"
import { QuickGameActions } from "@/components/quick-game-actions"
import { Skeleton } from "@/components/ui/skeleton"

function PlayPageContent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <QuickGameActions />
      <div className="grid gap-6 lg:grid-cols-2">
        <GameForm />
        <PayoutStats />
      </div>
    </div>
  )
}

function PlayPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Skeleton className="mx-auto h-24 w-full max-w-md" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
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
