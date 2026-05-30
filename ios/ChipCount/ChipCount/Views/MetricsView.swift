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
            HStack {
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

              Spacer()

              if isHost {
                Button(role: .destructive) {
                  deleteCandidate = timestamp
                } label: {
                  Image(systemName: "trash")
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Delete session")
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

private extension String {
  var formattedSnapshotDate: String {
    let formatter = ISO8601DateFormatter()
    guard let date = formatter.date(from: self) else { return self }
    return date.formatted(date: .abbreviated, time: .shortened)
  }
}
