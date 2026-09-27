import { useEffect, useState } from 'react'

/**
 * Whether someone is signed in, for choosing a button label and nothing else.
 *
 * Read in the browser from the session Supabase keeps in its cookie, which is
 * the check lib/auth.ts warns against — and it is fine here, because the worst
 * a forged cookie buys is a "Dashboard" button that bounces to sign-in. Calling
 * getSessionUser instead would put a Supabase round trip on every public page
 * to decide one word. The server renders the signed-out label and this swaps
 * it after hydration, so only signed-in visitors ever see it change.
 *
 * Every public page's header is SiteHeader now (the legal pages had a bar of
 * their own until they moved onto ContentPage), so this has one caller; it
 * stays its own module so a second header cannot quietly go without it. Without
 * it an owner who opened a guide or the terms had no way back to the app but
 * the browser's back button.
 *
 * The Supabase client is imported only when a session cookie is present. It
 * is about 200 KB of auth, realtime and storage code, and statically imported
 * here it rode in the entry chunk of every public page, to answer a question
 * whose answer, for every visitor arriving from a search, is "no". The cookie
 * check is not the auth check, only a gate on whether asking is worth the
 * download: a stale cookie still ends at the client's own answer.
 */
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!SESSION_COOKIE.test(document.cookie)) return

    let unsubscribe: (() => void) | undefined
    let cancelled = false
    void import('#/lib/supabase/client').then(
      ({ getSupabaseBrowserClient }) => {
        if (cancelled) return
        // onAuthStateChange fires INITIAL_SESSION on subscribe, so it covers the
        // first read as well as a sign-out in another tab.
        const { data } = getSupabaseBrowserClient().auth.onAuthStateChange(
          (_event, session) => setSignedIn(session !== null),
        )
        unsubscribe = () => data.subscription.unsubscribe()
      },
    )
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return signedIn
}
