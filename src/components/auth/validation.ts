import { z } from 'zod'

export type Mode = 'signin' | 'signup'

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email'))

const hasUpper = (s: string) =>
  [...s].some((c) => c !== c.toLowerCase() && c === c.toUpperCase())
const hasDigit = (s: string) => [...s].some((c) => c >= '0' && c <= '9')

export const signinPasswordSchema = z.string().min(1, 'Password is required')

// Sign-up policy: >=6 chars, at least one number and one uppercase. superRefine
// so we surface one message at a time instead of every failing rule at once.
export const signupPasswordSchema = z.string().superRefine((value, ctx) => {
  const message =
    value.length < 6
      ? 'At least 6 characters'
      : !hasUpper(value)
        ? 'Add an uppercase letter'
        : !hasDigit(value)
          ? 'Add a number'
          : null
  if (message) ctx.addIssue({ code: 'custom', message })
})

// Function validators return strings; zod (Standard Schema) validators return
// issue objects. Normalise both to a readable message.
export const fieldError = (errors: ReadonlyArray<unknown>) =>
  errors
    .map((e) =>
      typeof e === 'string' ? e : ((e as { message?: string }).message ?? ''),
    )
    .filter(Boolean)
    .join(', ')
