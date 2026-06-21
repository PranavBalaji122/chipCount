import { cn } from "@/lib/utils";

/**
 * Material Symbols Outlined icon — matches the Stitch mockups' iconography.
 * Pass `filled` to set FILL 1 (e.g. for active/emphasis states).
 */
export function Icon({
  name,
  className,
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
