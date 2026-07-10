# App Starter

Full-stack skeleton for internal tools and client-facing dashboards. Clone it, rename it, and build your features on top - auth, user management, permissions, and support are already done.

## What you get

- **Auth**: JWT login (httpOnly cookie + bearer token), rate-limited, forgot/reset/change password via Resend email
- **Roles**: `admin` / `internal` / `external` with route guards on both server and client
- **Seed admin**: first boot creates one admin (env-gated); the admin creates everyone else
- **User management** (`/users`): create/edit/deactivate/delete users, grant per-resource access to external users
- **View-as**: admins can preview the app as internal/external roles
- **Help & Support** (`/help`): ticket form with screenshots, delivered via email and optional GitHub issues
- **Audit log**: logins, user changes, access grants, denied route attempts
- **Stack**: React 19 + Vite + Tailwind + TypeScript, Express 5, PostgreSQL

## Quick start

```bash
# 0. Prereqs: Node 20+ and PostgreSQL running locally

# 1. Create a PostgreSQL database (any name; set it in server/.env)
createdb app_starter_dev
#    If createdb is not on PATH (common on Windows), use psql instead:
#    psql -U postgres -c "CREATE DATABASE app_starter_dev"

# 2. Configure the server
cp server/.env.example server/.env
#    - set DB_* (or DATABASE_URL)
#    - set ADMIN_PASSWORD (12+ chars) and keep ALLOW_DEFAULT_ADMIN_SEED=true for first boot
#    - set APP_NAME

# 3. Install and run
npm run install:all
npm run dev:server    # API on :3000 (schema + admin auto-created)
npm run dev:client    # UI on :5173, /api proxied to :3000
```

Log in with username `admin` and your `ADMIN_PASSWORD`. After first boot, set `ALLOW_DEFAULT_ADMIN_SEED=false`.

## Starting a new project from this template

1. Copy this folder (or use "Use this template" on GitHub / `npx degit you/app-starter my-app`)
2. Clean the copy: delete `server/.env` if it came along (it holds the previous project's local secrets - recreate it from `.env.example`), delete any `node_modules`/`dist`, then `rm -rf .git && git init` for a fresh history
3. Rename: `APP_NAME` in `client/src/config.ts`, `<title>` in `client/index.html`, `name` in the three package.json files, `APP_NAME` in `server/.env`
4. Replace the favicon in `client/public/`
5. Build your domain:
   - **Server**: replace the placeholder `resources` table (`server/db/postgres.js`) and routes (`server/routes/resources.js`) with your real entities. Keep the `resource_access` grant pattern for external users - `checkResourceAccess` in `server/middleware/auth.js` shows how.
   - **Client**: replace `components/Home.tsx`, add routes in `App.tsx` (wrap write pages in `WriteAccessRoute`), register nav items in `src/nav.tsx`, add API calls in `src/api.ts`.
6. Adjust the brand palette in `client/src/index.css` (CSS variables at the top)

## Layout

```
server/
  index.js            entry point: express app, static serving, route mounting
  config.js           env loading, JWT/cookie config, APP_NAME
  db/postgres.js      pool, query helpers, schema init, seed admin
  middleware/auth.js  authenticate, requireRole, checkResourceAccess, rate limiters
  routes/auth.js      login/logout/me, forgot/reset/change password
  routes/users.js     user CRUD, resource access grants, audit log
  routes/resources.js PLACEHOLDER domain routes - replace per project
  routes/support.js   support tickets (email + GitHub), status
client/src/
  config.ts           app name/tagline - change once per project
  nav.tsx             sidebar menu config - add your pages here
  api.ts              axios client + typed API functions
  viewMode.tsx        admin "view as role" context
  components/         Login, Home (placeholder), Sidebar, Layout,
                      UserManagement, HelpSupport, password screens
```

## Environment variables

See `server/.env.example` for the full list. Production requirements:

- `JWT_SECRET` - mandatory (server refuses to start without it)
- `NODE_ENV=production` - enables secure cookies
- `RESEND_API_KEY` + verified `FROM_EMAIL` - password reset and support email
- `ALLOW_DEFAULT_ADMIN_SEED` - keep `false` except on first boot

## Deployment

`npm run build` produces `client/dist`, which the server serves statically with client-side routing fallback. Deploy the repo with `npm start` (or point your platform at `server/index.js`) and provide `DATABASE_URL` or `DB_*` env vars.
