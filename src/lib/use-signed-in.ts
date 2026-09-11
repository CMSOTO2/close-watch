import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'

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
 * Shared by every public header (SiteHeader, and LegalPage's own bar) so none
 * of them tells a signed-in owner to sign in. Without it an owner who opened a
 * guide or the terms had no way back to the app but the browser's back button.
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on subscribe, so it covers the
    // first read as well as a sign-out in another tab.
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange(
      (_event, session) => setSignedIn(session !== null),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  return signedIn
}
