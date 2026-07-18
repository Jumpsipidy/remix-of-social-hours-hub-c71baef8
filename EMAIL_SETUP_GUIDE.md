# 📧 Email Setup Guide — Socialinės Valandos

Send beautiful branded emails (password resets, welcome emails, notifications) from **your own domain** — like `noreply@tavodomenas.lt` — instead of generic Supabase defaults.

---

## What you'll get

- ✅ Custom branded emails from your domain (`labas@tavodomenas.lt`)
- ✅ Cool React-designed templates (password reset, signup confirm, magic links)
- ✅ Free-tier friendly (Resend gives **3,000 emails/month free**)
- ✅ No AI credits used — this is normal email infrastructure

---

## Requirements

1. **A real domain** you own (from Namecheap, Cloudflare, GoDaddy, `.lt` registrar, etc.). ~$10/year.
   - ❌ There is no free shared sender domain. Every email service requires you to own a domain to prevent spam.
   - ✅ Cheapest option: buy a `.xyz` or `.online` for ~$1/year for testing.

2. **Access to your domain's DNS settings** (to add TXT/MX records).

---

## OPTION A — Resend (Recommended, Free 3k/month)

Resend has the cleanest free tier and best deliverability. Setup takes ~10 minutes.

### Step 1 — Create Resend account
1. Go to **https://resend.com** → sign up (free).
2. Dashboard → **Domains** → **Add Domain**.
3. Enter your domain (e.g., `tavodomenas.lt`) → **Add**.

### Step 2 — Add DNS records
Resend shows you 3–4 records (SPF, DKIM, DMARC, MX). At your domain registrar:

| Type | Name | Value |
|------|------|-------|
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | (long key Resend provides) |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` priority 10 |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

Click **Verify DNS Records** in Resend. Wait ~5 min (up to 72h for slow registrars).

### Step 3 — Get SMTP credentials
1. Resend dashboard → **SMTP** (left sidebar) or **API Keys**.
2. Copy:
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **User**: `resend`
   - **Password**: your API key (starts with `re_...`)

### Step 4 — Plug into Supabase Auth
1. Supabase dashboard → **Authentication** → **Emails** → **SMTP Settings**.
2. Toggle **Enable Custom SMTP** ON.
3. Fill in:
   - **Sender email**: `labas@tavodomenas.lt`
   - **Sender name**: `Socialinės Valandos`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: your `re_...` key
4. **Save**.

### Step 5 — Customize the email templates (the cool part 🎨)

Supabase dashboard → **Authentication** → **Emails** → click each template (Confirm signup, Reset password, Magic link, etc.).

Paste this **branded template** for **Reset Password**:

```html
<!DOCTYPE html>
<html lang="lt">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0a0a1a 0%,#1a1a3e 100%);padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#12122a;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(59,130,246,0.25);">
        <tr><td style="padding:40px 40px 20px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);line-height:56px;font-size:28px;">💙</div>
          <h1 style="color:#fff;font-size:24px;margin:20px 0 8px;font-weight:700;">Atkurk savo slaptažodį</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0;line-height:1.6;">Gavome prašymą atkurti tavo Socialinių Valandų paskyros slaptažodį.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:16px 40px;border-radius:999px;font-weight:600;font-size:15px;box-shadow:0 8px 24px rgba(59,130,246,0.4);">Nustatyti naują slaptažodį</a>
        </td></tr>
        <tr><td style="padding:0 40px 20px;">
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Arba nukopijuok kodą į atkūrimo puslapį:</p>
          <div style="background:#0a0a1a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-top:12px;text-align:center;">
            <code style="color:#3b82f6;font-size:22px;letter-spacing:4px;font-weight:700;">{{ .Token }}</code>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px 40px;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">Jei to neprašei — ignoruok šį laišką. Nuoroda galioja 1 val.</p>
          <p style="color:#475569;font-size:12px;margin:12px 0 0;">— Socialinės Valandos komanda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

Do the same for **Confirm signup** and **Magic Link** (change heading + button text).

Available variables:
- `{{ .ConfirmationURL }}` — the magic link
- `{{ .Token }}` — 6-digit code
- `{{ .Email }}` — user's email
- `{{ .SiteURL }}` — your site

### Step 6 — Test it
1. Log out.
2. Go to `/forgot-password` → enter your email.
3. Check inbox — you should see the branded email from `labas@tavodomenas.lt`.

Done! 🎉

---

## OPTION B — Brevo (formerly Sendinblue, 300/day free)

Same flow as Resend. Sign up at **https://brevo.com**, verify domain, get SMTP creds:
- Host: `smtp-relay.brevo.com`
- Port: `587`
- User: your Brevo login email
- Password: SMTP key from dashboard

Plug into Supabase the same way (Step 4 above).

---

## OPTION C — Cheapest possible (Gmail SMTP, 500/day)

Only for testing — not for production.
1. Enable 2FA on Gmail → create **App Password**.
2. Supabase SMTP:
   - Host: `smtp.gmail.com`, Port: `587`
   - User: `yourgmail@gmail.com`, Password: app password
3. Sender must be your Gmail address (can't fake a custom domain).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Domain not verified" | Wait longer or check DNS with https://dnschecker.org |
| Emails go to spam | Add DMARC record, make sure SPF/DKIM verified |
| "Rate limit exceeded" in Supabase | Custom SMTP raises the limit — make sure it's ON in Supabase |
| Template variables show as `{{ .Token }}` literally | Wrong quotes — must be exactly `{{ .Token }}` with spaces |
| Password reset link goes to wrong URL | Supabase → Auth → URL Configuration → set Site URL correctly |

---

## Does this cost credits?

**No.** SMTP + Supabase Auth is normal email infrastructure. Your only cost is:
- Domain (~$10/year)
- Email service (Resend free tier = 3,000/month = plenty)

Total: **~$1/month** if you actually go beyond free tier.
