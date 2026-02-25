// Simple in-memory cache for profile data to reduce database hits
interface ProfileData {
  display_name: string | null
  venmo_handle: string | null
}

interface CacheEntry {
  data: ProfileData
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const profileCache = new Map<string, CacheEntry>()

export function getCachedProfile(userId: string): ProfileData | null {
  const entry = profileCache.get(userId)
  if (!entry) return null
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    profileCache.delete(userId)
    return null
  }
  
  return entry.data
}

export function setCachedProfile(userId: string, profile: ProfileData): void {
  profileCache.set(userId, {
    data: profile,
    timestamp: Date.now()
  })
}

export function clearProfileCache(): void {
  profileCache.clear()
}