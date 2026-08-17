# Implementation Plan - SEO, Security, and Bug Fixes

Focus on restoring SEO rankings for Lithuanian keywords, implementing a dynamic security gateway for suspicious activity, and fixing identified dashboard issues.

## User Review Required

> [!IMPORTANT]
> - I will be adding specialized SEO metadata for "socialines valandos" and "centras".
> - The "Saugumo patikra" (Security Gateway) will now only trigger on detected anomalies (e.g., rapid navigation or known bad referrers) rather than for every visitor.

## Proposed Changes

### SEO Optimization
- Enhance `src/routes/index.tsx` and `src/routes/__root.tsx` with targeted Lithuanian keywords and semantic HTML.
- Add JSON-LD structured data for the "Organization" and "SoftwareApplication" to help Google understand the service.
- Optimize header tags (H1-H3) for better keyword density without sacrificing readability.

### Security Gateway (Saugumo patikra)
- Modify `src/components/security-gateway-provider.tsx` to use a heuristic-based trigger.
- Logic: Trigger only if `document.referrer` is suspicious or if the user performs "sketchy" actions (e.g., too many failed attempts or rapid API calls).
- Ensure the reCAPTCHA integration is fully wired to the server-side verification.

### Organization Dashboard & SQL
- Finalize the "Create Reservation" button integration.
- Fix the homepage stats returning "0" by checking the `getPublicStats` implementation and RLS permissions for `supabaseAdmin`.
- Verify student email lifecycle: ensure `Reply-To` is `pagalba@socialinesvalandos.dev` and sender is `noreply@jumpsipidy.online`.

### Bug Fixes
- Investigate the "black page" issue (likely a hydration mismatch or a race condition in the auth provider).
- Add performance logging to identify "ass" performance bottlenecks in the dashboard.

## Technical Details
- **SEO**: Using `tanstack-start` route `head()` function for dynamic metadata.
- **Security**: LocalStorage will track "reputation" to avoid annoying legitimate users.
- **SQL**: Will check `award_reservation_hours` and `public_stats` views in Supabase.
