/* eslint-disable import/first */ // jest.mock must be hoisted above imports
// The helpers under test are pure; we mock supabase and jobActions only so
// importing payments.ts doesn't pull in the native AsyncStorage module.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/jobActions", () => ({ applyStatusChange: jest.fn() }));

import { sumPayments, outstandingBalance, isSettled } from "@/lib/payments";

const p = (amount: number) => ({ amount });

describe("sumPayments", () => {
  it("sums amounts", () => {
    expect(sumPayments([p(10), p(5.5), p(4.5)])).toBe(20);
  });
  it("is zero for no payments", () => {
    expect(sumPayments([])).toBe(0);
  });
});

describe("outstandingBalance", () => {
  it("returns the remaining balance", () => {
    expect(outstandingBalance(100, [p(40)])).toBe(60);
  });
  it("never goes negative on overpayment", () => {
    expect(outstandingBalance(100, [p(120)])).toBe(0);
  });
  it("is zero when the price is null or zero", () => {
    expect(outstandingBalance(null, [p(10)])).toBe(0);
    expect(outstandingBalance(0, [])).toBe(0);
  });
});

describe("isSettled", () => {
  it("is true once payments cover the price exactly", () => {
    expect(isSettled(100, [p(60), p(40)])).toBe(true);
  });
  it("is true on overpayment", () => {
    expect(isSettled(100, [p(150)])).toBe(true);
  });
  it("is false when partially paid", () => {
    expect(isSettled(100, [p(99.99)])).toBe(false);
  });
  it("is false for an unpriced job even with payments", () => {
    expect(isSettled(null, [p(50)])).toBe(false);
    expect(isSettled(0, [p(50)])).toBe(false);
  });
});
