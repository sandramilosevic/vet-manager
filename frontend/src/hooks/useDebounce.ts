import { useEffect, useState } from 'react'

/**
 * Delays a rapidly-changing value. Used on search inputs so typing doesn't
 * fire one request per keystroke — the backend throttles authenticated users
 * at 60 requests/minute, which a live-search box would blow through instantly.
 */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
