"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
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
import Link from "next/link"

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "At least 6 characters")
})

type SignInValues = z.infer<typeof signInSchema>

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(1, "Name required").max(50)
})

type SignUpValues = z.infer<typeof signUpSchema>

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = next ?? searchParams.get("next") ?? "/dashboard"
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" }
  })

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" }
  })

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true)
    setMessage(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    })
    if (error) {
      setMessage({ type: "error", text: error.message })
      setGoogleLoading(false)
    }
    // On success the browser navigates away; no need to reset loading
  }, [nextPath])

  async function onSignIn(values: SignInValues) {
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setMessage({ type: "error", text: error.message })
      return
    }
    router.push(nextPath)
    router.refresh()
  }

  async function onSignUp(values: SignUpValues) {
    setMessage(null)
    const supabase = createClient()

    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("display_name", values.displayName)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      setMessage({
        type: "error",
        text: "Error checking display name. Please try again."
      })
      return
    }

    if (existingUser) {
      signUpForm.setError("displayName", {
        type: "manual",
        message: "This display name is already taken."
      })
      return
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.displayName }
      }
    })
    if (error) {
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        signUpForm.setError("displayName", {
          type: "manual",
          message: "This display name is already taken."
        })
      } else {
        setMessage({ type: "error", text: error.message })
      }
      return
    }
    setMessage({
      type: "success",
      text: "Check your email to confirm your account, then sign in."
    })
    setTimeout(() => {
      router.push("/login")
    }, 2000)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isSignUp ? "Sign up" : "Log in"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Create an account to start and join games"
            : "Sign in to your ChipCount account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google OAuth button */}
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center gap-3"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {message && (
          <p
            className={
              message.type === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {message.text}
          </p>
        )}

        {isSignUp ? (
          <Form {...signUpForm}>
            {/* key forces a full remount when switching modes, preventing stale field state */}
            <form
              key="sign-up"
              onSubmit={signUpForm.handleSubmit(onSignUp)}
              className="space-y-4"
              autoComplete="off"
            >
              <FormField
                control={signUpForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      {/* autoComplete="new-password" tricks browsers into not autofilling */}
                      <Input
                        placeholder="Your name"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signUpForm.formState.isSubmitting}
              >
                {signUpForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign up
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signInForm}>
            <form
              key="sign-in"
              onSubmit={signInForm.handleSubmit(onSignIn)}
              className="space-y-4"
            >
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signInForm.formState.isSubmitting}
              >
                {signInForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Log in
              </Button>
            </form>
          </Form>
        )}

        <button
          type="button"
          onClick={() => {
            setIsSignUp((v) => !v)
            setMessage(null)
            signInForm.reset()
            signUpForm.reset()
          }}
          className="text-muted-foreground text-sm underline"
        >
          {isSignUp ? "Already have an account? Log in" : "No account? Sign up"}
        </button>

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/">Back to home</Link>
        </p>
      </CardContent>
    </Card>
  )
}