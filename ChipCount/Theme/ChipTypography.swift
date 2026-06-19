import SwiftUI

/// Typography tokens for the "Parchment Command Terminal" design system.
///
/// - Display / headlines: **DM Sans Light (300)** with tight negative tracking.
/// - Functional UI / body: **Inter** (400 / 500).
/// - IDs, amounts, technical labels: **JetBrains Mono** (400 / 500).
///
/// Font family PostScript names come from the bundled TTFs in `Resources/Fonts/`.
enum ChipFont {
  static let displayLight = "DMSans9pt-Light"
  static let displayMedium = "DMSans9pt-Medium"
  static let bodyRegular = "Inter-Regular"
  static let bodyMedium = "Inter-Medium"
  static let monoRegular = "JetBrainsMono-Regular"
  static let monoMedium = "JetBrainsMono-Medium"
}

extension Font {
  // Display / headlines — DM Sans Light, scale with Dynamic Type but keep proportion.
  static let chipDisplay = Font.custom(ChipFont.displayLight, size: 40, relativeTo: .largeTitle)
  static let chipHeadingLg = Font.custom(ChipFont.displayLight, size: 33, relativeTo: .largeTitle)
  static let chipHeading = Font.custom(ChipFont.displayLight, size: 27, relativeTo: .title)
  static let chipHeadingSm = Font.custom(ChipFont.displayMedium, size: 20, relativeTo: .title3)

  // Functional UI — Inter.
  static let chipSubheading = Font.custom(ChipFont.bodyMedium, size: 18, relativeTo: .headline)
  static let chipBody = Font.custom(ChipFont.bodyRegular, size: 16, relativeTo: .body)
  static let chipBodyMedium = Font.custom(ChipFont.bodyMedium, size: 16, relativeTo: .body)
  static let chipCallout = Font.custom(ChipFont.bodyRegular, size: 15, relativeTo: .callout)
  static let chipCalloutMedium = Font.custom(ChipFont.bodyMedium, size: 15, relativeTo: .callout)
  static let chipLabel = Font.custom(ChipFont.bodyMedium, size: 14, relativeTo: .subheadline)
  static let chipFootnote = Font.custom(ChipFont.bodyRegular, size: 13, relativeTo: .footnote)
  static let chipCaption = Font.custom(ChipFont.bodyRegular, size: 12, relativeTo: .caption)
  static let chipOverline = Font.custom(ChipFont.bodyMedium, size: 11, relativeTo: .caption2)

  // Technical / monospace — JetBrains Mono.
  static func chipMono(_ size: CGFloat = 14, medium: Bool = false) -> Font {
    .custom(medium ? ChipFont.monoMedium : ChipFont.monoRegular, size: size, relativeTo: .body)
  }
}

/// Letter-spacing constants (SwiftUI applies tracking on `Text`, not on `Font`).
enum ChipTracking {
  static let display: CGFloat = -0.9
  static let headingLg: CGFloat = -0.7
  static let heading: CGFloat = -0.5
  static let body: CGFloat = 0.16
  static let overline: CGFloat = 1.4
}
