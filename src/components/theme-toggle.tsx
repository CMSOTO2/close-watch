import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export const THEME_KEY = 'cw.theme'

/**
 * Inlined in <head> before paint so the first frame is already the right
 * theme — without it the canvas flashes bone-white before dark applies.
 * Kept as a string because it has to run ahead of hydration.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

type Theme = 'light' | 'dark'

function liveTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeToggle() {
  // Which icon shows is decided by CSS off the `dark` class the pre-paint
  // script has already set, not by state. State used to drive it, which meant
  // a dark-mode load rendered the moon for a frame and then swapped to the sun
  // once the effect ran — a visible flicker in the bar on every page load.
  // State survives only to describe the button, where a frame of the generic
  // label costs nothing.
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => setTheme(liveTheme()), [])

  function toggle() {
    // Read the live class rather than state, so a click landing before the
    // mount effect still flips the way the user can see it should.
    const next: Theme = liveTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    setTheme(next)
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
        theme === null
          ? 'Toggle theme'
          : theme === 'dark'
            ? 'Switch to light theme'
            : 'Switch to dark theme'
      }
      className="grid size-8 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Sun aria-hidden className="hidden size-4 dark:block" />
      <Moon aria-hidden className="size-4 dark:hidden" />
    </button>
  )
}
