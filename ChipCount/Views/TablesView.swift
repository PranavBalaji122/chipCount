import SwiftUI

struct TablesView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = GameService()
  @State private var memberships: [TableMembership] = []
  @State private var selectedGame: Game?
  @State private var showingCreate = false
  @State private var showingJoin = false
  @State private var gamePendingDeletion: Game?
  @State private var gamePendingRename: Game?
  @State private var errorMessage: String?
  @State private var isLoading = false

  private var activeCount: Int { memberships.filter { $0.game.status == .active }.count }

  var body: some View {
    List {
      headerBlock
      statTiles
      sectionHeaderRow

      if memberships.isEmpty && !isLoading {
        emptyState
      } else {
        ForEach(memberships) { membership in
          Button {
            selectedGame = membership.game
          } label: {
            TableRow(membership: membership, currentUserId: authStore.currentUser?.id)
          }
          .buttonStyle(.plain)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20))
          .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if isHost(membership) {
              Button(role: .destructive) {
                gamePendingDeletion = membership.game
              } label: {
                Label("Delete", systemImage: "trash")
              }
              Button {
                gamePendingRename = membership.game
              } label: {
                Label("Rename", systemImage: "pencil")
              }
              .tint(Color.chipDriftwood)
            }
          }
        }
      }

      if let errorMessage {
        Text(errorMessage)
          .font(.chipFootnote)
          .foregroundStyle(Color.chipNegative)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
      }

      Color.clear.frame(height: 8)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
    .listStyle(.plain)
    .environment(\.defaultMinListRowHeight, 0)
    .chipScreenBackground()
    .toolbar(.hidden, for: .navigationBar)
    .safeAreaInset(edge: .bottom) { bottomBar }
    .refreshable { await loadTables() }
    .task { await loadTables() }
    .sheet(isPresented: $showingCreate) {
      CreateTableSheet { name in await createTable(name: name) }
    }
    .sheet(isPresented: $showingJoin) {
      JoinTableSheet { code, buyIn in await joinTable(code: code, buyIn: buyIn) }
    }
    .sheet(item: $gamePendingRename) { game in
      RenameTableSheet(game: game) { name in await renameTable(game: game, name: name) }
    }
    .alert(
      "End Table?",
      isPresented: Binding(
        get: { gamePendingDeletion != nil },
        set: { if !$0 { gamePendingDeletion = nil } }
      ),
      presenting: gamePendingDeletion
    ) { game in
      Button("End Table", role: .destructive) {
        Task { await endTable(game: game) }
      }
      Button("Cancel", role: .cancel) {}
    } message: { game in
      Text("End \(game.description ?? "Poker Table") for everyone and remove it from your active tables? This cannot be undone.")
    }
    .navigationDestination(item: $selectedGame) { game in
      GameRoomView(gameId: game.id)
    }
  }

  // MARK: - Sections

  private var headerBlock: some View {
    VStack(alignment: .leading, spacing: 14) {
      ChipWordmark(size: 20)
      VStack(alignment: .leading, spacing: 4) {
        ChipOverline("Command Central")
        Text(welcomeTitle)
          .font(.chipHeadingLg)
          .tracking(ChipTracking.headingLg)
          .foregroundStyle(Color.chipInk)
      }
    }
    .padding(.top, 8)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 16, trailing: 20))
  }

  private var statTiles: some View {
    HStack(spacing: 12) {
      StatTile(label: "Total Tables", value: "\(memberships.count)", filled: false)
      StatTile(label: "Active Sessions", value: String(format: "%02d", activeCount), filled: true)
    }
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 20, trailing: 20))
  }

  private var sectionHeaderRow: some View {
    SectionHeaderLabel("Active Tables", trailing: nil)
      .listRowBackground(Color.clear)
      .listRowSeparator(.hidden)
      .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("No active tables")
        .font(.chipSubheading)
        .foregroundStyle(Color.chipInk)
      Text("Create a table or join one with a game ID.")
        .font(.chipFootnote)
        .foregroundStyle(Color.chipDriftwood)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 20)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
  }

  private var bottomBar: some View {
    HStack(spacing: 12) {
      Button { showingCreate = true } label: {
        Label("Create Table", systemImage: "plus")
      }
      .buttonStyle(.chipFilled)

      Button { showingJoin = true } label: {
        Text("Join")
      }
      .buttonStyle(PillButtonStyle(variant: .outline, fullWidth: false))
    }
    .padding(.horizontal, 20)
    .padding(.top, 10)
    .padding(.bottom, 6)
    .background(
      Color.chipParchment
        .overlay(Rectangle().fill(Color.chipAshBorder).frame(height: 1), alignment: .top)
    )
  }

  private var welcomeTitle: String {
    if let name = authStore.profile?.displayName,
       let firstName = name.split(whereSeparator: \.isWhitespace).first {
      return "Welcome, \(firstName)"
    }
    return "Welcome"
  }

  // MARK: - Actions (unchanged)

  private func loadTables() async {
    guard let userId = authStore.currentUser?.id else { return }
    isLoading = true
    defer { isLoading = false }

    do {
      memberships = try await service.listTables(userId: userId)
      errorMessage = nil
    } catch is CancellationError {
      // Ignore
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func createTable(name: String?) async {
    guard let userId = authStore.currentUser?.id else { return }

    do {
      let game = try await service.createTable(hostId: userId, description: name)
      showingCreate = false
      await loadTables()
      selectedGame = game
    } catch is CancellationError {
      // Ignore
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func renameTable(game: Game, name: String) async {
    guard let userId = authStore.currentUser?.id, game.hostId == userId else { return }

    do {
      try await service.renameTable(gameId: game.id, hostId: userId, description: name)
      gamePendingRename = nil
      await loadTables()
    } catch is CancellationError {
      // Ignore
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func endTable(game: Game) async {
    guard let userId = authStore.currentUser?.id, game.hostId == userId else { return }

    do {
      try await service.endTable(gameId: game.id)
      gamePendingDeletion = nil
      await loadTables()
    } catch is CancellationError {
      // Ignore
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func isHost(_ membership: TableMembership) -> Bool {
    membership.game.hostId == authStore.currentUser?.id
  }

  private func joinTable(code: String, buyIn: Double) async {
    guard let userId = authStore.currentUser?.id else { return }

    do {
      let game = try await service.joinTable(shortCode: code, userId: userId, buyIn: buyIn)
      showingJoin = false
      await loadTables()
      selectedGame = game
    } catch is CancellationError {
      // Ignore
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}

// MARK: - Row & tiles

private struct StatTile: View {
  let label: String
  let value: String
  let filled: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(label.uppercased())
        .font(.chipOverline)
        .tracking(ChipTracking.overline)
        .foregroundStyle(filled ? Color.chipParchment.opacity(0.7) : Color.chipDriftwood)
      Text(value)
        .font(.chipHeading)
        .foregroundStyle(filled ? Color.chipParchment : Color.chipInk)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(filled ? Color.chipInk : Color.chipWarmSand)
    .clipShape(RoundedRectangle(cornerRadius: ChipRadius.card, style: .continuous))
  }
}

private struct TableRow: View {
  let membership: TableMembership
  let currentUserId: String?

  private var isHost: Bool { membership.game.hostId == currentUserId }

  var body: some View {
    HStack(spacing: 14) {
      IconBadge(systemImage: isHost ? "crown.fill" : "person.2.fill", size: 44)

      VStack(alignment: .leading, spacing: 5) {
        Text(membership.game.description ?? "Poker Table")
          .font(.chipSubheading)
          .foregroundStyle(Color.chipInk)
          .lineLimit(1)
        HStack(spacing: 8) {
          Text("ID \(membership.game.shortCode)")
            .font(.chipMono(11))
            .foregroundStyle(Color.chipDriftwood)
          StatusTag(text: statusText, filled: false)
          if isHost {
            StatusTag(text: "Host", filled: true)
          }
        }
      }

      Spacer(minLength: 8)

      Image(systemName: "chevron.right")
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Color.chipFog)
    }
    .warmSandCard(padding: 14)
    .contentShape(Rectangle())
  }

  private var statusText: String {
    membership.status == .denied ? "Removed" : membership.game.status.rawValue.capitalized
  }
}

// MARK: - Sheets

private struct CreateTableSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var tableName = ""
  @State private var isSubmitting = false
  let onCreate: (String?) async -> Void

  var body: some View {
    SheetScaffold(
      title: "New Table",
      footer: "Optional. Players will see this before joining.",
      confirmTitle: "Create",
      isSubmitting: isSubmitting,
      canConfirm: true,
      onCancel: { dismiss() },
      onConfirm: {
        isSubmitting = true
        await onCreate(tableName)
        isSubmitting = false
      }
    ) {
      LabeledField(label: "Table Name") {
        TextField("Friday Night Poker", text: $tableName)
      }
    }
  }
}

private struct JoinTableSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var code = ""
  @State private var buyIn = 0.0
  @State private var isSubmitting = false
  let onJoin: (String, Double) async -> Void

  var body: some View {
    SheetScaffold(
      title: "Join Table",
      footer: "Your buy-in is sent to the host for approval.",
      confirmTitle: "Send",
      isSubmitting: isSubmitting,
      canConfirm: !code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && buyIn >= 0,
      onCancel: { dismiss() },
      onConfirm: {
        isSubmitting = true
        await onJoin(code, buyIn)
        isSubmitting = false
      }
    ) {
      LabeledField(label: "Game ID") {
        TextField("a1b2c3d4", text: $code)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
      }
      LabeledField(label: "Buy-in") {
        TextField("0", value: $buyIn, format: .number)
          .keyboardType(.decimalPad)
      }
    }
  }
}

private struct RenameTableSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var tableName: String
  @State private var isSubmitting = false
  let onRename: (String) async -> Void

  init(game: Game, onRename: @escaping (String) async -> Void) {
    _tableName = State(initialValue: game.description ?? "")
    self.onRename = onRename
  }

  var body: some View {
    SheetScaffold(
      title: "Rename Table",
      footer: "Leave this blank to use the default Poker Table name.",
      confirmTitle: "Save",
      isSubmitting: isSubmitting,
      canConfirm: true,
      onCancel: { dismiss() },
      onConfirm: {
        isSubmitting = true
        await onRename(tableName)
        isSubmitting = false
      }
    ) {
      LabeledField(label: "Table Name") {
        TextField("Friday Night Poker", text: $tableName)
      }
    }
  }
}
