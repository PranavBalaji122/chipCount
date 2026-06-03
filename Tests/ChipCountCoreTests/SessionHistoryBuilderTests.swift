import XCTest
@testable import ChipCountCore

final class SessionHistoryBuilderTests: XCTestCase {
  func testHostSeesAllSessionsNewestFirstIncludingGuestOnlySessions() throws {
    let sessions = SessionHistoryBuilder.sessions(
      playerSnapshots: [
        player("host", in: 100, out: 150, at: "2026-05-01T12:00:00Z"),
        player("host", in: 200, out: 100, at: "2026-05-02T12:00:00Z")
      ],
      guestSnapshots: [
        guest("Sam", in: 20, out: 30, at: "2026-05-03T12:00:00Z")
      ],
      displayNamesByUserId: ["host": "Pranav"],
      currentUserId: "host",
      isHost: true
    )

    XCTAssertEqual(sessions.map(\.timestamp), [
      "2026-05-03T12:00:00Z",
      "2026-05-02T12:00:00Z",
      "2026-05-01T12:00:00Z"
    ])
    XCTAssertEqual(sessions.first?.players, [
      BasicPlayer(name: "Sam (guest)", cashIn: 20, cashOut: 30)
    ])
  }

  func testPlayerSeesOnlyParticipatedSessionsWithEveryoneInThoseSessions() throws {
    let sessions = SessionHistoryBuilder.sessions(
      playerSnapshots: [
        player("current", in: 100, out: 175, at: "2026-05-01T12:00:00Z"),
        player("other", in: 100, out: 25, at: "2026-05-01T12:00:00Z"),
        player("other", in: 50, out: 50, at: "2026-05-02T12:00:00Z")
      ],
      guestSnapshots: [
        guest("Taylor", in: 40, out: 40, at: "2026-05-01T12:00:00Z")
      ],
      displayNamesByUserId: ["current": "Alex", "other": "Blake"],
      currentUserId: "current",
      isHost: false
    )

    let session = try XCTUnwrap(sessions.only)
    XCTAssertEqual(session.timestamp, "2026-05-01T12:00:00Z")
    XCTAssertEqual(session.players, [
      BasicPlayer(name: "Alex", cashIn: 100, cashOut: 175),
      BasicPlayer(name: "Blake", cashIn: 100, cashOut: 25),
      BasicPlayer(name: "Taylor (guest)", cashIn: 40, cashOut: 40)
    ])
  }

  func testNamesAreReadableUniqueAndPreviewIsLimited() throws {
    let sessions = SessionHistoryBuilder.sessions(
      playerSnapshots: [
        player("duplicate", in: 10, out: 20, at: "2026-05-01T12:00:00Z"),
        player("1234567890", in: 20, out: 10, at: "2026-05-01T12:00:00Z")
      ],
      guestSnapshots: [
        guest("Alex", in: 30, out: 30, at: "2026-05-01T12:00:00Z"),
        guest("Jordan", in: 40, out: 40, at: "2026-05-01T12:00:00Z")
      ],
      displayNamesByUserId: ["duplicate": "Alex"],
      currentUserId: "duplicate",
      isHost: true
    )

    let session = try XCTUnwrap(sessions.only)
    XCTAssertEqual(session.players.map(\.name), [
      "Alex",
      "Player 12345678",
      "Alex (guest)",
      "Jordan (guest)"
    ])
    XCTAssertEqual(session.previewNames, "Alex, Player 12345678, Alex (guest), and 1 more")
    XCTAssertEqual(session.totalPot, 200)
  }

  func testDuplicateGuestNamesReceiveStableSuffixes() throws {
    let sessions = SessionHistoryBuilder.sessions(
      playerSnapshots: [],
      guestSnapshots: [
        guest("Alex", in: 10, out: 15, at: "2026-05-01T12:00:00Z"),
        guest("Alex", in: 20, out: 15, at: "2026-05-01T12:00:00Z")
      ],
      displayNamesByUserId: [:],
      currentUserId: nil,
      isHost: true
    )

    XCTAssertEqual(try XCTUnwrap(sessions.only).players.map(\.name), [
      "Alex (guest)",
      "Alex (guest) (2)"
    ])
  }

  private func player(_ userId: String, in cashIn: Double, out cashOut: Double, at timestamp: String) -> SessionHistoryPlayerSnapshot {
    SessionHistoryPlayerSnapshot(userId: userId, cashIn: cashIn, cashOut: cashOut, timestamp: timestamp)
  }

  private func guest(_ name: String, in cashIn: Double, out cashOut: Double, at timestamp: String) -> SessionHistoryGuestSnapshot {
    SessionHistoryGuestSnapshot(name: name, cashIn: cashIn, cashOut: cashOut, timestamp: timestamp)
  }
}

private extension Array {
  var only: Element? {
    count == 1 ? first : nil
  }
}
