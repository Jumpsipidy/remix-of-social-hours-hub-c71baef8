const CANONICAL_ORIGIN = "https://socialinesvalandos.dev";
const PROJECT_PREVIEW_ORIGIN = "https://id-preview--054abe8e-3ca2-40ad-bab3-e27bbd108995.lovable.app";

/** Email tokens must never be sent to an unrelated preview or supplied host. */
export function trustedEmailOrigin(raw: string | null, production: boolean): string {
  if (production || !raw) return CANONICAL_ORIGIN;
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return CANONICAL_ORIGIN;
    if (url.origin === PROJECT_PREVIEW_ORIGIN) return url.origin;
    if (url.hostname === "localhost" && ["http:", "https:"].includes(url.protocol)) return url.origin;
    return CANONICAL_ORIGIN;
  } catch {
    return CANONICAL_ORIGIN;
  }
}