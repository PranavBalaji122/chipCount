export type GuestAmounts = {
  cash_in: number | null;
  cash_out: number | null;
};

// Keep empty inputs editable in the UI while persisting them as zero.
export function parseCashInput(value: string): number | null {
  if (value === "") return null;
  if (value.toLowerCase() === "zero") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function toGuestAmountPatch(
  updates: Partial<GuestAmounts>,
): Partial<Record<keyof GuestAmounts, number>> {
  const patch: Partial<Record<keyof GuestAmounts, number>> = {};
  if (updates.cash_in !== undefined) patch.cash_in = updates.cash_in ?? 0;
  if (updates.cash_out !== undefined) patch.cash_out = updates.cash_out ?? 0;
  return patch;
}
