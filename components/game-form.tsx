"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  useFieldArray,
  useForm,
  Control,
  UseFormReturn,
  UseFieldArrayAppend,
  UseFieldArrayRemove
} from "react-hook-form"
import { X, Plus, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { gameSchema, GameSchema, PlayerSchema } from "@/lib/schemas"
import { formattedDateTime } from "@/lib/utils"
import { useQueryState } from "nuqs"
import { parseZipson } from "@/lib/utils"
import { useEffect } from "react"

export function GameForm() {
  const [game, setGame] = useQueryState("game", {
    ...parseZipson,
    history: "replace",
    throttleMs: 800
  })

  const form = useForm<GameSchema>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      description: game?.description || `${formattedDateTime()} Game`,
      players: game?.players || [
        { name: "", cashIn: "", cashOut: "" },
        { name: "", cashIn: "", cashOut: "" }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players"
  })

  useEffect(() => {
    const subscription = form.watch((value) => {
      const parsedVal = gameSchema.safeParse(value)
      setGame(parsedVal.success ? parsedVal.data : value)
    })
    return () => subscription.unsubscribe()
  }, [form, setGame])

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Game details</CardTitle>
            <CardDescription className="mt-1">
              Changes save automatically to the URL
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            <Cloud className="h-3 w-3" />
            Auto-save
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Friday night game" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PlayerFields
              form={form}
              fields={fields}
              append={append}
              remove={remove}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

const PlayerField = ({
  control,
  name,
  placeholder,
  label,
  className
}: {
  control: Control<GameSchema>
  name: `players.${number}.name`
  placeholder: string
  label: string
  className?: string
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormControl>
          <Input placeholder={placeholder} aria-label={label} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)

const NumericPlayerField = ({
  control,
  name,
  label,
  className
}: {
  control: Control<GameSchema>
  name: `players.${number}.cashIn` | `players.${number}.cashOut`
  label: string
  className?: string
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="text-xs text-muted-foreground md:sr-only">
          {label}
        </FormLabel>
        <FormControl>
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            aria-label={label}
            className="tabular-nums"
            {...field}
            value={field.value === 0 ? "" : field.value}
            onChange={(e) => {
              const val = e.target.value
              field.onChange(val === "" ? "" : e.target.valueAsNumber || 0)
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)

const PlayerFields = ({
  form,
  fields,
  append,
  remove
}: {
  form: UseFormReturn<GameSchema>
  fields: ReturnType<
    typeof useFieldArray<GameSchema, "players", "id">
  >["fields"]
  append: UseFieldArrayAppend<GameSchema, "players">
  remove: UseFieldArrayRemove
}) => (
  <div className="space-y-3">
    <div>
      <FormLabel>Players</FormLabel>
      <FormDescription className="mt-1">
        Prefix names with @ or $ for Venmo or Cash App links in payouts
      </FormDescription>
    </div>

    {/* Column headers — desktop only */}
    <div className="hidden md:grid md:grid-cols-[1fr_5.5rem_5.5rem_2.25rem] md:gap-2 md:px-1">
      <span className="text-muted-foreground text-xs font-medium">Name</span>
      <span className="text-muted-foreground text-xs font-medium">Cash in</span>
      <span className="text-muted-foreground text-xs font-medium">Cash out</span>
      <span className="sr-only">Remove</span>
    </div>

    <div className="space-y-2">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border bg-muted/30 p-3 md:border-0 md:bg-transparent md:p-0 md:rounded-none"
        >
          <div className="mb-2 flex items-center justify-between md:hidden">
            <span className="text-muted-foreground text-xs font-medium">
              Player {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={`Remove player ${index + 1}`}
              onClick={() => remove(index)}
              disabled={fields.length <= 2}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr] md:grid-cols-[1fr_5.5rem_5.5rem_2.25rem] md:items-start md:gap-2">
            <PlayerField
              control={form.control}
              name={`players.${index}.name`}
              placeholder={`Player ${index + 1}`}
              label={`Player ${index + 1} name`}
              className="sm:col-span-3 md:col-span-1"
            />
            <NumericPlayerField
              control={form.control}
              name={`players.${index}.cashIn`}
              label="Cash in"
            />
            <NumericPlayerField
              control={form.control}
              name={`players.${index}.cashOut`}
              label="Cash out"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden md:flex h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Remove player ${index + 1}`}
              onClick={() => remove(index)}
              disabled={fields.length <= 2}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>

    <FormMessage>{form.formState.errors.players?.root?.message}</FormMessage>

    <Button
      type="button"
      variant="outline"
      onClick={() => append({} as PlayerSchema)}
      className="w-full"
    >
      <Plus className="mr-2 h-4 w-4" />
      Add player
    </Button>
  </div>
)
