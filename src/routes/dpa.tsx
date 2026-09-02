import { createFileRoute, Link } from '@tanstack/react-router'
import { Bullets, Clause, LegalPage } from '#/components/legal-page'
import { canonical } from '#/lib/seo'

export const Route = createFileRoute('/dpa')({
  head: () => ({
    meta: [
      { title: 'Data processing agreement · Closewatch' },
      {
        name: 'description',
        content:
          'The terms on which Closewatch processes the client data an account holder collects: scope, sub-processors, security, deletion and audit.',
      },
    ],
    links: canonical('/dpa'),
  }),
  component: Dpa,
})

/**
 * The Article 28 terms, for account holders whose own clients are in the UK or
 * EU. They are the controller — they choose who receives a proposal and why —
 * and Closewatch is the processor acting on their instructions.
 *
 * Written from what the code actually does rather than from a template: the
 * sub-processor list is the one in the privacy policy, the data categories are
 * the columns on `visits`, and the retention line is the nightly job in
 * 20260902000000_visit_retention.sql. Anything here that drifts from the code
 * is a bug in one of the two.
 */
function Dpa() {
  return (
    <LegalPage
      title="Data processing agreement"
      updated="2 September 2026"
      intro="When you send a proposal through Closewatch, you decide who receives it and why, and we record how they read it on your behalf. In UK and EU data protection law that makes you the controller and us the processor. These are the terms of that arrangement, and they apply to every account without needing to be signed separately."
    >
      <Clause heading="Who is who">
        <p>
          You are the controller of the personal data your recipients generate.
          Closewatch is your processor and acts only on your instructions, which
          are: host the proposal you upload, serve it to whoever holds the link
          you created, and report back how it was read. Uploading a proposal and
          creating a share link is how those instructions are given.
        </p>
        <p>
          For your own account — your email, your name, your billing details —
          we are the controller, and the{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-2 hover:text-ink"
          >
            privacy policy
          </Link>{' '}
          covers that half.
        </p>
      </Clause>

      <Clause heading="What is processed, and for how long">
        <p>
          Categories of data subject: the people you send proposals to, and
          anyone they forward one to.
        </p>
        <Bullets
          items={[
            'The recipient name and email address you type when creating a link.',
            'When a link was opened, for how long, and which pages were read.',
            'Whether the document was downloaded or printed.',
            'A first-party cookie identifying the browser, so a return visit is not counted as a new reader.',
            'A hashed IP address, the country and city its network resolves to, and the browser, operating system and device type.',
          ]}
        />
        <p>
          Processing lasts as long as your account does. Twelve months after a
          visit we strip the hashed IP address, the city and the referring link
          from it automatically. Delete a proposal and everything recorded
          against it goes with it; close your account and all of it does.
        </p>
      </Clause>

      <Clause heading="Sub-processors">
        <p>
          These companies process the data because they run parts of the
          service. We will tell account holders before adding another, in time
          to object.
        </p>
        <Bullets
          items={[
            'Supabase — database, authentication and file storage.',
            'Cloudflare — application hosting and delivery.',
            'Resend — notification email, where enabled.',
            'Stripe — payment processing for account holders on a paid plan. It never receives reader data.',
            'Google — only where an account holder chooses to sign in with Google.',
          ]}
        />
      </Clause>

      <Clause heading="Security and confidentiality">
        <Bullets
          items={[
            'Proposal files are held in private storage and reached only through short-lived signed links.',
            'Every table is protected by row-level security, so one account cannot read another account’s rows.',
            'IP addresses are hashed with a secret salt before they are stored, and never kept in the clear.',
            'Share links carry an unguessable token, expire on a set date, and can be revoked at any time.',
            'Anyone with access to production data is bound to keep it confidential.',
          ]}
        />
      </Clause>

      <Clause heading="Helping you meet your own obligations">
        <p>
          If one of your recipients asks you for their data, or asks you to
          delete it, write to us and we will find or remove the visits behind
          that share link. You can also revoke a link yourself at any moment,
          which stops any further recording immediately.
        </p>
        <p>
          If personal data in our care is exposed, we will tell affected account
          holders without undue delay and with what we know at the time, so you
          can meet your own reporting deadline.
        </p>
      </Clause>

      <Clause heading="Where the data sits">
        <p>
          Our sub-processors operate globally, so data may be processed outside
          the country it was collected in. Each of them offers standard
          contractual clauses for those transfers, and we rely on them.
        </p>
      </Clause>

      <Clause heading="Audit, and the end of the arrangement">
        <p>
          On request we will answer reasonable questions in writing about how
          the data is handled, and share what our sub-processors publish about
          their own controls. When your account closes we delete the data rather
          than return it, unless you ask for an export first.
        </p>
      </Clause>

      <Clause heading="Signing it">
        <p>
          These terms apply to every account as part of the{' '}
          <Link
            to="/terms"
            className="underline underline-offset-2 hover:text-ink"
          >
            terms of service
          </Link>
          , so there is nothing to countersign for them to bind us. If your
          client needs a copy on their own paper, write to us and we will sign
          yours.
        </p>
      </Clause>
    </LegalPage>
  )
}
