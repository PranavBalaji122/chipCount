import ChipCountCore
import SwiftUI

struct DebtsView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = ProfileService()
  @State private var debts: [Debt] = []
  @State private var errorMessage: String?
  @State private var isLoading = false

  var body: some View {
    List {
      Section("Money owed to you") {
        debtRows(debts.filter { $0.creditorId == authStore.currentUser?.id }, incoming: true)
      }

      Section("Money you owe") {
        debtRows(debts.filter { $0.debtorId == authStore.currentUser?.id }, incoming: false)
      }

      if let errorMessage {
        Section {
          Text(errorMessage)
            .foregroundStyle(.red)
        }
      }
    }
    .navigationTitle("Debts")
    .refreshable {
      await load()
    }
    .task {
      await load()
    }
  }

  @ViewBuilder
  private func debtRows(_ rows: [Debt], incoming: Bool) -> some View {
    if rows.isEmpty {
      Text(incoming ? "Nobody owes you right now." : "You do not owe anyone right now.")
        .foregroundStyle(.secondary)
    } else {
      ForEach(rows) { debt in
        VStack(alignment: .leading, spacing: 8) {
          HStack {
            Text(debt.amount.chipCountCurrency)
              .font(.headline)
              .foregroundStyle(incoming ? .green : .red)
            Text(incoming ? "from \(debt.debtor?.displayName ?? "Someone")" : "to \(debt.creditor?.displayName ?? "Someone")")
              .foregroundStyle(.secondary)
          }
          Text(debt.game?.description ?? debt.game?.shortCode ?? "Poker table")
            .font(.caption)
            .foregroundStyle(.secondary)
          if incoming {
            Button("Mark Settled") {
              Task { await settle(debt) }
            }
            .buttonStyle(.borderedProminent)
          }
        }
      }
    }
  }

  private func load() async {
    guard let userId = authStore.currentUser?.id else { return }
    isLoading = true
    defer { isLoading = false }

    do {
      debts = try await service.fetchDebts(userId: userId)
      errorMessage = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func settle(_ debt: Debt) async {
    do {
      try await service.settleDebt(id: debt.id)
      debts.removeAll { $0.id == debt.id }
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}
