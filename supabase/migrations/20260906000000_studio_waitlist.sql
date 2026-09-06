-- Who wants the Studio plan, collected from the pricing page while the plan
-- itself does not exist.
--
-- The card carries a $49 price and three features marked "soon", which was a
-- dead button and a claim with nothing behind it. This turns it into the one
-- useful thing a plan you cannot sell can do: find out whether anyone wants it.
-- With three accounts and no paying users, that answer is worth more than the
-- tidiness of hiding the card.

create table public.studio_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  -- Whoever asked, if they happened to be signed in. Null for the far more
  -- common case of someone reading the pricing page before signing up.
  user_id    uuid references auth.users (id) on delete set null,
  -- Which page the ask came from, so a future second entry point is
  -- distinguishable from the pricing card without a schema change.
  source     text not null default 'pricing',
  created_at timestamptz not null default now()
);

-- Case-insensitively unique: the same person asking twice from two devices is
-- one person wanting Studio, not two, and the insert is written to shrug at a
-- repeat rather than show them an error for pressing a button again.
create unique index studio_waitlist_email_key
  on public.studio_waitlist (lower(email));

-- RLS on with no policies at all, which denies everyone. This table is written
-- only by the server function behind the form, using the service role, and read
-- only from the dashboard. A public form backed by a client-side insert would
-- be an open write endpoint on a table of email addresses.
alter table public.studio_waitlist enable row level security;
