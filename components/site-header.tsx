"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-muted bg-parchment-canvas">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
        <div className="flex items-center gap-12">
          <Link
            href="/dashboard"
            className="font-headline-md text-headline-md text-primary"
          >
            ChipCount
          </Link>
          <nav className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "font-body-md text-body-md transition-colors hover:text-primary",
                    active
                      ? "border-b-2 border-primary pb-1 font-bold text-primary"
                      : "text-muted-ink",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Log out
            </button>
          </form>
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-muted bg-sand-surface text-primary"
          >
            <Icon name="account_circle" />
          </Link>
        </div>
      </div>
    </header>
  );
}
