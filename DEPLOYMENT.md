# YallaStarter — Render + MongoDB Atlas Deployment Notes

## Required environment variables

Set these in **Render Dashboard → Your Web Service → Environment**.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` or `MONGO_URI` | **Yes** | MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/yallastarter?retryWrites=true&w=majority`) |
| `JWT_SECRET` | **Yes** | Strong random secret for JWT (e.g. `openssl rand -hex 32`) |
| `PORT` | Set by Render | Render sets this automatically; do not override. |
| `NODE_ENV` | Optional | Set to `production` on Render. |
| `BASE_URL` | **Yes for Google login** | Full app URL, e.g. `https://your-app.onrender.com` (no trailing slash). Used for Google OAuth callback URL. |
| `CLIENT_URL` | Optional | Same as BASE_URL for same-origin; set if frontend is on another domain (CORS + redirects). |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID (Google login disabled if missing). |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret. |
| `STRIPE_SECRET_KEY` | Optional | Required for coin purchases. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Required for Stripe webhooks in production. |
| `ADMIN_PASSWORD` | Optional | Password for seeded admin user (default: `YallaAdmin2025!`). |

## Render settings assumptions

- **Build command:** `npm install` (or leave default).
- **Start command:** `npm start` (runs `node server.js`).
- **Node version:** 18.x (set in `package.json` engines or Render).
- The app listens on `process.env.PORT`; Render injects `PORT`.
- No static build step; `public_html` is served by Express.

## MongoDB Atlas settings assumptions

- **Network access:** Add `0.0.0.0/0` (Allow access from anywhere) for Render IPs, or use Atlas’ “Allow access from anywhere” for simplicity.
- **Database user:** Create a user with read/write on the target database.
- **Connection string:** Use the “Connect” → “Drivers” URI; replace `<password>` with the user password.
- **Indexes:** Created by the app (User, Project, Transaction). For large data, ensure indexes exist (see `models/*.js`).

## Google OAuth (production)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create OAuth 2.0 Client ID (Web application).
2. **Authorized redirect URIs** must include:
   - `https://YOUR_RENDER_SERVICE_URL/api/auth/google/callback`
   - For local dev: `http://localhost:3000/api/auth/google/callback`
3. Set `BASE_URL` on Render to `https://YOUR_RENDER_SERVICE_URL` (no trailing slash).
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render.

## Coin image asset

- The platform expects the official coin image at **`public_html/images/coin.png`**.
- Add your coin image file to that path (optimized PNG/WebP, recommended size e.g. 256×256 or 512×512).
- If the file is missing, the wallet pages show a fallback “Y” badge.

## Build and run (local)

```bash
npm install
# Set .env (copy from .env.example)
node server.js
# Or: npm run dev
```

## Verification checklist (after deploy)

- [ ] **Broken links:** Home, Login, Signup, Dashboard, Coins, Settings, Projects, Admin (no 404s).
- [ ] **Buttons:** Login, Sign up, Google login, Logout, Create project, Buy/Send coins.
- [ ] **Google auth:** Sign-in redirects to Google, callback returns to dashboard with session.
- [ ] **User DB:** Sign up creates user; login and `/api/auth/me` return correct user; no duplicate emails.
- [ ] **Admin:** Login as admin → dashboard, users, projects, transactions, cashouts load and actions work.
- [ ] **Build/start:** `npm run test` (if applicable), `npm start` succeeds; Render build and start succeed.
