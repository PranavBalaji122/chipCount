// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "ChipCount",
  platforms: [
    .iOS(.v17),
    .macOS(.v14)
  ],
  products: [
    .library(name: "ChipCountCore", targets: ["ChipCountCore"])
  ],
  targets: [
    .target(name: "ChipCountCore", path: "Sources/ChipCountCore"),
    .testTarget(
      name: "ChipCountCoreTests",
      dependencies: ["ChipCountCore"],
      path: "Tests/ChipCountCoreTests"
    )
  ]
)
