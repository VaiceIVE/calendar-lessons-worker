# edu-scheduler

Syncs [OMGTU rasp](https://rasp.omgtu.ru/) group schedule into Google Calendar via a **service account**.

## Setup

1. `npm install`
2. Copy `.env.example` → `.env`.
3. From the service account JSON, set:
   - `GOOGLE_CLIENT_EMAIL` ← `client_email`
   - `GOOGLE_PRIVATE_KEY` ← `private_key` (keep `\n` escapes inside double quotes)
4. In Google Calendar: create (or pick) a calendar → **Share with** `GOOGLE_CLIENT_EMAIL` → permission **Make changes to events**.
5. Set `GOOGLE_CALENDAR_ID` to the calendar id ending in `@group.calendar.google.com` (Calendar settings → Integrate calendar). Do not use a base64-looking string.
6. Enable **Google Calendar API** on the GCP project that owns the service account.
7. `npm start` — on startup the worker also calls `calendarList.insert` so the service account accepts the share (no email inbox).

On startup the worker syncs the next ~182 days. Every 6 hours (configurable via `CRON_SCHEDULE`) it re-validates the current + next week and creates/updates/deletes events as needed.

## Scripts

- `npm start` — run worker
- `npm run check` — fingerprint / date-window self-check
- `npm run typecheck` — `tsc --noEmit`
