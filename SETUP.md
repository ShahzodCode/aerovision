# Setup notes (for the site owner)

## Database (Supabase)
Run these in Supabase -> SQL Editor, in order:
1. `supabase/schema.sql`
2. `supabase/update-2.sql` (blog, emails on profiles, admin tools)
3. `supabase/update-3.sql` (editable site text)

Make an account admin (use your own email):
```sql
update public.profiles set role = 'admin' where email = 'YOU@example.com';
```
Authentication -> Providers -> Email: turn off "Confirm email" for instant sign-up while testing.
Authentication -> URL Configuration: set Site URL to the published site address.

## Run locally
```
npm install
npm run dev
```
The Supabase URL and public (publishable) key are in `src/supabase.ts`. To use other values, put
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `.env` file (see `.env.example`).

## Publishing
Every push to `main` is built and published to GitHub Pages by `.github/workflows/pages.yml`
(Settings -> Pages -> Source: GitHub Actions).
