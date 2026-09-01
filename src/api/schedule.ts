import { CHUNK_DAYS } from "../constants.js";
import {
  chunkDateRange,
  formatRaspDate,
} from "./dates.js";

export interface Lesson {
  lessonOid: number;
  date: string;
  beginLesson: string;
  endLesson: string;
  discipline: string;
  kindOfWork: string;
  auditorium: string | null;
  building: string | null;
  lecturer: string | null;
  stream: string | null;
  group: string | null;
  specializationContent: string | null;
  note: string | null;
  note_description: string | null;
  isBan: boolean;
}

interface ScheduleError {
  error: string;
}

function isScheduleError(data: unknown): data is ScheduleError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ScheduleError).error === "string"
  );
}

function normalizeLesson(raw: Record<string, unknown>): Lesson {
  return {
    lessonOid: Number(raw.lessonOid),
    date: String(raw.date ?? ""),
    beginLesson: String(raw.beginLesson ?? ""),
    endLesson: String(raw.endLesson ?? ""),
    discipline: String(raw.discipline ?? ""),
    kindOfWork: String(raw.kindOfWork ?? ""),
    auditorium: (raw.auditorium as string | null) ?? null,
    building: (raw.building as string | null) ?? null,
    lecturer: (raw.lecturer as string | null) ?? null,
    stream: (raw.stream as string | null) ?? null,
    group: (raw.group as string | null) ?? null,
    specializationContent:
      (raw.specializationContent as string | null) ?? null,
    note: (raw.note as string | null) ?? null,
    note_description: (raw.note_description as string | null) ?? null,
    isBan: Boolean(raw.isBan),
  };
}

async function fetchScheduleChunk(
  baseUrl: string,
  groupId: string,
  start: Date,
  end: Date,
): Promise<Lesson[]> {
  const url = `${baseUrl}/${encodeURIComponent(groupId)}?start=${formatRaspDate(start)}&finish=${formatRaspDate(end)}&lng=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Schedule API HTTP ${res.status} for ${url}`);
  }
  const data: unknown = await res.json();
  if (isScheduleError(data)) {
    throw new Error(`Schedule API error: ${data.error} (${url})`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Schedule API returned unexpected shape for ${url}`);
  }
  return data.map((item) =>
    normalizeLesson(item as Record<string, unknown>),
  );
}

/** Fetch lessons for [start, end], chunking to avoid period-is-too-big. */
export async function fetchSchedule(
  baseUrl: string,
  groupId: string,
  start: Date,
  end: Date,
  chunkDays = CHUNK_DAYS,
): Promise<Lesson[]> {
  const chunks = chunkDateRange(start, end, chunkDays);
  const byOid = new Map<number, Lesson>();

  for (const chunk of chunks) {
    const lessons = await fetchScheduleChunk(
      baseUrl,
      groupId,
      chunk.start,
      chunk.end,
    );
    for (const lesson of lessons) {
      if (!lesson.lessonOid || lesson.isBan) continue;
      byOid.set(lesson.lessonOid, lesson);
    }
  }

  return [...byOid.values()].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.beginLesson.localeCompare(b.beginLesson);
  });
}
