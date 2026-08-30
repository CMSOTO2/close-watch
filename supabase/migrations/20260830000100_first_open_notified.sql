-- Tracks whether the "first qualified open" email has been sent for a proposal.
-- The ingest endpoint claims it atomically (update ... where it is null) so
-- exactly one concurrent beacon sends the notification.

alter table public.proposals
  add column first_open_notified_at timestamptz;
