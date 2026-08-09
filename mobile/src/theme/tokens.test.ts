import { describe, expect, it } from "vitest";

import { colors, fontSizes, radii, spacing, touchTargets } from "./tokens";

describe("mobile design tokens", () => {
  it("uses the documented AmarKrishok palette", () => {
    expect(colors.brand.primary).toBe("#146B45");
    expect(colors.background.page).toBe("#F5F7FA");
    expect(colors.text.primary).toBe("#111827");
    expect(colors.destructive.primary).toBe("#CC0001");
  });

  it("uses only documented spacing, radii, type sizes, and touch targets", () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32, 48, 64]);
    expect(Object.values(radii)).toEqual([4, 6, 8, 12, 999]);
    expect(Object.values(fontSizes)).toEqual([50, 32, 28, 26, 24, 18, 17, 16, 15, 14, 13, 12, 11]);
    expect(touchTargets.minimum).toBe(44);
    expect(touchTargets.primaryMinimum).toBe(52);
    expect(touchTargets.primaryMaximum).toBe(60);
  });
});
