"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const LABEL_CLASS =
  "font-label-caps text-label-caps uppercase tracking-widest text-terminal-black";
const INPUT_CLASS =
  "h-14 rounded-none border border-terminal-black bg-white px-4 font-body-md text-body-md text-on-surface placeholder:text-muted-ink focus-visible:border-terminal-black focus-visible:ring-0";

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(1, "Name required").max(50),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = next ?? searchParams.get("next") ?? "/dashboard";
  const [isSignUp, setIsSignUp] = useState(
    () => searchParams.get("signup") === "1",
  );
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setGoogleLoading(false);
    }
    // On success the browser navigates away; no need to reset loading
  }, [nextPath]);

  async function onSignIn(values: SignInValues) {
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function onSignUp(values: SignUpValues) {
    setMessage(null);
    const supabase = createClient();

    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("display_name", values.displayName)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      setMessage({
        type: "error",
        text: "Error checking display name. Please try again.",
      });
      return;
    }

    if (existingUser) {
      signUpForm.setError("displayName", {
        type: "manual",
        message: "This display name is already taken.",
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.displayName },
      },
    });
    if (error) {
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        signUpForm.setError("displayName", {
          type: "manual",
          message: "This display name is already taken.",
        });
      } else {
        setMessage({ type: "error", text: error.message });
      }
      return;
    }
    setMessage({
      type: "success",
      text: "Check your email to confirm your account, then sign in.",
    });
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  const submitting =
    signInForm.formState.isSubmitting || signUpForm.formState.isSubmitting;

  return (
    <div className="border border-border-muted bg-sand-surface p-8 sm:p-10">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="mb-2 font-headline-md text-headline-md text-terminal-black">
          {isSignUp ? "Create account." : "Welcome back."}
        </h1>
        <p className="font-body-md text-body-md text-muted-ink">
          {isSignUp
            ? "Professional ledger for the serious player."
            : "Access your poker terminal."}
        </p>
      </div>

      {message && (
        <p
          className={`mb-6 font-body-md text-body-md ${
            message.type === "error" ? "text-mock-error" : "text-muted-ink"
          }`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {isSignUp ? (
        <Form {...signUpForm}>
          <form
            key="sign-up"
            onSubmit={signUpForm.handleSubmit(onSignUp)}
            className="space-y-6"
            autoComplete="off"
          >
            <FormField
              control={signUpForm.control}
              name="displayName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className={LABEL_CLASS}>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_CLASS}
                      placeholder="e.g. Rounder_88"
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
                <FormItem className="space-y-2">
                  <FormLabel className={LABEL_CLASS}>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_CLASS}
                      type="email"
                      placeholder="player@chipcount.io"
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
                <FormItem className="space-y-2">
                  <FormLabel className={LABEL_CLASS}>Security Key</FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_CLASS}
                      type="password"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SubmitButton label="Create Account" submitting={submitting} />
          </form>
        </Form>
      ) : (
        <Form {...signInForm}>
          <form
            key="sign-in"
            onSubmit={signInForm.handleSubmit(onSignIn)}
            className="space-y-6"
          >
            <FormField
              control={signInForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className={LABEL_CLASS}>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_CLASS}
                      type="email"
                      placeholder="host@chipcount.com"
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
                <FormItem className="space-y-2">
                  <FormLabel className={LABEL_CLASS}>Password</FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_CLASS}
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
            <SubmitButton label="Log In" submitting={submitting} />
          </form>
        </Form>
      )}

      {/* Divider */}
      <div className="relative flex items-center py-6">
        <div className="flex-grow border-t border-border-muted" />
        <span className="mx-4 font-label-caps text-label-caps uppercase text-muted-ink">
          or continue with
        </span>
        <div className="flex-grow border-t border-border-muted" />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-terminal-black bg-transparent py-4 font-label-caps text-label-caps uppercase tracking-widest text-terminal-black transition-all hover:bg-terminal-black hover:text-white active:scale-[0.98] disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
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
        Google
      </button>

      {/* Mode toggle */}
      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp((v) => !v);
            setMessage(null);
            signInForm.reset();
            signUpForm.reset();
          }}
          className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
        >
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <span className="font-bold text-terminal-black underline underline-offset-4">
                Log in
              </span>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <span className="font-bold text-terminal-black underline underline-offset-4">
                Sign up
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({
  label,
  submitting,
}: {
  label: string;
  submitting: boolean;
}) {
  return (
    <div className="pt-2">
      <Button
        type="submit"
        disabled={submitting}
        className="h-14 w-full rounded-full font-label-caps text-label-caps uppercase tracking-widest"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}
