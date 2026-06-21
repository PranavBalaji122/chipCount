import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export default async function ProfileLayout({
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
