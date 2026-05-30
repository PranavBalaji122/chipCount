import Foundation
import Supabase

enum SupabaseClientProvider {
  static let shared = SupabaseClient(
    supabaseURL: AppConfig.supabaseURL,
    supabaseKey: AppConfig.supabasePublishableKey,
    options: SupabaseClientOptions(
      auth: .init(emitLocalSessionAsInitialSession: true)
    )
  )
}
