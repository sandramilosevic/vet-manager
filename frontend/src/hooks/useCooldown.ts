import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeError } from '../api/errors'

/**
 * Tracks a throttle cooldown so the UI can disable the submit button and show
 * a countdown instead of letting the user hammer a rate-limited endpoint.
 *
 * The backend throttles aggressively on exactly the endpoints this is used
 * for: login 5/min, password reset 5/hour, invite accept 10/hour,
 * invite send 20/day, logout 10/min.
 */
export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(
    (seconds: number) => {
      stop()
      setSecondsLeft(seconds)
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((current) => {
          if (current <= 1) {
            stop()
            return 0
          }
          return current - 1
        })
      }, 1000)
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  /**
   * Feeds an API error in; starts a countdown if it was a 429.
   * Returns true when the error was a rate limit, so callers can skip their
   * own generic error handling.
   */
  const handleError = useCallback(
    (error: unknown): boolean => {
      const normalized = normalizeError(error)
      if (!normalized.isRateLimited) return false
      // DRF doesn't always include a wait time; 60s is a safe default given
      // the shortest configured window is per-minute.
      start(normalized.retryAfterSeconds ?? 60)
      return true
    },
    [start],
  )

  const label =
    secondsLeft > 60
      ? `Try again in ${Math.ceil(secondsLeft / 60)} min`
      : `Try again in ${secondsLeft}s`

  return { secondsLeft, isCoolingDown: secondsLeft > 0, start, handleError, label }
}
