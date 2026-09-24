import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie, setResponseHeader } from '@tanstack/react-start/server'

export function createClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error('Supabase is not configured on the server.')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) => setCookie(name, value, options))
        Object.entries(headers).forEach(([name, value]) => setResponseHeader(name, value))
      },
    },
  })
}
