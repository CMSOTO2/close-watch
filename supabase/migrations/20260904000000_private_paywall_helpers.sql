-- Take the paywall helpers out of the API's reach.
--
-- These five are SECURITY DEFINER because they have to see rows the caller
-- cannot, and `authenticated` has to be able to execute them because an RLS
-- policy expression is evaluated as the querying role rather than as the
-- policy's author. Those two facts together had a consequence nobody chose:
-- PostgREST exposes every function in `public` that the caller may execute, so
-- `sent_proposal_count` was reachable at /rest/v1/rpc/sent_proposal_count, and
-- a signed-in user holding somebody else's uuid could read how many proposals
-- that person had live. Not a way in, and not nothing either.
--
-- Revoking EXECUTE is the obvious fix and it breaks the paywall: the policies
-- stop being evaluable and every insert fails. The functions have to stay
-- callable and stop being published, which means moving them somewhere
-- PostgREST does not look. A schema that is not in the exposed list is exactly
-- that, and it needs no application change because nothing outside these
-- policies ever called them.
--
-- Keep new helpers of this shape in `private` from the start. The rule is not
-- "definer functions are dangerous" but "a definer function in `public` is a
-- public API whether or not you meant to publish one".

create schema if not exists private;

-- Nothing anon reaches goes through a policy that uses these, so it gets no
-- usage on the schema at all. Without USAGE the grants below are unreachable
-- anyway; both are stated so neither has to be inferred.
grant usage on schema private to authenticated;
revoke all on schema private from public, anon;

-- ---------------------------------------------------------------------------
-- The helpers, unchanged except for where they live
-- ---------------------------------------------------------------------------

-- Entitlement has two doors: a paid subscription, or a comp.
create or replace function private.has_active_plan(uid uuid)
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

create or replace function private.sent_proposal_count(uid uuid, excluding uuid default null)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
    from public.proposals p
   where p.owner_id = uid
     and p.status = 'sent'
     and (excluding is null or p.id <> excluding);
$$;

create or replace function private.draft_proposal_count(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
    from public.proposals p
   where p.owner_id = uid
     and p.status = 'draft';
$$;

-- The 10 has to match FREE_DRAFT_PROPOSALS in src/constants.ts.
create or replace function private.can_create_proposal(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.has_active_plan(uid) or private.draft_proposal_count(uid) < 10;
$$;

-- The 2 has to match FREE_LIVE_PROPOSALS in src/constants.ts. This copy is the
-- one that is enforced; the TypeScript one only decides what the UI says.
create or replace function private.can_send_proposal(uid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.has_active_plan(uid)
      or coalesce(
           (select p.status <> 'draft'
              from public.proposals p
             where p.id = pid and p.owner_id = uid),
           false)
      or private.sent_proposal_count(uid) < 2;
$$;

-- A newly created function grants EXECUTE to PUBLIC by default, which is the
-- whole reason this migration exists. Take it back, then hand it to the one
-- role that evaluates the policies.
revoke execute on function private.has_active_plan(uuid) from public, anon;
revoke execute on function private.sent_proposal_count(uuid, uuid) from public, anon;
revoke execute on function private.draft_proposal_count(uuid) from public, anon;
revoke execute on function private.can_create_proposal(uuid) from public, anon;
revoke execute on function private.can_send_proposal(uuid, uuid) from public, anon;

grant execute on function private.has_active_plan(uuid) to authenticated;
grant execute on function private.sent_proposal_count(uuid, uuid) to authenticated;
grant execute on function private.draft_proposal_count(uuid) to authenticated;
grant execute on function private.can_create_proposal(uuid) to authenticated;
grant execute on function private.can_send_proposal(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Repoint the three policies that use them
-- ---------------------------------------------------------------------------
--
-- Recreated rather than altered because a policy's expression cannot be
-- changed in place, and dropped before the functions are so that nothing is
-- ever momentarily unguarded: inside one transaction the old policy is only
-- gone once the new one is there.

drop policy "free plan proposal cap" on public.proposals;

create policy "free plan proposal cap" on public.proposals
  as restrictive for insert
  with check (private.can_create_proposal(owner_id));

drop policy "free plan proposal cap on reopen" on public.proposals;

create policy "free plan proposal cap on reopen" on public.proposals
  as restrictive for update
  with check (
    status <> 'sent'
    or private.has_active_plan(owner_id)
    or private.sent_proposal_count(owner_id, id) < 2
  );

drop policy "free plan send cap" on public.share_links;

create policy "free plan send cap" on public.share_links
  as restrictive for insert
  with check (private.can_send_proposal((select auth.uid()), proposal_id));

-- ---------------------------------------------------------------------------
-- Now the published copies have no callers
-- ---------------------------------------------------------------------------
--
-- Dropped in dependency order rather than with cascade: cascade here would
-- happily take a policy with it and leave the cap silently off.

drop function public.can_send_proposal(uuid, uuid);
drop function public.can_create_proposal(uuid);
drop function public.sent_proposal_count(uuid, uuid);
drop function public.draft_proposal_count(uuid);
drop function public.has_active_plan(uuid);
