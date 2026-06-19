import SwiftUI

/// Corner-radius tokens.
enum ChipRadius {
  static let input: CGFloat = 4
  static let tag: CGFloat = 14
  static let badge: CGFloat = 18
  static let card: CGFloat = 20
  static let cardLarge: CGFloat = 24
}

// MARK: - Backgrounds

/// Page canvas — parchment with a faint warm cast in the top-trailing corner (as in the reference).
struct ParchmentBackground: View {
  var body: some View {
    ZStack {
      Color.chipParchment
      RadialGradient(
        colors: [Color.chipEmberOrange.opacity(0.05), .clear],
        center: .topTrailing, startRadius: 0, endRadius: 360
      )
      RadialGradient(
        colors: [Color.chipVoidViolet.opacity(0.035), .clear],
        center: .bottomLeading, startRadius: 0, endRadius: 320
      )
    }
    .ignoresSafeArea()
  }
}

extension View {
  /// Apply the parchment canvas behind a `List`/`Form`/`ScrollView` and hide the default fill.
  func chipScreenBackground() -> some View {
    scrollContentBackground(.hidden)
      .background(ParchmentBackground())
  }

  /// Warm-sand card surface (primary content tile).
  func warmSandCard(padding: CGFloat = 16, radius: CGFloat = ChipRadius.card) -> some View {
    self
      .padding(padding)
      .background(Color.chipWarmSand)
      .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
  }

  /// White elevated card — floats above the sand via a hairline ring + sub-pixel shadow.
  func whiteElevatedCard(padding: CGFloat = 16, radius: CGFloat = ChipRadius.card) -> some View {
    self
      .padding(padding)
      .background(Color.white)
      .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: radius, style: .continuous)
          .strokeBorder(Color.chipAshBorder, lineWidth: 1)
      )
      .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
  }
}

// MARK: - Text styles

/// Small uppercase tracked label (e.g. "COMMAND CENTRAL", "LIFETIME NET PROFIT").
struct ChipOverline: View {
  let text: String
  init(_ text: String) { self.text = text }
  var body: some View {
    Text(text.uppercased())
      .font(.chipOverline)
      .tracking(ChipTracking.overline)
      .foregroundStyle(Color.chipDriftwood)
  }
}

/// Section header: small icon + uppercase tracked title (e.g. "PENDING APPROVALS").
struct SectionHeaderLabel: View {
  let title: String
  var systemImage: String?
  var trailing: String?

  init(_ title: String, systemImage: String? = nil, trailing: String? = nil) {
    self.title = title
    self.systemImage = systemImage
    self.trailing = trailing
  }

  var body: some View {
    HStack(spacing: 8) {
      if let systemImage {
        Image(systemName: systemImage)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(Color.chipInk)
      }
      Text(title.uppercased())
        .font(.chipOverline)
        .tracking(ChipTracking.overline)
        .foregroundStyle(Color.chipInk)
      Spacer(minLength: 8)
      if let trailing {
        Text(trailing.uppercased())
          .font(.chipOverline)
          .tracking(ChipTracking.overline)
          .foregroundStyle(Color.chipFog)
      }
    }
  }
}

/// Pill status/category tag.
struct StatusTag: View {
  let text: String
  var filled: Bool = false

  var body: some View {
    Text(text.uppercased())
      .font(.chipMono(10, medium: true))
      .tracking(0.5)
      .foregroundStyle(filled ? Color.chipParchment : Color.chipDriftwood)
      .padding(.horizontal, 9)
      .padding(.vertical, 4)
      .background(filled ? Color.chipInk : Color.chipWarmSand)
      .clipShape(Capsule())
      .overlay(
        Capsule().strokeBorder(Color.chipAshBorder, lineWidth: filled ? 0 : 1)
      )
  }
}

/// Circular ink badge with an SF Symbol — used as a list-row leading icon.
struct IconBadge: View {
  let systemImage: String
  var size: CGFloat = 44
  var filled: Bool = true

  var body: some View {
    Image(systemName: systemImage)
      .font(.system(size: size * 0.4, weight: .regular))
      .foregroundStyle(filled ? Color.chipParchment : Color.chipInk)
      .frame(width: size, height: size)
      .background(filled ? Color.chipInk : Color.chipWarmSand)
      .clipShape(Circle())
      .overlay(Circle().strokeBorder(Color.chipAshBorder, lineWidth: filled ? 0 : 1))
  }
}

/// Brand wordmark: `‖ ChipCount`.
struct ChipWordmark: View {
  var size: CGFloat = 19
  var body: some View {
    HStack(spacing: 6) {
      Text("‖")
        .font(.custom(ChipFont.displayMedium, size: size + 1))
        .foregroundStyle(Color.chipInk)
      Text("ChipCount")
        .font(.custom(ChipFont.displayMedium, size: size))
        .tracking(-0.2)
        .foregroundStyle(Color.chipInk)
    }
  }
}

/// "—— OR ——" divider used on the auth screen.
struct OrDivider: View {
  var body: some View {
    HStack(spacing: 12) {
      Rectangle().fill(Color.chipAshBorder).frame(height: 1)
      Text("OR").font(.chipOverline).tracking(ChipTracking.overline).foregroundStyle(Color.chipFog)
      Rectangle().fill(Color.chipAshBorder).frame(height: 1)
    }
  }
}

// MARK: - Controls

/// Pill button — the only button vocabulary in this system.
struct PillButtonStyle: ButtonStyle {
  enum Variant { case filled, outline, ghost }
  var variant: Variant = .filled
  var fullWidth: Bool = true
  var compact: Bool = false

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(compact ? .chipLabel : .chipCalloutMedium)
      .foregroundStyle(foreground)
      .frame(maxWidth: fullWidth ? .infinity : nil)
      .frame(height: compact ? 38 : 54)
      .padding(.horizontal, compact ? 16 : 20)
      .background(background)
      .clipShape(Capsule())
      .overlay(
        Capsule().strokeBorder(Color.chipAshBorder, lineWidth: variant == .ghost ? 0 : 1)
      )
      .shadow(color: variant == .outline ? .black.opacity(0.05) : .clear, radius: 2, y: 1)
      .opacity(configuration.isPressed ? 0.82 : 1)
      .scaleEffect(configuration.isPressed ? 0.99 : 1)
      .animation(.snappy(duration: 0.15), value: configuration.isPressed)
  }

  private var foreground: Color {
    switch variant {
    case .filled: return .chipParchment
    case .outline, .ghost: return .chipInk
    }
  }

  private var background: Color {
    switch variant {
    case .filled: return .chipInk
    case .outline: return .white
    case .ghost: return .clear
    }
  }
}

extension ButtonStyle where Self == PillButtonStyle {
  static var chipFilled: PillButtonStyle { PillButtonStyle(variant: .filled) }
  static var chipOutline: PillButtonStyle { PillButtonStyle(variant: .outline) }
  static var chipGhost: PillButtonStyle { PillButtonStyle(variant: .ghost, fullWidth: false) }
  static func chipFilled(fullWidth: Bool) -> PillButtonStyle {
    PillButtonStyle(variant: .filled, fullWidth: fullWidth)
  }
  static var chipFilledCompact: PillButtonStyle {
    PillButtonStyle(variant: .filled, fullWidth: false, compact: true)
  }
  static var chipOutlineCompact: PillButtonStyle {
    PillButtonStyle(variant: .outline, fullWidth: false, compact: true)
  }
}

/// Flat, editorial text input — white fill, hairline border, near-square corners.
struct FlatTextFieldStyle: TextFieldStyle {
  func _body(configuration: TextField<Self._Label>) -> some View {
    configuration
      .font(.chipBody)
      .tracking(ChipTracking.body)
      .foregroundStyle(Color.chipInk)
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(Color.white)
      .clipShape(RoundedRectangle(cornerRadius: ChipRadius.input, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: ChipRadius.input, style: .continuous)
          .strokeBorder(Color.chipAshBorder, lineWidth: 1)
      )
  }
}

extension TextFieldStyle where Self == FlatTextFieldStyle {
  static var chipFlat: FlatTextFieldStyle { FlatTextFieldStyle() }
}

/// Overline label above a flat text field — the standard form field layout.
struct LabeledField<Content: View>: View {
  let label: String
  @ViewBuilder var content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      ChipOverline(label)
      content.textFieldStyle(.chipFlat)
    }
  }
}

/// Parchment modal scaffold: title, scrollable fields, footer note, ghost Cancel + filled Confirm.
struct SheetScaffold<Content: View>: View {
  let title: String
  var footer: String?
  let confirmTitle: String
  var isSubmitting: Bool
  var canConfirm: Bool
  let onCancel: () -> Void
  let onConfirm: () async -> Void
  @ViewBuilder var content: Content

  var body: some View {
    NavigationStack {
      ZStack {
        ParchmentBackground()
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            content
            if let footer {
              Text(footer)
                .font(.chipFootnote)
                .foregroundStyle(Color.chipDriftwood)
            }
          }
          .padding(20)
        }
      }
      .navigationTitle(title)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel", action: onCancel)
            .foregroundStyle(Color.chipInk)
            .disabled(isSubmitting)
        }
      }
      .safeAreaInset(edge: .bottom) {
        Button {
          Task { await onConfirm() }
        } label: {
          if isSubmitting {
            ProgressView().tint(Color.chipParchment)
          } else {
            Text(confirmTitle)
          }
        }
        .buttonStyle(.chipFilled)
        .disabled(isSubmitting || !canConfirm)
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
      }
    }
  }
}
