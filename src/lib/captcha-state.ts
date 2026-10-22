/** Configuration transport failures must never downgrade verification. */
export function captchaMode(siteKey: string | null | undefined, configError: boolean) {
  if (configError) return "config-error";
  if (siteKey === undefined) return "loading";
  return siteKey ? "recaptcha" : "math";
}