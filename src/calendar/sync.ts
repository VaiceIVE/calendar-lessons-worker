import type { calendar_v3 } from "googleapis";
import { formatRaspDate } from "../api/dates.js";
import { fetchSchedule } from "../api/schedule.js";
import { SOURCE_TAG } from "../constants.js";
import { lessonFingerprint, lessonToEvent } from "./map.js";

export interface SyncStats {
  fetched: number;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  errors: number;
}

interface TrackedEvent {
  id: string;
  lessonOid: string;
  fingerprint: string;
}

async function listTrackedEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  start: Date,
  end: Date,
): Promise<TrackedEvent[]> {
  // timeMax is exclusive; include the whole end day → next midnight
  const timeMin = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).toISOString();
  const timeMax = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1,
  ).toISOString();

  const out: TrackedEvent[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      singleEvents: true,
      timeMin,
      timeMax,
      maxResults: 2500,
      pageToken,
      privateExtendedProperty: [`source=${SOURCE_TAG}`],
    });

    for (const event of res.data.items ?? []) {
      const oid = event.extendedProperties?.private?.lessonOid;
      const fingerprint = event.extendedProperties?.private?.fingerprint;
      if (!event.id || !oid || !fingerprint) continue;
      out.push({ id: event.id, lessonOid: oid, fingerprint });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return out;
}

export async function syncWindow(opts: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  raspBaseUrl: string;
  groupId: string;
  timezone: string;
  start: Date;
  end: Date;
  label: string;
  subgroupFilter?: string | null;
}): Promise<SyncStats> {
  const {
    calendar,
    calendarId,
    raspBaseUrl,
    groupId,
    timezone,
    start,
    end,
    label,
    subgroupFilter = null,
  } = opts;

  console.log(
    `[${label}] sync ${formatRaspDate(start)} → ${formatRaspDate(end)}${subgroupFilter ? ` subgroup=${subgroupFilter}` : ""}`,
  );

  const lessons = await fetchSchedule(
    raspBaseUrl,
    groupId,
    start,
    end,
    undefined,
    subgroupFilter,
  );
  const existing = await listTrackedEvents(calendar, calendarId, start, end);
  const byOid = new Map(existing.map((e) => [e.lessonOid, e]));

  const stats: SyncStats = {
    fetched: lessons.length,
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    errors: 0,
  };

  const seen = new Set<string>();

  for (const lesson of lessons) {
    const oid = String(lesson.lessonOid);
    seen.add(oid);
    const fp = lessonFingerprint(lesson);
    const body = lessonToEvent(lesson, timezone);
    const current = byOid.get(oid);

    try {
      if (!current) {
        await calendar.events.insert({ calendarId, requestBody: body });
        stats.created += 1;
      } else if (current.fingerprint !== fp) {
        await calendar.events.patch({
          calendarId,
          eventId: current.id,
          requestBody: body,
        });
        stats.updated += 1;
      } else {
        stats.unchanged += 1;
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`[${label}] failed lessonOid=${oid}:`, err);
    }
  }

  for (const event of existing) {
    if (seen.has(event.lessonOid)) continue;
    try {
      await calendar.events.delete({ calendarId, eventId: event.id });
      stats.deleted += 1;
    } catch (err) {
      stats.errors += 1;
      console.error(
        `[${label}] failed delete eventId=${event.id} lessonOid=${event.lessonOid}:`,
        err,
      );
    }
  }

  console.log(
    `[${label}] fetched=${stats.fetched} created=${stats.created} updated=${stats.updated} deleted=${stats.deleted} unchanged=${stats.unchanged} errors=${stats.errors}`,
  );
  return stats;
}
