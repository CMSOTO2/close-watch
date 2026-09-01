-- Marks a page tag the classifier guessed rather than the owner chose.
--
-- The dashboard's pricing numbers are only worth trusting if the owner knows
-- which pages they actually confirmed, so the UI shows guessed tags differently
-- and clears the flag the moment one is changed by hand. Existing rows were all
-- tagged by hand (there was nothing else), hence default false.

alter table public.proposal_pages
  add column section_auto boolean not null default false;
