import AuthenticationServices
import SwiftUI

struct AuthView: View {
  @EnvironmentObject private var authStore: AuthSessionStore
  @State private var isWorking = false

  var body: some View {
    ZStack {
      AuthBackground()

      VStack(spacing: 0) {
        Spacer(minLength: 72)

        VStack(spacing: 20) {
          ChipCountMark()

          VStack(spacing: 9) {
            Text("ChipCount")
              .font(.system(size: 38, weight: .bold, design: .rounded))
              .foregroundStyle(.primary)

            Text("Run the table. Settle the night.")
              .font(.system(size: 17, weight: .medium))
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        VStack(spacing: 16) {

          Button {
            Task {
              isWorking = true
              await authStore.startGoogleSignIn()
              isWorking = false
            }
          } label: {
            HStack(spacing: 8) {
              Image("GoogleLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 19, height: 19)

              Text("Sign in with Google")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.black)
            }
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
              RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.black.opacity(0.1))
            }
          }
          .buttonStyle(.plain)
          .disabled(isWorking)

          if isWorking {
            ProgressView()
              .controlSize(.small)
              .frame(height: 18)
          } else if let message = authStore.errorMessage {
            Text(message)
              .font(.footnote)
              .foregroundStyle(.red)
              .multilineTextAlignment(.center)
              .frame(minHeight: 18)
          }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 28)
        .frame(maxWidth: 440)
      }
    }
  }
}

private struct ChipCountMark: View {
  var body: some View {
    ZStack {
      Circle()
        .fill(Color.green.opacity(0.1))
        .frame(width: 118, height: 118)

      Circle()
        .fill(Color(.systemBackground))
        .frame(width: 88, height: 88)
        .shadow(color: Color.black.opacity(0.08), radius: 18, y: 8)

      Circle()
        .strokeBorder(Color.green.opacity(0.22), lineWidth: 1)
        .frame(width: 72, height: 72)

      Image(systemName: "suit.club.fill")
        .font(.system(size: 32, weight: .semibold))
        .foregroundStyle(.green)
    }
  }
}

private struct AuthBackground: View {
  var body: some View {
    ZStack {
      Color(.systemBackground)

      Circle()
        .fill(Color.green.opacity(0.08))
        .frame(width: 330, height: 330)
        .blur(radius: 18)
        .offset(x: 190, y: -360)

      Circle()
        .fill(Color.green.opacity(0.045))
        .frame(width: 260, height: 260)
        .blur(radius: 22)
        .offset(x: -190, y: 360)
    }
    .ignoresSafeArea()
  }
}
