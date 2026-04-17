# Quick Wins — Industry Catalog Rollout

Status: Active  
Owner: Product + Frontend  
Last updated: 2026-04-17

## Baseline metrics (before rollout)

- Industry coverage in company selectors: **8** legacy values.
- Locales with explicit industry labels in active UI: **EN / ES / PT** (partial for wider taxonomy).
- Hardcoded industry arrays in product surfaces: **4** paths
  - `src/components/companies/CompanyForm.tsx`
  - `src/pages/Companies.tsx`
  - `src/pages/CompanyDetail.tsx`
  - `src/components/import/CSVImport.tsx`
- Smart View default tied to legacy value: `sv-05` uses `saas`.

## MVP scope implemented

1) Canonical catalog
- New centralized industry register in `src/lib/industries.ts` based on LinkedIn public taxonomy.
- Stable normalized values + legacy mapping (`saas`, `fintech`, `consulting`, `healthcare`).

2) Product integration
- Company form and company filters now consume centralized options.
- Company list/detail render localized labels from centralized catalog.
- CSV import normalizes incoming industry values before saving.
- Company schema/store normalize industry values for consistency.
- Seed smart view migrated from `saas` to `computer-software`.

3) Internationalization scope
- Industry labels are present for all supported locales (`en`, `es`, `pt`, `fr`, `de`, `it`) in catalog metadata.

## Acceptance criteria

- No industry option arrays hardcoded in company form/list/detail/import flow.
- Legacy industry values map without breaking existing records and filters.
- Industry labels render in current locale for all supported languages.

## QA checklist

- [ ] Create/Edit company with industry in each locale (`en`, `es`, `pt`, `fr`, `de`, `it`).
- [ ] Filter companies by industry and verify record counts are stable.
- [ ] Open company detail and verify industry label language switch behavior.
- [ ] Import CSV with legacy values (`saas`, `fintech`) and confirm normalization.
- [ ] Validate smart view `sv-05` still returns software companies after migration.

## Rollout plan

1. Enable in staging and run locale smoke checklist.
2. Roll out to 20% tenants for one cycle.
3. Review filter usage + import errors for 48h.
4. Complete rollout to 100% tenants if no regressions.
