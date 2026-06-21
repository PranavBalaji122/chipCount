import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Log in | ChipCount",
  description: "Log in to ChipCount",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-parchment-canvas text-on-surface">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-muted bg-parchment-canvas">
        <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
          <Link
            href="/"
            className="font-headline-md text-headline-md tracking-tighter text-primary"
          >
            ChipCount
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/play"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Play
            </Link>
            <Link
              href="/import"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Import
            </Link>
            <Link
              href="/dashboard"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-grow items-center justify-center px-6 pt-20 md:px-page-margin"
      >
        <div className="grid w-full max-w-container-max grid-cols-12 items-center gap-grid-gutter">
          {/* Left Editorial Section */}
          <div className="hidden flex-col justify-center pr-12 lg:col-span-6 lg:flex">
            <div className="mb-8">
              <h2 className="mb-4 font-headline-lg text-headline-lg text-terminal-black">
                The Art of the Stack.
              </h2>
              <p className="max-w-md font-body-lg text-body-lg text-ink-gray">
                Precision tracking for high-stakes environments. Manage your
                table, analyze your play, and secure your chip counts with the
                industry-standard terminal.
              </p>
            </div>
            <div className="relative flex aspect-square w-full items-end overflow-hidden border border-border-muted bg-sand-surface p-8">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-[0.12] blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, var(--orb-violet), var(--orb-ember))",
                }}
              />
              <div className="relative space-y-2">
                <div className="inline-block bg-terminal-black px-4 py-2 font-label-caps text-label-caps uppercase tracking-widest text-on-primary">
                  EST. 2024
                </div>
                <p className="font-mono-ui text-mono-ui text-terminal-black">
                  v1.0.2 // HOST TERMINAL ACTIVE
                </p>
              </div>
            </div>
          </div>

          {/* Login Form Container */}
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <LoginForm next={params.next} />
            <div className="mt-8 flex items-center justify-center px-2 lg:justify-between">
              <p className="font-label-caps text-[10px] uppercase tracking-widest text-border-muted">
                Secure TLS 1.3 Encryption
              </p>
              <p className="hidden font-label-caps text-[10px] uppercase tracking-widest text-border-muted lg:block">
                ChipCount v1.0.2
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
