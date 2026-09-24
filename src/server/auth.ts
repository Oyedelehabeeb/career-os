import { createServerFn } from '@tanstack/react-start'

import { createClient } from '../lib/supabase/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) return null

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === 'string' ? data.claims.email : null,
  }
})
