# Contributing

Thanks for helping improve Velora. Changes should be focused, reviewable, and consistent with the behavior of the working application.

## Local setup

1. Use Node.js 22.22.2+, 24.15+, or 26+ and npm. These versions satisfy the test toolchain requirements; CI and Netlify use the version pinned in `.nvmrc`.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Keep provider secrets out of the browser and out of commits.
4. Run `npm run dev` to start the application and development API middleware.
5. Public demo-account provisioning is disabled by default in configured deployments. Enable it only for an isolated demo environment, never for production data.

## Before opening a pull request

```bash
npm run lint
npm run build
npm run sql:check
npm run verify
```

If a test requires a live provider, state clearly which behavior was verified with mocks and which needs manual verification against a configured account.

## Pull request expectations

- Describe the problem and why the change is needed.
- Include concise testing notes and screenshots for visible UI changes.
- Keep database changes in ordered files under `supabase/migrations/`, then regenerate `supabase/APPLY_ALL.sql` with `npm run sql:bundle`.
- Add regression coverage for corrected behavior.
- Do not commit secrets, real user data, dependency folders, build outputs, or machine-specific files.
- Never grant privileged roles from browser-controlled input; use the server-side provisioning path and database protections.
