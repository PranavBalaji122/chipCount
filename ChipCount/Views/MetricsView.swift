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

        SectionHeaderLabel(isHost ? "All Sessions" : "Your Sessions", systemImage: "clock.arrow.circlepath")
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(EdgeInsets(top: 12, leading: 20, bottom: 8, trailing: 20))

        if sessions.isEmpty {
          Text("No closed sessions yet.")
            .font(.chipFootnote)
            .foregroundStyle(Color.chipDriftwood)
            .frame(maxWidth: .infinity, alignment: .leading)
            .warmSandCard(padding: 18)
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(rowInsets)
        } else {
          ForEach(sessions) { session in
            NavigationLink {
              SessionMetricsView(session: session)
            } label: {
              SessionHistoryRow(session: session)
            }
            .buttonStyle(.plain)
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(rowInsets)
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
      } else if isLoading {
        ProgressView()
          .tint(Color.chipInk)
          .frame(maxWidth: .infinity)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
      }

      if let errorMessage {
        Text(errorMessage)
          .font(.chipFootnote)
          .foregroundStyle(Color.chipNegative)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(rowInsets)
      }
    }
    .listStyle(.plain)
    .environment(\.defaultMinListRowHeight, 0)
    .chipScreenBackground()
    .navigationTitle("Metrics")
    .navigationBarTitleDisplayMode(.inline)
    .refreshable { await load() }
    .task { await load() }
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

  private var rowInsets: EdgeInsets { EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20) }

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
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(session.timestamp.formattedSnapshotDate)
          .font(.chipSubheading)
          .foregroundStyle(Color.chipInk)
        Spacer()
        Image(systemName: "chevron.right")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Color.chipFog)
      }
      Text(session.previewNames)
        .font(.chipFootnote)
        .foregroundStyle(Color.chipDriftwood)
        .lineLimit(1)
      HStack(spacing: 8) {
        StatusTag(text: "\(session.players.count) players")
        Text("Pot \(session.totalPot.chipCountCurrency)")
          .font(.chipMono(11))
          .foregroundStyle(Color.chipDriftwood)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 16)
    .contentShape(Rectangle())
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
      summaryCard
      playersCard
      transfersCard
      cashFlowCard
      netResultsCard

      Color.clear.frame(height: 8)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
    .listStyle(.plain)
    .environment(\.defaultMinListRowHeight, 0)
    .chipScreenBackground()
    .navigationTitle("Session")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var summaryCard: some View {
    VStack(alignment: .leading, spacing: 14) {
      summaryRow("Closed", session.timestamp.formattedSnapshotDate)
      summaryRow("Players", "\(session.players.count)")
      summaryRow("Total pot", session.totalPot.chipCountCurrency)
      summaryRow("Slippage", (payout?.slippage ?? 0).chipCountCurrency)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .cardRow(top: 12)
  }

  private func summaryRow(_ label: String, _ value: String) -> some View {
    HStack {
      Text(label.uppercased())
        .font(.chipOverline).tracking(ChipTracking.overline)
        .foregroundStyle(Color.chipDriftwood)
      Spacer()
      Text(value)
        .font(.chipMono(13))
        .foregroundStyle(Color.chipInk)
    }
  }

  private var playersCard: some View {
    VStack(alignment: .leading, spacing: 14) {
      SectionHeaderLabel("Players")
      ForEach(summaries) { player in
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Text(player.displayName)
              .font(.chipBodyMedium)
              .foregroundStyle(Color.chipInk)
            Spacer()
            Text(player.net.chipCountCurrency)
              .font(.chipMono(15, medium: true))
              .foregroundStyle(player.net.chipAmountColor)
          }
          Text("In \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
            .font(.chipFootnote)
            .foregroundStyle(Color.chipDriftwood)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .cardRow()
  }

  private var transfersCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      SectionHeaderLabel("Who Owes Whom", systemImage: "arrow.left.arrow.right")
      if transfers.isEmpty {
        Text("No payouts are needed.")
          .font(.chipFootnote)
          .foregroundStyle(Color.chipDriftwood)
      } else {
        ForEach(transfers) { transfer in
          HStack(spacing: 6) {
            Text(transfer.payer).foregroundStyle(Color.chipDriftwood)
            Image(systemName: "arrow.right").font(.system(size: 9)).foregroundStyle(Color.chipFog)
            Text(transfer.amount.chipCountCurrency).foregroundStyle(Color.chipInk)
            Image(systemName: "arrow.right").font(.system(size: 9)).foregroundStyle(Color.chipFog)
            Text(transfer.recipient).foregroundStyle(Color.chipDriftwood)
            Spacer(minLength: 0)
          }
          .font(.chipMono(11))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .cardRow()
  }

  private var cashFlowCard: some View {
    VStack(alignment: .leading, spacing: 14) {
      SectionHeaderLabel("Cash Flow")
      Chart {
        ForEach(session.players) { player in
          BarMark(x: .value("Player", player.name), y: .value("Amount", player.cashIn))
            .foregroundStyle(by: .value("Amount Type", "Cash In"))
            .position(by: .value("Amount Type", "Cash In"))
          BarMark(x: .value("Player", player.name), y: .value("Amount", player.cashOut))
            .foregroundStyle(by: .value("Amount Type", "Cash Out"))
            .position(by: .value("Amount Type", "Cash Out"))
        }
      }
      .chartForegroundStyleScale(["Cash In": Color.chipInk, "Cash Out": Color.chipFog])
      .frame(height: 220)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .cardRow()
  }

  private var netResultsCard: some View {
    VStack(alignment: .leading, spacing: 14) {
      SectionHeaderLabel("Net Results")
      Chart(summaries) { player in
        BarMark(x: .value("Player", player.displayName), y: .value("Net", player.net))
          .foregroundStyle(player.net >= 0 ? Color.chipPositive : Color.chipNegative)
      }
      .frame(height: 220)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .cardRow()
  }
}

private extension View {
  func cardRow(top: CGFloat = 0) -> some View {
    listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(EdgeInsets(top: top, leading: 20, bottom: 12, trailing: 20))
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
