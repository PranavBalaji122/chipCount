"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { renameGame } from "@/lib/actions"
import { Pencil } from "lucide-react"

export function RenameTableButton({
  gameId,
  currentName,
}: {
  gameId: string
  currentName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function handleSave() {
    if (name.trim() === currentName) {
      setOpen(false)
      return
    }
    setSaving(true)
    try {
      await renameGame(gameId, name)
    } catch (err) {
      console.error("Failed to rename:", err)
      setName(currentName)
    }
    setSaving(false)
    setOpen(false)
  }

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <span className="font-medium">{currentName}</span>
        <button
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Rename table"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setName(currentName)
              setOpen(false)
            }
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border bg-background shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Rename Table</h3>
            </div>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") {
                  setName(currentName)
                  setOpen(false)
                }
              }}
              disabled={saving}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={50}
              placeholder="Table name"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setName(currentName)
                  setOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
