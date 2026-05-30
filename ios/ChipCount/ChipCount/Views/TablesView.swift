import SwiftUI

struct TablesView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = GameService()
  @State private var memberships: [TableMembership] = []
  @State private var selectedGame: Game?
  @State private var showingCreate = false
  @State private var showingJoin = false
  @State private var errorMessage: String?
  @State private var isLoading = false

  var body: some View {
    List {
      Section {
        Button {
          showingCreate = true
        } label: {
          Label("Create Table", systemImage: "plus.circle.fill")
        }

        Button {
          showingJoin = true
        } label: {
          Label("Join with Game ID", systemImage: "arrow.right.circle.fill")
        }
      }

      Section("Active Tables") {
        if memberships.isEmpty && !isLoading {
          ContentUnavailableView("No active tables", systemImage: "tablecells", description: Text("Create a table or join one with a game ID."))
        } else {
          ForEach(memberships) { membership in
            Button {
              selectedGame = membership.game
            } label: {
              TableRow(membership: membership, currentUserId: authStore.currentUser?.id)
            }
            .buttonStyle(.plain)
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
    .navigationTitle("Tables")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          Task { await loadTables() }
        } label: {
          Image(systemName: "arrow.clockwise")
        }
      }
    }
    .refreshable {
      await loadTables()
    }
    .task {
      await loadTables()
    }
    .sheet(isPresented: $showingCreate) {
      CreateTableSheet { name, guests in
        await createTable(name: name, guests: guests)
      }
    }
    .sheet(isPresented: $showingJoin) {
      JoinTableSheet { code, buyIn in
        await joinTable(code: code, buyIn: buyIn)
      }
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
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func createTable(name: String?, guests: [String]) async {
    guard let userId = authStore.currentUser?.id else { return }

    do {
      let game = try await service.createTable(hostId: userId, description: name, guests: guests)
      showingCreate = false
      await loadTables()
      selectedGame = game
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func joinTable(code: String, buyIn: Double) async {
    guard let userId = authStore.currentUser?.id else { return }

    do {
      let game = try await service.joinTable(shortCode: code, userId: userId, buyIn: buyIn)
      showingJoin = false
      await loadTables()
      selectedGame = game
    } catch {
      errorMessage = error.localizedDescription
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
          .font(.caption.weight(.semibold))
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(roleColor.opacity(0.14))
          .foregroundStyle(roleColor)
          .clipShape(Capsule())
        Text(membership.game.status.rawValue.capitalized)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
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
  @State private var guestName = ""
  @State private var guests: [String] = []
  @State private var isSubmitting = false
  let onCreate: (String?, [String]) async -> Void

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
        
        Section {
          HStack {
            TextField("Guest name", text: $guestName)
            Button {
              let trimmed = guestName.trimmingCharacters(in: .whitespacesAndNewlines)
              if !trimmed.isEmpty, !guests.contains(where: { $0.caseInsensitiveCompare(trimmed) == .orderedSame }) {
                guests.append(trimmed)
                guestName = ""
              }
            } label: {
              Image(systemName: "person.badge.plus")
            }
            .disabled(guestName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          }
          
          ForEach(guests, id: \.self) { guest in
            HStack {
              Text(guest)
              Spacer()
              Button(role: .destructive) {
                guests.removeAll { $0 == guest }
              } label: {
                Image(systemName: "trash")
              }
            }
          }
        } header: {
          Text("Guests")
        } footer: {
          Text("Optional. Pre-add guests who don't have accounts.")
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
              var finalGuests = guests
              let trimmed = guestName.trimmingCharacters(in: .whitespacesAndNewlines)
              if !trimmed.isEmpty, !finalGuests.contains(where: { $0.caseInsensitiveCompare(trimmed) == .orderedSame }) {
                finalGuests.append(trimmed)
              }
              await onCreate(tableName, finalGuests)
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
