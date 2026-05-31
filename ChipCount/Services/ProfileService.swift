import Foundation
import Supabase

struct ProfileService {
  private let supabase = SupabaseClientProvider.shared

  func ensureProfile(userId: String, email: String?, displayNameFallback: String?) async throws -> Profile {
    if let existing = try? await fetchProfile(userId: userId) {
      if let displayNameFallback,
         existing.displayName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true {
        return try await updateProfile(
          userId: userId,
          displayName: displayNameFallback,
          email: email ?? existing.email,
          phone: existing.phone,
          venmoHandle: existing.venmoHandle,
          profilePublic: existing.profilePublic
        )
      }
      return existing
    }

    let profile = ProfileUpsert(
      id: userId,
      displayName: displayNameFallback ?? email?.split(separator: "@").first.map(String.init),
      phone: nil,
      email: email,
      venmoHandle: nil,
      profilePublic: true
    )

    return try await supabase
      .from("profiles")
      .upsert(profile, onConflict: "id")
      .select()
      .single()
      .execute()
      .value
  }

  func fetchProfile(userId: String) async throws -> Profile {
    try await supabase
      .from("profiles")
      .select()
      .eq("id", value: userId)
      .single()
      .execute()
      .value
  }

  func updateProfile(
    userId: String,
    displayName: String?,
    email: String?,
    phone: String?,
    venmoHandle: String?,
    profilePublic: Bool
  ) async throws -> Profile {
    if let displayName, !displayName.isEmpty {
      let matches: [Profile] = try await supabase
        .from("profiles")
        .select()
        .eq("display_name", value: displayName)
        .execute()
        .value

      if matches.contains(where: { $0.id != userId }) {
        throw ProfileError.duplicateDisplayName
      }
    }

    let patch = ProfilePatch(
      displayName: displayName?.nilIfBlank,
      phone: phone?.nilIfBlank,
      email: email?.nilIfBlank,
      venmoHandle: venmoHandle?.nilIfBlank,
      profilePublic: profilePublic
    )

    return try await supabase
      .from("profiles")
      .update(patch)
      .eq("id", value: userId)
      .select()
      .single()
      .execute()
      .value
  }

  func fetchDebts(userId: String) async throws -> [Debt] {
    try await supabase
      .from("debts")
      .select("""
        id,
        game_id,
        creditor_id,
        debtor_id,
        amount,
        status,
        created_at,
        creditor:profiles!creditor_id(display_name),
        debtor:profiles!debtor_id(display_name),
        game:games!game_id(description, short_code)
      """)
      .or("creditor_id.eq.\(userId),debtor_id.eq.\(userId)")
      .eq("status", value: "pending")
      .order("created_at", ascending: false)
      .execute()
      .value
  }

  func settleDebt(id: String) async throws {
    try await supabase
      .from("debts")
      .update(["status": "settled"])
      .eq("id", value: id)
      .execute()
  }
}

private struct ProfileUpsert: Encodable {
  let id: String
  let displayName: String?
  let phone: String?
  let email: String?
  let venmoHandle: String?
  let profilePublic: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case displayName = "display_name"
    case phone
    case email
    case venmoHandle = "venmo_handle"
    case profilePublic = "profile_public"
  }
}

private struct ProfilePatch: Encodable {
  let displayName: String?
  let phone: String?
  let email: String?
  let venmoHandle: String?
  let profilePublic: Bool

  enum CodingKeys: String, CodingKey {
    case displayName = "display_name"
    case phone
    case email
    case venmoHandle = "venmo_handle"
    case profilePublic = "profile_public"
  }
}

enum ProfileError: LocalizedError {
  case duplicateDisplayName

  var errorDescription: String? {
    "This display name is already taken."
  }
}

private extension String {
  var nilIfBlank: String? {
    let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}
