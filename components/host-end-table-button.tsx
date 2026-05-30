"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { closeGame } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function HostEndTableButton({
  gameId,
  tableName,
}: {
  gameId: string;
  tableName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await closeGame(gameId);
      setOpen(false);
    } catch {
      // closeGame currently swallows most errors; keep dialog open on failure
    } finally {
      setPending(false);
    }
  }

  const name = tableName.trim();
  const nameSuffix = name ? ` (${name})` : "";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" type="button">
          End Game
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End this table?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to end this table?
            {nameSuffix} This ends the game for everyone and removes it from the
            dashboard. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Ending…" : "Yes, end table"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
