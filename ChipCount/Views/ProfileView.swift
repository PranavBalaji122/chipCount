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

  var body: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 4) {
          Text((authStore.profile?.netProfit ?? 0).chipCountCurrency)
            .font(.largeTitle.bold())
            .foregroundStyle((authStore.profile?.netProfit ?? 0) >= 0 ? .green : .red)
          Text("Net profit")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
      }

      Section("Contact") {
        TextField("Display name", text: $displayName)
        TextField("Email", text: $email)
          .keyboardType(.emailAddress)
          .textInputAutocapitalization(.never)
        TextField("Phone", text: $phone)
          .keyboardType(.phonePad)
        TextField("Venmo handle", text: $venmo)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
        Toggle("Show on leaderboard", isOn: $isPublic)
      }

      if let message {
        Section {
          Text(message)
            .foregroundStyle(message == "Saved" ? Color.secondary : Color.red)
        }
      }

      Section {
        Button {
          Task { await save() }
        } label: {
          if isSaving {
            ProgressView()
          } else {
            Text("Save Profile")
          }
        }

        Button(role: .destructive) {
          Task { await authStore.signOut() }
        } label: {
          Text("Log Out")
        }
      }
    }
    .navigationTitle("Profile")
    .task {
      fill()
    }
    .onChange(of: authStore.profile) { _, _ in
      fill()
    }
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
