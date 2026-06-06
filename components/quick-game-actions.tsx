"use client"

import Link from "next/link"
import { Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function QuickGameActions() {
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied"),
      () => toast.error("Failed to copy link")
    )
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button onClick={copyLink} variant="outline" size="sm">
        <LinkIcon className="mr-1.5 h-4 w-4" />
        <span className="hidden sm:inline">Copy link</span>
        <span className="sm:hidden">Copy</span>
      </Button>
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href="/login?signup=1">Create account</Link>
      </Button>
    </div>
  )
}
