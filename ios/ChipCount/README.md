# ChipCount iOS

Native SwiftUI app scaffold for ChipCount.

## What is included

- SwiftUI app source in `ChipCount/`
- Shared payout calculator package in `Sources/ChipCountCore`
- Payout parity tests in `Tests/ChipCountCoreTests`
- Supabase service layer for auth, profiles, tables, game room actions, debts, and host RPCs
- Native Apple sign-in flow, Supabase OAuth Google flow, email login/signup, password reset, profile setup, tabs, tables, game room, debts, and profile screens

## Setup

### Option A: Generate with XcodeGen

1. Install XcodeGen if you do not already have it.
2. Run `xcodegen generate` from this directory.
3. Open `ChipCount.xcodeproj`.
4. Replace `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `WEB_BASE_URL` in `ChipCount/Info.plist`.

### Option B: Create the target manually

1. Create an Xcode iOS app target named `ChipCount`.
2. Add `ChipCount/` as the app source folder.
3. Add this local Swift package and link the `ChipCountCore` product.
4. Add the Supabase Swift package:
   `https://github.com/supabase/supabase-swift.git`
5. Set the app target's `Info.plist` to `ChipCount/Info.plist`.
6. Set the app target's entitlements to `ChipCount/ChipCount.entitlements`.
7. Replace `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `WEB_BASE_URL` in `Info.plist`.
8. In Supabase Auth redirect URLs, add `chipcount://auth/callback`.
9. Enable Email, Google, and Apple providers in Supabase.
10. In Apple Developer/Xcode, enable Sign in with Apple and Associated Domains for universal links.

## Backend dependency

Run migrations through `supabase/migrations/00017_standardize_host_session_rpcs.sql` before using the app. The iOS client calls:

- `close_session_with_debts`
- `reopen_session`
- `end_table`

## Local test

```sh
cd ios/ChipCount
swift test
```
