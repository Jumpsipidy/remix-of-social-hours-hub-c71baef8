import { describe, expect, it } from "vitest";
import { prepareReportImage } from "../src/lib/screenshot";

describe("report image safety", () => {
  it("rejects SVG rather than attaching active image markup", async () => {
    expect(await prepareReportImage(new File(["<svg></svg>"], "screen.svg", { type: "image/svg+xml" }))).toBeNull();
  });
  it("rejects images larger than 10 MB before decoding", async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "screen.png", { type: "image/png" });
    expect(await prepareReportImage(file)).toBeNull();
  });
});
