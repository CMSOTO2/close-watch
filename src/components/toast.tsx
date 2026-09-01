import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { AlertCircle, Check, CheckCircle2 } from 'lucide-react'
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
        // Top rather than bottom, where the eye already is after pressing
        // something, and centred rather than tucked right: the top-right of
        // every page is already spoken for by Sign out above and Delete or
        // New proposal below, and a toast landing on either of those is worse
        // than one that has to be read from the middle. The offset clears the
        // sticky header; on the header-less pages it reads as a top margin.
        className="pointer-events-none fixed left-1/2 top-[4.5rem] z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
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

/**
 * Three readings, not two: `neutral` is "that worked", `good` is a win worth a
 * beat of colour, `danger` is "that did not happen". Keeping the green for
 * closing a deal is the whole reason a plain confirmation stays plain.
 *
 * The icon carries its own colour rather than inheriting the message's. On the
 * tinted toasts that is the tone itself, a shade the body text already uses; on
 * the plain one it is brass, which is the only colour a neutral toast can take
 * without borrowing the green that means a deal closed. A grey tick — which is
 * what this was — is the same tick the disabled states use.
 */
const TONE: Record<
  Tone,
  { className: string; icon: string; Icon: typeof Check }
> = {
  neutral: {
    className: 'border-line bg-surface text-ink',
    icon: 'text-brand',
    Icon: Check,
  },
  good: {
    className: 'border-good-line bg-good-soft text-good',
    icon: 'text-good',
    Icon: CheckCircle2,
  },
  danger: {
    className: 'border-danger-line bg-danger-soft text-danger',
    icon: 'text-danger',
    Icon: AlertCircle,
  },
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

  const { className, icon, Icon } = TONE[toast.tone]

  return (
    <div
      className={cn(
        'toast-enter pointer-events-auto flex items-center gap-2 rounded-md border py-2.5 pl-3 pr-3.5 text-[13px] font-medium shadow-lg',
        'motion-safe:transition-[opacity,transform] motion-safe:duration-200',
        // Leaves the way it arrived — upward, back past the header.
        leaving ? 'opacity-0 motion-safe:-translate-y-1' : 'opacity-100',
        className,
      )}
    >
      <Icon aria-hidden className={cn('size-4 shrink-0', icon)} />
      {toast.message}
    </div>
  )
}
