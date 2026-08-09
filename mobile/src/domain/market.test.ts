import { describe, expect, it } from "vitest";

import { dhakaDateKey, fairPriceDelta, fairPriceVerdict } from "./market";

describe("market rules", () => {
  it("uses the documented fair-price boundaries", () => {
    expect(fairPriceVerdict(4)).toEqual({ label: "দরের উপরে", tone: "warn" });
    expect(fairPriceVerdict(3)).toEqual({ label: "ন্যায্য দাম", tone: "good" });
    expect(fairPriceVerdict(-8)).toEqual({ label: "ন্যায্য দাম", tone: "good" });
    expect(fairPriceVerdict(-9)).toEqual({ label: "দরের নিচে", tone: "blue" });
    expect(fairPriceVerdict(null)).toBeNull();
  });

  it("computes the verdict only from a current rate", () => {
    expect(fairPriceDelta(10300, 10000)).toBe(3);
    expect(fairPriceDelta(10400, 10000)).toBe(4);
    expect(fairPriceDelta(9200, 10000)).toBe(-8);
    expect(fairPriceDelta(9000, null)).toBeNull();
  });

  it("uses the Dhaka calendar day", () => {
    expect(dhakaDateKey("2026-08-08T19:00:00.000Z")).toBe("2026-08-09");
  });
});
