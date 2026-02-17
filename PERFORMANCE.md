# Performance report

## What was slow / oversized

- **Backend**
  - `GET /api/projects` returned all projects with no pagination or limit, causing large payloads and slow response as data grew.
  - Login/signup used unnormalized email (no lowercase), risking duplicate accounts and slower lookups.
  - No indexes on User (email, username, createdAt, role) or Transaction (stripeSessionId) for frequent queries and webhook idempotency.
- **Frontend**
  - Static HTML + vanilla JS; no huge bundle. Main cost was unnecessary API payload (all projects at once) and repeated full-page loads.
- **Database**
  - Missing indexes on User and Transaction for auth, admin, and Stripe webhook lookups.

## What was changed

- **API**
  - `GET /api/projects`: added pagination (`page`, `limit`, max 50), `.lean()`, and `sort({ createdAt: -1 })` to reduce payload and improve response time.
  - Login: normalize email to lowercase before `User.findOne`.
  - Signup/update-profile: normalize email to lowercase; avoid duplicate emails and case-sensitive bugs.
- **Indexes**
  - User: `email` (unique), `username` (unique), `createdAt`, `role`.
  - Transaction: `stripeSessionId` (sparse) for webhook lookups.
  - Project already had `category`, `status`, `creator` indexes.
- **Google OAuth**
  - Passport callback URL uses `BASE_URL` so production (e.g. Render) works; avoids wrong redirect and failed auth.

## Expected improvement

- **Projects list:** Smaller responses and faster queries; scales with many projects.
- **Auth:** Consistent email handling and faster lookups via index; fewer duplicate-account issues.
- **Admin / webhooks:** Faster user and transaction queries; webhook processing more efficient.
- **Google login:** Works on production when `BASE_URL` is set correctly.

## Optional next steps

- Add caching (e.g. in-memory or Redis) for public project list with short TTL.
- Lazy-load or paginate project cards on the homepage.
- Ensure images use responsive `srcset` or WebP and `loading="lazy"` where applicable (some already do).
