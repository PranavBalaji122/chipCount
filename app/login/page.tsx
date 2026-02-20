import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Log in | ChipCount",
  description: "Log in to ChipCount"
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <LoginForm next={params.next} />
    </div>
  )
}
