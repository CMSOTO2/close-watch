import { useEffect, useState } from 'react'

/**
 * A string state that remembers the last choice in localStorage. Starts from
 * `fallback` on both the server and the first client render (so hydration
 * matches), then adopts any stored value on mount. Silently keeps the fallback
 * if storage is unavailable or holds an unrecognized value.
 */
export function usePersistedChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: ReadonlyArray<T>,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(fallback)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (
        stored !== null &&
        (allowed as ReadonlyArray<string>).includes(stored)
      ) {
        setValue(stored as T)
      }
    } catch {
      // Storage blocked (private mode, etc.) — the fallback still works.
    }
  }, [key, allowed])

  const update = (next: T) => {
    setValue(next)
    try {
      window.localStorage.setItem(key, next)
    } catch {
      // Ignore write failures; the in-memory choice still applies this session.
    }
  }

  return [value, update]
}
