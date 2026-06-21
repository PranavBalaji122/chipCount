# ChipCount — Full Feature List (Web + iOS)

ChipCount is a poker-game tracker and payout settler that ships as **two clients sharing one Supabase backend**:

- **Web app** — Next.js 16 / React 19, on the **`main`** branch.
- **iOS app** — native SwiftUI (iOS 17+), on the **`ChipCountMobile`** branch.

Both compute identical payouts (slippage-aware, minimal-transaction settlement). The iOS client's per-screen detail lives in [FEATURES.md](FEATURES.md); this document is the combined, cross-platform catalog.

> Paths under "Web app" refer to files on the `main` branch (not the current working tree).

---

# Part A — Web App (`main` branch)

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Supabase (SSR auth + Postgres + RLS), Tailwind CSS 4, shadcn/ui + Radix, React Hook Form + Zod, `nuqs` (URL state), Recharts, PapaParse, zipson.

## 1. Quick Game — no account (`/play`)
- Fully **client-side calculator** (`GameForm` + `PayoutStats`) — no login required.
- Game state is **serialized + compressed into the URL** (zipson), so the whole game is **shareable and editable by anyone with the link** and stays private (no server needed).
- Instant per-player net, **slippage handling**, and **who-pays-whom** payouts.
- Visual breakdown via **donut + bar charts** (Recharts).

## 2. Import a Game (`/import`)
- **PokerNow URL import** — paste a `pokernow.club/games/...` link; the server route `app/api/fetchPokerNowLedger` fetches the ledger CSV.
- **CSV ledger paste** — paste a PokerNow ledger (`player_nickname`, `session_start_at`, `buy_in`, `buy_out`, `stack`); parsed with PapaParse and converted via `convertPokerNow`.
- Tabbed UI with Zod validation; imported data flows into the calculator.

## 3. Authentication & Onboarding
- **Email auth** via Supabase SSR; combined login/signup at `/login` (signup mode via `?signup=1`).
- OAuth **callback** route (`app/api/auth/callback`) and **signout** route (`app/api/auth/signout`).
- Session refresh handled in **middleware** (`middleware.ts` / `lib/supabase/middleware.ts`).

## 4. Dashboard (`/dashboard`)
- **Create a table** or **join by game ID** (`DashboardActions`).
- **Active tables** list with host/player **role** + status badges; **host can end a table** (`HostEndTableButton`).
- **Leaderboard** — top 3 by net profit across **public** profiles, linking to public profiles.

## 5. Hosted Game Room (`/game/[gameId]`)
- Live player roster, **guests**, cash-in / cash-out tracking.
- **Host controls:** approve/deny join requests, **kick player**, **transfer host**, set game status (**close / reopen / end**).
- Players can edit **requested amounts** and **request to rejoin** after removal.
- Live settlement / payout breakdown and generated **debts**.

## 6. Session Metrics (`/game/[gameId]/metrics`)
- **Session history** with per-session breakdowns and charts.
- Host can **delete a session** snapshot (reverses its profit effects).

## 7. Invites & Spectating (`/invite/[code]`, `/invite/[code]/join`)
- Invite-link landing page; **join request form** for entering a table.
- **Spectator view** (`spectator-game-view`) — read-only live view of a game via a spectator RPC.

## 8. Profile (`/profile`)
- **Net profit** block; editable profile (display name, phone, email, Venmo handle, **public/leaderboard toggle**).
- **Debts** section — pending money owed to/by you, with **settle**.

## 9. Public Profile (`/profile/[userId]`)
- Visible only when `profile_public`; shows **net profit**, **Venmo deep link**, phone/email, and a **net-profit-over-time graph** (`NetProfitGraph`).

## Server actions (`lib/actions.ts`)
`closeGame`, `settleDebt`, `setGameStatus`, `kickPlayer`, `requestRejoin`, `updateRequestedAmounts`, `transferHost`, `deleteSessionAt`.

---

# Part B — iOS App (`ChipCountMobile` branch)

**Stack:** SwiftUI (iOS 17+), Supabase Swift (auth/Postgres/realtime/RPCs), Swift Charts, shared `ChipCountCore` package. Recently restyled to the **"Parchment Command Terminal"** design system. Full detail in [FEATURES.md](FEATURES.md); summary below.

- **Auth & onboarding:** Sign in with **Google** (OAuth), **Apple** (native), and **email/password** (sign-up, password reset); session bootstrap, splash, profile-setup gate.
- **Profile:** required setup, auto-provisioning, net profit, leaderboard toggle, duplicate-name prevention.
- **Tables ("Command Central" dashboard):** list, create, join-by-code, rename, end (host); role/status badges; live stats.
- **Game Room:** **realtime updates**, pending approvals, per-player cash-in/out editing, guests, live payout, host controls (close/reopen/end, transfer host).
- **Debts:** owed-to-you / you-owe, mark settled.
- **Metrics:** per-session history with host-vs-player visibility, Swift Charts (cash-flow + net), delete session.
- **Settlement engine (`ChipCountCore`):** transaction-minimizing payout, slippage handling, debt calculation, Venmo/name resolution — unit-tested for parity.

---

# Part C — Shared Backend (Supabase)

One Postgres backend serves both clients (migrations `00001`–`00017`).

- **Tables:** `profiles`, `games`, `game_players`, `game_guests`, `debts`, `session_snapshots` / guest snapshots.
- **Row-Level Security** policies throughout (insert/update/rejoin/spectator).
- **RPCs:** end-game / `close_session` (+ final status), `insert_game_debts`, `delete_session_at`, reopen, `transfer_host`, **spectator** RPC.
- **Realtime** Postgres-change subscriptions (used by the iOS game room).
- Schema evolution: cash-request fields, closed status, unique usernames, session snapshots, guests, debts.

# Part D — Shared Settlement Logic

Identical algorithm on both platforms:

1. **Slippage distribution** — any pot surplus/shortage is split equally across players.
2. **Optimal payouts** — sort by net balance, then a **two-pointer** match of biggest losers ↔ winners to **minimize the number of transactions**.
3. Produces per-player net + creditor/debtor/amount **debt records**; consistent USD currency formatting.

- **Web:** client-side in `lib/utils.ts` (covered by `lib/utils.test.ts`).
- **iOS:** `Sources/ChipCountCore` Swift package (payout/debt/history, with parity tests).
</content>
