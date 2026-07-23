import Foundation

public struct WildlinksConfig: Sendable {
  public let baseURL: URL
  public let domains: Set<String>

  public init(baseURL: URL, domains: [String]) {
    self.baseURL = baseURL
    self.domains = Set(domains)
  }
}

public struct ResolvedLink: Decodable, Sendable {
  public let matched: Bool
  public let openId: String?
  public let destinationUrl: String?
  public let deepLinkPayload: [String: JSONValue]?
  public let installAttributionProvider: String?
  public let error: String?

  enum CodingKeys: String, CodingKey {
    case matched
    case openId
    case destinationUrl
    case deepLinkPayload
    case installAttributionProvider
    case error
  }

  public init(
    matched: Bool,
    openId: String? = nil,
    destinationUrl: String? = nil,
    deepLinkPayload: [String: JSONValue]? = nil,
    installAttributionProvider: String? = nil,
    error: String? = nil
  ) {
    self.matched = matched
    self.openId = openId
    self.destinationUrl = destinationUrl
    self.deepLinkPayload = deepLinkPayload
    self.installAttributionProvider = installAttributionProvider
    self.error = error
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    openId = try container.decodeIfPresent(String.self, forKey: .openId)
    destinationUrl = try container.decodeIfPresent(String.self, forKey: .destinationUrl)
    deepLinkPayload = try container.decodeIfPresent([String: JSONValue].self, forKey: .deepLinkPayload)
    installAttributionProvider = try container.decodeIfPresent(String.self, forKey: .installAttributionProvider)
    error = try container.decodeIfPresent(String.self, forKey: .error)
    matched = try container.decodeIfPresent(Bool.self, forKey: .matched) ?? (destinationUrl != nil || deepLinkPayload != nil)
  }

  public static func notMatched(_ error: String? = nil) -> ResolvedLink {
    ResolvedLink(matched: false, openId: nil, destinationUrl: nil, deepLinkPayload: nil, installAttributionProvider: nil, error: error)
  }
}

public enum JSONValue: Decodable, Sendable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case object([String: JSONValue])
  case array([JSONValue])
  case null

  public init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() {
      self = .null
    } else if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else if let value = try? container.decode(String.self) {
      self = .string(value)
    } else if let value = try? container.decode([String: JSONValue].self) {
      self = .object(value)
    } else {
      self = .array(try container.decode([JSONValue].self))
    }
  }
}

public final class WildlinksClient: @unchecked Sendable {
  private let config: WildlinksConfig
  private let session: URLSession
  private let decoder = JSONDecoder()

  public init(config: WildlinksConfig, session: URLSession = .shared) {
    self.config = config
    self.session = session
  }

  public func handleIncomingURL(_ url: URL) async -> ResolvedLink {
    if let token = URLComponents(url: url, resolvingAgainstBaseURL: false)?
      .queryItems?
      .first(where: { $0.name == "dl_match_token" })?
      .value,
      token.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil {
      let deferred = await matchDeferredToken(token)
      if deferred.matched { return deferred }
    }

    guard let host = url.host, config.domains.contains(host) else {
      return .notMatched()
    }

    let segments = url.pathComponents.filter { $0 != "/" }
    guard let slug = segments.last, !slug.isEmpty else {
      return .notMatched("No slug in URL")
    }

    var items = [
      URLQueryItem(name: "domain", value: host),
      URLQueryItem(name: "slug", value: slug),
      URLQueryItem(name: "platform", value: "ios"),
      URLQueryItem(name: "osVersion", value: ProcessInfo.processInfo.operatingSystemVersionString),
      URLQueryItem(name: "language", value: Locale.current.identifier.replacingOccurrences(of: "_", with: "-")),
    ]

    if segments.count > 1 {
      items.append(URLQueryItem(name: "pathPrefix", value: "/\(segments.dropLast().joined(separator: "/"))/"))
    }
    if let password = URLComponents(url: url, resolvingAgainstBaseURL: false)?
      .queryItems?
      .first(where: { $0.name == "pw" })?
      .value {
      items.append(URLQueryItem(name: "password", value: password))
    }

    var components = URLComponents(url: endpoint("/api/v1/resolve"), resolvingAgainstBaseURL: false)
    components?.queryItems = items
    guard let resolveURL = components?.url else { return .notMatched("Invalid resolve URL") }
    return await get(resolveURL)
  }

  public func matchDeferredToken(_ matchToken: String) async -> ResolvedLink {
    await post(path: "/api/v1/match", body: ["matchToken": matchToken])
  }

  public func matchInstallAttributionToken(
    _ installAttributionToken: String,
    provider: String = "app-store-campaign-token"
  ) async -> ResolvedLink {
    await post(
      path: "/api/v1/match/install-attribution",
      body: ["installAttributionToken": installAttributionToken, "provider": provider]
    )
  }

  private func get(_ url: URL) async -> ResolvedLink {
    do {
      let (data, _) = try await session.data(from: url)
      return try decoder.decode(ResolvedLink.self, from: data)
    } catch {
      return .notMatched(error.localizedDescription)
    }
  }

  private func post(path: String, body: [String: String]) async -> ResolvedLink {
    do {
      var request = URLRequest(url: endpoint(path))
      request.httpMethod = "POST"
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONEncoder().encode(body)
      let (data, _) = try await session.data(for: request)
      return try decoder.decode(ResolvedLink.self, from: data)
    } catch {
      return .notMatched(error.localizedDescription)
    }
  }

  private func endpoint(_ path: String) -> URL {
    let base = config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    return URL(string: "\(base)/\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")!
  }
}
