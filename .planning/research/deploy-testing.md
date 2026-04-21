# Deploy + Testing Research: CRM Pro

**Topic:** Static hosting for a Vite + React + TypeScript SPA, plus Vitest testing notes  
**Researched:** 2026-03-31; **neutralized / cross-checked:** 2026-04-16  
**Overall confidence:** HIGH for SPA routing and env **intent** (aligned with repo canonical `docs/deployment-spa-and-env.md`), MEDIUM for Vitest/testing (training knowledge; confirm versions at vitest.dev).

> **Canonical deploy wording for this repo:** [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md) (DEPLOY-01–05 intent, checked-in `vercel.json` + `public/_redirects`, Supabase env, smoke). Treat this file as **optional research**; when anything disagrees, the `docs/` file wins.

---

## 1. SPA hosting for Vite (example: one popular static platform)

### Confidence: HIGH for “SPA needs a fallback to `index.html`” (provider docs vary)

Vite builds a static `dist/`. **Any** host must serve `index.html` for unknown paths so `react-router-dom` v6 client routes work on cold load and refresh. The repo ships **two** examples: root [`vercel.json`](../../vercel.json) and [`public/_redirects`](../../public/_redirects) (Netlify-style); see the canonical table in [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md).

### Example `vercel.json` shape (only if you deploy there)

This project uses `react-router-dom` v6 with client-side routing. On hosts that use a `vercel.json`-style rewrite table, a catch-all rewrite is the usual fix:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Place this file at the repository root **only** if that host reads it. Other providers use `_redirects`, nginx `try_files`, S3/CloudFront error documents, etc. — again, see [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md).

**Note on `cleanUrls`:** If you later enable `"cleanUrls": true` in `vercel.json`, change the destination to `"/"` (no `.html` extension). Do not combine both at once.

### Build settings (typical for Vite; set in your CI or host UI)

| Setting | Value |
|---|---|
| Framework / preset | Vite (or plain static) |
| Build Command | `tsc && vite build` (or your repo script) |
| Output Directory | `dist` |
| Install Command | `npm ci` |

### Preview / branch deployments

Most SaaS static hosts assign a **unique preview URL per branch or PR**. Add each preview origin to Supabase Auth redirect allowlists and Edge Function CORS the same way you do for production (see canonical doc above).

### Custom domain + TLS

Follow your DNS provider and your static host’s wizard for apex vs subdomain, CNAME/A records, and automatic certificates. Propagation often takes minutes to hours depending on TTL.

---

## 2. Supabase environment variables in the hosting dashboard

### Confidence: HIGH (pattern verified against this repo)

The project already uses the correct Vite env var naming convention (`VITE_` prefix = bundled into client). The `src/lib/supabase.ts` pattern confirms: the app works without Supabase (graceful `null` fallback), which makes the env vars optional but required for full functionality.

### Variable classification

| Variable | Type | Public? | Why |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public | YES — safe to expose | It is just the project URL, not a secret. Required by the JS client. |
| `VITE_SUPABASE_ANON_KEY` | Public | YES — safe to expose | The anon key is designed to be public. Row Level Security (RLS) is what protects data, not key secrecy. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | NO — never expose | Server-side only. Bypasses RLS entirely. Never use with `VITE_` prefix. Never expose to the client. |

The project does NOT currently use the service role key, which is correct for a client-side app. Only ever add `SUPABASE_SERVICE_ROLE_KEY` to **server** runtimes (Edge Functions, CI secrets), never as a `VITE_` variable.

### Setting env vars (example: host “Production / Preview / Development” scopes)

In your host’s environment-variable UI (names vary), create entries similar to:

```
Name:   VITE_SUPABASE_URL
Value:  https://your-project.supabase.co
Environments: Production, Preview, Development (check all three)

Name:   VITE_SUPABASE_ANON_KEY
Value:  eyJhbGci...
Environments: Production, Preview, Development (check all three)
```

**Per-environment scoping:** Assign different values per environment. For preview deployments pointing to a Supabase staging project, assign the staging URL/key only to **preview/UAT** scopes. This keeps production data isolated from preview testing.

### Environment management strategy

```
Production branch (main):
  VITE_APP_CHANNEL      → production
  VITE_SUPABASE_URL     → https://prod-project.supabase.co
  VITE_SUPABASE_ANON_KEY → prod anon key

Preview branches:
  VITE_APP_CHANNEL      → staging
  VITE_SUPABASE_URL     → https://staging-project.supabase.co
  VITE_SUPABASE_ANON_KEY → staging anon key

Static demo bundle (optional):
  VITE_APP_CHANNEL      → demo
  (Supabase vars omitted — offline mock; see src/lib/envChannel.ts)

Local development (.env.local):
  (omit VITE_APP_CHANNEL → development in Vite dev server)
  VITE_SUPABASE_URL     → https://staging-project.supabase.co (or local)
  VITE_SUPABASE_ANON_KEY → staging anon key
```

Some CLIs can pull remote env into `.env.local` (e.g. vendor-specific `vercel env pull`); otherwise copy values manually from your host UI into [`.env.local`](../../.env.local) (gitignored).

### Local env file rules

| File | Committed? | Purpose |
|---|---|---|
| `.env.local` | NO (gitignored) | Local dev secrets, overrides everything |
| `.env` | YES (if needed) | Non-secret defaults for all environments |
| `.env.production` | YES (if needed) | Non-secret production defaults |
| `.env.example` | YES | Template with placeholder values (already exists in this project) |

The existing `.env.example` is the correct pattern — it documents required vars without exposing real values.

---

## 3. Vitest Setup for React 18 + TypeScript + Zustand

### Confidence: MEDIUM (based on Vitest docs knowledge, version cross-referenced with package.json)

### Package versions to install

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

| Package | Purpose |
|---|---|
| `vitest` | Test runner, replaces Jest — native Vite integration |
| `@vitest/coverage-v8` | Coverage via V8 (faster than istanbul, no transpilation) |
| `jsdom` | DOM simulation for browser-like environment in Node |
| `@testing-library/react` | Render React components in tests |
| `@testing-library/user-event` | Simulate user interactions (better than fireEvent) |
| `@testing-library/jest-dom` | Custom matchers: `toBeInTheDocument`, `toHaveValue`, etc. |

Do NOT install `jest`, `babel-jest`, or `ts-jest` — Vitest handles TypeScript natively via Vite's esbuild pipeline.

### vitest.config.ts

Create at the project root (separate from `vite.config.ts` to keep concerns separated):

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/types/**',
        'src/lib/database.types.ts',
        'src/utils/seedData.ts',
        'src/main.tsx',
      ],
    },
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

Key decisions:
- `environment: 'jsdom'` — required for React component tests; pure util tests don't need it but it doesn't hurt
- `globals: true` — enables `describe`, `it`, `expect` without imports (matches Jest DX; requires adding `"types": ["vitest/globals"]` to `tsconfig.json`)
- `setupFiles` — runs before each test file, used for jest-dom matchers and global mocks
- `alias` — mirrors the `@/*` path alias in `tsconfig.json` so imports resolve correctly

### tsconfig.json additions

Add `"vitest/globals"` to the `compilerOptions.types` array so TypeScript recognizes the global test functions:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom'
```

That single import registers all jest-dom matchers globally. Nothing else is needed in the setup file unless you add global mocks.

### package.json scripts to add

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

- `vitest` (watch mode) — for local development
- `vitest run` — for CI (single pass, exits with code)
- `--coverage` — generates coverage report to `coverage/`

---

## 4. Testing Zustand Stores

### Confidence: MEDIUM

### The core problem: stores persist across tests

Zustand stores are module-level singletons. If one test modifies store state, the next test inherits that state. This is the #1 cause of flaky Zustand tests.

### Pattern 1: Reset via `setState` in `beforeEach` (preferred for simple stores)

```typescript
import { useDealsStore } from '@/store/dealsStore'
import { act } from '@testing-library/react'

beforeEach(() => {
  act(() => {
    useDealsStore.setState({
      deals: [],
      filters: { search: '', stage: '', assignedTo: '', priority: '', valueMin: '', valueMax: '', dueDateFrom: '', dueDateTo: '' },
      selectedId: null,
      isLoading: false,
      viewMode: 'kanban',
    })
  })
})
```

This is the simplest approach. No need to re-create the store — Zustand's `setState` replaces the entire state object.

### Pattern 2: Zustand's `resetAllStores` utility

For projects with many stores, create a test utility:

```typescript
// src/test/resetStores.ts
import { useDealsStore } from '@/store/dealsStore'
import { useContactsStore } from '@/store/contactsStore'
// ... import all stores

export function resetAllStores() {
  useDealsStore.setState(useDealsStore.getInitialState?.() ?? {})
  useContactsStore.setState(useContactsStore.getInitialState?.() ?? {})
}
```

Call `beforeEach(resetAllStores)` in a global setup file or in each test file.

### The `persist` middleware complication

The `dealsStore` (and others) use `zustand/middleware`'s `persist`, which writes to `localStorage`. In jsdom, `localStorage` exists but persists across tests within the same worker process.

**Fix:** Clear localStorage in `beforeEach`:

```typescript
beforeEach(() => {
  localStorage.clear()
  // then reset store state
})
```

Or mock `localStorage` entirely in `setup.ts`:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'

// Prevent Zustand persist from writing between tests
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

### Mocking the Supabase client

The `src/lib/supabase.ts` already returns `null` when env vars are missing. In the test environment, `import.meta.env.VITE_SUPABASE_URL` will be `undefined`, so `isSupabaseConfigured` is `false` and `supabase` is `null`. This means:

- Pure store tests that don't call Supabase will work without any mocking
- If you add Supabase calls to stores later, mock the client explicitly:

```typescript
// src/test/mocks/supabase.ts
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  isSupabaseConfigured: false,
}))
```

Use `vi.mock` (Vitest's equivalent of `jest.mock`) at the top of test files that need it.

### Example: Testing a Zustand store action

```typescript
// src/store/dealsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useDealsStore } from '@/store/dealsStore'
import { act } from '@testing-library/react'

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useDealsStore.setState({ deals: [], selectedId: null, isLoading: false, viewMode: 'kanban' })
  })
})

describe('useDealsStore', () => {
  it('adds a deal and assigns an id', () => {
    act(() => {
      useDealsStore.getState().addDeal({
        title: 'Test Deal',
        value: 10000,
        stage: 'lead',
        contactId: 'c1',
        assignedTo: 'user1',
        priority: 'medium',
        linkedDeals: [],
        quoteItems: [],
      })
    })
    const { deals } = useDealsStore.getState()
    expect(deals).toHaveLength(1)
    expect(deals[0].id).toBeDefined()
    expect(deals[0].title).toBe('Test Deal')
  })

  it('filters deals by stage', () => {
    // ... setup state, call getFilteredDeals(), assert
  })
})
```

---

## 5. Testing Lead Scoring and Pure Utility Functions

### Confidence: HIGH (pure functions, no DOM or React needed)

The `src/utils/leadScoring.ts` file contains two pure functions (`computeLeadScore`, `calculateLeadScore`) with no side effects, no imports from React, and no Supabase calls. These are the highest-value, easiest tests in the codebase.

No jsdom needed — these tests run in `node` environment. You can even override the environment per-file:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeLeadScore } from '@/utils/leadScoring'
import type { Contact, Activity, Deal } from '@/types'

const baseContact: Contact = {
  id: 'c1',
  name: 'Test Contact',
  email: 'test@example.com',
  status: 'lead',
  lastContactedAt: null,
  phone: '',
  jobTitle: '',
  notes: '',
  companyId: '',
  linkedDeals: [],
  // ... other required fields
}

describe('computeLeadScore', () => {
  it('returns score of 0 for a cold contact with no data', () => {
    const result = computeLeadScore(baseContact, [], [])
    expect(result.score).toBe(0)
    expect(result.label).toBe('Frío')
  })

  it('gives maximum activity recency score for contact contacted today', () => {
    const recentContact = {
      ...baseContact,
      lastContactedAt: new Date().toISOString(),
      status: 'customer' as const,
    }
    const result = computeLeadScore(recentContact, [], [])
    expect(result.breakdown.activityRecency).toBe(30)
    expect(result.breakdown.contactStatus).toBe(20)
  })

  it('caps total score at 100', () => {
    // Test with all max conditions
    const result = computeLeadScore({ ...baseContact, status: 'customer', lastContactedAt: new Date().toISOString(), phone: '555', jobTitle: 'CEO', notes: 'important', companyId: 'co1' }, Array(5).fill({ contactId: 'c1', type: 'email', status: 'completed' }), [{ contactId: 'c1', value: 100000, id: 'd1' }])
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
```

### Testing React Hook Form + Zod validation

The key insight: Zod schemas are pure TypeScript functions. Test the schema directly without React or forms:

```typescript
// src/components/deals/DealForm.test.ts (schema-level)
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Import or re-define the schema used in the form
const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.number().min(0, 'Value must be non-negative'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
})

describe('Deal form validation schema', () => {
  it('rejects empty title', () => {
    const result = dealSchema.safeParse({ title: '', value: 1000, stage: 'lead' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Title is required')
    }
  })

  it('accepts valid deal data', () => {
    const result = dealSchema.safeParse({ title: 'New Deal', value: 5000, stage: 'qualified' })
    expect(result.success).toBe(true)
  })
})
```

For testing the React Hook Form component itself (integration-level), use `@testing-library/react` + `@testing-library/user-event`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DealForm } from '@/components/deals/DealForm'

it('shows validation error when title is empty', async () => {
  const user = userEvent.setup()
  render(<DealForm onSubmit={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: /save/i }))

  expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
})
```

**Recommendation:** Prioritize schema-level tests (fast, zero dependencies) over component-level form tests. Component tests are valuable for interaction flows but expensive to write and maintain. Use `@testing-library/user-event` v14+ (not `fireEvent`) for realistic user simulation.

---

## 6. CI/CD with GitHub Actions + static host integration

### Confidence: HIGH for “run tests on PR”; MEDIUM for vendor-specific deploy wiring

### Default behavior (many teams)

If your static host’s Git integration builds on every push, you may rely on that alone for CD. You **do not** have to duplicate deploy logic in Actions unless you want stricter gates.

### When to add GitHub Actions

Add a GitHub Actions workflow to run **typecheck/tests before or independent of** the host build. This prevents a broken build from reaching preview/production.

**Recommended workflow:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm run test:run

      - name: Coverage report
        run: npm run test:coverage
        if: github.event_name == 'pull_request'
```

**Host + Actions interaction:** Many hosts start a build as soon as Git receives a push, **without waiting** for Actions. To **gate** deploys on tests you can: (a) use the host’s “ignored build step” / build hook if it offers one, (b) run deploy only from Actions with a provider token, or (c) require green checks on `main` via branch protection and accept that previews may still fire (mitigate with staging Supabase only on preview). Pick one policy and document it in your ops runbook.

**Example — deploy only from Actions (vendor-specific CLI names omitted):** pattern is `checkout` → `setup-node` → `npm ci` → `npm run test:run` → **then** invoke your host’s deploy CLI with repository secrets for org/project/token. Exact secret names depend on the provider.

**Recommendation for CRM Pro:** Keep **canonical** routing/env in [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md); add **CI** that runs `tsc --noEmit` and `vitest run` on PRs (this repo already has workflows under `.github/` and `.gitea/`).

---

## 7. Environment Management Summary

### Confidence: HIGH

### File hierarchy (Vite's load order, later overrides earlier)

```
.env                    # base defaults (committed, non-secret only)
.env.local              # local overrides (gitignored, highest priority locally)
.env.[mode]             # mode-specific (e.g., .env.production)
.env.[mode].local       # mode-specific local overrides (gitignored)
```

For this project, the practical setup is:

```
.env.example            # committed — documents required vars with placeholder values
.env.local              # gitignored — actual values for local development
```

Never create `.env.production` with real Supabase credentials — those belong in the **hosting/CI secret store**, not in the repository.

### The two-Supabase-project pattern

Recommended for any production app:

| Environment | Supabase Project | Data | Purpose |
|---|---|---|---|
| Production | `crm-prod` | Real customer data | Live app |
| Preview/Staging | `crm-staging` | Seed/test data | Branch previews, QA |
| Local dev | `crm-staging` (same) or `localhost` | Seed data | Feature development |

Configure **production vs preview** builds with different `VITE_SUPABASE_URL` values. This prevents preview deployments from touching production data.

For local Supabase (via `supabase start` CLI): the local URL is always `http://127.0.0.1:54321` and the anon key is a well-known test value. Use these in `.env.local` when developing offline.

### Vitest environment variables

Vitest does NOT load `.env` files by default. For tests that need env vars:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
```

Or use a `.env.test` file and configure `envFile` in Vitest config. For this project, since the Supabase client gracefully returns `null` when vars are absent, you can skip this for most tests. Only add env vars if you need `isSupabaseConfigured` to be `true` in a specific test.

---

## Implementation Order

Historical checklist when this research was written; **current repo truth** is in [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md) and checked-in artifacts (`vercel.json`, `public/_redirects`). Suggested sequence in neutral terms:

1. **Confirm SPA fallback** for your host (repo already includes examples — see canonical doc).
2. **Wire env vars** per environment (production vs preview/staging Supabase projects).
3. **Install Vitest + testing deps** (`npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`)
4. **Create `vitest.config.ts`** and `src/test/setup.ts` with localStorage mock
5. **Add test scripts** to `package.json`
6. **Write first tests** — `leadScoring.ts` pure functions (no setup needed, immediate value)
7. **Write store tests** — `dealsStore`, `contactsStore` with beforeEach state reset
8. **Keep CI workflows** — type check + test run on PR (see `.github/workflows/` and `.gitea/workflows/` in this repo)
9. **Configure two Supabase projects** (prod + staging) and map them to **production vs preview** build environments

---

## Packages to Add

```bash
# Testing (all dev dependencies)
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Optional: Vitest UI (visual test runner in browser)
npm install -D @vitest/ui
```

No extra production npm dependencies are required for static deploy itself — routing is file-based config plus the Vite `dist/` output.

---

## Known Gaps / Needs Validation

- **Vite 8 compatibility with Vitest:** Vite 8 was released in 2025. Vitest v3+ supports Vite 5+; the Vite 8 / Vitest compatibility should be confirmed at `vitest.dev` before finalizing. If issues arise, pin `vitest` to a specific version that explicitly lists Vite 8 peer support. MEDIUM confidence on this pairing.
- **Zustand v5 `getInitialState` API:** Zustand v5 (used in this project per `package.json`) introduced store snapshots. The `getInitialState()` method availability should be confirmed against Zustand v5 changelog. If absent, the manual `setState({})` reset pattern is the safe fallback.
- **`@hookform/resolvers` v5 + Zod v4:** The project uses both at their latest major versions. Any breaking changes in resolver API since Zod v4 release should be checked if form-level component tests fail unexpectedly.

---

## Sources

- Example static-host docs (Vite): https://vercel.com/docs/frameworks/vite (fetched 2026-03-31) — **one** vendor’s rendering of generic Vite guidance
- Same vendor: environment variables, environments, Git integration, custom domains (fetched 2026-03-31)
- Vitest docs: https://vitest.dev — inaccessible during research session; findings based on training knowledge (MEDIUM confidence, knowledge cutoff August 2025)
- Supabase env vars: Training knowledge confirmed against project's existing `src/lib/supabase.ts` and `.env.example` (MEDIUM confidence)
- Project source: `src/lib/supabase.ts`, `src/store/dealsStore.ts`, `src/utils/leadScoring.ts`, `package.json`, `tsconfig.json`
---

*Last updated (git): **2026-04-21***
