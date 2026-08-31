import { createFileRoute, Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { LoginForm } from '#/components/auth/login-form'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-7 inline-flex">
          <Wordmark />
        </Link>
        <div className="rounded-lg border border-line bg-surface px-6 py-7 shadow-md">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
