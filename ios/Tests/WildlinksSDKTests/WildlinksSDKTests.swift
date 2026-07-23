import XCTest
@testable import WildlinksSDK

final class WildlinksSDKTests: XCTestCase {
  func testNotMatchedFactory() {
    let result = ResolvedLink.notMatched("No link")
    XCTAssertFalse(result.matched)
    XCTAssertEqual(result.error, "No link")
  }
}
