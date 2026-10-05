import { createServerFn } from '@tanstack/react-start'

import { accountDeletionConfirmed, deleteAccountSchema } from '../lib/settings'
import { createClient } from '../lib/supabase/server'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const email =
    typeof data?.claims.email === 'string' ? data.claims.email : null
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub, email }
}

export const getPrivacySummary = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const resumes = await supabase
      .from('resume_versions')
      .select('id', { count: 'exact', head: true })
    if (resumes.error) throw new Error('Unable to load privacy settings.')
    return { resumeCount: resumes.count ?? 0 }
  },
)

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteAccountSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, email } = await requireUser()
    if (!accountDeletionConfirmed(data.confirmation, email))
      throw new Error('Type your full account email to confirm deletion.')

    const resumes = await supabase
      .from('resume_versions')
      .select('storage_path')
      .order('created_at', { ascending: true })
    if (resumes.error)
      throw new Error('Unable to inventory private resume files.')

    const paths = resumes.data.map((resume) => resume.storage_path)
    for (let index = 0; index < paths.length; index += 1000) {
      const removed = await supabase.storage
        .from('resumes')
        .remove(paths.slice(index, index + 1000))
      if (removed.error)
        throw new Error(
          'Account deletion stopped because a private resume file could not be removed.',
        )
    }

    const deletion = await supabase.rpc('delete_my_account')
    if (deletion.error)
      throw new Error(
        paths.length
          ? 'Resume files were removed, but the account could not be deleted. Please try again.'
          : 'The account could not be deleted. Please try again.',
      )
    return { deleted: true }
  })
