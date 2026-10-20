import { renderShell, escape } from "./email-templates/_shell";

/**
 * Sends the account confirmation email through Resend instead of the
 * Supabase built-in mailer (which only delivers to project team members).
 * The link carries a token hash that /verify-email verifies directly.
 */
export async function sendVerificationEmail(email: string, origin: string, props: { hashed_token?: string; email_otp?: string }, type: "signup" | "magiclink", name?: string) {
  if (!props.hashed_token) throw new Error("Nepavyko paruošti patvirtinimo nuorodos.");
  const link = `${origin}/verify-email?token_hash=${encodeURIComponent(props.hashed_token)}&type=${type}`;
  const code = props.email_otp ? escape(props.email_otp) : "";
  const html = renderShell({
    accent: "indigo",
    eyebrow: "Paskyros patvirtinimas",
    medallionEmoji: "✉️",
    heading: name ? `Labas, ${escape(name)}!` : "Patvirtink el. paštą",
    bodyHtml: `Paspausk mygtuką, kad aktyvuotum savo Socialinių Valandų paskyrą.${code ? `<br/><br/>Arba įvesk šį kodą patvirtinimo puslapyje:<br/><b style="font-size:26px;letter-spacing:6px;">${code}</b>` : ""}<br/><br/>Jei registracijos nepradėjai — tiesiog ignoruok šį laišką.`,
    ctaLabel: "Patvirtinti paskyrą",
    ctaHref: link,
  } as never);
  const text = `Patvirtink paskyrą: ${link}${props.email_otp ? `\nKodas: ${props.email_otp}` : ""}`;
  const { sendResendEmail } = await import("./email.functions");
  const result = await sendResendEmail(email, "Patvirtink savo paskyrą — Socialinės Valandos", html, { text, tag: "verify_email" });
  if ("skipped" in result) throw new Error("Laiškų siuntimas nesukonfigūruotas (trūksta RESEND_API_KEY).");
  return result;
}
