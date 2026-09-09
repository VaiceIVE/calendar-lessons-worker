import { createHash } from "node:crypto";
import type { calendar_v3 } from "googleapis";
import type { Lesson } from "../api/schedule.js";
import { SOURCE_TAG } from "../constants.js";

export function lessonFingerprint(lesson: Lesson): string {
  const parts = [
    lesson.date,
    lesson.beginLesson,
    lesson.endLesson,
    lesson.discipline,
    lesson.kindOfWork,
    lesson.auditorium ?? "",
    lesson.building ?? "",
    lesson.lecturer ?? "",
    lesson.stream ?? "",
    lesson.group ?? "",
    lesson.subGroup ?? "",
    lesson.specializationContent ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function locationOf(lesson: Lesson): string {
  return [lesson.building, lesson.auditorium].filter(Boolean).join(", ");
}

function descriptionOf(lesson: Lesson): string {
  const lines: string[] = [];
  if (lesson.lecturer) lines.push(`Преподаватель: ${lesson.lecturer}`);
  if (lesson.stream) lines.push(`Поток: ${lesson.stream}`);
  if (lesson.group) lines.push(`Группа: ${lesson.group}`);
  if (lesson.subGroup) lines.push(`Подгруппа: ${lesson.subGroup}`);
  if (lesson.specializationContent) {
    lines.push(`Специализация: ${lesson.specializationContent}`);
  }
  const note = lesson.note_description || lesson.note;
  if (note) lines.push(`Заметка: ${note}`);
  lines.push(`lessonOid: ${lesson.lessonOid}`);
  return lines.join("\n");
}

/** Build RFC3339 local datetime string without Z (Calendar + timeZone). */
export function toLocalDateTime(date: string, time: string): string {
  // date: YYYY.MM.DD, time: HH:MM
  const [y, m, d] = date.split(".");
  const [hh, mm] = time.split(":");
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}

export function lessonToEvent(
  lesson: Lesson,
  timezone: string,
): calendar_v3.Schema$Event {
  const fingerprint = lessonFingerprint(lesson);
  return {
    summary: `${lesson.discipline} (${lesson.kindOfWork})`,
    location: locationOf(lesson) || undefined,
    description: descriptionOf(lesson),
    start: {
      dateTime: toLocalDateTime(lesson.date, lesson.beginLesson),
      timeZone: timezone,
    },
    end: {
      dateTime: toLocalDateTime(lesson.date, lesson.endLesson),
      timeZone: timezone,
    },
    extendedProperties: {
      private: {
        source: SOURCE_TAG,
        lessonOid: String(lesson.lessonOid),
        fingerprint,
      },
    },
  };
}
