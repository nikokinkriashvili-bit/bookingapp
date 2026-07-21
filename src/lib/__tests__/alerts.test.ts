import { computeLowStockAlerts, computeJobAlerts, type AlertProduct, type AlertJob } from "@/lib/alerts";

const product = (over: Partial<AlertProduct>): AlertProduct => ({
  id: "p1",
  name: "Ceramic coat",
  stock_qty: 20,
  sales_per_week: 7,
  safety_stock: 5,
  lead_time_days_override: null,
  supplierLeadTimeDays: 7,
  ...over,
});

describe("computeLowStockAlerts", () => {
  it("flags a product at or below safety stock", () => {
    const alerts = computeLowStockAlerts([product({ stock_qty: 4, safety_stock: 5 })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: "low_stock", productId: "p1" });
  });

  it("flags a product at or below its reorder point", () => {
    // reorderPoint = (7/7)*7 + 5 = 12
    const alerts = computeLowStockAlerts([product({ stock_qty: 10, safety_stock: 5 })]);
    expect(alerts).toHaveLength(1);
  });

  it("doesn't flag healthy stock", () => {
    const alerts = computeLowStockAlerts([product({ stock_qty: 100, safety_stock: 5 })]);
    expect(alerts).toHaveLength(0);
  });
});

const NOW = new Date("2026-07-14T12:00:00Z");

const job = (over: Partial<AlertJob>): AlertJob => ({
  id: "j1",
  status: "booked",
  scheduled_slot: "2026-07-14T09:00:00Z",
  scheduled_end: "2026-07-14T10:00:00Z",
  plate_number: "AA-123-BB",
  ...over,
});

describe("computeJobAlerts", () => {
  it("flags a still-booked job past its end time as a no-show", () => {
    const alerts = computeJobAlerts([job({ status: "booked" })], NOW);
    expect(alerts).toEqual([
      { kind: "no_show", jobId: "j1", plateNumber: "AA-123-BB", scheduledSlot: "2026-07-14T09:00:00Z" },
    ]);
  });

  it("flags an in-progress job past its end time as overdue", () => {
    const alerts = computeJobAlerts([job({ status: "in_progress" })], NOW);
    expect(alerts).toEqual([
      { kind: "overdue", jobId: "j1", plateNumber: "AA-123-BB", scheduledEnd: "2026-07-14T10:00:00Z" },
    ]);
  });

  it("flags an awaiting-collection job past its end time as overdue", () => {
    const alerts = computeJobAlerts([job({ status: "awaiting_collection" })], NOW);
    expect(alerts[0].kind).toBe("overdue");
  });

  it("doesn't flag a job whose end time hasn't passed yet", () => {
    const alerts = computeJobAlerts(
      [job({ status: "booked", scheduled_end: "2026-07-15T10:00:00Z" })],
      NOW
    );
    expect(alerts).toHaveLength(0);
  });

  it("never flags complete/paid/cancelled jobs", () => {
    for (const status of ["complete", "paid", "cancelled"] as const) {
      expect(computeJobAlerts([job({ status })], NOW)).toHaveLength(0);
    }
  });
});
