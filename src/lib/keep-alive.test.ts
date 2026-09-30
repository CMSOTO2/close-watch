import { describe, expect, it, vi } from 'vitest'
import { pingDatabase } from './keep-alive'

const URL = 'https://example.supabase.co'
const KEY = 'sb_publishable_test'

describe('pingDatabase', () => {
  it('runs one query through PostgREST with the publishable key', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 }))

    await expect(pingDatabase(URL, KEY, fetchImpl)).resolves.toBe(200)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/profiles?select=id&limit=1',
      { headers: { apikey: KEY } },
    )
  })

  it('throws when the project answers paused, so the failure is logged', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 540 }))

    await expect(pingDatabase(URL, KEY, fetchImpl)).rejects.toThrow('540')
  })
})
