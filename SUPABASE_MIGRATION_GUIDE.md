# Move this app from Lovable-managed backend to your own Supabase

This is the safe path: first copy the database, then switch Vercel to the new Supabase project. Do **not** delete the old backend until the new one works.

## 1. Create your real Supabase project

1. Go to `supabase.com`.
2. Create a new project.
3. Save the database password somewhere safe.
4. Open the new project dashboard.

## 2. Copy the table structure

This repo already has the database migrations in `supabase/migrations/`.

In your new Supabase dashboard:

1. Open **SQL Editor**.
2. Open each file in `supabase/migrations/`, oldest first.
3. Copy the SQL into Supabase SQL Editor.
4. Click **Run** for each file.

That recreates the tables, functions, policies, and seed rows that are stored in migrations.

## 3. Copy existing table data so you do not lose it

In Lovable:

1. Open **Backend**.
2. Go to **Advanced settings**.
3. Use **Export data**.
4. Download the export when it is ready.

In Supabase:

1. Open your new project.
2. Go to **Table Editor**.
3. For each table, import the matching CSV/data from the export.

Important order if import complains about linked rows:

1. `schools`
2. `profiles`
3. `tasks`
4. `reservations`
5. `chat_rooms`
6. `messages`
7. `organization_access_requests`
8. `bug_reports`

## 4. Auth users are separate from table data

Your table rows can be copied, but login accounts live in Supabase Auth, not normal tables.

Simplest safe option:

1. In Supabase dashboard, go to **Authentication → Users**.
2. Create your admin user manually with your email.
3. Set a temporary password.
4. In **Table Editor → profiles**, make sure your user row has `role = admin`.

If your copied `profiles.id` does not match the new Auth user id, update that one profile row to the new Auth user id before using the app.

For other people, let them create new accounts again or create them from your app admin panel.

## 5. Put the new Supabase keys into Vercel

In Supabase dashboard:

1. Go to **Project Settings → API**.
2. Copy **Project URL**.
3. Copy the **anon/public key**.
4. Copy the **service_role key** and keep it private.

In Vercel:

1. Open your project.
2. Go to **Settings → Environment Variables**.
3. Set these values:

```env
VITE_SUPABASE_URL=your Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=your anon/public key
SUPABASE_URL=your Supabase Project URL
SUPABASE_PUBLISHABLE_KEY=your anon/public key
SUPABASE_SERVICE_ROLE_KEY=your service_role key
```

4. Remove `LOVABLE_API_KEY` if it exists.
5. Redeploy the Vercel app.

## 6. Supabase Auth URL settings

In Supabase dashboard:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel domain, for example:

```txt
https://your-app.vercel.app
```

3. Add these **Redirect URLs**:

```txt
https://your-app.vercel.app/**
http://localhost:8080/**
http://localhost:5173/**
```

Password reset uses:

```txt
https://your-app.vercel.app/update-password
```

## 7. Add Google login normally in real Supabase

### A. In Google Cloud

1. Go to `console.cloud.google.com`.
2. Pick or create a project.
3. Go to **APIs & Services → OAuth consent screen**.
4. Choose **External**.
5. App name: `Socialinės Valandos`.
6. User support email: your email.
7. Developer contact email: your email.
8. Add scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
9. Save.
10. Go to **APIs & Services → Credentials**.
11. Click **Create credentials → OAuth client ID**.
12. Application type: **Web application**.
13. Authorized JavaScript origins:

```txt
https://your-app.vercel.app
http://localhost:8080
http://localhost:5173
```

14. Authorized redirect URI:

```txt
https://YOUR-SUPABASE-PROJECT-REF.supabase.co/auth/v1/callback
```

You get `YOUR-SUPABASE-PROJECT-REF` from your Supabase project URL. Example: if the URL is `https://abc123.supabase.co`, the ref is `abc123`.

15. Copy the Google **Client ID** and **Client Secret**.

### B. In Supabase

1. Go to **Authentication → Providers**.
2. Open **Google**.
3. Enable it.
4. Paste the Google Client ID.
5. Paste the Google Client Secret.
6. Save.

## 8. Turn on email/password and password reset

In Supabase:

1. Go to **Authentication → Providers → Email**.
2. Enable Email provider.
3. Keep password signups enabled if students can register themselves.
4. For real password-reset emails, configure SMTP or a custom email provider in Supabase.

If SMTP/email sending is not configured, the app can request a reset, but users may not receive the email.

## 9. Test before deleting anything

Test this order:

1. Open Vercel app.
2. Create a student account.
3. Log out.
4. Log in with email/password.
5. Request forgot password.
6. Click reset email link and set a new password.
7. Log in with Google.
8. Log in as admin.
9. Create an organization/school admin account from admin panel.

Only after this works should you stop using the Lovable-managed backend.
