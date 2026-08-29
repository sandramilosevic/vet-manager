/**
 * Build-time configuration.
 *
 * Everything here comes from `VITE_*` environment variables, which Vite inlines
 * into the bundle. That means these values are PUBLIC — never put a secret,
 * API key or credential in a `VITE_*` variable.
 */

function readApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL

  if (configured && configured.trim()) {
    // Strip a trailing slash so path concatenation stays predictable.
    return configured.trim().replace(/\/+$/, '')
  }

  if (import.meta.env.DEV) {
    // Dev-only hint. Nothing sensitive is printed.
    console.warn(
      '[config] VITE_API_BASE_URL is not set; falling back to http://localhost:8000',
    )
    return 'http://localhost:8000'
  }

  // In production, assume the API is served from the same origin (the usual
  // reverse-proxy setup). Throwing here would blank the page before React can
  // mount, which is a worse failure than a wrong-but-visible base URL.
  return window.location.origin
}

export const API_BASE_URL = readApiBaseUrl()

/** All versioned endpoints live under this prefix (URLPathVersioning, v1). */
export const API_PREFIX = '/api/v1'

export const IS_PRODUCTION = import.meta.env.PROD
