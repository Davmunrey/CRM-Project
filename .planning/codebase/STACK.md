# Technology Stack

**Analysis Date:** 2026-04-10

## Languages

**Primary:**
- TypeScript 5.9 - All source code in `src/` (strict mode enabled, `ES2022` target)

**Secondary:**
- SQL (PostgreSQL dialect) - Database schema in `supabase/schema.sql`
- CSS (via Tailwind utility classes) - Styles in `src/index.css` and component `className` props

## Runtime

**Environment:**
- Browser (SPA — no server-side runtime)
- Node.js required for build tooling only (Vite / tsc)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3 (`react`, `react-dom`) - UI rendering, hooks-based component model
- React Router DOM 6.30 (`react-router-dom`) - Client-side routing with `<BrowserRouter>`

**State Management:**
- Zustand 5.0 (`zustand`) with `persist` middleware — all global state lives in `src/store/*.ts`
  - `useAuthStore` — auth, users, sessions (`src/store/authStore.ts`)
  - `useAIStore` — model selection, conversations, enrichments (`src/store/aiStore.ts`)
  - `useEmailStore` — sent emails, Gmail threads and persisted thread links (`src/store/emailStore.ts`)
  - `useSettingsStore` — pipeline stages, currency, tags (`src/store/settingsStore.ts`)
  - 14 additional stores in `src/store/`

**Forms:**
- React Hook Form 7.71 (`react-hook-form`) with Zod 4.3 resolvers via `@hookform/resolvers`
- Zod used exclusively for schema validation on forms

**UI / Styling:**
- Tailwind CSS 3.4 (`tailwindcss`) — utility-first; config at `tailwind.config.js`
  - Custom navy color palette (dark theme)
  - Custom brand blue palette
  - Custom animations: `shimmer`, `slide-in`, `slide-up`, `fade-in`, `scale-in`, `pulse-glow`
  - Font: Inter (sans-serif)
- Lucide React 0.577 (`lucide-react`) — icon library
- `@hello-pangea/dnd` 18.0 — drag-and-drop (Kanban board in `src/pages/Deals.tsx`)
- Recharts 3.8 (`recharts`) — charts and data visualizations in reports/forecast pages

**i18n:**
- Custom Zustand-based i18n store (`src/i18n/index.ts`)
- Supported languages: English (`en`), Spanish (`es`), Portuguese (`pt`), French (`fr`), German (`de`), Italian (`it`)
- Translations at `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/pt.ts`, `src/i18n/fr.ts`, `src/i18n/de.ts`, `src/i18n/it.ts`

**Testing:**
- Vitest 4 (`vitest`) + jsdom + Testing Library
- Commands: `npm run test`, `npm run test:run`, `npm run test:coverage`
- Current baseline: 105 tests passing

**Build/Dev:**
- Vite 8.0 (`vite`) — dev server and production bundler; config at `vite.config.ts`
- `@vitejs/plugin-react` 6.0 — React fast-refresh and JSX transform
- TypeScript compiler (`tsc`) — type checking only (`noEmit: true`)
- PostCSS 8.5 + Autoprefixer 10.4 — CSS processing pipeline; config at `postcss.config.js`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.100 — database client and optional auth provider (`src/lib/supabase.ts`)
- `date-fns` 4.1 — date formatting and arithmetic throughout the codebase
- `uuid` 13.0 — UUID v4 generation for all entity IDs
- `zustand` 5.0 — all application state (see stores above)

**Infrastructure:**
- `@types/react` 18.3, `@types/react-dom` 18.3, `@types/uuid` 10.0 — TypeScript type definitions

## Configuration

**Environment:**
- Variables loaded by Vite from `.env` file (prefixed `VITE_`)
- Primary env vars (see `.env.example`):
  - `VITE_APP_CHANNEL` — `production` \| `staging` \| `demo`; omit in local dev → `development` (`src/lib/envChannel.ts`)
  - `VITE_SUPABASE_URL` — Supabase project URL (required for production/staging builds; optional for local demo or `demo` channel)
  - `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (same rules as URL)
- See `.env.example` for template
- OpenRouter API key is user-provided at runtime via settings store; sensitive server-only keys are kept in Supabase Edge Function env vars
- Google OAuth `clientId` is configured at runtime in Settings; refresh tokens remain server-side in Supabase (`gmail_tokens`)

**Build:**
- `tsconfig.json` — app source TypeScript config; path alias `@/*` → `./src/*`
- `tsconfig.node.json` — build tools TypeScript config (covers `vite.config.ts`)
- `tailwind.config.js` — Tailwind content paths and theme extensions
- `postcss.config.js` — PostCSS plugins

## Platform Requirements

**Development:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version`)
- `npm install` then `npm run dev`

**Production:**
- Static SPA — deployable to any static hosting (Netlify, Vercel, S3+CloudFront, etc.)
- Build: `npm run build` (runs `tsc && vite build`)
- No server-side code; all backend functionality is provided by Supabase

---

*Stack analysis: 2026-04-10*
