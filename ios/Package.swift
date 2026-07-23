// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "WildlinksSDK",
  platforms: [.iOS(.v13), .macOS(.v12)],
  products: [
    .library(name: "WildlinksSDK", targets: ["WildlinksSDK"]),
  ],
  targets: [
    .target(name: "WildlinksSDK"),
    .testTarget(name: "WildlinksSDKTests", dependencies: ["WildlinksSDK"]),
  ]
)
