export type GameStatus = "active" | "ended"
export type GamePlayerStatus = "pending" | "approved" | "denied"

export type Profile = {
  id: string
  display_name: string | null
  phone: string | null
  email: string | null
  venmo_handle: string | null
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
