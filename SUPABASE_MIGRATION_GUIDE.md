# Move this app to your own Supabase (simple version)

Your only real data is your admin account. Skip the export/import — just recreate the admin fresh. Way less work.

---

## Step 1 — Create a new Supabase project

1. Go to `supabase.com` and sign in.
2. Click **New project**.
3. Name it, pick a region close to you, set a database password (save it somewhere safe).
4. Wait ~1 minute for it to finish setting up.

---

## Step 2 — Create the tables (run the SQL)

1. In your new project, click **SQL Editor** in the left sidebar.
2. Open the folder `supabase/migrations/` in this repo.
3. Open each file **oldest first** (they are dated in the filename).
4. For each file: copy all the SQL → paste into the SQL Editor → click **Run**.
5. Do this for every file, in order.

When done, click **Table Editor** in the sidebar. You should see: `profiles`, `schools`, `tasks`, `reservations`, `chat_rooms`, `messages`, `organization_access_requests`, `bug_reports`. If they're all there, you're good.

---

## Step 3 — Create your admin account

1. In Supabase, click **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: `gamingdooper0@gmail.com`
3. Password: `elijas7851` (or whatever you want)
4. ✅ Check **Auto Confirm User**
5. Click **Create user**.

That's it. The app auto-promotes the first user to admin on first login. You don't need to touch the `profiles` table.

---

## Step 4 — Get your new keys

In Supabase: **Project Settings** (gear icon, bottom left) → **API**.

Copy these three values (keep this tab open):

- **Project URL** — looks like `https://abcdef.supabase.co`
- **anon / public key** — long string starting with `eyJ...`
- **service_role key** — long string starting with `eyJ...` (KEEP PRIVATE, never share)

---

## Step 5 — Put the keys in Vercel

1. Go to your project on `vercel.com` → **Settings** → **Environment Variables**.
2. Add each of these (paste the values from Step 4):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon key |
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |

3. **Delete** `LOVABLE_API_KEY` if it's there.
4. Go to **Deployments** → click the three dots on the latest one → **Redeploy**.

---

## Step 6 — Tell Supabase which URLs are allowed

In Supabase: **Authentication** → **URL Configuration**.

- **Site URL**: `https://your-app.vercel.app` (your actual Vercel domain)
- **Redirect URLs** — add all three:
  ```
  https://your-app.vercel.app/**
  http://localhost:8080/**
  http://localhost:5173/**
  ```

Click **Save**.

---

## Step 7 — Test it

1. Open your Vercel app.
2. Log in with `gamingdooper0@gmail.com` + your password.
3. You should land in the admin dashboard.

If that works, you're fully off the Lovable-managed backend. 🎉

---

## Step 8 (optional) — Add Google login

### Part A — Google Cloud Console

1. Go to `console.cloud.google.com`.
2. Create a project (or pick an existing one).
3. Left menu: **APIs & Services** → **OAuth consent screen**.
   - Choose **External** → Create.
   - App name: `Socialinės Valandos`
   - User support email: your email
   - Developer contact: your email
   - Save and continue through the rest (defaults are fine).
4. Left menu: **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     ```
     https://your-app.vercel.app
     http://localhost:8080
     ```
   - **Authorized redirect URIs** — get this from Supabase: **Authentication → Providers → Google** shows the exact callback URL. Paste it here. It looks like:
     ```
     https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
     ```
   - Click **Create**. Copy the **Client ID** and **Client Secret**.

### Part B — Supabase

1. **Authentication** → **Providers** → **Google**.
2. Toggle **Enable**.
3. Paste **Client ID** and **Client Secret**.
4. **Save**.

Done — the Google button in the app will now work.

---

## Step 9 (optional) — Password reset emails

The forgot-password button already works in code, but emails won't actually send until you set up email.

- **Easy option**: Supabase's built-in email works for a few emails per hour — fine for testing.
- **Real option**: **Authentication** → **Emails** → **SMTP Settings** and plug in Resend, SendGrid, or similar.

---

## What if something breaks

- **"Missing Supabase environment variable"** on Vercel → you forgot one of the vars in Step 5, or forgot to redeploy.
- **Login says "incorrect password"** → wrong password, or you forgot to check **Auto Confirm User** in Step 3.
- **Google login errors** → the redirect URI in Google Cloud must match Supabase's callback URL *exactly*.
- **Tables missing** → re-run any migration file you skipped in Step 2.
