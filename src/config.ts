import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Private keys in .env usually keep literal \n — turn those into real newlines. */
function privateKeyFromEnv(): string {
  const raw = requireEnv("GOOGLE_PRIVATE_KEY");
  return raw.replace(/\\n/g, "\n");
}

/** Optional "1" / "2" from ФИТм-261/N. Empty → keep all subgroups. */
function subgroupFromEnv(): string | null {
  const raw = process.env.SUBGROUP?.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`SUBGROUP must be a number like 1 or 2, got: ${raw}`);
  }
  return raw;
}

export const config = {
  groupId: requireEnv("GROUP_ID"),
  googleClientEmail: requireEnv("GOOGLE_CLIENT_EMAIL"),
  googlePrivateKey: privateKeyFromEnv(),
  // Must be a calendar shared with the service account (writer), or the SA's own calendar id
  googleCalendarId: requireEnv("GOOGLE_CALENDAR_ID"),
  subgroup: subgroupFromEnv(),
  cronSchedule: process.env.CRON_SCHEDULE?.trim() || "0 */6 * * *",
  timezone: process.env.SCHEDULE_TIMEZONE?.trim() || "Asia/Omsk",
  raspBaseUrl:
    process.env.RASP_BASE_URL?.trim() ||
    "https://rasp.omgtu.ru/api/schedule/group",
};
