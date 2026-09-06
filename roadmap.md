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
