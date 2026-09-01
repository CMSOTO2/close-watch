-- Retention: strip what points at a person from old visits.
--
-- The rows stay, because the owner's history is the product — how many opens,
-- how long, which pages. What goes after twelve months is the part that could
-- single a reader out: the hashed IP, the city, and the referring URL. Country
-- is coarse enough to keep, and browser/OS are categories rather than a
-- fingerprint.
--
-- visitor_id stays too, and deliberately: distinct-viewer counts are computed
-- from it, and the cookie carrying it expires after 365 days, so by the time a
-- visit is pruned the id can no longer be matched to any device.

create or replace function public.prune_visit_identifiers(older_than interval default '12 months')
returns integer
language plpgsql
security definer
-- Pinned: a security definer function with a mutable search_path is how a
-- schema shadowing attack gets a foothold.
set search_path = public, pg_temp
as $$
declare
  touched integer;
begin
  update public.visits
     set ip_hash  = null,
         city     = null,
         referrer = null
   where started_at < now() - older_than
     and (ip_hash is not null or city is not null or referrer is not null);

  get diagnostics touched = row_count;
  return touched;
end;
$$;

-- Same reasoning as handle_new_user: PostgREST exposes anything in `public` as
-- an RPC, and nothing outside the scheduler should be able to call this.
revoke execute on function public.prune_visit_identifiers(interval) from public, anon, authenticated;

create extension if not exists pg_cron with schema cron;

-- Daily, just after midnight UTC. Idempotent by construction: the WHERE clause
-- only matches rows that still have something to strip, so a missed night or a
-- double run costs nothing.
select cron.schedule(
  'prune-visit-identifiers',
  '7 0 * * *',
  $$select public.prune_visit_identifiers()$$
);
