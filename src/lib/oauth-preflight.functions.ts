import { createServerFn } from "@tanstack/react-start";

export const checkOAuthProvider = createServerFn({ method: "GET" })
  .inputValidator((input: { provider: "google" | "discord"; redirectTo: string }) => input)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return { ok: false, message: "Auth serverio URL nėra nustatytas." };

    const authorizeUrl = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", data.provider);
    authorizeUrl.searchParams.set("redirect_to", data.redirectTo);
    if (data.provider === "google") authorizeUrl.searchParams.set("prompt", "select_account");

    try {
      const response = await fetch(authorizeUrl, { redirect: "manual" });
      if ((response.status >= 300 && response.status < 400) || response.ok) return { ok: true, message: null };

      let raw = "";
      try { raw = await response.text(); } catch {}
      const lowered = raw.toLowerCase();
      const name = data.provider === "google" ? "Google" : "Discord";

      if (lowered.includes("missing oauth secret")) {
        return { ok: false, message: `${name} prisijungimas dar neturi OAuth Client Secret nustatymo.` };
      }
      if (lowered.includes("provider is not enabled") || lowered.includes("unsupported provider")) {
        return { ok: false, message: `${name} prisijungimas dar nėra įjungtas auth nustatymuose.` };
      }
      return { ok: false, message: `${name} prisijungimas dabar nepasiekiamas. Patikrink OAuth nustatymus.` };
    } catch {
      return { ok: false, message: "Nepavyko patikrinti OAuth būsenos. Bandyk dar kartą." };
    }
  });