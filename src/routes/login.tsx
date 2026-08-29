import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '#/components/auth/login-form'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
