"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/db-types"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

const profileSchema = z.object({
  display_name: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(100).optional().nullable(),
  venmo_handle: z.string().max(30).optional().nullable(),
  profile_public: z.boolean()
})

type ProfileValues = z.infer<typeof profileSchema>

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name ?? "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
      venmo_handle: profile.venmo_handle ?? "",
      profile_public: profile.profile_public
    }
  })

  async function onSubmit(values: ProfileValues) {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return

    const newDisplayName = values.display_name || null

    if (newDisplayName && newDisplayName !== profile.display_name) {
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("display_name", newDisplayName)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        form.setError("display_name", {
          type: "manual",
          message: "Error checking display name. Please try again."
        })
        return
      }

      if (existingUser) {
        form.setError("display_name", {
          type: "manual",
          message: "This display name is already taken."
        })
        return
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: newDisplayName,
        phone: values.phone || null,
        email: values.email || null,
        venmo_handle: values.venmo_handle || null,
        profile_public: values.profile_public
      })
      .eq("id", user.id)

    if (error) {
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        form.setError("display_name", {
          type: "manual",
          message: "This display name is already taken."
        })
      } else {
        // Handle other update errors
        console.error("Error updating profile:", error)
      }
      return
    }

    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 234 567 8900" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="venmo_handle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venmo (without @)</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profile_public"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Profile public</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Show on leaderboard and allow others to view your profile
                </p>
              </div>
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </form>
    </Form>
  )
}
