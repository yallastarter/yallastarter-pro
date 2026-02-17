# Platform verification checklist

Use this checklist to verify creator, backer, and admin flows after deployment or major changes.

---

## 1) Creator flow

- [ ] **Auth**
  - Signup and login work (email + password).
  - Session persists across refresh (token in localStorage; dashboard loads user data).
  - Google login works if GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
- [ ] **Create project**
  - Create project page loads when logged in (`create-project.html`); redirects to login when not.
  - All steps (Basic Info, Project Details, Funding & Rewards, Review & Submit) are fillable.
  - Required fields: title, category, location, description, funding goal, deadline.
  - Save as draft works (project created with status `draft`).
- [ ] **Uploads**
  - Cover image: file input works; upload to `/api/projects/upload-cover` succeeds; image displays on project.
  - Gallery: multiple images (up to 10) upload via `/api/projects/upload-gallery`.
  - File type/size: server accepts images (JPEG, PNG, GIF, WebP) and enforces size limit (e.g. 8MB).
- [ ] **Dashboard**
  - Creator dashboard loads (`dashboard.html`) with sidebar and user info.
  - “My Projects” tab shows projects from `/api/projects/user/me`.
  - Stats (Active Projects, Total Raised) update from API.
  - View and Edit buttons link to `project-details.html?id=...` and create-project (or edit flow).
- [ ] **Project display**
  - Project details page loads with `?id=<projectId>`; shows title, description, cover image, gallery, video URL if set.
  - Draft projects do not appear on public browse; only active/completed do.

---

## 2) Backer flow

- [ ] **Browse & discover**
  - Browse projects page (`projects.html`) loads and lists projects from `/api/projects`.
  - Filters/sorts work if implemented (category, status).
  - Project cards link to `project-details.html?id=...`.
- [ ] **Project page**
  - Project details load; media (cover, gallery, video embed) display when present.
  - No broken image links or 404s for uploads.
- [ ] **Backing**
  - “Back this project” links to `coins.html?projectId=...`.
  - On coins page, project can be selected in Send Coins (pre-selected when `projectId` in URL).
  - Sending coins to a project: validation (amount, balance); API `/api/coins/send` succeeds; balance and project raised amount update.
- [ ] **Backer dashboard**
  - “Backed Projects” tab shows projects from `/api/coins/backed`.
  - Transaction history shows send transactions.
  - Wallet page has same dashboard navigation (sidebar) and correct balance/history.

---

## 3) Admin flow

- [ ] **Admin login**
  - Admin login page loads (`admin-login.html`).
  - Login with admin credentials (admin user seeded with ADMIN_PASSWORD); redirects to admin dashboard.
  - Non-admin users get “Access denied” when using admin login.
- [ ] **Admin dashboard**
  - Admin dashboard loads (`admin-dashboard.html`) without errors.
  - Dashboard stats load from `/api/admin/dashboard` (users, projects, transactions, etc.).
- [ ] **Admin actions**
  - Users table loads (`/api/admin/users`); search/pagination if present.
  - Projects table loads (`/api/admin/projects`); status filter/update works.
  - Transactions table loads (`/api/admin/transactions`).
  - Cashouts section loads (`/api/admin/cashouts`); approve/reject works.
- [ ] **Security**
  - All `/api/admin/*` endpoints return 401 without auth and 403 for non-admin users.
  - No client-only checks; server enforces admin role (middleware `adminOnly`).

---

## 4) Automated checks

- [ ] **Audit**
  - `npm run audit` completes; `reports/audit.json` and `reports/audit.md` show 0 critical issues (or documented exceptions).
- [ ] **Flows audit**
  - `npm run flows-audit` completes; `reports/flows-audit.json` and `reports/flows-audit.md` generated; no blocking issues for creator, backer, admin.
- [ ] **E2E**
  - `npm run e2e-scan` passes (with MongoDB available).

---

## 5) General

- [ ] No hardcoded secrets; all secrets from env vars.
- [ ] User-facing errors and loading states on async actions (create project, send coins, uploads).
- [ ] Responsive layout: dashboard and wallet work on mobile; no horizontal scroll on small viewports.
- [ ] One consistent header across public, dashboard, and wallet pages; dashboard sidebar on wallet/coins page.
