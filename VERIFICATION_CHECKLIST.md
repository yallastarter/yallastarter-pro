# Verification checklist

Use this after deploying or before a release.

## Broken links

- [ ] **Home:** `/`, `index.html`, `index-ar.html` load.
- [ ] **Auth:** `login.html`, `signup.html`, `login-ar.html`, `signup-ar.html` load; links between them and dashboard work.
- [ ] **Dashboard:** `dashboard.html`, `dashboard-ar.html`; sidebar and header links: Dashboard, Profile, Settings, My Wallet (coins), Logout.
- [ ] **Coins:** `coins.html`, `coins-ar.html` (and from dashboard “My Wallet”).
- [ ] **Settings:** `settings.html` (and from dashboard).
- [ ] **Projects:** `projects.html`, `project-details.html?id=...`, `create-project.html`.
- [ ] **Footer/site:** About, How it works, Contact, Creator/Backer pages (creator-handbook, trust-safety, support, etc.) — no 404s.
- [ ] **Admin:** `admin-dashboard.html` (admin only); links and tabs work.

## Buttons and forms

- [ ] **Login:** Email/password submit works; “Log In” and “Sign Up” links work.
- [ ] **Google login:** Button redirects to Google; after auth, redirect back to dashboard with session.
- [ ] **Signup:** Form validation and submit; success redirect to dashboard.
- [ ] **Dashboard:** Logout, Profile, Settings, My Wallet, Create Project.
- [ ] **Coins:** Buy (Stripe), Send to project, Cash out (with bank details).
- [ ] **Create project:** Form submit creates project (when logged in).
- [ ] **Admin:** Dashboard, Users, Projects, Transactions, Cashouts tabs; adjust user coins; approve/reject cashout.

## Google auth

- [ ] **Local:** `BASE_URL=http://localhost:3000`; Google OAuth redirect URI includes `http://localhost:3000/api/auth/google/callback`.
- [ ] **Production:** `BASE_URL=https://YOUR_RENDER_URL`; redirect URI in Google Console is `https://YOUR_RENDER_URL/api/auth/google/callback`.
- [ ] **Flow:** Click Google login → Google → redirect to dashboard with token and user; session persists.

## User and DB

- [ ] **Sign up:** New user created in MongoDB; no duplicate for same email (case-insensitive).
- [ ] **Login:** Correct user returned; JWT and `/api/auth/me` match.
- [ ] **Profile update:** Username/email update; email uniqueness enforced.
- [ ] **Admin:** User list and counts match DB; no auth bypass for non-admin.

## Admin

- [ ] **Access:** Only admin role can open admin dashboard and call admin APIs.
- [ ] **Dashboard:** Overview stats load; recent users, transactions, top projects.
- [ ] **Users:** List, search, adjust coin balance.
- [ ] **Projects:** List by status; change status.
- [ ] **Transactions:** List by type.
- [ ] **Cashouts:** Pending list; approve/reject.

## Build and run

- [ ] **Env:** `MONGODB_URI` or `MONGO_URI`, `JWT_SECRET` set; optional: `BASE_URL`, `GOOGLE_*`, `STRIPE_*`.
- [ ] **Start:** `npm start` (or `node server.js`) binds to `PORT` and does not crash.
- [ ] **Health:** `GET /api/health` returns 200 and `status: 'ok'`.
- [ ] **Tests:** With MongoDB available, `npm test` passes (integration test uses port 3099 by default).

## Coin image

- [ ] **Asset:** `public_html/images/coin.png` exists and is used on coins (and coins-ar) page.
- [ ] **Fallback:** If image is missing, “Y” fallback still shows.
