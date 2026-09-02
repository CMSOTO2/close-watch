-- Move the free cap from proposals created to proposals actually sent.
--
-- The old cap counted status in ('draft', 'sent'), and nothing ever set 'sent':
-- createShareLink inserted the link and left the status alone, so every
-- proposal was a draft from creation until it was closed. In practice the free
-- plan counted uploads. Someone could sign up, upload three PDFs while working
-- out what the product does, share none of them, and hit a paywall having
-- received nothing at all. The wall arrived before the value.
--
-- Now 'sent' means what it says: a proposal that has at least one share link.
-- The free plan caps live proposals, drafts are near-free, and the wall lands
-- when someone tries to put a third real deal in flight.

-- Backfill while 'sent' still means nothing. A draft that already has a share
-- link has been sent, whatever the column says.
update public.proposals p
   set status = 'sent'
 where p.status = 'draft'
   and exists (select 1 from public.share_links l where l.proposal_id = p.id);

create or replace function public.sent_proposal_count(uid uuid, excluding uuid default null)
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

create or replace function public.draft_proposal_count(uid uuid)
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

-- A draft costs storage and nothing else, so this ceiling is loose enough that
-- a working consultant never meets it. It exists only so one account cannot
-- upload into the bucket forever.
--
-- The 10 has to match FREE_DRAFT_PROPOSALS in src/constants.ts.
create or replace function public.can_create_proposal(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_active_plan(uid) or public.draft_proposal_count(uid) < 10;
$$;

-- The cap that matters. Adding a second recipient to a proposal that is already
-- live costs nothing: it is the same deal, and per-recipient links are how the
-- forwarding signal works at all.
--
-- The 2 has to match FREE_LIVE_PROPOSALS in src/constants.ts. This copy is the
-- one that is enforced; the TypeScript one only decides what the UI says.
create or replace function public.can_send_proposal(uid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_active_plan(uid)
      or coalesce(
           (select p.status <> 'draft'
              from public.proposals p
             where p.id = pid and p.owner_id = uid),
           false)
      or public.sent_proposal_count(uid) < 2;
$$;

revoke execute on function public.sent_proposal_count(uuid, uuid) from public, anon;
revoke execute on function public.draft_proposal_count(uuid) from public, anon;
revoke execute on function public.can_send_proposal(uuid, uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- Where the cap is enforced
-- ---------------------------------------------------------------------------

-- Creating the first share link is how a proposal goes live, so that insert is
-- where the free plan pushes back. Restrictive, so it ANDs with "own share
-- links" rather than being OR'd past it.
create policy "free plan send cap" on public.share_links
  as restrictive for insert
  with check (public.can_send_proposal((select auth.uid()), proposal_id));

-- Reopening a won deal is the other route back to 'sent'. Drafts no longer
-- count against anything, so this guards the live status only. It also covers
-- the draft -> sent promotion createShareLink does straight after inserting the
-- link: the row being updated is excluded from the count by id, so the check
-- does not depend on whether the subquery sees the new status or the old one.
drop policy "free plan proposal cap on reopen" on public.proposals;

create policy "free plan proposal cap on reopen" on public.proposals
  as restrictive for update
  with check (
    status <> 'sent'
    or public.has_active_plan(owner_id)
    or public.sent_proposal_count(owner_id, id) < 2
  );

-- Nothing calls this any more; the draft/sent split replaced it. Left in place
-- it reads like a second, contradictory definition of the cap.
drop function public.active_proposal_count(uuid, uuid);
