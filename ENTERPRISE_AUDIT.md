# Enterprise Audit Report — YallaStarter

**Production URL:** https://yallastarter-pro.onrender.com  
**Audit scope:** Full platform scan, OAuth, user data, links, headers, performance, admin, coin asset.

---

## 1. What was broken (specific files / pages / endpoints)

### Links and navigation
- **29 broken links** (static scan baseline):
  - **Arabic language switcher:** Multiple `-ar.html` pages used Arabic filenames in `window.location.href` (e.g. `المدونة.html`, `دليل-المبدع.html`) which do not exist. Actual files are `blog.html`, `creator-handbook.html`, etc. Affected files: `blog-ar.html`, `creator-handbook-ar.html`, `creator-faqs-ar.html`, `creator-resources-ar.html`, `backer-faqs-ar.html`, `backer-resources-ar.html`, `backer-protection-ar.html`, `payment-methods-ar.html`, `newsletter-ar.html`, `events-ar.html`, `success-stories-ar.html`, `trust-safety-ar.html`, `community-guidelines-ar.html`.
  - **trust-safety.html:** Language switcher pointed to `trust-&-safety.html` / `trust-&-safety-ar.html` (invalid `&` in path).
  - **user-profile-ar.html:** Link to `settings-ar.html` (file does not exist; only `settings.html` exists).

### Google OAuth
- Callback URL must be **absolute** on Render. If `BASE_URL` was not set to the production domain, Google would redirect to the wrong host and OAuth would fail in production.
- No explicit documentation of production redirect URI: `https://yallastarter-pro.onrender.com/api/auth/google/callback`.

### User accounts and security
- **Admin seed:** Default password `YallaAdmin2025!` was used when `ADMIN_PASSWORD` was not set, including in production. This is a security risk.
- User model and auth routes already enforced unique email (lowercase), password hashing (bcrypt), and JWT; no duplicate-account bugs found in code.

### API and backend
- No critical API bugs identified. Health, auth, projects, coins, admin routes behave as designed. Admin routes correctly use `protect` + `adminOnly` middleware.

---

## 2. Root causes

- **Arabic links:** Language switchers were written with literal Arabic slugs instead of the actual English filenames used in the repo.
- **trust-safety:** Typo in href (`&` instead of correct path).
- **settings-ar:** Assumption that an Arabic settings page exists; only English exists.
- **OAuth:** Callback URL built from `BASE_URL`; production was not explicitly set or documented.
- **Admin seed:** Convenience default for local dev was also applied in production.

---

## 3. What was changed

### A) Automated scan suite
- **scripts/static-scan.js:** Crawls all `public_html/**/*.html`, extracts `href`/`src`, resolves relative URLs, checks targets under `public_html` (or known API routes). Writes **reports/static-scan.json** and **reports/static-scan.md**.
- **Playwright E2E + API:** Added **tests/e2e-scan.spec.js** (home, login, signup, dashboard redirect, projects, coins, nav links, API health) and **tests/api-health.spec.js** (health, auth 400, projects list, admin/coins 401). **scripts/run-e2e-scan.js** starts the server on a test port, runs Playwright, writes **reports/e2e-scan.json** and **reports/e2e-scan.md**.
- **package.json:** `npm run static-scan`, `npm run e2e-scan`, `npm run test:e2e`.

### B) Google OAuth (production)
- **config/passport.js:** Unchanged; already uses `BASE_URL` or `CLIENT_URL` for callback URL.
- **server.js:** Added `https://yallastarter-pro.onrender.com` to CORS `allowedOrigins`.
- **.env.example:** Set `BASE_URL` and `CLIENT_URL` to `https://yallastarter-pro.onrender.com` and documented that Google Authorized redirect URI must be `https://yallastarter-pro.onrender.com/api/auth/google/callback`.

### C) User accounts and admin seed
- **server.js:** In production (`NODE_ENV=production`), admin user is **not** seeded unless `ADMIN_PASSWORD` is set. In development, fallback `YallaAdmin2025!` still applies.
- **.env.example:** Note that `ADMIN_PASSWORD` is required in production for admin seed.

### D) Broken links and buttons
- Replaced all incorrect Arabic filenames in language switchers with correct English filenames in:
  `trust-safety-ar.html`, `success-stories-ar.html`, `payment-methods-ar.html`, `newsletter-ar.html`, `events-ar.html`, `creator-resources-ar.html`, `creator-handbook-ar.html`, `creator-faqs-ar.html`, `community-guidelines-ar.html`, `blog-ar.html`, `backer-resources-ar.html`, `backer-protection-ar.html`, `backer-faqs-ar.html`.
- **trust-safety.html:** `trust-&-safety.html` → `trust-safety.html`, `trust-&-safety-ar.html` → `trust-safety-ar.html`.
- **user-profile-ar.html:** `settings-ar.html` → `settings.html`.

**Static scan after fixes:** **0 broken links**, **0 missing assets**.

### E) Single-source header
- **public_html/partials/header-en.html** and **public_html/partials/header-ar.html:** Canonical nav markup (EN/AR).
- **public_html/assets/js/load-partials.js:** Fetches partial by `data-partial` and `data-lang`, injects into container. Usage: `<header class="header" data-partial="header" data-lang="en">...</header>` or empty `<div data-partial="header" data-lang="en"></div>`, and include script before `</body>`. Existing pages still use inline headers; new or refactored pages can adopt the partial for consistency.

### F) Performance and assets
- Compression (gzip) and project list pagination/indexes were already in place from prior work. No additional performance code changes in this audit.
- **Coin image:** Platform expects **public_html/images/coin.png**. If the file is missing, wallet pages show the existing “Y” fallback. Replace with the gold “Y” coin asset (optimized PNG or WebP) at that path for production.

---

## 4. How we tested

- **Static scan:** `npm run static-scan` (no server). Before: 29 broken links. After: 0 broken links, 0 missing assets.
- **E2E/API:** With server running on test port (and MongoDB available), `npm run e2e-scan` runs Playwright and produces reports. API tests assert health 200, auth/projects/admin/coins contract (400/401 where expected).
- **Manual:** Verified language switcher and settings link on a subset of AR pages; confirmed CORS and .env.example match production URL.

---

## 5. Reports

- **reports/static-scan.md** — Static link/asset report (after fixes: 0 critical).
- **reports/e2e-scan.md** — E2E run summary (pass/fail counts, failed tests if any).
- **reports/static-scan.json** / **reports/e2e-scan.json** — Machine-readable outputs.

---

## 6. Required env vars (reference)

- **MONGODB_URI** or **MONGO_URI** — Atlas connection string.
- **JWT_SECRET** — JWT signing secret.
- **BASE_URL** — Production: `https://yallastarter-pro.onrender.com` (for OAuth callback).
- **CLIENT_URL** — Same as BASE_URL for same-origin.
- **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** — Google OAuth.
- **ADMIN_PASSWORD** — Required in production to seed admin user.
- **STRIPE_SECRET_KEY** / **STRIPE_WEBHOOK_SECRET** — For payments (optional but needed for coins).
- **PORT** — Set by Render.
