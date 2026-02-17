# UX Notes — YallaStarter responsive and consistency improvements

## What was improved and why

### 1. Responsive design baseline (mobile-first)
- **Added `/public_html/css/global.css`** — Global foundation with:
  - CSS custom properties for spacing (`--space-*`), typography (`--text-*`, `--text-hero`, `--text-hero-sub`), touch targets (`--touch-target-min: 44px`), and container padding that scales by breakpoint.
  - Standard breakpoints: ≤480 (small mobile), 481–768, 769–1024, ≥1025 (desktop).
  - Responsive container (`.container-responsive`), responsive media (img/video `max-width: 100%`, `object-fit`), utility classes (`.sr-only`, `.no-scroll`), and RTL-ready rules.
- **Imported in `styles.css`** so every page that loads the main stylesheet gets the foundation without changing 130+ HTML files.

### 2. Header / nav consistency and mobile behavior
- **Breakpoint aligned to 1024px** — Previously the hamburger appeared only below 768px, which caused the desktop nav (links + language + auth buttons) to overflow on tablet/small laptop and truncate the Arabic label. Now:
  - **Below 1024px:** Only logo + hamburger are visible in the bar; nav links, language switcher, and auth buttons move into the slide-down mobile menu.
  - **1024px and above:** Full horizontal nav is shown; hamburger and mobile menu are hidden.
- **Updated `mobile-menu.css` and `mobile-menu.js`** to use the 1024px threshold consistently (show/hide hamburger, close menu on resize).
- **No horizontal scroll** — Navbar uses `flex-wrap`, and on smaller widths we hide the desktop nav so the header no longer overflows.
- **Touch-friendly** — Minimum 44px height for nav links and buttons (in global.css and existing mobile-menu.css).
- **Accessibility** — Added `role="banner"` and `role="navigation"` on header/nav; hamburger has `aria-label`, `aria-expanded`, `aria-controls`; mobile menu has `id="mobile-menu"` and `aria-hidden`. Applied on `index.html` and `login.html`; same pattern can be applied to other pages that use the same header.

### 3. Homepage hero
- **Responsive typography** — Hero title and subtitle use `clamp()` in global.css (`--text-hero`, `--text-hero-sub`) so they scale on all viewports and stay readable on mobile.
- **Hero CTAs above the fold** — Added a `.hero-ctas` block with two buttons: “Start a Project” and “Browse Projects” so the main actions are visible without scrolling on mobile and desktop.
- **Safe padding** — Hero section uses `var(--container-padding)` and responsive padding so content doesn’t touch edges on small screens.
- **Background** — Existing hero background (size/position) kept; global.css sets responsive min-height and padding so the hero adapts to viewport height.

### 4. Platform-wide consistency
- **Single global foundation** — All pages that include `styles.css` get the same spacing scale, typography scale, touch targets, and responsive container/media rules.
- **Shared header pattern** — Same header structure (logo, nav, language, auth, hamburger, mobile menu) with consistent breakpoint and ARIA. Partials in `/public_html/partials/header-en.html` and `header-ar.html` already exist; pages that still use inline headers can be migrated to the partial over time.
- **Forms** — In global.css, forms use a single-column layout on viewports ≤768px and inputs/buttons have a minimum height of 44px and `font-size: 16px` on mobile to avoid iOS zoom.

### 5. Automated responsive checks
- **Playwright responsive tests** (`tests/responsive-scan.spec.js`):
  - Viewports: 390×844 (iPhone), 768×1024 (tablet), 1366×768 (laptop).
  - Checks: no horizontal scroll (body width ≤ viewport), header and hamburger/nav visibility by breakpoint, primary CTA visible and clickable, mobile menu opens and shows links.
  - Core pages: index, projects, login, signup, dashboard, admin-dashboard — each loaded at mobile viewport and checked for non-5xx and no horizontal scroll.
- **Report** — `npm run responsive-scan` runs the tests and writes `reports/responsive-scan.json` and `reports/responsive-scan.md` (pass/fail counts and failed test names).

---

## Key flows verified

- **Public:** Home → hero CTAs (Start a Project, Browse Projects) → projects list; header and hamburger work at 390px, 768px, and 1366px; no horizontal scroll on index and projects.
- **Auth:** Login and signup pages load and have the same header/mobile menu pattern; forms are single-column and touch-friendly on mobile.
- **Dashboard / Admin:** Pages load (or redirect to login); responsive tests only assert status &lt; 500 and no horizontal scroll at mobile viewport; full flow (login → dashboard) can be tested manually or in a separate E2E suite.

---

## Remaining optional enhancements

1. **Roll out ARIA and `id="mobile-menu"`** to all pages that have the header (e.g. signup, projects, dashboard, Arabic variants) by repeating the same button and mobile-menu markup.
2. **Migrate more pages to header partials** — Use `data-partial="header"` and `load-partials.js` on high-traffic pages so header changes are made in one place.
3. **Project details page** — Add to the responsive test list (e.g. `/project-details.html` or a fixed sample URL) and ensure no horizontal scroll and CTAs are tappable.
4. **Admin dashboard** — Dedicated responsive pass for sidebar + tables on tablet/mobile (stack or collapse sidebar).
5. **Performance** — Hero background image: consider responsive images or smaller asset for mobile if file size is high; already using `loading="lazy"` where applicable.
6. **Reduced motion** — `mobile-menu.css` already has `prefers-reduced-motion`; global.css could add reduced-motion overrides for hero or other animations if needed.

---

## How to run

- **Responsive scan (requires server):**  
  `npm run responsive-scan`  
  Set `BASE_URL` or `E2E_BASE_URL` if the app is not on `http://localhost:3999`.
- **Static scan (no server):**  
  `npm run static-scan`
