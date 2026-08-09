export const colors = {
  brand: {
    primary: "#146B45",
    hover: "#0F5636",
    soft: "#E7F2EC",
    deepText: "#0F5636",
  },
  console: {
    surface: "#0E1A14",
    raised: "#182A21",
    active: "#1D3329",
    mint: "#9FE0BC",
  },
  destructive: {
    primary: "#CC0001",
    hover: "#A80001",
    soft: "#FEE2E2",
    border: "#F3C7C7",
  },
  interactive: {
    blue: "#1C69D4",
    blueHover: "#14509F",
    blueSoft: "#DBEAFE",
  },
  background: {
    page: "#F5F7FA",
    surface: "#FFFFFF",
    sunken: "#F1F3F6",
  },
  border: {
    default: "#E2E5EB",
    strong: "#C5CAD3",
    hairline: "#F1F3F6",
  },
  text: {
    primary: "#111827",
    strong: "#374151",
    body: "#4B5563",
    muted: "#6B7280",
    subtle: "#9AA3AF",
  },
  status: {
    good: "#15803D",
    goodSoft: "#DCFCE7",
    warn: "#B45309",
    warnSoft: "#FEF3E2",
    warnDark: "#8A4B08",
    bad: "#CC0001",
    badSoft: "#FEE2E2",
  },
  overlay: "rgba(17,24,39,0.4)",
} as const;

export const fontFamilies = {
  bengali: {
    regular: "NotoSansBengali_400Regular",
    semibold: "NotoSansBengali_600SemiBold",
  },
  ui: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_800ExtraBold",
  },
  mono: {
    medium: "JetBrainsMono_500Medium",
    semibold: "JetBrainsMono_600SemiBold",
  },
} as const;

export const fontSizes = {
  display: 50,
  titleLarge: 32,
  title: 28,
  heading: 26,
  headingSmall: 24,
  cardLarge: 18,
  card: 17,
  cardSmall: 16,
  bodyLarge: 15,
  body: 14,
  metaLarge: 13,
  meta: 12,
  eyebrow: 11,
} as const;

export const spacing = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x6: 24,
  x8: 32,
  x12: 48,
  x16: 64,
} as const;

export const radii = {
  input: 4,
  control: 6,
  card: 8,
  modal: 12,
  pill: 999,
} as const;

export const motion = {
  press: 120,
  state: 200,
  sheet: 320,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const touchTargets = {
  minimum: 44,
  primaryMinimum: 52,
  primaryMaximum: 60,
} as const;

export const iconSizes = {
  inline: 14,
  button: 16,
  topbar: 20,
  empty: 28,
} as const;

export const theme = {
  colors,
  fontFamilies,
  fontSizes,
  iconSizes,
  motion,
  radii,
  spacing,
  touchTargets,
} as const;

export type AppTheme = typeof theme;
