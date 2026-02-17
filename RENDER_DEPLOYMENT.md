# Render deployment — YallaStarter

**Production URL:** https://yallastarter-pro.onrender.com

---

## Exact Render settings

| Setting | Value |
|--------|--------|
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Node version** | 18.x (set in Dashboard or use `engines` in package.json: `"node": "18.x"`) |

- The app listens on **`process.env.PORT`** (Render sets this automatically).
- No separate frontend build step; Express serves **public_html** as static files.

---

## Environment variables (set in Render Dashboard)

Set these under **Environment** for the Web Service:

| Variable | Required | Example / note |
|----------|----------|----------------|
| **MONGODB_URI** | Yes | Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/yallastarter?retryWrites=true&w=majority`) |
| **JWT_SECRET** | Yes | Strong random string (e.g. `openssl rand -hex 32`) |
| **BASE_URL** | Yes (for Google login) | `https://yallastarter-pro.onrender.com` |
| **CLIENT_URL** | Recommended | `https://yallastarter-pro.onrender.com` |
| **GOOGLE_CLIENT_ID** | For Google login | From Google Cloud Console |
| **GOOGLE_CLIENT_SECRET** | For Google login | From Google Cloud Console |
| **ADMIN_PASSWORD** | Yes (production) | Required to seed admin user; no default in production |
| **STRIPE_SECRET_KEY** | For coin purchases | Stripe secret key |
| **STRIPE_WEBHOOK_SECRET** | For Stripe webhooks | Stripe webhook signing secret |
| **NODE_ENV** | Optional | `production` |

**PORT** is set by Render; do not override it.

---

## Google OAuth (production)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (Web application).
2. Under **Authorized redirect URIs**, add:
   - **https://yallastarter-pro.onrender.com/api/auth/google/callback**
3. Set **BASE_URL** and **CLIENT_URL** on Render to `https://yallastarter-pro.onrender.com` (no trailing slash).

---

## MongoDB Atlas

- Use **Network Access** (e.g. allow `0.0.0.0/0` or add Render outbound IPs if known).
- Connection string in **MONGODB_URI** (or **MONGO_URI**); replace `<password>` with the DB user password.

---

## Coin image

- Replace the platform coin asset at **public_html/images/coin.png** with the gold “Y” coin image (optimized PNG or WebP).
- If the file is missing, wallet pages show the built-in “Y” fallback.

---

## File storage (uploads)

- **Profile photos** are stored under **public_html/uploads/profiles/**.
- **Project images** (cover + gallery) are stored under **public_html/uploads/projects/**.
- Uploads are served by Express static middleware from **public_html**, so URLs are like `/uploads/profiles/...` and `/uploads/projects/...`.
- **Render disk:** Render’s filesystem is **ephemeral**. Uploaded files will be lost on deploy or restart. For production with persistent uploads, use cloud storage (e.g. S3, Cloudinary) and set the appropriate env vars; the app would need to be extended to use that storage instead of disk.
- No extra env vars are required for the current disk-based uploads; ensure the app has write access to the **public_html/uploads** directory (created at startup by server.js).

---

## Build and start (local)

```bash
npm install
# Set .env from .env.example
npm start
```

## Scans and audits (optional)

```bash
npm run static-scan   # Link/asset crawl → reports/static-scan.md
npm run e2e-scan      # Starts server, runs Playwright → reports/e2e-scan.md (needs MongoDB)
npm run audit         # Full audit crawler → reports/audit.json, reports/audit.md
npm run flows-audit   # Creator/backer/admin flows → reports/flows-audit.json, reports/flows-audit.md
```
