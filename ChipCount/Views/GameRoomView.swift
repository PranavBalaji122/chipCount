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
        payoutSection(snapshot)
        hostActions(snapshot)
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

      Color.clear.frame(height: 8)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
    .listStyle(.plain)
    .environment(\.defaultMinListRowHeight, 0)
    .chipScreenBackground()
    .navigationTitle("")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          Task { await load() }
        } label: {
          Image(systemName: "arrow.clockwise")
            .foregroundStyle(Color.chipInk)
        }
      }
    }
    .refreshable { await load() }
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

  private var rowInsets: EdgeInsets { EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20) }

  // MARK: - Header

  @ViewBuilder
  private func headerSection(_ snapshot: GameSnapshot) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 6) {
          Text(snapshot.game.description ?? "Poker Table")
            .font(.chipHeading)
            .tracking(ChipTracking.heading)
            .foregroundStyle(Color.chipInk)
          HStack(spacing: 8) {
            Text("ID \(snapshot.game.shortCode)")
              .font(.chipMono(11))
              .foregroundStyle(Color.chipDriftwood)
            StatusTag(text: snapshot.game.status.rawValue, filled: snapshot.game.status == .active)
          }
        }
        Spacer()
        ShareLink(item: inviteURL(for: snapshot.game)) {
          VStack(spacing: 4) {
            Image(systemName: "square.and.arrow.up")
              .font(.system(size: 16, weight: .medium))
            Text("Share")
              .font(.chipOverline)
              .tracking(ChipTracking.overline)
          }
          .foregroundStyle(Color.chipInk)
        }
      }

      HStack(spacing: 12) {
        potTile(label: "Total Pot", value: totalPot(snapshot).chipCountCurrency, filled: true)
        NavigationLink {
          MetricsView(gameId: snapshot.game.id, isHost: isHost(snapshot))
        } label: {
          HStack {
            VStack(alignment: .leading, spacing: 10) {
              Text("METRICS")
                .font(.chipOverline).tracking(ChipTracking.overline)
                .foregroundStyle(Color.chipDriftwood)
              Text("History")
                .font(.chipHeadingSm)
                .foregroundStyle(Color.chipInk)
            }
            Spacer()
            Image(systemName: "chart.line.uptrend.xyaxis")
              .foregroundStyle(Color.chipInk)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .warmSandCard(padding: 18)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.top, 4)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 16, trailing: 20))
  }

  private func potTile(label: String, value: String, filled: Bool) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(label.uppercased())
        .font(.chipOverline).tracking(ChipTracking.overline)
        .foregroundStyle(filled ? Color.chipParchment.opacity(0.7) : Color.chipDriftwood)
      Text(value)
        .font(.chipMono(22, medium: true))
        .foregroundStyle(filled ? Color.chipParchment : Color.chipInk)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(filled ? Color.chipInk : Color.chipWarmSand)
    .clipShape(RoundedRectangle(cornerRadius: ChipRadius.card, style: .continuous))
  }

  // MARK: - Pending

  @ViewBuilder
  private func pendingSection(_ snapshot: GameSnapshot) -> some View {
    if isHost(snapshot), !snapshot.pendingPlayers.isEmpty {
      SectionHeaderLabel("Pending Approvals", systemImage: "person.crop.circle.badge.questionmark")
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))

      ForEach(snapshot.pendingPlayers) { player in
        VStack(alignment: .leading, spacing: 12) {
          VStack(alignment: .leading, spacing: 3) {
            Text(player.displayName ?? String(player.userId.prefix(8)))
              .font(.chipBodyMedium)
              .foregroundStyle(Color.chipInk)
            Text("Requesting in \(player.requestedCashIn.chipCountCurrency), out \(player.requestedCashOut.chipCountCurrency)")
              .font(.chipFootnote)
              .foregroundStyle(Color.chipDriftwood)
          }
          HStack(spacing: 10) {
            Button("Approve") { Task { await approve(player) } }
              .buttonStyle(.chipFilledCompact)
            Button("Deny") { Task { await deny(player) } }
              .buttonStyle(.chipOutlineCompact)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .warmSandCard(padding: 16)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(rowInsets)
      }
    }
  }

  // MARK: - Players

  @ViewBuilder
  private func playerSection(_ snapshot: GameSnapshot) -> some View {
    SectionHeaderLabel(
      "Active Players",
      systemImage: "person.2",
      trailing: "\(snapshot.approvedPlayers.count) players"
    )
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))

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
        onRequestRejoin: { await requestRejoin() }
      )
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(rowInsets)
    }
  }

  // MARK: - Guests

  @ViewBuilder
  private func guestSection(_ snapshot: GameSnapshot) -> some View {
    if !snapshot.guests.isEmpty || (isHost(snapshot) && snapshot.game.status == .active) {
      SectionHeaderLabel("Guests", systemImage: "person.fill.questionmark")
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
    }

    ForEach(snapshot.guests) { guest in
      HStack {
        VStack(alignment: .leading, spacing: 3) {
          Text("\(guest.name) (guest)")
            .font(.chipBodyMedium)
            .foregroundStyle(Color.chipInk)
          Text("In \(guest.cashIn.chipCountCurrency), out \(guest.cashOut.chipCountCurrency)")
            .font(.chipFootnote)
            .foregroundStyle(Color.chipDriftwood)
        }
        Spacer()
        if isHost(snapshot), snapshot.game.status == .active {
          Button(role: .destructive) {
            Task { await removeGuest(guest) }
          } label: {
            Image(systemName: "trash")
              .foregroundStyle(Color.chipDriftwood)
          }
          .buttonStyle(.plain)
        }
      }
      .warmSandCard(padding: 14)
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(rowInsets)
    }

    if isHost(snapshot), snapshot.game.status == .active {
      VStack(spacing: 12) {
        TextField("Guest name", text: $guestName)
          .textFieldStyle(.chipFlat)
        HStack(spacing: 12) {
          AmountBox(label: "In", value: $guestCashIn)
          AmountBox(label: "Out", value: $guestCashOut)
        }
        Button {
          Task { await addGuest() }
        } label: {
          Label("Add Guest", systemImage: "person.badge.plus")
        }
        .buttonStyle(.chipOutline)
        .disabled(guestName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      }
      .warmSandCard(padding: 16)
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(rowInsets)
    }
  }

  // MARK: - Payout

  @ViewBuilder
  private func payoutSection(_ snapshot: GameSnapshot) -> some View {
    if let payout {
      SectionHeaderLabel("Payout Instructions", systemImage: "arrow.left.arrow.right")
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 12, leading: 20, bottom: 8, trailing: 20))

      VStack(alignment: .leading, spacing: 16) {
        Text("Slippage \(payout.slippage.chipCountCurrency)")
          .font(.chipFootnote)
          .foregroundStyle(Color.chipDriftwood)

        ForEach(payout.players) { player in
          VStack(alignment: .leading, spacing: 8) {
            HStack {
              Text(player.displayName)
                .font(.chipBodyMedium)
                .foregroundStyle(Color.chipInk)
              Spacer()
              Text(player.net.chipCountCurrency)
                .font(.chipMono(15, medium: true))
                .foregroundStyle(player.net.chipAmountColor)
            }
            ForEach(player.paidBy, id: \.target) { payment in
              transferLine(from: payment.target, to: player.displayName, amount: payment.value)
            }
            ForEach(player.paidTo, id: \.target) { payment in
              transferLine(from: player.displayName, to: payment.target, amount: payment.value)
            }
          }
          if player.id != payout.players.last?.id {
            Rectangle().fill(Color.chipAshBorder).frame(height: 1)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .warmSandCard(padding: 18)
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(rowInsets)
    }
  }

  private func transferLine(from payer: String, to recipient: String, amount: Double) -> some View {
    HStack(spacing: 6) {
      Text(payer).foregroundStyle(Color.chipDriftwood)
      Image(systemName: "arrow.right").font(.system(size: 9))
        .foregroundStyle(Color.chipFog)
      Text(amount.chipCountCurrency).foregroundStyle(Color.chipInk)
      Image(systemName: "arrow.right").font(.system(size: 9))
        .foregroundStyle(Color.chipFog)
      Text(recipient).foregroundStyle(Color.chipDriftwood)
      Spacer(minLength: 0)
    }
    .font(.chipMono(11))
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }

  // MARK: - Host actions

  @ViewBuilder
  private func hostActions(_ snapshot: GameSnapshot) -> some View {
    if isHost(snapshot) {
      VStack(spacing: 12) {
        if snapshot.game.status == .active {
          Button { showingCloseSessionConfirmation = true } label: {
            Label("Close Session", systemImage: "lock")
          }
          .buttonStyle(.chipOutline)
        }
        if snapshot.game.status == .closed {
          Button { Task { await reopenSession() } } label: {
            Label("Reopen Session", systemImage: "lock.open")
          }
          .buttonStyle(.chipOutline)
        }
        Button { showingEndGameConfirmation = true } label: {
          Label("End Game", systemImage: "xmark.circle")
        }
        .buttonStyle(.chipFilled)
      }
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(EdgeInsets(top: 16, leading: 20, bottom: 8, trailing: 20))

      let transferCandidates = snapshot.approvedPlayers.filter { $0.userId != snapshot.game.hostId }
      if !transferCandidates.isEmpty {
        SectionHeaderLabel("Transfer Host", systemImage: "crown")
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(EdgeInsets(top: 12, leading: 20, bottom: 8, trailing: 20))

        ForEach(transferCandidates) { player in
          Button {
            transferCandidate = player
          } label: {
            HStack {
              Text(player.displayName ?? String(player.userId.prefix(8)))
                .font(.chipBodyMedium)
                .foregroundStyle(Color.chipInk)
              Spacer()
              Image(systemName: "crown")
                .foregroundStyle(Color.chipDriftwood)
            }
            .warmSandCard(padding: 14)
          }
          .buttonStyle(.plain)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(rowInsets)
        }
      }
    }
  }

  // MARK: - Derived

  private func totalPot(_ snapshot: GameSnapshot) -> Double {
    snapshot.approvedPlayers.reduce(0) { $0 + $1.cashIn }
      + snapshot.guests.reduce(0) { $0 + $1.cashIn }
  }

  // MARK: - Actions (unchanged)

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
      if var current = snapshot {
        current.guests.append(newGuest)
        snapshot = current
      }
      guestName = ""
      guestCashIn = 0
      guestCashOut = 0
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
}

// MARK: - Amount input

/// Small labeled monospace numeric input box.
struct AmountBox: View {
  let label: String
  @Binding var value: Double

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label.uppercased())
        .font(.chipOverline).tracking(ChipTracking.overline)
        .foregroundStyle(Color.chipDriftwood)
      TextField("0", value: $value, format: .number)
        .keyboardType(.decimalPad)
        .font(.chipMono(15, medium: true))
        .foregroundStyle(Color.chipInk)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: ChipRadius.input, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: ChipRadius.input, style: .continuous)
            .strokeBorder(Color.chipAshBorder, lineWidth: 1)
        )
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
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text(player.displayName ?? String(player.userId.prefix(8)))
          .font(.chipBodyMedium)
          .foregroundStyle(Color.chipInk)
        Spacer()
        Text(player.status.rawValue.capitalized)
          .font(.chipOverline)
          .tracking(ChipTracking.overline)
          .foregroundStyle(player.status == .denied ? Color.chipNegative : Color.chipFog)
      }

      if isHost, player.status == .approved {
        amountEditor(inTitle: "Cash-in", outTitle: "Cash-out", cashIn: $cashIn, cashOut: $cashOut, disabled: isClosed) {
          await onSaveApproved(cashIn, cashOut)
        }
      } else if isCurrentUser, player.status == .approved, !isClosed {
        amountEditor(inTitle: "Requested in", outTitle: "Requested out", cashIn: $requestedIn, cashOut: $requestedOut, disabled: false) {
          await onSaveRequested(requestedIn, requestedOut)
        }
        Text("Approved: in \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
          .font(.chipFootnote)
          .foregroundStyle(Color.chipDriftwood)
      } else if isCurrentUser, player.status == .denied {
        Button("Request to Rejoin") {
          Task {
            isSaving = true
            await onRequestRejoin()
            isSaving = false
          }
        }
        .buttonStyle(.chipOutlineCompact)
      } else {
        Text("In \(player.cashIn.chipCountCurrency), out \(player.cashOut.chipCountCurrency)")
          .font(.chipFootnote)
          .foregroundStyle(Color.chipDriftwood)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 16)
  }

  private func amountEditor(
    inTitle: String,
    outTitle: String,
    cashIn: Binding<Double>,
    cashOut: Binding<Double>,
    disabled: Bool,
    save: @escaping () async -> Void
  ) -> some View {
    VStack(spacing: 10) {
      HStack(spacing: 12) {
        AmountBox(label: inTitle, value: cashIn)
        AmountBox(label: outTitle, value: cashOut)
      }
      Button {
        Task {
          isSaving = true
          await save()
          isSaving = false
        }
      } label: {
        if isSaving {
          ProgressView().tint(Color.chipInk)
        } else {
          Text("Save Amounts")
        }
      }
      .buttonStyle(.chipOutline)
      .disabled(disabled || isSaving)
    }
  }
}
