-- rls_auto_enable() is an event-trigger safety net that turns on RLS for every
-- new table in `public`. Supabase created it out-of-band and left EXECUTE
-- granted to anon and authenticated, so PostgREST exposed it as an RPC
-- (/rest/v1/rpc/rls_auto_enable) — flagged by the security advisor.
--
-- Event triggers run as their definer no matter who holds EXECUTE, so revoking
-- these grants removes the public endpoint without touching the safety net.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
