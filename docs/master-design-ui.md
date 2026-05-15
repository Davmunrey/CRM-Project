# Design system & UI (master)

> Consolidated **2026-04-21**. Layout shells, theme, navigation/settings sidebar, profile display names, responsive app shell, and empty-state component paths aligned with the repo.

**Companion (tokens, Tailwind, scripts, guardrails):** [`design-system-reference.md`](./design-system-reference.md).

**Replaces:** design-system-and-layout, theme-system, navigation-settings-sidebar-runbook, user-profile-display-names.

## Table of contents

- [Design system and layout](#design-system-and-layout)
- [Main canvas and responsive shell](#main-canvas-and-responsive-shell)
- [Theme system](#theme-system)
- [Navigation (Settings + Sidebar) runbook](#navigation-settings-sidebar-runbook)
- [User profile display names](#user-profile-display-names)
- [Entity list toolbars (Contacts, Companies, Deals)](#entity-list-toolbars-contacts-companies-deals)

---


<a id="design-system-and-layout"></a>
## Design system and layout

This document is the **canonical reference** for page layout, shared empty states, auth surfaces, and styling conventions introduced and consolidated in April 2026. Use it when adding routes, panels, or auth screens so the product stays visually and structurally consistent.

## Document Control

- Status: Active
- Owner: Frontend
- Last updated: 2026-05-15
- Canonical: Yes

## Goals

- One predictable **horizontal rhythm** and **max content width** for all CRM views inside `Layout`.
- Clear split between **scrollable pages** and **full-height split views** (inbox, kanban, calendar).
- Reusable **empty states** for side panels vs full-page empty states.
- **Auth and onboarding** screens aligned with branding (`settings.branding`) and shared background treatment.
- **Accessible focus**: prefer `focus-visible` rings on interactive controls; skip link to main content.

## Page shells (CSS utilities)

Defined in `src/index.css` (`@layer components`):

| Class | Use when |
|--------|-----------|
| **`crm-page`** | Default CRM pages: scrolls with the main region; applies `max-width: 1800px`, centered, responsive horizontal and vertical padding. Combine with Tailwind `space-y-*` for vertical stacking between sections. |
| **`crm-page-full`** | Full-height views inside `<main>`: applies the same max width and horizontal padding, plus `min-height: 0` and `height: 100%`. **You** add `flex flex-col` or `flex` (row) on the same element as needed (e.g. Inbox uses a row flex). |

**Do not** use ad-hoc `p-6` as the only outer wrapper on new protected pages; prefer `crm-page` or `crm-page-full`.

## Layout and accessibility

- `src/components/layout/Layout.tsx`: main landmark is `id="main-content"` with `min-h-0` and `scroll-smooth` for predictable scrolling inside the flex shell.
- **Skip link**: first focusable control skips to `#main-content`; copy is `common.skipToMain` (en/es/pt; de/fr/it inherit via `en` where applicable).
- `Topbar` shows the route title; secondary page titles inside content should use **`h2`** / **`h3`** as appropriate so heading order remains logical.

<a id="main-canvas-and-responsive-shell"></a>
## Main canvas and responsive shell

- **Main background:** `<main>` uses a single utility class **`.app-main-surface`** (defined in `src/index.css`) so every route shares the same brand wash and gradients in dark and light mode. Do not reintroduce route-specific “priority” backdrops on the main region.
- **Mobile navigation:** Below the `md` breakpoint the primary sidebar behaves as a **drawer** (backdrop, body scroll lock, close on route change, Escape, and when the viewport crosses back to `md+`). A **hamburger** control in `Topbar` opens it.
- **Search on small screens:** From `sm` and up the full search control is visible; on narrower viewports an **icon-only** control opens the **command palette** so search stays discoverable without crowding the bar.
- **Command palette:** Implemented as a dialog with focus management and Escape handling (see `src/components/layout/CommandPalette.tsx`).
- **Companion:** Token-level motion, chart theming, and build-time chunking notes live in [`design-system-reference.md`](./design-system-reference.md#motion) and [`design-system-reference.md`](./design-system-reference.md#charts-and-locale-loading).

## Empty and placeholder content

| Component | Path | When to use |
|-----------|------|-------------|
| **`EmptyState`** | `src/components/ui/EmptyState.tsx` (re-exported from `src/components/shared/EmptyState.tsx` for backwards compatibility) | Full-page or large content areas: icon, optional title, optional body copy via `description` or panel copy via `primary` / `secondary`, optional `action`. The body `<p>` renders only when `description` or `primary` is non-empty — use title + CTA alone when extra copy is redundant. |
| **`PanelEmpty`** | `src/components/shared/PanelEmpty.tsx` | Narrow columns and side panels (Inbox lists, Sequences list, Templates sidebar, etc.). Props: `icon?`, `title?`, `primary`, `secondary?`, `density?: 'default' \| 'compact'`. |

## Auth and public flows

- Wrapper: `auth-page-bg min-h-screen bg-navy-950` (see `src/index.css` for `.auth-page-bg` / `.auth-bg-blob` and light-mode overrides).
- **Branding**: Login pattern is the reference. Forgot password, reset password, and register consume **`useSettingsStore().settings.branding`** (app name, logo URL, primary color) for the header tile and title.
- **Org setup** (`OrgSetup.tsx`): same visual language—blobs, `glass` form card, inputs `bg-[#0d0e1a]` / `border-white/10` / `rounded-xl`, primary submit via `btn-gradient`.
- **Accept invite**: error/success/ready states use `glass` cards and shared button styles (`Button`, `btn-gradient` links where applicable).

## Modals and slide-overs

- `SlideOver` and centered `Modal` (`src/components/ui/Modal.tsx`): scrollable body uses **`px-6 py-5`** so inner content should not duplicate outer `p-6` unless a subsection needs its own card padding.
- Close controls: `type="button"` and visible **focus-visible** outline.

## Theme and tokens

- Semantic CSS variables (`--bg-main`, `--text-main`, etc.) and `.light` overrides: see **[Theme system](#theme-system)**.
- Prefer **`glass`**, **`border-white/8`**, and slate text scales over one-off **`zinc-*`** in new UI. Legacy `zinc` usage is being phased out in shared components.

## Verification before merge

- `npm run build`
- `npm run test:run` (Vitest)
- Quick visual pass: **Dashboard**, **Contacts**, **Deals** (kanban + list), **Inbox**, **Settings**, and **Login** in both **dark** and **light** (Settings → theme preference).

<a id="entity-list-toolbars-contacts-companies-deals"></a>
## Entity list toolbars (Contacts, Companies, Deals)

**Canonical implementation (April 2026):** list pages that show CRM entities in a **glass `Toolbar`** share the same **right-aligned** action cluster pattern:

1. Optional **bulk** controls when there is a selection.
2. **CSV** export where product allows (`contacts:export`, `companies:export`) — button label uses **`common.csv`** (i18n).
3. **Duplicates** (Contacts / Companies) opens a modal; strings live under `contacts.*` / `companies.*`.
4. **View mode** segmented control (**list / grid** for Contacts and Companies; **kanban / list** for Deals).
5. **Primary CTA** (New contact / New company / New deal) as the last control in that row — **not** floating in `PageHeader` alone.

**Contacts and Companies** add a second row: **`SmartViewBar`** (saved smart views from `viewsStore`) plus **`EntityListsToolbar`** (save current filters as a new view; distribution lists from `distributionListsStore`). See [Implementation history §25](./master-implementation-history.md#implementation-history-section-25).

**Deals** keep **New deal** inside the same toolbar as search/filters/view toggles (see §25).

## Related documents

- Theme behavior: [#theme-system](#theme-system)
- Navigation and settings UI: [#navigation-settings-sidebar-runbook](#navigation-settings-sidebar-runbook)
- Implementation changelog: [`master-implementation-history`](./master-implementation-history.md#implementation-history) Part B — UI shell (§18), cross-cutting UI quality pass (§24), entity lists & toolbars (§25)

---


<a id="theme-system"></a>
## Theme system

This CRM now supports three theme preferences:

## Document Control

- Status: Active
- Owner: Frontend
- Last updated: 2026-04-21
- Canonical: Yes

- `system` (default): follows OS/browser preference.
- `light`: always light mode.
- `dark`: always dark mode.

## Behavior

- Theme preference is stored in persisted settings (`crm_settings` localStorage key).
- On app boot, the theme is applied before render from localStorage when available.
- While the app is open:
  - If preference is `system`, OS theme changes are applied automatically.
  - If preference is `light` or `dark`, OS changes are ignored.

## Implementation Notes

- Source of truth:
  - `src/store/settingsStore.ts` (`settings.themePreference`)
- Theme resolution and DOM application:
  - `src/lib/theme.ts`
- Boot-time apply:
  - `src/main.tsx`
- Runtime sync:
  - `src/App.tsx`
- User selector:
  - `src/pages/Settings.tsx`

## Styling Strategy

- Global CSS variables define semantic surfaces/text:
  - `--bg-main`, `--bg-panel`, `--bg-elevated`, `--text-main`, `--text-muted`, `--border-soft`
- `:root.light` overrides variable values.
- Existing dark-first utility classes are adapted for light mode via scoped `.light` overrides in `src/index.css`.

### Page layout utilities (cross-reference)

CRM screens inside `Layout` should use the documented shell classes **`crm-page`** and **`crm-page-full`** (see **[Design system and layout](#design-system-and-layout)**) so spacing and max width stay consistent in light and dark mode.

## Extending Theme Coverage

When adding new UI:

1. Prefer semantic classes/components (`glass`, design tokens) over fixed dark hex colors.
2. If new hardcoded dark utility classes are required, add `.light` overrides in `src/index.css`.
3. Validate both modes manually on key pages (`Dashboard`, `Contacts`, `Deals`, `Settings`).

---


<a id="navigation-settings-sidebar-runbook"></a>
## Navigation (Settings + Sidebar) runbook

Canonical document for the navigation delivery. It consolidates implementation, deployment, QA, and i18n handoff in one place.

Legacy filename `navigation-i18n-release-handoff.md` was removed (Apr 2026); point all links here.

## Document Control

- Status: Active
- Owner: Frontend
- Last updated: 2026-04-21
- Canonical: Yes

## Scope delivered

- Settings sub-tabs with deep-link support.
- Declarative and customizable left sidebar.
- Per-user persisted navigation preferences in Supabase.
- i18n coverage for EN/ES/PT/FR/DE/IT in navigation-adjacent surfaces.

## Settings tabs

`src/pages/Settings.tsx` supports URL-driven tabs:

- `?tab=general`
- `?tab=branding`
- `?tab=pipeline`
- `?tab=email`
- `?tab=permissions`
- `?tab=data`
- `?tab=navigation`
- `?tab=advanced`

Behavior:

- Tab state is controlled by `useSearchParams`.
- Direct links and refresh remain stable.
- Sections render according to current tab.

## Sidebar customization

`src/components/layout/Sidebar.tsx` renders from preferences rather than fixed order only.

Supported behavior:

- Reorder sections (`main/sales/comms/config`).
- Hide/show sections.
- Reorder and hide built-in items.
- Create custom groups and custom links.
- Apply role-based visibility on custom entries.
- Render nested custom children (submenu-ready).

Security:

- Final route visibility still passes through `canAccessRoute`.
- Preferences cannot bypass permission checks.

## Architecture and files

Core files added:

- `src/types/navigation.ts`
- `src/config/navigationDefaults.ts`
- `src/utils/navigationSanitizer.ts`
- `src/store/navigationPrefsStore.ts`

Core files updated:

- `src/components/layout/Sidebar.tsx`
- `src/pages/Settings.tsx`
- `src/hooks/useDataInit.ts`
- `supabase/schema.sql`

## Preference model

Main type: `NavigationPreferences` (`src/types/navigation.ts`).

Key properties:

- `sectionOrder`
- `hiddenSections`
- `itemOrderBySection`
- `hiddenBuiltinItems`
- `customGroups`

Design intent:

- Defaults from `createDefaultNavigationPreferences()`.
- Runtime sanitization for stale/invalid payloads.
- Safe fallback to defaults for unknown shapes.

## Persistence model

Store: `useNavigationPrefsStore`.

Persistence strategy:

- Optimistic local update (Zustand).
- Supabase upsert to `navigation_preferences`.
- Scoped by `(organization_id, user_id)`.
- Local cache retained for quick startup UX.

Initial load is triggered from `useDataInit()`.

## Required database setup

Expected table and policies:

- `public.navigation_preferences`
- unique `(organization_id, user_id)`
- read/write policy constrained to `auth.uid() = user_id`
- `updated_at` trigger via `handle_updated_at()`

## i18n coverage in this release

Languages covered:

- `en`
- `es`
- `pt`
- `fr`
- `de`
- `it`

Translation files touched:

- `src/i18n/types.ts`
- `src/i18n/en.ts`
- `src/i18n/es.ts`
- `src/i18n/pt.ts`
- `src/i18n/fr.ts`
- `src/i18n/de.ts`
- `src/i18n/it.ts`

Surfaces covered:

- Settings navigation editor labels and actions.
- Sidebar saved-view and role-driven labels.
- Related navigation-linked UI touched in this release.

## Deployment checklist

1. Apply schema updates (including `navigation_preferences`).
2. Validate RLS: a user cannot read or write another user's preferences.
3. Test deep-link entry: `/settings?tab=navigation`.
4. Reorder/hide items, refresh, and relogin to verify persistence.
5. Switch languages (`en/es/pt/fr/de/it`) and validate navigation/settings copy.
6. Confirm role-restricted routes remain hidden for disallowed profiles.

## QA checklist

- Settings tabs:
  - direct URL entry works for each tab.
  - refresh preserves active tab.
- Sidebar:
  - section/item reorder persists.
  - hidden entities remain hidden after reload.
  - custom group CRUD works.
  - role visibility works for custom groups/items.
  - invalid persisted payload falls back safely (sanitizer).

## CI/release gate

Before merge/promotion:

- `npx tsc --noEmit`
- `npm run test:run`
- `npm run build`

## Known limitations

- Some low-traffic labels may still require follow-up i18n audit in future slices.
- `Settings.tsx` still contains broad tab sections and can be split into smaller section components later.

## Suggested follow-up hardening

- Extract settings tabs into `settings/sections/*`.
- Add E2E coverage for role-visibility matrix and deep-link flows.
- Add allowlist validation for custom routes.

---


<a id="user-profile-display-names"></a>
## User profile display names

Team register: what was implemented, how it works technically, what is covered for day-to-day use, and what remains for a “complete” model.

## Document Control

- Status: Active
- Owner: Auth/Frontend
- Last updated: 2026-04-21
- Canonical: Yes

---

## 1. Problem we addressed

| Symptom | Root cause |
|--------|------------|
| After changing the name in the profile (e.g. **David** with correct casing or **JoseLuis**), **logging out and back in** showed something like **david** in lowercase. | With **Supabase**, the name shown at login comes from `auth.users` → **`user_metadata.full_name`**. If it is missing, the client falls back to the **email local-part** (often lowercase). |
| Saving from the profile screen **did not persist** across sessions. | `updateUser` in the store only updated **Zustand** (in-memory / locally persisted state), **without** writing to Supabase Auth. |

---

## 2. What is implemented (done)

### 2.1 Persistence in Supabase Auth

- **File:** `src/store/authStore.ts` → `updateUser` action.
- **Behavior:** When Supabase is active (`isSupabaseConfigured`), the edited user is the **current** user (`isSelf`), and the patch includes profile fields (`name`, `jobTitle`, `phone`, `avatar`), the app calls:

  `supabase.auth.updateUser({ data: { ... } })`

- **Mapping to Supabase metadata (project convention):**

  | App field (`AuthUser`) | `user_metadata` key |
  |------------------------|---------------------|
  | `name` | `full_name` |
  | `jobTitle` | `job_title` |
  | `phone` | `phone` |
  | `avatar` | `avatar_url` |

- After a successful response, the store updates `users` and `currentUser` from Supabase (preferring server metadata).
- On network or Auth errors, **`toast.error`** shows the returned message.
- **`fetchOrgUsers(organizationId)`** runs (non-blocking) to align the in-memory team list.

### 2.2 Reading the name at login

- **File:** `src/store/authStore.ts` → `initSupabaseAuth` / `onAuthStateChange` → `setCurrentUser`.
- **Name priority:** `user_metadata.full_name` → email local-part → `"User"`.

With `full_name` saved correctly, the header, account menu, and anything that reads `currentUser.name` show the **persisted** name.

### 2.3 Demo mode (no Supabase)

- If Supabase is **not** configured, the profile still updates local state only (`applyLocal()`), consistent with mock/seed mode.

---

## 3. What works for the team today

| Area | Status | Notes |
|------|--------|--------|
| Change name / job title / phone / avatar in **My profile** (current user) with Supabase | **Yes** | Persists in Auth; new session respects `full_name` and other mapped keys. |
| See name in header / account switcher after login | **Yes** | Depends on `user_metadata` as above. |
| Team list (`fetchOrgUsers`) after saving profile | **Improved** | Explicit refresh after save; cached names may still merge with existing data. |
| Edit **another** user (admin) via `updateUser` in production | **Partial / out of scope here** | Only the **signed-in** user can call `supabase.auth.updateUser` from the client. Changing another member’s data requires an **Edge Function**, **service role**, or the Supabase Dashboard (outside this change). |

---

## 4. Not done or technical debt (pending)

These items describe the gap until the product is fully consistent **everywhere** a name or “assigned to” appears.

| Topic | Description | Suggested priority |
|-------|-------------|-------------------|
| **Historical values in CRM data** | Contacts, deals, activities, notifications, saved views, etc. may store **plain-text** old names (e.g. `assigned_to` as a label, or seeds like `"David Muñoz"`). Changing the profile **does not** rewrite those rows automatically. | Medium: propagation or one-off migration on rename. |
| **Identifier vs label** | Where the **DB schema already uses UUID** (`assigned_to` → `auth.users`), the UI should always resolve **display name from current users**, not rely on stale strings. Where legacy fixtures still use plain strings, labels can drift. | High–medium term: single source of truth (user id + resolution in UI). |
| **Saved filters keyed by name** | If a filter stored the exact previous name string, it may stop matching after a rename. | Low/medium depending on usage. |
| **Real avatar (file upload)** | If the UI only stores a URL in metadata but there is no **Storage upload** flow, the avatar may stay empty or manual. | Per profile roadmap. |
| **Error message i18n** | The `toast` may show a technical English message from Supabase. | Product polish. |

---

## 5. Manual validation (checklist)

1. With Supabase enabled, open **Profile**, set the name to something clearly different from the email local-part (e.g. `David` with capital D).
2. Save and confirm the UI shows the new name without a full reload (local state).
3. **Log out** and **log back in**.
4. Check header / menu: the **saved** name should appear, **not** the lowercase email local-part.
5. (Optional) In Supabase Dashboard → Authentication → user → **User Metadata**: confirm `full_name` (and other keys if applicable).

---

## 6. Code references

| What | Where |
|------|--------|
| Profile save + `updateUser` + Supabase | `src/store/authStore.ts` |
| Profile screen | `src/pages/UserProfile.tsx` |
| Session bootstrap and `full_name` read | `src/store/authStore.ts` (`initSupabaseAuth`) |
| Initial signup with `full_name` | `src/pages/Register.tsx` (`user_metadata` on signUp) |

---

## 7. Document history

| Date | Change |
|------|--------|
| 2026-04-21 | EmptyState: canonical path `src/components/ui/EmptyState.tsx`, re-export note, body-copy guidance; document-control dates refreshed. |
| 2026-04-13 | Initial register: profile persistence via `supabase.auth.updateUser`; scope and pending items documented. |
| 2026-04-13 | Full document translated to English. |

---

*Technical content last aligned with `authStore` (`updateUser` action). If the profile flow changes, update sections 2 and 6.*
