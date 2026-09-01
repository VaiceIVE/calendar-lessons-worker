import type { calendar_v3 } from "googleapis";

/**
 * Service accounts don't click email invites. Adding the shared calendar to
 * calendarList is the API equivalent of accepting the share.
 */
export async function ensureCalendarSubscribed(
  calendar: calendar_v3.Calendar,
  calendarId: string,
): Promise<void> {
  try {
    await calendar.calendarList.get({ calendarId });
    return;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw err;
  }

  const res = await calendar.calendarList.insert({
    requestBody: { id: calendarId },
  });
  console.log(
    `Accepted shared calendar "${res.data.summary ?? calendarId}" (role=${res.data.accessRole})`,
  );
}
