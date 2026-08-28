import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Know which proposals are actually being read.
      </h1>
      <p className="mt-4 text-neutral-600">
        Upload the PDF you already send. Closewatch gives you a link that tells you when
        your client opened it, how long they spent on pricing, and whether they forwarded
        it to someone else.
      </p>
      <Link
        to="/login"
        className="mt-8 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Get started
      </Link>
    </main>
  )
}
