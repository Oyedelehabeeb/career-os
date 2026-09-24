# AGENTS.md

## 1. Project Identity

CareerOS is a **job-search intelligence workspace**.

It helps job seekers manage opportunities, applications, interviews, follow-ups, resumes, contacts, and job-search analytics from one place.

The product should not be reduced to:

- a Kanban board
- a generic application tracker
- an AI résumé generator
- a job board
- an AI job finder

The core product idea is:

> **One place to manage the entire journey from discovering an opportunity to receiving an offer — and learn from the data generated along the way.**

CareerOS combines:

- application tracking
- opportunity management
- job-description intelligence
- candidate/job matching
- reminders and follow-ups
- interview tracking
- resume version tracking
- job-search analytics
- career-market insights

The product should feel like a serious productivity/SaaS application designed for people actively navigating a job search.

---

# 2. Core Product Principle

CareerOS should help users answer two questions:

### What needs my attention right now?

Examples:

- Which applications need follow-up?
- Which interviews are coming up?
- Which opportunities are still active?
- Which applications have gone stale?
- Which tasks are overdue?

### What is my job search teaching me?

Examples:

- Which roles respond to me most often?
- Which skills appear most frequently?
- Which skills am I missing?
- Which job sources perform best?
- Which resume version gets more responses?
- Where am I losing opportunities in the funnel?

The product therefore combines **workflow management** with **career intelligence**.

---

# 3. V1 Target User

Primary user:

A professional actively applying for multiple jobs who needs a structured way to manage opportunities, track progress, prepare for interviews, follow up appropriately, and understand patterns across their job search.

The V1 user is an individual.

V1 does NOT require:

- teams
- recruiters
- hiring companies
- coaching marketplaces
- multi-user collaboration
- employer accounts

---

# 4. V1 Core Outcomes

A user should be able to:

1. Create an account.
2. Build a career profile.
3. Upload and manage resume versions.
4. Save a job opportunity.
5. Paste a job description.
6. Have CareerOS extract structured information from the job description.
7. Track the opportunity through the application process.
8. Record contacts, interviews, notes, and follow-ups.
9. View a chronological application history.
10. Understand how well their profile aligns with the role.
11. Track skill demand across saved jobs.
12. View application-funnel analytics.
13. Know which opportunities need attention.
14. Search and filter their entire job search.

---

# 5. V1 Information Architecture

Initial product surfaces:

- Dashboard
- Opportunities
- Opportunity Workspace
- Career Profile
- Resumes
- Analytics
- Search
- Settings

Additional functionality may live inside these surfaces rather than requiring separate pages.

---

# 6. Dashboard

The dashboard should answer:

> **What is happening in my job search right now?**

Potential dashboard content includes:

- active opportunities
- applications submitted
- response rate
- interviews
- upcoming interviews
- follow-ups due
- overdue tasks
- stale opportunities
- recent activity
- application funnel
- skill-demand summary

Avoid meaningless vanity metrics.

Dashboard information should support decisions and next actions.

---

# 7. Opportunities

The Opportunities area is the main job-search workspace.

It should support:

- table/list view
- pipeline/Kanban view
- search
- filtering
- sorting
- saved filters later if useful

Potential filters:

- application status
- priority
- company
- role
- location
- work mode
- job source
- salary range
- date saved
- date applied
- follow-up state

The user should be able to move between views without losing context.

---

# 8. Opportunity Lifecycle

Application status is a meaningful domain concept.

Initial V1 statuses may include:

- Saved
- Preparing
- Applied
- Screening
- Interview
- Final Round
- Offer
- Rejected
- Withdrawn
- Ghosted
- Closed

Status should NOT merely overwrite previous state.

Important lifecycle events should be recorded historically.

Conceptually:

Saved → Applied → Screening → Interview → Final Round → Offer

Alternative outcomes:

- Rejected
- Withdrawn
- Ghosted
- Closed

Do not assume every user follows exactly the same path.

The data model should preserve flexibility without sacrificing analytics.

---

# 9. Opportunity Workspace

Each opportunity should have a dedicated workspace.

Example:

`/opportunities/:id`

Potential sections/tabs:

- Overview
- Job Intelligence
- Contacts
- Interviews
- Notes
- Activity
- Documents

The workspace should act as the complete record of that application.

---

# 10. Opportunity Core Data

An opportunity may contain:

- company
- role
- location
- work mode
- salary minimum
- salary maximum
- currency
- source
- source URL
- priority
- current status
- date saved
- date applied
- follow-up date
- deadline
- job description
- requirements
- responsibilities
- seniority
- resume version used
- notes
- contacts
- interviews

Do not require fields that are not naturally available.

Partial opportunity records should be supported.

---

# 11. Career Profile

CareerOS needs an internal representation of the user's professional profile.

Potential profile data includes:

- current/target role
- years of experience
- professional summary
- work experience
- skills
- industries
- education
- location
- preferred work mode
- preferred role types
- compensation expectations
- portfolio URL
- GitHub URL
- LinkedIn URL

The career profile is primarily used as input for job analysis and career intelligence.

It should not become a public social profile in V1.

---

# 12. Resume Management

Users should be able to manage multiple resume versions.

Examples:

- Frontend Resume
- Full-stack Resume
- Mobile Resume
- General Resume

Each resume version should support:

- name
- uploaded file
- parsed/extracted text
- created date
- active/archive state
- optional notes

An opportunity can reference the resume version used for that application.

This enables future analytics such as:

- response rate by resume version
- interview rate by resume version

Do not claim causation from small samples.

---

# 13. File Handling

Resume files are private user data.

Use private storage.

Do not expose resume files publicly.

Access should use appropriate authenticated/signed mechanisms.

Never log resume content unnecessarily.

Users should eventually be able to delete their uploaded files and account data.

---

# 14. Job Description Ingestion

V1 must support reliable manual ingestion.

Primary V1 flow:

1. User creates or saves an opportunity.
2. User pastes a job description.
3. CareerOS parses it.
4. Structured fields are extracted.
5. User can review/correct results.

Potential extracted information:

- title
- company
- location
- work mode
- salary
- seniority
- responsibilities
- required skills
- preferred skills
- experience requirements
- education requirements
- technologies
- benefits where relevant

AI-generated extraction must be treated as assistive.

Users should be able to correct inaccurate results.

---

# 15. URL Ingestion

A user may optionally provide a job URL.

Do NOT assume CareerOS can reliably scrape every job platform.

Sites such as LinkedIn, Indeed, and others may restrict automated access.

V1 must remain fully functional even when automatic URL extraction fails.

Pasting job-description text is the reliable fallback.

Do not design the product around brittle scraping.

---

# 16. Job Intelligence

Job Intelligence is a core differentiator.

CareerOS should compare:

**candidate profile + resume + job description**

to produce useful, explainable insights.

Potential outputs:

- matched skills
- missing skills
- uncertain skills
- experience alignment
- seniority alignment
- role requirements
- likely interview topics
- important keywords
- important responsibilities
- notable gaps
- possible areas for preparation

Avoid opaque scoring.

Do not display arbitrary values such as:

> 87% match

unless the calculation is transparent, justified, and explainable.

Prefer understandable outputs.

---

# 17. AI Product Philosophy

AI is a capability inside CareerOS.

AI is NOT the entire product.

Use AI where natural-language reasoning or extraction adds real value.

Appropriate V1 AI use cases include:

- job-description parsing
- skill extraction
- structured requirement extraction
- candidate/job comparison
- interview-topic extraction

Potential later uses include:

- resume tailoring
- follow-up drafting
- interview preparation
- job-search coaching

Do not add AI features simply because AI is available.

---

# 18. AI Architecture

UI components must not call an AI provider directly.

Use an application-owned intelligence layer.

Conceptually:

Browser

→ application/server layer

→ Career Intelligence service

→ AI provider

Potential domain operations:

- `parseJobDescription`
- `analyzeOpportunityFit`
- `extractRoleSkills`
- `generateInterviewThemes`

Exact names may differ.

Provider-specific types must remain inside the AI integration layer.

The application should be capable of changing AI providers later without rewriting the UI.

---

# 19. Structured AI Output

Where AI is used to extract structured information:

- define schemas
- validate outputs
- reject malformed results
- handle partial responses
- never assume model output is valid

Use schema validation such as Zod or an equivalent appropriate mechanism.

AI results should be persisted where useful to avoid unnecessary repeated calls.

---

# 20. Explainability

Career intelligence must be understandable.

For example:

**Matched**

- React
- TypeScript
- Next.js

**Missing or unclear**

- AWS
- GraphQL

**Experience requirement**

Job:
5+ years

Profile:
4+ years

The user should understand why CareerOS reached a conclusion.

Do not present unsupported certainty.

---

# 21. Contacts

Each opportunity may include professional contacts such as:

- recruiter
- hiring manager
- referral
- interviewer

Potential contact fields:

- name
- role
- company
- email
- LinkedIn/profile URL
- notes

Do not turn V1 into a CRM.

Keep contact functionality specific to the opportunity lifecycle.

---

# 22. Interviews

Users should be able to track interviews.

Potential fields:

- interview type
- scheduled date/time
- interviewer
- location/video link
- stage
- preparation notes
- outcome
- post-interview notes

Interview records should integrate naturally into:

- dashboard
- opportunity workspace
- activity timeline

---

# 23. Follow-ups and Tasks

CareerOS should help users know what needs attention.

Potential task/reminder types:

- follow up after application
- follow up after interview
- prepare for interview
- submit assessment
- update resume
- close stale opportunity

V1 may calculate reminders in-app.

Email, push, or external notification infrastructure is not required initially.

---

# 24. Activity Timeline

Important opportunity events should create a chronological history.

Examples:

- opportunity saved
- application submitted
- status changed
- recruiter replied
- interview scheduled
- follow-up completed
- resume attached
- note added

Activity should support analytics and human understanding.

Do not create noisy events for trivial UI changes.

---

# 25. Analytics

Analytics are a major V1 feature.

CareerOS should derive useful insights from actual user data.

Potential metrics:

### Funnel
- saved
- applied
- responses
- interviews
- final rounds
- offers

### Conversion
- application → response
- response → interview
- interview → final round
- final round → offer

### Source performance
Examples:
- direct outreach
- LinkedIn
- company careers page
- Upwork
- referrals

### Resume performance
Compare applications using different resume versions.

### Skill demand
Across saved/applied roles:

- skill frequency
- emerging skill patterns
- missing-skill frequency

### Time-based analytics
Potential examples:

- applications per week
- average response time
- time spent in stage

Do not overstate conclusions from small sample sizes.

---

# 26. Skill Demand Intelligence

CareerOS should be capable of answering:

> What are employers repeatedly asking me for?

For opportunities in the user's dataset, calculate frequency for:

- technologies
- tools
- frameworks
- soft skills where appropriate
- role requirements

Example:

React — 82%
TypeScript — 76%
Next.js — 54%
AWS — 31%

This should be derived from real opportunity data.

---

# 27. Search

Users should be able to search across relevant entities.

Potential searchable content:

- companies
- roles
- opportunities
- contacts
- notes

A command palette may be appropriate if it genuinely improves productivity.

Do not add one simply because it is fashionable.

---

# 28. Authentication

Authentication is required in V1.

Preferred initial approach:

**Supabase Auth**

Potential methods:

- Google OAuth
- email/password or magic link

Exact login methods should be finalized during implementation planning.

---

# 29. Database

CareerOS requires persistent relational storage.

Preferred database:

**PostgreSQL via Supabase**

The final schema should be designed after domain analysis.

Likely entities include:

- profiles
- skills
- profile_skills
- companies
- opportunities
- opportunity_skills
- application_events
- contacts
- interviews
- follow_ups
- tasks
- notes
- resume_versions
- documents
- job_analyses

Do not create tables mechanically from this list.

Model the domain intentionally.

---

# 30. Row-Level Security

User-owned data must be isolated.

If Supabase is used:

- enable RLS on user-owned data
- define explicit ownership policies
- never rely only on client filtering
- do not expose service-role keys to the browser

One user must never be able to read or mutate another user's private job-search data.

---

# 31. Storage

Use Supabase Storage where appropriate for:

- resumes
- private documents

Storage should be private by default.

Public buckets must not be used for private career documents.

---

# 32. Technology Stack

Preferred web stack:

- TanStack Start
- React
- TypeScript
- TanStack Router
- TanStack Query where appropriate
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

The AI provider should be selected deliberately.

Do not replace the agreed stack without explicit approval.

---

# 33. SSR and Rendering

CareerOS is primarily an authenticated SaaS application.

SEO is less important inside authenticated product routes than in public marketing surfaces.

Use SSR where it improves:

- initial rendering
- authentication flows
- performance
- server-side data access

Do not SSR everything mechanically.

Use the appropriate server/client boundary.

---

# 34. Public Marketing Surface

The product may include public pages such as:

- landing page
- pricing later
- privacy
- terms
- login
- signup

Public marketing pages should be SEO-friendly.

Authenticated application data must never be indexed.

---

# 35. V1 Navigation

Likely main application navigation:

- Dashboard
- Opportunities
- Analytics
- Resumes
- Profile

Search and settings may be globally accessible.

Exact navigation should be finalized during UI design.

---

# 36. V1 Scope

CareerOS V1 includes:

1. Authentication
2. Career profile
3. Skills
4. Resume versions
5. Resume upload/storage
6. Opportunity creation
7. Job-description ingestion
8. AI parsing
9. Opportunity list/table
10. Pipeline/Kanban
11. Opportunity workspace
12. Status lifecycle
13. Application history
14. Contacts
15. Interviews
16. Notes
17. Follow-ups/tasks
18. Dashboard
19. Funnel analytics
20. Source analytics
21. Resume analytics
22. Skill-demand analytics
23. Explainable job/profile analysis
24. Search/filtering
25. Responsive design

---

# 37. Explicitly Out of V1

Do NOT implement unless explicitly approved:

- Chrome/browser extension
- Gmail integration
- Outlook integration
- Calendar integration
- automatic email classification
- native mobile application
- job-board crawling
- automatic LinkedIn scraping
- job alerts
- social networking
- recruiter marketplace
- career coaching marketplace
- collaboration
- AI agent applying to jobs automatically
- automated job applications
- payments
- subscription billing
- team accounts

These may be considered later.

---

# 38. Future V1.5 / V2 Possibilities

Potential later features:

### V1.5
- browser extension
- resume-tailoring suggestions
- richer analytics
- saved filters
- email reminders
- opportunity imports

### V2
- Gmail integration
- Outlook integration
- Google Calendar
- interview-preparation workspace
- automatic application-status detection
- native mobile app
- job alerts
- career insights
- coaching/collaboration
- paid plans

Do not prematurely build infrastructure for these.

---

# 39. Data Privacy

CareerOS handles sensitive professional information.

Treat privacy seriously.

Potential data includes:

- resumes
- personal history
- employment information
- job-search activity
- recruiter details
- interview notes

Principles:

- collect only necessary data
- secure private storage
- isolate user data
- avoid logging sensitive content
- provide deletion capability
- avoid sharing data with unrelated services
- clearly disclose AI processing where appropriate

---

# 40. AI Privacy

Before sending user data to an AI provider:

- send only necessary content
- avoid unnecessary personal identifiers
- understand provider data-retention behavior
- never expose provider secrets
- disclose relevant AI usage in product/privacy documentation

Do not send entire user datasets when a smaller context is sufficient.

---

# 41. Design Philosophy

CareerOS should feel like:

> **A sophisticated personal operating system for job search.**

Desired qualities:

- focused
- calm
- intelligent
- data-rich
- highly usable
- professional
- modern
- trustworthy

Avoid:

- generic admin dashboard design
- excessive gradients
- excessive glassmorphism
- oversized cards everywhere
- gamification that trivializes job searching
- motivational clichés
- cluttered analytics
- AI visual gimmicks

---

# 42. Data Presentation

Different information requires different UI patterns.

Use:

- tables for dense opportunity data
- Kanban for pipeline movement
- timelines for application history
- charts for analytics
- lists for tasks/follow-ups
- structured sections for intelligence
- badges for statuses
- comparison blocks where appropriate

Do not turn everything into a card.

---

# 43. Dashboard Design

The dashboard should prioritize action.

A useful hierarchy may be:

1. what needs attention
2. upcoming interviews/follow-ups
3. active pipeline
4. job-search performance
5. market/skill intelligence

Do not put metrics first merely because dashboards traditionally do.

---

# 44. Responsive Design

CareerOS must be usable on:

- desktop
- laptop
- tablet
- mobile web

Mobile should support key tasks such as:

- checking opportunities
- updating status
- adding notes
- viewing interviews
- completing follow-ups

Do not force the full desktop table experience onto narrow screens.

---

# 45. Accessibility

Accessibility is required.

Use:

- semantic HTML
- keyboard navigation
- accessible form labels
- visible focus states
- adequate contrast
- accessible tables
- accessible Kanban alternatives
- screen-reader-friendly status information
- reduced-motion support

Do not rely only on color for application status.

---

# 46. Loading, Empty and Error States

Every major surface must handle:

- loading
- first-time empty state
- no search results
- API errors
- AI errors
- malformed AI responses
- unavailable resume file
- missing job description
- permission errors

Empty states should teach the user what to do next.

---

# 47. Performance

CareerOS should remain responsive even as user data grows.

Prioritize:

- appropriate indexes
- efficient queries
- pagination/virtualization when warranted
- minimal unnecessary client state
- request deduplication
- efficient analytics queries
- asynchronous AI work where appropriate

Do not optimize prematurely with unnecessary infrastructure.

---

# 48. Testing

Important logic should be independently testable.

At minimum test:

- status transitions
- ownership/authorization
- opportunity creation
- job parsing validation
- AI domain mapping
- skill normalization
- analytics calculations
- funnel calculations
- resume association
- filtering
- search
- partial opportunity records

Live AI calls should not be required for routine test runs.

Use fixtures/mocks.

---

# 49. Data Integrity

Avoid duplicate or inconsistent entities where reasonable.

Examples:

- duplicate skills
- duplicate companies
- duplicate application events
- invalid stage history

Use database constraints where appropriate.

Application logic should not be the sole guardian of important integrity rules.

---

# 50. Analytics Integrity

Analytics should be reproducible from stored domain data.

Do not store arbitrary analytics values that can become inconsistent unless there is a clear reason.

Prefer deriving:

- funnel counts
- response rates
- stage conversion
- skill frequency

from canonical opportunity/application data.

---

# 51. AI Cost Discipline

Do not call AI unnecessarily.

Avoid repeated analysis when underlying data has not changed.

Persist analysis where appropriate and track what inputs it was based on.

Re-run analysis only when relevant data changes or the user explicitly requests it.

---

# 52. Development Workflow

Work feature-by-feature.

For major features:

1. understand the domain requirement
2. inspect existing code
3. inspect relevant Supabase/AI documentation
4. identify ambiguity
5. propose implementation
6. get approval for major decisions
7. implement
8. test
9. review authorization
10. review performance
11. review responsive behavior
12. review accessibility
13. review UX
14. fix issues
15. proceed

Do not build the entire application in one uncontrolled pass.

---

# 53. Questions Before Assumptions

Ask before making major decisions about:

- AI provider
- final database schema
- auth methods
- analytics architecture
- URL scraping
- background processing
- notification infrastructure
- browser extension
- payment/billing
- major design direction
- new backend services

Do not ask unnecessarily about small implementation details.

---

# 54. Documentation Is Source of Truth

When working with:

- TanStack Start
- Supabase
- Auth
- Storage
- AI provider
- third-party libraries

consult current official documentation when implementation details may have changed.

Do not rely on stale assumptions.

---

# 55. Scope Discipline

Do not introduce without justification:

- Redis
- queues
- WebSockets
- realtime subscriptions
- microservices
- external search infrastructure
- vector databases
- cron infrastructure
- payment systems
- native mobile code

V1 should remain as simple as possible while supporting a high-quality product.

---

# 56. Product Quality Standard

CareerOS is intended to become a production-quality SaaS product and a flagship portfolio project.

The quality bar includes:

- coherent domain model
- strong workflow UX
- trustworthy analytics
- explainable intelligence
- secure private data
- polished responsive design
- excellent accessibility
- maintainable architecture

The goal is not:

> “A job tracker with AI.”

The goal is:

> **A personal intelligence system that helps people run a better job search and understand what their own job-search data is telling them.**