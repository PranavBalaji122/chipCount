import ChipCountCore
import SwiftUI

struct GameRoomView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase
  @State private var service = GameService()
  @State private var snapshot: GameSnapshot?
  @State private var payout: Payout?
  @State private var errorMessage: String?
  @State private var isLoading = false
  @State private var guestName = ""
  @State private var guestCashIn = 0.0
  @State private var guestCashOut = 0.0
  @State private var transferCandidate: GamePlayer?
  @State private var showingCloseSessionConfirmation = false
  @State private var showingEndGameConfirmation = false
  @State private var realtimeTask: Task<Void, Never>?

  let gameId: String

  var body: some View {
    List {
      if let snapshot {
        headerSection(snapshot)
        pendingSection(snapshot)
        playerSection(snapshot)
        guestSection(snapshot)
        payoutSection
        hostActions(snapshot)
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
    .navigationTitle(snapshot?.game.description ?? "Table")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          Task { await load() }
        } label: {
          Image(systemName: "arrow.clockwise")
        }
      }
    }
    .refreshable {
      await load()
    }
    .task {
      await load()
      realtimeTask = await service.observeGame(gameId: gameId) {
        await load()
      }
    }
    .onDisappear {
      realtimeTask?.cancel()
      realtimeTask = nil
    }
    .onChange(of: scenePhase) { _, newPhase in
      if newPhase == .active {
        Task { await load() }
      }
    }
    .confirmationDialog(
      "Transfer Host?",
      isPresented: Binding(
        get: { transferCandidate != nil },
        set: { if !$0 { transferCandidate = nil } }
      ),
      presenting: transferCandidate
    ) { player in
      Button("Transfer to \(player.displayName ?? String(player.userId.prefix(8)))", role: .destructive) {
        Task { await transferHost(to: player) }
      }
    } message: { player in
      Text("\(player.displayName ?? String(player.userId.prefix(8))) will immediately control this table.")
    }
    .confirmationDialog("Close Session?", isPresented: $showingCloseSessionConfirmation) {
      Button("Close Session") {
        Task { await closeSession() }
      }
    } message: {
      Text("This saves the current results and debts. You can reopen the session later.")
    }
    .confirmationDialog("End Game?", isPresented: $showingEndGameConfirmation) {
      Button("End Game", role: .destructive) {
        Task { await endGame() }
      }
    } message: {
      Text("This saves the final results and debts, then removes the game from your tables. This cannot be reopened.")
    }
  }

  @ViewBuilder
  private func headerSection(_ snapshot: GameSnapshot) -> some View {
    Section {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.game.description ?? "Poker Table")
              .font(.headline)
            Text("Game ID \(snapshot.game.shortCode)")
              .font(.caption.monospaced())
              .foregroundStyle(.secondary)
          }
          Spacer()
          Text(snapshot.game.status.rawValue.capitalized)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor(snapshot.game.status).opacity(0.15))
            .foregroundStyle(statusColor(snapshot.game.status))
            .clipShape(Capsule())
        }

      }
    }

    Section {
      ShareLink(item: inviteURL(for: snapshot.game)) {
        Label("Share Invite", systemImage: "square.and.arrow.up")
      }

      NavigationLink {
        MetricsView(gameId: snapshot.game.id, isHost: isHost(snapshot))
      } label: {
        Label("Metrics", systemImage: "chart.line.uptrend.xyaxis")
      }
    }
  }

  @ViewBuilder
  private func pendingSection(_ snapshot: GameSnapshot) -> some View {
    if isHost(snapshot), !snapshot.pendingPlayers.isEmpty {
      Section("Pending Approval") {
        ForEach(snapshot.pendingPlayers) { player in
          HStack {
            VStack(alignment: .leading) {
              Text(player.displayName ?? String(player.userId.prefix(8)))
              Text("Requested in \(player.requestedCashIn.chipCountCurrency), out \(player.requestedCashOut.chipCountCurrency)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Approve") {
              Task { await approve(player) }
            }
            .buttonStyle(.borderedProminent)

            Button("Deny", role: .destructive) {
              Task { await deny(player) }
            }
            .buttonStyle(.bordered)
          }
        }
      }
    }
  }

  @ViewBuilder
  private func playerSection(_ snapshot: GameSnapshot) -> some View {
    Section("Players") {
      ForEach(snapshot.players) { player in
        PlayerAmountRow(
          player: player,
          isHost: isHost(snapshot),
          isCurrentUser: player.userId == authStore.currentUser?.id,
          isClosed: snapshot.game.status == .closed,
          onSaveApproved: { cashIn, cashOut in
            await saveApproved(player: player, cashIn: cashIn, cashOut: cashOut)
          },
          onSaveRequested: { requestedIn, requestedOut in
            await saveRequested(player: player, requestedIn: requestedIn, requestedOut: requestedOut)
          },
          onRequestRejoin: {
            await requestRejoin()
          }
        )
      }
    }
  }

  @ViewBuilder
  private func guestSection(_ snapshot: GameSnapshot) -> some View {
    Section("Guests") {
      ForEach(snapshot.guests) { guest in
        HStack {
          VStack(alignment: .leading) {
            Text("\(guest.name) (guest)")
            Text("In \(guest.cashIn.chipCountCurrency), out \(guest.cashOut.chipCountCurrency)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Spacer()
          if isHost(snapshot), snapshot.game.status == .active {
            Button(role: .destructive) {
              Task { await removeGuest(guest) }
            } label: {
              Image(systemName: "trash")
            }
          }
        }
      }

      if isHost(snapshot), snapshot.game.status == .active {
        VStack(spacing: 10) {
          TextField("Guest name", text: $guestName)
          HStack {
            TextField("In", value: $guestCashIn, format: .number)
              .keyboardType(.decimalPad)
            TextField("Out", value: $guestCashOut, format: .number)
              .keyboardType(.decimalPad)
          }
          Button {
            Task { await addGuest() }
          } label: {
            Label("Add Guest", systemImage: "person.badge.plus")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.bordered)
          .disabled(guestName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
      }
    }
  }

  @ViewBuilder
  private var payoutSection: some View {
    if let payout {
      Section("Payout Summary") {
        Text("Slippage \(payout.slippage.chipCountCurrency)")
          .foregroundStyle(.secondary)
        ForEach(payout.players) { player in
          VStack(alignment: .leading, spacing: 6) {
            HStack {
              Text(player.displayName)
                .font(.headline)
              Spacer()
              Text(player.net.chipCountCurrency)
                .foregroundStyle(player.net >= 0 ? .green : .red)
            }
            ForEach(player.paidBy, id: \.target) { payment in
              Text("Receives \(payment.value.chipCountCurrency) from \(payment.target)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            ForEach(player.paidTo, id: \.target) { payment in
              Text("Pays \(payment.value.chipCountCurrency) to \(payment.target)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }
  }

  @ViewBuilder
  private func hostActions(_ snapshot: GameSnapshot) -> some View {
    if isHost(snapshot) {
      Section {
        if snapshot.game.status == .active {
          Button {
            showingCloseSessionConfirmation = true
          } label: {
            Label("Close Session", systemImage: "lock")
          }
        }

        if snapshot.game.status == .closed {
          Button {
            Task { await reopenSession() }
          } label: {
            Label("Reopen Session", systemImage: "lock.open")
          }
        }

        Button(role: .destructive) {
          showingEndGameConfirmation = true
        } label: {
          Label("End Game", systemImage: "xmark.circle")
        }
      }

      let transferCandidates = snapshot.approvedPlayers.filter { $0.userId != snapshot.game.hostId }
      if !transferCandidates.isEmpty {
        Section {
          ForEach(transferCandidates) { player in
            Button {
              transferCandidate = player
            } label: {
              Label(player.displayName ?? String(player.userId.prefix(8)), systemImage: "crown")
            }
          }
        } header: {
          Text("Transfer Host")
        } footer: {
          Text("The selected player immediately becomes the table host.")
        }
      }
    }
  }

  private func load() async {
    isLoading = true
    defer { isLoading = false }

    do {
      let next = try await service.loadGame(gameId: gameId)
      snapshot = next
      payout = service.payout(for: next)
      errorMessage = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func approve(_ player: GamePlayer) async {
    do {
      try await service.approvePlayer(player, gameId: gameId)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func deny(_ player: GamePlayer) async {
    do {
      try await service.denyPlayer(gameId: gameId, userId: player.userId)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func saveApproved(player: GamePlayer, cashIn: Double, cashOut: Double) async {
    do {
      try await service.updatePlayer(
        gameId: gameId,
        userId: player.userId,
        patch: PlayerPatch(cashIn: cashIn, cashOut: cashOut, requestedCashIn: cashIn, requestedCashOut: cashOut)
      )
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func saveRequested(player: GamePlayer, requestedIn: Double, requestedOut: Double) async {
    do {
      try await service.updatePlayer(
        gameId: gameId,
        userId: player.userId,
        patch: PlayerPatch(requestedCashIn: requestedIn, requestedCashOut: requestedOut)
      )
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func requestRejoin() async {
    guard let userId = authStore.currentUser?.id else { return }
    do {
      try await service.requestRejoin(gameId: gameId, userId: userId)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func addGuest() async {
    do {
      let newGuest = try await service.addGuest(
        gameId: gameId,
        name: guestName,
        cashIn: guestCashIn,
        cashOut: guestCashOut
      )
      // Optimistically update
      if var current = snapshot {
        current.guests.append(newGuest)
        snapshot = current
      }
      guestName = ""
      guestCashIn = 0
      guestCashOut = 0
      // We still call load in the background if we want, or rely on realtime
      // But let's just let realtime handle it or do it silently.
      // Doing it right here avoids the "disappearing" glitch if load() fetches stale data.
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func removeGuest(_ guest: GameGuest) async {
    do {
      try await service.removeGuest(id: guest.id)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func closeSession() async {
    do {
      try await service.closeSession(gameId: gameId)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func reopenSession() async {
    do {
      try await service.reopenSession(gameId: gameId)
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func endGame() async {
    do {
      try await service.endGame(gameId: gameId)
      dismiss()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func transferHost(to player: GamePlayer) async {
    do {
      try await service.transferHost(gameId: gameId, newHostId: player.userId)
      transferCandidate = nil
      await load()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func isHost(_ snapshot: GameSnapshot) -> Bool {
    snapshot.game.hostId == authStore.currentUser?.id
  }

  private func inviteURL(for game: Game) -> URL {
    AppConfig.webBaseURL.appending(path: "invite/\(game.shortCode)")
  }

  private func statusColor(_ status: GameStatus) -> Color {
    switch status {
    case .active: return .green
    case .closed: return .orange
    case .ended: return .secondary
    }
  }
}

private struct PlayerAmountRow: View {
  let player: GamePlayer
  let isHost: Bool
  let isCurrentUser: Bool
  let isClosed: Bool
  let onSaveApproved: (Double, Double) async -> Void
  let onSaveRequested: (Double, Double) async -> Void
  let onRequestRejoin: () async -> Void

  @State private var cashIn: Double
  @State private var cashOut: Double
  @State private var requestedIn: Double
  @State private var requestedOut: Double
  @State private var isSaving = false

  init(
    player: GamePlayer,
    isHost: Bool,
    isCurrentUser: Bool,
    isClosed: Bool,
    onSaveApproved: @escaping (Double, Double) async -> Void,
    onSaveRequested: @escaping (Double, Double) async -> Void,
    onRequestRejoin: @escaping () async -> Void
  ) {
    self.player = player
    self.isHost = isHost
    self.isCurrentUser = isCurrentUser
    self.isClosed = isClosed
    self.onSaveApproved = onSaveApproved
    self.onSaveRequested = onSaveRequested
    self.onRequestRejoin = onRequestRejoin
    _cashIn = State(initialValue: player.cashIn)
    _cashOut = State(initialValue: player.cashOut)
    _requestedIn = State(initialValue: player.requestedCashIn)
    _requestedOut = State(initialValue: player.requestedCashOut)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text(player.displayName ?? String(player.userId.prefix(8)))
          .font(.headline)
        Spacer()
        Text(player.status.rawValue.capitalized)
          .font(.caption)
          .foregroundStyle(player.status == .denied ? .red : .secondary)
      }

      if isHost, player.status == .approved {
        amountEditor(cashInTitle: "In", cashOutTitle: "Out", cashIn: $cashIn, cashOut: $cashOut, disabled: isClosed) {
          await onSaveApproved(cashIn, cashOut)
        }
      } else if isCurrentUser, player.status == .approved, !isClosed {
        amountEditor(cashInTitle: "Requested in", cashOutTitle: "Requested out", cashIn: $requestedIn, cashOut: $requestedOut, disabled: false) {
          await onSaveRequested(requestedIn, requestedOut)
        }
        Text("Approved: in \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else if isCurrentUser, player.status == .denied {
        Button("Request to Rejoin") {
          Task {
            isSaving = true
            await onRequestRejoin()
            isSaving = false
          }
        }
        .buttonStyle(.bordered)
      } else {
        Text("In \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }

  private func amountEditor(
    cashInTitle: String,
    cashOutTitle: String,
    cashIn: Binding<Double>,
    cashOut: Binding<Double>,
    disabled: Bool,
    save: @escaping () async -> Void
  ) -> some View {
    VStack(spacing: 8) {
      HStack {
        TextField(cashInTitle, value: cashIn, format: .number)
          .keyboardType(.decimalPad)
        TextField(cashOutTitle, value: cashOut, format: .number)
          .keyboardType(.decimalPad)
      }
      Button {
        Task {
          isSaving = true
          await save()
          isSaving = false
        }
      } label: {
        if isSaving {
          ProgressView()
            .frame(maxWidth: .infinity)
        } else {
          Text("Save Amounts")
            .frame(maxWidth: .infinity)
        }
      }
      .buttonStyle(.bordered)
      .disabled(disabled || isSaving)
    }
  }
}
