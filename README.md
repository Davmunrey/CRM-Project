# Propel

AI-native, outbound-focused CRM for sales teams — built on **Next.js**, **Supabase**, and **Vercel**.

## Stack

- **Frontend:** Next.js 15 App Router, React 18, Tailwind, Zustand
- **Backend:** Supabase (Auth, PostgreSQL + RLS, Edge Functions, Realtime)
- **Deploy:** Vercel

## Quick start

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project

npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing landing; CRM routes (`/login`, `/contacts`, …) load the app shell.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run check:branding` | Fail if legacy product name appears in source |
| `npm run typecheck` | TypeScript |

## Brand

See [docs/design/propel/BRAND.md](docs/design/propel/BRAND.md).

## License

Internal — Clovr Labs
