import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { createClient } from '../lib/supabase/client'

type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const supabase = createClient()
      const result = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
          })
        : await supabase.auth.signInWithPassword({ email, password })

      if (result.error) throw result.error
      if (isSignUp && !result.data.session) {
        setConfirmationSent(true)
      } else {
        await navigate({ to: '/app' })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-10 text-[#182d2b] sm:py-16">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm font-semibold tracking-[0.18em] text-[#16483f] no-underline">
          CAREEROS
        </Link>
        <div className="mt-12 border border-[#dbe3dd] bg-white p-7 shadow-[0_12px_40px_rgba(17,48,37,0.06)] sm:p-9">
          {confirmationSent ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="mt-3 text-sm leading-6 text-[#52645f]">
                If the address is eligible, a confirmation link is on its way. Open it to finish creating your account.
              </p>
              <Link to="/login" className="mt-6 inline-block text-sm font-medium">Back to sign in</Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#54746a]">
                Your private workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#52645f]">
                {isSignUp
                  ? 'Keep your opportunities, applications, and next steps in one place.'
                  : 'Pick up where your job search left off.'}
              </p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#cbd8d0] bg-white px-3 py-2.5 text-sm text-[#182d2b] outline-none focus-visible:border-[#246b59] focus-visible:ring-2 focus-visible:ring-[#246b59]/25"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#cbd8d0] bg-white px-3 py-2.5 text-sm text-[#182d2b] outline-none focus-visible:border-[#246b59] focus-visible:ring-2 focus-visible:ring-[#246b59]/25"
                  />
                  {isSignUp && <p className="mt-1 text-xs text-[#52645f]">Use at least 6 characters.</p>}
                </div>
                {error && <p role="alert" className="text-sm text-[#a02e32]">{error}</p>}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-md bg-[#16483f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d342d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16483f] disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-[#52645f]">
                {isSignUp ? 'Already have an account?' : 'New to CareerOS?'}{' '}
                <Link to={isSignUp ? '/login' : '/sign-up'} className="font-medium">
                  {isSignUp ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-[#687a73]">Your job-search data stays private to your account.</p>
      </div>
    </main>
  )
}
