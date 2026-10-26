# Changelog

## 0.1.2 — Hackathon demo trust and polish

- Centralize sample listing classification and disclose sample ratings/opening-hour estimates consistently across cards and detail pages.
- Improve the judge demo path with explainable recommendation signals, timezone-safe opening labels, and a practical demo guide.

## 0.1.1 — Discovery and timezone reliability

- Shared one explainable service-fit scorer between the browser and discovery API; removed hidden ranking boosts from synthetic popularity, review counts and featured flags.
- Separated opening-hours windows from confirmed appointment availability in the ranking, copy and judge demo guide.
- Made generated business descriptions, ratings, reviews and wait estimates clearly illustrative; removed fabricated popularity claims.
- Made next-opening labels, slot APIs, concierge date parsing, heatmap aggregation, travel-time labels and time-based pricing use Asia/Kolkata explicitly.
- Added timezone regression coverage that runs in UTC, US Pacific and Asia/Kolkata in CI.
- Added a two-minute hackathon demo guide with a reproducible walkthrough, likely judge questions and a non-fabricated impact evaluation plan.

## 0.1.0 — Repository hardening

- Added a safe `.env.example` and aligned setup instructions with the actual runtime variables.
- Connected Google sign-in and phone OTP to Supabase Auth flows; both remain provider-configured integrations.
- Made public cloud demo-account UI and server-side provisioning opt-in, preventing the demo admin path from being enabled accidentally on a production deployment.
- Kept server-only variables out of the Vite client bundle and replaced Vite's unrestricted dev-host setting with an explicit trusted-host option.
- Hardened profile-cache role handling and added dependency-free security regression checks.
- Added a GitHub Actions CI workflow, maintainer/security guidance, and durable architecture notes.
- Replaced blurred generic app artwork with a coherent vector brand mark and a 1200×630 social preview.
- Added dependency-free asset/metadata checks to local verification and CI.
- Pinned the CI and Netlify build runtime through `.nvmrc` for reproducible installs.
- Removed unused Vite starter artwork and workspace-only source-tracking hooks.
