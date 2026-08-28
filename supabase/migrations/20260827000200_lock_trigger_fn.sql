-- handle_new_user only ever runs from the auth.users trigger, but PostgREST
-- still exposes anything in `public` as an RPC. Take the endpoint away.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
