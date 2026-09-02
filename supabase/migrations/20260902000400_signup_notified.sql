-- Tracks whether the "someone signed up" email has been sent for an account.
-- Claimed atomically (update ... where it is null) in the same shape as
-- proposals.first_open_notified_at, so a user who signs in twice in quick
-- succession still produces exactly one notification.

alter table public.profiles
  add column signup_notified_at timestamptz;

-- Everyone who already has an account is not a new signup. Backfilling to
-- created_at means switching this on does not announce the existing users.
update public.profiles
   set signup_notified_at = created_at
 where signup_notified_at is null;
