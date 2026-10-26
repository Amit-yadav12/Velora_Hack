# Velora: judge-facing demo guide

This guide keeps the demo short, reproducible, and honest about what is live versus simulated. Use the deployed build you have actually tested—not screenshots alone.

## Before presenting

- Open the deployed app in a fresh browser profile and confirm the intended base URL loads.
- Confirm whether the app is using a configured Supabase project or local demo mode. If the setup notice says local demo, say so.
- If using Supabase, verify sign-in, booking persistence, role permissions, QR verification, and at least one Realtime update with test accounts.
- Use sample listings and clearly labelled test records only. Never enter a real customer's personal information in a public demo.
- Keep a second browser window ready for the business console so the judge can see the customer and operator sides of the same flow.
- Do not promise SMS, email, OAuth, Maps, or Calendar integrations unless you have personally tested them with the deployed credentials.

## Two-minute walkthrough

### 0:00–0:20 — The problem

“Booking a local service often means searching in one place, calling to confirm in another, and losing track of the appointment afterwards. Businesses also need a practical way to manage capacity and check people in. Velora brings those steps into one workflow.”

### 0:20–0:45 — Discovery and fit

“Here I can search for a service and compare available options. The ‘Best match’ score is intentionally explainable: it uses the signals available in the listing, such as rating, distance and availability. It is a deterministic heuristic, not a claim that a trained model knows the objectively best business.”

Show a listing with its match explanation. Point out which signals exist and which are missing. Do not imply a distance or availability signal is live if it comes from sample data.

### 0:45–1:15 — Booking and verification

“After selecting a service and slot, Velora creates a booking record and a verifiable ticket. The signed QR payload can be checked by the business side, so a ticket is not accepted merely because it contains a plausible booking ID.”

Create a test booking, open the ticket, then verify it from the business console. If the app is in local demo mode, say that the record is stored in the browser's isolated demo store.

### 1:15–1:40 — Business operations

“On the operator side, the same workflow supports appointment visibility, service and staff management, and ticket checks. With Supabase configured, supported records can sync across sessions; in local demo mode, the shared demo store is browser-local and is not a production multi-user database.”

Show the booking appearing in the business console. Avoid calling a simulated client-side pulse or sample dataset a live production feed.

### 1:40–2:00 — What is technically distinctive

“The engineering focus is not just the booking form: it is capacity-aware slot generation, server-side validation, role and database policies, signed QR tickets, and timezone-safe scheduling. AI enrichment is optional; the core recommendation remains explainable without a paid model API.”

Close with the next validation milestone: test with a small group of local businesses and measure booking completion, scheduling conflicts, and task time before making impact claims.

## Judge questions to prepare for

**What is actually AI?** The service-fit score and slot explanation are deterministic heuristics. Optional AI concierge enrichment is separate and requires `OPENAI_API_KEY`. Describe that distinction precisely.

**What works without credentials?** Local demo flows use sample data and browser-local storage. Supabase persistence/Realtime and third-party providers need their own configuration and an end-to-end deployment test.

**How is the booking secured?** Explain the server-side validation, capacity/conflict checks, role controls and HMAC-signed QR ticket verification. Do not claim an endpoint or database policy is secure based only on its name; be prepared to point to the code and migration.

**How will you prove impact?** There are no product-impact metrics in this repository that should be presented as measured outcomes. Propose a pilot and report observed results, sample size and method after conducting it.

**Why not use an existing scheduler?** Position Velora around a single journey for discovery, explainable fit, slot selection, check-in verification and local-service operations. Do not claim it is the first booking or scheduling platform.

## Evidence worth collecting for a real pilot

Record a baseline before claiming improvement:

- Median time a customer needs to find and book a suitable slot.
- Booking completion and abandonment rates.
- Number of overlapping or incorrectly allocated bookings.
- Check-in time using QR verification versus the current process.
- Customer and operator satisfaction, with the survey wording and sample size documented.

Report observed numbers with dates, sample size, and limitations. If a measure was simulated, label it a simulation and keep it out of the impact results.
