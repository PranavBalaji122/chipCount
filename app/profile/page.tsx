import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { NetProfitBlock } from "@/components/net-profit-block";
import { DebtsSection } from "@/components/debts-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DebtWithRelations } from "@/lib/db-types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: debts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("debts")
      .select(
        `
        id,
        game_id,
        creditor_id,
        debtor_id,
        amount,
        status,
        created_at,
        updated_at,
        creditor:profiles!creditor_id(display_name),
        debtor:profiles!debtor_id(display_name),
        game:games!game_id(description, short_code)
      `,
      )
      .or(`creditor_id.eq.${user.id},debtor_id.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Profile not found. Try logging out and back in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          Profile
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          Your contact info, lifetime net, and pending debts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Account</CardTitle>
            <CardDescription>
              Contact info and net profit. Toggle public to appear on the
              leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <NetProfitBlock profile={profile} />
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Debts</CardTitle>
            <CardDescription>Pending payments from your games.</CardDescription>
          </CardHeader>
          <CardContent>
            <DebtsSection
              userId={user.id}
              debts={(debts as unknown as DebtWithRelations[]) ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
