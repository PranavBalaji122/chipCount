"use client"

import { useOptimistic, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { settleDebt } from "@/lib/actions"
import { Button } from "@/components/ui/button"
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
    return debt.game?.description ?? debt.game?.short_code ?? "a game"
  }

  function dateLabel(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Incoming debts — money owed to the user */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Money owed to you</h3>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">You are not owed any money.</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((debt) => (
              <li key={debt.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">
                    {debt.debtor?.display_name ?? "Someone"}
                  </span>{" "}
                  owes you{" "}
                  <span className="font-medium">{formatDollar(debt.amount)}</span>{" "}
                  from{" "}
                  <span className="text-muted-foreground">{gameLabel(debt)}</span>
                  {" · "}
                  <span className="text-muted-foreground">{dateLabel(debt.created_at)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleSettle(debt.id)}
                  disabled={isPending}
                  title="Mark as settled"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outgoing debts — money the user owes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Money you owe</h3>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">You do not owe any money.</p>
        ) : (
          <ul className="space-y-2">
            {outgoing.map((debt) => (
              <li key={debt.id} className="text-sm">
                You owe{" "}
                <span className="font-medium">{formatDollar(debt.amount)}</span> to{" "}
                <span className="font-medium">
                  {debt.creditor?.display_name ?? "Someone"}
                </span>{" "}
                from{" "}
                <span className="text-muted-foreground">{gameLabel(debt)}</span>
                {" · "}
                <span className="text-muted-foreground">{dateLabel(debt.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
