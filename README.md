# CareerOS

CareerOS is a private job-search intelligence workspace. The current foundation includes email/password authentication, an action-led overview, opportunity tracking, career profiles and skills, and private resume-version management. Users can upload PDF or DOCX resumes, archive or securely download them, and associate the exact version used with an opportunity. Full analytics and AI intelligence are not implemented yet.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. In the Supabase project dashboard, open **Connect** and copy the **Project URL** and **publishable key** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. In Supabase Auth URL configuration, set the local site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/confirm` as a redirect URL for confirmation links.
5. Run `npm run dev` and open `http://localhost:3000`.

The opportunity schema in `supabase/migrations/20260919150000_opportunity_foundation.sql` was applied to Supabase project `pwcpdselrsbhdybmpqii` through the dashboard SQL Editor on 2026-09-19. It creates private companies, opportunities, and append-only status events with row-level security. The dashboard confirmed all three tables have RLS enabled and no anonymous SELECT grant.

The follow-up schema in `supabase/migrations/20260919170000_follow_ups.sql` was also applied through the dashboard SQL Editor on 2026-09-19. Its private `follow_ups` table has three owner-only RLS policies; anonymous SELECT is not granted. One open and one completed follow-up were created on a labeled sample role to verify the workflow.

The career-profile schema in `supabase/migrations/20260924100000_career_profile.sql` was applied through the dashboard SQL Editor on 2026-09-24. The `profiles`, `skills`, and `profile_skills` tables have RLS enabled with 12 owner-only policies.

The resume schema in `supabase/migrations/20260924140000_resume_versions.sql` was applied through the dashboard SQL Editor on 2026-09-24. It adds the private `resume_versions` table, an owner-safe opportunity association, and a non-public `resumes` Storage bucket limited to PDF/DOCX files of at most 10 MB. Four table policies and three storage-object policies isolate every record and file to its owner.

Dashboard execution does not register these files in Supabase CLI migration history. Before adopting `supabase db push` for this project, reconcile the remote migration history with these already-applied migrations; do not blindly push the same CREATE statements again.

Four illustrative opportunities were added directly to this project for the confirmed account on 2026-09-19. Their `source` is `CareerOS sample`; the UI labels them **Sample** and excludes them from overview counts. They span three private company records and several status stages. They are not real applications and should not be used in future career analytics.

Only the publishable key belongs in `VITE_` variables. Never put a secret or service-role key in browser-exposed environment variables. `.env.local` is ignored by Git.

The hosted Supabase email service is suitable only for initial testing; production sign-up and password recovery will need a deliberate email-delivery configuration.

## Checks

Run `npm run generate-routes`, `npm run test`, `npm run lint`, `npm run check`, and `npm run build`. The existing starter `src/components/ui/button.tsx` has a lint import-style error unrelated to the product features.

## Project direction

Read [AGENTS.md](AGENTS.md) before changing the domain, schema, AI provider, security model, or visual system. AI integration is intentionally deferred until a no-payment provider option is confirmed; the app must remain usable without AI.
