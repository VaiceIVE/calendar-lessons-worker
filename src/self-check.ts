import assert from "node:assert/strict";
import {
  addDays,
  chunkDateRange,
  formatRaspDate,
  halfYearWindow,
  parseRaspDate,
  startOfWeekMonday,
  twoWeekWindow,
} from "./api/dates.js";
import {
  matchesSubgroupFilter,
  subgroupNumber,
  type Lesson,
} from "./api/schedule.js";
import { lessonFingerprint, toLocalDateTime } from "./calendar/map.js";

function sampleLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    lessonOid: 87884,
    date: "2026.09.03",
    beginLesson: "16:50",
    endLesson: "18:20",
    discipline: "Деловая и межкультурная коммуникация",
    kindOfWork: "Лекция",
    auditorium: "6-211",
    building: "УЛК-6",
    lecturer: "доц., к.н. ВЛАДИМИРОВА Н.В.",
    stream: "Поток(ФИТм-261)",
    group: null,
    subGroup: null,
    specializationContent: null,
    note: null,
    note_description: null,
    isBan: false,
    ...overrides,
  };
}

function main() {
  assert.equal(formatRaspDate(new Date(2026, 7, 31)), "2026.08.31");
  assert.equal(formatRaspDate(parseRaspDate("2026.09.03")), "2026.09.03");

  const mon = startOfWeekMonday(new Date(2026, 8, 2)); // Wed Sep 2 2026
  assert.equal(formatRaspDate(mon), "2026.08.31");

  const two = twoWeekWindow(new Date(2026, 8, 2));
  assert.equal(formatRaspDate(two.start), "2026.08.31");
  assert.equal(formatRaspDate(two.end), "2026.09.13");

  const half = halfYearWindow(new Date(2026, 8, 1), 182);
  assert.equal(formatRaspDate(half.start), "2026.09.01");
  assert.equal(formatRaspDate(half.end), "2027.03.02");

  const chunks = chunkDateRange(
    new Date(2026, 8, 1),
    addDays(new Date(2026, 8, 1), 182),
    90,
  );
  assert.equal(chunks.length, 3);
  assert.equal(formatRaspDate(chunks[0]!.start), "2026.09.01");
  assert.equal(formatRaspDate(chunks[0]!.end), "2026.11.29");
  assert.equal(formatRaspDate(chunks[2]!.end), "2027.03.02");

  const a = lessonFingerprint(sampleLesson());
  const b = lessonFingerprint(sampleLesson());
  assert.equal(a, b);
  const c = lessonFingerprint(sampleLesson({ beginLesson: "18:30" }));
  assert.notEqual(a, c);

  assert.equal(toLocalDateTime("2026.09.03", "16:50"), "2026-09-03T16:50:00");

  assert.equal(subgroupNumber("ФИТм-261/2"), "2");
  assert.equal(subgroupNumber("ФИТм-261/1"), "1");
  assert.equal(subgroupNumber(null), null);

  const lab2 = sampleLesson({ subGroup: "ФИТм-261/2" });
  const lab1 = sampleLesson({ subGroup: "ФИТм-261/1" });
  const whole = sampleLesson({ subGroup: null });
  assert.equal(matchesSubgroupFilter(lab2, null), true);
  assert.equal(matchesSubgroupFilter(lab2, "2"), true);
  assert.equal(matchesSubgroupFilter(lab2, "1"), false);
  assert.equal(matchesSubgroupFilter(lab1, "2"), false);
  assert.equal(matchesSubgroupFilter(whole, "2"), true);
  assert.notEqual(
    lessonFingerprint(lab1),
    lessonFingerprint(lab2),
  );

  console.log("self-check OK");
}

main();
