import { describe, expect, it } from "vitest";

import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "./tokens";

describe("mobile design tokens", () => {
  it("uses the documented AmarKrishok palette", () => {
    expect(colors).toEqual({
      background: { page: "#F5F7FA", surface: "#FFFFFF", sunken: "#F1F3F6" },
      border: { default: "#E2E5EB", hairline: "#F1F3F6", strong: "#C5CAD3" },
      brand: {
        deepText: "#0F5636",
        hover: "#0F5636",
        primary: "#146B45",
        soft: "#E7F2EC",
      },
      console: {
        active: "#1D3329",
        mint: "#9FE0BC",
        raised: "#182A21",
        surface: "#0E1A14",
      },
      destructive: {
        border: "#F3C7C7",
        hover: "#A80001",
        primary: "#CC0001",
        soft: "#FEE2E2",
      },
      interactive: { blue: "#1C69D4", blueHover: "#14509F", blueSoft: "#DBEAFE" },
      overlay: "rgba(17,24,39,0.4)",
      status: {
        bad: "#CC0001",
        badSoft: "#FEE2E2",
        good: "#15803D",
        goodSoft: "#DCFCE7",
        warn: "#B45309",
        warnDark: "#8A4B08",
        warnSoft: "#FEF3E2",
      },
      text: {
        body: "#4B5563",
        muted: "#6B7280",
        primary: "#111827",
        strong: "#374151",
        subtle: "#9AA3AF",
      },
    });
  });

  it("maps all three required font families to their loaded Expo faces", () => {
    expect(fontFamilies).toEqual({
      bengali: {
        regular: "NotoSansBengali_400Regular",
        semibold: "NotoSansBengali_600SemiBold",
      },
      mono: {
        medium: "JetBrainsMono_500Medium",
        semibold: "JetBrainsMono_600SemiBold",
      },
      ui: {
        bold: "Inter_700Bold",
        extrabold: "Inter_800ExtraBold",
        medium: "Inter_500Medium",
        regular: "Inter_400Regular",
        semibold: "Inter_600SemiBold",
      },
    });
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
