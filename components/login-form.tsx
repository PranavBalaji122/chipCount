"use client"

import { useState } from "react"
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

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" }
  })

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" }
  })

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