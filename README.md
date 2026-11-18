# PharmaTrack

Pharmacy management app for sales, inventory, purchases, packaging, expiry tracking, and reporting.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your Supabase project values:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_APP_MODE=local
   ```

   - Use `VITE_APP_MODE=local` to run the built-in demo data with no backend.
   - Use `VITE_APP_MODE=production` to connect to Supabase.

   The real `.env` is intentionally **not committed** — it stays on your machine. Only `.env.example` lives in this repository. Never commit real credentials.

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Supabase

Database migrations live in `supabase/migrations`. Apply them to your Supabase project before running the app in production mode.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run lint` | Run Oxlint |
| `npm test` | Run the Vitest suite |
| `npm run build` | Build for production |

## Tech notes

- React + Vite, Oxlint, Vitest.
- Excel/CSV imports are parsed locally with SheetJS, loaded in a separate lazy chunk.
- Reports use a dependency-free SVG chart and period-aware CSV export.
