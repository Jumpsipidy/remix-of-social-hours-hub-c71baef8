import { beforeEach, describe, expect, it } from "vitest";
import { notifications, notificationTarget } from "@/lib/notifications";

const base = { kind: "friend" as const, title: "Naujas draugo kvietimas", body: "Ona", to: "/student" };

describe("notification list", () => {
  beforeEach(() => { localStorage.clear(); notifications.useUser(null); });

  it("shows the same event only once, even after it was cleared", () => {
    notifications.useUser("u1");
    expect(notifications.add({ ...base, key: "fr:1:pending" })).not.toBeNull();
    expect(notifications.add({ ...base, key: "fr:1:pending" })).toBeNull();
    notifications.clear();
    expect(notifications.add({ ...base, key: "fr:1:pending" })).toBeNull();
  });

  it("keeps each account's notifications separate on one device", () => {
    notifications.useUser("u1");
    notifications.add({ ...base, key: "a" });
    notifications.useUser("u2");
    expect(notifications.getSnapshot().items).toHaveLength(0);
    notifications.useUser("u1");
    expect(notifications.getSnapshot().items).toHaveLength(1);
  });

  it("counts new items as unread until read", () => {
    notifications.useUser("u1");
    notifications.add({ ...base, key: "a" });
    notifications.add({ ...base, key: "b" });
    expect(notifications.getSnapshot().items.filter((n) => !n.read)).toHaveLength(2);
    notifications.markAllRead();
    expect(notifications.getSnapshot().items.filter((n) => !n.read)).toHaveLength(0);
  });

  it("sends each role to its own page", () => {
    expect(notificationTarget("message", "school_admin")).toBe("/mokytojas/pokalbiai");
    expect(notificationTarget("message", "student")).toBe("/chat");
    expect(notificationTarget("reservation", "organization")).toBe("/organization");
    expect(notificationTarget("hours", "student")).toBe("/student");
  });
});
