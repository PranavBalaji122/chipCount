import XCTest
@testable import ChipCountCore

final class DebtCalculatorTests: XCTestCase {
  func testCalculatesDebtBetweenTwoPlayers() {
    let debts = DebtCalculator.calculate(players: [
      DebtPlayer(userId: "winner", cashIn: 100, cashOut: 200),
      DebtPlayer(userId: "loser", cashIn: 100, cashOut: 0)
    ])

    XCTAssertEqual(debts, [
      CalculatedDebt(creditorId: "winner", debtorId: "loser", amount: 100)
    ])
  }

  func testCalculatesMultipleDebts() {
    let debts = DebtCalculator.calculate(players: [
      DebtPlayer(userId: "winner", cashIn: 50, cashOut: 200),
      DebtPlayer(userId: "loser-1", cashIn: 100, cashOut: 0),
      DebtPlayer(userId: "loser-2", cashIn: 50, cashOut: 0)
    ])

    XCTAssertEqual(debts, [
      CalculatedDebt(creditorId: "winner", debtorId: "loser-1", amount: 100),
      CalculatedDebt(creditorId: "winner", debtorId: "loser-2", amount: 50)
    ])
  }

  func testDistributesSlippageAndRoundsToCents() {
    let debts = DebtCalculator.calculate(players: [
      DebtPlayer(userId: "winner", cashIn: 100, cashOut: 150),
      DebtPlayer(userId: "loser", cashIn: 100, cashOut: 40)
    ])

    XCTAssertEqual(debts, [
      CalculatedDebt(creditorId: "winner", debtorId: "loser", amount: 55)
    ])
  }

  func testReturnsNoDebtForFewerThanTwoPlayers() {
    XCTAssertEqual(
      DebtCalculator.calculate(players: [
        DebtPlayer(userId: "only-player", cashIn: 100, cashOut: 100)
      ]),
      []
    )
  }
}
