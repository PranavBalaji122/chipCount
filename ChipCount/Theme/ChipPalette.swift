import SwiftUI

/// Color tokens for the "Parchment Command Terminal" design system.
/// Light-mode only — these are fixed hex values, the palette does not adapt to dark mode.
extension Color {
  /// Page canvas — nearly white with a faint warm cast.
  static let chipParchment = Color(hex: 0xFDFCFC)
  /// Card surfaces, feature tiles, section insets — one step warmer/darker than canvas.
  static let chipWarmSand = Color(hex: 0xF5F3F1)
  /// All hairline borders on buttons, inputs, cards, dividers.
  static let chipAshBorder = Color(hex: 0xE5E5E5)
  /// Primary text, headlines, filled pill backgrounds, icon fills.
  static let chipInk = Color(hex: 0x000000)
  /// Secondary body text, muted links, icon strokes.
  static let chipDriftwood = Color(hex: 0x777169)
  /// Tertiary helper text, light icon strokes.
  static let chipFog = Color(hex: 0xA59F97)
  /// Subtle background washes, mid-level dividers.
  static let chipSilverMist = Color(hex: 0xB1B0B0)

  /// Decorative-only accents (ambient orbs / illustration). Never used as a UI affordance.
  static let chipVoidViolet = Color(hex: 0x0447FF)
  static let chipEmberOrange = Color(hex: 0xFF4704)

  /// Retained semantic colors for profit/loss amounts (deliberate deviation from the
  /// strictly-monochrome reference, for at-a-glance readability of money).
  static let chipPositive = Color(hex: 0x1F7A4D)
  static let chipNegative = Color(hex: 0xB3261E)

  init(hex: UInt32, opacity: Double = 1) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: opacity
    )
  }
}

extension Double {
  /// Ink for non-negative amounts, negative red for losses. Used by money labels.
  var chipAmountColor: Color { self >= 0 ? .chipPositive : .chipNegative }
}
