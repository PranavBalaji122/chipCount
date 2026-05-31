import XCTest
@testable import ChipCountCore

final class PayoutCalculatorTests: XCTestCase {
  func testSimpleTwoPlayerPayout() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 200),
        BasicPlayer(name: "Bob", cashIn: 100, cashOut: 0)
      ])
    )

    XCTAssertEqual(payout.slippage, 0)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.net, -100)
    XCTAssertEqual(
      payout.players.first(where: { $0.name == "Bob" })?.paidBy,
      [Payment(target: "Alice", value: 100)]
    )
    XCTAssertEqual(
      payout.players.first(where: { $0.name == "Alice" })?.paidTo,
      [Payment(target: "Bob", value: 100)]
    )
  }

  func testOnePlayerPaysMultipleWinners() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 50, cashOut: 150),
        BasicPlayer(name: "Bob", cashIn: 50, cashOut: 100),
        BasicPlayer(name: "Charlie", cashIn: 200, cashOut: 50)
      ])
    )

    let charlie = payout.players.first { $0.name == "Charlie" }
    XCTAssertEqual(charlie?.net, -150)
    XCTAssertEqual(charlie?.paidBy.count, 2)
    XCTAssertTrue(charlie?.paidBy.contains(Payment(target: "Alice", value: 100)) == true)
    XCTAssertTrue(charlie?.paidBy.contains(Payment(target: "Bob", value: 50)) == true)
  }

  func testMultiplePlayersPaySingleWinner() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 250),
        BasicPlayer(name: "Bob", cashIn: 100, cashOut: 0),
        BasicPlayer(name: "Charlie", cashIn: 50, cashOut: 0)
      ])
    )

    let alice = payout.players.first { $0.name == "Alice" }
    XCTAssertEqual(alice?.net, 150)
    XCTAssertTrue(alice?.paidTo.contains(Payment(target: "Bob", value: 100)) == true)
    XCTAssertTrue(alice?.paidTo.contains(Payment(target: "Charlie", value: 50)) == true)
  }

  func testZeroNetPlayers() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 150),
        BasicPlayer(name: "Bob", cashIn: 100, cashOut: 100),
        BasicPlayer(name: "Charlie", cashIn: 100, cashOut: 50)
      ])
    )

    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.net, 0)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.paidBy, [])
    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.paidTo, [])
  }

  func testPositiveSlippage() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 150),
        BasicPlayer(name: "Bob", cashIn: 100, cashOut: 40)
      ])
    )

    XCTAssertEqual(payout.slippage, 10)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Alice" })?.net, 55)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.paidBy, [
      Payment(target: "Alice", value: 55)
    ])
  }

  func testNegativeSlippage() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 150),
        BasicPlayer(name: "Bob", cashIn: 100, cashOut: 60)
      ])
    )

    XCTAssertEqual(payout.slippage, -10)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Alice" })?.net, 45)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Bob" })?.paidBy, [
      Payment(target: "Alice", value: 45)
    ])
  }

  func testFloatingPointValues() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 50.5, cashOut: 100.25),
        BasicPlayer(name: "Bob", cashIn: 75.25, cashOut: 25.75)
      ])
    )

    XCTAssertEqual(payout.slippage, -0.25, accuracy: 0.000001)
    XCTAssertEqual(payout.players.first(where: { $0.name == "Alice" })?.net ?? 0, 49.625, accuracy: 0.000001)
  }

  func testEveryoneBreaksEven() throws {
    let payout = try XCTUnwrap(
      PayoutCalculator.calculate(players: [
        BasicPlayer(name: "Alice", cashIn: 100, cashOut: 100),
        BasicPlayer(name: "Bob", cashIn: 50, cashOut: 50)
      ])
    )

    XCTAssertEqual(payout.slippage, 0)
    XCTAssertTrue(payout.players.allSatisfy { $0.net == 0 && $0.paidBy.isEmpty && $0.paidTo.isEmpty })
  }
}
