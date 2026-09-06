import { fieldError } from './validation'

// The slice of a TanStack Form field this input touches. Kept structural so the
// component does not depend on @tanstack/react-form (a transitive package) for
// its type; any string field from the form satisfies it.
type FieldLike = {
  state: {
    value: string
    meta: { isTouched: boolean; errors: ReadonlyArray<unknown> }
  }
  handleBlur: () => void
  handleChange: (value: string) => void
}

type Props = {
  field: FieldLike
  type: 'email' | 'password'
  name: string
  autoComplete: string
  /** The field's name in words. Rendered above the input and never hidden. */
  label: string
  placeholder?: string
}

/**
 * A single text input wired to a TanStack Form field, with its error line.
 *
 * The label is a real `<label>` and stays on screen. It used to be carried by
 * the placeholder alone, which reads as three unlabelled text boxes to a screen
 * reader and vanishes for everyone the moment they start typing — so the one
 * moment you most want to check which box you are in is the moment the answer
 * disappears. The error line is tied to the input with `aria-describedby` for
 * the same reason: read out on focus rather than left as a colour.
 */
export function AuthField({
  field,
  type,
  name,
  autoComplete,
  label,
  placeholder,
}: Props) {
  const showError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorId = `${name}-error`

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-[13px] font-medium text-ink-2"
      >
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
        className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      {showError && (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {fieldError(field.state.meta.errors)}
        </p>
      )}
    </div>
  )
}
