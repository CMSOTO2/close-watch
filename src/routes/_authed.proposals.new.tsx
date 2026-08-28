import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createProposal } from '#/lib/proposals/create'

export const Route = createFileRoute('/_authed/proposals/new')({
  component: NewProposal,
})

/** Reads the page count from the chosen PDF without a full render. */
async function readPageCount(file: File): Promise<number> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const pages = doc.numPages
  await loadingTask.destroy()
  return pages
}

type Status = 'idle' | 'working' | 'error'

function NewProposal() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    // Capture the form now: React nulls out e.currentTarget after the first
    // await below, and FormData would then be constructed from null.
    const formEl = e.currentTarget
    if (!file) {
      setError('Choose a PDF to upload.')
      setStatus('error')
      return
    }

    setStatus('working')
    setError(null)

    try {
      const pageCount = await readPageCount(file)

      const form = new FormData(formEl)
      form.set('file', file)
      form.set('pageCount', String(pageCount))

      await createProposal({ data: form })

      await queryClient.invalidateQueries({ queryKey: ['proposal-summaries'] })
      await router.navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setStatus('error')
    }
  }

  const busy = status === 'working'

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-xl font-semibold">New proposal</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Upload a PDF. You&rsquo;ll get a tracked link to send to your client.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Field label="Title" hint="For your eyes — the client never sees it.">
          <input
            name="title"
            required
            placeholder="Brand identity — Q3"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Client name">
          <input
            name="clientName"
            required
            placeholder="Acme Studio"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Deal value" hint="Optional. Used to rank which proposals matter most.">
          <div className="flex items-center rounded-md border border-neutral-300 px-3">
            <span className="text-sm text-neutral-400">$</span>
            <input
              name="dealValue"
              type="number"
              min="0"
              step="0.01"
              placeholder="12000"
              className="w-full px-2 py-2 text-sm outline-none"
            />
          </div>
        </Field>

        <Field label="Proposal PDF">
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-700"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Create proposal'}
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: '/dashboard' })}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {hint && <span className="ml-2 text-xs text-neutral-400">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
