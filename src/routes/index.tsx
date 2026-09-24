import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 text-[#182d2b]">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-[#dbe3dd] py-6">
          <span className="text-sm font-semibold tracking-[0.18em] text-[#16483f]">CAREEROS</span>
          <Link to="/login" className="text-sm font-medium">Sign in</Link>
        </header>
        <section className="max-w-3xl py-24 sm:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#54746a]">A better way to run your search</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Every opportunity. Every next step. One clear view.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#52645f]">
            CareerOS is a private workspace for managing applications, interviews, follow-ups, and what your job search is teaching you.
          </p>
          <Link
            to="/sign-up"
            className="mt-9 inline-block rounded-md bg-[#16483f] px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-[#0d342d] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16483f]"
          >
            Create your account
          </Link>
        </section>
      </div>
    </main>
  )
}
