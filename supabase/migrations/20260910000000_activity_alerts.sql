-- Activity emails: the reads worth interrupting the owner for beyond the first
-- open. The rules live in src/lib/notify/alerts.ts; these columns are the
-- claims that keep each email to exactly one send, in the same
-- update-where-null shape as first_open_notified_at.

alter table public.proposals
  -- When the "just went hot" email was sent. Once per proposal, ever.
  add column hot_notified_at timestamptz,
  -- When any activity email about this proposal was last sent. The floor that
  -- stops one reader on a laptop and then a phone producing two emails.
  add column last_alerted_at timestamptz;

alter table public.visits
  -- Set once this reading session has produced an email. A long read flushes
  -- every ten seconds and stays "a return" or "a new reader" the whole time,
  -- so without it the floor would be the only thing between it and a second
  -- email an hour later.
  add column alerted_at timestamptz;

-- No backfill. A proposal that is already hot does not cross into hot again,
-- which is the condition the email fires on, so switching this on does not
-- announce every hot deal at once.
