-- Funnel instrumentation for the new-proposal form, the one gap in "what
-- happened before someone gave up": Cloudflare Web Analytics sees a pageview
-- on /proposals/new, and the proposals table sees a row if one gets created,
-- but nothing records the steps in between. Three real signups in a row have
-- opened the app and never created a proposal, and there was no way to tell
-- whether they never found the form, opened it and had no PDF handy, hit the
-- known pdfjs failure on some devices, or something else in submission.
create table public.onboarding_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Deliberately few, ordered steps rather than a free-text event name: this
  -- exists to answer "where did they stop", which only needs a funnel, not a
  -- general-purpose analytics table.
  step       text not null check (
    step in (
      'form_opened',
      'file_selected',
      'pdf_read_failed',
      'submit_failed',
      'proposal_created'
    )
  ),
  -- Short and optional. An error message for the two failure steps, always
  -- truncated before it reaches here — never the PDF's content or filename.
  detail     text,
  created_at timestamptz not null default now()
);

create index onboarding_events_user_id_idx
  on public.onboarding_events (user_id, created_at);

-- RLS on with no policies, same as studio_waitlist and for the same reason:
-- this is written only by the server function behind the form, using the
-- service role. A client-side insert would let anyone write arbitrary rows
-- into another user's funnel.
alter table public.onboarding_events enable row level security;
