import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { createProposal } from '#/lib/proposals/create'

export const Route = createFileRoute('/_authed/proposals/new')({
  component: NewProposal,
})

const MAX_BYTES = 25 * 1024 * 1024

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

function NewProposal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      title: '',
      clientName: '',
      dealValue: '',
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        const file = value.file!
        const pageCount = await readPageCount(file)

        const data = new FormData()
        data.set('title', value.title)
        data.set('clientName', value.clientName)
        data.set('dealValue', value.dealValue)
        data.set('file', file)
        data.set('pageCount', String(pageCount))

        await createProposal({ data })

        await queryClient.invalidateQueries({ queryKey: ['proposal-summaries'] })
        await router.navigate({ to: '/dashboard' })
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      }
    },
  })

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-xl font-semibold">New proposal</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Upload a PDF. You&rsquo;ll get a tracked link to send to your client.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="mt-8 space-y-5"
      >
        <form.Field
          name="title"
          validators={{ onChange: ({ value }) => (value.trim() ? undefined : 'Title is required') }}
        >
          {(field) => (
            <Field label="Title" hint="For your eyes — the client never sees it." field={field}>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Brand identity — Q3"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="clientName"
          validators={{
            onChange: ({ value }) => (value.trim() ? undefined : 'Client name is required'),
          }}
        >
          {(field) => (
            <Field label="Client name" field={field}>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Acme Studio"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="dealValue"
          validators={{
            onChange: ({ value }) =>
              !value || Number(value) >= 0 ? undefined : 'Deal value must be a positive number',
          }}
        >
          {(field) => (
            <Field
              label="Deal value"
              hint="Optional. Used to rank which proposals matter most."
              field={field}
            >
              <div className="flex items-center rounded-md border border-neutral-300 px-3">
                <span className="text-sm text-neutral-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="12000"
                  className="w-full px-2 py-2 text-sm outline-none"
                />
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="file"
          validators={{
            onChange: ({ value }) =>
              !value
                ? 'Choose a PDF to upload'
                : value.type !== 'application/pdf'
                  ? 'File must be a PDF'
                  : value.size > MAX_BYTES
                    ? 'PDF must be 25 MB or smaller'
                    : undefined,
          }}
        >
          {(field) => (
            <Field label="Proposal PDF" field={field}>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => field.handleChange(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-700"
              />
            </Field>
          )}
        </form.Field>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center gap-3 pt-2">
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Uploading…' : 'Create proposal'}
              </button>
            )}
          </form.Subscribe>
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
  field,
  children,
}: {
  label: string
  hint?: string
  field: { state: { meta: { isTouched: boolean; errors: Array<unknown> } } }
  children: React.ReactNode
}) {
  const { isTouched, errors } = field.state.meta
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {hint && <span className="ml-2 text-xs text-neutral-400">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {isTouched && errors.length > 0 && (
        <p className="mt-1 text-xs text-red-600">{errors.filter(Boolean).join(', ')}</p>
      )}
    </label>
  )
}
