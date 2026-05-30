import AuthenticationServices
import SwiftUI

struct AuthView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var mode: AuthMode = .login
  @State private var displayName = ""
  @State private var email = ""
  @State private var password = ""
  @State private var isWorking = false
  @State private var showingReset = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "suit.club.fill")
              .font(.system(size: 42, weight: .bold))
              .foregroundStyle(.green)
            Text("ChipCount")
              .font(.largeTitle.bold())
            Text("Track buy-ins, close sessions, and settle poker payouts without the spreadsheet fog.")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { request in
              authStore.prepareAppleRequest(request)
            } onCompletion: { result in
              Task {
                isWorking = true
                await authStore.handleAppleCompletion(result)
                isWorking = false
              }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Button {
              Task {
                isWorking = true
                await authStore.startGoogleSignIn()
                isWorking = false
              }
            } label: {
              Label("Continue with Google", systemImage: "globe")
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
          }

          Divider()

          Picker("Mode", selection: $mode) {
            ForEach(AuthMode.allCases) { mode in
              Text(mode.title).tag(mode)
            }
          }
          .pickerStyle(.segmented)

          VStack(spacing: 14) {
            if mode == .signup {
              TextField("Display name", text: $displayName)
                .textContentType(.name)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .chipCountField()
            }

            TextField("Email", text: $email)
              .keyboardType(.emailAddress)
              .textContentType(.emailAddress)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()
              .chipCountField()

            SecureField("Password", text: $password)
              .textContentType(mode == .login ? .password : .newPassword)
              .chipCountField()
          }

          if let message = authStore.errorMessage {
            Text(message)
              .font(.footnote)
              .foregroundStyle(message.contains("sent") ? Color.secondary : Color.red)
          }

          Button {
            Task {
              isWorking = true
              if mode == .login {
                await authStore.signIn(email: email, password: password)
              } else {
                await authStore.signUp(displayName: displayName, email: email, password: password)
              }
              isWorking = false
            }
          } label: {
            HStack {
              if isWorking {
                ProgressView()
              }
              Text(mode.primaryAction)
                .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)
          .disabled(!canSubmit || isWorking)

          Button("Forgot password?") {
            showingReset = true
          }
          .font(.footnote)
          .frame(maxWidth: .infinity)
        }
        .padding(24)
      }
      .background(Color(.systemGroupedBackground))
      .sheet(isPresented: $showingReset) {
        PasswordResetView(email: $email)
          .environmentObject(authStore)
      }
    }
  }

  private var canSubmit: Bool {
    if mode == .signup && displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return false
    }
    return email.contains("@") && password.count >= 6
  }
}

private enum AuthMode: String, CaseIterable, Identifiable {
  case login
  case signup

  var id: String { rawValue }

  var title: String {
    switch self {
    case .login: return "Log in"
    case .signup: return "Create account"
    }
  }

  var primaryAction: String {
    switch self {
    case .login: return "Log in"
    case .signup: return "Create account"
    }
  }
}

private struct PasswordResetView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @Environment(\.dismiss) private var dismiss
  @Binding var email: String
  @State private var isSending = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Email", text: $email)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
        } footer: {
          Text("ChipCount will send a reset link to this address.")
        }

        if let message = authStore.errorMessage {
          Text(message)
            .foregroundStyle(message.contains("sent") ? Color.secondary : Color.red)
        }
      }
      .navigationTitle("Reset Password")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Send") {
            Task {
              isSending = true
              await authStore.sendPasswordReset(email: email)
              isSending = false
            }
          }
          .disabled(!email.contains("@") || isSending)
        }
      }
    }
  }
}

private extension View {
  func chipCountField() -> some View {
    textFieldStyle(.plain)
      .padding(.horizontal, 14)
      .frame(height: 48)
      .background(Color(.secondarySystemGroupedBackground))
      .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}
