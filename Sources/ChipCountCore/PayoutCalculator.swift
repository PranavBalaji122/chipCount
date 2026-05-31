import Foundation

public struct BasicPlayer: Codable, Equatable, Identifiable, Sendable {
  public var id: String { name }
  public let name: String
  public let cashIn: Double
  public let cashOut: Double

  public init(name: String, cashIn: Double, cashOut: Double) {
    self.name = name
    self.cashIn = cashIn
    self.cashOut = cashOut
  }
}

public struct Payment: Codable, Equatable, Sendable {
  public let target: String
  public let value: Double

  public init(target: String, value: Double) {
    self.target = target
    self.value = value
  }
}

public struct PayoutPlayer: Codable, Equatable, Identifiable, Sendable {
  public var id: String { name }
  public let name: String
  public let displayName: String
  public let cashIn: Double
  public let cashOut: Double
  public let net: Double
  public var paidBy: [Payment]
  public var paidTo: [Payment]

  public init(
    name: String,
    displayName: String,
    cashIn: Double,
    cashOut: Double,
    net: Double,
    paidBy: [Payment],
    paidTo: [Payment]
  ) {
    self.name = name
    self.displayName = displayName
    self.cashIn = cashIn
    self.cashOut = cashOut
    self.net = net
    self.paidBy = paidBy
    self.paidTo = paidTo
  }
}

public struct Payout: Codable, Equatable, Sendable {
  public let players: [PayoutPlayer]
  public let slippage: Double

  public init(players: [PayoutPlayer], slippage: Double) {
    self.players = players
    self.slippage = slippage
  }
}

private struct WorkingPlayer {
  let name: String
  let displayName: String
  let cashIn: Double
  let cashOut: Double
  let net: Double
  var balance: Double
  var paidBy: [Payment]
  var paidTo: [Payment]
}

public enum PayoutCalculator {
  public static func calculate(players inputPlayers: [BasicPlayer]) -> Payout? {
    guard inputPlayers.count >= 2 else { return nil }

    let slippage = inputPlayers.reduce(0) { sum, player in
      sum + player.cashIn - player.cashOut
    }

    var players = inputPlayers
      .map { player in
        let net = player.cashOut - player.cashIn + slippage / Double(inputPlayers.count)
        let displayName =
          player.name.first == "@" || player.name.first == "$"
          ? String(player.name.dropFirst())
          : player.name

        return WorkingPlayer(
          name: player.name,
          displayName: displayName,
          cashIn: player.cashIn,
          cashOut: player.cashOut,
          net: net,
          balance: net,
          paidBy: [],
          paidTo: []
        )
      }
      .sorted { $0.balance < $1.balance }

    var left = 0
    var right = players.count - 1

    while left < right {
      let payment = min(-players[left].balance, players[right].balance)

      if payment > 1e-9 {
        players[left].balance += payment
        players[right].balance -= payment

        players[left].paidBy.append(Payment(target: players[right].name, value: payment))
        players[right].paidTo.append(Payment(target: players[left].name, value: payment))
      }

      if abs(players[left].balance) < 1e-9 {
        left += 1
      }

      if abs(players[right].balance) < 1e-9 {
        right -= 1
      }
    }

    return Payout(
      players: players.map {
        PayoutPlayer(
          name: $0.name,
          displayName: $0.displayName,
          cashIn: $0.cashIn,
          cashOut: $0.cashOut,
          net: $0.net,
          paidBy: $0.paidBy,
          paidTo: $0.paidTo
        )
      },
      slippage: slippage
    )
  }
}

public extension Double {
  var chipCountCurrency: String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "USD"
    formatter.minimumFractionDigits = truncatingRemainder(dividingBy: 1) == 0 ? 0 : 2
    formatter.maximumFractionDigits = 2
    return formatter.string(from: NSNumber(value: self)) ?? "$\(self)"
  }
}
