import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-parchment-canvas text-on-surface">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
