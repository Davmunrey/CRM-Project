# Manager Dashboard — metrics (data contract)

Implementation source of truth: [`src/utils/managerDashboardMetrics.ts`](../src/utils/managerDashboardMetrics.ts) and [`src/pages/ManagerDashboard.tsx`](../src/pages/ManagerDashboard.tsx).

## MQL / SQL (leads)

- **MQL:** `lead.lifecycleStage === 'mql'`.
- **SQL:** `lead.lifecycleStage === 'sql'`.
- **SQL share (%):** `sql / (mql + sql) × 100` when the denominator is &gt; 0. This is a **snapshot** of the split between MQL/SQL stages, **not** a historical cohort conversion rate (there is no persisted transition event for every lead).

## Stage aging (deals)

- **Open deals only** (stages that are not closed).
- **Closed:** stages whose `id` is `closed_won` / `closed_lost`, or the heuristic `probability === 100` with a name like “won”, and `probability === 0` with a name like “lost”.
- **Age:** calendar days from `deal.updatedAt` to “today” (a proxy for staleness since the last update).

## Owner response time (deals)

- For each open deal with `assignedTo`: the first **completed** activity of type `call`, `email`, or `meeting` on that deal with `createdBy === assignedTo`.
- Metric: **hours** from `deal.createdAt` to `activity.completedAt` (median per owner).

## Permissions

- Route **`/manager`**: same permission as reports — `reports:read` (see [`src/utils/permissions.ts`](../src/utils/permissions.ts)).
- Lazy route registration: [`src/App.tsx`](../src/App.tsx) (`ProtectedPage` + `reports:read`).
- Sidebar item: [`src/config/navigationDefaults.ts`](../src/config/navigationDefaults.ts) (`managerDashboard` id) and [`src/types/navigation.ts`](../src/types/navigation.ts).

## Internationalization (i18n)

All **user-visible** strings on the Manager Dashboard page go through [`useTranslations()`](../src/i18n/index.ts) (React) or must not be hardcoded in that page.

### Translation keys

| Area | TypeScript path | Files |
|------|-----------------|--------|
| Page copy (titles, hints, table headers, links) | `Translations['managerDashboard']` | [`src/i18n/types.ts`](../src/i18n/types.ts) (schema), [`src/i18n/en.ts`](../src/i18n/en.ts), [`src/i18n/es.ts`](../src/i18n/es.ts), [`src/i18n/pt.ts`](../src/i18n/pt.ts), [`src/i18n/de.ts`](../src/i18n/de.ts), [`src/i18n/fr.ts`](../src/i18n/fr.ts), [`src/i18n/it.ts`](../src/i18n/it.ts) |
| Nav label | `Translations['nav']['managerDashboard']` | Same locale files |
| SQL share when undefined | `Translations['common']['notAvailable']` | Same |
| Deals with no assignee in the response-time list | `Translations['common']['unassigned']` | Same |
| Hours suffix after median value | `Translations['managerDashboard']['hoursAbbrev']` | Same |

**Locale coverage:** `managerDashboard.*` is defined explicitly for **en**, **es**, **pt**, **de**, **fr**, and **it** (not only inherited from English). Other app areas may still use partial bundles (`...en`) for FR/DE/IT; see [Implementation history §22](./master-implementation-history.md#implementation-history-section-22) and [i18n regionalization waves](./master-roadmap-backlog.md#i18n-regionalization-execution-waves).

### Internal sentinel (not a translation key)

Open deals without `assignedTo` are grouped under a stable internal key exported as **`MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY`** in [`managerDashboardMetrics.ts`](../src/utils/managerDashboardMetrics.ts) (Unicode em dash `U+2014`). The UI maps that value to `common.unassigned` when rendering; do not show the raw sentinel to users.

## Closed-stage detection (heatmap + response metrics)

[`ManagerDashboard.tsx`](../src/pages/ManagerDashboard.tsx) builds the set of closed stage IDs used by both the aging heatmap and owner first-touch metrics. Logic includes:

- Explicit pipeline stage ids `closed_won` and `closed_lost`.
- Heuristic match on stage **name** (case-insensitive) for English **won / lost** and Spanish **ganado / ganada / perdido / perdida** fragments, combined with `probability` (100 vs 0), so localized stage names still classify as closed when ids are custom.

Pure metric functions in `managerDashboardMetrics.ts` receive this set as a parameter; they do not read pipeline settings themselves.

## Automated tests

- [`tests/utils/managerDashboardMetrics.test.ts`](../tests/utils/managerDashboardMetrics.test.ts) — `computeMqlSqlLeadSnapshot`, `computeDealStageAgingHeatmap`, `computeOwnerFirstTouchHours` (no React).

Run (from repo root):

`npm test -- --run tests/utils/managerDashboardMetrics.test.ts`

## Related documentation

- [Implementation history — §23 Manager Dashboard Pack + Onboarding](./master-implementation-history.md#implementation-history-section-23) (product narrative and cross-links).
- [Smoke checklist — production](./smoke-checklist-production.md) (cold load `/manager` with Reports read).
- [Translation QA checklist (per release)](./master-release-qa.md#translation-qa-checklist-per-release) (spot-check when `managerDashboard` or `common.unassigned` keys change).
- [Pro backlog — Manager / activation](./master-roadmap-backlog.md) (forward scope vs shipped KPI pack).

---

*Last updated: **2026-04-21** — prior 2026-04-16: metrics contract; i18n key map; sentinel `MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY`; explicit `managerDashboard` strings for EN/ES/PT/DE/FR/IT; closed-stage heuristics and test pointer.*
