"use client"

import Link from "next/link"
import { Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function QuickGameActions() {
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link.")
    )
  }

  return (
    <div className="space-y-3 text-center">
      <Button onClick={copyLink} variant="outline">
        <LinkIcon className="mr-2 h-4 w-4" />
        Copy link
      </Button>
      <p className="text-muted-foreground text-sm">
        This game lives in the link — share it to collaborate. Nothing is saved
        to your account.
      </p>
      <p className="text-muted-foreground text-sm">
        Want a persistent hosted table?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
