# Security policy

## Supported versions

Security fixes are applied to the current default branch. If this repository is used for a deployment, keep its production branch updated and redeploy reviewed fixes promptly.

## Reporting a vulnerability

Do not publish exploit details, access tokens, credentials, private customer records, or other sensitive data in a public issue. Contact the repository maintainer privately through the contact method available on the hosting profile and include a concise description, impact, reproduction steps, and affected commit/version. Allow a reasonable time to investigate before disclosing details.

## Deployment checklist

- Apply every migration in `supabase/APPLY_ALL.sql`, including RLS tightening.
- Keep the Supabase service-role key, Google OAuth client secret, Calendar refresh token, mail API keys, QR signing secret, and cron secret server-side.
- Configure database policies for the actual data-access model and verify them using both authenticated and unauthenticated sessions.
- Use a unique production `QR_SIGNING_SECRET` and `CRON_SECRET`; do not rely on development fallbacks.
- Restrict Supabase Auth redirect URLs to known origins and enable only providers that have been configured and tested.
- Treat local/demo mode as sample data only. Do not store real personal or booking information in local demo storage.
- Public cloud demo identities are disabled by default. Never enable `ENABLE_PUBLIC_DEMO_ACCOUNTS` / `VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS` on a production deployment or any environment with real records.
