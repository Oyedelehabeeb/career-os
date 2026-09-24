# CareerOS

CareerOS is a private job-search intelligence workspace. The current foundation includes email/password authentication, an action-led overview, and an opportunity workflow: save and edit partial roles, reuse private company records, search and filter a responsive list, change application status, inspect durable status history, and schedule or complete follow-ups. Full analytics, resumes, and AI intelligence are not implemented yet.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. In the Supabase project dashboard, open **Connect** and copy the **Project URL** and **publishable key** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. In Supabase Auth URL configuration, set the local site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/confirm` as a redirect URL for confirmation links.
5. Run `npm run dev` and open `http://localhost:3000`.

The opportunity schema in `supabase/migrations/20260919150000_opportunity_foundation.sql` was applied to Supabase project `pwcpdselrsbhdybmpqii` through the dashboard SQL Editor on 2026-09-19. It creates private companies, opportunities, and append-only status events with row-level security. The dashboard confirmed all three tables have RLS enabled and no anonymous SELECT grant.

The follow-up schema in `supabase/migrations/20260919170000_follow_ups.sql` was also applied through the dashboard SQL Editor on 2026-09-19. Its private `follow_ups` table has three owner-only RLS policies; anonymous SELECT is not granted. One open and one completed follow-up were created on a labeled sample role to verify the workflow.

Dashboard execution does not register this file in Supabase CLI migration history. Before adopting `supabase db push` for this project, reconcile the remote migration history with this already-applied migration; do not blindly push the same CREATE statements again.

Four illustrative opportunities were added directly to this project for the confirmed account on 2026-09-19. Their `source` is `CareerOS sample`; the UI labels them **Sample** and excludes them from overview counts. They span three private company records and several status stages. They are not real applications and should not be used in future career analytics.

Only the publishable key belongs in `VITE_` variables. Never put a secret or service-role key in browser-exposed environment variables. `.env.local` is ignored by Git.

The hosted Supabase email service is suitable only for initial testing; production sign-up and password recovery will need a deliberate email-delivery configuration.

## Checks

Run `npm run generate-routes`, `npm run test`, `npm run lint`, `npm run check`, and `npm run build`. The existing starter `src/components/ui/button.tsx` has a lint import-style error unrelated to the product features.

## Project direction

Read [AGENTS.md](AGENTS.md) before changing the domain, schema, AI provider, security model, or visual system. AI integration is intentionally deferred until a no-payment provider option is confirmed; the app must remain usable without AI.
