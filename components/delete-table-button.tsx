"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { closeGame } from "@/lib/actions"
import { AlertTriangle } from "lucide-react"

export function DeleteTableButton({ gameId }: { gameId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        Delete Table
      </Button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirming(false)
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border bg-background shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Delete Table</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently remove this table and you will no longer be able to play on it.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await closeGame(gameId)
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
