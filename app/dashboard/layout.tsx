import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, LayoutDashboard, LogOut } from "lucide-react"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold">
            ChipCount
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="mr-1 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <User className="mr-1 h-4 w-4" />
                Profile
              </Button>
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="mr-1 h-4 w-4" />
                Log out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
