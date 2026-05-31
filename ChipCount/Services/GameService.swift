import ChipCountCore
import Foundation
import Supabase

struct GameService {
  private let supabase = SupabaseClientProvider.shared

  func listTables(userId: String) async throws -> [TableMembership] {
    let rows: [RawMembership] = try await supabase
      .from("game_players")
      .select("status, game:games!inner(id, short_code, host_id, description, status, created_at, ended_at)")
      .eq("user_id", value: userId)
      .neq("status", value: "pending")
      .in("games.status", values: ["active", "closed"])
      .execute()
      .value

    return rows.compactMap { row in
      guard let game = row.game else { return nil }
      return TableMembership(status: row.status, game: game)
    }
  }

  func createTable(hostId: String, description: String?, guests: [String] = []) async throws -> Game {
    let game: Game = try await supabase
      .from("games")
      .insert(NewGame(hostId: hostId, description: description?.nilIfBlank))
      .select("id, short_code, host_id, description, status, created_at, ended_at")
      .single()
      .execute()
      .value

    try await supabase
      .from("game_players")
      .insert(NewGamePlayer(gameId: game.id, userId: hostId, status: .approved, requestedCashIn: 0, requestedCashOut: 0))
      .execute()

    if !guests.isEmpty {
      for guestName in guests {
        let newGuest = NewGuest(gameId: game.id, name: guestName, cashIn: 0, cashOut: 0)
        try await supabase
          .from("game_guests")
          .insert(newGuest)
          .execute()
      }
    }

    return game
  }

  func joinTable(shortCode: String, userId: String, buyIn: Double) async throws -> Game {
    let code = shortCode.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let game: Game = try await supabase
      .from("games")
      .select("id, short_code, host_id, description, status, created_at, ended_at")
      .eq("short_code", value: code)
      .eq("status", value: GameStatus.active.rawValue)
      .single()
      .execute()
      .value

    try await supabase
      .from("game_players")
      .insert(NewGamePlayer(gameId: game.id, userId: userId, status: .pending, requestedCashIn: buyIn, requestedCashOut: 0))
      .execute()

    return game
  }

  func loadGame(gameId: String) async throws -> GameSnapshot {
    async let game: Game = supabase
      .from("games")
      .select("id, short_code, host_id, description, status, created_at, ended_at")
      .eq("id", value: gameId)
      .single()
      .execute()
      .value

    async let rawPlayers: [RawGamePlayer] = supabase
      .from("game_players")
      .select("""
        user_id,
        status,
        cash_in,
        cash_out,
        requested_cash_in,
        requested_cash_out,
        profile:profiles(display_name, venmo_handle)
      """)
      .eq("game_id", value: gameId)
      .execute()
      .value

    async let guests: [GameGuest] = supabase
      .from("game_guests")
      .select("id, game_id, name, cash_in, cash_out")
      .eq("game_id", value: gameId)
      .execute()
      .value

    let loadedGame = try await game
    let players = try await rawPlayers.map(\.player)
    let loadedGuests = try await guests
    return GameSnapshot(game: loadedGame, players: players, guests: loadedGuests)
  }

  func updatePlayer(gameId: String, userId: String, patch: PlayerPatch) async throws {
    try await supabase
      .from("game_players")
      .update(patch)
      .eq("game_id", value: gameId)
      .eq("user_id", value: userId)
      .execute()
  }

  func approvePlayer(_ player: GamePlayer, gameId: String) async throws {
    try await updatePlayer(
      gameId: gameId,
      userId: player.userId,
      patch: PlayerPatch(
        status: .approved,
        cashIn: player.requestedCashIn,
        cashOut: player.requestedCashOut,
        requestedCashIn: player.requestedCashIn,
        requestedCashOut: player.requestedCashOut
      )
    )
  }

  func denyPlayer(gameId: String, userId: String) async throws {
    try await updatePlayer(gameId: gameId, userId: userId, patch: PlayerPatch(status: .denied))
  }

  func requestRejoin(gameId: String, userId: String) async throws {
    try await supabase
      .from("game_players")
      .update(PlayerPatch(status: .pending))
      .eq("game_id", value: gameId)
      .eq("user_id", value: userId)
      .eq("status", value: GamePlayerStatus.denied.rawValue)
      .execute()
  }

  func transferHost(gameId: String, newHostId: String) async throws {
    try await supabase
      .rpc("transfer_host", params: TransferHostParams(pGameId: gameId, pNewHostId: newHostId))
      .execute()
  }

  func addGuest(gameId: String, name: String, cashIn: Double, cashOut: Double) async throws -> GameGuest {
    try await supabase
      .from("game_guests")
      .insert(NewGuest(gameId: gameId, name: name, cashIn: cashIn, cashOut: cashOut))
      .select("id, game_id, name, cash_in, cash_out")
      .single()
      .execute()
      .value
  }

  func updateGuest(_ guest: GameGuest) async throws {
    try await supabase
      .from("game_guests")
      .update(GuestPatch(cashIn: guest.cashIn, cashOut: guest.cashOut))
      .eq("id", value: guest.id)
      .execute()
  }

  func removeGuest(id: String) async throws {
    try await supabase
      .from("game_guests")
      .delete()
      .eq("id", value: id)
      .execute()
  }

  func closeSession(gameId: String) async throws {
    let _: String = try await supabase
      .rpc("close_session_with_debts", params: ["p_game_id": gameId, "p_final_status": "closed"])
      .execute()
      .value
  }

  func reopenSession(gameId: String) async throws {
    try await supabase
      .rpc("reopen_session", params: ["p_game_id": gameId])
      .execute()
  }

  func endTable(gameId: String) async throws {
    try await supabase
      .rpc("end_table", params: ["p_game_id": gameId])
      .execute()
  }

  func loadMetrics(gameId: String) async throws -> GameMetrics {
    async let playerSnapshots: [SessionSnapshot] = supabase
      .from("session_snapshots")
      .select("id, user_id, cash_in, cash_out, session_net, snapshotted_at")
      .eq("game_id", value: gameId)
      .order("snapshotted_at", ascending: true)
      .execute()
      .value

    async let guestSnapshots: [GuestSessionSnapshot] = supabase
      .from("guest_session_snapshots")
      .select("id, guest_name, cash_in, cash_out, session_net, snapshotted_at")
      .eq("game_id", value: gameId)
      .order("snapshotted_at", ascending: true)
      .execute()
      .value

    return try await GameMetrics(
      playerSnapshots: playerSnapshots,
      guestSnapshots: guestSnapshots
    )
  }

  func deleteSession(gameId: String, snapshottedAt: String) async throws {
    try await supabase
      .rpc(
        "delete_session_at",
        params: DeleteSessionParams(pGameId: gameId, pSnapshottedAt: snapshottedAt)
      )
      .execute()
  }

  func observeGame(gameId: String, onChange: @escaping @Sendable () async -> Void) async -> Task<Void, Never> {
    let channel = supabase.channel("chipcount-game-\(gameId)-\(UUID().uuidString)")
    let changes = channel.postgresChange(AnyAction.self, schema: "public")
    await channel.subscribe()

    return Task {
      defer { Task { await supabase.removeChannel(channel) } }
      for await _ in changes {
        if Task.isCancelled { break }
        await onChange()
      }
    }
  }

  func payout(for snapshot: GameSnapshot) -> Payout? {
    let names = UniqueNameBuilder()
    let players = snapshot.approvedPlayers.map { player in
      BasicPlayer(
        name: names.name(
          player.venmoHandle.map { "@\($0)" } ?? player.displayName ?? "Player_\(player.userId.prefix(8))"
        ),
        cashIn: player.cashIn,
        cashOut: player.cashOut
      )
    }

    let guests = snapshot.guests.map { guest in
      BasicPlayer(
        name: names.name("\(guest.name) (guest)"),
        cashIn: guest.cashIn,
        cashOut: guest.cashOut
      )
    }

    return PayoutCalculator.calculate(players: players + guests)
  }
}

private struct RawMembership: Decodable {
  let status: GamePlayerStatus
  let game: Game?
}

private struct RawGamePlayer: Decodable {
  let userId: String
  let status: GamePlayerStatus
  let cashIn: Double?
  let cashOut: Double?
  let requestedCashIn: Double?
  let requestedCashOut: Double?
  let profile: ProfileName?

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case status
    case cashIn = "cash_in"
    case cashOut = "cash_out"
    case requestedCashIn = "requested_cash_in"
    case requestedCashOut = "requested_cash_out"
    case profile
  }

  var player: GamePlayer {
    GamePlayer(
      userId: userId,
      status: status,
      cashIn: cashIn ?? 0,
      cashOut: cashOut ?? 0,
      requestedCashIn: requestedCashIn ?? cashIn ?? 0,
      requestedCashOut: requestedCashOut ?? cashOut ?? 0,
      displayName: profile?.displayName,
      venmoHandle: profile?.venmoHandle
    )
  }
}

private struct ProfileName: Decodable {
  let displayName: String?
  let venmoHandle: String?

  enum CodingKeys: String, CodingKey {
    case displayName = "display_name"
    case venmoHandle = "venmo_handle"
  }
}

private struct NewGame: Encodable {
  let hostId: String
  let description: String?

  enum CodingKeys: String, CodingKey {
    case hostId = "host_id"
    case description
  }
}

private struct NewGamePlayer: Encodable {
  let gameId: String
  let userId: String
  let status: GamePlayerStatus
  let requestedCashIn: Double
  let requestedCashOut: Double

  enum CodingKeys: String, CodingKey {
    case gameId = "game_id"
    case userId = "user_id"
    case status
    case requestedCashIn = "requested_cash_in"
    case requestedCashOut = "requested_cash_out"
  }
}

struct PlayerPatch: Encodable {
  var status: GamePlayerStatus?
  var cashIn: Double?
  var cashOut: Double?
  var requestedCashIn: Double?
  var requestedCashOut: Double?

  enum CodingKeys: String, CodingKey {
    case status
    case cashIn = "cash_in"
    case cashOut = "cash_out"
    case requestedCashIn = "requested_cash_in"
    case requestedCashOut = "requested_cash_out"
  }
}

private struct NewGuest: Encodable {
  let gameId: String
  let name: String
  let cashIn: Double
  let cashOut: Double

  enum CodingKeys: String, CodingKey {
    case gameId = "game_id"
    case name
    case cashIn = "cash_in"
    case cashOut = "cash_out"
  }
}

private struct GuestPatch: Encodable {
  let cashIn: Double
  let cashOut: Double

  enum CodingKeys: String, CodingKey {
    case cashIn = "cash_in"
    case cashOut = "cash_out"
  }
}



private struct TransferHostParams: Encodable {
  let pGameId: String
  let pNewHostId: String

  enum CodingKeys: String, CodingKey {
    case pGameId = "p_game_id"
    case pNewHostId = "p_new_host_id"
  }
}

private struct DeleteSessionParams: Encodable {
  let pGameId: String
  let pSnapshottedAt: String

  enum CodingKeys: String, CodingKey {
    case pGameId = "p_game_id"
    case pSnapshottedAt = "p_snapshotted_at"
  }
}

private final class UniqueNameBuilder {
  private var names = Set<String>()

  func name(_ base: String) -> String {
    var candidate = base
    var suffix = 0

    while names.contains(candidate) {
      suffix += 1
      candidate = "\(base)_\(suffix)"
    }

    names.insert(candidate)
    return candidate
  }
}

private extension String {
  var nilIfBlank: String? {
    let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}
