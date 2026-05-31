import Foundation

enum AppConfig {
  static var supabaseURL: URL {
    guard let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
          let url = URL(string: raw),
          !raw.contains("YOUR_PROJECT") else {
      return URL(string: "https://YOUR_PROJECT.supabase.co")!
    }

    return url
  }

  static var supabasePublishableKey: String {
    let publishableKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_PUBLISHABLE_KEY") as? String
    if let publishableKey, !publishableKey.isEmpty {
      return publishableKey
    }

    let anonKey = Bundle.main.object(forInfoDictionaryKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY") as? String
    if let anonKey, !anonKey.isEmpty {
      return anonKey
    }

    return "YOUR_SUPABASE_PUBLISHABLE_KEY"
  }

  static var callbackScheme: String {
    let raw = Bundle.main.object(forInfoDictionaryKey: "AUTH_CALLBACK_SCHEME") as? String
    return raw?.isEmpty == false ? raw! : "chipcount"
  }

  static var authRedirectURL: URL {
    URL(string: "\(callbackScheme)://auth/callback")!
  }

  static var webBaseURL: URL {
    if let raw = Bundle.main.object(forInfoDictionaryKey: "WEB_BASE_URL") as? String,
       let url = URL(string: raw),
       !raw.isEmpty {
      return url
    }

    return URL(string: "https://chipcount.app")!
  }
}
