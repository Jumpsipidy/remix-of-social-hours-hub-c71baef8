# Roadmap

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
- [ ] P1 Certificate/QR security audit
- [ ] P2 Cities + /tasks filters + Mapbox + task popup (needs VITE_MAPBOX_PUBLIC_TOKEN)
- [ ] P3 Reservation popups, /chat, bulk accept, notifications
- [ ] P4 Friends invites + "Eikime kartu"
- [ ] P5 Animations, skeletons, school-admin overhaul, E2E
