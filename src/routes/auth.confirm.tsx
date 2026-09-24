import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

import { createClient } from '../lib/supabase/client'

export const Route = createFileRoute('/auth/confirm')({ component: ConfirmEmail })

function ConfirmEmail() {
  const navigate = useNavigate()
  const attempted = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      setError('This confirmation link is missing its code. Please request a new link.')
      return
    }

    createClient().auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError('This confirmation link could not be used. It may have expired.')
      } else {
        void navigate({ to: '/app' })
      }
    }).catch(() => setError('We could not confirm your email. Please try again.'))
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-5 text-[#182d2b]">
      <div className="w-full max-w-md border border-[#dbe3dd] bg-white p-8">
        <h1 className="text-2xl font-semibold">Confirming your email</h1>
        {error ? (
          <>
            <p role="alert" className="mt-4 text-sm leading-6 text-[#a02e32]">{error}</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-medium">Back to sign in</Link>
          </>
        ) : (
          <p role="status" className="mt-4 text-sm text-[#52645f]">Please wait while we finish signing you in.</p>
        )}
      </div>
    </main>
  )
}
