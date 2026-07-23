package com.wilderbots.wildlinks

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale

data class WildlinksConfig(
  val baseUrl: String,
  val domains: List<String>
)

data class ResolvedLink(
  val matched: Boolean,
  val openId: String? = null,
  val destinationUrl: String? = null,
  val deepLinkPayload: Map<String, Any?>? = null,
  val installAttributionProvider: String? = null,
  val error: String? = null
)

object Wildlinks {
  private var config: WildlinksConfig? = null

  fun init(config: WildlinksConfig) {
    this.config = config
  }

  suspend fun handleIncomingUri(uri: Uri): ResolvedLink {
    val cfg = requireConfig()
    val deferredToken = uri.getQueryParameter("dl_match_token")
    if (deferredToken != null && deferredToken.matches(Regex("^[a-f0-9]{32}$"))) {
      val deferred = matchDeferredToken(cfg.baseUrl, deferredToken)
      if (deferred.matched) return deferred
    }

    if (!cfg.domains.contains(uri.host)) return ResolvedLink(matched = false)
    val segments = uri.pathSegments
    val slug = segments.lastOrNull().orEmpty()
    if (slug.isBlank()) return ResolvedLink(matched = false, error = "No slug in URI")

    val pathPrefix = if (segments.size > 1) "/${segments.dropLast(1).joinToString("/")}/" else null
    val params = linkedMapOf(
      "domain" to uri.host.orEmpty(),
      "slug" to slug,
      "platform" to "android",
      "osVersion" to Build.VERSION.RELEASE.orEmpty(),
      "language" to Locale.getDefault().toLanguageTag()
    )
    if (pathPrefix != null) params["pathPrefix"] = pathPrefix
    uri.getQueryParameter("pw")?.let { params["password"] = it }

    return try {
      val response = getJson("${trimSlash(cfg.baseUrl)}/api/v1/resolve?${encodeQuery(params)}")
      if (response.optBoolean("matched", true) || response.has("destinationUrl")) response.toResolved(true)
      else ResolvedLink(matched = false, error = response.optString("error", "Resolve failed"))
    } catch (error: Exception) {
      ResolvedLink(matched = false, error = error.message ?: "Network error")
    }
  }

  suspend fun checkDeferredInstall(context: Context): ResolvedLink {
    val cfg = requireConfig()
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
      ?: return ResolvedLink(matched = false, error = "Clipboard unavailable")
    val text = clipboard.primaryClip?.firstText(context).orEmpty()
    val token = Regex("dl_match_token=([a-f0-9]{32})").find(text)?.groupValues?.get(1)
      ?: return ResolvedLink(matched = false)
    return matchDeferredToken(cfg.baseUrl, token)
  }

  suspend fun matchDeferredToken(baseUrl: String, matchToken: String): ResolvedLink {
    return postMatch("${trimSlash(baseUrl)}/api/v1/match", mapOf("matchToken" to matchToken))
  }

  suspend fun matchInstallAttributionToken(
    baseUrl: String,
    installAttributionToken: String,
    provider: String = "app-store-campaign-token"
  ): ResolvedLink {
    return postMatch(
      "${trimSlash(baseUrl)}/api/v1/match/install-attribution",
      mapOf("installAttributionToken" to installAttributionToken, "provider" to provider)
    )
  }

  private fun requireConfig(): WildlinksConfig =
    config ?: throw IllegalStateException("Wildlinks is not initialized. Call Wildlinks.init(...) first.")

  private fun ClipData.firstText(context: Context): String? =
    if (itemCount > 0) getItemAt(0).coerceToText(context)?.toString() else null

  private suspend fun postMatch(endpoint: String, body: Map<String, String>): ResolvedLink {
    return try {
      val response = postJson(endpoint, JSONObject(body).toString())
      if (response.optBoolean("matched", false)) response.toResolved(true)
      else ResolvedLink(matched = false, error = response.optString("error", null))
    } catch (error: Exception) {
      ResolvedLink(matched = false, error = error.message ?: "Network error")
    }
  }

  private fun JSONObject.toResolved(matched: Boolean): ResolvedLink =
    ResolvedLink(
      matched = matched,
      openId = optString("openId").takeIf { it.isNotBlank() },
      destinationUrl = optString("destinationUrl").takeIf { it.isNotBlank() },
      deepLinkPayload = optJSONObject("deepLinkPayload")?.toMap(),
      installAttributionProvider = optString("installAttributionProvider").takeIf { it.isNotBlank() },
      error = optString("error").takeIf { it.isNotBlank() }
    )

  private fun JSONObject.toMap(): Map<String, Any?> =
    keys().asSequence().associateWith { key ->
      when (val value = get(key)) {
        is JSONObject -> value.toMap()
        JSONObject.NULL -> null
        else -> value
      }
    }

  private suspend fun getJson(endpoint: String): JSONObject = withContext(Dispatchers.IO) {
    val connection = URL(endpoint).openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    readJson(connection)
  }

  private suspend fun postJson(endpoint: String, json: String): JSONObject = withContext(Dispatchers.IO) {
    val connection = URL(endpoint).openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.doOutput = true
    OutputStreamWriter(connection.outputStream).use { it.write(json) }
    readJson(connection)
  }

  private fun readJson(connection: HttpURLConnection): JSONObject {
    val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
    return JSONObject(stream.bufferedReader().use { it.readText() })
  }

  private fun encodeQuery(params: Map<String, String>): String =
    params.entries.joinToString("&") { (key, value) ->
      "${URLEncoder.encode(key, "UTF-8")}=${URLEncoder.encode(value, "UTF-8")}"
    }

  private fun trimSlash(value: String): String = value.trimEnd('/')
}
