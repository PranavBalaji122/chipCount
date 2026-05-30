import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./00016_delete_session_at.sql", import.meta.url),
  "utf8",
);

describe("delete_session_at migration", () => {
  it("uses a null-safe host check", () => {
    expect(migration).toContain("v_host_id is distinct from auth.uid()");
  });

  it("does not expose the security-definer function to anonymous callers", () => {
    expect(migration).toContain(
      "revoke all on function public.delete_session_at(uuid, timestamptz) from public;",
    );
    expect(migration).toContain(
      "grant execute on function public.delete_session_at(uuid, timestamptz) to authenticated;",
    );
  });

  it("rolls back profile totals and deletes registered and guest snapshots", () => {
    expect(migration).toContain(
      "set net_profit = net_profit - rec.session_net",
    );
    expect(migration).toContain("delete from public.session_snapshots");
    expect(migration).toContain("delete from public.guest_session_snapshots");
  });
});
