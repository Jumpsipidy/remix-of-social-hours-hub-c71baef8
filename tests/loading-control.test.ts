import { afterEach, describe, expect, it, vi } from "vitest";
import { singleFlightByKey, withLoadingDeadline } from "@/lib/loading-control";

afterEach(() => vi.useRealTimers());

describe("loading deadlines", () => {
  it("returns a successful result immediately", async () => {
    expect(await withLoadingDeadline(Promise.resolve("profile"))).toBe("profile");
  });
  it("preserves rejection instead of granting a result", async () => {
    const error = new Error("denied");
    await expect(withLoadingDeadline(Promise.reject(error))).rejects.toBe(error);
  });
  it("ends an unresolved request at the deadline", async () => {
    vi.useFakeTimers();
    const result = withLoadingDeadline(new Promise(() => {}), 8000);
    const assertion = expect(result).rejects.toThrow("Ryšys užtruko");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
  it("does not time out a response that arrives before the deadline", async () => {
    vi.useFakeTimers();
    const result = withLoadingDeadline(new Promise((resolve) => setTimeout(() => resolve(7), 100)), 200);
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears the deadline on network rejection", async () => {
    vi.useFakeTimers();
    await expect(withLoadingDeadline(Promise.reject(new Error("offline")))).rejects.toThrow("offline");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("concurrent profile requests", () => {
  it("shares one pending request for the same account", async () => {
    const request = vi.fn(async (key: string) => key);
    const load = singleFlightByKey(request);
    const first = load("student-a");
    expect(load("student-a")).toBe(first);
    expect(await first).toBe("student-a");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("never shares work between different accounts", async () => {
    const request = vi.fn(async (key: string) => key);
    const load = singleFlightByKey(request);
    expect(await Promise.all([load("a"), load("b")])).toEqual(["a", "b"]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("allows fresh reads after completion", async () => {
    const request = vi.fn(async () => 1);
    const load = singleFlightByKey(request);
    await load("a");
    await load("a");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("allows retry after a failed read", async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("profile");
    const load = singleFlightByKey(request);
    await expect(load("a")).rejects.toThrow("offline");
    expect(await load("a")).toBe("profile");
    expect(request).toHaveBeenCalledTimes(2);
  });
});