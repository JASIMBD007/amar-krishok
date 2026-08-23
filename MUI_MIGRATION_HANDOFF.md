# MUI migration handoff for Claude

Continue the staged conversion of the React web frontend from raw CSS elements to Material UI. Do not modify `backend/` or `mobile/` as part of this migration.

## Completed checkpoints

- `5e83bff Add Material UI theme foundation`
  - Installed MUI 9 and Emotion.
  - Added `src/theme/theme.ts`, mapped from `src/theme/tokens.css`.
  - Added `ThemeProvider` in `src/main.tsx`.
- `7cf4b3f Migrate shared UI primitives to MUI`
  - Migrated shared crop/stat cards, section headings, form primitive, KPI cards, empty states, and loading state.
- `e1a6483 Migrate choice and launch modals to MUI`
  - Migrated launch and registration dialogs, including MUI focus/backdrop/Escape behavior.
- `73f3c32 Migrate cookie consent controls to MUI`
  - Migrated the cookie consent surface, buttons, and analytics switch.

Every checkpoint passed `npm run build` and `npm run lint` using Node 24.6.0.

## Required migration rules

1. Work in small, independently buildable commits. Run build, lint, and `git diff --check` before every commit.
2. Preserve functionality, accessibility, Bengali translations/fonts, responsive behavior, route behavior, and the existing visual identity.
3. During staged conversion, keep existing `className` hooks on MUI components so `src/styles.css` continues to protect the current layout. Delete CSS only when all usages of that selector have been migrated and visually checked.
4. Prefer MUI components and theme values over new raw CSS. Use `sx` only for local/dynamic styles; put repeated design decisions in `src/theme/theme.ts` component overrides.
5. Keep `lucide-react`; replacing icons is not part of this migration.
6. This project uses MUI 9. Prefer `slots` and `slotProps`; older props such as `inputProps`, `PaperProps`, and `componentsProps` may no longer type-check.
7. Do not add `CssBaseline` until the application shell and public pages have been visually checked because the legacy stylesheet currently supplies the global reset.
8. Do not rewrite business logic while converting presentation components.

## Recommended next commits

1. Application shell in `src/App.tsx`: use `AppBar`, `Toolbar`, `Drawer`, `IconButton`, `Badge`, `Menu`, and MUI buttons while preserving router links and notification/logout behavior.
2. `NotificationDetailDialog.tsx` and remaining admin/custom modal implementations.
3. Form controls in `AuthPages.tsx`, `ProfilePage.tsx`, `PostCropPage.tsx`, `EditListingPage.tsx`, `CheckoutPage.tsx`, and account/admin forms. Preserve controlled values, validation, autocomplete, file inputs, and submission semantics.
4. Workspace/dashboard primitives: `WorkspaceShell.tsx`, `WorkspacePanels.tsx`, `WorkspaceOrderTable.tsx`, admin panels, KPI grids, tables, tabs, chips, and alerts.
5. Public pages: `HomePage.tsx`, `MarketplacePage.tsx`, `PricesPage.tsx`, `LotDetailPage.tsx`, footer, rate ticker, and crop cards.
6. Chat/message components and remaining page-specific controls.
7. CSS cleanup by verified selector group. Use `rg` to prove a class is unused before deleting its rules. Keep `tokens.css` until all values are represented in the MUI theme or intentionally retained for non-MUI styling.
8. Add route-level lazy loading/manual chunks after the conversion if the MUI bundle warning remains; do this as a separate performance commit.

## Verification

The repository requires Node `>=24.6.0`. In Codex, the compatible runtime is available by running commands with the bundled dependency environment. The default system Node may be 21 and causes Vite's `crypto.hash is not a function` error; this is an environment mismatch, not an application bug.

Before each commit run:

```bash
npm run build
npm run lint
git diff --check
git status --short
```

Also visually test desktop and mobile widths for every page group. Check keyboard focus, Escape/backdrop dialog closing, navigation drawer behavior, form labels/errors, Bengali text wrapping, and loading/empty states.

## Current known state

- Branch: `main`
- Working tree should be clean after this handoff commit.
- `src/styles.css` is still intentionally large; conversion is incomplete.
- Production build succeeds but reports a JavaScript chunk above 500 kB. Avoid mixing code-splitting changes into presentation migration commits.
