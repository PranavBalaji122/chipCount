import Foundation

public struct SessionHistoryPlayerSnapshot: Equatable, Sendable {
  public let userId: String
  public let cashIn: Double
  public let cashOut: Double
  public let timestamp: String

  public init(userId: String, cashIn: Double, cashOut: Double, timestamp: String) {
    self.userId = userId
    self.cashIn = cashIn
    self.cashOut = cashOut
    self.timestamp = timestamp
  }
}

public struct SessionHistoryGuestSnapshot: Equatable, Sendable {
  public let name: String
  public let cashIn: Double
  public let cashOut: Double
  public let timestamp: String

  public init(name: String, cashIn: Double, cashOut: Double, timestamp: String) {
    self.name = name
    self.cashIn = cashIn
    self.cashOut = cashOut
    self.timestamp = timestamp
  }
}

public struct SessionHistorySession: Equatable, Identifiable, Sendable {
  public let timestamp: String
  public let players: [BasicPlayer]

  public var id: String { timestamp }

  public var previewNames: String {
    let names = players.prefix(3).map(\.name).joined(separator: ", ")
    return players.count > 3 ? "\(names), and \(players.count - 3) more" : names
  }

  public var totalPot: Double {
    players.reduce(0) { $0 + $1.cashIn + $1.cashOut }
  }

  public init(timestamp: String, players: [BasicPlayer]) {
    self.timestamp = timestamp
    self.players = players
  }
}

public enum SessionHistoryBuilder {
  public static func sessions(
    playerSnapshots: [SessionHistoryPlayerSnapshot],
    guestSnapshots: [SessionHistoryGuestSnapshot],
    displayNamesByUserId: [String: String],
    currentUserId: String?,
    isHost: Bool
  ) -> [SessionHistorySession] {
    let allTimestamps = Set(playerSnapshots.map(\.timestamp) + guestSnapshots.map(\.timestamp))
    let visibleTimestamps = allTimestamps
      .filter { timestamp in
        isHost || playerSnapshots.contains {
          $0.timestamp == timestamp && $0.userId == currentUserId
        }
      }
      .sorted(by: >)

    return visibleTimestamps.map { timestamp in
      var usedNames = Set<String>()
      let players = playerSnapshots
        .filter { $0.timestamp == timestamp }
        .map { snapshot in
          BasicPlayer(
            name: uniqueName(
              displayNamesByUserId[snapshot.userId] ?? "Player \(snapshot.userId.prefix(8))",
              usedNames: &usedNames
            ),
            cashIn: snapshot.cashIn,
            cashOut: snapshot.cashOut
          )
        }

      let guests = guestSnapshots
        .filter { $0.timestamp == timestamp }
        .map { snapshot in
          BasicPlayer(
            name: uniqueName("\(snapshot.name) (guest)", usedNames: &usedNames),
            cashIn: snapshot.cashIn,
            cashOut: snapshot.cashOut
          )
        }

      return SessionHistorySession(timestamp: timestamp, players: players + guests)
    }
  }

  private static func uniqueName(_ name: String, usedNames: inout Set<String>) -> String {
    var candidate = name
    var suffix = 1

    while usedNames.contains(candidate) {
      suffix += 1
      candidate = "\(name) (\(suffix))"
    }

    usedNames.insert(candidate)
    return candidate
  }
}
