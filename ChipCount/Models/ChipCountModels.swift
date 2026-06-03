import Foundation

struct AuthenticatedUser: Equatable, Identifiable {
  let id: String
  let email: String?
}

struct Profile: Codable, Equatable, Identifiable {
  let id: String
  var displayName: String?
  var phone: String?
  var email: String?
  var venmoHandle: String?
  var netProfit: Double
  var profilePublic: Bool
  var createdAt: String?
  var updatedAt: String?

  enum CodingKeys: String, CodingKey {
    case id
    case displayName = "display_name"
    case phone
    case email
    case venmoHandle = "venmo_handle"
    case netProfit = "net_profit"
    case profilePublic = "profile_public"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}

struct Game: Codable, Hashable, Identifiable {
  let id: String
  let shortCode: String
  let hostId: String
  let description: String?
  let status: GameStatus
  let createdAt: String?
  let endedAt: String?

  enum CodingKeys: String, CodingKey {
    case id
    case shortCode = "short_code"
    case hostId = "host_id"
    case description
    case status
    case createdAt = "created_at"
    case endedAt = "ended_at"
  }
}

enum GameStatus: String, Codable, CaseIterable, Hashable {
  case active
  case closed
  case ended
}

enum GamePlayerStatus: String, Codable {
  case pending
  case approved
  case denied
}

struct GamePlayer: Codable, Equatable, Identifiable {
  var id: String { userId }
  let userId: String
  var status: GamePlayerStatus
  var cashIn: Double
  var cashOut: Double
  var requestedCashIn: Double
  var requestedCashOut: Double
  var displayName: String?
  var venmoHandle: String?

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case status
    case cashIn = "cash_in"
    case cashOut = "cash_out"
    case requestedCashIn = "requested_cash_in"
    case requestedCashOut = "requested_cash_out"
    case displayName = "display_name"
    case venmoHandle = "venmo_handle"
  }
}

struct GameGuest: Codable, Equatable, Identifiable {
  let id: String
  let gameId: String?
  var name: String
  var cashIn: Double
  var cashOut: Double

  enum CodingKeys: String, CodingKey {
    case id
    case gameId = "game_id"
    case name
    case cashIn = "cash_in"
    case cashOut = "cash_out"
  }
}

struct Debt: Codable, Equatable, Identifiable {
  let id: String
  let gameId: String
  let creditorId: String
  let debtorId: String
  let amount: Double
  let status: String
  let createdAt: String
  var creditor: RelatedProfile?
  var debtor: RelatedProfile?
  var game: RelatedGame?

  enum CodingKeys: String, CodingKey {
    case id
    case gameId = "game_id"
    case creditorId = "creditor_id"
    case debtorId = "debtor_id"
    case amount
    case status
    case createdAt = "created_at"
    case creditor
    case debtor
    case game
  }
}

struct RelatedProfile: Codable, Equatable {
  let displayName: String?

  enum CodingKeys: String, CodingKey {
    case displayName = "display_name"
  }
}

struct RelatedGame: Codable, Equatable {
  let description: String?
  let shortCode: String?

  enum CodingKeys: String, CodingKey {
    case description
    case shortCode = "short_code"
  }
}

struct TableMembership: Codable, Identifiable {
  var id: String { game.id }
  let status: GamePlayerStatus
  let game: Game
}

struct GameSnapshot: Equatable {
  var game: Game
  var players: [GamePlayer]
  var guests: [GameGuest]

  var approvedPlayers: [GamePlayer] {
    players.filter { $0.status == .approved }
  }

  var pendingPlayers: [GamePlayer] {
    players.filter { $0.status == .pending }
  }
}

struct SessionSnapshot: Codable, Equatable, Identifiable {
  let id: String
  let userId: String
  let cashIn: Double
  let cashOut: Double
  let sessionNet: Double
  let snapshottedAt: String

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case cashIn = "cash_in"
    case cashOut = "cash_out"
    case sessionNet = "session_net"
    case snapshottedAt = "snapshotted_at"
  }
}

struct GuestSessionSnapshot: Codable, Equatable, Identifiable {
  let id: String
  let guestName: String
  let cashIn: Double
  let cashOut: Double
  let sessionNet: Double
  let snapshottedAt: String

  enum CodingKeys: String, CodingKey {
    case id
    case guestName = "guest_name"
    case cashIn = "cash_in"
    case cashOut = "cash_out"
    case sessionNet = "session_net"
    case snapshottedAt = "snapshotted_at"
  }
}

struct GameMetrics: Equatable {
  let playerSnapshots: [SessionSnapshot]
  let guestSnapshots: [GuestSessionSnapshot]
  let displayNamesByUserId: [String: String]
}
