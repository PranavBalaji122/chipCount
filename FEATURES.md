# ChipCount — Features

ChipCount is a native **SwiftUI iOS app** (iOS 17+) for running home poker games: tracking buy-ins/cash-outs, calculating who-owes-whom settlements, and keeping a history of every session. It is backed by **Supabase** (auth, Postgres, realtime, and RPCs) and shares its settlement math with the companion web app through a local Swift package, `ChipCountCore`.

> This branch (`ChipCountMobile`) is the mobile version. The app links out to a web companion via invite URLs (`WEB_BASE_URL`).

---

## 1. Authentication & Onboarding

- **Sign in with Google** — OAuth flow via `ASWebAuthenticationSession`, returning through the `chipcount://` callback scheme.
- **Sign in with Apple** — Native flow with secure nonce generation and SHA-256 hashing; pulls full name/email on first authorization.
- **Email / password sign in** — Standard Supabase email login.
- **Email / password sign up** — Creates an account with a display name; auto-signs in afterward.
- **Password reset** — Sends a reset email through Supabase.
- **Deep-link callback handling** — Resolves auth sessions from returned callback URLs.
- **Session persistence & bootstrap** — Restores the signed-in user on launch; shows a branded **splash screen** while bootstrapping.
- **Profile-setup gate** — New users must set a display name before reaching the main app.
- **Sign out.**

## 2. Profile

- **Required profile setup** — Display name (required), phone, and Venmo handle captured on first login.
- **Auto-provisioning** — A profile row is created automatically on first login (display name defaults from the email or provider name).
- **Editable profile** — Display name, email, phone, Venmo handle.
- **Net profit display** — Lifetime net profit, color-coded green/red.
- **Leaderboard visibility toggle** — `Show on leaderboard` (public/private).
- **Duplicate display-name prevention** — Rejects a name already taken by another user.

## 3. Tables (Games)

- **Active tables list** — All tables you host or have joined (active/closed).
- **Personalized welcome** — Greets you by first name.
- **Create table** — With an optional table name/description.
- **Join table** — By short code with a buy-in amount; the request is sent to the host for approval.
- **Rename table** — Host only (swipe action).
- **End / delete table** — Host only (swipe action with confirmation); finalizes results and removes it from everyone's list.
- **Role & status badges** — Host / Player / Pending / Removed, plus active/closed/ended status.
- **Pull-to-refresh** and an empty state when no tables exist.

## 4. Game Room (live session)

- **Live header** — Table name, short code (Game ID), and status badge.
- **Share invite** — Generates a web invite link via the iOS share sheet.
- **Real-time updates** — Subscribes to Supabase Postgres changes; also refreshes on app foreground, pull-to-refresh, and a manual refresh button.
- **Pending approvals** — Host approves or denies join requests (with the requested buy-in/out).
- **Player amounts**
  - Host can edit any approved player's cash-in / cash-out.
  - A player can edit their own *requested* amounts (host then confirms).
  - Removed players can **request to rejoin**.
- **Guests** — Host can add, edit, and remove non-account guests with their own cash in/out.
- **Live payout summary** — Real-time who-pays-whom breakdown, per-player net, and slippage.
- **Host session controls**
  - **Close session** — Saves results and debts; can be reopened.
  - **Reopen session.**
  - **End game** — Finalizes results/debts and removes the game (cannot be reopened).
  - **Transfer host** — Hand the table off to another approved player.

## 5. Settlement & Payout Engine (`ChipCountCore`)

Shared, tested Swift package so the iOS app and web app produce identical results.

- **Payout calculator** — Greedy two-pointer settlement that **minimizes the number of transactions**.
- **Slippage handling** — Distributes missing/extra chips evenly across players so totals reconcile.
- **Net computation** per player (cash-out − cash-in ± slippage share).
- **Payee resolution** — Prefers `@venmo` handle, falls back to display name, with **unique-name disambiguation** for duplicates.
- **Debt calculator** — Produces creditor/debtor/amount records (rounded to cents) for persistence.
- **Session-history builder** — Reconstructs past sessions from snapshots, with host-vs-player visibility rules.
- **Currency formatting** — USD helper (`chipCountCurrency`).

## 6. Debts

- **Money owed to you** (incoming) and **money you owe** (outgoing), grouped by game.
- **Mark settled** — Creditor can settle an incoming debt.
- Game context (name / short code) on each row; pull-to-refresh.

## 7. Metrics & Session History

- **Per-game session history** — List of closed sessions; hosts see all sessions, players see only their own.
- **Session detail**
  - Summary: close date, player count, total pot, slippage.
  - Per-player results (in / out / net).
  - **Who owes whom** transfer list.
  - **Cash flow** bar chart (cash-in vs cash-out) — Swift Charts.
  - **Net results** bar chart (green/red).
- **Delete session history** — Host only; reverses the profile profit changes from that snapshot.
- Includes guest snapshots alongside player snapshots.

## 8. Architecture & Platform

- **SwiftUI**, iOS 17+, tab-based navigation (**Tables · Debts · Profile**).
- **Supabase** backend: auth, Postgres, realtime subscriptions, and RPCs:
  `close_session`, `reopen_session`, `insert_game_debts`, `delete_session_at`, `transfer_host`.
- **`ChipCountCore`** local Swift package shared between platforms for payout/debt/history logic.
- **Deep linking / universal links** via the `chipcount://` scheme and associated web invite URLs.
- **Tests** — Parity unit tests for `PayoutCalculator`, `DebtCalculator`, and `SessionHistoryBuilder`.
</content>
</invoke>
