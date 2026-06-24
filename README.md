cat > /mnt/user-data/outputs/README.md << 'READMEEOF'
<div align="center">

<h1>⚡ CivicLog — Social Hours Tracker</h1>

<p><em>ok so basically this is the app that makes it actually impossible to lie about your community service hours. built by an idiot, works like a genius.</em></p>

[![Created by idiot](https://img.shields.io/badge/Created%20by-idiot-ff4d4d?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Jumpsipidy)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/UI-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Tooling-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

[**see it live**](https://github.com/Jumpsipidy/spark-hours) · [**something broke lol**](https://github.com/Jumpsipidy/spark-hours/issues) · [**cool idea? drop it**](https://github.com/Jumpsipidy/spark-hours/issues)

</div>

---

<!-- ═══════════════════════════════════════════════════════════ -->
<!--  GIF #1 — drop your main demo gif right here bestie        -->
<!--  upload gif to a github issue → copy the url → paste below -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div align="center">
<img src="[https://placehold.co/860x460/0f172a/3b82f6?text=▶+main+demo+goes+here+%28drop+ur+gif%29](https://github.com/Jumpsipidy/spark-hours/issues/1#issue-4736994448)" width="860" alt="main demo gif" />
</div>

---

## 📋 Table of Contents

- [what even is this](#-what-even-is-this)
- [the roles & how they work](#-the-roles--how-they-work)
- [the nerdy tech stuff](#-the-nerdy-tech-stuff)
  - [database security (rls)](#-database-security-rls)
  - [chat that deletes itself](#-chat-that-deletes-itself)
  - [booking popup thing](#-booking-popup-thing)
- [how to run it yourself](#-how-to-run-it-yourself)
- [folder structure](#-folder-structure)
- [tech stack](#-tech-stack)
- [security stuff](#-security-stuff)
- [wanna contribute?](#-wanna-contribute)

---

## 🧠 what even is this

yo so basically schools make students do mandatory community/volunteer hours right. and people lie about it. constantly. so i built this.

CivicLog is a **full-stack multi-role web app** where:
- 🎓 **students** book real slots at real orgs
- 🏢 **organizations** confirm you actually showed up
- 🛡️ **school admins** audit everything
- 👑 **super admins** run the whole thing

no self-reporting. no "trust me bro" hours. no faking it. the database literally won't let you.

> built from scratch (by [idiot](https://github.com/Jumpsipidy)) using React + Supabase. it goes hard ngl

<!-- ═══════════════════════════════════════════════════════════ -->
<!--  GIF #2 — put a gif here showing off the student dashboard  -->
<!--  or like the main vibe of the app after the intro           -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div align="center">
<br/>
<img src="https://placehold.co/860x460/0f172a/22c55e?text=▶+student+dashboard+vibe+gif+here" width="860" alt="student dashboard demo" />
<br/>
</div>

---

## 🏗️ the roles & how they work

ok so the whole thing runs on a **4-role trust chain** and no role can fake its way past the others. here's the flow:

```
╔═══════════════════════════════════════════════════════════════════╗
║                     the CivicLog trust chain                      ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   ┌──────────┐   (1) books slot    ┌─────────────────┐           ║
║   │ STUDENT  │ ──────────────────► │  ORGANIZATION   │           ║
║   └──────────┘                     └────────┬────────┘           ║
║        ▲                                    │                     ║
║        │  (3) hours get credited            │ (2) confirms        ║
║        │                                    │     u showed up     ║
║        │                           ┌────────▼────────┐           ║
║        └────────────────────────── │  Hours Log (DB) │           ║
║                                    └────────┬────────┘           ║
║                                             │                     ║
║                                    ┌────────▼────────┐           ║
║                                    │  SCHOOL ADMIN   │ (audits)  ║
║                                    └─────────────────┘           ║
║                                                                   ║
║                              ┌──────────────┐                    ║
║                              │  SUPER ADMIN │ ◄── god mode fr    ║
║                              └──────────────┘                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

| role | what they can do | how scamming is blocked |
|------|-----------------|------------------------|
| 🎓 **student** | browse & reserve slots · check their hour logs · chat with orgs | literally cannot self-report hours. zero. needs org confirmation every time |
| 🏢 **organization** | post volunteer slots · confirm attendance · flag disputes | RLS makes it impossible to confirm hours on someone else's slots |
| 🛡️ **school admin** | see all student hours · audit everything · flag sus activity | read-only. can't touch any records. just watches 👀 |
| 👑 **super admin** | full control — users, orgs, settings, everything | all actions get logged permanently. no sneaky stuff |

hours only get credited when **all 3 of these are true simultaneously:**

1. ✅ student has a valid reservation for that specific slot
2. ✅ the org that owns the slot manually confirms attendance
3. ✅ supabase RLS validates the write server-side before anything hits the db

**none of this runs in the frontend btw.** all of it happens in the database. the ui is basically just a pretty wrapper.

---

## ⚙️ the nerdy tech stuff

### 🔐 database security (rls)

every single table has PostgreSQL Row Level Security on it. not middleware. not route guards. not vibes. the **actual database** decides who gets to read and write what — and it does not care about your feelings.

```sql
-- students can only see their own hours. not others. just theirs.
CREATE POLICY "students_own_hours"
ON public.hour_records
FOR SELECT
USING (auth.uid() = student_id);

-- orgs can only confirm hours on slots they actually created
CREATE POLICY "org_confirms_own_slots"
ON public.hour_records
FOR UPDATE
USING (
  auth.uid() = (
    SELECT owner_id FROM slots WHERE id = hour_records.slot_id
  )
);

-- admins get to see everything but can't touch anything
CREATE POLICY "admin_read_all_hours"
ON public.hour_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('school_admin', 'super_admin')
  )
);
```

someone hacks the frontend? cool, the db still says no. someone forges a JWT? still no. someone begs really nicely? also no.

---

### 🗑️ chat that deletes itself

the live chat is for **coordination, not receipts.** messages auto-delete after 12 days using a `pg_cron` job that runs inside supabase itself. no lambda. no extra services. just a lil database cron that cleans up after itself every night.

**why 12 days?** long enough to finish any booking conversation. short enough to keep storage costs at basically zero forever.

```sql
-- runs at 3am UTC every day. zero maintenance. just vibes.
SELECT cron.schedule(
  'purge-expired-chat-messages',
  '0 3 * * *',
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - INTERVAL '12 days';
  $$
);
```

gone means **gone** — no archive, no soft delete, no recovery. users see a little warning banner before they send anything so they know what's up.

---

### 📅 booking popup thing

the slot reservation uses a modal popup flow that:
- grabs **live availability** every time you open it (no stale data, no lies)
- catches double-booking conflicts on the client before even hitting the db
- writes to supabase with **optimistic UI** so it feels instant
- has a database unique constraint as the final backup in case anything slips through

fully keyboard accessible too bc accessibility matters even when you're a one-person dev team 🫡

---

## 🚀 how to run it yourself

### prerequisites

| thing you need | version | where to get it |
|---------------|---------|----------------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| npm | v9+ | comes with node |
| Git | anything | [git-scm.com](https://git-scm.com/) |
| Supabase account | free tier works | [supabase.com](https://supabase.com/) |

---

### installation

**step 1 — clone it**

```bash
git clone https://github.com/Jumpsipidy/spark-hours.git
cd spark-hours
```

**step 2 — install the stuff**

```bash
npm install
```

**step 3 — set up your env vars**

```bash
cp .env.example .env
```

open `.env` and paste your supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> 📍 both of these live in your supabase dashboard under **Settings → API → Project URL & API Keys**

> ⚠️ `.env` is already gitignored. do not commit it. please.

**step 4 — run the migrations**

if you have supabase CLI:
```bash
npx supabase db push
```

or go to your supabase SQL editor and run the files in `/supabase/migrations/` one by one in order.

**step 5 — turn on the chat cleanup (one time thing)**

paste this in your supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-expired-chat-messages',
  '0 3 * * *',
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - INTERVAL '12 days';
  $$
);
```

<!-- ═══════════════════════════════════════════════════════════ -->
<!--  GIF #3 — show the install/setup flow or the app booting   -->
<!--  up locally. shows people it actually works lol             -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div align="center">
<br/>
<img src="https://placehold.co/860x460/0f172a/a855f7?text=▶+local+dev+server+booting+up+gif+here" width="860" alt="local setup demo" />
<br/>
</div>

**step 6 — actually run it**

```bash
npm run dev
```

go to [http://localhost:5173](http://localhost:5173) and you're in. that's it. that's literally it.

---

## 📁 folder structure

```
spark-hours/
├── src/
│   ├── components/          # all the ui pieces
│   │   ├── booking/         # the reservation popup system
│   │   ├── chat/            # live chat stuff
│   │   └── dashboard/       # the different role dashboards
│   ├── pages/               # actual routes/pages
│   ├── hooks/               # custom hooks
│   │   ├── useAuth.ts       # auth + role detection
│   │   └── useSlots.ts      # slot fetching + booking logic
│   ├── lib/
│   │   └── supabase.ts      # supabase client
│   └── types/               # typescript types & enums
├── supabase/
│   ├── migrations/          # sql files — run these in order
│   └── functions/           # edge functions if any
├── public/                  # static assets
├── .env.example             # copy this → rename to .env
├── vite.config.ts
└── README.md                # ur reading it rn
```

---

## 🧰 tech stack

| layer | tech | why tho |
|-------|------|---------|
| **frontend** | React 18 | goated. component model hits different |
| **build** | Vite | so fast it's actually insane |
| **backend** | Supabase | auth + db + realtime all in one, no cap |
| **database** | PostgreSQL | relational, reliable, has pg_cron built in |
| **auth** | Supabase Auth (JWT) | multi-role sessions, zero custom auth code written by me |
| **realtime** | Supabase Realtime | live chat via websocket, just works |
| **scheduling** | pg_cron | server-side cron. no lambda. no aws. just sql. |
| **styling** | Tailwind CSS | utility classes go brrrr |
| **language** | TypeScript | catches my dumb mistakes before runtime does |

---

## 🛡️ security stuff

| concern | how it's handled |
|---------|-----------------|
| **auth** | supabase auth — JWTs, no custom session code, not my problem |
| **authorization** | PostgreSQL RLS — database level, not app level, cannot be bypassed |
| **role assignment** | protected `user_roles` table — only super admins can write to it |
| **hour records** | append-only for everyone except super admins — no deletes, no edits |
| **chat privacy** | hard deleted after 12 days via pg_cron, no recovery |
| **api abuse** | RLS blocks unauthorized writes even if you have a valid JWT lmaooo |

the vibe is: **trust nobody, verify everything at the db level.**

---

## 🤝 wanna contribute?

yeah go ahead, pr's welcome. open an issue first if it's something big tho so we can talk about it before you spend 3 hours coding something

```bash
# fork the repo then:
git clone https://github.com/YOUR_USERNAME/spark-hours.git
git checkout -b feature/ur-cool-idea
git commit -m "feat: describe what u did"
git push origin feature/ur-cool-idea
# then open a pr and i'll look at it
```

try to use [conventional commits](https://www.conventionalcommits.org/) format for commit messages. makes the history actually readable.

---

<div align="center">

built so nobody can fake their community hours ever again

by [idiot](https://github.com/Jumpsipidy) 🫡

<br/>

[⬆ back to top](#-civiclog--social-hours-tracker)

</div>
READMEEOF
echo "done bestie"
