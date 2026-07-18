# 📧 Email Setup Guide — Socialinės Valandos

Send **branded** emails from your own domain via Resend (free 3k/month).
Setup ≈ 10 min. Zero AI credits used.

---

## Quick summary

1. Buy a domain (~$1–10/yr) — can be different from your website domain.
2. Add it to Resend, paste DNS records at your registrar.
3. Get Resend API key (`re_...`) → paste into Supabase SMTP.
4. Paste the two branded HTML templates below into Supabase → Auth → Emails.
5. Done. Sign-up + password reset emails now come from your domain with **6-digit codes** the user can type into the site.

---

## SMTP settings recap

In **Supabase → Authentication → SMTP Settings**:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your `re_...` key from Resend → API Keys |
| Sender email | `noreply@yourverifieddomain.com` |
| Sender name | `Socialinės Valandos` |

---

## Where to paste templates

**Supabase → Authentication → Email Templates**

Two templates matter:
- **Confirm signup** → paste Template 1 below
- **Reset password** → paste Template 2 below

Available variables in templates:
- `{{ .Token }}` — the 6-digit code (what users type on our website)
- `{{ .ConfirmationURL }}` — the magic link
- `{{ .SiteURL }}` — your site
- `{{ .Email }}` — recipient email

Set the **Subject** for each:
- Signup: `Tavo Socialinių Valandų patvirtinimo kodas`
- Reset: `Slaptažodžio atkūrimas — Socialinės Valandos`

---

## 🎨 TEMPLATE 1 — Confirm signup (paste in "Confirm signup")

```html
<!DOCTYPE html>
<html lang="lt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05060f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:radial-gradient(ellipse at top,#1e1b4b 0%,#05060f 60%);padding:56px 16px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:linear-gradient(180deg,#0f1030 0%,#0a0b22 100%);border:1px solid rgba(99,102,241,0.25);border-radius:28px;overflow:hidden;box-shadow:0 40px 80px -20px rgba(59,130,246,0.45);">
        <tr><td style="padding:8px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899);"></td></tr>
        <tr><td style="padding:44px 44px 24px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);line-height:64px;font-size:30px;box-shadow:0 12px 30px rgba(59,130,246,0.5);">💙</div>
          <h1 style="color:#fff;font-size:26px;margin:22px 0 8px;font-weight:800;letter-spacing:-0.5px;">Sveiki atvykę!</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0;line-height:1.6;">Dar vienas žingsnis — patvirtink savo el. paštą, kad pradėtum kaupti savanorystės valandas.</p>
        </td></tr>

        <tr><td style="padding:8px 44px 8px;">
          <p style="color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:0 0 12px;font-weight:600;">Tavo patvirtinimo kodas</p>
          <div style="background:linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15));border:1px solid rgba(99,102,241,0.4);border-radius:20px;padding:24px;text-align:center;">
            <code style="color:#fff;font-size:38px;letter-spacing:12px;font-weight:800;font-family:'SF Mono',Consolas,monospace;text-shadow:0 0 20px rgba(59,130,246,0.6);">{{ .Token }}</code>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;margin:12px 0 0;">Įklijuok šį kodą svetainėje puslapyje <strong style="color:#94a3b8;">/verify-email</strong></p>
        </td></tr>

        <tr><td style="padding:24px 44px;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0 0 12px;">arba paspausk mygtuką</p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:999px;font-weight:700;font-size:14px;box-shadow:0 10px 25px rgba(59,130,246,0.5);">Patvirtinti automatiškai</a>
        </td></tr>

        <tr><td style="padding:24px 44px 40px;border-top:1px solid rgba(99,102,241,0.15);">
          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">Jei šio laiško neprašei — tiesiog ignoruok. Kodas galioja 1 valandą.</p>
          <p style="color:#475569;font-size:12px;margin:12px 0 0;">💙 <strong style="color:#94a3b8;">Socialinės Valandos</strong> — savanorystės platforma Lietuvos moksleiviams</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 🎨 TEMPLATE 2 — Reset password (paste in "Reset password")

```html
<!DOCTYPE html>
<html lang="lt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05060f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:radial-gradient(ellipse at top,#3b0764 0%,#05060f 60%);padding:56px 16px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:linear-gradient(180deg,#1a0b2e 0%,#0a0b22 100%);border:1px solid rgba(236,72,153,0.25);border-radius:28px;overflow:hidden;box-shadow:0 40px 80px -20px rgba(236,72,153,0.35);">
        <tr><td style="padding:8px;background:linear-gradient(90deg,#ec4899,#8b5cf6,#3b82f6);"></td></tr>
        <tr><td style="padding:44px 44px 24px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#ec4899,#8b5cf6);line-height:64px;font-size:30px;box-shadow:0 12px 30px rgba(236,72,153,0.5);">🔐</div>
          <h1 style="color:#fff;font-size:26px;margin:22px 0 8px;font-weight:800;letter-spacing:-0.5px;">Slaptažodžio atkūrimas</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0;line-height:1.6;">Gavome prašymą atkurti tavo paskyros slaptažodį. Naudok kodą arba mygtuką žemiau.</p>
        </td></tr>

        <tr><td style="padding:8px 44px 8px;">
          <p style="color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:0 0 12px;font-weight:600;">Atkūrimo kodas</p>
          <div style="background:linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.15));border:1px solid rgba(236,72,153,0.4);border-radius:20px;padding:24px;text-align:center;">
            <code style="color:#fff;font-size:38px;letter-spacing:12px;font-weight:800;font-family:'SF Mono',Consolas,monospace;text-shadow:0 0 20px rgba(236,72,153,0.6);">{{ .Token }}</code>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;margin:12px 0 0;">Įklijuok kodą puslapyje <strong style="color:#94a3b8;">/update-password</strong></p>
        </td></tr>

        <tr><td style="padding:24px 44px;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0 0 12px;">arba paspausk mygtuką ir iškart nustatyk naują slaptažodį</p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:999px;font-weight:700;font-size:14px;box-shadow:0 10px 25px rgba(236,72,153,0.5);">Nustatyti naują slaptažodį</a>
        </td></tr>

        <tr><td style="padding:24px 44px 40px;border-top:1px solid rgba(236,72,153,0.15);">
          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">⚠️ Jei šio laiško neprašei — kažkas įvedė tavo el. paštą. Gali ramiai ignoruoti. Nuoroda galioja 1 val.</p>
          <p style="color:#475569;font-size:12px;margin:12px 0 0;">💙 <strong style="color:#94a3b8;">Socialinės Valandos</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## How it works on the website

### Signup with code
1. Student fills registration form → clicks **Sukurti paskyrą**.
2. Website redirects to `/verify-email`.
3. User gets branded email (Template 1) with **6-digit code**.
4. Types code → account activated → sent to `/student` dashboard.
5. Alternative: click the button in the email → auto-verified.

### Password reset with code
1. User clicks **Pamiršai slaptažodį?** → enters email → gets Template 2.
2. On `/update-password`:
   - Option A: click the button in email → auto-authenticated → new password form.
   - Option B: paste the 6-digit code manually → verified → new password form.

Both flows already implemented in code.

---

## Test checklist

- [ ] Sign up new account → email arrives from `noreply@tavodomenas.lt`
- [ ] Code from email works on `/verify-email`
- [ ] Button in email also works (redirects to `/student`)
- [ ] Click "Pamiršai slaptažodį?" → email arrives (Template 2)
- [ ] Code works on `/update-password`
- [ ] Set new password → login works

If emails go to spam: check SPF/DKIM/DMARC records verified in Resend, and wait 24h for reputation to warm up.

---

## Cost

- Domain: ~$1–10/year
- Resend: **free** up to 3,000 emails/month
- Supabase SMTP: **free**
- AI credits used: **0**

Total: cheaper than a coffee. ☕
