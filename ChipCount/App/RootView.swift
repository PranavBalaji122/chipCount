import SwiftUI

struct RootView: View {
  @EnvironmentObject private var authStore: AuthSessionStore

  var body: some View {
    Group {
      if authStore.isBootstrapping {
        SplashView()
      } else if authStore.currentUser == nil {
        AuthView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .ignoresSafeArea()
      } else if authStore.needsProfileSetup {
        ProfileSetupView()
      } else {
        MainTabView()
      }
    }
    .animation(.snappy, value: authStore.isBootstrapping)
    .animation(.snappy, value: authStore.currentUser?.id)
  }
}

private struct SplashView: View {
  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "suit.club.fill")
        .font(.system(size: 42, weight: .bold))
        .foregroundStyle(.green)
      Text("ChipCount")
        .font(.largeTitle.bold())
      ProgressView()
        .padding(.top, 8)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemGroupedBackground))
  }
}

private struct MainTabView: View {
  var body: some View {
    TabView {
      NavigationStack {
        TablesView()
      }
      .tabItem {
        Label("Tables", systemImage: "tablecells")
      }

      NavigationStack {
        DebtsView()
      }
      .tabItem {
        Label("Debts", systemImage: "arrow.left.arrow.right.circle")
      }

      NavigationStack {
        ProfileView()
      }
      .tabItem {
        Label("Profile", systemImage: "person.crop.circle")
      }
    }
  }
}
