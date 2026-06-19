import SwiftUI

struct ProfileSetupView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var displayName = ""
  @State private var phone = ""
  @State private var venmo = ""
  @State private var isSaving = false

  var body: some View {
    ZStack {
      ParchmentBackground()

      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          ChipOverline("Welcome")
            .padding(.top, 16)
          Text("Finish\nprofile.")
            .font(.chipHeadingLg)
            .tracking(ChipTracking.headingLg)
            .foregroundStyle(Color.chipInk)
            .padding(.top, 8)
            .padding(.bottom, 12)

          Text("A display name is required so hosts and players can recognize you at the table.")
            .font(.chipFootnote)
            .foregroundStyle(Color.chipDriftwood)
            .padding(.bottom, 32)

          VStack(alignment: .leading, spacing: 20) {
            field("Display Name") {
              TextField("Julian", text: $displayName)
                .textContentType(.name)
            }
            field("Phone") {
              TextField("(555) 123-4567", text: $phone)
                .keyboardType(.phonePad)
            }
            field("Venmo Handle") {
              TextField("jvaldez-poker", text: $venmo)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            }
          }

          if let message = authStore.errorMessage {
            Text(message)
              .font(.chipFootnote)
              .foregroundStyle(Color.chipNegative)
              .padding(.top, 16)
          }

          Button {
            save()
          } label: {
            if isSaving {
              ProgressView().tint(Color.chipParchment)
            } else {
              Text("Save Profile")
            }
          }
          .buttonStyle(.chipFilled)
          .disabled(isSaving || displayName.trimmingCharacters(in: .whitespaces).isEmpty)
          .padding(.top, 32)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: 460)
        .frame(maxWidth: .infinity)
      }
    }
    .task {
      displayName = authStore.profile?.displayName ?? ""
      phone = authStore.profile?.phone ?? ""
      venmo = authStore.profile?.venmoHandle ?? ""
    }
  }

  private func field(_ label: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      ChipOverline(label)
      content().textFieldStyle(.chipFlat)
    }
  }

  private func save() {
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
}
