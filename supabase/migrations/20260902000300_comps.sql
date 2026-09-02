-- Comped accounts: full access without paying.
--
-- A separate table rather than a column on `subscriptions`, for two reasons.
-- The webhook owns every column of that table and rewrites the row on each
-- event, so a comp living there is one Stripe event away from being erased. And
-- keeping them apart means "how many paying customers are there" stays an
-- honest question: a comp never looks like revenue.
--
-- Granting is deliberate and manual. There is no UI and no self-serve path;
-- someone with database access runs grant_comp() and it is written down who,
-- why, and until when.

create table public.comps (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  plan       public.billing_plan not null default 'solo',
  -- Null means indefinitely. A date is better where one is honest: an expiring
  -- comp asks the question again rather than quietly becoming forever.
  until      timestamptz,
  -- Why this account. Future you will want it: "beta tester", "case study",
  -- "friend of the house" and "support apology" age very differently.
  note       text,
  granted_at timestamptz not null default now()
);

alter table public.comps enable row level security;

-- Readable by its owner so the app can say "your account is comped" instead of
-- offering them a plan they already have. Writable by nobody through the API.
create policy "read own comp" on public.comps
  for select using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Entitlement now has two doors
-- ---------------------------------------------------------------------------

create or replace function public.has_active_plan(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.subscriptions s
     where s.user_id = uid
       and s.plan <> 'free'
       and s.status in ('active', 'trialing', 'past_due')
  )
  or exists (
    select 1
      from public.comps c
     where c.user_id = uid
       and c.plan <> 'free'
       and (c.until is null or c.until > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- Granting and revoking
-- ---------------------------------------------------------------------------

-- By email, because that is what you know about the person you are comping.
-- Raises rather than silently doing nothing when the address has no account:
-- a typo that quietly succeeds is how someone waits a week for access that was
-- never granted.
create function public.grant_comp(
  user_email text,
  comp_plan public.billing_plan default 'solo',
  until timestamptz default null,
  note text default null
)
returns public.comps
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid;
  result public.comps;
begin
  select id into target from public.profiles where lower(email) = lower(user_email);
  if target is null then
    raise exception 'No account with the email %', user_email;
  end if;

  insert into public.comps (user_id, plan, until, note)
       values (target, comp_plan, until, note)
  on conflict (user_id) do update
          set plan = excluded.plan,
              until = excluded.until,
              note = excluded.note,
              granted_at = now()
    returning * into result;

  return result;
end;
$$;

create function public.revoke_comp(user_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.comps c
   using public.profiles p
   where c.user_id = p.id and lower(p.email) = lower(user_email);
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- Same reasoning as prune_visit_identifiers: PostgREST exposes anything in
-- `public` as an RPC, and nothing but a database session should be able to hand
-- out free accounts.
revoke execute on function public.grant_comp(text, public.billing_plan, timestamptz, text)
  from public, anon, authenticated;
revoke execute on function public.revoke_comp(text) from public, anon, authenticated;
