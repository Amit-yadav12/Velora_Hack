# Velora — Deployment Guide

This guide covers production deployment for Netlify + Supabase + Google OAuth.

---

## 1. Overview

- **Frontend**: Vite + React, built to `dist/`
- **Backend**: `api/*.js` serverless functions (Vercel + Netlify compatible)
- **Database**: Supabase Postgres (14 tables, RLS, realtime)
- **Images**: 36 real category photos in `public/biz/*.jpg` (zero picsum)
- **Site origin**: set `APP_URL` and `VITE_APP_URL` to the deployed origin. The existing Netlify demo URL is a fallback for preview metadata; the build rewrites canonical HTML metadata, `sitemap.xml`, and `robots.txt` when a deployment origin is configured.

---

## 2. Netlify Setup

### 2.1 Connect Repository
1. In Netlify dashboard → **Add new site → Import from GitHub**
2. Select [`Amit-yadav12/Velora_12`](https://github.com/Amit-yadav12/Velora_12)
3. Build settings are in `netlify.toml`:
   - Build command: `npm run build`
   - Publish: `dist`
   - Functions: `netlify/functions`

### 2.2 Environment Variables (Netlify → Site settings → Environment variables)

```
# Site origin — set these for every deployment. They decide where QR verify
# links, calendar invites, share links, canonical metadata, sitemap and robots
# point. Use the exact origin of THIS site (no trailing slash).
APP_URL=https://<your-site>.netlify.app
VITE_APP_URL=https://<your-site>.netlify.app

VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_MAPS_API_KEY=<optional-maps-key>

# Server-side (Netlify Functions)
SUPABASE_URL=https://<project>.supabase.co
# Existing deployments may keep NEXT_PUBLIC_SUPABASE_URL as a legacy alias.
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>
GOOGLE_MAPS_API_KEY=<optional>
RESEND_API_KEY=<optional-email>
SENDGRID_API_KEY=<optional-email-fallback>
EMAIL_FROM=Velora <bookings@yourdomain.com>
CRON_SECRET=<random-32-char-secret-for-scheduled-reminders>
# HMAC secret for signed QR verification tokens. The variable is
# QR_SIGNING_SECRET (api/_lib/qr.js reads this exact name); anything else
# silently leaves QR signing on the loud dev fallback.
QR_SIGNING_SECRET=<random-32-char-for-QR-signing>

# Google Calendar sync (optional) — refresh-token chain, see §7-C
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_REFRESH_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Leave false in production. Only enable for an isolated showcase with sample data.
ENABLE_PUBLIC_DEMO_ACCOUNTS=false
VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=false
```

> **Security**: Never commit `.env` files. Use Netlify env UI only.
>
> **Why `APP_URL` is not in `netlify.toml`**: values declared in
> `[build.environment]` **override** the same keys set in the Netlify UI
> ([docs](https://docs.netlify.com/build/environment-variables/overview/)). A
> hardcoded origin there would silently win over whatever you type in the
> dashboard, on every site you ever deploy from this repo.

### 2.3 Functions Adapter
- `netlify.toml` redirects `/api/*` → `/.netlify/functions/api-adapter/:splat`
- `netlify/functions/api-adapter.js` dynamically loads handlers from `api/*.js`
- `netlify/functions/process-reminders.js` runs every 15 min (see schedule below)

### 2.4 Scheduled Reminders (15-min)
In `netlify.toml`:
```toml
[functions."process-reminders"]
  schedule = "*/15 * * * *"
```
- The function `process-reminders.js` also exports `config.schedule` for compatibility.
- It requires `CRON_SECRET` env — the scheduler injects it automatically.
- Manual trigger: `POST https://your-site.netlify.app/api/process-reminders` with `Authorization: Bearer <CRON_SECRET>`

### 2.5 Deploy
- Push to `main` → Netlify auto-deploys in ~3-5 min.
- If old build persists, run **Deploys → Trigger deploy → Clear cache and deploy site**

---

## 3. Vercel Alternative (Optional)

Vercel works natively with `api/*.js`:
- Build: `npm run build`
- Output: `dist`
- `vercel.json` has SPA rewrite: `/(?!api/).*` → `/index.html`
- Set same env vars in Vercel dashboard.

---

## 4. CI

GitHub Actions runs on pushes and pull requests. It uses the Node.js version pinned in `.nvmrc`, installs from `package-lock.json`, then runs:

- `npm ci`
- `npm run lint`
- `npm run build` (TypeScript project checks + Vite production build)
- `npm run verify:security` and `npm run verify:assets`
- `npm run verify:site-origin` (custom deployment origin regression checks)
- `npm run sql:check` (ensures `APPLY_ALL.sql` matches the ordered migrations)
- `npm run verify:recommendations`
- `npm run verify:timezone` under UTC, US Pacific, and Asia/Kolkata
- `npm run verify:demo`
- `npm run verify:integrations` (calendar OAuth, email providers, QR, IST, booking guards)
- `npm run verify:app` (real `App.tsx` + API handlers under jsdom)

---

## 5. Production Checks (Before Push)

```bash
npx tsc -b               # typecheck passes
npx eslint .             # zero lint errors
npm run build            # production build passes
npm run verify           # security + assets + recommendation + timezone + SQL + demo + integration + app + site-origin checks
# Check for remote stock-image fallbacks in executable code (comments excluded by review).
rg -n 'https?://[^"'"'"' ]*(picsum\.photos|source\.unsplash\.com)' src api
```

- Business images must be `/biz/*.jpg`, not `picsum.photos`
- `public/biz/` should contain 36 real JPGs

---

## 6. Supabase Setup (Dashboard Tasks)

### 6-A. Run Migration

1. In Supabase dashboard → **SQL Editor → New query**
2. Paste the entire generated file `supabase/APPLY_ALL.sql` (it applies migrations 0001, 0002, and 0003 in order).
3. Click **Run** and verify the final sanity check returns 14 tables.
4. Verify these tables were created:
   - `profiles`, `businesses`, `business_services`, `business_staff`,
   - `bookings`, `booking_meta`, `booking_history`, `reminders`,
   - `notifications`, `recently_viewed`, `email_log`, `audit_logs`,
   - `idempotency_keys`, `invoices`

### 6-B. Auth Settings

#### Email confirmation

Keep **Confirm email** enabled for production accounts and make sure your email delivery configuration is working. For a separate, isolated demo deployment, you may disable confirmation if you need a faster walkthrough; do not use that shortcut for a production workspace.

#### Demo accounts (isolated demo deployments only)

The local demo needs no hosted accounts. In a cloud deployment, public demo
account buttons and role provisioning are disabled by default. Only for a
separate demo site with synthetic data, set both `VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=true`
(build environment) and `ENABLE_PUBLIC_DEMO_ACCOUNTS=true` (server environment).
Then create the two demo users if they do not already exist:

- `customer@velora.ai` / `velora123`
- `admin@velora.ai` / `velora123`

Never enable public demo accounts in a production workspace or use these demo
credentials for real customer/business records. For normal use, owners should
create a business account through the app and assign any privileged access only
through a trusted operator workflow.

> Do **not** hand-write `update profiles set role='admin'`. Migration 0002
> installs `protect_profile_role`, which rejects role changes from non-service
> sessions. Use `supabase/PROMOTE_ADMIN.sql` only as a deliberate, trusted SQL
> Editor operation for a specific real owner account.

#### Site URL (auth callbacks + password reset)
1. **Authentication → URL Configuration**
2. **Site URL** = the exact origin of the deployed site (e.g. `https://<your-site>.netlify.app`)
3. Add the same origin to **Redirect URLs**

### 6-C. RLS & Realtime

- RLS is enabled by migration; policies allow public read for businesses/services, owner-only for bookings, owner-scoped reads for `booking_meta`/`booking_history`, and **service-role-only writes** for `reminders`, `email_log`, `audit_logs`, `idempotency_keys` (see `0003_rls_tightening.sql`).
- Realtime: migration adds `bookings`, `notifications`, `reminders`, `businesses`, `booking_history` to `supabase_realtime` publication.
- Verify in **Database → Realtime** that those tables show as enabled.

### 6-D. Storage (Optional, for future uploads)

If you add user uploads later:
1. **Storage → Create bucket** `biz-photos` (public)
2. Set policy: public read, authenticated write.

---

## 7. Authentication Providers

### 7-A. Google sign-in (Supabase Auth)

Velora starts Google OAuth through Supabase Auth's hosted OAuth flow. The browser does not handle the Google client secret or a custom token-exchange proxy.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project.
2. Configure the OAuth consent screen for your intended audience.
3. Create an OAuth client ID of type **Web application**.
4. Add the Supabase callback URL under **Authorized redirect URIs**:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. In **Supabase → Authentication → Providers → Google**, enable Google and paste the client ID and client secret. Save.
6. In **Supabase → Authentication → URL Configuration**, set the Site URL to the deployed app origin and add redirect allow-list entries for `https://<your-site>/**` and `http://localhost:5173/**` during local development. The callback includes `next` and selected-role query parameters.
7. Add the deployed domain and `http://localhost:5173` to the OAuth client's authorized JavaScript origins when required by your Google configuration.
8. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the app host and deploy. There are no `VITE_GOOGLE_CLIENT_ID` or custom proxy variables for this flow.

From `/welcome`, **Continue with Google** redirects to Google consent and returns through Supabase. When provider setup is missing, the page displays an actionable setup message rather than simulating a Google identity.

### 7-B. Phone OTP (Supabase Auth)

1. In **Supabase → Authentication → Providers**, enable Phone authentication.
2. Configure a supported SMS provider and its credentials in the Supabase dashboard.
3. Review SMS rate limits, allowed regions, OTP expiry, and abuse controls before enabling publicly.
4. Deploy the app with a configured Supabase URL and anon/publishable key.
5. From `/welcome`, choose **Continue with Phone**, enter an E.164 number (for example `+91 98765 43210`), request the code, and verify the received SMS.

Phone OTP is not sent by the local demo mode; the screen says so explicitly. An SMS provider, valid Supabase project and its provider configuration are required for real messages.

### 7-C. Google Calendar sync (optional, server-side)

Bookings create a calendar event for the customer **and** the business. Two
credential modes, best first:

| Mode | Env vars | Lifetime |
| --- | --- | --- |
| **Refresh-token chain** (recommended) | `GOOGLE_CALENDAR_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | permanent — access tokens are minted on demand, cached, and re-minted when Google rejects one |
| Static access token (legacy) | `GOOGLE_CALENDAR_ACCESS_TOKEN` | ~1 hour, then sync stops |

To get a refresh token: create an OAuth client in Google Cloud, enable the
Calendar API, complete one consent for the `calendar.events` scope with
`access_type=offline&prompt=consent`, and copy the `refresh_token` from the
response. Set `GOOGLE_CALENDAR_ID` to leave it on `primary`.

With no credential configured, bookings still confirm — the calendar step is
reported as **not configured** and logs a `evt_...` placeholder. It never
reports a Google event that does not exist.

### 7-D. Testing authentication

1. Start with `npm run dev` and open `/welcome`.
2. Test email/password using a dedicated test account.
3. Test Google OAuth only after enabling the provider and allow-listing the exact redirect URL; it uses a full-page OAuth redirect, not a popup.
4. Test phone OTP with a controlled test number and verify that Supabase Auth records the verified user.
5. Confirm an ordinary customer cannot access `/admin`; admin roles must be assigned through the trusted server/database provisioning path.

---

## 8. Post-Deploy Verification

1. **Live site**: your deployed origin (`$APP_URL`)
   - Business images should be `/biz/*.jpg`, not `picsum.photos`
   - `/welcome` renders role selection
   - Search works, category filter works

2. **API**:
   - `$APP_URL/api/discover?city=Jaipur` → JSON with `results` array, each with `image_url: /biz/...`
   - `$APP_URL/api/businesses?city=Jaipur` → list
   - `$APP_URL/api/verify-booking?token=...` → validation

3. **Booking flow**:
   - Pick business → service → date → slot → book (as demo customer)
   - Check `bookings` table in Supabase has new row
   - Check `notifications` has confirmation

---

## 9. Troubleshooting

- **Old build still serving picsum**: Netlify → Deploys → Trigger deploy → Clear cache and deploy site. Wait 3-5 min, hard reload.
- **API 404**: Check `netlify.toml` redirects, ensure `netlify/functions/api-adapter.js` exists, check function logs in Netlify dashboard.
- **Supabase 401**: Check anon key and service_role key env, RLS policies.
- **Google OAuth fails**: Check redirect URI in Google Console matches Supabase callback, and Supabase provider enabled.
- **Reminders not firing**: Check `CRON_SECRET` set, check function logs, manually POST to `/api/process-reminders` with Bearer token.
- **Business demo is unavailable on a configured deployment**: this is expected unless the site is an isolated showcase. Set both `VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=true` (build environment) and `ENABLE_PUBLIC_DEMO_ACCOUNTS=true` (server environment) only for a site with synthetic data.
- **Business demo cannot receive console access**: check the `/api/provision-demo` response and server logs. A 404 means public demo provisioning is disabled; a 409 means the auth/profile row or database setup is incomplete; a 503 means `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing or unavailable.
- **QR codes point at the wrong domain**: set `APP_URL` to the site origin. The QR helper resolves `APP_URL` → request host → the platform's `URL`/`DEPLOY_PRIME_URL`, and never falls back to a stale domain.
- **Calendar events stop appearing after an hour**: you are on a static `GOOGLE_CALENDAR_ACCESS_TOKEN`. Switch to the refresh-token chain (§7-C).

---

## 10. Final Checklist for Owner

- [ ] Paste `supabase/APPLY_ALL.sql` into the SQL Editor and run it (applies 0001 + 0002 + 0003 in order; ends with a `velora_tables = 14` check).
- [ ] If a trusted business owner needs pre-provisioned access, update the email in `supabase/PROMOTE_ADMIN.sql` and run it as an operator.
- [ ] Keep email confirmation enabled for production; disable it only on a separate demo/staging site if required.
- [ ] Keep both public-demo flags disabled unless this is an isolated showcase with synthetic data.
- [ ] Set Site URL + Redirect URLs to the deployed origin (Auth → URL Configuration)
- [ ] Google OAuth setup per §7-A; phone OTP per §7-B if enabled; Calendar sync per §7-C (optional)
- [ ] Set all env vars in Netlify dashboard — **including `APP_URL` and `VITE_APP_URL`**
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed
- [ ] Trigger deploy → Clear cache and deploy site
- [ ] Test booking on phone: search → business → slot → confirm → verify QR
- [ ] Check email_log table for confirmation emails
- [ ] Confirm the business demo opens `/admin` (not the customer app)

---

## 11. Demo Tenant and Business Registration

### 11-A. Demo tenant isolation

All demo entities live in the browser under `velora-demo-*` / `velora-local-*` localStorage keys, tagged `tenant_id = demo-tenant-velora`:
`velora-demo-businesses`, `velora-demo-services`, `velora-demo-staff`, `velora-demo-customers`, `velora-local-bookings`, `velora-local-invoices`, `velora-local-notifs`.

- The **Demo Customer** and **Demo Business** consoles read/write the SAME demo dataset (bookings made by the demo customer appear on the dashboard instantly, and business actions reflect back to the customer in real time — same tab via CustomEvent, cross-tab via the storage event).
- **Reset demo** (Admin sidebar / Dashboard) clears ONLY the keys above and re-seeds the showcase businesses. Production Supabase data is never touched.
- Demo bookings are created as `pending` and confirmed by the business — the full PENDING → CONFIRMED → COMPLETED / CANCELLED state machine.

### 11-B. Business account registration

`/welcome` → Business → **Create Business Account** (2 steps: owner account → business profile).

- With Supabase configured: the owner signs up, then `POST /api/register-business` (auth token required) grants the `admin` role SERVER-SIDE and creates the `businesses` row (with `owner_user_id`) + starter services.
- Migration `0002` locks roles: profiles can only be inserted as `customer` by clients, and a trigger blocks any role change that isn't from the service role. `admin` can ONLY be granted via `/api/register-business` or `/api/provision-demo` (allowlisted demo emails).
- Public demo accounts (`admin@velora.ai` / `customer@velora.ai`, password `velora123`) provision through `/api/provision-demo` only when the deployment explicitly opts in. The UI requires `VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=true` as well.

### 11-C. New API endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/register-business` | session | Business registration; grants console role server-side, creates business + services |
| `POST /api/provision-demo` | opt-in public demo only | Provisions fixed demo identities when `ENABLE_PUBLIC_DEMO_ACCOUNTS=true`; otherwise returns 404 |

### 11-D. Demo verification limits (honest behavior)

- Demo-tenant QR tickets (`local.*` tokens) verify in the browser session where they were booked (the token carries no PII; the booking record is checked for live status). Server bookings use HMAC-signed `v1.*` tokens that verify anywhere.
- Demo-tenant bookings do not send real email (in-app notifications instead). Server bookings queue real email when `RESEND_API_KEY`/`SENDGRID_API_KEY` is set, with a Gmail-compose fallback always available.
