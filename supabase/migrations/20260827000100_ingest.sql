-- Engagement ingest. One round trip per flush, and the increments are done in
-- SQL so two concurrent beacons cannot clobber each other.

create function public.record_engagement(
  p_visit_id   uuid,
  p_engaged_ms int,
  p_pages      jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_proposal uuid;
  v_total    int;
begin
  update public.visits
     set engaged_ms   = engaged_ms + greatest(coalesce(p_engaged_ms, 0), 0),
         last_seen_at = now()
   where id = p_visit_id
   returning proposal_id, engaged_ms into v_proposal, v_total;

  if v_proposal is null then
    return;
  end if;

  -- Three seconds of visible attention is the line between "a scanner fetched
  -- the page" and "a person is reading it".
  if v_total >= 3000 then
    update public.visits set is_qualified = true where id = p_visit_id;
  end if;

  insert into public.page_views (visit_id, proposal_id, page_number, engaged_ms, view_count)
  select p_visit_id,
         v_proposal,
         (e ->> 'page')::int,
         greatest(coalesce((e ->> 'ms')::int, 0), 0),
         1
    from jsonb_array_elements(coalesce(p_pages, '[]'::jsonb)) e
   where (e ->> 'page') is not null
  on conflict (visit_id, page_number) do update
     set engaged_ms   = public.page_views.engaged_ms + excluded.engaged_ms,
         view_count   = public.page_views.view_count + 1,
         last_seen_at = now();
end;
$$;

revoke execute on function public.record_engagement(uuid, int, jsonb) from public, anon, authenticated;
grant   execute on function public.record_engagement(uuid, int, jsonb) to service_role;
