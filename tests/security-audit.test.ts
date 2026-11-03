import { describe, expect, it, vi } from "vitest";
import { csvCell } from "@/lib/csv-safe";
import { friendshipCounts } from "@/lib/friendship-counts";
import { trustedEmailOrigin } from "@/lib/trusted-email-origin";
import { isAllowedPushEndpoint, sendWebPush } from "@/lib/webpush.server";

describe("security audit regressions", () => {
  it.each(["=SUM(1,2)", "+1", "-1", "@SUM(1)", "\t=1", "\r=1"])("neutralizes CSV formula %j", (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it("quotes embedded CSV separators and quotes", () => {
    expect(csvCell('Živilė, "A"')).toBe('"Živilė, ""A"""');
  });
  it("counts overlapping friendship chunks once", () => {
    expect(friendshipCounts([
      { requester_id: "a", addressee_id: "b" },
      { requester_id: "a", addressee_id: "b" },
      { requester_id: "b", addressee_id: "a" },
      { requester_id: "a", addressee_id: "c" },
    ])).toEqual({ a: 2, b: 1, c: 1 });
  });
  it("always uses canonical email links in production", () => {
    expect(trustedEmailOrigin("http://localhost:8080", true)).toBe("https://socialinesvalandos.dev");
  });
  it.each(["https://attacker.lovable.app", "https://socialinesvalandos.dev.evil.com", "https://socialinesvalandos.dev@evil.com", "https://evil.com", "not a URL"])("rejects foreign email origin %s", (origin) => {
    expect(trustedEmailOrigin(origin, false)).toBe("https://socialinesvalandos.dev");
  });
  it("permits only this project's preview and local development", () => {
    const preview = "https://id-preview--054abe8e-3ca2-40ad-bab3-e27bbd108995.lovable.app";
    expect(trustedEmailOrigin(preview, false)).toBe(preview);
    expect(trustedEmailOrigin("http://localhost:8080", false)).toBe("http://localhost:8080");
    expect(trustedEmailOrigin("http://localhost:8080/token", false)).toBe("https://socialinesvalandos.dev");
  });
  it.each(["https://fcm.googleapis.com/fcm/send/token", "https://updates.push.services.mozilla.com/wpush/v2/token", "https://web.push.apple.com/token", "https://wns.notify.windows.com/token"])("permits genuine push service %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });
  it.each(["http://fcm.googleapis.com/token", "https://fcm.googleapis.com.evil.com/token", "https://fcm.googleapis.com:444/token", "https://user:pass@fcm.googleapis.com/token", "http://127.0.0.1/token", "https://evil.com/token"])("blocks hostile push endpoint %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false);
  });
  it("rejects SSRF before signing or making a network request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    try {
      expect(await sendWebPush({ endpoint: "http://127.0.0.1/token", p256dh: "", auth: "" }, {})).toMatchObject({ ok: false, status: 400 });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });
});