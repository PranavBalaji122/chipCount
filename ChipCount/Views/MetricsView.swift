import Charts
import ChipCountCore
import SwiftUI

struct MetricsView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = GameService()
  @State private var metrics: GameMetrics?
  @State private var errorMessage: String?
  @State private var isLoading = false
  @State private var deleteCandidate: String?

  let gameId: String
  let isHost: Bool

  var body: some View {
    List {
      if let metrics {
        let sessions = visibleSessions(from: metrics)

        Section(isHost ? "All Sessions" : "Your Sessions") {
          if sessions.isEmpty {
            Text("No closed sessions yet.")
              .foregroundStyle(.secondary)
          } else {
            ForEach(sessions) { session in
              NavigationLink {
                SessionMetricsView(session: session)
              } label: {
                SessionHistoryRow(session: session)
              }
              .swipeActions {
                if isHost {
                  Button(role: .destructive) {
                    deleteCandidate = session.timestamp
                  } label: {
                    Label("Delete", systemImage: "trash")
                  }
                }
              }
            }
          }
        }
      } else if isLoading {
        ProgressView()
      }

      if let errorMessage {
        Section {
          Text(errorMessage)
            .foregroundStyle(.red)
        }
      }
    }
    .navigationTitle("Metrics")
    .refreshable {
      await load()
    }
    .task {
      await load()
    }
    .confirmationDialog(
      "Delete Session History?",
      isPresented: Binding(
        get: { deleteCandidate != nil },
        set: { if !$0 { deleteCandidate = nil } }
      ),
      presenting: deleteCandidate
    ) { timestamp in
      Button("Delete Session", role: .destructive) {
        Task { await deleteSession(at: timestamp) }
      }
    } message: { timestamp in
      Text("This removes the \(timestamp.formattedSnapshotDate) snapshot and reverses its profile profit changes.")
    }
  }

  private func visibleSessions(from metrics: GameMetrics) -> [SessionHistorySession] {
    SessionHistoryBuilder.sessions(
      playerSnapshots: metrics.playerSnapshots.map {
        SessionHistoryPlayerSnapshot(
          userId: $0.userId,
          cashIn: $0.cashIn,
          cashOut: $0.cashOut,
          timestamp: $0.snapshottedAt
        )
      },
      guestSnapshots: metrics.guestSnapshots.map {
        SessionHistoryGuestSnapshot(
          name: $0.guestName,
          cashIn: $0.cashIn,
          cashOut: $0.cashOut,
          timestamp: $0.snapshottedAt
        )
      },
      displayNamesByUserId: metrics.displayNamesByUserId,
      currentUserId: authStore.currentUser?.id,
      isHost: isHost
    )
  }

  private func load() async {
    isLoading = true
    defer { isLoading = false }

    do {
      metrics = try await service.loadMetrics(gameId: gameId)
      errorMessage = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func deleteSession(at timestamp: String) async {
    do {
      try await service.deleteSession(gameId: gameId, snapshottedAt: timestamp)
      deleteCandidate = nil
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}

private struct SessionHistoryRow: View {
  let session: SessionHistorySession

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(session.timestamp.formattedSnapshotDate)
        .font(.headline)
      Text("\(session.players.count) players")
        .font(.caption)
        .foregroundStyle(.secondary)
      Text(session.previewNames)
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(1)
      Text("Total pot \(session.totalPot.chipCountCurrency)")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(.vertical, 2)
  }
}

private struct SessionMetricsView: View {
  let session: SessionHistorySession

  private var payout: Payout? {
    PayoutCalculator.calculate(players: session.players)
  }

  private var summaries: [SessionPlayerSummary] {
    if let payout {
      return payout.players.map {
        SessionPlayerSummary(
          name: $0.name,
          displayName: $0.displayName,
          cashIn: $0.cashIn,
          cashOut: $0.cashOut,
          net: $0.net
        )
      }
    }

    return session.players.map {
      SessionPlayerSummary(
        name: $0.name,
        displayName: $0.name,
        cashIn: $0.cashIn,
        cashOut: $0.cashOut,
        net: $0.cashOut - $0.cashIn
      )
    }
  }

  private var transfers: [SessionTransfer] {
    guard let payout else { return [] }
    let displayNames = Dictionary(uniqueKeysWithValues: payout.players.map { ($0.name, $0.displayName) })

    return payout.players.flatMap { player in
      player.paidBy.map { payment in
        SessionTransfer(
          payer: player.displayName,
          recipient: displayNames[payment.target] ?? payment.target,
          amount: payment.value
        )
      }
    }
  }

  var body: some View {
    List {
      Section("Session") {
        LabeledContent("Closed", value: session.timestamp.formattedSnapshotDate)
        LabeledContent("Players", value: "\(session.players.count)")
        LabeledContent("Total pot", value: session.totalPot.chipCountCurrency)
        LabeledContent("Slippage", value: (payout?.slippage ?? 0).chipCountCurrency)
      }

      Section("Players") {
        ForEach(summaries) { player in
          VStack(alignment: .leading, spacing: 6) {
            HStack {
              Text(player.displayName)
                .font(.headline)
              Spacer()
              Text(player.net.chipCountCurrency)
                .foregroundStyle(player.net >= 0 ? .green : .red)
            }
            Text("In \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      Section("Who Owes Whom") {
        if transfers.isEmpty {
          Text("No payouts are needed.")
            .foregroundStyle(.secondary)
        } else {
          ForEach(transfers) { transfer in
            Text("\(transfer.payer) pays \(transfer.recipient) \(transfer.amount.chipCountCurrency)")
          }
        }
      }

      Section("Cash Flow") {
        Chart {
          ForEach(session.players) { player in
            BarMark(
              x: .value("Player", player.name),
              y: .value("Amount", player.cashIn)
            )
            .foregroundStyle(by: .value("Amount Type", "Cash In"))
            .position(by: .value("Amount Type", "Cash In"))

            BarMark(
              x: .value("Player", player.name),
              y: .value("Amount", player.cashOut)
            )
            .foregroundStyle(by: .value("Amount Type", "Cash Out"))
            .position(by: .value("Amount Type", "Cash Out"))
          }
        }
        .frame(height: 220)
      }

      Section("Net Results") {
        Chart(summaries) { player in
          BarMark(
            x: .value("Player", player.displayName),
            y: .value("Net", player.net)
          )
          .foregroundStyle(player.net >= 0 ? Color.green : Color.red)
        }
        .frame(height: 220)
      }
    }
    .navigationTitle("Session History")
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct SessionPlayerSummary: Identifiable {
  let name: String
  let displayName: String
  let cashIn: Double
  let cashOut: Double
  let net: Double

  var id: String { name }
}

private struct SessionTransfer: Identifiable {
  let id = UUID()
  let payer: String
  let recipient: String
  let amount: Double
}

private extension String {
  var formattedSnapshotDate: String {
    let formatter = ISO8601DateFormatter()
    guard let date = formatter.date(from: self) else { return self }
    return date.formatted(date: .abbreviated, time: .shortened)
  }
}
