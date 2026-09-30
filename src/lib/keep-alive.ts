/**
 * One cheap query against the database, run on a schedule so the Supabase
 * project never looks idle.
 *
 * Supabase pauses Free plan projects that go a week without "sufficient user
 * database activity", and says a few requests a day is enough. A paused project
 * answers 540 to everything, which takes down sign-in, the dashboard and every
 * tracked share link at once, and with no users there is nothing else to keep
 * it awake. The Worker's cron trigger (wrangler.jsonc) calls this.
 *
 * It goes through PostgREST with the publishable key, the same key the browser
 * already holds, rather than the secret one: the point is traffic, not data. RLS
 * hides every profile from an anonymous caller, so the answer is an empty list,
 * but Postgres still plans and runs the query, which is the activity that counts.
 */
export async function pingDatabase(
  supabaseUrl: string,
  publishableKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`,
    { headers: { apikey: publishableKey } },
  )
  // A 540 here means the project is already paused, and pinging will not wake
  // it: that takes Resume in the dashboard. Throwing puts it in the Worker logs.
  if (!response.ok) {
    throw new Error(`keep-alive: database ping returned ${response.status}`)
  }
  return response.status
}
