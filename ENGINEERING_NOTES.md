# Engineering Notes

This document describes the current application boundaries and the checks that matter before a release. Deployment-specific steps and provider setup live in [DEPLOY.md](DEPLOY.md); the security reporting process is in [SECURITY.md](SECURITY.md).

## Application boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Customer and business UI | `src/pages/`, `src/components/` | Discovery, booking, account flows, business operations and shared UI |
| Authentication state | `src/contexts/AuthContext.tsx`, `src/lib/googleAuth.ts` | Supabase session/profile sync and hosted Google OAuth |
| Demo-mode client | `src/lib/supabase.js`, `src/lib/demoStore.ts` | Local demo identities and sample booking data when Supabase is not configured |
| API handlers | `api/*.js` | Booking, discovery, business registration, notifications, reminders and verification |
| Shared API controls | `api/_lib/` | Authentication, role checks, validation, QR signing, calendar and email adapters |
| Hosting adapters | `netlify/`, `netlify.toml`, `vercel.json` | Reuse API handlers on supported serverless hosts |
| Database | `supabase/migrations/`, `supabase/APPLY_ALL.sql` | Ordered schema, role protections and row-level security policies |
| Verification | `scripts/`, `.github/workflows/ci.yml` | Build checks, migration consistency and demo/integration/application tests |

## Authentication and authorization

- The frontend uses the Supabase publishable/anon key and must not contain a service-role key.
- Google sign-in and phone OTP use Supabase Auth. The Google client secret and SMS provider credentials belong in the provider configuration, not browser environment variables.
- A cached profile is only a UI convenience; a cached role is not accepted as proof of production admin access. Database policies and server-side role checks must remain the authorization boundary.
- Business registration is handled by the server route after the user has authenticated. Apply all migrations in `supabase/APPLY_ALL.sql` so role-lock and RLS protections are present.
- Local demo mode stores sample data in the browser and is not a shared database or an identity system. Do not enter real customer information into it.
- Cloud demo accounts use a fixed public demo identity. Their UI and server-side provisioning are disabled by default when Supabase is configured. Enable both `VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=true` and `ENABLE_PUBLIC_DEMO_ACCOUNTS=true` only on a separate demo deployment populated exclusively with synthetic data. Never enable the public admin demo in production.

## External integrations

| Integration | Source path | Required external setup |
| --- | --- | --- |
| Supabase Auth, PostgreSQL and Realtime | `src/lib/supabase.js`, `api/db-client.js`, `supabase/` | Project keys, schema migrations, correct RLS policies and Realtime publication |
| Google Maps / Places | `src/lib/googleMaps.ts`, `api/places.js`, `api/geocode.js` | Restricted browser key for browser maps; server key for server API calls; enabled APIs and quota |
| Google Calendar | `api/_lib/calendar.js` | Calendar API and server-side refresh-token/client credentials; without these, the app reports a fallback rather than inventing an event |
| Email | `api/_lib/email.js` | A configured Resend, SendGrid or SMTP relay account and sender identity |
| AI concierge | `api/concierge.js` | `OPENAI_API_KEY` for model-backed responses; rule-based fallback remains available |
| Booking QR tickets | `api/_lib/qr.js`, `api/verify-booking.js` | Strong, private `QR_SIGNING_SECRET` for signed server-backed tickets |
| Scheduled reminders | `api/process-reminders.js`, `netlify/functions/process-reminders.js` | Host scheduler and private `CRON_SECRET` |

The presence of an integration adapter in the repository does not prove that the target deployment has credentials, provider permissions, billing, allowed origins, or working network access. Verify each enabled integration with a controlled account after deployment.

## Release checks

Run these from the repository root using Node.js 22.22.2+, 24.15+, or 26+:

```bash
npm ci
npm run lint
npm run build
npm run sql:check
npm run verify:security
npm run verify:assets
npm run verify:recommendations
npm run verify:timezone
npm run verify:demo
npm run verify:integrations
npm run verify:app
```

`npm run verify` runs the security, asset, recommendation, timezone, SQL bundle, demo, integration and application checks together. Provider tests use controlled/mocked responses where appropriate; they do not validate live OAuth consent, actual SMS/email delivery, production database permissions, Maps billing or Calendar event creation. Those require post-deploy checks in [DEPLOY.md](DEPLOY.md).

Before releasing, confirm all of the following:

- `supabase/APPLY_ALL.sql` matches the ordered migration files and has been applied to the target project.
- Customer and business accounts are tested separately; a customer cannot reach protected admin APIs.
- Google OAuth and phone OTP work with the exact allow-listed origins and provider settings.
- Public demo-account flags remain disabled unless the target is an isolated showcase environment with synthetic data.
- Service-role, calendar, mail, OpenAI, QR-signing and cron secrets exist only in server-side configuration.
- The CI workflow passes on the exact commit being deployed.


## Explainable discovery ranking

Customer discovery uses a deterministic fit heuristic rather than calling the ranking itself an AI model. The score is computed from available customer rating, distance, and availability signals; missing signals are excluded from the denominator. The UI exposes the contributing factors and the reasons for a match. The AI concierge, when configured, is an optional layer and does not silently change the core score.

Slot suggestions rank available times using estimated wait, nearby booking load, and time-of-day preferences. The booking flow explains those signals and explicitly labels wait/crowd figures as estimates, not a live queue sensor or guarantee. The dependency-free regressions in `scripts/verify-match-score.mjs` cover score bounds, relative ranking, missing-data handling, and explanation honesty.


## Discovery ranking and time semantics

The customer-facing “Best match” score is a deterministic heuristic shared by the browser and the discovery API (`src/lib/matchScore.js`). It uses only available listing signals: rating, measured distance, and reported opening status. Unknown factors are omitted instead of being silently treated as bad values. Sample listings use illustrative rating copy and do not receive fake review-count boosts. The legacy `ai_score`/`ai_reason` fields are compatibility aliases; the UI labels the output as a match score, not an AI prediction.

The discovery card’s “opening window” is derived from reported business hours and is not a promise that an appointment slot is free. The booking flow checks the selected service duration and existing reservations separately. Waiting-time and crowd labels are estimates based on booking data or the demo fixture, not live queue sensors.

Appointment instants, labels, weekday calculations, the heatmap and concierge date interpretation use `Asia/Kolkata` explicitly. The timezone regression script is deliberately dependency-free and should pass under `TZ=UTC`, `TZ=America/Los_Angeles`, and `TZ=Asia/Kolkata`.

For a reproducible, judge-facing walkthrough and likely technical questions, see [`HACKATHON_DEMO.md`](HACKATHON_DEMO.md).


### Demo-data disclosure

`src/lib/sampleData.js` is the shared browser-side classifier for local/demo catalogue entries. Ratings, opening-hours estimates, and booking routes should preserve that distinction in the UI; do not imply that sample content comes from verified third-party providers.
