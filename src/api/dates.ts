/** Format a Date as YYYY.MM.DD for the rasp API. */
export function formatRaspDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** Parse YYYY.MM.DD into a local calendar Date (midnight local). */
export function parseRaspDate(s: string): Date {
  const [y, m, d] = s.split(".").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid rasp date: ${s}`);
  }
  return new Date(y, m - 1, d);
}

/** Add whole days to a date (local calendar arithmetic). */
export function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

/** Monday of the week containing `d` (local). */
export function startOfWeekMonday(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = out.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

/** Inclusive date ranges of at most `chunkDays` covering [start, end]. */
export function chunkDateRange(
  start: Date,
  end: Date,
  chunkDays: number,
): Array<{ start: Date; end: Date }> {
  if (chunkDays < 1) {
    throw new Error("chunkDays must be >= 1");
  }
  const chunks: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= last) {
    const chunkEnd = addDays(cursor, chunkDays - 1);
    chunks.push({
      start: new Date(cursor),
      end: chunkEnd < last ? chunkEnd : new Date(last),
    });
    cursor = addDays(chunkEnd, 1);
  }
  return chunks;
}

/** Startup window: today → today + halfYearDays. */
export function halfYearWindow(
  today: Date,
  halfYearDays: number,
): { start: Date; end: Date } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return { start, end: addDays(start, halfYearDays) };
}

/** Current week (Mon) through end of next week (Sun) = 14 days. */
export function twoWeekWindow(today: Date): { start: Date; end: Date } {
  const start = startOfWeekMonday(today);
  return { start, end: addDays(start, 13) };
}
