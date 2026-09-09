import cron from "node-cron";
import { config } from "./config.js";
import { HALF_YEAR_DAYS } from "./constants.js";
import { halfYearWindow, twoWeekWindow } from "./api/dates.js";
import { createCalendarClient } from "./calendar/client.js";
import { ensureCalendarSubscribed } from "./calendar/subscribe.js";
import { syncWindow } from "./calendar/sync.js";

function calendarClient() {
  return createCalendarClient({
    clientEmail: config.googleClientEmail,
    privateKey: config.googlePrivateKey,
  });
}

async function runSync(
  label: string,
  start: Date,
  end: Date,
): Promise<void> {
  const calendar = calendarClient();

  await syncWindow({
    calendar,
    calendarId: config.googleCalendarId,
    raspBaseUrl: config.raspBaseUrl,
    groupId: config.groupId,
    timezone: config.timezone,
    start,
    end,
    label,
    subgroupFilter: config.subgroup,
  });
}

async function main() {
  console.log(
    `edu-scheduler starting (group=${config.groupId}, calendar=${config.googleCalendarId}, tz=${config.timezone}, sa=${config.googleClientEmail}, subgroup=${config.subgroup ?? "all"})`,
  );

  await ensureCalendarSubscribed(calendarClient(), config.googleCalendarId);

  const today = new Date();
  const bootstrap = halfYearWindow(today, HALF_YEAR_DAYS);
  await runSync("startup-half-year", bootstrap.start, bootstrap.end);

  if (!cron.validate(config.cronSchedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${config.cronSchedule}`);
  }

  cron.schedule(config.cronSchedule, () => {
    const window = twoWeekWindow(new Date());
    runSync("cron-two-weeks", window.start, window.end).catch((err) => {
      console.error("[cron-two-weeks] sync failed:", err);
    });
  });

  console.log(`Cron scheduled: ${config.cronSchedule}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
