/**
 * Normalises the three different error shapes the backend can return into one
 * predictable object the UI can render.
 *
 * 1. `custom_exception_handler` (most DRF failures):
 *      {"error": {"code": "ValidationError", "message": "...", "details": {...}}}
 * 2. Plain APIViews that hand-roll failures (invite accept, logout, password
 *    reset, revoke):
 *      {"error": "This invitation link is invalid or has expired."}
 * 3. `SendInvitationView`, which returns raw serializer errors:
 *      {"email": ["Enter a valid email address."]}
 *
 * Nothing here is ever logged — messages may echo user input, and `details`
 * can contain PII.
 */

import { AxiosError } from 'axios'

export interface NormalizedError {
  /** Human-readable summary, always safe to render. */
  message: string
  /** HTTP status, when the request actually reached the server. */
  status?: number
  /** Backend exception class name, e.g. "ValidationError", when available. */
  code?: string
  /** Per-field messages, keyed by the serializer field name. */
  fieldErrors: Record<string, string>
  /** True for HTTP 429 — the caller should show cooldown feedback. */
  isRateLimited: boolean
  /** Seconds to wait, parsed from DRF's throttle message or `Retry-After`. */
  retryAfterSeconds?: number
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
const NETWORK_MESSAGE =
  'Cannot reach the server. Check your connection and that the API is running.'

/** Field names we never surface verbatim in a "field: message" summary. */
const NON_FIELD_KEYS = new Set(['detail', 'non_field_errors', 'error', '__all__'])

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item)
      if (found) return found
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = firstString(item)
      if (found) return found
    }
  }
  return undefined
}

/** Flattens `{field: ["a", "b"], nested: {x: ["c"]}}` into `{field: "a"}`. */
function collectFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const message = firstString(value)
    if (message) out[key] = message
  }
  return out
}

/**
 * DRF's throttle detail reads: "Request was throttled. Expected available in
 * 42 seconds." There is no machine-readable field, so we parse the number out.
 */
function parseRetryAfter(error: AxiosError, message: string): number | undefined {
  const header = error.response?.headers?.['retry-after']
  if (header) {
    const parsed = Number(header)
    if (Number.isFinite(parsed) && parsed > 0) return Math.ceil(parsed)
  }
  const match = /available in (\d+) second/i.exec(message)
  if (match) return Number(match[1])
  return undefined
}

export function normalizeError(error: unknown): NormalizedError {
  if (!(error instanceof AxiosError)) {
    return {
      message: error instanceof Error ? error.message : GENERIC_MESSAGE,
      fieldErrors: {},
      isRateLimited: false,
    }
  }

  // No response at all: network failure, CORS rejection, or timeout.
  if (!error.response) {
    return {
      message: error.code === 'ECONNABORTED' ? 'The request timed out.' : NETWORK_MESSAGE,
      fieldErrors: {},
      isRateLimited: false,
    }
  }

  const status = error.response.status
  const data = error.response.data as unknown

  let message = GENERIC_MESSAGE
  let code: string | undefined
  let fieldErrors: Record<string, string> = {}

  if (data && typeof data === 'object') {
    const envelope = (data as { error?: unknown }).error

    if (envelope && typeof envelope === 'object') {
      // Shape 1 — the custom exception handler.
      const e = envelope as { code?: string; message?: string; details?: unknown }
      code = e.code
      message = e.message || GENERIC_MESSAGE
      fieldErrors = collectFieldErrors(e.details)
      // `details` mirrors the whole payload, including `detail` for non-field
      // errors — drop those so they don't get attached to a form input.
      for (const key of NON_FIELD_KEYS) delete fieldErrors[key]
    } else if (typeof envelope === 'string') {
      // Shape 2 — hand-rolled {"error": "..."}.
      message = envelope
    } else {
      // Shape 3 — raw serializer errors.
      fieldErrors = collectFieldErrors(data)
      for (const key of NON_FIELD_KEYS) delete fieldErrors[key]
      message = firstString(data) || GENERIC_MESSAGE
    }
  } else if (typeof data === 'string' && data.trim()) {
    message = data
  }

  // Status-specific fallbacks when the body gave us nothing useful.
  if (message === GENERIC_MESSAGE) {
    if (status === 401) message = 'Your session has expired. Please sign in again.'
    else if (status === 403) message = 'You do not have permission to do that.'
    else if (status === 404) message = 'That record could not be found.'
    else if (status >= 500) message = 'The server encountered an error. Please try again.'
  }

  const isRateLimited = status === 429
  if (isRateLimited && message === GENERIC_MESSAGE) {
    message = 'Too many requests. Please wait before trying again.'
  }

  return {
    message,
    status,
    code,
    fieldErrors,
    isRateLimited,
    retryAfterSeconds: isRateLimited ? parseRetryAfter(error, message) : undefined,
  }
}

/** Convenience for components that only need a string. */
export function errorMessage(error: unknown): string {
  return normalizeError(error).message
}
