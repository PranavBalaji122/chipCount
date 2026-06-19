import ChipCountCore
import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var service = ProfileService()
  @State private var displayName = ""
  @State private var email = ""
  @State private var phone = ""
  @State private var venmo = ""
  @State private var isPublic = true
  @State private var isSaving = false
  @State private var message: String?

  private var netProfit: Double { authStore.profile?.netProfit ?? 0 }

  var body: some View {
    List {
      header
      accountCard
      actions

      if let message {
        Text(message)
          .font(.chipFootnote)
          .foregroundStyle(message == "Saved" ? Color.chipDriftwood : Color.chipNegative)
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
          .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
      }

      Color.clear.frame(height: 8)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
    .listStyle(.plain)
    .environment(\.defaultMinListRowHeight, 0)
    .chipScreenBackground()
    .toolbar(.hidden, for: .navigationBar)
    .task { fill() }
    .onChange(of: authStore.profile) { _, _ in fill() }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        ChipWordmark(size: 20)
        Spacer()
        Button {
          Task { await authStore.signOut() }
        } label: {
          Image(systemName: "rectangle.portrait.and.arrow.right")
            .foregroundStyle(Color.chipInk)
        }
        .buttonStyle(.plain)
      }

      VStack(alignment: .leading, spacing: 6) {
        ChipOverline("Lifetime Net Profit")
        Text(netProfit.chipCountCurrency)
          .font(.chipDisplay)
          .foregroundStyle(netProfit.chipAmountColor)
      }
      .padding(.top, 20)
    }
    .padding(.top, 8)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 20, trailing: 20))
  }

  private var accountCard: some View {
    VStack(alignment: .leading, spacing: 18) {
      SectionHeaderLabel("Account Settings")
      LabeledField(label: "Display Name") {
        TextField("Display name", text: $displayName)
      }
      LabeledField(label: "Email") {
        TextField("Email", text: $email)
          .keyboardType(.emailAddress)
          .textInputAutocapitalization(.never)
      }
      LabeledField(label: "Phone") {
        TextField("Phone", text: $phone)
          .keyboardType(.phonePad)
      }
      LabeledField(label: "Venmo Handle") {
        TextField("Venmo handle", text: $venmo)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
      }
      Toggle(isOn: $isPublic) {
        Text("Show on Leaderboard")
          .font(.chipBodyMedium)
          .foregroundStyle(Color.chipInk)
      }
      .tint(Color.chipInk)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .warmSandCard(padding: 18)
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 16, trailing: 20))
  }

  private var actions: some View {
    VStack(spacing: 12) {
      Button {
        Task { await save() }
      } label: {
        if isSaving {
          ProgressView().tint(Color.chipParchment)
        } else {
          Text("Save Profile")
        }
      }
      .buttonStyle(.chipFilled)
      .disabled(isSaving)

      Button {
        Task { await authStore.signOut() }
      } label: {
        Text("Log Out")
      }
      .buttonStyle(.chipOutline)
    }
    .listRowBackground(Color.clear)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
  }

  private func fill() {
    displayName = authStore.profile?.displayName ?? ""
    email = authStore.profile?.email ?? authStore.currentUser?.email ?? ""
    phone = authStore.profile?.phone ?? ""
    venmo = authStore.profile?.venmoHandle ?? ""
    isPublic = authStore.profile?.profilePublic ?? true
  }

  private func save() async {
    guard let userId = authStore.currentUser?.id else { return }
    isSaving = true
    defer { isSaving = false }

    do {
      _ = try await service.updateProfile(
        userId: userId,
        displayName: displayName,
        email: email,
        phone: phone,
        venmoHandle: venmo,
        profilePublic: isPublic
      )
      message = "Saved"
    } catch {
      message = error.localizedDescription
    }
  }
}
