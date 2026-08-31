import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { cn } from '#/lib/utils'

type Tone = 'neutral' | 'good' | 'danger'
type Toast = { id: number; message: string; tone: Tone }

type Notify = (message: string, tone?: Tone) => void

const ToastContext = createContext<Notify>(() => {
  // No provider (a route rendered outside the shell) — silently drop rather
  // than crash. A missing confirmation is never worth a broken page.
})

export function useToast(): Notify {
  return useContext(ToastContext)
}

const DISMISS_MS = 3200

/**
 * Hand-rolled rather than pulling in a toast library, matching the same call
 * made for the confirm dialog: this needs one behaviour, and a dependency
 * would bring a theme to fight with the token system.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast>>([])

  const notify = useCallback<Notify>((message, tone = 'neutral') => {
    setToasts((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), message, tone },
    ])
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        // polite, not assertive: a confirmation should never interrupt what a
        // screen reader is already saying.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDone={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const TONE: Record<Tone, string> = {
  neutral: 'border-line bg-surface text-ink',
  good: 'border-good-line bg-good-soft text-good',
  danger: 'border-line bg-danger-soft text-danger',
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const hide = setTimeout(() => setLeaving(true), DISMISS_MS)
    const remove = setTimeout(onDone, DISMISS_MS + 200)
    return () => {
      clearTimeout(hide)
      clearTimeout(remove)
    }
  }, [onDone])

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-md border px-3.5 py-2.5 text-[13px] font-medium shadow-lg',
        'motion-safe:transition-[opacity,transform] motion-safe:duration-200',
        leaving ? 'opacity-0 motion-safe:translate-y-1' : 'opacity-100',
        TONE[toast.tone],
      )}
    >
      {toast.message}
    </div>
  )
}
