# Plan: SEO, Security & Performance Overhaul

Improve SEO ranking for "socialinesvalandos.dev", enhance cookie compliance, verify email/incident flows, and test organization features.

## SEO Enhancements
- Update `src/routes/index.tsx` and `src/routes/__root.tsx` with more targeted keywords ("socialinių valandų centras", "savanorystės sistema").
- Add descriptive `alt` text to images.
- Ensure semantic HTML (H1/H2 hierarchy).
- Improve performance by lazy loading non-critical components.

## Security & Privacy
- Audit `src/components/cookie-consent.tsx` for GDPR parity (Atmesti/Sutikti visibility).
- Implement "Sketchy link" detection: if a user visits via a known bad referral or high-risk pattern, trigger a mandatory Captcha gateway before showing content.
- Ensure incorrect password attempts trigger activity logging and potential Captcha requirement.

## Email & Incident Flows
- Verify `SC-######` code lookup logic in `src/lib/incident-lookup.functions.ts`.
- Ensure student emails for completions/signups use `noreply@jumpsipidy.online` with a `Reply-To` set to `pagalba@socialinesvalandos.dev`.
- Implement automatic mail forwarding request logic if a user replies to `noreply`.

## Feature Verification
- Fix the "black page" bug (likely caused by route transitions or auth state flickering).
- Verify the "Create Reservation" button in the Organization dashboard.
- Test the full lifecycle: Student creates reservation -> Org approves -> Student checks in -> Org confirms -> Student receives email.

## Technical Details
- Use `insertActivityLogRow` for security events.
- Update `getPublicStats` to ensure real data is reflected on the homepage.
- Use `framer-motion` for smooth UI transitions to prevent "black flashes".
- Verify reCAPTCHA configuration and math fallback logic.
