# CivicLog — Social Hours Tracker

<div align="center">

**The anti-scam platform that makes mandatory community hours actually trustworthy.**

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff6b6b?style=for-the-badge&logo=heart&logoColor=white)](https://lovable.dev)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/UI-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Tooling-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

> CivicLog is a full-stack web platform designed to eliminate fraud in student community service programs. Students book slots, organizations confirm presence, and school admins audit everything — with zero room for fake hours.

---

## 📸 Visual Preview

<div align="center">

### Student Dashboard & Slot Reservation

<!-- Student Reservation Demo GIF -->
<!-- Replace the block below with your demo GIF -->
<img src="https://placehold.co/860x480/0f172a/94a3b8?text=Student+Reservation+Flow+GIF+Here" width="860" alt="Student reservation demo" />

<br/><br/>

### Organization Hour Verification

<!-- Organization Verification Demo GIF -->
<img src="https://placehold.co/860x480/0f172a/94a3b8?text=Organization+Verification+Flow+GIF+Here" width="860" alt="Organization verification demo" />

<br/><br/>

### Admin Audit Dashboard

<!-- Admin Audit Dashboard Demo GIF -->
<img src="https://placehold.co/860x480/0f172a/94a3b8?text=Admin+Audit+Dashboard+GIF+Here" width="860" alt="Admin audit dashboard demo" />

<br/><br/>

### Live Chat (Auto-Purge at 12 Days)

<!-- Live Chat System Demo GIF -->
<img src="https://placehold.co/860x480/0f172a/94a3b8?text=Live+Chat+Auto-Purge+Demo+GIF+Here" width="860" alt="Live chat system demo" />

</div>

---

## 🏗️ Core Architecture & User Roles

CivicLog is built around a **4-role trust model**. Every action in the system is scoped to a role, verified on the backend, and auditable by administrators — making it structurally resistant to fraud.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CivicLog Platform                        │
│                                                                 │
│  ┌──────────┐    books slot    ┌──────────────┐                │
│  │ Student  │ ──────────────► │ Organization │                 │
│  └──────────┘                 └──────┬───────┘                 │
│       ▲                              │ confirms attendance      │
│       │ hours credited               ▼                         │
│       │                     ┌─────────────────┐                │
│       └─────────────────── │  Hours Log (DB)  │                │
│                             └────────┬────────┘                │
│                                      │ audits                  │
│                             ┌────────▼────────┐                │
│                             │  School Admin   │                │
│                             └─────────────────┘                │
│                                                                 │
│                          ┌─────────────┐                       │
│                          │ Super Admin │ ◄── full oversight     │
│                          └─────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

| Role | Access | Anti-Fraud Mechanism |
|------|--------|----------------------|
| **Student** | Browse & reserve available slots, view their confirmed hours log, message organizations via live chat | Cannot self-report hours; all credits require external confirmation |
| **Organization** | Post available volunteer opportunities, confirm student attendance, dispute invalid claims | Cannot confirm hours for slots they didn't create; slot ownership is enforced by RLS |
| **School Admin** | View all students' hours, audit confirmation history, flag anomalies, generate reports | Read-only audit access; cannot modify records, preserving data integrity |
| **Super Admin** | Full platform access — manage users, organizations, settings, and system health | Separate credentials; actions are logged and immutable |

**Fraud is prevented structurally, not by policy.** Hours can only be credited when:
1. A student holds a confirmed reservation for a specific slot
2. The owning organization explicitly marks attendance
3. The record passes Supabase RLS policy checks before being written

No step in this chain can be bypassed by the client.

---

## ⚙️ Key Technical Highlights

### 🔐 Row Level Security (RLS) via Supabase

Every table in CivicLog is protected by Supabase's PostgreSQL Row Level Security policies. Users can only read or write rows that belong to them — enforced at the database level, not the application layer.

```sql
-- Example: Students can only read their own hour records
CREATE POLICY "students_own_hours"
ON public.hour_records
FOR SELECT
USING (auth.uid() = student_id);

-- Example: Organizations can only confirm hours for their own slots
CREATE POLICY "org_confirms_own_slots"
ON public.hour_records
FOR UPDATE
USING (
  auth.uid() = (
    SELECT owner_id FROM slots WHERE id = hour_records.slot_id
  )
);
```

Even if the frontend is compromised or a user crafts a raw API request, the database will reject unauthorized operations.

---

### 🗑️ 12-Day Self-Purging Chat System

The live chat feature is designed with storage efficiency and privacy in mind. Messages are **automatically and permanently deleted after 12 days** using a scheduled `pg_cron` job running directly inside Supabase.

**Why 12 days?** It's long enough for coordination between students and organizations to complete, short enough to prevent unbounded storage growth.

```sql
-- Supabase pg_cron job: runs daily at 03:00 UTC
SELECT cron.schedule(
  'purge-old-chat-messages',
  '0 3 * * *',
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - INTERVAL '12 days';
  $$
);
```

This runs server-side on a schedule — no Lambda, no external cron service, no extra cost. Messages are permanently removed with no soft-delete or archive.

> **Note:** Users are informed at the point of sending that messages are not permanently stored. The chat is designed for coordination, not record-keeping.

---

### 📅 Interactive Booking Popup System

Slot reservations are handled through a modal-based booking flow that fetches live availability, handles conflicts client-side, and writes to Supabase with optimistic UI updates. Conflicts (e.g., double-booking) are caught by a unique constraint at the database level as a final safeguard.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com) project (free tier works)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/civiclog.git
cd civiclog
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Open `.env` and set the following:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

You can find both values in your Supabase project under:
**Settings → API → Project URL & Project API Keys**

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

### 4. Apply Database Migrations

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or manually run the SQL files found in `/supabase/migrations` via the Supabase SQL editor in your dashboard.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | [Lovable](https://lovable.dev) + React | UI scaffolding, component logic, routing |
| **Build Tool** | [Vite](https://vitejs.dev) | Fast dev server & production bundler |
| **Backend** | [Supabase](https://supabase.com) | Auth, realtime DB, storage, edge functions |
| **Database** | PostgreSQL (via Supabase) | Relational data, RLS policies, constraints |
| **Scheduling** | `pg_cron` (Supabase extension) | Automated 12-day chat message purge |
| **Auth** | Supabase Auth (JWT) | Multi-role authentication & session management |
| **Realtime** | Supabase Realtime | Live chat message delivery |
| **Styling** | Tailwind CSS | Utility-first responsive design |

---

## 📁 Project Structure

```
civiclog/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route-level page components
│   ├── hooks/             # Custom React hooks (auth, data fetching)
│   ├── lib/               # Supabase client, utilities
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── migrations/        # SQL migration files
│   └── functions/         # Supabase Edge Functions (if any)
├── public/                # Static assets
├── .env.example           # Environment variable template
└── vite.config.ts
```

---

## 🛡️ Security Model Summary

- **Authentication** is handled entirely by Supabase Auth — no custom auth logic
- **Authorization** is enforced by PostgreSQL RLS — not middleware or application checks
- **Role assignment** is stored in a protected `user_roles` table, writeable only by Super Admins
- **Audit trail** is append-only for hour records — no deletes permitted by any non-super role
- **Chat messages** are the only data that is scheduled for deletion, and only after 12 days

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

Built with purpose. Designed to be trusted.

**[Live Demo](#)** · **[Report a Bug](../../issues)** · **[Request a Feature](../../issues)**

</div>
