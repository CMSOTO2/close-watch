import { Link, createFileRoute } from '@tanstack/react-router'
import { Bullets, Clause, LegalPage } from '#/components/legal-page'
import { canonical, socialMeta } from '#/lib/seo'
import { SHARE_LINK_TTL_DAYS } from '#/constants'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy policy · Closewatch' },
      {
        name: 'description',
        content:
          'What Closewatch records, who it is shared with, and how long it is kept.',
      },
      ...socialMeta({
        title: 'Privacy policy · Closewatch',
        description:
          'What Closewatch records, who it is shared with, and how long it is kept.',
        path: '/privacy',
      }),
    ],
    links: canonical('/privacy'),
  }),
  component: Privacy,
})

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="9 September 2026"
      intro="Closewatch measures how people read the proposals you send. That means we record things about your clients, so this page says plainly what is collected, why, who it reaches, and how long it is kept."
    >
      <Clause heading="Two different people are described here">
        <p>
          An <strong className="font-semibold text-ink">account holder</strong>{' '}
          is someone who signs up and uploads proposals. A{' '}
          <strong className="font-semibold text-ink">reader</strong> is someone
          who opens a proposal link an account holder sent them. Almost all the
          confusion about tracking tools comes from mixing those two up, so they
          are kept separate below.
        </p>
      </Clause>

      <Clause heading="What we collect from account holders">
        <Bullets
          items={[
            'Your email address, and the name and company name you choose to enter. Your company name is what readers see as the sender.',
            'If you sign in with Google, the email address and name on that Google account. We ask Google for nothing else, and we cannot see your Google password.',
            'The proposal PDFs you upload, which are held in private storage that is not publicly listable.',
            'A session cookie so you stay signed in.',
            'On a paid plan, an identifier for your Stripe customer record and what Stripe reports about the subscription: its state and when the period ends. Your card number is typed on Stripe\u2019s own pages and never reaches us.',
          ]}
        />
      </Clause>

      <Clause heading="What we record when someone opens your proposal">
        <p>
          This is the part that makes the product work, so it is worth reading
          closely. When a reader opens one of your links we store:
        </p>
        <Bullets
          items={[
            'When the link was opened, when the reader was last active, and how many separate times they have come back.',
            'How many seconds of visible attention each page received, and whether the last page was reached.',
            'Whether the PDF was downloaded or printed.',
            'The browser, operating system and device type, taken from the request.',
            'The referring web address, if the browser sent one.',
            <>
              A one-way{' '}
              <strong className="font-semibold text-ink">
                salted hash of the IP address
              </strong>
              , truncated. The address itself is never written down, and the
              hash cannot be turned back into one.
            </>,
            'Whether the request looked automated, and which rule flagged it, so bots and link previews can be excluded from your numbers.',
          ]}
        />
        <p>
          We do <strong className="font-semibold text-ink">not</strong> learn a
          reader&rsquo;s name or email address from their visit. The only name
          attached to a link is the label the account holder typed when creating
          it. Additional readers appear as &ldquo;Reader 2&rdquo;, &ldquo;Reader
          3&rdquo; and so on.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          Closewatch sets two cookies and no others. A session cookie keeps
          account holders signed in. A cookie named{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[13px]">
            cw_vid
          </code>{' '}
          is set on a reader&rsquo;s browser holding a random identifier, so
          that the same person returning tomorrow is recognised as a second
          visit rather than a second person. It is first-party and server-only,
          cannot be read by JavaScript, and lasts a year.
        </p>
        <p>
          Our own pages &mdash; the home page, sign-in and the dashboard
          &mdash; count visits with Cloudflare Web Analytics, which sets no
          cookies and does not fingerprint anyone. Those pages also run a
          Google Ads tag, which does set an advertising cookie, so that we can
          tell whether an ad we paid for led to a signup. Neither ever loads
          on a share link: the page a reader is sent runs no analytics or
          advertising script at all, and nothing about a reader is used for
          advertising.
        </p>
      </Clause>

      <Clause heading="Who else sees it">
        <p>
          We do not sell data. Aside from the Google Ads tag on our own
          marketing pages, described above, we do not share data for
          advertising. It reaches these companies only because they run parts
          of the service:
        </p>
        <Bullets
          items={[
            'Supabase: the database, sign-in, and file storage.',
            'Cloudflare: hosting the application, and counting visits to our own pages.',
            'Google Ads: measuring whether an ad led to a signup, on our own marketing pages only.',
            'Resend: sending notification email, when that is switched on.',
            'Stripe: taking payment, for account holders on a paid plan.',
            'Google: only if you choose to sign in with Google.',
          ]}
        />
        <p>
          If you are an account holder in the UK or EU, the data you collect
          about your own clients is yours and we process it on your
          instructions. Our{' '}
          <Link
            to="/dpa"
            className="underline underline-offset-2 hover:text-ink"
          >
            data processing agreement
          </Link>{' '}
          sets out those terms, and lists the same companies above as
          sub-processors.
        </p>
      </Clause>

      <Clause heading="How long it is kept">
        <Bullets
          items={[
            'Delete a proposal and its file, its links and every visit, page view and event recorded against it are deleted with it.',
            <>
              Share links stop working {SHARE_LINK_TTL_DAYS} days after they are
              created, and can be revoked sooner at any time.
            </>,
            'Close your account and we delete your proposals and the tracking data attached to them.',
            <>
              Twelve months after a visit, we strip the parts of it that could
              point at a person: the hashed IP address, the city, and the
              referring link. What is left is the reading itself &mdash; when,
              how long, which pages &mdash; and the country. This runs nightly,
              whether or not anyone asks.
            </>,
          ]}
        />
        <p>
          Nothing here is kept because it might be useful one day. A visit is
          kept because the account holder is still working the deal it belongs
          to, and stops being kept in full the moment that stops being true.
        </p>
      </Clause>

      <Clause heading="Your choices">
        <p>
          Account holders can export or delete their data from inside the
          product, or by writing to us. Readers who would rather not be measured
          can ask the person who sent the proposal to revoke the link, or write
          to us directly and we will remove the visits associated with it.
        </p>
      </Clause>

      <Clause heading="Your responsibilities as an account holder">
        <p>
          You decide who receives a link, so you are the one who knows whether
          the laws that apply to you and your client require you to say that the
          document is tracked. Some jurisdictions and some industries do.
          Closewatch gives you the tooling; the disclosure obligation is yours.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If this policy changes in a way that affects what is collected, the
          date at the top changes and account holders are told before it takes
          effect.
        </p>
      </Clause>
    </LegalPage>
  )
}
