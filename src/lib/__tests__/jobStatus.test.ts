import { summarizeJobs, statusLabelKey, type JobStatus } from "@/lib/jobStatus";

describe("statusLabelKey", () => {
  it("maps a status to its i18n key", () => {
    expect(statusLabelKey("booked")).toBe("status.booked");
    expect(statusLabelKey("paid")).toBe("status.paid");
  });
});

describe("summarizeJobs", () => {
  const jobs: { status: JobStatus; price_total: number | null }[] = [
    { status: "booked", price_total: 100 },
    { status: "in_progress", price_total: 50 },
    { status: "awaiting_collection", price_total: 25 },
    { status: "complete", price_total: 200 },
    { status: "paid", price_total: 300 },
    { status: "cancelled", price_total: 999 },
    { status: "paid", price_total: null }, // null contributes 0
  ];

  it("sums all price_totals into total (nulls as 0)", () => {
    expect(summarizeJobs(jobs).total).toBe(1674);
  });
  it("completed = sum of complete only", () => {
    expect(summarizeJobs(jobs).completed).toBe(200);
  });
  it("pending = booked + in_progress + awaiting_collection", () => {
    expect(summarizeJobs(jobs).pending).toBe(175);
  });
  it("paid = sum of paid (null-safe)", () => {
    expect(summarizeJobs(jobs).paid).toBe(300);
  });
  it("handles an empty list", () => {
    expect(summarizeJobs([])).toEqual({
      total: 0,
      completed: 0,
      pending: 0,
      paid: 0,
    });
  });
});
