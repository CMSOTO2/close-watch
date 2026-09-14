-- Folders: grouping proposals on the dashboard, and optionally sending a group
-- under its own name.
--
-- People sell more than one kind of thing. Web design and development, or a
-- studio and a personal photography practice, and a single list of every
-- proposal mixes them. A folder groups them. It can also carry a name clients
-- see, so a "Personal Photography" folder's proposals arrive as that rather
-- than as the account (see senderSlug in src/constants.ts, which puts that
-- name in the link).
--
-- A proposal in no folder, and one in a folder with no sender_name, sends as
-- the account's own name, profiles.company_name, exactly as before this
-- migration. Nothing already sent changes.

create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  -- For the owner only, so short is fine: "Web", "Coding".
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  -- The name clients see for this folder's proposals. Same bounds as
  -- displayNameSchema in src/lib/profile.ts, which every form checks first.
  sender_name text check (
    sender_name is null or char_length(btrim(sender_name)) between 2 and 80
  ),
  created_at  timestamptz not null default now()
);

create index folders_owner_id_idx on public.folders (owner_id);

-- Two folders called the same would be two identical buttons on the
-- dashboard with no way to tell which is which.
create unique index folders_owner_name_idx
  on public.folders (owner_id, lower(btrim(name)));

alter table public.folders enable row level security;

create policy "own folders" on public.folders
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Deleting a folder leaves its proposals in no folder, sending as the account.
-- Their links keep working: the viewer redirects a link whose name no longer
-- matches to the one that does.
alter table public.proposals
  add column folder_id uuid references public.folders(id) on delete set null;

create index proposals_folder_id_idx on public.proposals (folder_id);

-- The foreign key only proves the folder exists. Without this, anyone could
-- file their proposal in another account's folder, and if that folder has a
-- sender_name, their link would open as that company. Restrictive, so it
-- narrows "own proposals" rather than widening it, and the folders subquery
-- runs under the caller's RLS, so it can only ever see their own.
create policy "proposal folder is the owner's" on public.proposals
  as restrictive for all
  using (true)
  with check (
    folder_id is null
    or exists (
      select 1
        from public.folders f
       where f.id = folder_id
         and f.owner_id = proposals.owner_id
    )
  );

-- Moving a proposal between folders, as its own function rather than a plain
-- update, because a plain update of a sent proposal is checked against the
-- free plan's "cap on reopen" policy. An account holding more read proposals
-- than the cap (possible: the cap is checked when a link is cut, and reads
-- arrive later) could then not file one away. Filing is not reopening, so it
-- goes around that policy, and checks ownership of both rows itself.
create function public.move_proposal_to_folder(
  p_proposal_id uuid,
  p_folder_id   uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_folder_id is not null and not exists (
    select 1 from public.folders
     where id = p_folder_id and owner_id = (select auth.uid())
  ) then
    raise exception 'folder not found';
  end if;

  update public.proposals
     set folder_id = p_folder_id
   where id = p_proposal_id
     and owner_id = (select auth.uid());

  if not found then
    raise exception 'proposal not found';
  end if;
end;
$$;

revoke execute on function public.move_proposal_to_folder(uuid, uuid) from public, anon;
grant execute on function public.move_proposal_to_folder(uuid, uuid) to authenticated;
