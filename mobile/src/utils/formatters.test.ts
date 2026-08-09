import { describe, expect, it } from "vitest";

import { formatDhakaTimestamp, formatMoneyFromPoisha } from "./formatters";

describe("mobile formatters", () => {
  it("formats integer poisha with Latin digits and Indian grouping", () => {
    expect(formatMoneyFromPoisha(14_256_000)).toBe("৳ 1,42,560");
    expect(formatMoneyFromPoisha(142_560)).toBe("৳ 1,425.60");
    expect(() => formatMoneyFromPoisha(1425.6)).toThrow("integer poisha");
  });

  it("renders UTC timestamps in Asia/Dhaka", () => {
    expect(formatDhakaTimestamp("2026-08-09T00:00:00.000Z")).toBe("09 Aug 2026, 06:00");
  });
});
