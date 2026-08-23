import { createTheme } from "@mui/material/styles";

const sansFont = 'Inter, "Noto Sans Bengali", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Material UI representation of the design tokens in tokens.css.
 *
 * The CSS variables remain the source for legacy components during the staged
 * migration. New MUI components should consume this theme instead.
 */
export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#146b45",
      dark: "#0f5636",
      light: "#e7f2ec",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#1c69d4",
      dark: "#14509f",
      light: "#dbeafe",
      contrastText: "#ffffff",
    },
    error: {
      main: "#cc0001",
      dark: "#a80001",
      light: "#fee2e2",
    },
    success: {
      main: "#15803d",
      light: "#dcfce7",
    },
    warning: {
      main: "#b45309",
      dark: "#8a4b08",
      light: "#fef3e2",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#4b5563",
      disabled: "#9aa3af",
    },
    divider: "#e2e5eb",
  },
  typography: {
    fontFamily: sansFont,
    fontSize: 14,
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
    h1: { fontSize: "2rem", fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: "1.625rem", fontWeight: 800, lineHeight: 1.25 },
    h3: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3 },
    h4: { fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.35 },
    h5: { fontSize: "1rem", fontWeight: 700, lineHeight: 1.4 },
    h6: { fontSize: "0.875rem", fontWeight: 700, lineHeight: 1.4 },
  },
  shape: {
    borderRadius: 6,
  },
  spacing: 4,
  transitions: {
    duration: {
      shortest: 120,
      shorter: 120,
      short: 200,
      standard: 200,
      complex: 320,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 40,
          paddingInline: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e2e5eb",
          borderRadius: 8,
          boxShadow: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
  },
});
