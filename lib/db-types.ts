export type GameStatus = "active" | "closed" | "ended"
export type GamePlayerStatus = "pending" | "approved" | "denied"

export type Profile = {
  id: string
  display_name: string | null
  phone: string | null
  email: string | null
  venmo_handle: string | null
  zelle_handle: string | null
  cashapp_handle: string | null
  paypal_handle: string | null
  net_profit: number
  profile_public: boolean
  created_at: string
  updated_at: string
}

export type Game = {
  id: string
  short_code: string
  host_id: string
  description: string | null
  status: GameStatus
  created_at: string
  ended_at: string | null
}

export type GamePlayer = {
  game_id: string
  user_id: string
  status: GamePlayerStatus
  cash_in: number
  cash_out: number
  display_name: string | null
}

export type GameProfitHistoryRow = {
  id: string
  user_id: string
  game_id: string
  profit_delta: number
  recorded_at: string
}

export type DebtStatus = "pending" | "settled"

export type Debt = {
  id: string
  game_id: string
  creditor_id: string
  debtor_id: string
  amount: number
  status: DebtStatus
  created_at: string
  updated_at: string
}

export type DebtWithRelations = Debt & {
  creditor: { display_name: string | null } | null
  debtor: { display_name: string | null } | null
  game: { description: string | null; short_code: string } | null
}
