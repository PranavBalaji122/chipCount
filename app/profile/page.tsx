import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile-form"
import { NetProfitBlock } from "@/components/net-profit-block"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Profile not found. Try logging out and back in.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your contact info and net profit. Toggle public to appear on the leaderboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NetProfitBlock profile={profile} />
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  )
}
