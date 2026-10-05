# Big overhaul — staged plan

This request has about 15 large features. I'll build them in 5 phases. After each phase I'll test it and you can check it in the preview.

## Phase 1 — Quick wins and safety
- Super Admin page: a "Siųsti testinę klaidą" button that sends a real error to Sentry and shows its incident ID.
- Only you (Super Admin) can create school-admin accounts. Self-signup as a school admin is blocked, both in the app and in the database.
- Super Admin school-admin manager: create an account, pick its school, edit existing accounts (school, classes), select several classes or all of them, and turn on automatic school-year renewal.
- Certificates: check signing, the QR code on the PDF, the public /verify page and revocation, and block tampered or forged codes.

## Phase 2 — /tasks and cities
- New city field on tasks and reservations, with three options: Šeduva, Radviliškis, Šiauliai.
- /tasks filters: city, organization (searchable), date and free spots. The filters are saved in the page address so a filtered link can be shared.
- Map: switch to Mapbox using your Vercel token (`VITE_MAPBOX_PUBLIC_TOKEN`). If the token is missing, the free map is used instead.
- Clicking a task opens a details popup: info, the organization's profile, and buttons to message, reserve, or invite a friend.

## Phase 3 — Reservations, messages and /chat
- New popups for an organization's "Sukurti rezervaciją" and a student's "Pasiūlyti rezervaciją". Both include a city, details and a message to the other side.
- That message starts a /chat conversation. The school admin can read conversations that involve their students.
- Organizations get bulk actions: select several requests, then accept or decline them all at once.
- Full /chat page: conversation list, unread counts, history kept for 12 days, live updates.
- Notifications are actually sent, both in the app and by email, for new requests, approvals, declines, new messages and confirmed hours.

## Phase 4 — Friends and going together
- Easy friend invites: search by name or share an invite link or code.
- "Eikime kartu" (let's go together): invite friends to the same reservation. Both of you get check-in codes and hours, since you will both be there in person.

## Phase 5 — Polish and tests
- Login and signup: a smoother switch animation between the two.
- Forgot password: animations for each step (sending, code entry, success).
- Nicer skeleton loaders everywhere, with a shimmer effect and layouts that match the real content.
- School-admin dashboard overhaul: overview, classes, students, messages and certificates.
- Full automated tests for every flow, run on the public pages. Signed-in flows can't be tested from my side.

## Technical notes
- New database fields: `city` on tasks and reservations (validated by a trigger), an auto-renew flag for school admins, a conversation list function and unread tracking for chat.
- Creating school admins runs on the server with a Super Admin role check. The profile trigger is changed so a signup can no longer set the role to `school_admin`.
- Mapbox is loaded in the browser only.

## What I need from you
- Make sure `VITE_MAPBOX_PUBLIC_TOKEN` (your Mapbox token that starts with pk.) is set in Vercel. If yours has a different name, tell me what it is.
