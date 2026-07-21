/* eslint-disable import/first */ // jest.mock must be hoisted above imports
// isDateClosed is pure; we only mock supabase so importing closures.ts doesn't
// pull in the native AsyncStorage module at the top of supabase.ts.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));

import { isDateClosed, type Closure } from "@/lib/closures";

const closure = (start: string, end: string): Closure => ({
  id: `${start}-${end}`,
  start_date: start,
  end_date: end,
  reason: null,
});

describe("isDateClosed", () => {
  const closures = [closure("2026-01-07", "2026-01-07"), closure("2026-08-01", "2026-08-14")];

  it("matches a single-day closure exactly", () => {
    expect(isDateClosed("2026-01-07", closures)).toBe(true);
  });

  it("matches the inclusive start and end of a range", () => {
    expect(isDateClosed("2026-08-01", closures)).toBe(true);
    expect(isDateClosed("2026-08-14", closures)).toBe(true);
  });

  it("matches a date inside a range", () => {
    expect(isDateClosed("2026-08-09", closures)).toBe(true);
  });

  it("does not match the day before or after a range", () => {
    expect(isDateClosed("2026-07-31", closures)).toBe(false);
    expect(isDateClosed("2026-08-15", closures)).toBe(false);
  });

  it("returns false when there are no closures", () => {
    expect(isDateClosed("2026-01-07", [])).toBe(false);
  });
});
