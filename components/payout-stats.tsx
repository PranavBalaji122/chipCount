"use client";

import { calcPayouts, parseZipson } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { gameSchema } from "@/lib/schemas";
import { PlayerSummary } from "./player-summary";
import { SlippageInfo } from "./slippage-info";
import { useMemo } from "react";
import { DonutCharts } from "./donut-chart";
import { NegativeChart } from "./negative-chart";
import { Icon } from "@/components/icon";

export function PayoutStats() {
  const [game] = useQueryState("game", parseZipson);

  const payout = useMemo(() => {
    const parseResult = gameSchema.safeParse(game);
    if (!parseResult.success) return;

    const payout = calcPayouts(parseResult.data);
    payout.players.sort((a, b) => a.name.localeCompare(b.name));

    return payout;
  }, [game]);

  return (
    <div className="sand-card space-y-12 p-8 sm:p-10">
      {/* Heading */}
      <div className="space-y-4">
        <h2 className="font-headline-md text-headline-md text-primary">
          Settlement
        </h2>
        <div className="h-1 w-12 bg-primary" />
      </div>

      {!payout ? (
        <div className="space-y-6">
          <div className="relative flex justify-center py-6">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-[12px] border-border-muted">
              <div className="flex flex-col items-center justify-center text-center">
                <span className="font-label-caps text-[10px] text-muted-ink">
                  DISTRIBUTION
                </span>
                <span className="font-headline-md text-xl text-primary">
                  0%
                </span>
              </div>
            </div>
          </div>
          <p className="font-body-md text-body-md italic text-muted-ink opacity-50">
            Add players and values to generate settlement…
          </p>
        </div>
      ) : (
        <>
          {Math.abs(payout.slippage) > 1e-9 && <SlippageInfo payout={payout} />}

          {/* Charts */}
          <div className="flex flex-col gap-8">
            <DonutCharts payout={payout} />
            <NegativeChart players={payout.players} />
          </div>

          {/* Who pays whom */}
          <div className="space-y-6">
            <h3 className="flex items-center font-label-caps text-label-caps uppercase tracking-widest text-primary">
              <Icon name="payments" className="mr-2 text-sm" filled />
              Who Pays Whom
            </h3>
            <div className="grid gap-4 border-t border-border-muted pt-6 sm:grid-cols-1">
              {payout.players.map((player) => (
                <PlayerSummary
                  key={player.name}
                  player={player}
                  slippage={payout.slippage / payout.players.length}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
