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

  var body: some View {
    List {
      Section {
        VStack(alignment: .leading, spacing: 4) {
          if let name = authStore.profile?.displayName,
             let firstName = name.split(whereSeparator: \.isWhitespace).first {
            Text("Welcome, \(firstName)")
              .font(.largeTitle.bold())
          } else {
            Text("Welcome")
              .font(.largeTitle.bold())
          }
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
      }

      Section {
        HStack(spacing: 16) {
          Button {
            showingCreate = true
          } label: {
            VStack(spacing: 12) {
              Image(systemName: "play.circle.fill")
                .symbolRenderingMode(.hierarchical)
                .font(.system(size: 40))
                .foregroundStyle(.green)
              
              VStack(spacing: 2) {
                Text("Create Table")
                  .font(.headline)
                  .foregroundStyle(.primary)
                Text("Start a new game")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
          }
          .buttonStyle(.plain)

          Button {
            showingJoin = true
          } label: {
            VStack(spacing: 12) {
              Image(systemName: "arrow.right.circle.fill")
                .symbolRenderingMode(.hierarchical)
                .font(.system(size: 40))
                .foregroundStyle(.secondary)
              
              VStack(spacing: 2) {
                Text("Join Table")
                  .font(.headline)
                  .foregroundStyle(.primary)
                Text("Enter a game ID")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
          }
          .buttonStyle(.plain)
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
      }

      Section("ACTIVE TABLES") {
        if memberships.isEmpty && !isLoading {
          ContentUnavailableView(
            "No active tables",
            systemImage: "tablecells",
            description: Text("Create a table or join one with a game ID.")
          )
          .listRowBackground(Color.clear)
        } else {
          ForEach(memberships) { membership in
            Button {
              selectedGame = membership.game
            } label: {
              TableRow(membership: membership, currentUserId: authStore.currentUser?.id)
            }
            .buttonStyle(.plain)
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
                .tint(.blue)
              }
            }
          }
        }
      }

      if let errorMessage {
        Section {
          Text(errorMessage)
            .foregroundStyle(.red)
        }
      }
    }
    .listStyle(.insetGrouped)
    .scrollContentBackground(.hidden)
    .background(Color(.systemGroupedBackground))
    .navigationTitle("Tables")
    .toolbar(.hidden, for: .navigationBar)
    .refreshable {
      await loadTables()
    }
    .task {
      await loadTables()
    }
    .sheet(isPresented: $showingCreate) {
      CreateTableSheet { name in
        await createTable(name: name)
      }
    }
    .sheet(isPresented: $showingJoin) {
      JoinTableSheet { code, buyIn in
        await joinTable(code: code, buyIn: buyIn)
      }
    }
    .sheet(item: $gamePendingRename) { game in
      RenameTableSheet(game: game) { name in
        await renameTable(game: game, name: name)
      }
    }
    .alert(
      "Delete Table?",
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
    NavigationStack {
      Form {
        Section {
          TextField("Friday Night Poker", text: $tableName)
        } header: {
          Text("Table Name")
        } footer: {
          Text("Leave this blank to use the default Poker Table name.")
        }
      }
      .navigationTitle("Rename Table")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
            .disabled(isSubmitting)
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            Task {
              isSubmitting = true
              await onRename(tableName)
              isSubmitting = false
            }
          }
          .disabled(isSubmitting)
        }
      }
    }
  }
}

private struct TableRow: View {
  let membership: TableMembership
  let currentUserId: String?

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(membership.game.description ?? "Poker Table")
          .font(.headline)
        Text("ID \(membership.game.shortCode)")
          .font(.caption.monospaced())
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text(role)
          .font(.caption2.weight(.bold))
          .textCase(.uppercase)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(roleColor.opacity(0.15))
          .foregroundStyle(roleColor)
          .clipShape(Capsule())
          
        if membership.status == .denied {
          Text("Removed")
            .font(.caption2)
            .foregroundStyle(.red)
        } else {
          Text(membership.game.status.rawValue.capitalized)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .contentShape(Rectangle())
  }

  private var role: String {
    if membership.game.hostId == currentUserId { return "Host" }
    switch membership.status {
    case .approved: return "Player"
    case .pending: return "Pending"
    case .denied: return "Removed"
    }
  }

  private var roleColor: Color {
    role == "Removed" ? .red : role == "Host" ? .green : .blue
  }
}

private struct CreateTableSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var tableName = ""
  @State private var isSubmitting = false
  let onCreate: (String?) async -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Friday Night Poker", text: $tableName)
        } header: {
          Text("Table Name")
        } footer: {
          Text("Optional. Players will see this before joining.")
        }
      }
      .navigationTitle("New Table")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Create") {
            Task {
              isSubmitting = true
              await onCreate(tableName)
              isSubmitting = false
            }
          }
          .disabled(isSubmitting)
        }
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
    NavigationStack {
      Form {
        Section {
          TextField("a1b2c3d4", text: $code)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
          TextField("Buy-in", value: $buyIn, format: .number)
            .keyboardType(.decimalPad)
        } header: {
          Text("Join Table")
        } footer: {
          Text("Your buy-in is sent to the host for approval.")
        }
      }
      .navigationTitle("Join")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Send") {
            Task {
              isSubmitting = true
              await onJoin(code, buyIn)
              isSubmitting = false
            }
          }
          .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || buyIn < 0 || isSubmitting)
        }
      }
    }
  }
}
