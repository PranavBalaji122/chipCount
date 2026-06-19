import SwiftUI

struct AuthView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var isSignUp = false
  @State private var displayName = ""
  @State private var email = ""
  @State private var password = ""
  @State private var isWorking = false
  @FocusState private var focusedField: Field?

  private enum Field { case name, email, password }

  var body: some View {
    ZStack {
      ParchmentBackground()

      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          ChipWordmark(size: 20)
            .padding(.top, 12)

          Text(isSignUp ? "Create\naccount." : "Welcome\nback.")
            .font(.chipHeadingLg)
            .tracking(ChipTracking.headingLg)
            .foregroundStyle(Color.chipInk)
            .padding(.top, 36)
            .padding(.bottom, 36)

          VStack(alignment: .leading, spacing: 20) {
            if isSignUp {
              field(label: "Display Name") {
                TextField("Julian", text: $displayName)
                  .textContentType(.name)
                  .focused($focusedField, equals: .name)
              }
            }

            field(label: "Email") {
              TextField("name@example.com", text: $email)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .email)
            }

            field(label: "Password") {
              SecureField("••••••••", text: $password)
                .textContentType(isSignUp ? .newPassword : .password)
                .focused($focusedField, equals: .password)
            }
          }

          Button {
            submit()
          } label: {
            Text(isSignUp ? "Create Account" : "Log In")
          }
          .buttonStyle(.chipFilled)
          .disabled(isWorking || !isFormValid)
          .padding(.top, 28)

          if !isSignUp {
            HStack {
              Spacer()
              Button("Forgot password?") { resetPassword() }
                .buttonStyle(.chipGhost)
                .disabled(isWorking)
              Spacer()
            }
            .padding(.top, 14)
          }

          OrDivider()
            .padding(.vertical, 28)

          Button {
            Task {
              isWorking = true
              await authStore.startGoogleSignIn()
              isWorking = false
            }
          } label: {
            HStack(spacing: 10) {
              Image("GoogleLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 18, height: 18)
              Text("Sign in with Google")
            }
          }
          .buttonStyle(.chipOutline)
          .disabled(isWorking)

          statusArea
            .frame(maxWidth: .infinity)
            .padding(.top, 18)

          HStack(spacing: 6) {
            Text(isSignUp ? "Already have an account?" : "Don't have an account?")
              .font(.chipFootnote)
              .foregroundStyle(Color.chipDriftwood)
            Button(isSignUp ? "Log in" : "Sign up") {
              withAnimation(.snappy) { isSignUp.toggle() }
            }
            .font(.chipFootnote)
            .foregroundStyle(Color.chipInk)
          }
          .frame(maxWidth: .infinity)
          .padding(.top, 24)
          .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: 460)
        .frame(maxWidth: .infinity)
      }
    }
  }

  @ViewBuilder
  private var statusArea: some View {
    if isWorking {
      ProgressView().tint(Color.chipInk)
    } else if let message = authStore.errorMessage {
      Text(message)
        .font(.chipFootnote)
        .foregroundStyle(message.hasSuffix("sent.") ? Color.chipDriftwood : Color.chipNegative)
        .multilineTextAlignment(.center)
    }
  }

  private func field(label: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      ChipOverline(label)
      content()
        .textFieldStyle(.chipFlat)
    }
  }

  private var isFormValid: Bool {
    let emailOk = email.contains("@") && !email.hasPrefix("@")
    let passOk = password.count >= 6
    let nameOk = !isSignUp || !displayName.trimmingCharacters(in: .whitespaces).isEmpty
    return emailOk && passOk && nameOk
  }

  private func submit() {
    focusedField = nil
    Task {
      isWorking = true
      if isSignUp {
        await authStore.signUp(displayName: displayName, email: email, password: password)
      } else {
        await authStore.signIn(email: email, password: password)
      }
      isWorking = false
    }
  }

  private func resetPassword() {
    focusedField = nil
    Task {
      isWorking = true
      await authStore.sendPasswordReset(email: email)
      isWorking = false
    }
  }
}
