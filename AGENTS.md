<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Use the official Sentry TanStack Start SDK at client, router, middleware, and server-entry boundaries; this preserves full-stack traces and private source-map uploads.
- Chat uses shared MessageComposer and atomic participant-scoped RPCs; merged room aliases preserve links/history, preventing duplicates without mixing audiences.
- Optional reservation times are normalized to null through reservation-time helpers; displays handle missing times without inventing an arrival interval.
- Check-in presentation uses a stable canvas and authenticated server-issued tokens, refreshed while visible; rotating QR content never persists in browser storage.
- Certificates recompute snapshot hashes before HMAC verification, support legacy/key rotation and server-stamped approvers to detect altered history.
- PDF generation and its libraries load only on download, paginate every activity and provide a clickable verification link; this keeps the student page light and exports complete history.
- Certificate PDFs embed a bundled full-character sans-serif font; this preserves Lithuanian names without a remote font dependency.
- Auxiliary root diagnostic widgets load behind independent Suspense boundaries; this keeps their loading from delaying the primary page.
- Cities in src/lib/cities.ts must match DB `tg_validate_city` to prevent drift.
- Privileged profile fields (role, school, hours, assigned classes) change only via service role or SECURITY DEFINER functions; the `tg_profiles_guard_privileged` trigger blocks direct client writes to stop self-promotion.
- The security gateway does not render the app while blocked; hiding the overlay must never expose content.
- Soci Guard verifies bounded monotonic holds server-side; provide mouse guidance and keyboard/touch alternatives. Client telemetry is advisory, never authorization.
- Maps use Leaflet with Mapbox raster tiles when VITE_MAPBOX_PUBLIC_TOKEN (pk.) is set, else OSM tiles; keeps one map component for both.
- ThemeProvider owns theme/accent within the security gateway; one numeric CSS token synchronizes previews and controls without exposing blocked content.
- Mobile PageShell navigation uses a focus-trapped left Sheet instead of a bottom tab bar; shared role-aware links avoid two competing navigation systems.
- Public school reads filter only active schools; administrator checks stay in authenticated-only policies so anonymous registration never evaluates restricted role functions.
- LockdownGate wraps content and fails closed on unknown settings; a session-free public status client avoids auth refresh delays, and theme-aware procedural eclipse motion never changes enforcement.
- Public lockdown checks try the public RPC before the server fallback, reject malformed states and retry transient failures; administrative entry stays available in unknown and blocked states.
- Scheduled health decisions persist consecutive results and exact technical-lock provenance; only that matching technical lock can recover after healthy scans, while manual/security locks never auto-clear.
- School-made reservations use reservations.source='school' with requires_checkin=false and are created/completed only via SECURITY DEFINER RPCs (school_create_reservations, school_complete_reservation) gated by school_admin_can_manage(); keeps QR-free flow from bypassing class scoping.
- Student reservation presentation uses shared source-aware rules; school reservations stay active until teacher completion and omit organization confirmation, QR and group-invite actions.
- Class letters use profiles.class_letter/assigned_letter; class_year stays canonical for promotion. Student class, letter and required hours derive only from the protected school_class_codes row server-side; assigning classes to a school admin auto-creates missing codes.
- Theme is applied by an inline script in the root <head> before paint; ThemeProvider must read the on-screen class when saving so a stale state can't overwrite the choice.
- Bug reporting uses a shared portaled, viewport-aware dialog with opt-in bounded JPEG upload; success requires a saved report so the admin board stays the source of truth.
- Visitor error boundaries share a presentation-only incident frame with isolated theme-aware tokens; recovery, logging and routing remain at their existing boundaries.
- The public homepage presents the primary action immediately and keeps its process animation user-triggered; anonymous visitors do not receive release or guide overlays.
- Homepage title motion is finite and reduced-motion aware; the heart button is separate from the home link, and elegant texture is layered on PageShell so opaque root surfaces cannot hide it.
- Group reservation participant rows change only through status (invitee accepts/declines, owner/org removes); the tg_participants_guard trigger blocks client writes to check-in and hours fields, so friends cannot self-check-in.
- Vite server.fs.allow includes real node_modules because sandbox dependencies are symlinked.
- Destructive admin actions and temporary signup options require external licence-confirmed tickets. Main site never accepts the key; signup grants stay in page memory and every privileged call rechecks them.
- Subdirectories may have their own AGENTS.md (e.g. src/components/AGENTS.md); read it before changing files there.
- Soci Guard challenges are single-use: server persists nonces in gate_nonces, burns after 5 failed tries, and decides step count from server signals only (client risk input is advisory).
- Soci Guard keeps transport/configuration errors distinct from failed verification; retry never grants access and reCAPTCHA never silently becomes a math challenge after a configuration request fails.
- Signup confirmation emails use admin generateLink + Resend (token_hash link to /verify-email); Supabase's built-in mailer only reaches team members.
- Authentication errors stay in a shared persistent inline feedback surface with localized validation and recovery links; transient toasts must not replace form errors.
- Auth initialization reads profiles through RLS before repairing missing rows, deduplicates concurrent reads and schedules work outside auth callbacks; bounded loading prevents auth-lock deadlocks without granting access on failure.
- Session-function middleware replaces the generated attacher to keep public counters independent of preview session storage; protected calls still attach tokens and use server authorization. Login distinguishes credential rejection from profile-loading failure and never invents roles.

