import ChipCountCore
import SwiftUI

struct DebtsView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = ProfileService()
  @State private var debts: [Debt] = []
  @State private var errorMessage: String?
  @State private var isLoading = false

  private var owedToYou: [Debt] { debts.filter { $0.creditorId == authStore.currentUser?.id } }
  private var youOwe: [Debt] { debts.filter { $0.debtorId == authStore.currentUser?.id } }

  var body: some View {
    List {
      header

      SectionHeaderLabel("Money Owed To You", systemImage: "arrow.down.left")
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
      debtRows(owedToYou, incoming: true)

      SectionHeaderLabel("Money You Owe", systemImage: "arrow.up.right")
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 16, leading: 20, bottom: 8, trailing: 20))
      debtRows(youOwe, incoming: false)

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
    .refreshable { await load() }
    .task { await load() }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 4) {
      ChipOverline("Settlements")
      Text("Debts")
        .font(.chipHeadingLg)
        .tracking(ChipTracking.headingLg)
        .foregroundStyle(Color.chipInk)
    }
    .padding(.top, 8)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 12, trailing: 20))
  }

  @ViewBuilder
  private func debtRows(_ rows: [Debt], incoming: Bool) -> some View {
    if rows.isEmpty {
      Text(incoming ? "Nobody owes you right now." : "You do not owe anyone right now.")
        .font(.chipFootnote)
        .foregroundStyle(Color.chipDriftwood)
        .frame(maxWidth: .infinity, alignment: .leading)
        .warmSandCard(padding: 18)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 4, trailing: 20))
    } else {
      ForEach(rows) { debt in
        VStack(alignment: .leading, spacing: 12) {
          HStack(alignment: .firstTextBaseline) {
            Text(debt.amount.chipCountCurrency)
              .font(.chipMono(20, medium: true))
              .foregroundStyle(incoming ? Color.chipPositive : Color.chipNegative)
            Text(incoming
              ? "from \(debt.debtor?.displayName ?? "Someone")"
              : "to \(debt.creditor?.displayName ?? "Someone")")
              .font(.chipFootnote)
              .foregroundStyle(Color.chipDriftwood)
            Spacer()
          }
          Text(debt.game?.description ?? debt.game?.shortCode ?? "Poker table")
            .font(.chipMono(11))
            .foregroundStyle(Color.chipFog)
          if incoming {
            Button("Mark Settled") { Task { await settle(debt) } }
              .buttonStyle(.chipFilledCompact)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .warmSandCard(padding: 16)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
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
