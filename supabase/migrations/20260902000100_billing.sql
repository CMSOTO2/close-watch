-- Billing: who is on which plan, and the cap that makes the free plan free.
--
-- Stripe is the source of truth. This table is a cache of it, written only by
-- the webhook holding the secret key. There is deliberately no policy letting a
-- signed-in user write their own row: `plan` is the column a paywall reads, and
-- a user who can set it does not need a card.

create type public.billing_plan as enum ('free', 'solo', 'studio');

create table public.subscriptions (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  plan                   public.billing_plan not null default 'free',
  -- Stripe's own status verbatim: active, trialing, past_due, canceled,
  -- incomplete, incomplete_expired, unpaid, paused. Kept as text rather than an
  -- enum so a new Stripe status cannot fail a webhook write.
  status                 text,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

create policy "read own subscription" on public.subscriptions
  for select using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Entitlement
-- ---------------------------------------------------------------------------

-- No row means free, which is why nothing backfills existing users.
--
-- past_due counts as entitled. It means a renewal charge failed and Stripe is
-- retrying; the subscription becomes canceled or unpaid if the retries run out,
-- and that is the moment access should stop. Cutting someone off on the first
-- failed card is how a legitimate customer with an expired card gets locked out
-- of their own pipeline.
create function public.has_active_plan(uid uuid)
returns boolean
language sql
stable
security definer
-- Pinned for the same reason as every other definer function here.
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.subscriptions s
     where s.user_id = uid
       and s.plan <> 'free'
       and s.status in ('active', 'trialing', 'past_due')
  );
$$;

-- Active means draft or sent: still in play. Won, lost and archived are history,
-- they cost nothing to keep, and they free the slot. So a free user who closes
-- deals can use this forever, and what they buy on Solo is the ability to have
-- more than two in flight at once.
--
-- The 2 has to match FREE_ACTIVE_PROPOSALS in src/constants.ts. This copy is the
-- one that is enforced; the TypeScript one only decides what the UI says.
create function public.active_proposal_count(uid uuid, excluding uuid default null)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
    from public.proposals p
   where p.owner_id = uid
     and p.status in ('draft', 'sent')
     and (excluding is null or p.id <> excluding);
$$;

create function public.can_create_proposal(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_active_plan(uid) or public.active_proposal_count(uid) < 2;
$$;

-- RLS policy expressions run as the querying role, so `authenticated` has to be
-- able to call these. anon never can: nothing it reaches goes through them.
revoke execute on function public.has_active_plan(uuid) from public, anon;
revoke execute on function public.active_proposal_count(uuid, uuid) from public, anon;
revoke execute on function public.can_create_proposal(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- The cap itself
-- ---------------------------------------------------------------------------

-- Restrictive, so it ANDs with "own proposals" rather than being OR'd past it.
-- The app checks the same rule first to produce a sentence a human can read;
-- this is the one that is actually true.
create policy "free plan proposal cap" on public.proposals
  as restrictive for insert
  with check (public.can_create_proposal(owner_id));

-- Reopening a won deal or unarchiving an old one is also a way to end up with
-- three active proposals on a free plan. The row being updated is excluded from
-- the count by id, so this does not depend on whether the subquery sees the new
-- status or the old one.
create policy "free plan proposal cap on reopen" on public.proposals
  as restrictive for update
  with check (
    status not in ('draft', 'sent')
    or public.has_active_plan(owner_id)
    or public.active_proposal_count(owner_id, id) < 2
  );
