import { useEffect, useState } from 'react'

export const THEME_KEY = 'cw.theme'

/**
 * Inlined in <head> before paint so the first frame is already the right
 * theme — without it the canvas flashes bone-white before dark applies.
 * Kept as a string because it has to run ahead of hydration.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

type Theme = 'light' | 'dark'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeToggle() {
  // Starts null so SSR and the first client render agree; the effect fills in
  // the real value, which the pre-paint script has already applied to <html>.
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    setTheme(stored === 'dark' || stored === 'light' ? stored : systemTheme())
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private browsing — the theme still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      }
      className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span aria-hidden className="text-[13px] leading-none">
        {theme === 'dark' ? '☀' : '☾'}
      </span>
    </button>
  )
}
