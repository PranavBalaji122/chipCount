"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, Control } from "react-hook-form";
import { Icon } from "@/components/icon";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { gameSchema, GameSchema, PlayerSchema } from "@/lib/schemas";
import { formattedDateTime, formatDollar } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { parseZipson } from "@/lib/utils";
import { useEffect } from "react";

const LABEL =
  "font-label-caps text-[10px] text-muted-ink mb-2 uppercase tracking-tighter";
const TERMINAL =
  "input-terminal font-body-md text-body-md w-full bg-transparent";

export function GameForm() {
  const [game, setGame] = useQueryState("game", {
    ...parseZipson,
    history: "replace",
    throttleMs: 800,
  });

  const form = useForm<GameSchema>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      description: game?.description || `${formattedDateTime()} Game`,
      players: game?.players || [
        { name: "", cashIn: "", cashOut: "" },
        { name: "", cashIn: "", cashOut: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      const parsedVal = gameSchema.safeParse(value);
      setGame(parsedVal.success ? parsedVal.data : value);
    });
    return () => subscription.unsubscribe();
  }, [form, setGame]);

  return (
    <Form {...form}>
      <form className="space-y-12">
        {/* Session name */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <span className={LABEL}>Session Name</span>
              <FormControl>
                <Input
                  className={TERMINAL}
                  placeholder="Friday night game"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active players */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary">
              Active Players
            </h2>
            <button
              type="button"
              onClick={() => append({} as PlayerSchema)}
              className="flex items-center font-label-caps text-label-caps text-primary transition-opacity hover:opacity-70"
            >
              <Icon name="add" className="mr-2" />
              Add Player
            </button>
          </div>

          <div className="space-y-8">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="player-row group flex items-end space-x-4 border-b border-transparent pb-2"
              >
                <div className="grid flex-grow grid-cols-3 gap-6">
                  <PlayerField
                    control={form.control}
                    name={`players.${index}.name`}
                    label="Player Name"
                    placeholder={`Player ${index + 1}`}
                  />
                  <NumericPlayerField
                    control={form.control}
                    name={`players.${index}.cashIn`}
                    label="Total Buy-in"
                  />
                  <NumericPlayerField
                    control={form.control}
                    name={`players.${index}.cashOut`}
                    label="Cash Out"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 2}
                  aria-label={`Remove player ${index + 1}`}
                  className="mb-2 text-mock-error opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                >
                  <Icon name="delete_outline" />
                </button>
              </div>
            ))}
          </div>

          <FormMessage>
            {form.formState.errors.players?.root?.message}
          </FormMessage>
        </div>

        <SessionAnalytics control={form.control} />
      </form>
    </Form>
  );
}

const PlayerField = ({
  control,
  name,
  placeholder,
  label,
}: {
  control: Control<GameSchema>;
  name: `players.${number}.name`;
  placeholder: string;
  label: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <span className={LABEL}>{label}</span>
        <FormControl>
          <Input
            className={TERMINAL}
            placeholder={placeholder}
            aria-label={label}
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const NumericPlayerField = ({
  control,
  name,
  label,
}: {
  control: Control<GameSchema>;
  name: `players.${number}.cashIn` | `players.${number}.cashOut`;
  label: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <span className={LABEL}>{label}</span>
        <FormControl>
          <div className="relative">
            <span className="absolute bottom-1.5 left-0 text-muted-ink">$</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              aria-label={label}
              className={`${TERMINAL} pl-4 tabular-nums`}
              {...field}
              value={field.value === 0 ? "" : field.value}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(val === "" ? "" : e.target.valueAsNumber || 0);
              }}
            />
          </div>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

function SessionAnalytics({ control }: { control: Control<GameSchema> }) {
  const players = useWatch({ control, name: "players" }) ?? [];
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const buyInTotal = players.reduce((s, p) => s + num(p?.cashIn), 0);
  const totalPot = players.reduce((s, p) => s + num(p?.cashOut), 0);
  const totalProfit = totalPot - buyInTotal;
  const tableError = buyInTotal - totalPot;

  const stats = [
    { label: "Total Pot", value: totalPot },
    { label: "Buy-in Total", value: buyInTotal },
    { label: "Total Profit", value: totalProfit },
  ];

  return (
    <div className="space-y-8 border border-border-muted bg-white p-8 sm:p-10">
      <h3 className="font-label-caps text-label-caps uppercase text-muted-ink">
        Session Analytics
      </h3>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="mb-1 font-label-caps text-[10px] uppercase text-muted-ink">
              {s.label}
            </div>
            <div className="font-headline-md text-headline-md text-primary">
              {formatDollar(s.value)}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1 font-label-caps text-[10px] uppercase text-muted-ink">
            Table Error
          </div>
          <div
            className={`font-headline-md text-headline-md ${
              Math.abs(tableError) > 1e-9 ? "text-mock-error" : "text-primary"
            }`}
          >
            {formatDollar(tableError)}
          </div>
        </div>
      </div>
    </div>
  );
}
