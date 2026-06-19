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
    ZStack {
      ParchmentBackground()
      VStack(spacing: 18) {
        ChipWordmark(size: 30)
        ProgressView()
          .tint(Color.chipInk)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
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
