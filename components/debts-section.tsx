"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { settleDebt } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDollar } from "@/lib/utils";
import type { DebtWithRelations } from "@/lib/db-types";

type Props = {
  userId: string;
  debts: DebtWithRelations[];
};

export function DebtsSection({ userId, debts: initialDebts }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDebts, removeOptimistic] = useOptimistic(
    initialDebts,
    (current: DebtWithRelations[], idToRemove: string) =>
      current.filter((d) => d.id !== idToRemove),
  );

  const incoming = optimisticDebts.filter((d) => d.creditor_id === userId);
  const outgoing = optimisticDebts.filter((d) => d.debtor_id === userId);

  function handleSettle(debtId: string) {
    startTransition(async () => {
      removeOptimistic(debtId);
      try {
        await settleDebt(debtId);
      } catch {
        toast.error("Failed to settle debt. Please try again.");
      }
    });
  }

  function gameLabel(debt: DebtWithRelations) {
    return debt.game?.description || debt.game?.short_code || "Unknown Game";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      {/* Incoming debts — money owed to the user */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-profit" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Money owed to you
          </h3>
        </div>

        {incoming.length === 0 ? (
          <div className="border border-dashed border-border bg-background p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="font-medium text-foreground">All clear!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You are not owed any money.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between gap-3 border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-profit">
                      {formatDollar(debt.amount)}
                    </span>
                    <span className="text-border">/</span>
                    <span className="truncate text-sm text-muted-foreground">
                      from{" "}
                      <span className="font-medium text-foreground">
                        {debt.debtor?.display_name ?? "Someone"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="normal-case">
                      {gameLabel(debt)}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(debt.created_at)}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSettle(debt.id)}
                  disabled={isPending}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Settle
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing debts — money the user owes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-loss" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Money you owe
          </h3>
        </div>

        {outgoing.length === 0 ? (
          <div className="border border-dashed border-border bg-background p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="font-medium text-foreground">You&apos;re all set!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not owe any money.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map((debt) => (
              <div key={debt.id} className="border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-loss">
                    {formatDollar(debt.amount)}
                  </span>
                  <span className="text-border">/</span>
                  <span className="truncate text-sm text-muted-foreground">
                    to{" "}
                    <span className="font-medium text-foreground">
                      {debt.creditor?.display_name ?? "Someone"}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="normal-case">
                    {gameLabel(debt)}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(debt.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
