# Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260101000000_initial_schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Set `VITE_APP_MODE=production` when ready.
6. Never use the service-role key in frontend code.

## Applying migrations

Run migrations in filename order. The preferred workflow is:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Review each file before pushing. Several migrations are defensive
(`if not exists`, `on conflict do nothing`) and are safe to re-run.

## Optional medicine photos

`20260104000000_medicine_images_and_storage.sql` adds optional medicine photos.
It is **prepared but not applied** by this change set.

It does three things:

1. Adds `public.medicines.image_path` (nullable).
2. Creates a public `medicine-images` storage bucket with a 5 MB limit and
   JPG/PNG/WebP-only uploads.
3. Adds storage RLS policies so only active `owner`, `manager`, or `pharmacist`
   members of the pharmacy in the object path can upload, replace, or delete
   photos. The path format is `<pharmacy_id>/<medicine_id>/<uuid>-<name>`.

Apply it only after reviewing it:

```sh
supabase db push
```

Until this migration is applied, medicine photo uploads fail. The rest of the
application (including inventory, sales, and medicine creation without a photo)
continues to work, and missing photos show a neutral placeholder.

The bucket is public because the client uses `storage.getPublicUrl()` to resolve
photos. URLs include pharmacy and medicine UUIDs plus a random file UUID, so they
are not enumerable. If you need private photos instead, change the bucket to
private and update `resolveMedicineImageUrl` in
`src/services/medicineImageService.js` to request signed URLs.

## Role model

The database check constraint still allows `owner`, `manager`, `cashier`, and
`pharmacist` so existing deployments keep working. The application exposes only
two roles:

- **Owner** — inventory, purchases, packaging, staff, settings, and oversight.
- **Cashier** — records sales and views day-to-day sales/inventory.

`src/utils/roles.js` maps legacy `manager` and `pharmacist` members to the owner
capability set. Server-side authorization remains enforced by the existing RLS
policies and RPC functions; no frontend control grants access on its own.
