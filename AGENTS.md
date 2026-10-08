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

- Authentication pages use scoped sans-serif typography and semantic theme colors; this keeps forms legible without restyling unrelated pages.
- Login/register navigation uses scoped named View Transitions plus the decorative blue sweep; lightweight AuthSkeleton pending views share the page geometry without artificial minimum waits.
- City values live in src/lib/cities.ts and must match the DB `tg_validate_city` trigger; one list avoids filter/DB drift.
- Privileged profile fields (role, school, hours, assigned classes) change only via service role or SECURITY DEFINER functions; the `tg_profiles_guard_privileged` trigger blocks direct client writes to stop self-promotion.
- The security gateway does not render the app while blocked; hiding the overlay must never expose content.
- Maps use Leaflet with Mapbox raster tiles when VITE_MAPBOX_PUBLIC_TOKEN (pk.) is set, else OSM tiles; keeps one map component for both.
- ThemeProvider owns device-level theme and continuous accent state inside the security gateway, animating a global numeric CSS tuning token; one owner synchronizes previews, settings and controls without exposing blocked content.
- Mobile PageShell navigation uses a focus-trapped left Sheet instead of a bottom tab bar; shared role-aware links avoid two competing navigation systems.
- Public school reads filter only active schools; administrator checks stay in authenticated-only policies so anonymous registration never evaluates restricted role functions.
- Lockdown presentation uses isolated semantic tokens and shared accessible dialogs; visitor-state styling cannot alter polling, bypass verification or database lockdown enforcement.
- School-made reservations use reservations.source='school' with requires_checkin=false and are created/completed only via SECURITY DEFINER RPCs (school_create_reservations, school_complete_reservation) gated by school_admin_can_manage(); keeps QR-free flow from bypassing class scoping.
- Class letters live in profiles.class_letter (students) and profiles.assigned_letter (teachers, Super Admin only via tg_profiles_guard_privileged); class_year stays the canonical grade so yearly promotion keeps working.
- Theme is applied by an inline script in the root <head> before paint; ThemeProvider must read the on-screen class when saving so a stale state can't overwrite the choice.
