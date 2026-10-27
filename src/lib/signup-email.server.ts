import { renderShell, escape, codeBox } from "./email-templates/_shell";

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
    title: "Patvirtink paskyrą",
    preview: "Vienas paspaudimas ir tavo paskyra aktyvi.",
    bodyHtml: `Liko vienas žingsnis — patvirtink el. paštą ir galėsi rinktis veiklas, rezervuoti laiką ir matyti savo valandas.${code ? codeBox(code, "Arba įvesk kodą") : ""}<p style="margin:16px 0 0;font-size:13px;color:#64748b;">Nuoroda galioja ribotą laiką. Jei registracijos nepradėjai — ignoruok šį laišką.</p>`,
    ctaLabel: "Patvirtinti paskyrą",
    ctaHref: link,
  } as never);
  const text = `Patvirtink paskyrą: ${link}${props.email_otp ? `\nKodas: ${props.email_otp}` : ""}`;
  const { sendResendEmail } = await import("./email.functions");
  const result = await sendResendEmail(email, "Patvirtink savo paskyrą — Socialinės Valandos", html, { text, tag: "verify_email" });
  if ("skipped" in result) throw new Error("Laiškų siuntimas nesukonfigūruotas (trūksta RESEND_API_KEY).");
  return result;
}

/** Password recovery email through Resend; link opens /update-password with a token hash. */
export async function sendRecoveryEmail(email: string, origin: string, props: { hashed_token?: string; email_otp?: string }) {
  if (!props.hashed_token) throw new Error("Nepavyko paruošti atkūrimo nuorodos.");
  const link = `${origin}/update-password?token_hash=${encodeURIComponent(props.hashed_token)}&type=recovery`;
  const code = props.email_otp ? escape(props.email_otp) : "";
  const html = renderShell({
    eyebrow: "Slaptažodžio atkūrimas",
    medallionEmoji: "🔑",
    heading: "Atkurk slaptažodį",
    title: "Slaptažodžio atkūrimas",
    preview: "Nustatyk naują slaptažodį per kelias sekundes.",
    accent: "amber",
    bodyHtml: `Gavome prašymą atkurti tavo slaptažodį. Paspausk mygtuką ir susikurk naują.${code ? codeBox(code, "Arba įvesk kodą") : ""}<p style="margin:16px 0 0;font-size:13px;color:#64748b;">Jei to neprašei — niekas nepasikeis, tiesiog ignoruok šį laišką.</p>`,
    ctaLabel: "Nustatyti naują slaptažodį",
    ctaHref: link,
  } as never);
  const { sendResendEmail } = await import("./email.functions");
  const result = await sendResendEmail(email, "Slaptažodžio atkūrimas — Socialinės Valandos", html, { text: `Atkurk slaptažodį: ${link}${props.email_otp ? `\nKodas: ${props.email_otp}` : ""}`, tag: "password_reset" });
  if ("skipped" in result) throw new Error("Laiškų siuntimas nesukonfigūruotas (trūksta RESEND_API_KEY).");
  return result;
}
