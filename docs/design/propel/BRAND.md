# Propel Brand System

Reference extracted from Propel Brand Book, App, and Landing mockups.

## Identity

| Property | Value |
|----------|-------|
| Product name | **Propel** |
| Tagline | Outbound-native CRM for sales teams |

## Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| `propel-green` | `#0C8A68` | Marketing backgrounds, primary brand |
| `propel-ink` | `#0C1F1A` | App shell, dark UI surfaces |
| `propel-mint` | `#44C2A0` | Primary accent, CTAs, active states |
| `propel-mint-light` | `#9BE8CE` | Highlights, logo secondary stroke |
| `propel-cream` | `#FBFAF7` | Text on green, light surfaces |

## Typography

- **Primary:** Hanken Grotesk (Google Fonts)
- Weights: 300 (light body), 400, 500, 600, 700

## Logo

Double chevron mark (two forward chevrons). Variants in `public/brand/`:

- `logo.svg` — full color on transparent
- `logo-mono.svg` — single color
- `logo-dark.svg` — for light backgrounds

## Voice

- Direct, confident, sales-team focused
- Emphasize speed, pipeline clarity, and AI assistance
- Avoid legacy product names in user-facing copy

## Implementation

- CSS tokens: `styles/tokens.css`
- Tailwind: `tailwind.config.ts` → `propel.*` colors
- Font: loaded in `app/layout.tsx` via `next/font/google`
