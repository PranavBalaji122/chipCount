"use client"

import { useOptimistic, useTransition } from "react"
import { CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { toast } from "sonner"
import { settleDebt } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDollar } from "@/lib/utils"
import type { DebtWithRelations } from "@/lib/db-types"

type Props = {
  userId: string
  debts: DebtWithRelations[]
}

export function DebtsSection({ userId, debts: initialDebts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimisticDebts, removeOptimistic] = useOptimistic(
    initialDebts,
    (current: DebtWithRelations[], idToRemove: string) =>
      current.filter((d) => d.id !== idToRemove)
  )

  const incoming = optimisticDebts.filter((d) => d.creditor_id === userId)
  const outgoing = optimisticDebts.filter((d) => d.debtor_id === userId)

  function handleSettle(debtId: string) {
    startTransition(async () => {
      removeOptimistic(debtId)
      try {
        await settleDebt(debtId)
      } catch {
        toast.error("Failed to settle debt. Please try again.")
      }
    })
  }

  function gameLabel(debt: DebtWithRelations) {
    return debt.game?.description || debt.game?.short_code || "Unknown Game"
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Incoming debts — money owed to the user */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          <h3 className="font-medium text-green-700 dark:text-green-300">Money owed to you</h3>
        </div>
        
        {incoming.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-6 text-center">
            <div className="mx-auto w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-green-700 dark:text-green-300 font-medium">All clear!</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">You are not owed any money.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((debt) => (
              <div
                key={debt.id}
                className="group relative overflow-hidden rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 via-white to-green-50/50 dark:from-green-950/30 dark:via-gray-900 dark:to-green-950/30 p-4 shadow-md transition-all hover:shadow-lg hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-green-700 dark:text-green-300">
                        {formatDollar(debt.amount)}
                      </span>
                      <div className="h-4 w-px bg-green-200 dark:bg-green-700"></div>
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        from <span className="font-semibold text-green-800 dark:text-green-200">{debt.debtor?.display_name ?? "Someone"}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/70 text-xs">
                        {gameLabel(debt)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(debt.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    className="ml-4 bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg transition-all"
                    onClick={() => handleSettle(debt.id)}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Settle
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing debts — money the user owes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          <h3 className="font-medium text-red-700 dark:text-red-300">Money you owe</h3>
        </div>
        
        {outgoing.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 p-6 text-center">
            <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">You're all set!</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">You do not owe any money.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map((debt) => (
              <div
                key={debt.id}
                className="relative overflow-hidden rounded-xl border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 via-white to-red-50/50 dark:from-red-950/30 dark:via-gray-900 dark:to-red-950/30 p-4 shadow-md"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold text-red-700 dark:text-red-300">
                    {formatDollar(debt.amount)}
                  </span>
                  <div className="h-4 w-px bg-red-200 dark:bg-red-700"></div>
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    to <span className="font-semibold text-red-800 dark:text-red-200">{debt.creditor?.display_name ?? "Someone"}</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/70 text-xs">
                    {gameLabel(debt)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(debt.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
