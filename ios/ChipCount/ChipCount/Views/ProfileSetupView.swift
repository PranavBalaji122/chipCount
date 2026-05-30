import SwiftUI

struct ProfileSetupView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var displayName = ""
  @State private var phone = ""
  @State private var venmo = ""
  @State private var isSaving = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Display name", text: $displayName)
            .textContentType(.name)
          TextField("Phone", text: $phone)
            .keyboardType(.phonePad)
          TextField("Venmo handle", text: $venmo)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
        } header: {
          Text("Finish Profile")
        } footer: {
          Text("A display name is required so hosts and players can recognize you at the table.")
        }

        if let message = authStore.errorMessage {
          Text(message)
            .foregroundStyle(.red)
        }
      }
      .navigationTitle("Welcome")
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            Task {
              isSaving = true
              await authStore.saveRequiredProfile(
                displayName: displayName,
                phone: phone,
                venmoHandle: venmo
              )
              isSaving = false
            }
          }
          .disabled(displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
        }
      }
      .task {
        displayName = authStore.profile?.displayName ?? ""
        phone = authStore.profile?.phone ?? ""
        venmo = authStore.profile?.venmoHandle ?? ""
      }
    }
  }
}
