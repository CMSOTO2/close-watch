-- Closewatch initial schema
-- Run with: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  full_name    text,
  company_name text,
  created_at   timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

create type public.proposal_status as enum ('draft', 'sent', 'won', 'lost', 'archived');

create table public.proposals (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  client_name      text not null,
  deal_value_cents bigint,
  currency         text not null default 'USD',
  storage_path     text not null,
  page_count       int  not null default 0,
  status           public.proposal_status not null default 'draft',
  -- set when the deal closes; the training signal for v2 win/loss correlation
  outcome_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index proposals_owner_created_idx on public.proposals (owner_id, created_at desc);

-- The sender tags each page after upload. No AI needed to know which page is
-- pricing, and tagging beats guessing on accuracy.
create type public.page_section as enum (
  'cover', 'summary', 'scope', 'timeline', 'pricing', 'terms', 'case_study', 'team', 'other'
);

create table public.proposal_pages (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  page_number int  not null,
  section     public.page_section not null default 'other',
  label       text,
  unique (proposal_id, page_number)
);

-- ---------------------------------------------------------------------------
-- share links: one per recipient, which is how you know *who* is reading
-- ---------------------------------------------------------------------------

create table public.share_links (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  token           text not null unique,
  recipient_name  text,
  recipient_email text,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index share_links_proposal_idx on public.share_links (proposal_id);

-- ---------------------------------------------------------------------------
-- visits: one row per viewing session
-- ---------------------------------------------------------------------------

create table public.visits (
  id            uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links(id) on delete cascade,
  proposal_id   uuid not null references public.proposals(id) on delete cascade,

  -- first-party cookie set on the viewer origin. Same person returning keeps
  -- the same visitor_id; a forward to a colleague produces a new one on the
  -- same share_link, which is the highest-signal event in the whole product.
  visitor_id    text not null,
  visit_seq     int  not null default 1,

  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),

  -- Visible time only. Wall-clock time on a backgrounded tab is worthless and
  -- inflating it is how these dashboards lose trust.
  engaged_ms    int  not null default 0,

  device_type   text,
  os            text,
  browser       text,
  country       text,
  city          text,
  referrer      text,
  ip_hash       text,

  -- Link scanners in Gmail, Outlook, Mimecast and friends will open every link
  -- you send. Counting those as "your client opened it" is the fastest way to
  -- make the product useless.
  is_bot        boolean not null default false,
  bot_reason    text,
  -- Flips true once the session looks like a human read.
  is_qualified  boolean not null default false
);

create index visits_proposal_idx on public.visits (proposal_id, started_at desc);
create index visits_link_visitor_idx on public.visits (share_link_id, visitor_id);

create table public.page_views (
  id            uuid primary key default gen_random_uuid(),
  visit_id      uuid not null references public.visits(id) on delete cascade,
  proposal_id   uuid not null references public.proposals(id) on delete cascade,
  page_number   int  not null,
  engaged_ms    int  not null default 0,
  view_count    int  not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (visit_id, page_number)
);

create index page_views_proposal_idx on public.page_views (proposal_id, page_number);

-- Append-only. Cheap to write, and it means a metric you did not think to
-- aggregate in week one is still recoverable in week six.
create table public.events (
  id          bigint generated always as identity primary key,
  visit_id    uuid not null references public.visits(id) on delete cascade,
  type        text not null,
  page_number int,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index events_visit_idx on public.events (visit_id, created_at);

-- ---------------------------------------------------------------------------
-- rollup used by the dashboard
-- ---------------------------------------------------------------------------

create view public.proposal_stats
with (security_invoker = true) as
select
  p.id as proposal_id,
  p.owner_id,
  count(distinct v.id)                                     as visit_count,
  count(distinct v.visitor_id)                             as viewer_count,
  coalesce(sum(v.engaged_ms), 0)                           as total_engaged_ms,
  max(v.last_seen_at)                                      as last_viewed_at,
  coalesce(sum(pv.engaged_ms) filter (
    where pp.section = 'pricing'
  ), 0)                                                    as pricing_engaged_ms
from public.proposals p
left join public.visits v
  on v.proposal_id = p.id and v.is_bot = false and v.is_qualified = true
left join public.page_views pv
  on pv.visit_id = v.id
left join public.proposal_pages pp
  on pp.proposal_id = p.id and pp.page_number = pv.page_number
group by p.id, p.owner_id;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Owners read and write their own rows. Public viewers never touch Postgres
-- directly: the viewer route and the ingest endpoint run server-side with the
-- service role and validate the share token themselves.
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.proposals      enable row level security;
alter table public.proposal_pages enable row level security;
alter table public.share_links    enable row level security;
alter table public.visits         enable row level security;
alter table public.page_views     enable row level security;
alter table public.events         enable row level security;

create policy "own profile" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own proposals" on public.proposals
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "own proposal pages" on public.proposal_pages
  for all using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.owner_id = (select auth.uid())
  ));

create policy "own share links" on public.share_links
  for all using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.owner_id = (select auth.uid())
  ));

create policy "read own visits" on public.visits
  for select using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.owner_id = (select auth.uid())
  ));

create policy "read own page views" on public.page_views
  for select using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.owner_id = (select auth.uid())
  ));

create policy "read own events" on public.events
  for select using (exists (
    select 1 from public.visits v
    join public.proposals p on p.id = v.proposal_id
    where v.id = visit_id and p.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- storage: private bucket, viewer gets short-lived signed URLs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', false)
on conflict (id) do nothing;

create policy "owner reads own pdfs" on storage.objects
  for select using (
    bucket_id = 'proposals' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owner uploads own pdfs" on storage.objects
  for insert with check (
    bucket_id = 'proposals' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owner deletes own pdfs" on storage.objects
  for delete using (
    bucket_id = 'proposals' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
