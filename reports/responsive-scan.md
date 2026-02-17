# Responsive Scan Report

Generated: (run `npm run responsive-scan` with server on BASE_URL to refresh)

## Viewports tested
- **390×844** — iPhone
- **768×1024** — Tablet
- **1366×768** — Laptop

## Checks
- No horizontal scroll (`document.body.scrollWidth <= viewport width`)
- Header and hamburger (≤1023px) or full nav (≥1024px) visible
- Primary CTA visible and clickable (min height 40px)
- Mobile menu opens and shows links
- Core pages (index, projects, login, signup, dashboard, admin-dashboard) load without 5xx and no horizontal scroll at 390px

## How to run
```bash
# Start server (e.g. on port 3999)
PORT=3999 node server.js

# In another terminal
BASE_URL=http://localhost:3999 npm run responsive-scan
```
Report is written to `reports/responsive-scan.json` and this file.
