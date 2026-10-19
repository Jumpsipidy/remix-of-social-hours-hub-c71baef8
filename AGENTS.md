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

- Human chat uses a shared multiline MessageComposer and viewport-aware Radix dialogs; shared keyboard geometry keeps sending controls visible on phones.
- Check-in presentation uses a stable canvas and authenticated server-issued tokens, refreshed while visible; rotating QR content never persists in browser storage.
- Certificate verification recomputes the signed snapshot hash before HMAC verification, supports legacy snapshots and key rotation, and uses server-stamped approval identities; this detects altered history without inventing older approvers.
- PDF generation and its libraries load only on download, paginate every activity and provide a clickable verification link; this keeps the student page light and exports complete history.
- Certificate PDFs embed a bundled full-character sans-serif font; this preserves Lithuanian names without a remote font dependency.
- Auxiliary root diagnostic widgets load behind independent Suspense boundaries; this keeps their loading from delaying the primary page.
- City values live in src/lib/cities.ts and must match the DB `tg_validate_city` trigger; one list avoids filter/DB drift.
- Privileged profile fields (role, school, hours, assigned classes) change only via service role or SECURITY DEFINER functions; the `tg_profiles_guard_privileged` trigger blocks direct client writes to stop self-promotion.
- The security gateway does not render the app while blocked; hiding the overlay must never expose content.
- Soci Guard verifies bounded, monotonic hold samples on the server; mouse guidance and keyboard/touch alternatives avoid treating stationary assistive input as automation. Client telemetry remains advisory, not an authorization boundary.
- Maps use Leaflet with Mapbox raster tiles when VITE_MAPBOX_PUBLIC_TOKEN (pk.) is set, else OSM tiles; keeps one map component for both.
- ThemeProvider owns device-level theme and continuous accent state inside the security gateway, animating a global numeric CSS tuning token; one owner synchronizes previews, settings and controls without exposing blocked content.
- Mobile PageShell navigation uses a focus-trapped left Sheet instead of a bottom tab bar; shared role-aware links avoid two competing navigation systems.
- Public school reads filter only active schools; administrator checks stay in authenticated-only policies so anonymous registration never evaluates restricted role functions.
- LockdownGate wraps content, fails closed on unknown settings and never auto-unlocks; static isolated tokens follow theme without changing enforcement.
- School-made reservations use reservations.source='school' with requires_checkin=false and are created/completed only via SECURITY DEFINER RPCs (school_create_reservations, school_complete_reservation) gated by school_admin_can_manage(); keeps QR-free flow from bypassing class scoping.
- Class letters use profiles.class_letter/assigned_letter; class_year stays canonical for promotion. Protected school_class_codes derive signup grade/letter server-side; never trust client selection.
- Theme is applied by an inline script in the root <head> before paint; ThemeProvider must read the on-screen class when saving so a stale state can't overwrite the choice.
- Bug reporting uses a shared portaled, viewport-aware dialog with opt-in bounded JPEG capture/upload; success requires a saved report rather than an alert-only response so the administrator's board remains the source of truth.

- Visitor error boundaries share a presentation-only incident frame with isolated theme-aware tokens; recovery, logging and routing remain at their existing boundaries.
- The public homepage presents the primary action immediately and keeps its process animation user-triggered; anonymous visitors do not receive release or guide overlays.
- Group reservation participant rows change only through status (invitee accepts/declines, owner/org removes); the tg_participants_guard trigger blocks client writes to check-in and hours fields, so friends cannot self-check-in.
- Vite dev allows the real node_modules path in server.fs.allow because the sandbox symlinks node_modules outside the project root.
- Destructive admin actions and temporary signup options require external licence-confirmed tickets. Main site never accepts the key; signup grants stay in page memory and every privileged call rechecks them.

- Subdirectories may have their own AGENTS.md (e.g. src/components/AGENTS.md); read it before changing files there.