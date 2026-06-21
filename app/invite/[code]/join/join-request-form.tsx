"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function JoinRequestForm({
  gameId,
  gameDescription,
}: {
  gameId: string;
  gameDescription?: string;
}) {
  const router = useRouter();
  const [buyIn, setBuyIn] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inVal = parseFloat(buyIn);
    if (Number.isNaN(inVal) || inVal < 0) {
      toast.error("Enter a valid buy-in amount (0 or more).");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to join.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("game_players").insert({
      game_id: gameId,
      user_id: user.id,
      status: "pending",
      requested_cash_in: inVal,
      requested_cash_out: 0,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("You're already in this game.");
        router.push(`/game/${gameId}`);
        return;
      }
      toast.error(error.message || "Failed to send join request.");
      setSubmitting(false);
      return;
    }

    toast.success("Join request sent. Waiting for host approval.");
    router.push(`/game/${gameId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Request to join</CardTitle>
          <CardDescription>
            {gameDescription
              ? `Set your buy-in for "${gameDescription}". The host will approve or deny your request.`
              : "Set your buy-in amount. The host will approve or deny your request."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy-in">Buy-in amount ($)</Label>
              <Input
                id="buy-in"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 100"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send join request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
