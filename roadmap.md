# Roadmap

## Current mobile and theme update
- [ ] Selected minimalist two-preview chooser, continuous accent slider and reopenable settings
- [ ] Verify gradual transitions, saved accent settings and white-mode typography
- [x] Replace bottom navigation with a role-aware mobile sidebar
- [x] First-device dark/light chooser with visual preview and dismiss
- [x] Smooth theme changes; restore animations and skeleton contrast in light mode
- [x] Verify chooser persistence, sidebar navigation, and login on desktop/mobile (signed-in dashboards still require an external test session)

- [x] Fix post-login white screen (React hook order crash in `/student`)
- [x] Remove black transition flashes between pages
- [x] SEDUVA2026 school signup code + school admin linked to Šeduvos gimnazija
- [x] School admin real data: canonical class values in class picker
- [x] Skeletons shown on every school dashboard refresh
- [x] /versijos updated with V2.3.0
- [x] Vercel env key list (`docs/VERCEL-ENV.md`)
- [x] Enforce lockdown server-side (DB triggers block writes for non-admins)
- [x] School dashboard: each tab has its own URL (`/school?tab=...`) + scroll to top
- [x] Super-admin dashboard preview tool (`/admin/preview`)
- [ ] Email send/receive verification for pagalba@ and noreply@
- [ ] Full E2E pass (reservations, QR check-in, certificate)
- [x] Chat RLS fix (school admin ↔ organization rooms)
- [x] Reservations/check-in 500s (recursive RLS policy removed)
- [x] Analytics counts one signed-in user once
- [x] Auto-lockdown at 100 errors / 10 min regardless of user count
- [ ] Integrate official Sentry TanStack Start SDK without hardcoding SENTRY_AUTH_TOKEN
- [ ] Rebuild login/register and add GitHub OAuth with reliable success redirect
- [ ] Add logout transition and remove remaining 3D effects from auth/tasks
- [ ] Upgrade loading skeletons across async surfaces
- [ ] Rework task details, organization profile links, and reservation messaging
- [ ] Build persistent role-aware /chat and fix chat RLS/runtime errors
- [ ] Repair student map, friends search/add, and organization group flows
- [ ] Rework role-aware one-time onboarding tour
- [ ] Prepare main-site auth ticket creation/consumption for auth.socialinesvalandos.dev
- [ ] Audit achievement/reservation emails and document support/sender addresses
- [ ] Improve route SEO and smooth scrolling
- [ ] Run broad public and authenticated E2E coverage where available

## Current authentication check
- [x] Correct login/signup contrast and fonts; show genuine school-loading skeletons and retry errors
- [x] Verify public pages and registration school-list failure/retry (no browser runtime errors; 162 automated tests passed)
- [x] Replace certificate signing secret through secure input
- [ ] Match CERT_SIGNING_SECRET in Vercel — requires user configuration
- [ ] Verify authenticated sign-in, email delivery, and certificates — external Supabase does not provide an authenticated test session

## Big overhaul (2026-10-05) — phases
- [x] P1 Sentry test button (Admin → Įrankiai)
- [x] P1 Only Super Admin creates school admins (database-enforced)
- [x] P1 School admin manager: school, multi/all classes, auto year renewal
- [x] P1 Certificate/QR: verify re-checks HMAC signature (supports CERT_SIGNING_SECRET_OLD)
- [x] P2 Cities, city/org filters, whole-Lithuania map (Mapbox via VITE_MAPBOX_PUBLIC_TOKEN, OSM fallback), task popup
- [x] P3 /chat page, reservation→chat messages, bulk accept/decline, new-message emails
- [x] P4 Friend invite link (/friends/add/:id); group reservations already existed
- [x] P5 Auth switch + forgot-password animations, shimmer skeletons, school chat link, tests
- [x] Bot gate: black 'Patikrinimas, ar jūs ne robotas' with own hold check → reCAPTCHA fallback
- [ ] Signed-in end-to-end checks (blocked: no test session available for this Supabase project)
- [ ] Deeper school-admin dashboard redesign (open)

- [x] Wrong-role dashboard access: "Oops, tai ne tavo" + redirect
