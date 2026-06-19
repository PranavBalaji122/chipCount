import SwiftUI
import UIKit

@main
struct ChipCountApp: App {
  @StateObject private var authStore = AuthSessionStore()

  init() {
    ChipAppearance.configure()
  }

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(authStore)
        .tint(Color.chipInk)
        .preferredColorScheme(.light)
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

/// Configures UIKit appearance proxies (tab + nav bars) to match the parchment design system.
enum ChipAppearance {
  static func configure() {
    let parchment = UIColor(Color.chipParchment)
    let ink = UIColor(Color.chipInk)
    let fog = UIColor(Color.chipFog)
    let ash = UIColor(Color.chipAshBorder)

    // Tab bar — parchment background, ink selected, fog unselected.
    let tab = UITabBarAppearance()
    tab.configureWithOpaqueBackground()
    tab.backgroundColor = parchment
    tab.shadowColor = ash

    let item = UITabBarItemAppearance()
    item.normal.iconColor = fog
    item.normal.titleTextAttributes = [
      .foregroundColor: fog,
      .font: UIFont(name: ChipFont.bodyMedium, size: 10) ?? .systemFont(ofSize: 10, weight: .medium),
    ]
    item.selected.iconColor = ink
    item.selected.titleTextAttributes = [
      .foregroundColor: ink,
      .font: UIFont(name: ChipFont.bodyMedium, size: 10) ?? .systemFont(ofSize: 10, weight: .medium),
    ]
    tab.stackedLayoutAppearance = item
    tab.inlineLayoutAppearance = item
    tab.compactInlineLayoutAppearance = item

    UITabBar.appearance().standardAppearance = tab
    UITabBar.appearance().scrollEdgeAppearance = tab

    // Nav bar — parchment background, no hairline, Inter titles.
    let nav = UINavigationBarAppearance()
    nav.configureWithOpaqueBackground()
    nav.backgroundColor = parchment
    nav.shadowColor = .clear
    nav.titleTextAttributes = [
      .foregroundColor: ink,
      .font: UIFont(name: ChipFont.bodyMedium, size: 17) ?? .systemFont(ofSize: 17, weight: .medium),
    ]
    nav.largeTitleTextAttributes = [
      .foregroundColor: ink,
      .font: UIFont(name: ChipFont.displayLight, size: 33) ?? .systemFont(ofSize: 33, weight: .light),
    ]
    nav.buttonAppearance.normal.titleTextAttributes = [.foregroundColor: ink]

    UINavigationBar.appearance().standardAppearance = nav
    UINavigationBar.appearance().scrollEdgeAppearance = nav
    UINavigationBar.appearance().compactAppearance = nav
    UINavigationBar.appearance().tintColor = ink
  }
}
