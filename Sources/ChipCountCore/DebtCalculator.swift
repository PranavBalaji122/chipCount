import Foundation

public struct DebtPlayer: Equatable, Sendable {
  public let userId: String
  public let cashIn: Double
  public let cashOut: Double

  public init(userId: String, cashIn: Double, cashOut: Double) {
    self.userId = userId
    self.cashIn = cashIn
    self.cashOut = cashOut
  }
}

public struct CalculatedDebt: Codable, Equatable, Sendable {
  public let creditorId: String
  public let debtorId: String
  public let amount: Double

  public init(creditorId: String, debtorId: String, amount: Double) {
    self.creditorId = creditorId
    self.debtorId = debtorId
    self.amount = amount
  }

  enum CodingKeys: String, CodingKey {
    case creditorId = "creditor_id"
    case debtorId = "debtor_id"
    case amount
  }
}

public enum DebtCalculator {
  public static func calculate(players: [DebtPlayer]) -> [CalculatedDebt] {
    guard players.count >= 2 else { return [] }

    let slippage = players.reduce(0) { $0 + $1.cashIn - $1.cashOut }
    var balances = players
      .map {
        WorkingBalance(
          userId: $0.userId,
          balance: $0.cashOut - $0.cashIn + slippage / Double(players.count)
        )
      }
      .sorted { $0.balance < $1.balance }
    var debts: [CalculatedDebt] = []
    var left = 0
    var right = balances.count - 1

    while left < right {
      let payment = min(-balances[left].balance, balances[right].balance)

      if payment > 1e-9 {
        debts.append(
          CalculatedDebt(
            creditorId: balances[right].userId,
            debtorId: balances[left].userId,
            amount: (payment * 100).rounded() / 100
          )
        )
        balances[left].balance += payment
        balances[right].balance -= payment
      }

      if abs(balances[left].balance) < 1e-9 { left += 1 }
      if abs(balances[right].balance) < 1e-9 { right -= 1 }
    }

    return debts
  }
}

private struct WorkingBalance {
  let userId: String
  var balance: Double
}
