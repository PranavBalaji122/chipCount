import AuthenticationServices
import CryptoKit
import Foundation
import Supabase
import SwiftUI
import UIKit

@MainActor
final class AuthSessionStore: ObservableObject {
  @Published private(set) var currentUser: AuthenticatedUser?
  @Published private(set) var profile: Profile?
  @Published var isBootstrapping = true
  @Published var needsProfileSetup = false
  @Published var errorMessage: String?

  private let supabase = SupabaseClientProvider.shared
  private let profileService = ProfileService()
  private var webSession: ASWebAuthenticationSession?
  private var webPresentationContextProvider: WebAuthenticationPresentationContextProvider?
  private var pendingAppleNonce: String?

  func bootstrap() async {
    isBootstrapping = true
    defer { isBootstrapping = false }

    do {
      let user = try await supabase.auth.user()
      currentUser = AuthenticatedUser(id: String(describing: user.id), email: user.email)
      try await refreshProfile(displayNameFallback: nil)
    } catch {
      currentUser = nil
      profile = nil
      needsProfileSetup = false
    }
  }

  func signIn(email: String, password: String) async {
    errorMessage = nil
    do {
      let session = try await supabase.auth.signIn(email: email, password: password)
      currentUser = AuthenticatedUser(id: String(describing: session.user.id), email: session.user.email)
      try await refreshProfile(displayNameFallback: nil)
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func signUp(displayName: String, email: String, password: String) async {
    errorMessage = nil
    do {
      _ = try await supabase.auth.signUp(
        email: email,
        password: password,
        data: ["display_name": .string(displayName)],
        redirectTo: AppConfig.authRedirectURL
      )
      try await signIn(email: email, password: password)
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func sendPasswordReset(email: String) async {
    errorMessage = nil
    do {
      try await supabase.auth.resetPasswordForEmail(email, redirectTo: AppConfig.authRedirectURL)
      errorMessage = "Password reset email sent."
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func startGoogleSignIn() async {
    errorMessage = nil
    do {
      let url = try await supabase.auth.getOAuthSignInURL(
        provider: .google,
        redirectTo: AppConfig.authRedirectURL
      )
      try await authenticateWithWebSession(url: url)
      await bootstrap()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
    let nonce = Self.randomNonceString()
    pendingAppleNonce = nonce
    request.requestedScopes = [.fullName, .email]
    request.nonce = Self.sha256(nonce)
  }

  func handleAppleCompletion(_ result: Result<ASAuthorization, Error>) async {
    errorMessage = nil

    do {
      let authorization = try result.get()
      guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
        throw AuthFlowError.invalidAppleCredential
      }
      guard let nonce = pendingAppleNonce else {
        throw AuthFlowError.missingAppleNonce
      }
      guard let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8) else {
        throw AuthFlowError.missingAppleToken
      }

      let session = try await supabase.auth.signInWithIdToken(
        credentials: OpenIDConnectCredentials(
          provider: .apple,
          idToken: idToken,
          nonce: nonce
        )
      )

      let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .compactMap { $0 }
        .joined(separator: " ")
      currentUser = AuthenticatedUser(id: String(describing: session.user.id), email: session.user.email)
      try await refreshProfile(displayNameFallback: fullName.isEmpty ? nil : fullName)
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func handleCallbackURL(_ url: URL) async {
    guard url.scheme == AppConfig.callbackScheme else { return }

    do {
      try await supabase.auth.session(from: url)
      await bootstrap()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func saveRequiredProfile(displayName: String, phone: String?, venmoHandle: String?) async {
    guard let currentUser else { return }

    do {
      profile = try await profileService.updateProfile(
        userId: currentUser.id,
        displayName: displayName,
        email: currentUser.email,
        phone: phone,
        venmoHandle: venmoHandle,
        profilePublic: true
      )
      needsProfileSetup = false
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func signOut() async {
    do {
      try await supabase.auth.signOut()
    } catch {
      errorMessage = error.localizedDescription
    }

    currentUser = nil
    profile = nil
    needsProfileSetup = false
  }

  private func refreshProfile(displayNameFallback: String?) async throws {
    guard let currentUser else { return }
    profile = try await profileService.ensureProfile(
      userId: currentUser.id,
      email: currentUser.email,
      displayNameFallback: displayNameFallback
    )
    needsProfileSetup = profile?.displayName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true
  }

  private func authenticateWithWebSession(url: URL) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      let session = ASWebAuthenticationSession(
        url: url,
        callbackURLScheme: AppConfig.callbackScheme
      ) { callbackURL, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        guard let callbackURL else {
          continuation.resume(throwing: AuthFlowError.missingCallbackURL)
          return
        }

        Task {
          do {
            try await SupabaseClientProvider.shared.auth.session(from: callbackURL)
            continuation.resume()
          } catch {
            continuation.resume(throwing: error)
          }
        }
      }

      let provider = WebAuthenticationPresentationContextProvider()
      webPresentationContextProvider = provider
      session.presentationContextProvider = provider
      session.prefersEphemeralWebBrowserSession = false
      webSession = session
      if !session.start() {
        continuation.resume(throwing: AuthFlowError.webSessionDidNotStart)
      }
    }
  }

  static func randomNonceString(length: Int = 32) -> String {
    precondition(length > 0)
    let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remainingLength = length

    while remainingLength > 0 {
      var randoms = [UInt8](repeating: 0, count: 16)
      let status = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
      guard status == errSecSuccess else {
        fatalError("Unable to generate secure nonce.")
      }

      randoms.forEach { random in
        if remainingLength == 0 { return }
        if Int(random) < charset.count {
          result.append(charset[Int(random)])
          remainingLength -= 1
        }
      }
    }

    return result
  }

  static func sha256(_ input: String) -> String {
    let inputData = Data(input.utf8)
    let hashedData = SHA256.hash(data: inputData)
    return hashedData.map { String(format: "%02x", $0) }.joined()
  }
}

private enum AuthFlowError: LocalizedError {
  case invalidAppleCredential
  case missingAppleNonce
  case missingAppleToken
  case missingCallbackURL
  case webSessionDidNotStart

  var errorDescription: String? {
    switch self {
    case .invalidAppleCredential:
      return "Apple did not return a valid credential."
    case .missingAppleNonce:
      return "Apple sign-in nonce was missing."
    case .missingAppleToken:
      return "Apple did not return an identity token."
    case .missingCallbackURL:
      return "The sign-in provider did not return to ChipCount."
    case .webSessionDidNotStart:
      return "ChipCount could not open the Google sign-in browser."
    }
  }
}

private final class WebAuthenticationPresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first { $0.isKeyWindow } ?? ASPresentationAnchor()
  }
}
