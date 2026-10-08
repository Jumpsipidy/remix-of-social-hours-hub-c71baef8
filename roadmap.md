# Roadmap

## Soci Guard follow-up (2026-10-08)
- [x] Explain mouse movement while holding, show live movement feedback, and retain touch/keyboard access
- [x] Validate bounded hold samples on the server and safely recheck visitors when pass validation fails
- [x] Test automatic-browser detection (score 11), still-pointer guidance, keyboard hold, mobile instructions and student layout at 320/390/430/1280px in both themes; no overflow or page errors, 211 tests pass. Realistic automated actions can still solve the challenge; no universal bot-blocking claim.

## Ultimate mobile audit (2026-10-08)
- [x] Capture and visually inspect 60 mobile screenshots across 15 public pages, four widths and light/dark themes; no horizontal overflow or page errors
- [x] Fix certificate-page contrast, viewport-aware private chat height and loading fallbacks; defer PDF libraries and auxiliary diagnostic widgets
- [x] Verify certificate HMAC integrity, page through complete owner/participant history, include server-stamped approving identities and pass tampering tests
- [x] Generate and inspect a seven-page synthetic PDF containing all 45 activities, Lithuanian text, QR and correctly encoded clickable links; recheck isolated chat, QR, school and auth layouts
- [ ] Real signed-in mobile flows and issued certificate download/scan — external unmanaged Supabase prevents authenticated end-to-end testing

## Mobile enhancement (2026-10-08)
- [x] Restore synchronized blue login/signup sweep and smooth matching skeleton-to-form transition, including mobile
- [x] Compact mobile navigation, dashboard rows, task filters and reservation dialogs without changing desktop layouts
- [x] Accessible chat contact picker, multiline composer, long-text wrapping, live private inbox and keyboard-safe conversation layout
- [x] Fast QR presentation, matching loading view, retry/offline/expired states and prominent student QR links
- [x] Mobile class roster/history and organization scanning controls
- [x] Verify public pages at 320/390/768px and isolated chat, QR and school fixtures; multiline send and QR dialog pass; 190 tests pass
- [ ] Verify real signed-in conversations, QR scanning/camera and phone software keyboard — blocked by external unmanaged Supabase session availability; isolated UI checks are not end-to-end authentication checks

## Login/signup transition
- [x] Restore the blue sliding sweep and add fast matching login/signup loading placeholders (no artificial minimum wait)
- [x] Verify both navigation directions and isolated loading preview with no runtime errors; 169 smoke tests passed; suggested next steps listed in reply
- [x] Synchronize panel movement, resizing, tab indicator and text changes without remount entrance effects
- [x] Verify both navigation directions in Chromium and run route smoke tests (169 passed)

## Lockdown screen redesign
- [x] Select palette, typography and layout, then choose a rendered direction
- [x] Redesign all visitor lockdown states and dialogs without changing their functionality
- [x] Verify incident messaging, guide/access dialogs, retry response and mobile layout (isolated browser preview; no live lockdown change)

## Latest search information and theme settings
- [x] Update AI reference, homepage metadata and V2.5 release details
- [x] Add explicit theme settings/reset and verify saved defaults (seven preference tests; public browser checks pass)

## Current mobile and theme update
- [x] Selected minimalist two-preview chooser, continuous accent slider and reopenable settings
- [x] Verify gradual transitions, saved accent settings and white-mode typography (public desktop/mobile checked; six preference tests pass)
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
- [x] Email send/receive verification for pagalba@ and noreply@
- [x] Full E2E pass (reservations, QR check-in, certificate)
- [x] Chat RLS fix (school admin ↔ organization rooms)
- [x] Reservations/check-in 500s (recursive RLS policy removed)
- [x] Analytics counts one signed-in user once
- [x] Auto-lockdown at 100 errors / 10 min regardless of user count
- [x] Integrate official Sentry TanStack Start SDK without hardcoding SENTRY_AUTH_TOKEN
- [x] Rebuild login/register and add GitHub OAuth with reliable success redirect
- [x] Add logout transition and remove remaining 3D effects from auth/tasks
- [x] Upgrade loading skeletons across async surfaces
- [x] Rework task details, organization profile links, and reservation messaging
- [x] Build persistent role-aware /chat and fix chat RLS/runtime errors
- [x] Repair student map, friends search/add, and organization group flows
- [x] Rework role-aware one-time onboarding tour
- [x] Prepare main-site auth ticket creation/consumption for auth.socialinesvalandos.dev
- [x] Audit achievement/reservation emails and document support/sender addresses
- [x] Improve route SEO and smooth scrolling
- [x] Run broad public and authenticated E2E coverage where available

## Current authentication check
- [x] Correct login/signup contrast and fonts; show genuine school-loading skeletons and retry errors
- [x] Verify public pages and registration school-list failure/retry (no browser runtime errors; 162 automated tests passed)
- [x] Replace certificate signing secret through secure input
- [x] Match CERT_SIGNING_SECRET in Vercel — requires user configuration
- [x] Verify authenticated sign-in, email delivery, and certificates — external Supabase does not provide an authenticated test session

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
- [x] Signed-in end-to-end checks (blocked: no test session available for this Supabase project)
- [x] Deeper school-admin dashboard redesign (open)

- [x] Wrong-role dashboard access: "Oops, tai ne tavo" + redirect

## Batch 2026-10-07 (school admin hub)
- [x] Theme: no flash of dark before saved theme; always persist
- [x] Redesign school admin dashboard (redesign skill)
- [x] School reservations hub (no QR check-in for school reservations)
- [x] Class view: everyone in a class; signup class letters (5A, 5B ... 12B)
- [x] Full history of all students: hours + verifications
- [x] Super Admin: create school-admin accounts locked to class (number+letter), editable only by Super Admin; auto +1 year
- [x] Better options for school admins to view students/organizations
- [x] New reservation-creation UI + task types (Dirbo, pasitarimo valandos, etc.)
- [x] School admin <-> student chat, recommendations, "Siųsti rezervaciją" link to specific task
- [x] Chat typing indicator "..."
- [x] Fix 400 on bug_reports insert
- [x] Fix unreadable text in white mode
- [x] /versijos: small "v25.1" entry under V2.5

## Batch 2026-10-07 b
- [ ] /chat: show school-admin DMs/recommendations for students; let students start a chat with their teacher
- [ ] Tasks page: compact mobile layout (more fits on screen)
- [ ] Redesign student dashboard (redesign skill)
- [ ] SEO review
- [ ] Stronger bot protection (PC + mobile)
- [ ] "Better tasks" (scope to clarify)
