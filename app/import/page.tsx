"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Papa, { ParseResult } from "papaparse";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { GameSchema, pokerNowSchema } from "@/lib/schemas";
import { convertPokerNow, parseZipson } from "@/lib/utils";

const pokerNowUrlRegex = /^https:\/\/www\.pokernow\.club\/games\/([^/]+)$/;

const importSchema = z
  .object({
    type: z.enum(["url", "ledger"]),
    url: z.string().optional(),
    csvData: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "url") {
        return (
          data.url &&
          z.string().url().safeParse(data.url).success &&
          pokerNowUrlRegex.test(data.url)
        );
      }
      if (data.type === "ledger") {
        return (
          data.csvData &&
          data.csvData.length >= 10 &&
          data.csvData.includes("player_nickname") &&
          data.csvData.includes("session_start_at") &&
          data.csvData.includes("buy_in") &&
          data.csvData.includes("buy_out") &&
          data.csvData.includes("stack")
        );
      }
      return false;
    },
    {
      message: "Invalid input for selected type",
    },
  );
type ImportSchema = z.infer<typeof importSchema>;

const processParsedData = (result: ParseResult<unknown>) => {
  if (result.errors.length) {
    const errorMessages = result.errors.map((e) => e.message).join(", ");
    throw new Error(`CSV Parsing Error: ${errorMessages}`);
  }

  const validation = pokerNowSchema.safeParse(result.data);
  if (!validation.success)
    throw new Error(JSON.stringify(validation.error, null, 2));

  return convertPokerNow(validation.data);
};

function ImportPageContent() {
  const router = useRouter();
  const [urlParam, setUrlParam] = useQueryState("url", { defaultValue: "" });

  const form = useForm<ImportSchema>({
    resolver: zodResolver(importSchema),
    defaultValues: { type: "url", url: urlParam, csvData: "" },
  });

  const activeTab = form.watch("type");

  const navigateToGame = (convertedGame: GameSchema) =>
    router.push(
      `/?game=${encodeURIComponent(parseZipson.serialize(convertedGame))}`,
    );

  const handleError = (error: unknown, field: keyof ImportSchema) => {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    if (field === "url" || field === "csvData")
      form.setError(field, { type: "manual", message });
  };

  const fetchFromUrl = async (url: string) => {
    const gameId = url.match(pokerNowUrlRegex)![1];
    const ledgerUrl = `https://www.pokernow.club/games/${gameId}/ledger_${gameId}.csv`;

    const response = await fetch(
      `/api/fetchPokerNowLedger?url=${encodeURIComponent(ledgerUrl)}`,
    );
    const data = await response.json();

    if (!response.ok || data.error)
      throw new Error(data.error || "Failed to fetch data from server.");

    return data.csvData;
  };

  const parseCsvData = (csvData: string, url: string | undefined) => {
    return new Promise<GameSchema>((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const convertedGame = processParsedData(result);
            if (url != undefined) convertedGame.description = url;
            resolve(convertedGame);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) =>
          reject(new Error(`Failed to parse CSV: ${error.message}`)),
      });
    });
  };

  const onSubmit = async (values: ImportSchema) => {
    try {
      let csvData: string;

      if (values.type === "url") {
        form.clearErrors("url");
        setUrlParam(values.url!);
        csvData = await fetchFromUrl(values.url!);
      } else {
        form.clearErrors("csvData");
        csvData = values.csvData!;
      }

      const convertedGame = await parseCsvData(csvData, values.url);
      navigateToGame(convertedGame);
    } catch (error) {
      const fieldName = values.type === "url" ? "url" : "csvData";
      handleError(error, fieldName);
    }
  };

  const renderFormField = () => {
    if (activeTab === "url") {
      return (
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="block font-label-caps text-label-caps uppercase text-muted-ink">
                Game Ledger URL
              </FormLabel>
              <FormControl>
                <Input
                  className="h-auto w-full rounded-none border border-primary bg-parchment-canvas p-4 font-body-md text-body-md focus-visible:border-primary focus-visible:ring-0"
                  placeholder="https://www.pokernow.club/games/pgl..."
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setUrlParam(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription className="font-body-md text-muted-ink">
                Paste the URL of your PokerNow game lobby.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    return (
      <FormField
        control={form.control}
        name="csvData"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormLabel className="block font-label-caps text-label-caps uppercase text-muted-ink">
              Paste Ledger CSV
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="player_nickname,session_start_at,buy_in,buy_out,stack…"
                {...field}
                className="h-40 w-full rounded-none border border-primary bg-parchment-canvas p-4 font-mono-ui text-mono-ui focus-visible:border-primary focus-visible:ring-0"
              />
            </FormControl>
            <FormDescription className="font-body-md text-muted-ink">
              Log → Ledger → Download Ledger → copy/paste the data
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="min-h-screen bg-parchment-canvas text-on-surface">
      {/* TopNavBar */}
      <header className="fixed top-0 z-50 w-full border-b border-border-muted bg-parchment-canvas">
        <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-6 md:px-page-margin">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary"
          >
            ChipCount
          </Link>
          <nav className="hidden space-x-8 md:flex">
            <Link
              href="/play"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Play
            </Link>
            <Link
              href="/import"
              className="border-b-2 border-primary pb-1 font-body-md text-body-md font-bold text-primary"
            >
              Import
            </Link>
            <Link
              href="/dashboard"
              className="font-body-md text-body-md text-muted-ink transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-primary px-6 py-2 font-body-md text-body-md text-on-primary transition-transform hover:scale-95"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-container-max px-6 pb-24 pt-32 md:px-page-margin"
      >
        {/* Header */}
        <section className="mb-16">
          <h1 className="mb-4 font-display-lg text-display-lg">
            Import Records
          </h1>
          <p className="max-w-2xl font-body-lg text-body-lg text-muted-ink">
            Connect your PokerNow session or paste a local CSV to synchronize
            player stacks and game history with the Terminal.
          </p>
        </section>

        {/* Import card */}
        <section className="mx-auto max-w-4xl">
          <Form {...form}>
            <div className="sand-card mb-12 p-1">
              {/* Tabs */}
              <div className="flex">
                <button
                  type="button"
                  onClick={() => form.setValue("type", "url")}
                  className={`flex-1 py-4 text-center font-label-caps text-label-caps uppercase tracking-widest transition-all ${
                    activeTab === "url"
                      ? "bg-primary text-on-primary"
                      : "text-muted-ink hover:bg-surface-container-high"
                  }`}
                >
                  PokerNow URL
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("type", "ledger")}
                  className={`flex-1 py-4 text-center font-label-caps text-label-caps uppercase tracking-widest transition-all ${
                    activeTab === "ledger"
                      ? "bg-primary text-on-primary"
                      : "text-muted-ink hover:bg-surface-container-high"
                  }`}
                >
                  CSV Ledger
                </button>
              </div>

              {/* Tab content */}
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8 p-8 md:p-12"
              >
                {renderFormField()}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="h-auto rounded-none px-10 py-4 font-label-caps text-label-caps uppercase tracking-widest hover:scale-95"
                  >
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {activeTab === "url" ? "Fetch Ledger" : "Parse Ledger"}
                  </Button>
                </div>
              </form>
            </div>
          </Form>

          {/* Import Guide */}
          <div className="sand-card space-y-8 p-8 md:p-12">
            <header className="flex items-center gap-4">
              <Icon name="info" className="text-primary" />
              <h3 className="font-headline-md text-[24px]">Import Guide</h3>
            </header>
            <div className="grid grid-cols-1 gap-grid-gutter md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-label-caps text-label-caps uppercase text-primary">
                  Required Fields
                </h4>
                <ul className="space-y-3">
                  {[
                    "player_nickname",
                    "session_start_at",
                    "buy_in",
                    "buy_out",
                    "stack",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <code className="bg-primary px-2 py-0.5 font-mono-ui text-xs text-on-primary">
                        {f}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-label-caps text-label-caps uppercase text-primary">
                  Data Formatting
                </h4>
                <p className="font-body-md text-body-md text-muted-ink">
                  Ensure your CSV uses a comma delimiter and UTF-8 encoding.
                  Ledger imports automatically merge player stacks based on
                  nicknames. Or paste the game lobby URL and we fetch the ledger
                  for you.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ImportPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Suspense
        fallback={
          <div className="flex w-full flex-col items-center justify-center">
            <Skeleton className="h-96 w-full max-w-prose" />
          </div>
        }
      >
        <ImportPageContent />
      </Suspense>
    </main>
  );
}
