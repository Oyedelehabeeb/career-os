import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.')
  }

  return createBrowserClient(url, key)
}
