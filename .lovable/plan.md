# Reliability, authentication, messaging, and core-flow rebuild

## Goal
Stabilize the existing platform before expanding it: add official Sentry monitoring, rebuild authentication around reliable OAuth onboarding, repair messaging/maps/friends/groups, improve tasks and loading states, then verify the complete experience.

## 1. Monitoring and error capture
- Install and configure the official Sentry TanStack Start SDK with the supplied public DSN.
- Add client replay with all text masked and media blocked, client/router tracing, server request/function middleware, server fetch wrapping, and reporting from existing router error screens.
- Add the Vite integration last in the plugin list so production source maps upload using `process.env.SENTRY_AUTH_TOKEN`; never put that token in source code.
- Preserve the existing custom error pages and deployment output.

## 2. Authentication and account setup
- Rebuild login and registration as a clean, responsive two-panel experience inspired by the supplied composition, while retaining this product’s own colors, typography, Lithuanian copy, and branding.
- Remove remaining 3D/tilt effects. Use restrained transitions when switching between login, student registration, and organization-request states.
- Add GitHub beside Google and Discord on login and student registration.
- Route every OAuth result through the existing public callback and a short Lithuanian success state before the correct dashboard.
- Require OAuth-created students to finish school, class, required-hours, and school-code setup before dashboard access.
- Add a brief logout transition while preserving secure cache/session cleanup.

## 3. Persistent chat page and messaging repairs
- Add an authenticated `/chat` page for:
  - student ↔ organization conversations connected to reservations;
  - school administrator ↔ organization conversations.
- Keep messages for 12 days, then delete them automatically as already specified.
- Add a conversation list, latest-message preview, thread view, loading/empty/error states, realtime updates, and organization/student profile context.
- Repair room creation and membership rules without permitting unrelated users to read messages.
- Do not merge friend direct messages into this new page.

## 4. Tasks and reservations
- Remove remaining 3D motion from `/tasks`.
- Open task details before reservation: full description, date/time, place, remaining spots, organization identity, organization-profile link, and reservation-related messaging.
- Use compact dialog/drawer behavior appropriate to desktop and mobile.
- Ensure expired or unavailable tasks are visibly disabled and cannot be reserved.
- Match task loading placeholders to the final card/detail/map layout.

## 5. Broken core flows
- Repair map markers so tasks and organizations render as interactive pins; remove reliance on remote marker assets and add a proper map loading state.
- Fix friend search/request profile visibility while keeping friend messaging separate from the new organization chat.
- Repair accepted group-reservation participants so they see the reservation and its relevant communication.
- Confirm reservation/group RLS remains non-recursive and user-scoped.

## 6. Loading and onboarding experience
- Standardize faster, polished skeletons across dashboards, lists, tables, profiles, tasks, chat, maps, and asynchronous dialogs; only show them where real data is loading.
- Rework the role-specific welcome tour into a skippable spotlight tour with a dimmed page and clear outlined focus around the feature being described.
- Store completion per account role and device so it does not repeat for the same role on the same device.

## 7. Email and mediator readiness
- Audit all current Resend/Supabase email paths, especially welcome, reservation status, confirmed hours, achievements, certificates, organization invitations, and password recovery.
- Add missing transactional notifications where the existing workflow requires them, without blocking user actions if delivery fails.
- Document that support is handled at `pagalba@socialinesvalandos.dev` and outgoing mail uses `socialinesvalandos@jumpsipidy.online`.
- Prepare secure main-site ticket creation/consumption for `auth.socialinesvalandos.dev` using the existing tables, 10-minute expiry, hashed nonce, origin/return allowlists, atomic one-time consumption, and audit events. Password changes remain in this app and do not use the mediator.

## 8. SEO, navigation, and verification
- Keep global smooth scrolling while respecting reduced-motion preferences.
- Audit every content route for unique title, description, Open Graph title/description, canonical URL where appropriate, and noindex on private/auth pages.
- Update sitemap/robots only for public pages and add task/organization structured data where real public content supports it.
- Run TypeScript checks, unit tests, Supabase policy checks, public Playwright checks, and authenticated tests that are possible with the external Supabase setup.
- Verify desktop and mobile login/register, OAuth callback, logout, tasks/details/reservation, chat, maps, friends/groups, onboarding, and error reporting. Clearly report any authenticated flow that cannot be exercised without an available test session.

## Technical details
- Use the existing TanStack Router, Supabase clients, semantic design tokens, shared controls, and server-function boundaries.
- Database changes will be migrations with explicit grants, RLS, security-definer functions with restricted execution, indexes, and 12-day purge behavior.
- New private pages live under the integration-managed authenticated route gate; public OAuth callback and password recovery stay outside it.
- The Sentry auth token must be configured in Vercel Project Settings → Environment Variables as `SENTRY_AUTH_TOKEN` for Production and Preview. It is read only during the build.
