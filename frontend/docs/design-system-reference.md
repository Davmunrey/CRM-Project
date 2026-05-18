# Design system reference (engineering)

**Audience:** Frontend contributors and AI agents. **Language:** English.  
**Scope:** Semantic tokens, Tailwind mapping, layout primitives, motion, density, focus, guardrail scripts, and accessibility smoke tests.

For product-facing layout narrative and navigation runbooks, keep using [`master-design-ui.md`](./master-design-ui.md).

---

## Source files

| Area | Path |
|------|------|
| Semantic tokens (RGB, typography, spacing, elevation, z-index, motion, density, legacy aliases) | `frontend/src/styles/tokens.css` |
| Global base, components, utilities, light-mode overrides | `frontend/src/index.css` |
| Tailwind theme extensions | `frontend/tailwind.config.js` |
| Brand accent → CSS variables | `frontend/src/lib/brandingAccent.ts` |
| Theme class on `<html>` | `frontend/src/lib/theme.ts` (`applyTheme`, `resolveTheme`) |
| UI density `data-density` on `<html>` | `frontend/src/lib/theme.ts` (`applyUiDensity`, `normalizeUiDensity`) |
| Persisted settings (includes `themePreference`, `uiDensity`) | `frontend/src/store/settingsStore.ts` |
| Chart colors from CSS variables (Recharts) | `frontend/src/lib/chartTheme.ts` |
| `date-fns` locale bundles (dynamic import) | `frontend/src/lib/dateFnsLocale.ts` |
| Hook: load active locale for `date-fns` | `frontend/src/hooks/useDateLocale.ts` |
| Focus trap / modal a11y helpers | `frontend/src/utils/a11y.ts` |

---

## Semantic colors

- **Surfaces:** `bg-surface-0`, `bg-surface-1`, `bg-surface-2` (Tailwind reads `rgb(var(--color-surface-*) / <alpha>)`).
- **Text:** `text-fg`, `text-fg-muted`, `text-fg-subtle`.
- **Accent / brand:** `accent-*` utilities and `btn-gradient` for primary CTAs.
- **Status:** `success`, `warning`, `danger`, `info` — each maps to a semantic CSS var in `tokens.css` and supports alpha (`bg-success/15`, `text-danger`, `border-warning/40`). Prefer these for new status chips, toasts, and validation messages instead of raw `red-400` / `amber-400`.
  - Already migrated: validation text and focus/error borders in `Input` / `Select` / `Textarea`, overdue block in `Activities`, overdue + follow-up sections in `Topbar`, trend pill in `StatCard`, logout button accent.
  - Not migrated (kept intentionally, diverse palette per entity): activity chips (`bg-emerald-500/20`, etc.), Kanban stage colors, score badges.
- **Dark default, light via `html.light`:** variables in `tokens.css` switch; avoid raw **`navy`** / arbitrary **`bg-[#...]`** / **`text-[#...]`** / **`border-[#...]`** / **`from|to|via-[#...]`** in TSX (enforced by `npm run ui:lint`).

Legacy CSS variables `--bg-main`, `--text-main`, etc., mirror semantic tokens for gradual migration.

- **Borders (semantic):** `border-border-subtle`, `border-border-strong` — map to `tokens.css` border RGB + opacity (theme-aware via `html.light`).

---

## Typography scale (tokens → Tailwind)

| Token (CSS var) | Tailwind | Notes |
|-----------------|----------|--------|
| `--font-size-xs` … `--font-size-3xl` | `text-xs` … `text-3xl` | `tailwind.config.js` maps each to the var + default line-height |
| `--line-height-tight` … `--line-height-relaxed` | `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed` | |
| `--font-weight-regular` … `--font-weight-bold` | `font-normal`, `font-medium`, `font-semibold`, `font-bold` | |
| `--letter-spacing-tight` … `--letter-spacing-wide` | `tracking-tight`, `tracking-normal`, `tracking-wide` | |

Prefer **`text-fg` / `text-fg-muted` / `text-fg-subtle`** for copy color; use the scale above for size/weight only.

---

## Spacing & vertical rhythm

| Token | Tailwind (extended) |
|-------|---------------------|
| `--space-0` … `--space-10` | `p-*`, `m-*`, `gap-*` keys `0`–`10` use token rem values (4px grid) |
| `--stack-sm` / `--stack-md` / `--stack-lg` | `gap-stack-sm`, `p-stack-md`, etc. | Tightens under `data-density='compact'` |

---

## Elevation (shadows)

| Token | Tailwind |
|-------|----------|
| `--shadow-xs` … `--shadow-xl`, `--shadow-float`, `--shadow-brand-sm` | `shadow-xs` … `shadow-xl`, `shadow-float`, `shadow-brand-sm` |

---

## Z-index

| Token | Tailwind |
|-------|----------|
| `--z-base` … `--z-skip` | `z-base`, `z-dropdown`, `z-sticky`, `z-overlay`, `z-modal`, `z-toast`, `z-tooltip`, `z-skip` |

---

## Containers & breakpoints

- **Max widths:** `max-w-container` (`--container-max`, 1800px), `max-w-container-narrow` (960px).
- **Breakpoints:** documented in `tokens.css` as `--breakpoint-sm` … `--breakpoint-2xl` (same as Tailwind defaults: 640, 768, 1024, 1280, 1536).

---

## Tailwind `darkMode`

`tailwind.config.js` sets `darkMode: 'class'`. `applyTheme` in `src/lib/theme.ts` adds `light` or `dark` on `<html>`, so **`dark:` utilities follow the in-app theme**, not only OS preference.

---

## Motion

CSS variables (milliseconds, unitless numbers consumed where needed):

- `--duration-fast` (120), `--duration-base` (180), `--duration-slow` (240)
- `--ease-default`

**Tailwind transition buckets:** `tailwind.config.js` maps `duration-fast` → **150ms**, `duration-base` → **200ms**, `duration-slow` → **500ms** (replacing scattered `duration-150|200|500|700`). Prefer these three classes for UI transitions. The `--duration-*` tokens above remain for non-Tailwind contexts (e.g. raw CSS); keep new work aligned to the **fast / base / slow** naming, not one-off millisecond values.

Tailwind: `duration-fast`, `duration-base`, `duration-slow`, and animations `animate-fade-in`, `animate-slide-in`, `animate-scale-in` (aligned to ~180ms).

**Reduced motion:** `src/index.css` includes a `@media (prefers-reduced-motion: reduce)` rule that collapses transitions, animations, and smooth scrolling system-wide, so respecting OS motion preferences does not require opt-in per component.

---

## App shell (main canvas)

- **`.app-main-surface`** on `<main>` (`frontend/src/index.css`, applied in `Layout.tsx`) gives a single brand-tinted background for **all** authenticated routes. Do not add alternate main-region backdrops per route.
- **Responsive shell:** Below `md`, the sidebar is a drawer; `Topbar` exposes a hamburger and a compact search entry that opens the command palette on the narrowest breakpoints. Product narrative: [`master-design-ui.md` — Main canvas and responsive shell](./master-design-ui.md#main-canvas-and-responsive-shell).

---

<a id="charts-and-locale-loading"></a>
## Charts and locale loading

- **Charts:** `useChartTheme()` in `frontend/src/lib/chartTheme.ts` reads semantic colors from CSS variables for Recharts (Dashboard, Reports, Forecast). Avoid hardcoded hex in chart configs.
- **`date-fns`:** Locales are loaded **on demand** via `loadDateFnsLocale` (`frontend/src/lib/dateFnsLocale.ts`) and `useDateLocale` so inactive locale packs are not bundled with the main chunk. Vite `manualChunks` in `frontend/vite.config.ts` also splits **`recharts`** and **`date-fns`** into separate async chunks.

---

## Density

- **Settings:** `AppSettings.uiDensity`: `'comfortable' | 'compact'` (default `comfortable` in `seedSettings`).
- **DOM:** `document.documentElement.dataset.density` is set on load (`frontend/src/main.tsx`) and when settings change (`frontend/src/App.tsx` subscription).
- **Tokens:** `html[data-density='compact']` lowers `--control-h` and `--row-h` in `frontend/src/styles/tokens.css`. Use these variables for new dense layouts (e.g. table rows, form controls) instead of one-off pixel hacks.

---

## Focus ring

- **Utility:** `focus-ring` in `frontend/src/index.css` (`@layer utilities`) — double ring using `--color-surface-0` and `--color-ring`.
- **Primitives:** `Button`, `IconButton`, `Input`, `Select`, and `Textarea` use `focus-ring`. Inputs also add `focus-visible:border-accent-500/50` for an extra color signal on the control border.

---

## Icon sizes

Token sizes: `--icon-size-sm` (14px), `--icon-size-md` (16px), `--icon-size-lg` (18px).

Tailwind: `size-icon-sm`, `w-icon-md`, `h-icon-lg`, etc. (see `tailwind.config.js` `size` / `width` / `height`).

---

## React primitives

Under `frontend/src/components/ui/`: `Button`, `Input`, `Select`, `Textarea`, `Modal`, `IconButton`, `Card`, `PageHeader`, `Toolbar`, `StatCard`, …

**Page headers:** Prefer `PageHeader` with `showTitle={false}` when the Topbar already shows the route title; keep an accessible `<h1 class="sr-only">` via the `title` prop.

---

## Industry catalog guardrail

- Canonical data: `frontend/src/data/linkedin-industries-v2.json` (LinkedIn Industry Codes V2, English labels). Refresh with `node scripts/sync-linkedin-industries.mjs`.
- API: `frontend/src/lib/industries.ts` — `getIndustryOptions(language)`, `getIndustryLabel(value, language)`, `normalizeIndustryValue(raw)` for legacy slugs.
- Do not hardcode industry option arrays in forms, filters, imports, or views.
- Optional translated overrides: extend `overrides` in `industries.ts`; otherwise labels fall back to English `nameEn`.

---

## Auth shell (`AuthLayout`)

- Component: `frontend/src/components/auth/AuthLayout.tsx`.
- **`variant="centered"`** — single column (`max-w-md`), default branding logo + optional `title` / `subtitle` / `footer`, floating `LanguageSwitcher` + `ThemeSwitcher`.
- **`variant="split"`** — `lg` grid: left `splitPanel` (marketing), right column for the form; on small screens `splitPanel` stacks above the form. Use for Login.
- Background: class `auth-page-bg` uses `--auth-page-gradient-dark` / `--auth-page-gradient-light` from `frontend/src/styles/tokens.css` (see `frontend/src/index.css`).

## Theme & language switchers

- **`ThemeSwitcher`** (`frontend/src/components/ui/ThemeSwitcher.tsx`): `variant="floating"` (`fixed top-4 right-20 z-modal`) or `variant="inline"` (for `Topbar`). Persists via `useSettingsStore`.
- **`LanguageSwitcher`** (`frontend/src/components/shared/LanguageSwitcher.tsx`): flag + ISO code trigger, `DropdownMenu` options, `size="sm" | "md"`. Respects `languageMode` from `useI18nStore` (browser vs manual).

---

## UI guardrails (`ui:lint`)

```bash
cd frontend && npm run ui:lint
```

Script: `frontend/scripts/ui-lint.mjs`.

**Global rules** (all TS/TSX except allowlist below):

- Navy utilities: `bg-navy-*`, `text-navy-*`, `border-navy-*`, `from|to-navy-*`
- Arbitrary hex in Tailwind utilities: `bg-[#…]`, `text-[#…]`, `border-[#…]`, `from|to|via-[#…]`

**Strict rules** (everything under `frontend/src/` **except** `frontend/src/components/ui/**`, where primitives may still use low-level utilities):

- Slate / legacy neutrals: `text-slate-*`, `bg-slate-*`, `border-slate-*`, `placeholder-slate-*`
- Raw white/black: `text-white`, `bg-white`
- Legacy brand scale: `bg-brand-*`, `text-brand-*`, `border-brand-*`, `from|to|outline|ring|accent-brand-*`
- Raw status / palette: common `text|bg|border-(red|emerald|amber|blue|rose|sky|…)` Tailwind scales (see script for exact patterns)

Allowlist: `frontend/src/lib/brandingAccent.ts` and `frontend/src/lib/theme.ts` (which write CSS variables from raw hex).

CI: `.github/workflows/ci.yml` runs `npm run ui:lint` and `npm run i18n:lint` after `npm ci` in the frontend.

### i18n guardrails (`i18n:lint`)

```bash
cd frontend && npm run i18n:lint
```

Script: `frontend/scripts/i18n-lint.mjs` — blocks long hardcoded strings in `setError('…')` outside `frontend/src/i18n` and `frontend/src/components/ui`.

E2E (`npm run test:e2e`): `frontend/playwright.config.ts` runs **`npm run build` before `vite preview`** so static routes (including the `*` catch-all) always match the current `App.tsx`.

**Unused code audit:** `npm run audit:unused` runs Knip scoped to **files and dependencies** (export-level noise is excluded until the backlog is triaged). `frontend/knip.json` ignores certain paths and placeholder modules.

---

## Accessibility smoke (axe)

- Dependency: `vitest-axe` (extends `expect` in `frontend/tests/setup.ts`).
- Covered pages: `Login`, `Register`, `ForgotPassword` (see `frontend/tests/auth/*.test.tsx`); UI primitives smoke in `frontend/tests/ui/primitives.test.tsx` (includes `ThemeSwitcher` + `LanguageSwitcher`).
- **Note:** jsdom + static HTML may report false positives for color contrast; tune `axe()` options per case if needed.

---

## Cursor rule

Persistent hints for agents: `.cursor/rules/ui-consistency.mdc` (tokens, primitives, lint, no navy/hex in components), `.cursor/rules/i18n.mdc` (user-facing copy via `t.*` / `getTranslations()`). Refer to monorepo structure: frontend/ for UI code, api/ for backend.

---

## Document control

- **Status:** Active  
- **Owner:** Frontend  
- **Last updated:** 2026-05-18  
