import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Greeting skeleton */}
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Action tiles skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[124px] w-full rounded-2xl" />
        <Skeleton className="h-[124px] w-full rounded-2xl" />
      </div>

      {/* Active tables skeleton */}
      <div className="space-y-3">
        <div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border rounded-xl border bg-card/50">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard skeleton */}
      <div className="space-y-3">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-3 w-48" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
