import SwiftUI

@main
struct ChipCountApp: App {
  @StateObject private var authStore = AuthSessionStore()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(authStore)
        .task {
          await authStore.bootstrap()
        }
        .onOpenURL { url in
          Task {
            await authStore.handleCallbackURL(url)
          }
        }
    }
  }
}
