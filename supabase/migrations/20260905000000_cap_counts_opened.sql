-- A proposal counts against the free cap once a person has opened it, not the
-- moment it is sent.
--
-- 20260902000500 moved the cap off "uploaded" and onto "sent", because a wall
-- that lands before the product has done anything teaches someone the plan is
-- stingy rather than that the product is good. The same argument was never
-- carried the last step. Sending is still not the moment anything is learned:
-- it is a link handed over. Someone who sends two proposals and has both sit
-- unopened for a week is capped having seen nothing at all, and is then asked
-- to pay for a second thing they have no evidence about.
--
-- POSITIONING.md is specific that the free tier exists to deliver one moment,
-- the first time somebody sees "opened twice, 4 minutes on pricing", and that
-- nothing else on the pricing page converts. So the cap now waits for that
-- moment. Anyone genuinely running a pipeline still meets the wall at two
-- deals, because their proposals do get read. Anyone whose first two went into
-- a void keeps going until the product has actually shown them something.
--
-- "Opened" is the same bar the rest of the app uses for a real read: not a bot,
-- and qualified, which record_engagement sets at three seconds of visible
-- attention. An email scanner fetching the page must not burn a slot, which is
-- the entire reason is_bot and is_qualified exist.
--
-- Known and accepted: an account can now hold more than two live proposals as
-- long as nobody reads them. That is not a new hole. Closing a deal has always
-- returned the slot, so upload-send-close already cycled without limit, and the
-- only cost of an unread proposal is the stored PDF. A proposal nobody opens
-- delivers nothing to the sender either, so there is no free lunch here to
-- take. If storage does become a problem, the draft ceiling is the pattern to
-- copy rather than a second meaning for this cap.
--
-- Everything stays in `private`, for the reason 20260904000000 gives: a
-- SECURITY DEFINER function in `public` is a published API whether or not you
-- meant to publish one, and this one would answer "how many deals is that user
-- running" to anyone holding a uuid.

-- Renamed rather than redefined in place. It no longer counts what the old name
-- says it counts, and a `sent_proposal_count` that quietly skips unopened sent
-- proposals is exactly the kind of thing someone reading only the name puts
-- back.
create or replace function private.opened_proposal_count(uid uuid, excluding uuid default null)
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
     and (excluding is null or p.id <> excluding)
     and exists (
           select 1
             from public.visits v
            where v.proposal_id = p.id
              and v.is_bot = false
              and v.is_qualified = true
         );
$$;

-- A new function grants EXECUTE to PUBLIC by default. Take it back, then hand
-- it to the one role that evaluates the policies.
revoke execute on function private.opened_proposal_count(uuid, uuid) from public, anon;
grant execute on function private.opened_proposal_count(uuid, uuid) to authenticated;

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
      or private.opened_proposal_count(uid) < 2;
$$;

-- Reopening a closed deal is the other route back to 'sent'. A reopened
-- proposal has usually been read, so it would count itself the instant the
-- status changed; excluding it by id asks the right question, which is whether
-- there are already two *other* opened deals in flight.
--
-- Dropped and recreated because a policy expression cannot be altered in place.
drop policy "free plan proposal cap on reopen" on public.proposals;

create policy "free plan proposal cap on reopen" on public.proposals
  as restrictive for update
  with check (
    status <> 'sent'
    or private.has_active_plan(owner_id)
    or private.opened_proposal_count(owner_id, id) < 2
  );

-- Now nothing calls the old one. Dropped rather than left: a second, stricter
-- definition of the same cap sitting next to this one is how the last rewrite
-- went wrong.
drop function private.sent_proposal_count(uuid, uuid);

-- The count runs an EXISTS against visits for every sent proposal an owner has,
-- on every share-link insert and every reopen. visits_proposal_idx leads on
-- proposal_id, but carries neither flag, so each check would drop to the heap
-- to read them.
create index if not exists visits_qualified_proposal_idx
  on public.visits (proposal_id)
  where is_bot = false and is_qualified = true;
