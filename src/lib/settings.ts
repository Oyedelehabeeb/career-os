import { z } from 'zod'

export const deleteAccountSchema = z.object({
  confirmation: z.string().trim().min(1).max(320),
})

export function accountDeletionConfirmed(
  confirmation: string,
  email: string | null,
) {
  return Boolean(
    email &&
    confirmation.trim().toLocaleLowerCase() === email.toLocaleLowerCase(),
  )
}
