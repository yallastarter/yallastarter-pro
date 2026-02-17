# Render deploy – YallaStarter

**Production URL:** https://yallastarter-pro.onrender.com

---

## Build and start

| Step | Command |
|------|--------|
| **Build** | `npm install` |
| **Start** | `npm start` |

- The app listens on `process.env.PORT` (Render sets this).
- Static files are served from `public_html` (no separate frontend build).

---

## Required environment variables

Set in Render Dashboard → Environment:

| Variable | Required | Notes |
|----------|----------|--------|
| **MONGODB_URI** | Yes | MongoDB Atlas connection string |
| **JWT_SECRET** | Yes | Strong random string (e.g. `openssl rand -hex 32`) |
| **BASE_URL** | Yes (for OAuth) | `https://yallastarter-pro.onrender.com` |
| **CLIENT_URL** | Recommended | Same as BASE_URL |
| **ADMIN_PASSWORD** | Yes (production) | For admin user seed |
| **STRIPE_SECRET_KEY** | For coin purchases | Stripe secret key |
| **STRIPE_WEBHOOK_SECRET** | For Stripe webhooks | Webhook signing secret |
| **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** | Optional | For Google login |

**PORT** is set by Render; do not set it manually.

---

## MongoDB Atlas

- In Atlas: **Network Access** – allow `0.0.0.0/0` or add Render’s outbound IPs.
- Use **MONGODB_URI** (or **MONGO_URI**) in Render with your cluster URL and password.

---

## More detail

See **RENDER_DEPLOYMENT.md** for full Render settings, Google OAuth, and coin asset notes.
