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
  placeholder: string
}

/** A single text input wired to a TanStack Form field, with its error line. */
export function AuthField({
  field,
  type,
  name,
  autoComplete,
  placeholder,
}: Props) {
  return (
    <div>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="mt-1 text-xs text-danger">
          {fieldError(field.state.meta.errors)}
        </p>
      )}
    </div>
  )
}
