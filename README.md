<div align="center">

<h1>⚡ CivicLog — Social Hours Tracker</h1>

<p><strong>The zero-tolerance, anti-scam platform that makes mandatory community hours impossible to fake.</strong></p>

[![Created by idiot](https://img.shields.io/badge/Created%20by-idiot-ff4d4d?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Jumpsipidy)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/UI-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Tooling-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

[**View Demo**](https://github.com/Jumpsipidy/spark-hours) · [**Report Bug**](https://github.com/Jumpsipidy/spark-hours/issues) · [**Request Feature**](https://github.com/Jumpsipidy/spark-hours/issues)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Visual Preview](#-visual-preview)
  - [How to Add Your GIFs](#-how-to-add-your-gifs)
- [Core Architecture & User Roles](#-core-architecture--user-roles)
- [Key Technical Highlights](#-key-technical-highlights)
  - [Row Level Security](#-row-level-security-rls)
  - [12-Day Self-Purging Chat](#-12-day-self-purging-chat)
  - [Interactive Booking System](#-interactive-booking-system)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Security Model](#-security-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 About the Project

CivicLog is a **full-stack, multi-role web platform** that eliminates fraud in school community service programs. It connects Students, Organizations, and School Administrators in a cryptographically enforced trust chain — where every hour earned is independently verified, auditable, and tamper-proof.

No self-reporting. No honor system. No fake hours.

> Built from scratch by [idiot](https://github.com/Jumpsipidy) using Supabase + React.

---

## 🎬 Visual Preview

> **Tip:** See [How to Add Your GIFs](#-how-to-add-your-gifs) below to replace the placeholders with your real recordings.

<br/>

<div align="center">

### 🎓 Student Dashboard & Slot Reservation
<!-- ============================================================ -->
<!--  REPLACE THIS IMAGE WITH YOUR GIF — see instructions below  -->
<!-- ============================================================ -->
<img src="https://placehold.co/860x460/0f172a/3b82f6?text=▶+Student+Reservation+Flow" width="860" alt="Student reservation demo" />

<br/><br/>

### 🏢 Organization Hour Verification
<!-- ============================================================ -->
<!--  REPLACE THIS IMAGE WITH YOUR GIF — see instructions below  -->
<!-- ============================================================ -->
<img src="https://placehold.co/860x460/0f172a/3b82f6?text=▶+Organization+Verification+Flow" width="860" alt="Organization verification demo" />

<br/><br/>

### 🛡️ Admin Audit Dashboard
<!-- ============================================================ -->
<!--  REPLACE THIS IMAGE WITH YOUR GIF — see instructions below  -->
<!-- ============================================================ -->
<img src="https://placehold.co/860x460/0f172a/3b82f6?text=▶+Admin+Audit+Dashboard" width="860" alt="Admin audit dashboard demo" />

<br/><br/>

### 💬 Live Chat — Auto-Purge at 12 Days
<!-- ============================================================ -->
<!--  REPLACE THIS IMAGE WITH YOUR GIF — see instructions below  -->
<!-- ============================================================ -->
<img src="https://placehold.co/860x460/0f172a/3b82f6?text=▶+Live+Chat+Auto-Purge+System" width="860" alt="Live chat demo" />

</div>

---

### 🖼️ How to Add Your GIFs

Follow these steps to swap in your real screen recordings:

**Step 1 — Record your screen**

Use any screen recorder that exports `.gif` or `.mp4`. Recommended free tools:
- [LICEcap](https://www.cockos.com/licecap/) (Windows/Mac, exports `.gif` directly)
- [ScreenToGif](https://www.screentogif.com/) (Windows, very clean output)
- [Kap](https://getkap.co/) (Mac)

Keep each recording under **5 MB** for fast loading on GitHub.

**Step 2 — Upload to GitHub (the easy way)**

1. Open any **Issue** in your repo: `https://github.com/Jumpsipidy/spark-hours/issues/new`
2. Drag and drop your `.gif` file into the comment box
3. GitHub will auto-upload it and give you a URL like:
   ```
   https://user-images.githubusercontent.com/YOUR_ID/your-file.gif
   ```
4. Copy that URL — you don't need to submit the issue

**Step 3 — Replace the placeholder in this README**

Find the placeholder `<img>` tag for the section you want to update, e.g.:

```html
<!-- Student Reservation Flow -->
<img src="https://placehold.co/860x460/0f172a/3b82f6?text=▶+Student+Reservation+Flow" width="860" alt="Student reservation demo" />
```

Replace the `src` value with your GitHub-hosted GIF URL:

```html
<!-- Student Reservation Flow -->
<img src="https://user-images.githubusercontent.com/YOUR_ID/reservation-demo.gif" width="860" alt="Student reservation demo" />
```

Repeat for each section. Push to `main` and your README will display live demos.

---

## 🏗️ Core Architecture & User Roles

CivicLog is built on a **4-role verified trust chain**. No role can elevate its own permissions. Every operation is scoped at the database level — the client is completely untrusted.

```
╔═══════════════════════════════════════════════════════════════════╗
║                       CivicLog Trust Chain                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   ┌──────────┐   (1) books slot    ┌─────────────────┐           ║
║   │ STUDENT  │ ──────────────────► │  ORGANIZATION   │           ║
║   └──────────┘                     └────────┬────────┘           ║
║        ▲                                    │                     ║
║        │  (3) hours credited                │ (2) confirms        ║
║        │                                    │     attendance      ║
║        │                           ┌────────▼────────┐           ║
║        └────────────────────────── │  Hours Log (DB) │           ║
║                                    └────────┬────────┘           ║
║                                             │                     ║
║                                    ┌────────▼────────┐           ║
║                                    │  SCHOOL ADMIN   │ (audits)  ║
║                                    └─────────────────┘           ║
║                                                                   ║
║                              ┌──────────────┐                    ║
║                              │  SUPER ADMIN │ ◄── god mode       ║
║                              └──────────────┘                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

| Role | What They Can Do | How Fraud Is Blocked |
|------|-----------------|----------------------|
| 🎓 **Student** | Browse & reserve open slots · View confirmed hour logs · Message orgs via live chat | Cannot self-report hours. All credits require external org confirmation |
| 🏢 **Organization** | Post volunteer slots · Confirm student attendance · Flag disputes | RLS prevents confirming hours on slots they don't own |
| 🛡️ **School Admin** | View all student hours · Audit confirmation history · Flag anomalies | Read-only access — cannot alter any records |
| 👑 **Super Admin** | Full platform control — users, orgs, system health, settings | All actions immutably logged. Separate credential set |

**Hours can only be credited when all three conditions are true:**

1. ✅ A student holds a valid reservation for a specific, real slot
2. ✅ The owning organization explicitly marks attendance for that student
3. ✅ The write passes Supabase RLS policy validation server-side

**Zero of these checks happen in the frontend.** All of them happen in the database.

---

## ⚙️ Key Technical Highlights

### 🔐 Row Level Security (RLS)

Every table is locked down with PostgreSQL Row Level Security — not middleware, not route guards, not frontend checks. The **database itself** enforces who can read and write what. Even a direct API call with a valid JWT cannot bypass it.

```sql
-- Students can only read their own hour records
CREATE POLICY "students_own_hours"
ON public.hour_records
FOR SELECT
USING (auth.uid() = student_id);

-- Organizations can only confirm hours on slots they own
CREATE POLICY "org_confirms_own_slots"
ON public.hour_records
FOR UPDATE
USING (
  auth.uid() = (
    SELECT owner_id FROM slots WHERE id = hour_records.slot_id
  )
);

-- School admins get read-only access to all records
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

If someone tampers with the frontend, constructs a raw request, or intercepts a JWT — the database rejects the operation. No exceptions.

---

### 🗑️ 12-Day Self-Purging Chat

The live chat is built for **coordination, not archiving**. Messages are automatically and permanently deleted after 12 days using a `pg_cron` job scheduled inside Supabase — no Lambda, no third-party scheduler, no extra infrastructure.

**Why 12 days?** Enough time to handle any booking coordination cycle. Short enough to keep storage costs near zero indefinitely.

```sql
-- Runs daily at 03:00 UTC — zero maintenance required
SELECT cron.schedule(
  'purge-expired-chat-messages',
  '0 3 * * *',
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - INTERVAL '12 days';
  $$
);
```

Messages are **permanently removed** — no soft deletes, no archive table, no recoverable state. Users see a banner in the chat UI that informs them of this before they send anything.

---

### 📅 Interactive Booking System

Slot reservations use a **modal popup flow** that:
- Fetches live slot availability on open (no stale data)
- Handles double-booking conflicts client-side with instant feedback
- Writes to Supabase with optimistic UI for snappy UX
- Falls back to a **unique database constraint** as the final double-booking safeguard

The booking popup is fully keyboard-accessible and closes gracefully on escape or outside-click.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed before starting:

| Tool | Version | Link |
|------|---------|------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| npm | v9+ | Comes with Node |
| Git | Any | [git-scm.com](https://git-scm.com/) |
| Supabase account | Free tier OK | [supabase.com](https://supabase.com/) |

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Jumpsipidy/spark-hours.git
cd spark-hours
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up your environment variables**

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> 📍 Find both values in your Supabase dashboard under **Settings → API → Project URL & Project API Keys**

> ⚠️ `.env` is already in `.gitignore`. Never commit it.

**4. Apply database migrations**

*Option A — Supabase CLI (recommended):*
```bash
npx supabase db push
```

*Option B — Manual:*
Open the Supabase SQL Editor in your dashboard and run each file from `/supabase/migrations/` in order.

**5. Enable `pg_cron` for the chat purge job**

In your Supabase SQL Editor, run:

```sql
-- Enable the pg_cron extension (one-time setup)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the 12-day message purge
SELECT cron.schedule(
  'purge-expired-chat-messages',
  '0 3 * * *',
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - INTERVAL '12 days';
  $$
);
```

**6. Start the development server**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Done.

---

## 📁 Project Structure

```
spark-hours/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── booking/         # Slot reservation popup system
│   │   ├── chat/            # Live chat components
│   │   └── dashboard/       # Role-based dashboard views
│   ├── pages/               # Route-level page components
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Auth state + role detection
│   │   └── useSlots.ts      # Slot fetching + booking logic
│   ├── lib/
│   │   └── supabase.ts      # Supabase client instance
│   └── types/               # TypeScript interfaces & enums
├── supabase/
│   ├── migrations/          # SQL migration files (run in order)
│   └── functions/           # Supabase Edge Functions
├── public/                  # Static assets
├── .env.example             # Template — copy to .env
├── vite.config.ts
└── README.md
```

---

## 🧰 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 | Component model, hooks, fast rendering |
| **Build Tool** | Vite | Sub-second HMR, optimized production builds |
| **Backend** | Supabase | Auth + Realtime DB + Storage in one platform |
| **Database** | PostgreSQL | Relational integrity, RLS, pg_cron scheduling |
| **Auth** | Supabase Auth (JWT) | Multi-role sessions, zero custom auth code |
| **Realtime** | Supabase Realtime | Live chat message delivery via WebSocket |
| **Scheduling** | pg_cron | Server-side cron — no external services needed |
| **Styling** | Tailwind CSS | Utility-first, zero dead CSS in production |
| **Language** | TypeScript | Full type safety across frontend and DB types |

---

## 🛡️ Security Model

| Concern | How It's Handled |
|---------|-----------------|
| **Authentication** | Supabase Auth — JWT-based, no custom session logic |
| **Authorization** | PostgreSQL RLS — enforced at the database layer, not the app layer |
| **Role Assignment** | Stored in a protected `user_roles` table — writable only by Super Admins |
| **Hour Records** | Append-only for all non-super roles — no update or delete permitted |
| **Chat Privacy** | Messages permanently purged after 12 days via pg_cron |
| **API Abuse** | RLS blocks all unauthorized writes even from valid JWT holders |

The golden rule: **the client is completely untrusted.** Every sensitive operation is validated server-side before any data is read or written.

---

## 🤝 Contributing

Contributions are welcome. Open an issue first to discuss major changes.

```bash
# 1. Fork the repo & clone your fork
git clone https://github.com/YOUR_USERNAME/spark-hours.git

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then commit
git commit -m "feat: add your feature description"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for full details.

---

<div align="center">

**Built to be trusted. Engineered to be tamper-proof.**

Made with way too much coffee by [idiot](https://github.com/Jumpsipidy)

<br/>

[⬆ Back to top](#-civiclog--social-hours-tracker)

</div>
