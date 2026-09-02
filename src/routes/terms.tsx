import { createFileRoute, Link } from '@tanstack/react-router'
import { Bullets, Clause, LegalPage } from '#/components/legal-page'
import {
  FREE_DRAFT_PROPOSALS,
  FREE_LIVE_PROPOSALS,
  PDF_MAX_MB,
  SHARE_LINK_TTL_DAYS,
} from '#/constants'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of service · Closewatch' },
      {
        name: 'description',
        content:
          'The terms you agree to when you use Closewatch to track a proposal.',
      },
    ],
  }),
  component: Terms,
})

function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      updated="2 September 2026"
      intro="These are the terms you agree to by using Closewatch. They are written to be read rather than skipped, and they are short because the service is simple."
    >
      <Clause heading="What Closewatch does">
        <p>
          You upload a proposal as a PDF. We give you a link to send. When
          someone opens that link we record how they read it and show you the
          result. That is the whole service.
        </p>
      </Clause>

      <Clause heading="Your account">
        <p>
          Use an email address you control, keep your sign-in details to
          yourself, and tell us if you think someone else has got into your
          account. Anything done through your account is treated as done by you.
          You must be old enough to enter a contract where you live.
        </p>
      </Clause>

      <Clause heading="What you upload stays yours">
        <p>
          Your proposals are your property. You give us only the permission we
          need to run the service: to store your file, to serve it to the people
          you send links to, and to keep backups. We do not read your proposals
          for any other purpose, we do not use them to train anything, and the
          permission ends when you delete the file.
        </p>
      </Clause>

      <Clause heading="What you must not do">
        <Bullets
          items={[
            'Upload a document you do not have the right to share.',
            'Use Closewatch to track someone in a way the law where you or your recipient lives does not allow.',
            'Upload malware, or anything unlawful, or material that infringes someone else’s rights.',
            'Try to break, overload or work around the limits of the service, or access another account’s data.',
            'Resell the service as your own.',
          ]}
        />
        <p>
          You are responsible for meeting any disclosure obligation that applies
          to you. What Closewatch records is set out in the{' '}
          <Link
            to="/privacy"
            className="font-medium text-brand hover:underline"
          >
            privacy policy
          </Link>
          .
        </p>
      </Clause>

      <Clause heading="Share links">
        <p>
          A share link works for whoever holds it. That is deliberate, because
          it is what lets your client open the proposal without an account, but
          it means a forwarded link opens for the person it was forwarded to.
          Links stop working {SHARE_LINK_TTL_DAYS} days after you create them,
          and you can revoke any link at any time.
        </p>
      </Clause>

      <Clause heading="Limits">
        <p>
          Proposals are PDFs of up to {PDF_MAX_MB} MB. The free plan keeps{' '}
          {FREE_LIVE_PROPOSALS} proposals live at a time. A proposal is live once
          you create its first share link; marking it won or lost, or archiving
          it, frees the slot and keeps its history. Drafts you have not shared do
          not count against that, up to {FREE_DRAFT_PROPOSALS} at a time. We may
          add or adjust usage limits to keep the service running for everyone,
          and will give notice before a change that would affect what you are
          already doing.
        </p>
      </Clause>

      <Clause heading="Paying">
        <p>
          Every feature is on the free plan. A paid plan lifts the limit on how
          many proposals can be live at once, and nothing else changes.
        </p>
        <p>
          Solo is $19 per month, charged in advance, and renews each month until
          you cancel. Cancel whenever you like from Settings: the plan stays on
          until the end of the period you have already paid for, and then stops.
          We do not pro-rate a part-used month, and we do not charge to close an
          account.
        </p>
        <p>
          Payment is handled by Stripe on their own pages. We never see or store
          your card number.
        </p>
        <p>
          If a subscription ends while more than{' '}
          {FREE_LIVE_PROPOSALS} proposals are live, nothing is deleted or
          hidden. Everything stays readable and every link you have sent keeps
          tracking; you simply cannot send a new proposal until you are back
          within the free limit.
        </p>
        <p>
          We will give at least 30 days&rsquo; notice by email before changing
          the price of a plan you are on, and the change takes effect at your
          next renewal. If a payment fails, we will retry and email you before
          anything stops working.
        </p>
      </Clause>

      <Clause heading="Availability">
        <p>
          Closewatch is offered as it is. We work to keep it up and correct, but
          we do not promise it will be uninterrupted or error-free, and we do
          not guarantee that any measurement is complete. A reader with
          JavaScript disabled, an unusual browser, or an aggressive privacy
          extension may not be recorded at all. Do not treat an absence of
          activity as proof that nobody read your proposal.
        </p>
      </Clause>

      <Clause heading="Ending it">
        <p>
          You can stop using Closewatch and delete your account whenever you
          like. We may suspend or close an account that breaks these terms, and
          will say why unless we are not permitted to.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          To the extent the law allows, Closewatch is not liable for lost
          profits, lost business or lost data, or for any indirect loss arising
          from your use of the service, including a deal that did not close.
          Nothing here limits liability that cannot lawfully be limited.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If these terms change, the date at the top changes and we tell account
          holders before the change takes effect. Continuing to use Closewatch
          after that means you accept the new version.
        </p>
      </Clause>
    </LegalPage>
  )
}
