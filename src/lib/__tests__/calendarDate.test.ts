import {
  startOfDay,
  addDays,
  startOfMonth,
  addMonths,
  toDateKey,
  fromDateKey,
  toTimeString,
  parseDateAndTime,
  addMinutesToDateTime,
} from "@/lib/calendarDate";

describe("toDateKey / fromDateKey", () => {
  it("formats a local date as YYYY-MM-DD (July = month index 6)", () => {
    expect(toDateKey(new Date(2026, 6, 12))).toBe("2026-07-12");
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through fromDateKey", () => {
    const d = fromDateKey("2026-07-12");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(12);
  });
});

describe("date arithmetic", () => {
  it("addDays crosses month boundaries", () => {
    expect(toDateKey(addDays(new Date(2026, 6, 30), 3))).toBe("2026-08-02");
  });
  it("startOfDay zeroes the time", () => {
    const d = startOfDay(new Date(2026, 6, 12, 14, 30, 5));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
  it("startOfMonth returns the first of the month", () => {
    expect(toDateKey(startOfMonth(new Date(2026, 6, 20)))).toBe("2026-07-01");
  });
  it("addMonths wraps the year", () => {
    expect(toDateKey(addMonths(new Date(2026, 11, 1), 1))).toBe("2027-01-01");
  });
});

describe("time helpers", () => {
  it("toTimeString pads to HH:MM", () => {
    expect(toTimeString(new Date(2026, 6, 12, 9, 5))).toBe("09:05");
  });
  it("parseDateAndTime builds a valid date", () => {
    const d = parseDateAndTime("2026-07-12", "14:30");
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });
  it("addMinutesToDateTime rolls over midnight to the next day", () => {
    expect(addMinutesToDateTime("2026-07-12", "23:30", 60)).toEqual({
      date: "2026-07-13",
      time: "00:30",
    });
  });
  it("addMinutesToDateTime returns null for an invalid input", () => {
    expect(addMinutesToDateTime("not-a-date", "99:99", 60)).toBeNull();
  });
});
