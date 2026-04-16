// KowloonClient factory — single cached instance per server URL.
// Import getClient() anywhere you need to make API calls.
// Import clearClient() on logout to reset the cache.

import KowloonClient from '@kowloon/client'

let _client = null
let _clientUrl = null

/**
 * Resolve the API base URL using, in order:
 *   1. Explicit argument (user-specified server, multi-instance mode)
 *   2. window.KOWLOON_CONFIG.apiUrl (injected by Docker entrypoint for separate deployments)
 *   3. VITE_SERVER_URL env var (build-time override for dev / custom deploys)
 *   4. localStorage (previously saved server URL)
 *   5. window.location.origin (same-origin deployment via Caddy — the default)
 */
export function resolveServerUrl(explicit) {
  return (
    explicit ||
    window.KOWLOON_CONFIG?.apiUrl ||
    import.meta.env.VITE_SERVER_URL ||
    localStorage.getItem('kowloon_server_url') ||
    window.location.origin
  )
}

/**
 * Get (or create) a KowloonClient for the given server URL.
 * Returns null if no URL can be resolved.
 */
export function getClient(serverUrl) {
  const url = resolveServerUrl(serverUrl)
  if (!url) return null
  if (_client && _clientUrl === url) return _client
  _client = new KowloonClient({ baseUrl: url })
  _clientUrl = url
  return _client
}

/**
 * Destroy the cached client. Call on logout or server switch.
 */
export function clearClient() {
  _client = null
  _clientUrl = null
}
