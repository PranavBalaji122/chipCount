import ChipCountCore
import SwiftUI

struct MetricsView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = GameService()
  @State private var metrics: GameMetrics?
  @State private var errorMessage: String?
  @State private var isLoading = false

  let gameId: String

  var body: some View {
    List {
      if let metrics {
        Section("Your Sessions") {
          let mine = metrics.playerSnapshots.filter { $0.userId == authStore.currentUser?.id }
          if mine.isEmpty {
            Text("No closed sessions yet.")
              .foregroundStyle(.secondary)
          } else {
            ForEach(Array(mine.enumerated()), id: \.element.id) { index, snapshot in
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text("Session \(index + 1)")
                    .font(.headline)
                  Text(snapshot.snapshottedAt.formattedSnapshotDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                Spacer()
                Text(snapshot.sessionNet.chipCountCurrency)
                  .font(.headline)
                  .foregroundStyle(snapshot.sessionNet >= 0 ? .green : .red)
              }
            }
          }
        }

        Section("Table History") {
          ForEach(metrics.sessionTimestamps, id: \.self) { timestamp in
            VStack(alignment: .leading, spacing: 6) {
              Text(timestamp.formattedSnapshotDate)
                .font(.headline)
              let players = metrics.playerSnapshots.filter { $0.snapshottedAt == timestamp }
              let guests = metrics.guestSnapshots.filter { $0.snapshottedAt == timestamp }
              Text("\(players.count) players, \(guests.count) guests")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text("Total net \(sessionTotal(players: players, guests: guests).chipCountCurrency)")
                .font(.caption)
                .foregroundStyle(.secondary)
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

  private func sessionTotal(players: [SessionSnapshot], guests: [GuestSessionSnapshot]) -> Double {
    players.reduce(0) { $0 + $1.sessionNet } + guests.reduce(0) { $0 + $1.sessionNet }
  }
}

private extension String {
  var formattedSnapshotDate: String {
    let formatter = ISO8601DateFormatter()
    guard let date = formatter.date(from: self) else { return self }
    return date.formatted(date: .abbreviated, time: .shortened)
  }
}
